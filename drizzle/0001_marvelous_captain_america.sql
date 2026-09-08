ALTER TABLE `ledgers` ADD `rate_usdc_per_unit` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `ledgers` ADD `rate_source` text DEFAULT 'USDC is a dollar' NOT NULL;