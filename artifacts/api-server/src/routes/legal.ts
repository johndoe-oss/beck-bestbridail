import { Router, type IRouter } from "express";
import { db, legalPagesTable, type LegalPage } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PRIVACY_POLICY } from "../lib/defaultLegal";

const router: IRouter = Router();

let tableInitialized = false;

export async function ensureLegalPagesTable(): Promise<void> {
  if (tableInitialized) return;
  try {
    // Ensure table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS legal_pages (
        slug text PRIMARY KEY,
        title text NOT NULL,
        content text NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        updated_by text
      );
    `);

    // Ensure default terms exist
    const [terms] = await db
      .select()
      .from(legalPagesTable)
      .where(eq(legalPagesTable.slug, "terms"));

    if (!terms) {
      await db.insert(legalPagesTable).values({
        slug: "terms",
        title: "Terms & Conditions",
        content: DEFAULT_TERMS_AND_CONDITIONS,
        updatedBy: "System",
      });
    }

    // Ensure default privacy policy exists
    const [privacy] = await db
      .select()
      .from(legalPagesTable)
      .where(eq(legalPagesTable.slug, "privacy"));

    if (!privacy) {
      await db.insert(legalPagesTable).values({
        slug: "privacy",
        title: "Privacy Policy",
        content: DEFAULT_PRIVACY_POLICY,
        updatedBy: "System",
      });
    }

    tableInitialized = true;
  } catch (err) {
    console.error("Error initializing legal_pages table:", err);
  }
}

// GET /api/legal - returns all legal documents
router.get("/legal", async (_req, res): Promise<void> => {
  await ensureLegalPagesTable();
  try {
    const pages = await db.select().from(legalPagesTable);
    const result: Record<string, Partial<LegalPage>> = {};

    for (const p of pages) {
      result[p.slug] = {
        slug: p.slug,
        title: p.title,
        content: p.content,
        updatedAt: p.updatedAt,
      };
    }

    // Fallbacks if not populated
    if (!result.terms) {
      result.terms = {
        slug: "terms",
        title: "Terms & Conditions",
        content: DEFAULT_TERMS_AND_CONDITIONS,
        updatedAt: new Date(),
      };
    }
    if (!result.privacy) {
      result.privacy = {
        slug: "privacy",
        title: "Privacy Policy",
        content: DEFAULT_PRIVACY_POLICY,
        updatedAt: new Date(),
      };
    }

    res.json(result);
  } catch (err: any) {
    res.json({
      terms: {
        slug: "terms",
        title: "Terms & Conditions",
        content: DEFAULT_TERMS_AND_CONDITIONS,
        updatedAt: new Date(),
      },
      privacy: {
        slug: "privacy",
        title: "Privacy Policy",
        content: DEFAULT_PRIVACY_POLICY,
        updatedAt: new Date(),
      },
    });
  }
});

// GET /api/legal/:slug - returns a specific legal document (e.g. 'terms' or 'privacy')
router.get("/legal/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  if (slug !== "terms" && slug !== "privacy") {
    res.status(404).json({ error: "Legal document not found" });
    return;
  }

  await ensureLegalPagesTable();
  try {
    const [page] = await db
      .select()
      .from(legalPagesTable)
      .where(eq(legalPagesTable.slug, slug));

    if (page) {
      res.json(page);
      return;
    }

    // Fallback
    const fallbackTitle = slug === "terms" ? "Terms & Conditions" : "Privacy Policy";
    const fallbackContent = slug === "terms" ? DEFAULT_TERMS_AND_CONDITIONS : DEFAULT_PRIVACY_POLICY;

    res.json({
      slug,
      title: fallbackTitle,
      content: fallbackContent,
      updatedAt: new Date(),
    });
  } catch (err) {
    const fallbackTitle = slug === "terms" ? "Terms & Conditions" : "Privacy Policy";
    const fallbackContent = slug === "terms" ? DEFAULT_TERMS_AND_CONDITIONS : DEFAULT_PRIVACY_POLICY;

    res.json({
      slug,
      title: fallbackTitle,
      content: fallbackContent,
      updatedAt: new Date(),
    });
  }
});

export default router;
