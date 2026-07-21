import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  json,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const lookbooksTable = pgTable("lookbooks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  coverImage: text("cover_image"),
  category: text("category").default("wedding").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("lookbooks_slug_idx").on(table.slug),
  publishedIdx: index("lookbooks_published_idx").on(table.isPublished),
  categoryIdx: index("lookbooks_category_idx").on(table.category),
}));

export const lookbookItemsTable = pgTable("lookbook_items", {
  id: serial("id").primaryKey(),
  lookbookId: integer("lookbook_id").notNull().references(() => lookbooksTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  price: integer("price"),
  sizes: json("sizes").$type<string[]>().default([]).notNull(),
  color: text("color"),
  colors: json("colors").$type<string[]>().default([]).notNull(),
  videoUrl: text("video_url"),
  videoType: text("video_type"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  lookbookIdx: index("lookbook_items_lookbook_idx").on(table.lookbookId),
}));

export type Lookbook = typeof lookbooksTable.$inferSelect;
export type InsertLookbook = typeof lookbooksTable.$inferInsert;
export type LookbookItem = typeof lookbookItemsTable.$inferSelect;
export type InsertLookbookItem = typeof lookbookItemsTable.$inferInsert;