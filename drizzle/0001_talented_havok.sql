CREATE TABLE `product_categories` (
	`product_id` text NOT NULL,
	`category_id` text NOT NULL,
	`evidence` text NOT NULL,
	PRIMARY KEY(`product_id`, `category_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_category_category_idx` ON `product_categories` (`category_id`);