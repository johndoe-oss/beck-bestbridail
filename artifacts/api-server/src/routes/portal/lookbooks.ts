import { Router, type IRouter } from "express";
import { db, lookbooksTable, lookbookItemsTable, productsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import {
  AdminCreateLookbookBody,
  AdminUpdateLookbookParams,
  AdminUpdateLookbookBody,
  AdminDeleteLookbookParams,
  AdminCreateLookbookItemBody,
  AdminUpdateLookbookItemParams,
  AdminUpdateLookbookItemBody,
  AdminDeleteLookbookItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatLookbook(
  l: typeof lookbooksTable.$inferSelect & { itemCount?: number; items?: any[] },
) {
  return {
    id: l.id,
    title: l.title,
    description: l.description ?? null,
    slug: l.slug,
    coverImage: l.coverImage ?? null,
    category: (l as any).category ?? "wedding",
    isPublished: l.isPublished,
    sortOrder: l.sortOrder,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    itemCount: l.itemCount ?? 0,
    items: l.items ?? [],
  };
}

router.get("/bb-portal/lookbooks", requireAdminAuth, async (req, res): Promise<void> => {
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 50;
  const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0;

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
      updatedAt: lookbooksTable.updatedAt,
      itemCount: sql<number>`count(${lookbookItemsTable.id})::int`,
    })
    .from(lookbooksTable)
    .leftJoin(lookbookItemsTable, eq(lookbooksTable.id, lookbookItemsTable.lookbookId))
    .groupBy(lookbooksTable.id)
    .orderBy(desc(lookbooksTable.sortOrder), desc(lookbooksTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ lookbooks: rows.map(formatLookbook), total: rows.length });
});

router.post("/bb-portal/lookbooks", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = AdminCreateLookbookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [lookbook] = await db
    .insert(lookbooksTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      slug: data.slug,
      coverImage: data.coverImage ?? null,
      category: (data as any).category ?? "wedding",
      isPublished: data.isPublished ?? false,
      sortOrder: data.sortOrder ?? 0,
    } as any)
    .returning();

  const [row] = await db
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
      updatedAt: lookbooksTable.updatedAt,
      itemCount: sql<number>`0`,
    })
    .from(lookbooksTable)
    .leftJoin(lookbookItemsTable, eq(lookbooksTable.id, lookbookItemsTable.lookbookId))
    .where(eq(lookbooksTable.id, lookbook.id))
    .groupBy(lookbooksTable.id);

  res.status(201).json(formatLookbook(row));
});

router.get("/bb-portal/lookbooks/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminUpdateLookbookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid lookbook ID" });
    return;
  }

  const [lookbook] = await db
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
      updatedAt: lookbooksTable.updatedAt,
    })
    .from(lookbooksTable)
    .where(eq(lookbooksTable.id, params.data.id));

  if (!lookbook) {
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
      price: (lookbookItemsTable as any).price,
      sizes: (lookbookItemsTable as any).sizes,
      color: (lookbookItemsTable as any).color,
      colors: (lookbookItemsTable as any).colors,
      videoUrl: (lookbookItemsTable as any).videoUrl,
      videoType: (lookbookItemsTable as any).videoType,
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

  const formatted = {
    ...lookbook,
    createdAt: lookbook.createdAt.toISOString(),
    updatedAt: lookbook.updatedAt.toISOString(),
    itemCount: items.length,
    items: items.map((item: any) => ({
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

  res.json(formatted);
});

router.patch("/bb-portal/lookbooks/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminUpdateLookbookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid lookbook ID" });
    return;
  }

  const parsed = AdminUpdateLookbookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.slug !== undefined) updates.slug = d.slug;
  if (d.coverImage !== undefined) updates.coverImage = d.coverImage;
  if (d.isPublished !== undefined) updates.isPublished = d.isPublished;
  if (d.sortOrder !== undefined) updates.sortOrder = d.sortOrder;
  if ((d as any).category !== undefined) updates.category = (d as any).category;

  const [updated] = await db
    .update(lookbooksTable)
    .set(updates)
    .where(eq(lookbooksTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Lookbook not found" });
    return;
  }

  res.json(formatLookbook({ ...updated, itemCount: 0, items: [] }));
});

router.delete("/bb-portal/lookbooks/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminDeleteLookbookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid lookbook ID" });
    return;
  }

  const [deleted] = await db
    .delete(lookbooksTable)
    .where(eq(lookbooksTable.id, params.data.id))
    .returning({ id: lookbooksTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Lookbook not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/bb-portal/lookbooks/:id/items", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminUpdateLookbookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid lookbook ID" });
    return;
  }

  const parsed = AdminCreateLookbookItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(lookbookItemsTable)
    .values({
      lookbookId: params.data.id,
      productId: parsed.data.productId ?? null,
      imageUrl: parsed.data.imageUrl,
      caption: parsed.data.caption ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(item);
});

router.patch(
  "/bb-portal/lookbooks/items/:itemId",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const params = AdminUpdateLookbookItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid item ID" });
      return;
    }

    const parsed = AdminUpdateLookbookItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.productId !== undefined) updates.productId = d.productId;
    if (d.imageUrl !== undefined) updates.imageUrl = d.imageUrl;
    if (d.caption !== undefined) updates.caption = d.caption;
    if (d.sortOrder !== undefined) updates.sortOrder = d.sortOrder;

    const [updated] = await db
      .update(lookbookItemsTable)
      .set(updates)
      .where(eq(lookbookItemsTable.id, params.data.itemId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Lookbook item not found" });
      return;
    }

    res.json(updated);
  },
);

router.delete(
  "/bb-portal/lookbooks/items/:itemId",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const params = AdminDeleteLookbookItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid item ID" });
      return;
    }

    const [deleted] = await db
      .delete(lookbookItemsTable)
      .where(and(
        eq(lookbookItemsTable.id, params.data.itemId),
      ))
      .returning({ id: lookbookItemsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Lookbook item not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;