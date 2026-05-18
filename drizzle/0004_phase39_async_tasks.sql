CREATE TABLE `asyncTaskEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`taskId` text NOT NULL,
	`eventType` text NOT NULL,
	`status` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`taskId`) REFERENCES `asyncTask`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asyncTaskEvents_task_created_idx` ON `asyncTaskEvent` (`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `asyncTaskEvents_status_created_idx` ON `asyncTaskEvent` (`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `asyncTask` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text NOT NULL,
	`schoolId` text NOT NULL,
	`taskType` text NOT NULL,
	`featureArea` text NOT NULL,
	`status` text DEFAULT 'pending_enqueue' NOT NULL,
	`enqueueIntentStatus` text DEFAULT 'pending_enqueue' NOT NULL,
	`visibilityScope` text DEFAULT 'actor_owned' NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`entityLabel` text,
	`labelKey` text NOT NULL,
	`summaryKey` text NOT NULL,
	`payloadJson` text NOT NULL,
	`latestProgressJson` text,
	`latestResultJson` text,
	`queueJobId` text,
	`createdAt` integer,
	`updatedAt` integer,
	`startedAt` integer,
	`completedAt` integer,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asyncTasks_actor_status_idx` ON `asyncTask` (`actorId`,`status`);--> statement-breakpoint
CREATE INDEX `asyncTasks_school_status_idx` ON `asyncTask` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `asyncTasks_entity_idx` ON `asyncTask` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `asyncTasks_type_created_idx` ON `asyncTask` (`taskType`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `courseEnrollments_course_student_unique` ON `courseEnrollment` (`courseId`,`studentId`);