CREATE TABLE `plugin_ext_lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`lessonId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_ext_lesson_school_plugin_entity_unique` ON `plugin_ext_lesson` (`schoolId`,`pluginId`,`lessonId`);--> statement-breakpoint
CREATE TABLE `plugin_ext_lesson_step` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`lessonStepId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonStepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_ext_lesson_step_school_plugin_entity_unique` ON `plugin_ext_lesson_step` (`schoolId`,`pluginId`,`lessonStepId`);--> statement-breakpoint
CREATE TABLE `plugin_owned_business_data` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`key` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_owned_biz_school_plugin_key_idx` ON `plugin_owned_business_data` (`schoolId`,`pluginId`,`key`);--> statement-breakpoint
CREATE TABLE `plugin_ext_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`resourceId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resourceId`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_ext_resource_school_plugin_entity_unique` ON `plugin_ext_resource` (`schoolId`,`pluginId`,`resourceId`);