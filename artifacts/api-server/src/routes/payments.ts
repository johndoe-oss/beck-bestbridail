import { Router, type IRouter, type Request as ExpressRequest } from "express";
import { db, cartsTable, ordersTable, orderItemsTable, productsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireCustomerAuth } from "../middlewares/auth";
import { sendSms } from "../lib/sms";
import { initializePaystackTransaction, verifyPaystackTransaction } from "../lib/paystack";
import { getStripeClient } from "../lib/stripe-client";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getBaseUrl(req?: ExpressRequest): string {
  // 1. Explicit env var takes precedence — strip trailing slash
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) return frontendUrl.replace(/\/+$/, "");

  // 2. Use X-Forwarded-Host / Host header (works on Render)
  if (req) {
    const forwardedHost = req.headers["x-forwarded-host"];
    const host = req.headers["host"];
    const resolvedHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ?? (Array.isArray(host) ? host[0] : host);
    if (resolvedHost) {
      const proto = req.headers["x-forwarded-proto"] || "https";
      // Strip any trailing slash from the host before constructing the URL
      return `${proto}://${resolvedHost.replace(/\/+$/, "")}`;
    }
  }

  // 3. Fallback (dev or production)
  return process.env.NODE_ENV === "production"
    ? "https://beck-bestbridail.onrender.com"
    : `http://localhost:${process.env.PORT === "5000" ? "5173" : "5173"}`;
}

function generateRef(): string {
  return `bb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type CartRow = {
  productId: number;
  quantity: number;
  productName: string;
  price: number;
  images: unknown;
};

async function getCartItems(customerId: number): Promise<CartRow[]> {
  return db
    .select({
      productId: cartsTable.productId,
      quantity: cartsTable.quantity,
      productName: productsTable.name,
      price: productsTable.price,
      images: productsTable.images,
    })
    .from(cartsTable)
    .innerJoin(productsTable, eq(cartsTable.productId, productsTable.id))
    .where(eq(cartsTable.customerId, customerId));
}

async function getSingleItem(productId: number, quantity: number): Promise<CartRow[] | null> {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!p) return null;
  return [{ productId: p.id, quantity, productName: p.name, price: p.price, images: p.images }];
}

async function createOrder(
  customerId: number,
  items: CartRow[],
  paymentProvider: string,
  paymentReference: string,
  shippingAddress?: string,
  notes?: string,
) {
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const [order] = await db
    .insert(ordersTable)
    .values({
      customerId,
      status: "pending",
      totalAmount,
      paymentProvider,
      paymentReference,
      paymentStatus: "pending",
      shippingAddress: shippingAddress ?? null,
      notes: notes ?? null,
    })
    .returning();

  await db.insert(orderItemsTable).values(
    items.map((i) => ({
      orderId: order.id,
      productId: i.productId,
      productName: i.productName,
      productImage: ((i.images as string[]) || [])[0] ?? null,
      quantity: i.quantity,
      priceAtTime: i.price,
    })),
  );

  return order;
}

async function sendOrderSms(customerId: number, total: number, provider: string): Promise<void> {
  try {
    const [customer] = await db
      .select({ phone: customersTable.phone, firstName: customersTable.firstName })
      .from(customersTable)
      .where(eq(customersTable.id, customerId));

    if (customer?.phone) {
      const providerLabel =
        provider === "cod" ? "Cash on Delivery" : provider === "paystack" ? "Paystack" : "Stripe";
      await sendSms(
        customer.phone,
        `Hello ${customer.firstName}! Your Beckbest Bridal order of $${total.toFixed(2)} has been confirmed via ${providerLabel}. We will be in touch with shipping details. Thank you!`,
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to send order SMS");
  }
}

// ── POST /api/payments/initiate ───────────────────────────────────────────────

router.post("/payments/initiate", requireCustomerAuth, async (req, res): Promise<void> => {
  const {
    provider,
    productId,
    quantity = 1,
    fromCart = !productId,
    shippingAddress,
    notes,
  } = req.body as {
    provider: "cod" | "paystack" | "stripe";
    productId?: number;
    quantity?: number;
    fromCart?: boolean;
    shippingAddress?: string;
    notes?: string;
  };

  if (!["cod", "paystack", "stripe"].includes(provider)) {
    res.status(400).json({ error: "Invalid payment provider" });
    return;
  }

  const customerId = req.customer!.id;

  let items: CartRow[];
  if (productId) {
    const single = await getSingleItem(productId, quantity);
    if (!single) { res.status(404).json({ error: "Product not found" }); return; }
    items = single;
  } else {
    items = await getCartItems(customerId);
    if (items.length === 0) { res.status(400).json({ error: "Your cart is empty" }); return; }
  }

  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const ref = generateRef();

  // ── Cash on Delivery ──────────────────────────────────────────────────────
  if (provider === "cod") {
    const order = await createOrder(customerId, items, "cod", ref, shippingAddress, notes);
    await db
      .update(ordersTable)
      .set({ paymentStatus: "paid", status: "processing", updatedAt: new Date() })
      .where(eq(ordersTable.id, order.id));

    if (fromCart) await db.delete(cartsTable).where(eq(cartsTable.customerId, customerId));

    await sendOrderSms(customerId, totalAmount, "cod");

    res.json({ provider: "cod", status: "success", orderId: order.id, totalAmount });
    return;
  }

  // ── Paystack ──────────────────────────────────────────────────────────────
  if (provider === "paystack") {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      res.status(503).json({ error: "Paystack is not configured on this server" });
      return;
    }

    const order = await createOrder(customerId, items, "paystack", ref, shippingAddress, notes);
    const [customer] = await db
      .select({ email: customersTable.email })
      .from(customersTable)
      .where(eq(customersTable.id, customerId));

    const baseUrl = getBaseUrl(req);
    const { authorizationUrl } = await initializePaystackTransaction({
      email: customer.email,
      amount: Math.round(totalAmount * 100),
      reference: ref,
      callbackUrl: `${baseUrl}/payment/verify?provider=paystack&reference=${ref}&orderId=${order.id}`,
      currency: process.env.PAYSTACK_CURRENCY ?? "NGN",
      metadata: { orderId: order.id, customerId },
    });

    res.json({ provider: "paystack", orderId: order.id, authorizationUrl, reference: ref });
    return;
  }

  // ── Stripe ────────────────────────────────────────────────────────────────
  if (provider === "stripe") {
    const stripe = getStripeClient();
    if (!stripe) { res.status(503).json({ error: "Stripe is not configured on this server" }); return; }

    const order = await createOrder(customerId, items, "stripe", ref, shippingAddress, notes);
    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: req.customer!.email,
      line_items: items.map((i) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: i.productName,
            images: ((i.images as string[]) || []).filter((u) => u.startsWith("http")).slice(0, 1),
          },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.quantity,
      })),
      success_url: `${baseUrl}/payment/verify?provider=stripe&session_id={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
      cancel_url: `${baseUrl}/products`,
      metadata: { orderId: order.id.toString(), paymentRef: ref },
    });

    // Store Stripe session ID as payment reference
    await db
      .update(ordersTable)
      .set({ paymentReference: session.id })
      .where(eq(ordersTable.id, order.id));

    res.json({ provider: "stripe", orderId: order.id, checkoutUrl: session.url, sessionId: session.id });
    return;
  }
});

