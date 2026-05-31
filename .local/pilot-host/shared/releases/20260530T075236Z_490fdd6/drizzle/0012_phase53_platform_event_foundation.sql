CREATE TABLE `platformEventDispatch` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`commandId` text NOT NULL,
	`attemptNumber` integer NOT NULL,
	`correlationId` text NOT NULL,
	`causationId` text,
	`dispatchChannel` text NOT NULL,
	`dispatchStatus` text DEFAULT 'pending' NOT NULL,
	`adapterId` text,
	`failureReason` text,
	`createdAt` integer,
	`deliveredAt` integer,
	`failedAt` integer,
	FOREIGN KEY (`eventId`) REFERENCES `platformEvent`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`commandId`) REFERENCES `platformCommand`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platformEventDispatches_event_channel_unique` ON `platformEventDispatch` (`eventId`,`dispatchChannel`);--> statement-breakpoint
CREATE INDEX `platformEventDispatches_command_attempt_idx` ON `platformEventDispatch` (`commandId`,`attemptNumber`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformEventDispatches_status_channel_idx` ON `platformEventDispatch` (`dispatchStatus`,`dispatchChannel`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformEventDispatches_correlation_idx` ON `platformEventDispatch` (`correlationId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `platformEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`commandId` text NOT NULL,
	`attemptNumber` integer NOT NULL,
	`eventOrdinal` integer NOT NULL,
	`correlationId` text NOT NULL,
	`causationId` text,
	`eventType` text NOT NULL,
	`category` text NOT NULL,
	`aggregateType` text NOT NULL,
	`aggregateId` text NOT NULL,
	`payloadSummaryJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`commandId`) REFERENCES `platformCommand`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platformEvents_command_attempt_ordinal_unique` ON `platformEvent` (`commandId`,`attemptNumber`,`eventOrdinal`);--> statement-breakpoint
CREATE INDEX `platformEvents_command_attempt_created_idx` ON `platformEvent` (`commandId`,`attemptNumber`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformEvents_correlation_created_idx` ON `platformEvent` (`correlationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformEvents_eventType_created_idx` ON `platformEvent` (`eventType`,`createdAt`);--> statement-breakpoint
ALTER TABLE `platformCommand` ADD `invalidationTagsJson` text;--> statement-breakpoint
ALTER TABLE `platformCommand` ADD `failureAttributionJson` text;