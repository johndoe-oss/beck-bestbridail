import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { db, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireCustomerAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload || payload.type !== "customer") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [customer] = await db
    .select({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
    })
    .from(customersTable)
    .where(eq(customersTable.id, payload.sub));

  if (!customer) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.customer = customer;
  next();
}
