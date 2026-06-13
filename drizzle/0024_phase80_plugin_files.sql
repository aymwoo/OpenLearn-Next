CREATE TABLE `pluginFile` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`operation` text NOT NULL,
	`sha256` text,
	`fileName` text NOT NULL,
	`mimeType` text,
	`diskPath` text,
	`sizeBytes` integer,
	`isLatest` integer DEFAULT true NOT NULL,
	`previousRowId` text,
	`createdAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pluginFiles_school_plugin_latest_idx` ON `pluginFile` (`schoolId`,`pluginId`,`isLatest`);
--> statement-breakpoint
CREATE INDEX `pluginFiles_sha256_idx` ON `pluginFile` (`sha256`);
--> statement-breakpoint
CREATE UNIQUE INDEX `pluginFiles_school_plugin_sha256_upload_unique` ON `pluginFile` (`schoolId`,`pluginId`,`sha256`);
