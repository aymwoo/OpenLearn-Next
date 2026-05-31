ALTER TABLE `draftLessonVersion` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `draftLessonVersion` ADD `archivedAt` integer;--> statement-breakpoint
ALTER TABLE `lesson` ADD `aiDraftAppliedAt` integer;--> statement-breakpoint
ALTER TABLE `lesson` ADD `latestDraftVersionId` text;