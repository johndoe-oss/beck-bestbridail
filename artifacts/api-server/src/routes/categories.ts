import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
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

  res.json({
    categories: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? null,
      imageUrl: r.imageUrl ?? null,
      productCount: Number(r.productCount) || 0,
    })),
  });
});

export default router;
