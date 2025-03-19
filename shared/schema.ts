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
  originStreet: text("origin_street").notNull(),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  destinationStreet: text("destination_street").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  cargoType: text("cargo_type").notNull(),
  weight: real("weight").notNull(),
  volume: real("volume").notNull(),
  invoiceValue: real("invoice_value").notNull(), // Valor da nota fiscal
  pickupDate: text("pickup_date").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  notes: text("notes"),
  requireInsurance: boolean("require_insurance").default(false),
  status: text("status", { enum: requestStatus }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertFreightRequestSchema = createInsertSchema(freightRequests).pick({
  userId: true,
  originStreet: true,
  originCity: true,
  originState: true,
  destinationStreet: true,
  destinationCity: true,
  destinationState: true,
  cargoType: true,
  weight: true,
  volume: true,
  invoiceValue: true,
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
}).extend({
  distanceKm: z.number().optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFreightRequest = z.infer<typeof insertFreightRequestSchema>;
export type FreightRequest = typeof freightRequests.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect & {
  distanceKm?: number;
};

// Delivery proofs
export const deliveryProofs = pgTable("delivery_proofs", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  proofImage: text("proof_image").notNull(), // URL or Base64 da imagem
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliveryProofSchema = createInsertSchema(deliveryProofs).pick({
  requestId: true,
  proofImage: true,
  notes: true,
});

// Notifications
export const notificationTypes = ["status_update", "quote_received", "proof_uploaded"] as const;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestId: integer("request_id"),
  type: text("type", { enum: notificationTypes }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  requestId: true,
  type: true,
  message: true,
  read: true,
});

// Combined type for frontend
export type FreightRequestWithQuote = FreightRequest & {
  quote?: Quote;
  clientName?: string;
  deliveryProof?: DeliveryProof;
};

// Export delivery proof types
export type InsertDeliveryProof = z.infer<typeof insertDeliveryProofSchema>;
export type DeliveryProof = typeof deliveryProofs.$inferSelect;

// Export notification types
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
