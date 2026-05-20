CREATE TABLE `classroomSessionSummary` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`schoolId` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`triggerMode` text NOT NULL,
	`lastEventVersion` integer DEFAULT 0 NOT NULL,
	`summaryJson` text NOT NULL,
	`failureReason` text,
	`createdAt` integer,
	`updatedAt` integer,
	`finalizedAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classroomSessionSummary_sessionId_unique` ON `classroomSessionSummary` (`sessionId`);--> statement-breakpoint
CREATE INDEX `classroomSessionSummary_school_status_idx` ON `classroomSessionSummary` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `classroomSessionSummary_school_trigger_idx` ON `classroomSessionSummary` (`schoolId`,`triggerMode`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_account`("userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state") SELECT "userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_asyncTask` (
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
	`latestAttemptNumber` integer DEFAULT 0 NOT NULL,
	`latestFailureReason` text,
	`latestRecoveryJson` text,
	`createdAt` integer,
	`updatedAt` integer,
	`startedAt` integer,
	`completedAt` integer,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_asyncTask`("id", "actorId", "schoolId", "taskType", "featureArea", "status", "enqueueIntentStatus", "visibilityScope", "entityType", "entityId", "entityLabel", "labelKey", "summaryKey", "payloadJson", "latestProgressJson", "latestResultJson", "queueJobId", "latestAttemptNumber", "latestFailureReason", "latestRecoveryJson", "createdAt", "updatedAt", "startedAt", "completedAt") SELECT "id", "actorId", "schoolId", "taskType", "featureArea", "status", "enqueueIntentStatus", "visibilityScope", "entityType", "entityId", "entityLabel", "labelKey", "summaryKey", "payloadJson", "latestProgressJson", "latestResultJson", "queueJobId", "latestAttemptNumber", "latestFailureReason", "latestRecoveryJson", "createdAt", "updatedAt", "startedAt", "completedAt" FROM `asyncTask`;--> statement-breakpoint
DROP TABLE `asyncTask`;--> statement-breakpoint
ALTER TABLE `__new_asyncTask` RENAME TO `asyncTask`;--> statement-breakpoint
CREATE INDEX `asyncTasks_actor_status_idx` ON `asyncTask` (`actorId`,`status`);--> statement-breakpoint
CREATE INDEX `asyncTasks_school_status_idx` ON `asyncTask` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `asyncTasks_entity_idx` ON `asyncTask` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `asyncTasks_type_created_idx` ON `asyncTask` (`taskType`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `asyncTasks_queueJobId_unique` ON `asyncTask` (`queueJobId`);--> statement-breakpoint
CREATE TABLE `__new_classroomEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`version` integer NOT NULL,
	`type` text NOT NULL,
	`actorId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_classroomEvent`("id", "sessionId", "version", "type", "actorId", "payloadJson", "createdAt") SELECT "id", "sessionId", "version", "type", "actorId", "payloadJson", "createdAt" FROM `classroomEvent`;--> statement-breakpoint
DROP TABLE `classroomEvent`;--> statement-breakpoint
ALTER TABLE `__new_classroomEvent` RENAME TO `classroomEvent`;--> statement-breakpoint
CREATE INDEX `classroomEvents_session_version_idx` ON `classroomEvent` (`sessionId`,`version`);--> statement-breakpoint
CREATE INDEX `classroomEvents_session_created_idx` ON `classroomEvent` (`sessionId`,`createdAt`);