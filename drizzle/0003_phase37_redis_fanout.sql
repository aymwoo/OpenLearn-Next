CREATE TABLE `systemTransportSetting` (
	`id` text PRIMARY KEY NOT NULL,
	`classroomTransportMode` text DEFAULT 'local_only' NOT NULL,
	`updatedById` text,
	`updatedAt` integer,
	FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `classroomSession` ADD `transportModeSnapshot` text DEFAULT 'local_only' NOT NULL;
