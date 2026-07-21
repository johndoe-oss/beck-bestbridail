import { Router, type IRouter } from "express";
import { db, productsTable, customersTable, ordersTable, orderItemsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/bb-portal/stats", requireAdminAuth, async (_req, res): Promise<void> => {
  const [[productCount], [customerCount], orderStats, recentOrderRows, topProductRows] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(productsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(customersTable),
      db.select({
        totalOrders: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(total_amount), 0)::float`,
        pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
      }).from(ordersTable),
      // Recent 5 orders with customer info
      db
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
        .orderBy(desc(ordersTable.createdAt))
        .limit(5),
      // Top 5 products by order count
      db
        .select({
          productId: orderItemsTable.productId,
          productName: orderItemsTable.productName,
          orderCount: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${orderItemsTable.priceAtTime} * ${orderItemsTable.quantity}), 0)::float`,
        })
        .from(orderItemsTable)
        .groupBy(orderItemsTable.productId, orderItemsTable.productName)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
    ]);

  // Fetch items for recent orders
  const recentOrders = await Promise.all(
    recentOrderRows.map(async (order) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id));

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
    }),
  );

  res.json({
    totalProducts: Number(productCount?.count) || 0,
    totalCustomers: Number(customerCount?.count) || 0,
    totalOrders: Number(orderStats[0]?.totalOrders) || 0,
    totalRevenue: Number(orderStats[0]?.totalRevenue) || 0,
    pendingOrders: Number(orderStats[0]?.pendingOrders) || 0,
    recentOrders,
    topProducts: topProductRows.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      orderCount: Number(p.orderCount) || 0,
      revenue: Number(p.revenue) || 0,
    })),
  });
});

export default router;
