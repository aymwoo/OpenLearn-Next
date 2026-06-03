PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_plugin_owned_quiz_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`classroomSession` text NOT NULL,
	`student` text NOT NULL,
	`question` text NOT NULL,
	`selectedOption` text NOT NULL,
	`attemptNo` integer NOT NULL,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_plugin_owned_quiz_responses`("id", "schoolId", "pluginId", "classroomSession", "student", "question", "selectedOption", "attemptNo", "isLatest", "createdAt", "updatedAt") SELECT "id", "schoolId", "pluginId", "classroomSession", "student", "question", "selectedOption", 1, 1, "createdAt", "updatedAt" FROM `plugin_owned_quiz_responses`;--> statement-breakpoint
DROP TABLE `plugin_owned_quiz_responses`;--> statement-breakpoint
ALTER TABLE `__new_plugin_owned_quiz_responses` RENAME TO `plugin_owned_quiz_responses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `plugin_owned_quiz_responses_schoolId_classroomSession_student_question_idx` ON `plugin_owned_quiz_responses` (`schoolId`,`classroomSession`,`student`,`question`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_owned_quiz_responses_classroomSession_student_question_attemptNo_unique` ON `plugin_owned_quiz_responses` (`classroomSession`,`student`,`question`,`attemptNo`);--> statement-breakpoint
CREATE INDEX `plugin_owned_quiz_responses_classroomSession_student_question_isLatest_idx` ON `plugin_owned_quiz_responses` (`classroomSession`,`student`,`question`,`isLatest`);
