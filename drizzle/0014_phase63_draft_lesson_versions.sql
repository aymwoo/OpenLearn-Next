CREATE TABLE `draftLessonVersion` (
	`id` text PRIMARY KEY NOT NULL,
	`lessonId` text NOT NULL,
	`version` integer NOT NULL,
	`snapshotJson` text NOT NULL,
	`source` text DEFAULT 'ai' NOT NULL,
	`sourceCommandId` text NOT NULL,
	`createdById` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `draftLessonVersions_lessonId_version_idx` ON `draftLessonVersion` (`lessonId`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `draftLessonVersions_idempotency_unique` ON `draftLessonVersion` (`lessonId`,`sourceCommandId`);