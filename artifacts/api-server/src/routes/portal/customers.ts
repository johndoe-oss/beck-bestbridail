import { Router, type IRouter } from "express";
import { db, customersTable, ordersTable } from "@workspace/db";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import {
  AdminListCustomersQueryParams,
  AdminGetCustomerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bb-portal/customers", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = AdminListCustomersQueryParams.safeParse(req.query);
  const limit = parsed.data?.limit ?? 50;
  const offset = parsed.data?.offset ?? 0;
  const search = parsed.data?.search;

  const rows = await db
    .select({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      phone: customersTable.phone,
      isVerified: customersTable.isVerified,
      createdAt: customersTable.createdAt,
      orderCount: sql<number>`count(distinct ${ordersTable.id})::int`,
      totalSpent: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
    })
    .from(customersTable)
    .leftJoin(ordersTable, eq(ordersTable.customerId, customersTable.id))
    .where(
      search
        ? or(
            ilike(customersTable.email, `%${search}%`),
            ilike(customersTable.firstName, `%${search}%`),
            ilike(customersTable.lastName, `%${search}%`),
          )
        : undefined,
    )
    .groupBy(customersTable.id)
    .orderBy(desc(customersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customersTable);

  res.json({
    customers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone ?? null,
      isVerified: r.isVerified,
      createdAt: r.createdAt.toISOString(),
      orderCount: Number(r.orderCount) || 0,
      totalSpent: Number(r.totalSpent) || 0,
    })),
    total: Number(total[0]?.count) || 0,
  });
});

router.get("/bb-portal/customers/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminGetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid customer ID" });
    return;
  }

  const [row] = await db
    .select({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      phone: customersTable.phone,
      isVerified: customersTable.isVerified,
      createdAt: customersTable.createdAt,
      orderCount: sql<number>`count(distinct ${ordersTable.id})::int`,
      totalSpent: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
    })
    .from(customersTable)
    .leftJoin(ordersTable, eq(ordersTable.customerId, customersTable.id))
    .where(eq(customersTable.id, params.data.id))
    .groupBy(customersTable.id);

  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json({
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone ?? null,
    isVerified: row.isVerified,
    createdAt: row.createdAt.toISOString(),
    orderCount: Number(row.orderCount) || 0,
    totalSpent: Number(row.totalSpent) || 0,
  });
});

export default router;
