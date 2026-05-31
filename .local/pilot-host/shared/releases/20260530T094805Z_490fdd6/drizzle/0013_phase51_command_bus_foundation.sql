CREATE TABLE `platformCommandAttempt` (
	`id` text PRIMARY KEY NOT NULL,
	`commandId` text NOT NULL,
	`attemptNumber` integer NOT NULL,
	`status` text NOT NULL,
	`resultSummaryJson` text,
	`failureDetailJson` text,
	`startedAt` integer,
	`completedAt` integer,
	`createdAt` integer,
	FOREIGN KEY (`commandId`) REFERENCES `platformCommand`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platformCommandAttempts_command_attempt_unique` ON `platformCommandAttempt` (`commandId`,`attemptNumber`);--> statement-breakpoint
CREATE INDEX `platformCommandAttempts_command_attempt_idx` ON `platformCommandAttempt` (`commandId`,`attemptNumber`);--> statement-breakpoint
CREATE TABLE `platformCommand` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text NOT NULL,
	`schoolId` text NOT NULL,
	`commandType` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dedupeKey` text NOT NULL,
	`actorScope` text NOT NULL,
	`scopeJson` text NOT NULL,
	`payloadJson` text NOT NULL,
	`correlationJson` text NOT NULL,
	`resultSummaryJson` text,
	`failureDetailJson` text,
	`latestAttemptNumber` integer DEFAULT 0 NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`completedAt` integer,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platformCommands_dedupeKey_unique` ON `platformCommand` (`dedupeKey`);--> statement-breakpoint
CREATE INDEX `platformCommands_type_created_idx` ON `platformCommand` (`commandType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformCommands_school_status_created_idx` ON `platformCommand` (`schoolId`,`status`,`createdAt`);--> statement-breakpoint
ALTER TABLE `governanceAudit` ADD `commandId` text REFERENCES platformCommand(id);--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `commandId` text REFERENCES platformCommand(id);
