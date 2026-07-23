import { Router, type IRouter } from "express";
import { db, feedbacksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import {
  AdminUpdateFeedbackBody,
  AdminUpdateFeedbackParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── List all feedback ────────────────────────────────────────────────────────

router.get("/bb-portal/feedback", requireAdminAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(feedbacksTable)
    .orderBy(desc(feedbacksTable.createdAt));

  res.json({
    feedbacks: rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone ?? null,
      type: r.type,
      message: r.message,
      isRead: r.isRead,
      adminReply: r.adminReply ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total: rows.length,
  });
});

// ── Update feedback (mark as read / add reply) ───────────────────────────────

router.patch("/bb-portal/feedback/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminUpdateFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid feedback ID" });
    return;
  }

  const parsed = AdminUpdateFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(feedbacksTable)
    .where(eq(feedbacksTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Feedback not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.isRead !== undefined) updateData.isRead = parsed.data.isRead;
  if (parsed.data.adminReply !== undefined) updateData.adminReply = parsed.data.adminReply;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(feedbacksTable)
    .set(updateData)
    .where(eq(feedbacksTable.id, params.data.id))
    .returning();

  res.json({
    id: updated.id,
    customerId: updated.customerId,
    customerName: updated.customerName,
    customerEmail: updated.customerEmail,
    customerPhone: updated.customerPhone ?? null,
    type: updated.type,
    message: updated.message,
    isRead: updated.isRead,
    adminReply: updated.adminReply ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;

