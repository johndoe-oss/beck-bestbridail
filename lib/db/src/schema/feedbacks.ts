import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const feedbacksTable = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  type: text("type").notNull().$type<"feedback" | "suggestion" | "problem">(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedbacksTable.$inferSelect;
export type InsertFeedback = typeof feedbacksTable.$inferInsert;

