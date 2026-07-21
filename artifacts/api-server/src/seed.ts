/**
 * Seed script — run once to set up the initial admin account and sample data.
 *
 * Usage:
 *   npm run seed
 *
 * This creates:
 *   - 1 admin account  (change the password immediately after first login)
 *   - 4 categories
 *   - 8 sample products
 */

import bcrypt from "bcryptjs";
import { db, adminsTable, categoriesTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@beckbestbridal.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "BeckBest@2024!";
  const adminName = process.env.ADMIN_NAME ?? "Beckbest Admin";

  const [existingAdmin] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.email, adminEmail));

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(adminsTable).values({ email: adminEmail, name: adminName, passwordHash });
    console.log(`✓ Admin created: ${adminEmail} / ${adminPassword}`);
    console.log("  ⚠  Change this password immediately after first login.");
  } else {
    console.log(`  Admin already exists: ${adminEmail}`);
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const cats = [
    { name: "Bridal Gowns", slug: "bridal-gowns", description: "Exquisite gowns for your most important day" },
    { name: "Veils & Headpieces", slug: "veils", description: "Complete your bridal look" },
    { name: "Accessories", slug: "accessories", description: "Jewellery, shoes, and more" },
    { name: "Bridesmaids", slug: "bridesmaids", description: "Elegant dresses for your entire bridal party" },
  ];

  const categoryIds: Record<string, number> = {};
  for (const cat of cats) {
    const [existing] = await db.select({ id: categoriesTable.id, slug: categoriesTable.slug }).from(categoriesTable).where(eq(categoriesTable.slug, cat.slug));
    if (!existing) {
      const [inserted] = await db.insert(categoriesTable).values(cat).returning({ id: categoriesTable.id, slug: categoriesTable.slug });
      categoryIds[cat.slug] = inserted.id;
      console.log(`✓ Category: ${cat.name}`);
    } else {
      categoryIds[cat.slug] = existing.id;
    }
  }

  // ── Products ───────────────────────────────────────────────────────────────
  const products = [
    {
      name: "Ivory Lace Ball Gown",
      description: "A breathtaking ball gown featuring delicate hand-stitched lace bodice and cathedral-length train. Timeless elegance for your most special day.",
      price: 3200,
      compareAtPrice: 4100,
      categoryId: categoryIds["bridal-gowns"],
      images: [] as string[],
      inStock: true,
      featured: true,
      sku: "BG-001",
    },
    {
      name: "Silk Crepe Mermaid Gown",
      description: "Sleek and sophisticated, this mermaid silhouette in pure silk crepe hugs every curve and flares dramatically at the knee.",
      price: 2850,
      compareAtPrice: null,
      categoryId: categoryIds["bridal-gowns"],
      images: [] as string[],
      inStock: true,
      featured: true,
      sku: "BG-002",
    },
    {
      name: "Chiffon A-Line Gown",
      description: "Light as a whisper, this ethereal chiffon A-line gown with beaded waistband is perfect for garden and beach ceremonies.",
      price: 1980,
      compareAtPrice: 2400,
      categoryId: categoryIds["bridal-gowns"],
      images: [] as string[],
      inStock: true,
      featured: true,
      sku: "BG-003",
    },
    {
      name: "Modern Minimalist Sheath",
      description: "For the modern bride. Clean lines in lustrous duchess satin, with an elegant open back and subtle sweep train.",
      price: 2200,
      compareAtPrice: null,
      categoryId: categoryIds["bridal-gowns"],
      images: [] as string[],
      inStock: true,
      featured: false,
      sku: "BG-004",
    },
    {
      name: "Cathedral Length Veil",
      description: "Dramatic cathedral-length veil in silk tulle with hand-cut raw edge. The perfect finishing touch for a show-stopping entrance.",
      price: 420,
      compareAtPrice: null,
      categoryId: categoryIds["veils"],
      images: [] as string[],
      inStock: true,
      featured: true,
      sku: "VL-001",
    },
    {
      name: "Pearl & Crystal Tiara",
      description: "Handcrafted tiara featuring freshwater pearls and Swarovski crystals on a delicate rhodium-plated band.",
      price: 680,
      compareAtPrice: 850,
      categoryId: categoryIds["veils"],
      images: [] as string[],
      inStock: true,
      featured: false,
      sku: "VL-002",
    },
    {
      name: "Gold Freshwater Pearl Earrings",
      description: "Oval freshwater pearl drops in 18k gold vermeil. Effortlessly elegant, from vows to dance floor.",
      price: 195,
      compareAtPrice: null,
      categoryId: categoryIds["accessories"],
      images: [] as string[],
      inStock: true,
      featured: false,
      sku: "AC-001",
    },
    {
      name: "Blush Bridesmaid Midi Dress",
      description: "Ruched chiffon midi dress in soft blush. Universally flattering silhouette, available in sizes 2–20.",
      price: 280,
      compareAtPrice: 340,
      categoryId: categoryIds["bridesmaids"],
      images: [] as string[],
      inStock: true,
      featured: true,
      sku: "BR-001",
    },
  ];

  for (const product of products) {
    const [existing] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.sku, product.sku!));

    if (!existing) {
      await db.insert(productsTable).values(product);
      console.log(`✓ Product: ${product.name}`);
    }
  }

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
