import { Router, type IRouter } from "express";
import { db, legalPagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import { ensureLegalPagesTable } from "../legal";
import { DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PRIVACY_POLICY } from "../../lib/defaultLegal";

const router: IRouter = Router();

const UpdateLegalBody = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

// GET /api/bb-portal/legal - List all legal documents for editing
router.get("/bb-portal/legal", requireAdminAuth, async (_req, res): Promise<void> => {
  await ensureLegalPagesTable();
  try {
    const pages = await db.select().from(legalPagesTable);
    const result: Record<string, any> = {};

    for (const p of pages) {
      result[p.slug] = p;
    }

    if (!result.terms) {
      result.terms = {
        slug: "terms",
        title: "Terms & Conditions",
        content: DEFAULT_TERMS_AND_CONDITIONS,
        updatedAt: new Date(),
        updatedBy: "System",
      };
    }
    if (!result.privacy) {
      result.privacy = {
        slug: "privacy",
        title: "Privacy Policy",
        content: DEFAULT_PRIVACY_POLICY,
        updatedAt: new Date(),
        updatedBy: "System",
      };
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch legal pages", details: err?.message });
  }
});

// PUT /api/bb-portal/legal/:slug - Save updated Terms & Conditions or Privacy Policy
router.put("/bb-portal/legal/:slug", requireAdminAuth, async (req, res): Promise<void> => {
  const { slug } = req.params;
  if (slug !== "terms" && slug !== "privacy") {
    res.status(400).json({ error: "Invalid legal document slug. Must be 'terms' or 'privacy'" });
    return;
  }

  const parsed = UpdateLegalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid payload" });
    return;
  }

  const { title, content } = parsed.data;
  const adminName = req.admin?.name || req.admin?.email || "Admin";

  await ensureLegalPagesTable();

  try {
    const [existing] = await db
      .select()
      .from(legalPagesTable)
      .where(eq(legalPagesTable.slug, slug));

    let savedPage;
    if (existing) {
      const [updated] = await db
        .update(legalPagesTable)
        .set({
          title,
          content,
          updatedAt: new Date(),
          updatedBy: adminName,
        })
        .where(eq(legalPagesTable.slug, slug))
        .returning();
      savedPage = updated;
    } else {
      const [created] = await db
        .insert(legalPagesTable)
        .values({
          slug,
          title,
          content,
          updatedAt: new Date(),
          updatedBy: adminName,
        })
        .returning();
      savedPage = created;
    }

    req.log?.info({ slug, admin: adminName }, "Legal page updated by admin");
    res.json({
      message: `${title} saved successfully to database`,
      page: savedPage,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save legal page", details: err?.message });
  }
});

export default router;
