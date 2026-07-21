import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, customersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import {
  AdminListOrdersQueryParams,
  AdminUpdateOrderParams,
  AdminUpdateOrderBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildAdminOrder(orderId: number) {
  const [order] = await db
    .select({
      id: ordersTable.id,
      customerId: ordersTable.customerId,
      status: ordersTable.status,
      totalAmount: ordersTable.totalAmount,
      shippingAddress: ordersTable.shippingAddress,
      notes: ordersTable.notes,
      createdAt: ordersTable.createdAt,
      customerEmail: customersTable.email,
      customerFirstName: customersTable.firstName,
      customerLastName: customersTable.lastName,
    })
    .from(ordersTable)
    .innerJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(eq(ordersTable.id, orderId));

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    id: order.id,
    customerId: order.customerId,
    customerEmail: order.customerEmail,
    customerName: `${order.customerFirstName} ${order.customerLastName}`,
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

router.get("/bb-portal/orders", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = AdminListOrdersQueryParams.safeParse(req.query);
  const limit = parsed.data?.limit ?? 50;
  const offset = parsed.data?.offset ?? 0;
  const status = parsed.data?.status;

  const conditions = status ? [eq(ordersTable.status, status)] : [];

  const rows = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const orders = await Promise.all(rows.map((r) => buildAdminOrder(r.id)));
  res.json({ orders: orders.filter(Boolean), total: orders.length });
});

router.patch("/bb-portal/orders/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminUpdateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const parsed = AdminUpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(parsed.data.status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning({ id: ordersTable.id });

  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(await buildAdminOrder(updated.id));
});

export default router;
