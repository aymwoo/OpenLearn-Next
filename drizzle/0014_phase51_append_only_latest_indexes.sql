DROP INDEX IF EXISTS `taskSubmissions_latest_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `quizAttempts_latest_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `runtimeStepSessions_latest_identity_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `runtimeStepStates_session_latest_unique`;--> statement-breakpoint
CREATE INDEX `runtimeStepSessions_latest_identity_idx` ON `runtimeStepSession` (`classroomSessionId`,`stepId`,`actorId`,`actorScope`,`runtimeVersion`,`isLatest`);--> statement-breakpoint
CREATE INDEX `runtimeStepStates_session_latest_idx` ON `runtimeStepState` (`runtimeSessionId`,`isLatest`);--> statement-breakpoint
