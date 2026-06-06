PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_plugin_owned_quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`pluginId` text NOT NULL,
	`classroomSession` text NOT NULL,
	`question` text NOT NULL,
	`prompt` text NOT NULL,
	`optionAText` text NOT NULL,
	`optionBText` text NOT NULL,
	`optionCText` text,
	`optionDText` text,
	`correctOption` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_plugin_owned_quiz_questions`(
	"id",
	"schoolId",
	"pluginId",
	"classroomSession",
	"question",
	"prompt",
	"optionAText",
	"optionBText",
	"optionCText",
	"optionDText",
	"correctOption",
	"createdAt",
	"updatedAt"
) SELECT
	"id",
	"schoolId",
	"pluginId",
	"classroomSession",
	"question",
	"prompt",
	'',
	'',
	NULL,
	NULL,
	"correctOption",
	"createdAt",
	"updatedAt"
FROM `plugin_owned_quiz_questions`;--> statement-breakpoint
DROP TABLE `plugin_owned_quiz_questions`;--> statement-breakpoint
ALTER TABLE `__new_plugin_owned_quiz_questions` RENAME TO `plugin_owned_quiz_questions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `plugin_owned_quiz_questions_schoolId_classroomSession_question_idx` ON `plugin_owned_quiz_questions` (`schoolId`,`classroomSession`,`question`);
