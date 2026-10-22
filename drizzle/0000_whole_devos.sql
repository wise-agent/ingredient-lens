CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dataset_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` integer PRIMARY KEY NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingredient_categories` (
	`ingredient_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`ingredient_id`, `category_id`),
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ingredient_category_category_idx` ON `ingredient_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_ingredients` (
	`product_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`relation` text NOT NULL,
	PRIMARY KEY(`product_id`, `ingredient_id`, `relation`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_ingredient_ingredient_idx` ON `product_ingredients` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `product_ingredient_product_idx` ON `product_ingredients` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`spec` text NOT NULL,
	`product_category` text NOT NULL,
	`trace_code` text NOT NULL,
	`ingredient_text` text NOT NULL,
	`warning_text` text NOT NULL,
	`ingredient_status` text NOT NULL,
	`has_ingredient_image` integer NOT NULL,
	`search_text` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`ingredient_status`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`product_category`);