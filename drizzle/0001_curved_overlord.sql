CREATE TABLE `runtimeEventOutbox` (
	`id` text PRIMARY KEY NOT NULL,
	`runtimeSessionId` text NOT NULL,
	`classroomSessionId` text NOT NULL,
	`stepId` text NOT NULL,
	`eventType` text NOT NULL,
	`messageId` text NOT NULL,
	`correlationId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`deliveryChannel` text NOT NULL,
	`deliveryStatus` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer,
	`deliveredAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtimeEventOutbox_message_unique` ON `runtimeEventOutbox` (`messageId`);--> statement-breakpoint
CREATE INDEX `runtimeEventOutbox_session_created_idx` ON `runtimeEventOutbox` (`runtimeSessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `runtimeEventOutbox_delivery_idx` ON `runtimeEventOutbox` (`deliveryStatus`,`deliveryChannel`,`createdAt`);--> statement-breakpoint
CREATE TABLE `runtimeStepSession` (
	`id` text PRIMARY KEY NOT NULL,
	`classroomSessionId` text NOT NULL,
	`publishedVersionId` text NOT NULL,
	`lessonId` text NOT NULL,
	`stepId` text NOT NULL,
	`runtimeId` text NOT NULL,
	`runtimeVersion` text NOT NULL,
	`actorId` text NOT NULL,
	`actorScope` text NOT NULL,
	`schoolId` text NOT NULL,
	`resetReason` text,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`publishedVersionId`) REFERENCES `publishedLessonVersion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtimeStepSessions_latest_identity_unique` ON `runtimeStepSession` (`classroomSessionId`,`stepId`,`actorId`,`actorScope`,`runtimeVersion`,`isLatest`);--> statement-breakpoint
CREATE INDEX `runtimeStepSessions_classroom_step_actor_idx` ON `runtimeStepSession` (`classroomSessionId`,`stepId`,`actorId`);--> statement-breakpoint
CREATE INDEX `runtimeStepSessions_actor_history_idx` ON `runtimeStepSession` (`actorId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `runtimeStepState` (
	`id` text PRIMARY KEY NOT NULL,
	`runtimeSessionId` text NOT NULL,
	`stateVersion` integer NOT NULL,
	`kind` text NOT NULL,
	`stateJson` text NOT NULL,
	`summaryJson` text NOT NULL,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtimeStepStates_session_version_unique` ON `runtimeStepState` (`runtimeSessionId`,`stateVersion`);--> statement-breakpoint
CREATE UNIQUE INDEX `runtimeStepStates_session_latest_unique` ON `runtimeStepState` (`runtimeSessionId`,`isLatest`);--> statement-breakpoint
CREATE INDEX `runtimeStepStates_session_history_idx` ON `runtimeStepState` (`runtimeSessionId`,`stateVersion`);