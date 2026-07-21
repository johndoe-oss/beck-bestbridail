import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAdminAuth(
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

  if (!payload || payload.type !== "admin") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [admin] = await db
    .select({
      id: adminsTable.id,
      email: adminsTable.email,
      name: adminsTable.name,
    })
    .from(adminsTable)
    .where(eq(adminsTable.id, payload.sub));

  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.admin = admin;
  next();
}
