import { pgTable, text, integer, boolean, timestamp, json, decimal } from 'drizzle-orm/pg-core';

// Products table
export const products = pgTable('products', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    price: integer('price').notNull(),
    currency: text('currency').notNull().default('BDT'),
    stock: integer('stock').notNull().default(0),
    category: text('category').notNull(),
    image: text('image').default('/products/default.jpg'),
    maxDiscount: integer('max_discount').notNull().default(15),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
    id: text('id').primaryKey(),
    totalAmount: integer('total_amount').notNull(),
    discountAmount: integer('discount_amount').notNull().default(0),
    finalAmount: integer('final_amount').notNull(),
    status: text('status').notNull().default('pending_approval'),
    paymentMethod: text('payment_method'),
    paymentStatus: text('payment_status').default('pending'),
    trackingNumber: text('tracking_number'),
    courierName: text('courier_name'),
    ownerNotes: text('owner_notes'),
    counterOffer: text('counter_offer'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    approvedAt: timestamp('approved_at'),
    paidAt: timestamp('paid_at'),
    shippedAt: timestamp('shipped_at'),
});

// Order Items table
export const orderItems = pgTable('order_items', {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    productName: text('product_name').notNull(),
    quantity: integer('quantity').notNull(),
    originalPrice: integer('original_price').notNull(),
    finalPrice: integer('final_price').notNull(),
    discountPercent: integer('discount_percent').notNull().default(0),
});

// Customer Info table
export const customerInfo = pgTable('customer_info', {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    address: text('address').notNull(),
    city: text('city').notNull(),
    area: text('area'),
    notes: text('notes'),
});

// Settings table (key-value store for flexibility)
export const settings = pgTable('settings', {
    key: text('key').primaryKey(),
    value: json('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Newsletter Subscribers table
export const subscribers = pgTable('subscribers', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    status: text('status').notNull().default('active'), // active, unsubscribed
    subscribedAt: timestamp('subscribed_at').defaultNow(),
    unsubscribedAt: timestamp('unsubscribed_at'),
});

// Chat Sessions table for persistent chat history
export const chatSessions = pgTable('chat_sessions', {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(), // Browser session or user identifier
    messages: json('messages').notNull().default([]), // Array of chat messages
    customerPreferences: json('customer_preferences').default({}), // Remembered preferences
    lastProductViewed: text('last_product_viewed'),
    negotiatedDiscounts: json('negotiated_discounts').default({}), // Product-specific discounts
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Types for Drizzle
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type CustomerInfo = typeof customerInfo.$inferSelect;
export type NewCustomerInfo = typeof customerInfo.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

