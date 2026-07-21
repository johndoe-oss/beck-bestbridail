import { Router, type IRouter } from "express";
import { db, lookbooksTable, lookbookItemsTable, productsTable } from "@workspace/db";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import {
  GetLookbookParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatLookbook(l: any) {
  return {
    id: l.id,
    title: l.title,
    description: l.description ?? null,
    slug: l.slug,
    coverImage: l.coverImage ?? null,
    category: l.category ?? "wedding",
    isPublished: l.isPublished,
    sortOrder: l.sortOrder,
    createdAt: l.createdAt.toISOString(),
    items: (l.items ?? []).map((item: any) => ({
      id: item.id,
      lookbookId: item.lookbookId,
      productId: item.productId ?? null,
      imageUrl: item.imageUrl,
      caption: item.caption ?? null,
      price: item.price ?? null,
      sizes: (item.sizes as string[] | null) ?? [],
      color: item.color ?? null,
      colors: (item.colors as string[] | null) ?? [],
      videoUrl: item.videoUrl ?? null,
      videoType: item.videoType ?? null,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      productName: item.productName ?? null,
      productPrice: item.productPrice ?? null,
      productImage: (item.productImage as string[] | null) ?? [],
    })),
  };
}

router.get("/lookbooks", async (req, res): Promise<void> => {
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 20;
  const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  const conditions: any[] = [eq(lookbooksTable.isPublished, true)];
  if (category) {
    conditions.push(eq((lookbooksTable as any).category, category));
  }

  const rows = await db
    .select({
      id: lookbooksTable.id,
      title: lookbooksTable.title,
      description: lookbooksTable.description,
      slug: lookbooksTable.slug,
      coverImage: lookbooksTable.coverImage,
      category: (lookbooksTable as any).category,
      isPublished: lookbooksTable.isPublished,
      sortOrder: lookbooksTable.sortOrder,
      createdAt: lookbooksTable.createdAt,
    })
    .from(lookbooksTable)
    .where(and(...conditions))
    .orderBy(desc(lookbooksTable.sortOrder), desc(lookbooksTable.createdAt))
    .limit(limit)
    .offset(offset);

  const withItemCount = await Promise.all(
    rows.map(async (l) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lookbookItemsTable)
        .where(eq(lookbookItemsTable.lookbookId, l.id));
      return { ...l, itemCount: Number(count) };
    }),
  );

  res.json({ lookbooks: withItemCount.map(formatLookbook), total: withItemCount.length });
});

router.get("/lookbooks/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ category: (lookbooksTable as any).category })
    .from(lookbooksTable)
    .where(eq(lookbooksTable.isPublished, true))
    .groupBy((lookbooksTable as any).category)
    .orderBy(asc((lookbooksTable as any).category));

  const categories = rows.map(r => r.category).filter(Boolean) as string[];
  res.json({ categories });
});

router.get("/lookbooks/:slug", async (req, res): Promise<void> => {
  const params = GetLookbookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const [lookbook] = await db
    .select()
    .from(lookbooksTable)
    .where(eq(lookbooksTable.slug, params.data.slug))
    .limit(1);

  if (!lookbook || !lookbook.isPublished) {
    res.status(404).json({ error: "Lookbook not found" });
    return;
  }

  const items = await db
    .select({
      id: lookbookItemsTable.id,
      lookbookId: lookbookItemsTable.lookbookId,
      productId: lookbookItemsTable.productId,
      imageUrl: lookbookItemsTable.imageUrl,
      caption: lookbookItemsTable.caption,
      sortOrder: lookbookItemsTable.sortOrder,
      createdAt: lookbookItemsTable.createdAt,
      productName: productsTable.name,
      productPrice: productsTable.price,
      productImage: productsTable.images,
    })
    .from(lookbookItemsTable)
    .leftJoin(productsTable, eq(lookbookItemsTable.productId, productsTable.id))
    .where(eq(lookbookItemsTable.lookbookId, lookbook.id))
    .orderBy(desc(lookbookItemsTable.sortOrder), desc(lookbookItemsTable.createdAt));

  res.json(formatLookbook({ ...lookbook, items }));
});

export default router;