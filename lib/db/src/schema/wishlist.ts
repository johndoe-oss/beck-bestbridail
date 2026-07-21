import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const wishlistTable = pgTable("wishlist", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type WishlistEntry = typeof wishlistTable.$inferSelect;
export type InsertWishlistEntry = typeof wishlistTable.$inferInsert;
