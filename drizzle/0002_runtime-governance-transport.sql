CREATE TABLE `governanceAudit` (
	`id` text PRIMARY KEY NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`runtimeSessionId` text,
	`classroomSessionId` text,
	`pluginId` text,
	`schoolId` text,
	`action` text NOT NULL,
	`decision` text NOT NULL,
	`reasonCode` text,
	`actorId` text,
	`actorScope` text,
	`lifecycleState` text,
	`killSwitchEnabled` integer DEFAULT false NOT NULL,
	`requestedCapabilitiesJson` text NOT NULL,
	`grantedCapabilitiesJson` text NOT NULL,
	`requiredPermission` text,
	`correlationId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `governanceAudit_target_created_idx` ON `governanceAudit` (`targetType`,`targetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `governanceAudit_decision_created_idx` ON `governanceAudit` (`decision`,`createdAt`);--> statement-breakpoint
CREATE TABLE `pluginLifecycleTransition` (
	`id` text PRIMARY KEY NOT NULL,
	`pluginId` text NOT NULL,
	`fromState` text,
	`toState` text NOT NULL,
	`reason` text,
	`actorId` text,
	`createdAt` integer,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pluginLifecycleTransition_plugin_created_idx` ON `pluginLifecycleTransition` (`pluginId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `runtimeLifecycleTransition` (
	`id` text PRIMARY KEY NOT NULL,
	`runtimeSessionId` text NOT NULL,
	`fromState` text,
	`toState` text NOT NULL,
	`reason` text,
	`actorId` text,
	`createdAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runtimeLifecycleTransition_session_created_idx` ON `runtimeLifecycleTransition` (`runtimeSessionId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `transportConsumerTrace` (
	`id` text PRIMARY KEY NOT NULL,
	`attemptId` text,
	`classroomSessionId` text,
	`runtimeSessionId` text,
	`correlationId` text NOT NULL,
	`adapterId` text NOT NULL,
	`adapterMode` text NOT NULL,
	`traceType` text NOT NULL,
	`status` text NOT NULL,
	`snapshotVersion` integer,
	`detailJson` text NOT NULL,
	`emittedAt` integer,
	`failedAt` integer,
	`closedAt` integer,
	`createdAt` integer,
	FOREIGN KEY (`attemptId`) REFERENCES `transportDeliveryAttempt`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transportConsumerTrace_attempt_idx` ON `transportConsumerTrace` (`attemptId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transportConsumerTrace_session_idx` ON `transportConsumerTrace` (`classroomSessionId`,`runtimeSessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transportConsumerTrace_correlation_idx` ON `transportConsumerTrace` (`correlationId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `transportDeliveryAttempt` (
	`id` text PRIMARY KEY NOT NULL,
	`runtimeSessionId` text,
	`classroomSessionId` text,
	`schoolId` text,
	`truthRefType` text NOT NULL,
	`truthRefId` text NOT NULL,
	`channel` text NOT NULL,
	`kind` text NOT NULL,
	`adapterId` text,
	`adapterMode` text,
	`messageId` text NOT NULL,
	`correlationId` text NOT NULL,
	`truthPersisted` integer DEFAULT false NOT NULL,
	`deliveryAttempted` integer DEFAULT false NOT NULL,
	`attemptStatus` text DEFAULT 'pending' NOT NULL,
	`payloadSummaryJson` text NOT NULL,
	`failureReason` text,
	`attemptedAt` integer,
	`deliveredAt` integer,
	`failedAt` integer,
	`createdAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transportDeliveryAttempt_message_unique` ON `transportDeliveryAttempt` (`messageId`);--> statement-breakpoint
CREATE INDEX `transportDeliveryAttempt_truth_idx` ON `transportDeliveryAttempt` (`truthRefType`,`truthRefId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transportDeliveryAttempt_session_idx` ON `transportDeliveryAttempt` (`classroomSessionId`,`runtimeSessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transportDeliveryAttempt_correlation_idx` ON `transportDeliveryAttempt` (`correlationId`,`createdAt`);--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `decision` text DEFAULT 'allowed' NOT NULL;--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `reasonCode` text;--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `schoolId` text REFERENCES school(id);--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `actorScope` text;--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `lifecycleState` text;--> statement-breakpoint
ALTER TABLE `pluginActionAudit` ADD `correlationId` text;--> statement-breakpoint
CREATE INDEX `pluginActionAudit_plugin_created_idx` ON `pluginActionAudit` (`pluginId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pluginActionAudit_decision_created_idx` ON `pluginActionAudit` (`decision`,`createdAt`);--> statement-breakpoint
ALTER TABLE `pluginRegistration` ADD `lifecycleState` text DEFAULT 'installed' NOT NULL;