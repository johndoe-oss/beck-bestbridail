import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const passwordResetsTable = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordReset = typeof passwordResetsTable.$inferSelect;
export type InsertPasswordReset = typeof passwordResetsTable.$inferInsert;