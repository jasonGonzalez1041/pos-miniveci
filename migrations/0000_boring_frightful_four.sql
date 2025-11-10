CREATE TABLE IF NOT EXISTS `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`image_url` text,
	`updated_at` integer DEFAULT (unixepoch()),
	`synced` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`deleted_at` integer,
	`synced` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`total` integer NOT NULL,
	`payment_method` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`deleted_at` integer,
	`synced` integer DEFAULT 0
);
