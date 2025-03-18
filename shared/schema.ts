import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull(), // "client" or "company"
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
});

// Freight Requests
export const requestStatus = ["pending", "quoted", "accepted", "rejected", "completed"] as const;

export const freightRequests = pgTable("freight_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  cargoType: text("cargo_type").notNull(),
  weight: real("weight").notNull(),
  volume: real("volume").notNull(),
  pickupDate: text("pickup_date").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  notes: text("notes"),
  requireInsurance: boolean("require_insurance").default(false),
  status: text("status", { enum: requestStatus }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFreightRequestSchema = createInsertSchema(freightRequests).pick({
  userId: true,
  origin: true,
  destination: true,
  cargoType: true,
  weight: true,
  volume: true,
  pickupDate: true,
  deliveryDate: true,
  notes: true,
  requireInsurance: true,
  status: true,
});

// Quotes
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  value: real("value").notNull(),
  estimatedDays: integer("estimated_days").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).pick({
  requestId: true,
  value: true,
  estimatedDays: true,
  notes: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFreightRequest = z.infer<typeof insertFreightRequestSchema>;
export type FreightRequest = typeof freightRequests.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Combined type for frontend
export type FreightRequestWithQuote = FreightRequest & {
  quote?: Quote;
  clientName?: string;
};
