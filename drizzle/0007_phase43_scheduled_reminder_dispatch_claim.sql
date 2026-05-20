ALTER TABLE `scheduleReminderDispatch` ADD `actorId` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `scheduleReminderDispatch` ADD `deliveryTaskId` text;--> statement-breakpoint
ALTER TABLE `scheduleReminderDispatch` ADD `dispatchClaimedAt` integer;--> statement-breakpoint
ALTER TABLE `scheduleReminderDispatch` ADD `dispatchClaimedBy` text;--> statement-breakpoint
UPDATE `scheduleReminderDispatch`
SET `actorId` = (
	SELECT `createdById`
	FROM `scheduleReminderRule`
	WHERE `scheduleReminderRule`.`id` = `scheduleReminderDispatch`.`ruleId`
	LIMIT 1
)
WHERE `actorId` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleReminderDispatch_deliveryTaskId_unique` ON `scheduleReminderDispatch` (`deliveryTaskId`);
