import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const legalPagesTable = pgTable("legal_pages", {
  slug: text("slug").primaryKey(), // 'terms' | 'privacy'
  title: text("title").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
});

export type LegalPage = typeof legalPagesTable.$inferSelect;
export type InsertLegalPage = typeof legalPagesTable.$inferInsert;
