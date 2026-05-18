ALTER TABLE `asyncTaskEvent` ADD `attemptNumber` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `asyncTaskEvents_task_attempt_idx` ON `asyncTaskEvent` (`taskId`,`attemptNumber`,`createdAt`);--> statement-breakpoint
ALTER TABLE `asyncTask` ADD `latestAttemptNumber` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `asyncTask` ADD `latestFailureReason` text;--> statement-breakpoint
ALTER TABLE `asyncTask` ADD `latestRecoveryJson` text;--> statement-breakpoint
CREATE UNIQUE INDEX `asyncTasks_queueJobId_unique` ON `asyncTask` (`queueJobId`);