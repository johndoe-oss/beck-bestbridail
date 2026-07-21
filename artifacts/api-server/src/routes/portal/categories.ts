import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import { AdminCreateCategoryBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function listWithCount() {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      imageUrl: categoriesTable.imageUrl,
      productCount: sql<number>`count(${productsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    imageUrl: r.imageUrl ?? null,
    productCount: Number(r.productCount) || 0,
  }));
}

router.get("/bb-portal/categories", requireAdminAuth, async (_req, res): Promise<void> => {
  res.json({ categories: await listWithCount() });
});

router.post("/bb-portal/categories", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = AdminCreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, parsed.data.slug));

  if (existing) {
    res.status(409).json({ error: "A category with this slug already exists" });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
    })
    .returning();

  res.status(201).json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    imageUrl: category.imageUrl ?? null,
    productCount: 0,
  });
});

export default router;
