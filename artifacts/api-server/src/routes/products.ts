import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, gte, lte, desc } from "drizzle-orm";
import {
  ListProductsQueryParams,
  GetProductParams,
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

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, featured, search, limit = 20, offset = 0, minPrice, maxPrice } = parsed.data;

  const conditions = [];
  if (featured !== undefined) conditions.push(eq(productsTable.featured, featured));
  if (minPrice !== undefined) conditions.push(gte(productsTable.price, minPrice));
  if (maxPrice !== undefined) conditions.push(lte(productsTable.price, maxPrice));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

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
    .where(
      conditions.length > 0 ? and(...conditions) : undefined,
    )
    .orderBy(desc(productsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Filter by category slug if provided
  const filtered = category
    ? rows.filter((r) => {
        // Try to match by slug (need a join on slug) — fallback: filter by categoryId or name
        return true; // category filtering is handled below
      })
    : rows;

  // If category filter provided, do a separate lookup
  if (category) {
    const [cat] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, category));

    if (cat) {
      const catRows = rows.filter((r) => r.categoryId === cat.id);
      res.json({ products: catRows.map(formatProduct), total: catRows.length });
      return;
    }
    res.json({ products: [], total: 0 });
    return;
  }

  res.json({ products: filtered.map(formatProduct), total: filtered.length });
});

router.get("/products/featured", async (_req, res): Promise<void> => {
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
    .where(eq(productsTable.featured, true))
    .orderBy(desc(productsTable.createdAt))
    .limit(12);

  res.json({ products: rows.map(formatProduct), total: rows.length });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [row] = await db
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
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(formatProduct(row));
});

export default router;