// ── GET /api/payments/verify ──────────────────────────────────────────────────

router.get("/payments/verify", requireCustomerAuth, async (req, res): Promise<void> => {
  const { provider, reference, session_id: sessionId } = req.query as Record<string, string>;
  const customerId = req.customer!.id;

  if (!provider || (!reference && !sessionId)) {
    res.status(400).json({ error: "Missing payment verification parameters" });
    return;
  }

  if (provider === "paystack") {
    if (!process.env.PAYSTACK_SECRET_KEY) { res.status(503).json({ error: "Paystack not configured" }); return; }

    const result = await verifyPaystackTransaction(reference);
    const isPaid = result.status === "success";

    const [order] = await db
      .update(ordersTable)
      .set({
        paymentStatus: isPaid ? "paid" : "failed",
        status: isPaid ? "processing" : "pending",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.paymentReference, reference))
      .returning();

    if (isPaid && order) {
      await db.delete(cartsTable).where(eq(cartsTable.customerId, customerId));
      await sendOrderSms(customerId, order.totalAmount, "paystack");
    }

    res.json({ status: isPaid ? "paid" : "failed", orderId: order?.id });
    return;
  }

  if (provider === "stripe") {
    const stripe = getStripeClient();
    if (!stripe) { res.status(503).json({ error: "Stripe not configured" }); return; }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const isPaid = session.payment_status === "paid";

    const [order] = await db
      .update(ordersTable)
      .set({
        paymentStatus: isPaid ? "paid" : "failed",
        status: isPaid ? "processing" : "pending",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.paymentReference, session.id))
      .returning();

    if (isPaid && order) {
      await db.delete(cartsTable).where(eq(cartsTable.customerId, customerId));
      await sendOrderSms(customerId, order.totalAmount, "stripe");
    }

    res.json({ status: isPaid ? "paid" : "failed", orderId: order?.id });
    return;
  }

  res.status(400).json({ error: "Invalid payment provider" });
});

export default router;
