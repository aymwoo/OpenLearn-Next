CREATE TABLE `asyncWorkerHeartbeat` (
	`id` text PRIMARY KEY NOT NULL,
	`instanceId` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`queueNamesJson` text NOT NULL,
	`lastSeenAt` integer,
	`startedAt` integer,
	`stoppedAt` integer,
	`lastSignal` text,
	`detailJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asyncWorkerHeartbeat_instanceId_unique` ON `asyncWorkerHeartbeat` (`instanceId`);
--> statement-breakpoint
CREATE INDEX `asyncWorkerHeartbeat_status_seen_idx` ON `asyncWorkerHeartbeat` (`status`,`lastSeenAt`);
