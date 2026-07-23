import { Router, type IRouter } from "express";
import { db, cartsTable, productsTable, wishlistTable, ordersTable, orderItemsTable, customersTable, feedbacksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireCustomerAuth } from "../../middlewares/auth";
import {
  AddCartItemBody,
  UpdateCartItemBody,
  UpdateCartItemParams,
  RemoveCartItemParams,
  AddToWishlistBody,
  RemoveFromWishlistParams,
  CreateOrderBody,
  GetMyOrderParams,
  SubmitFeedbackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Cart ──────────────────────────────────────────────────────────────────────

async function buildCart(customerId: number) {
  const rows = await db
    .select({
      productId: cartsTable.productId,
      quantity: cartsTable.quantity,
      name: productsTable.name,
      price: productsTable.price,
      images: productsTable.images,
    })
    .from(cartsTable)
    .innerJoin(productsTable, eq(cartsTable.productId, productsTable.id))
    .where(eq(cartsTable.customerId, customerId));

  const items = rows.map((r) => ({
    productId: r.productId,
    productName: r.name,
    productImage: ((r.images as string[]) || [])[0] ?? null,
    price: r.price,
    quantity: r.quantity,
  }));

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, total, itemCount };
}

router.get("/customers/me/cart", requireCustomerAuth, async (req, res): Promise<void> => {
  const cart = await buildCart(req.customer!.id);
  res.json(cart);
});

router.post("/customers/me/cart/items", requireCustomerAuth, async (req, res): Promise<void> => {
  const parsed = AddCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, quantity } = parsed.data;
  const customerId = req.customer!.id;

  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(cartsTable)
    .where(and(eq(cartsTable.customerId, customerId), eq(cartsTable.productId, productId)));

  if (existing) {
    await db
      .update(cartsTable)
      .set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
      .where(and(eq(cartsTable.customerId, customerId), eq(cartsTable.productId, productId)));
  } else {
    await db.insert(cartsTable).values({ customerId, productId, quantity });
  }

  res.json(await buildCart(customerId));
});

router.patch("/customers/me/cart/items/:productId", requireCustomerAuth, async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { quantity } = parsed.data;
  const customerId = req.customer!.id;
  const productId = params.data.productId;

  if (quantity === 0) {
    await db.delete(cartsTable).where(and(eq(cartsTable.customerId, customerId), eq(cartsTable.productId, productId)));
  } else {
    await db.update(cartsTable).set({ quantity, updatedAt: new Date() }).where(
      and(eq(cartsTable.customerId, customerId), eq(cartsTable.productId, productId)),
    );
  }

  res.json(await buildCart(customerId));
});

router.delete("/customers/me/cart/items/:productId", requireCustomerAuth, async (req, res): Promise<void> => {
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const customerId = req.customer!.id;
  await db.delete(cartsTable).where(
    and(eq(cartsTable.customerId, customerId), eq(cartsTable.productId, params.data.productId)),
  );

  res.json(await buildCart(customerId));
});

// ── Wishlist ──────────────────────────────────────────────────────────────────

async function buildWishlist(customerId: number) {
  const rows = await db
    .select({
      productId: wishlistTable.productId,
      addedAt: wishlistTable.addedAt,
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      categoryId: productsTable.categoryId,
      images: productsTable.images,
      inStock: productsTable.inStock,
      featured: productsTable.featured,
      sku: productsTable.sku,
      createdAt: productsTable.createdAt,
    })
    .from(wishlistTable)
    .innerJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
    .where(eq(wishlistTable.customerId, customerId))
    .orderBy(desc(wishlistTable.addedAt));

  return {
    items: rows.map((r) => ({
      productId: r.productId,
      addedAt: r.addedAt.toISOString(),
      product: {
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        price: r.price,
        compareAtPrice: r.compareAtPrice ?? null,
        categoryId: r.categoryId ?? null,
        categoryName: null,
        images: (r.images as string[]) || [],
        inStock: r.inStock,
        featured: r.featured,
        sku: r.sku ?? null,
        createdAt: r.createdAt.toISOString(),
      },
    })),
  };
}

