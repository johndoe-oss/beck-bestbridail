import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { db, customersTable, emailVerificationsTable, passwordResetsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { signCustomerToken } from "../../lib/jwt";
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from "../../lib/email";
import {
  RegisterCustomerBody,
  VerifyCustomerEmailBody,
  ResendVerificationBody,
  LoginCustomerBody,
  ForgotPasswordBody,
  VerifyResetCodeBody,
  ResetPasswordBody,
} from "@workspace/api-zod";
import { requireCustomerAuth } from "../../middlewares/auth";

const router: IRouter = Router();

// ── In-memory account lockout (resets on server restart — for production use Redis) ──
type LockoutRecord = { count: number; lockedUntil: number };
const loginAttempts = new Map<string, LockoutRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function isLockedOut(email: string): boolean {
  const key = email.toLowerCase();
  const rec = loginAttempts.get(key);
  if (!rec) return false;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    loginAttempts.delete(key); // Lockout expired — reset
  }
  return false;
}

function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase();
  const rec = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  rec.count++;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  loginAttempts.set(key, rec);
}

function resetAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}

/** Timing-safe string equality to prevent timing attacks on code comparison */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone ?? null,
    isVerified: c.isVerified,
    createdAt: c.createdAt.toISOString(),
  };
}

router.post("/customers/register", async (req, res): Promise<void> => {
  const parsed = RegisterCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, firstName, lastName, phone } = parsed.data;

  const [existing] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (existing) {
    // Same response as success to prevent email enumeration
    res.status(201).json({ message: "Account created. Please check your email for a verification code." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [customer] = await db
    .insert(customersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone ?? null,
      isVerified: false,
    })
    .returning();

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.delete(emailVerificationsTable).where(
    eq(emailVerificationsTable.customerId, customer.id),
  );

  await db.insert(emailVerificationsTable).values({ customerId: customer.id, code, expiresAt });

  req.log.info({ email }, "Verification code generated for new registration");
  await sendEmail(email, "Verify your Beckbest Bridal account", buildVerificationEmail(firstName, code));

  res.status(201).json({ message: "Account created. Please check your email for a verification code." });
});

router.post("/customers/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyCustomerEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code } = parsed.data;

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (!customer) {
    // Generic error to prevent email enumeration
    res.status(400).json({ error: "Invalid email or code" });
    return;
  }

  const now = new Date();
  const [verification] = await db
    .select()
    .from(emailVerificationsTable)
    .where(
      and(
        eq(emailVerificationsTable.customerId, customer.id),
        gt(emailVerificationsTable.expiresAt, now),
      ),
    );

  // Use timing-safe comparison to prevent oracle attacks
  if (!verification || !safeEqual(verification.code, code)) {
    res.status(400).json({ error: "Invalid or expired verification code" });
    return;
  }

  await db
    .update(customersTable)
    .set({ isVerified: true })
    .where(eq(customersTable.id, customer.id));

  await db
    .delete(emailVerificationsTable)
    .where(eq(emailVerificationsTable.customerId, customer.id));

  const token = signCustomerToken(customer.id, customer.email);
  res.json({ customer: formatCustomer({ ...customer, isVerified: true }), token });
});

router.post("/customers/resend-verification", async (req, res): Promise<void> => {
  const parsed = ResendVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email } = parsed.data;

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (!customer || customer.isVerified) {
    // Don't reveal whether the email exists
    res.json({ message: "If an unverified account exists, a new code has been sent." });
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.delete(emailVerificationsTable).where(
    eq(emailVerificationsTable.customerId, customer.id),
  );

  await db.insert(emailVerificationsTable).values({ customerId: customer.id, code, expiresAt });

  // IMPORTANT: Never log the code value — only log the email
  req.log.info({ email }, "Resend verification code requested");
  await sendEmail(email, "Your new verification code — Beckbest Bridal", buildVerificationEmail(customer.firstName, code));

  res.json({ message: "A new verification code has been sent to your email." });
});

router.post("/customers/login", async (req, res): Promise<void> => {
  const parsed = LoginCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  // Account lockout check — prevents brute-force attacks
  if (isLockedOut(email)) {
    res.status(429).json({
      error: "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.",
    });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (!customer) {
    // Generic error — don't reveal that the email doesn't exist
    recordFailedAttempt(email);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    recordFailedAttempt(email);
    req.log.warn({ email }, "Failed login attempt recorded");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!customer.isVerified) {
    res.status(403).json({ error: "Please verify your email before logging in" });
    return;
  }

  // Successful login — clear lockout record
  resetAttempts(email);

  const token = signCustomerToken(customer.id, customer.email);
  res.json({ customer: formatCustomer(customer), token });
});

router.post("/customers/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email } = parsed.data;

  const [customer] = await db
    .select({ id: customersTable.id, firstName: customersTable.firstName })
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  // Always return success to prevent email enumeration
  if (!customer) {
    res.json({ message: "If an account with that email exists, a reset code has been sent." });
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.delete(passwordResetsTable).where(
    eq(passwordResetsTable.customerId, customer.id),
  );

  await db.insert(passwordResetsTable).values({ customerId: customer.id, code, expiresAt, used: false });

  // In development, log the code so you can see it in Render logs if email delivery is delayed
  if (process.env.NODE_ENV !== "production") {
    req.log.warn({ email, code }, "PASSWORD RESET CODE (dev only) — email may be delayed");
  } else {
    req.log.info({ email }, "Password reset code generated");
  }
  await sendEmail(email, "Reset your Beckbest Bridal password", buildPasswordResetEmail(customer.firstName, code));

  res.json({ message: "If an account with that email exists, a reset code has been sent." });
});

router.post("/customers/verify-reset-code", async (req, res): Promise<void> => {
  const parsed = VerifyResetCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code } = parsed.data;

  const [customer] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (!customer) {
    res.status(400).json({ error: "Invalid email or code" });
    return;
  }

  const now = new Date();
  const [resetRecord] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.customerId, customer.id),
        eq(passwordResetsTable.used, false),
        gt(passwordResetsTable.expiresAt, now),
      ),
    );

  if (!resetRecord || !safeEqual(resetRecord.code, code)) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  // Mark code as used
  await db
    .update(passwordResetsTable)
    .set({ used: true })
    .where(eq(passwordResetsTable.id, resetRecord.id));

  res.json({ message: "Reset code verified successfully" });
});

router.post("/customers/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code, newPassword } = parsed.data;

  const [customer] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (!customer) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const now = new Date();
  const [resetRecord] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.customerId, customer.id),
        eq(passwordResetsTable.used, true),
        gt(passwordResetsTable.expiresAt, now),
      ),
    )
    .orderBy((t) => t.createdAt);

  if (!resetRecord || !safeEqual(resetRecord.code, code)) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(customersTable)
    .set({ passwordHash })
    .where(eq(customersTable.id, customer.id));

  await db
    .delete(passwordResetsTable)
    .where(eq(passwordResetsTable.customerId, customer.id));

  req.log.info({ email }, "Customer password reset successful");
  res.json({ message: "Password reset successfully. You may now log in." });
});

router.post("/customers/logout", requireCustomerAuth, async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

router.get("/customers/me", requireCustomerAuth, async (req, res): Promise<void> => {
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.id));

  if (!customer) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json(formatCustomer(customer));
});

export default router;
