import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const emailVerificationsTable = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerificationsTable.$inferSelect;
export type InsertEmailVerification = typeof emailVerificationsTable.$inferInsert;
