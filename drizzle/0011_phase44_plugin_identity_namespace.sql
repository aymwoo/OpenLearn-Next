-- Phase 44 namespace parity corpus (migration truth must stay aligned with DAL helper):
-- vendor/plugin-name -> vendor_plugin_name
-- vendor--plugin..name -> vendor_plugin_name
-- 123-plugin -> p_123_plugin
-- vendor/plugin-------------------------------------------extremely-long-suffix -> vendor_plugin_extremely_long_suffix
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pluginRegistration` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`name` text NOT NULL,
	`manifestJson` text NOT NULL,
	`pluginKey` text NOT NULL,
	`dbNamespace` text NOT NULL,
	`sourceType` text NOT NULL,
	`installSource` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`killSwitchEnabled` integer DEFAULT false NOT NULL,
	`lifecycleState` text DEFAULT 'installed' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_pluginRegistration`(
	"id",
	"schoolId",
	"name",
	"manifestJson",
	"pluginKey",
	"dbNamespace",
	"sourceType",
	"installSource",
	"enabled",
	"killSwitchEnabled",
	"lifecycleState",
	"createdAt",
	"updatedAt"
)
WITH normalized AS (
	SELECT
		pr.`id` AS `id`,
		pr.`schoolId` AS `schoolId`,
		pr.`name` AS `name`,
		pr.`manifestJson` AS `manifestJson`,
		json_extract(pr.`manifestJson`, '$.id') AS `pluginKey`,
		lower(json_extract(pr.`manifestJson`, '$.id')) AS `rawNamespace`,
		CASE
			WHEN coalesce(json_extract(pr.`manifestJson`, '$.builtIn'), 0) = 1
				OR coalesce(json_extract(pr.`manifestJson`, '$.defaultEnabled'), 0) = 1
			THEN 'default'
			ELSE 'external'
		END AS `sourceType`,
		CASE
			WHEN coalesce(json_extract(pr.`manifestJson`, '$.builtIn'), 0) = 1
				OR coalesce(json_extract(pr.`manifestJson`, '$.defaultEnabled'), 0) = 1
			THEN 'bootstrap'
			ELSE 'manual'
		END AS `installSource`,
		pr.`enabled` AS `enabled`,
		pr.`killSwitchEnabled` AS `killSwitchEnabled`,
		pr.`lifecycleState` AS `lifecycleState`,
		pr.`createdAt` AS `createdAt`,
		pr.`updatedAt` AS `updatedAt`
	FROM `pluginRegistration` AS pr
), sanitized AS (
	SELECT
		`id`,
		`schoolId`,
		`name`,
		`manifestJson`,
		`pluginKey`,
		trim(
			replace(
				replace(
					replace(
						replace(
							replace(
								replace(
									replace(
										replace(
											replace(
												replace(
													replace(
														replace(
															replace(
																rawNamespace,
																'-',
																'_'
															),
															'.',
															'_'
														),
														':',
														'_'
													),
													'/',
													'_'
												),
												'@',
												'_'
											),
											' ',
											'_'
										),
										'__',
										'_'
									),
									'__',
									'_'
								),
								'__',
								'_'
							),
							'__',
							'_'
						),
						'__',
						'_'
					),
					'__',
					'_'
				),
				'__',
				'_'
			),
			'_'
		) AS `namespaceCandidate`,
		`sourceType`,
		`installSource`,
		`enabled`,
		`killSwitchEnabled`,
		`lifecycleState`,
		`createdAt`,
		`updatedAt`
	FROM normalized
), frozen AS (
	SELECT
		`id`,
		`schoolId`,
		`name`,
		`manifestJson`,
		`pluginKey`,
		substr(
			CASE
				WHEN `namespaceCandidate` = '' THEN 'p_plugin'
				WHEN substr(`namespaceCandidate`, 1, 1) BETWEEN 'a' AND 'z' THEN `namespaceCandidate`
				ELSE 'p_' || `namespaceCandidate`
			END,
			1,
			48
		) AS `dbNamespace`,
		`sourceType`,
		`installSource`,
		`enabled`,
		`killSwitchEnabled`,
		`lifecycleState`,
		`createdAt`,
		`updatedAt`
	FROM sanitized
)
SELECT
	`id`,
	`schoolId`,
	`name`,
	`manifestJson`,
	`pluginKey`,
	`dbNamespace`,
	`sourceType`,
	`installSource`,
	`enabled`,
	`killSwitchEnabled`,
	`lifecycleState`,
	`createdAt`,
	`updatedAt`
FROM frozen;--> statement-breakpoint
DROP TABLE `pluginRegistration`;--> statement-breakpoint
ALTER TABLE `__new_pluginRegistration` RENAME TO `pluginRegistration`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `pluginRegistration_school_pluginKey_unique` ON `pluginRegistration` (`schoolId`,`pluginKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `pluginRegistration_school_dbNamespace_unique` ON `pluginRegistration` (`schoolId`,`dbNamespace`);
