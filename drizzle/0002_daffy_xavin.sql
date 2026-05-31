DROP INDEX `plugin_owned_biz_school_plugin_key_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_owned_biz_school_plugin_key_unique` ON `plugin_owned_business_data` (`schoolId`,`pluginId`,`key`);
