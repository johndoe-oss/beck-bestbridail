import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signAdminToken } from "../../lib/jwt";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import { AdminLoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/bb-portal/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.email, email.toLowerCase()));

  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAdminToken(admin.id, admin.email);
  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
});

router.post("/bb-portal/logout", requireAdminAuth, async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

router.get("/bb-portal/me", requireAdminAuth, async (req, res): Promise<void> => {
  res.json(req.admin);
});

export default router;
