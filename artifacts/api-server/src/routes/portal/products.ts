import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, orderItemsTable, cartsTable, wishlistTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import {
  AdminCreateProductBody,
  AdminUpdateProductBody,
  AdminUpdateProductParams,
  AdminDeleteProductParams,
  AdminListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect & { categoryName?: string | null }) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    categoryId: p.categoryId ?? null,
    categoryName: p.categoryName ?? null,
    images: (p.images as string[]) || [],
    inStock: p.inStock,
    featured: p.featured,
    sku: p.sku ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/bb-portal/products", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = AdminListProductsQueryParams.safeParse(req.query);
  const limit = parsed.data?.limit ?? 50;
  const offset = parsed.data?.offset ?? 0;

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      categoryId: productsTable.categoryId,
      images: productsTable.images,
      inStock: productsTable.inStock,
      featured: productsTable.featured,
      sku: productsTable.sku,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .orderBy(desc(productsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ products: rows.map(formatProduct), total: rows.length });
});

router.post("/bb-portal/products", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      categoryId: data.categoryId ?? null,
      images: data.images ?? [],
      inStock: data.inStock ?? true,
      featured: data.featured ?? false,
      sku: data.sku ?? null,
    })
    .returning();

  // Fetch with category name
  const [row] = await db
    .select({ id: productsTable.id, name: productsTable.name, description: productsTable.description,
      price: productsTable.price, compareAtPrice: productsTable.compareAtPrice,
      categoryId: productsTable.categoryId, images: productsTable.images,
      inStock: productsTable.inStock, featured: productsTable.featured, sku: productsTable.sku,
      createdAt: productsTable.createdAt, updatedAt: productsTable.updatedAt, categoryName: categoriesTable.name })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, product.id));

  res.status(201).json(formatProduct(row));
});

router.patch("/bb-portal/products/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminUpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const parsed = AdminUpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;
  if (d.name !== undefined) updates.name = d.name;
  if (d.description !== undefined) updates.description = d.description;
  if (d.price !== undefined) updates.price = d.price;
  if (d.compareAtPrice !== undefined) updates.compareAtPrice = d.compareAtPrice;
  if (d.categoryId !== undefined) updates.categoryId = d.categoryId;
  if (d.images !== undefined) updates.images = d.images;
  if (d.inStock !== undefined) updates.inStock = d.inStock;
  if (d.featured !== undefined) updates.featured = d.featured;
  if (d.sku !== undefined) updates.sku = d.sku;

  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [row] = await db
    .select({ id: productsTable.id, name: productsTable.name, description: productsTable.description,
      price: productsTable.price, compareAtPrice: productsTable.compareAtPrice,
      categoryId: productsTable.categoryId, images: productsTable.images,
      inStock: productsTable.inStock, featured: productsTable.featured, sku: productsTable.sku,
      createdAt: productsTable.createdAt, updatedAt: productsTable.updatedAt, categoryName: categoriesTable.name })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, updated.id));

  res.json(formatProduct(row));
});

router.delete("/bb-portal/products/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = AdminDeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const deleted = await db.transaction(async (tx) => {
    // 1. Remove references from active carts and wishlists
    await tx.delete(cartsTable).where(eq(cartsTable.productId, params.data.id));
    await tx.delete(wishlistTable).where(eq(wishlistTable.productId, params.data.id));

    // 2. Preserve historical order snapshots while removing the catalog FK
    await tx.update(orderItemsTable).set({ productId: sql`NULL` }).where(eq(orderItemsTable.productId, params.data.id));

    // 3. Delete the product
    return tx.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning({ id: productsTable.id });
  });

  if (!deleted[0]) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
