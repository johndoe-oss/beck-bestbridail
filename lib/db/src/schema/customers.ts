import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Customer = typeof customersTable.$inferSelect;
export type InsertCustomer = typeof customersTable.$inferInsert;
