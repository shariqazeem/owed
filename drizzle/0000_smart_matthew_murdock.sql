CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`kind` text NOT NULL,
	`question` text NOT NULL,
	`context` text,
	`options` text NOT NULL,
	`answer` text,
	`answered_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ledger_id` text NOT NULL,
	`kind` text NOT NULL,
	`detail` text,
	`actor` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`title` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_summary` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`payout_to` text,
	`payout_label` text,
	`status` text DEFAULT 'collecting' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`person_id` text,
	`direction` text NOT NULL,
	`channel` text NOT NULL,
	`body` text NOT NULL,
	`intent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`person_id` text NOT NULL,
	`amount_base` integer NOT NULL,
	`note` text,
	`due_at` integer,
	`status` text DEFAULT 'owed' NOT NULL,
	`link_secret` text NOT NULL,
	`paid_at` integer,
	`paid_tx` text,
	`nudges` integer DEFAULT 0 NOT NULL,
	`last_nudged_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`obligation_id` text,
	`direction` text NOT NULL,
	`amount_base` integer NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`from_address` text,
	`to_address` text,
	`confirmed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_tx_hash_unique` ON `payments` (`tx_hash`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`name` text NOT NULL,
	`channel` text,
	`handle` text,
	`stopped` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
