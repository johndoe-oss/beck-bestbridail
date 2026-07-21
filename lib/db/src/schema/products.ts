import {
  pgTable,
  serial,
  text,
  boolean,
  doublePrecision,
  integer,
  json,
  timestamp,
} from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  compareAtPrice: doublePrecision("compare_at_price"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  images: json("images").$type<string[]>().default([]).notNull(),
  inStock: boolean("in_stock").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  sku: text("sku").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
