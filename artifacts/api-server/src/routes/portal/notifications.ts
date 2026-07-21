import { Router, type IRouter } from "express";
import { db, customersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import { sendEmail, buildAdminEmailTemplate } from "../../lib/email";
import { sendSms } from "../../lib/sms";
import {
  SendEmailNotificationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getRecipients(
  recipientType: "all" | "verified" | "specific",
  recipientIds?: number[],
) {
  if (recipientType === "specific" && recipientIds && recipientIds.length > 0) {
    return db
      .select({ email: customersTable.email, phone: customersTable.phone, firstName: customersTable.firstName })
      .from(customersTable)
      .where(inArray(customersTable.id, recipientIds));
  }

  if (recipientType === "verified") {
    return db
      .select({ email: customersTable.email, phone: customersTable.phone, firstName: customersTable.firstName })
      .from(customersTable)
      .where(eq(customersTable.isVerified, true));
  }

  // all
  return db
    .select({ email: customersTable.email, phone: customersTable.phone, firstName: customersTable.firstName })
    .from(customersTable);
}

router.post("/bb-portal/notifications/email", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = SendEmailNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { subject, message, recipientType, recipientIds } = parsed.data;
  const recipients = await getRecipients(
    recipientType as "all" | "verified" | "specific",
    recipientIds,
  );

  if (recipients.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No recipients found" });
    return;
  }

  const html = buildAdminEmailTemplate(subject, message);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    recipients.map(async (r) => {
      const ok = await sendEmail(r.email, subject, html);
      if (ok) sent++;
      else failed++;
    }),
  );

  req.log.info({ sent, failed, recipientType }, "Email notification sent");
  res.json({ sent, failed, message: `Email sent to ${sent} recipient(s)` });
});

router.post("/bb-portal/notifications/sms", requireAdminAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const message = typeof body.message === 'string' ? body.message : '';
  const recipientType = typeof body.recipientType === 'string' ? body.recipientType : 'all';
  const recipientIds = Array.isArray(body.recipientIds) ? body.recipientIds : [];

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const recipients = await getRecipients(
    recipientType as "all" | "verified" | "specific",
    recipientIds,
  );

  const withPhone = recipients.filter((r) => r.phone);

  if (withPhone.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No recipients with phone numbers found" });
    return;
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    withPhone.map(async (r) => {
      const ok = await sendSms(r.phone!, message);
      if (ok) sent++;
      else failed++;
    }),
  );

  req.log.info({ sent, failed, recipientType }, "SMS notification sent");
  res.json({ sent, failed, message: `SMS sent to ${sent} recipient(s)` });
});

export default router;
