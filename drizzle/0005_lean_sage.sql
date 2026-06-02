CREATE TABLE `plugin_owned_quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`classroomSession` text NOT NULL,
	`question` text NOT NULL,
	`prompt` text NOT NULL,
	`correctOption` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_owned_quiz_questions_schoolId_classroomSession_question_idx` ON `plugin_owned_quiz_questions` (`schoolId`,`classroomSession`,`question`);--> statement-breakpoint
CREATE TABLE `plugin_owned_quiz_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`classroomSession` text NOT NULL,
	`student` text NOT NULL,
	`question` text NOT NULL,
	`selectedOption` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_owned_quiz_responses_schoolId_classroomSession_student_question_idx` ON `plugin_owned_quiz_responses` (`schoolId`,`classroomSession`,`student`,`question`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_owned_quiz_responses_classroomSession_student_question_unique` ON `plugin_owned_quiz_responses` (`classroomSession`,`student`,`question`);--> statement-breakpoint
ALTER TABLE `pluginRegistration` ADD `dataVersion` integer DEFAULT 1 NOT NULL;