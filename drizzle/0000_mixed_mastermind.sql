CREATE TABLE `access_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`asset_id` text,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `access_tokens_contact_idx` ON `access_tokens` (`contact_id`);--> statement-breakpoint
CREATE TABLE `capture_events` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`event_type` text NOT NULL,
	`asset_id` text,
	`page_url` text,
	`target_query` text,
	`source` text NOT NULL,
	`utm_source` text,
	`utm_campaign` text,
	`newsletter_requested` integer DEFAULT 0 NOT NULL,
	`request_contact_consent` integer DEFAULT 0 NOT NULL,
	`consent_version` text NOT NULL,
	`consent_text` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'recorded' NOT NULL,
	`is_test` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `capture_events_contact_idx` ON `capture_events` (`contact_id`);--> statement-breakpoint
CREATE INDEX `capture_events_created_idx` ON `capture_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`newsletter_status` text DEFAULT 'not_requested' NOT NULL,
	`newsletter_requested_at` text,
	`suppressed_at` text,
	`is_test` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_email_unique` ON `contacts` (`email`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL
);
