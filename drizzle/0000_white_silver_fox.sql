CREATE TABLE "customer_info" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"area" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"original_price" integer NOT NULL,
	"final_price" integer NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"total_amount" integer NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"final_amount" integer NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending',
	"tracking_number" text,
	"courier_name" text,
	"owner_notes" text,
	"counter_offer" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"paid_at" timestamp,
	"shipped_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"image" text DEFAULT '/products/default.jpg',
	"max_discount" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" json NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customer_info" ADD CONSTRAINT "customer_info_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;