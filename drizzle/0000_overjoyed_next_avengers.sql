CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `edits` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`version_id` text,
	`node_id` text NOT NULL,
	`path` text NOT NULL,
	`before` text,
	`after` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `edits_resume_idx` ON `edits` (`resume_id`,`at`);--> statement-breakpoint
CREATE TABLE `node_overrides` (
	`version_id` text NOT NULL,
	`node_id` text NOT NULL,
	`patch` text,
	`hidden` integer,
	`rank` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`version_id`, `node_id`),
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `node_overrides_version_idx` ON `node_overrides` (`version_id`);--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`rank` text NOT NULL,
	`data` text NOT NULL,
	`owner_version_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `nodes_resume_parent_idx` ON `nodes` (`resume_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `nodes_owner_version_idx` ON `nodes` (`owner_version_id`);--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resumes_collection_idx` ON `resumes` (`collection_id`);--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`name` text NOT NULL,
	`is_base` integer DEFAULT 0 NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`settings_patch` text,
	`created_from_version_id` text,
	`last_opened_at` integer,
	`archived_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `versions_resume_idx` ON `versions` (`resume_id`);