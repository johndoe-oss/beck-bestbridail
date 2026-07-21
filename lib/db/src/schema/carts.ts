import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const cartsTable = pgTable("carts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Cart = typeof cartsTable.$inferSelect;
export type InsertCart = typeof cartsTable.$inferInsert;