router.get("/customers/me/wishlist", requireCustomerAuth, async (req, res): Promise<void> => {
  res.json(await buildWishlist(req.customer!.id));
});

router.post("/customers/me/wishlist", requireCustomerAuth, async (req, res): Promise<void> => {
  const parsed = AddToWishlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const customerId = req.customer!.id;
  const { productId } = parsed.data;

  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(wishlistTable)
    .where(and(eq(wishlistTable.customerId, customerId), eq(wishlistTable.productId, productId)));

  if (!existing) {
    await db.insert(wishlistTable).values({ customerId, productId });
  }

  res.json(await buildWishlist(customerId));
});

router.delete("/customers/me/wishlist/:productId", requireCustomerAuth, async (req, res): Promise<void> => {
  const params = RemoveFromWishlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const customerId = req.customer!.id;
  await db.delete(wishlistTable).where(
    and(eq(wishlistTable.customerId, customerId), eq(wishlistTable.productId, params.data.productId)),
  );

  res.json(await buildWishlist(customerId));
});

// ── Orders ────────────────────────────────────────────────────────────────────

async function buildOrder(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    shippingAddress: order.shippingAddress ?? null,
    notes: order.notes ?? null,
    createdAt: order.createdAt.toISOString(),
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage ?? null,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
    })),
  };
}

router.get("/customers/me/orders", requireCustomerAuth, async (req, res): Promise<void> => {
  const orders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.customerId, req.customer!.id))
    .orderBy(desc(ordersTable.createdAt));

  const full = await Promise.all(orders.map((o) => buildOrder(o.id)));
  res.json({ orders: full.filter(Boolean), total: full.length });
});

router.post("/customers/me/orders", requireCustomerAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const customerId = req.customer!.id;

  // Get cart
  const cartRows = await db
    .select({
      productId: cartsTable.productId,
      quantity: cartsTable.quantity,
      name: productsTable.name,
      price: productsTable.price,
      images: productsTable.images,
    })
    .from(cartsTable)
    .innerJoin(productsTable, eq(cartsTable.productId, productsTable.id))
    .where(eq(cartsTable.customerId, customerId));

  if (cartRows.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const totalAmount = cartRows.reduce((sum, r) => sum + r.price * r.quantity, 0);

  const [order] = await db
    .insert(ordersTable)
    .values({
      customerId,
      status: "pending",
      totalAmount,
      shippingAddress: parsed.data.shippingAddress ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  await db.insert(orderItemsTable).values(
    cartRows.map((r) => ({
      orderId: order.id,
      productId: r.productId,
      productName: r.name,
      productImage: ((r.images as string[]) || [])[0] ?? null,
      quantity: r.quantity,
      priceAtTime: r.price,
    })),
  );

  // Clear cart
  await db.delete(cartsTable).where(eq(cartsTable.customerId, customerId));

  res.status(201).json(await buildOrder(order.id));
});

router.get("/customers/me/orders/:id", requireCustomerAuth, async (req, res): Promise<void> => {
  const params = GetMyOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.customerId, req.customer!.id)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(await buildOrder(order.id));
});

// ── Feedback ─────────────────────────────────────────────────────────────────

router.post("/customers/me/feedback", requireCustomerAuth, async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const customerId = req.customer!.id;
  const { type, message } = parsed.data;

  // Get customer info
  const [customer] = await db
    .select({ firstName: customersTable.firstName, lastName: customersTable.lastName, email: customersTable.email, phone: customersTable.phone })
    .from(customersTable)
    .where(eq(customersTable.id, customerId));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  await db.insert(feedbacksTable).values({
    customerId,
    customerName: `${customer.firstName} ${customer.lastName}`,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    type,
    message,
  });

  res.status(201).json({ message: "Feedback submitted successfully. Thank you!" });
});

export default router;
