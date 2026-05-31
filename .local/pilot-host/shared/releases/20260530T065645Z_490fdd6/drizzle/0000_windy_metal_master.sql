CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agentAuditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`action` text NOT NULL,
	`payloadJson` text NOT NULL,
	`actorId` text,
	`createdAt` integer,
	FOREIGN KEY (`agentId`) REFERENCES `agentRegistry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agentProposal` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`structuredOutputJson` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approvalState` text DEFAULT 'pending' NOT NULL,
	`requestedById` text NOT NULL,
	`approvedById` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`agentId`) REFERENCES `agentRegistry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requestedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approvedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agentRegistry` (
	`id` text PRIMARY KEY NOT NULL,
	`agentKey` text NOT NULL,
	`displayName` text NOT NULL,
	`capabilityManifestJson` text NOT NULL,
	`featureFlag` text,
	`enabled` integer DEFAULT false NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agentRegistry_agentKey_unique` ON `agentRegistry` (`agentKey`);--> statement-breakpoint
CREATE TABLE `asyncTaskEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`taskId` text NOT NULL,
	`eventType` text NOT NULL,
	`status` text NOT NULL,
	`attemptNumber` integer DEFAULT 0 NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`taskId`) REFERENCES `asyncTask`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asyncTaskEvents_task_created_idx` ON `asyncTaskEvent` (`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `asyncTaskEvents_status_created_idx` ON `asyncTaskEvent` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `asyncTaskEvents_task_attempt_idx` ON `asyncTaskEvent` (`taskId`,`attemptNumber`,`createdAt`);--> statement-breakpoint
CREATE TABLE `asyncTask` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text NOT NULL,
	`schoolId` text NOT NULL,
	`taskType` text NOT NULL,
	`featureArea` text NOT NULL,
	`status` text DEFAULT 'pending_enqueue' NOT NULL,
	`enqueueIntentStatus` text DEFAULT 'pending_enqueue' NOT NULL,
	`visibilityScope` text DEFAULT 'actor_owned' NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`entityLabel` text,
	`labelKey` text NOT NULL,
	`summaryKey` text NOT NULL,
	`payloadJson` text NOT NULL,
	`latestProgressJson` text,
	`latestResultJson` text,
	`queueJobId` text,
	`latestAttemptNumber` integer DEFAULT 0 NOT NULL,
	`latestFailureReason` text,
	`latestRecoveryJson` text,
	`createdAt` integer,
	`updatedAt` integer,
	`startedAt` integer,
	`completedAt` integer,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asyncTasks_actor_status_idx` ON `asyncTask` (`actorId`,`status`);--> statement-breakpoint
CREATE INDEX `asyncTasks_school_status_idx` ON `asyncTask` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `asyncTasks_entity_idx` ON `asyncTask` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `asyncTasks_type_created_idx` ON `asyncTask` (`taskType`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `asyncTasks_queueJobId_unique` ON `asyncTask` (`queueJobId`);--> statement-breakpoint
CREATE TABLE `asyncWorkerHeartbeat` (
	`id` text PRIMARY KEY NOT NULL,
	`instanceId` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`queueNamesJson` text NOT NULL,
	`lastSeenAt` integer,
	`startedAt` integer,
	`stoppedAt` integer,
	`lastSignal` text,
	`detailJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asyncWorkerHeartbeat_instanceId_unique` ON `asyncWorkerHeartbeat` (`instanceId`);--> statement-breakpoint
CREATE INDEX `asyncWorkerHeartbeat_status_seen_idx` ON `asyncWorkerHeartbeat` (`status`,`lastSeenAt`);--> statement-breakpoint
CREATE TABLE `attemptFeedback` (
	`id` text PRIMARY KEY NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`teacherId` text NOT NULL,
	`studentId` text NOT NULL,
	`body` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`teacherId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attemptFeedback_target_unique` ON `attemptFeedback` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `attemptFeedback_target_idx` ON `attemptFeedback` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `attemptFeedback_student_idx` ON `attemptFeedback` (`studentId`);--> statement-breakpoint
CREATE TABLE `classMember` (
	`id` text PRIMARY KEY NOT NULL,
	`classId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`classId`) REFERENCES `class`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classMember_classId_idx` ON `classMember` (`classId`);--> statement-breakpoint
CREATE INDEX `classMember_userId_idx` ON `classMember` (`userId`);--> statement-breakpoint
CREATE TABLE `class` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `classroomEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`version` integer NOT NULL,
	`type` text NOT NULL,
	`actorId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classroomEvents_session_version_idx` ON `classroomEvent` (`sessionId`,`version`);--> statement-breakpoint
CREATE INDEX `classroomEvents_session_created_idx` ON `classroomEvent` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `classroomEvidence` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`studentId` text,
	`stepId` text,
	`sourceType` text NOT NULL,
	`evidenceType` text NOT NULL,
	`payloadJson` text NOT NULL,
	`capturedById` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`capturedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classroomEvidence_session_created_idx` ON `classroomEvidence` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `classroomEvidence_session_student_idx` ON `classroomEvidence` (`sessionId`,`studentId`);--> statement-breakpoint
CREATE INDEX `classroomEvidence_session_step_idx` ON `classroomEvidence` (`sessionId`,`stepId`);--> statement-breakpoint
CREATE TABLE `classroomParticipant` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`studentId` text NOT NULL,
	`classMemberId` text NOT NULL,
	`connectionState` text DEFAULT 'offline' NOT NULL,
	`currentStepId` text NOT NULL,
	`lastSeenAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classMemberId`) REFERENCES `classMember`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`currentStepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classroomParticipants_session_student_unique` ON `classroomParticipant` (`sessionId`,`studentId`);--> statement-breakpoint
CREATE INDEX `classroomParticipants_session_idx` ON `classroomParticipant` (`sessionId`);--> statement-breakpoint
CREATE INDEX `classroomParticipants_student_idx` ON `classroomParticipant` (`studentId`);--> statement-breakpoint
CREATE TABLE `classroomSessionSummary` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`schoolId` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`triggerMode` text NOT NULL,
	`lastEventVersion` integer DEFAULT 0 NOT NULL,
	`summaryJson` text NOT NULL,
	`failureReason` text,
	`createdAt` integer,
	`updatedAt` integer,
	`finalizedAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classroomSessionSummary_sessionId_unique` ON `classroomSessionSummary` (`sessionId`);--> statement-breakpoint
CREATE INDEX `classroomSessionSummary_school_status_idx` ON `classroomSessionSummary` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `classroomSessionSummary_school_trigger_idx` ON `classroomSessionSummary` (`schoolId`,`triggerMode`);--> statement-breakpoint
CREATE TABLE `classroomSession` (
	`id` text PRIMARY KEY NOT NULL,
	`lessonId` text NOT NULL,
	`publishedVersionId` text NOT NULL,
	`classId` text NOT NULL,
	`teacherId` text NOT NULL,
	`activeStepId` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`transportModeSnapshot` text DEFAULT 'local_only' NOT NULL,
	`status` text DEFAULT 'live' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`endedAt` integer,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`publishedVersionId`) REFERENCES `publishedLessonVersion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classId`) REFERENCES `class`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacherId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activeStepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classroomSessions_lesson_class_status_idx` ON `classroomSession` (`lessonId`,`classId`,`status`);--> statement-breakpoint
CREATE INDEX `classroomSessions_version_idx` ON `classroomSession` (`version`);--> statement-breakpoint
CREATE TABLE `classroomTimeline` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`studentId` text,
	`stepId` text,
	`entryType` text NOT NULL,
	`actorId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`sessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classroomTimeline_session_created_idx` ON `classroomTimeline` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `classroomTimeline_session_entryType_idx` ON `classroomTimeline` (`sessionId`,`entryType`);--> statement-breakpoint
CREATE INDEX `classroomTimeline_session_student_idx` ON `classroomTimeline` (`sessionId`,`studentId`);--> statement-breakpoint
CREATE TABLE `courseClass` (
	`courseId` text NOT NULL,
	`classId` text NOT NULL,
	PRIMARY KEY(`courseId`, `classId`),
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classId`) REFERENCES `class`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `courseEnrollment` (
	`id` text PRIMARY KEY NOT NULL,
	`courseId` text NOT NULL,
	`studentId` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courseEnrollments_course_student_unique` ON `courseEnrollment` (`courseId`,`studentId`);--> statement-breakpoint
CREATE INDEX `courseEnrollments_courseId_idx` ON `courseEnrollment` (`courseId`);--> statement-breakpoint
CREATE INDEX `courseEnrollments_studentId_idx` ON `courseEnrollment` (`studentId`);--> statement-breakpoint
CREATE TABLE `courseImportBatch` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`actorId` text NOT NULL,
	`sourceType` text DEFAULT 'csv' NOT NULL,
	`sourceLabel` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`rowCount` integer DEFAULT 0 NOT NULL,
	`createdCount` integer DEFAULT 0 NOT NULL,
	`updatedCount` integer DEFAULT 0 NOT NULL,
	`skippedCount` integer DEFAULT 0 NOT NULL,
	`failedCount` integer DEFAULT 0 NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`appliedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `courseImportBatch_school_status_idx` ON `courseImportBatch` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `courseImportBatch_actor_idx` ON `courseImportBatch` (`actorId`);--> statement-breakpoint
CREATE TABLE `courseImportRow` (
	`id` text PRIMARY KEY NOT NULL,
	`batchId` text NOT NULL,
	`sourceRowKey` text NOT NULL,
	`matchKey` text NOT NULL,
	`rawPayloadJson` text NOT NULL,
	`normalizedRowJson` text,
	`validationIssuesJson` text NOT NULL,
	`matchedCourseSnapshotJson` text,
	`status` text NOT NULL,
	`decision` text,
	`result` text,
	`resultReason` text,
	`appliedCourseId` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`batchId`) REFERENCES `courseImportBatch`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`appliedCourseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `courseImportRow_batch_status_idx` ON `courseImportRow` (`batchId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `courseImportRow_batch_rowKey_unique` ON `courseImportRow` (`batchId`,`sourceRowKey`);--> statement-breakpoint
CREATE INDEX `courseImportRow_batch_matchKey_idx` ON `courseImportRow` (`batchId`,`matchKey`);--> statement-breakpoint
CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`ownerId` text NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`grade` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `courses_schoolId_idx` ON `course` (`schoolId`);--> statement-breakpoint
CREATE INDEX `courses_ownerId_idx` ON `course` (`ownerId`);--> statement-breakpoint
CREATE TABLE `governanceAudit` (
	`id` text PRIMARY KEY NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`commandId` text,
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
	FOREIGN KEY (`commandId`) REFERENCES `platformCommand`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `governanceAudit_target_created_idx` ON `governanceAudit` (`targetType`,`targetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `governanceAudit_decision_created_idx` ON `governanceAudit` (`decision`,`createdAt`);--> statement-breakpoint
CREATE TABLE `knowledgeChunk` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`chunkIndex` integer NOT NULL,
	`textHash` text NOT NULL,
	`tokenEstimate` integer NOT NULL,
	`payloadJson` text NOT NULL,
	`metadataJson` text NOT NULL,
	`indexingStatus` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`sourceId`) REFERENCES `knowledgeSource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledgeChunks_source_chunk_unique` ON `knowledgeChunk` (`sourceId`,`chunkIndex`);--> statement-breakpoint
CREATE TABLE `knowledgeSource` (
	`id` text PRIMARY KEY NOT NULL,
	`resourceId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`resourceId`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledgeSources_resourceId_unique` ON `knowledgeSource` (`resourceId`);--> statement-breakpoint
CREATE TABLE `lessonMaterial` (
	`id` text PRIMARY KEY NOT NULL,
	`lessonId` text NOT NULL,
	`stepId` text,
	`title` text NOT NULL,
	`kind` text DEFAULT 'link' NOT NULL,
	`url` text,
	`note` text,
	`createdAt` integer,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessonMaterials_lessonId_idx` ON `lessonMaterial` (`lessonId`);--> statement-breakpoint
CREATE TABLE `lessonStepProgress` (
	`id` text PRIMARY KEY NOT NULL,
	`publishedVersionId` text NOT NULL,
	`lessonId` text NOT NULL,
	`stepId` text NOT NULL,
	`studentId` text NOT NULL,
	`state` text DEFAULT 'not_started' NOT NULL,
	`completedAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`publishedVersionId`) REFERENCES `publishedLessonVersion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessonStepProgress_identity_unique` ON `lessonStepProgress` (`publishedVersionId`,`stepId`,`studentId`);--> statement-breakpoint
CREATE INDEX `lessonStepProgress_version_student_idx` ON `lessonStepProgress` (`publishedVersionId`,`studentId`);--> statement-breakpoint
CREATE INDEX `lessonStepProgress_lesson_student_idx` ON `lessonStepProgress` (`lessonId`,`studentId`);--> statement-breakpoint
CREATE TABLE `lessonStep` (
	`id` text PRIMARY KEY NOT NULL,
	`lessonId` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`rank` text NOT NULL,
	`payloadJson` text NOT NULL,
	`archivedAt` integer,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessonSteps_lessonId_rank_idx` ON `lessonStep` (`lessonId`,`rank`);--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`courseId` text NOT NULL,
	`createdById` text NOT NULL,
	`title` text NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`publishedVersionId` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessons_courseId_idx` ON `lesson` (`courseId`);--> statement-breakpoint
CREATE TABLE `mcpAuditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text NOT NULL,
	`action` text NOT NULL,
	`payloadJson` text NOT NULL,
	`actorId` text,
	`createdAt` integer,
	FOREIGN KEY (`serverId`) REFERENCES `mcpServer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcpCapability` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`allowedRolesJson` text NOT NULL,
	`courseId` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`serverId`) REFERENCES `mcpServer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcpCredentialRef` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text NOT NULL,
	`credentialRef` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`scopesJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`serverId`) REFERENCES `mcpServer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcpServer` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `membership` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`schoolId` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `membership_userId_idx` ON `membership` (`userId`);--> statement-breakpoint
CREATE INDEX `membership_schoolId_idx` ON `membership` (`schoolId`);--> statement-breakpoint
CREATE TABLE `platformCommandAttempt` (
	`id` text PRIMARY KEY NOT NULL,
	`commandId` text NOT NULL,
	`attemptNumber` integer NOT NULL,
	`status` text NOT NULL,
	`resultSummaryJson` text,
	`failureDetailJson` text,
	`startedAt` integer,
	`completedAt` integer,
	`createdAt` integer,
	FOREIGN KEY (`commandId`) REFERENCES `platformCommand`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platformCommandAttempts_command_attempt_unique` ON `platformCommandAttempt` (`commandId`,`attemptNumber`);--> statement-breakpoint
CREATE INDEX `platformCommandAttempts_command_attempt_idx` ON `platformCommandAttempt` (`commandId`,`attemptNumber`);--> statement-breakpoint
CREATE TABLE `platformCommand` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text NOT NULL,
	`schoolId` text NOT NULL,
	`commandType` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dedupeKey` text NOT NULL,
	`actorScope` text NOT NULL,
	`scopeJson` text NOT NULL,
	`payloadJson` text NOT NULL,
	`correlationJson` text NOT NULL,
	`resultSummaryJson` text,
	`failureDetailJson` text,
	`latestAttemptNumber` integer DEFAULT 0 NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`completedAt` integer,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platformCommands_dedupeKey_unique` ON `platformCommand` (`dedupeKey`);--> statement-breakpoint
CREATE INDEX `platformCommands_type_created_idx` ON `platformCommand` (`commandType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platformCommands_school_status_created_idx` ON `platformCommand` (`schoolId`,`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `pluginActionAudit` (
	`id` text PRIMARY KEY NOT NULL,
	`pluginId` text NOT NULL,
	`commandId` text,
	`action` text NOT NULL,
	`decision` text DEFAULT 'allowed' NOT NULL,
	`reasonCode` text,
	`schoolId` text,
	`actorScope` text,
	`lifecycleState` text,
	`correlationId` text,
	`payloadJson` text NOT NULL,
	`actorId` text,
	`createdAt` integer,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`commandId`) REFERENCES `platformCommand`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pluginActionAudit_plugin_created_idx` ON `pluginActionAudit` (`pluginId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pluginActionAudit_decision_created_idx` ON `pluginActionAudit` (`decision`,`createdAt`);--> statement-breakpoint
CREATE TABLE `pluginHookRun` (
	`id` text PRIMARY KEY NOT NULL,
	`pluginId` text NOT NULL,
	`hookAnchor` text NOT NULL,
	`status` text NOT NULL,
	`durationMs` integer NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`pluginId`) REFERENCES `pluginRegistration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `pluginRegistration` (
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
	`uninstalledAt` integer,
	`uninstallRetentionMode` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pluginRegistration_school_pluginKey_unique` ON `pluginRegistration` (`schoolId`,`pluginKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `pluginRegistration_school_dbNamespace_unique` ON `pluginRegistration` (`schoolId`,`dbNamespace`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `plugin_ext_resource_school_plugin_entity_unique` ON `plugin_ext_resource` (`schoolId`,`pluginId`,`resourceId`);--> statement-breakpoint
CREATE TABLE `publishedLessonVersion` (
	`id` text PRIMARY KEY NOT NULL,
	`lessonId` text NOT NULL,
	`version` integer NOT NULL,
	`snapshotJson` text NOT NULL,
	`publishedById` text NOT NULL,
	`publishedAt` integer,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`publishedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publishedLessonVersions_lessonId_version_idx` ON `publishedLessonVersion` (`lessonId`,`version`);--> statement-breakpoint
CREATE TABLE `quizAttempt` (
	`id` text PRIMARY KEY NOT NULL,
	`publishedVersionId` text NOT NULL,
	`lessonId` text NOT NULL,
	`stepId` text NOT NULL,
	`studentId` text NOT NULL,
	`attemptNo` integer NOT NULL,
	`answerJson` text NOT NULL,
	`outcomeJson` text NOT NULL,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`publishedVersionId`) REFERENCES `publishedLessonVersion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quizAttempts_attempt_unique` ON `quizAttempt` (`publishedVersionId`,`stepId`,`studentId`,`attemptNo`);--> statement-breakpoint
CREATE INDEX `quizAttempts_latest_idx` ON `quizAttempt` (`publishedVersionId`,`stepId`,`studentId`,`isLatest`);--> statement-breakpoint
CREATE INDEX `quizAttempts_history_idx` ON `quizAttempt` (`publishedVersionId`,`stepId`,`studentId`,`attemptNo`);--> statement-breakpoint
CREATE TABLE `resource` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`ownerId` text NOT NULL,
	`courseId` text,
	`title` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`classification` text NOT NULL,
	`ragEligible` integer DEFAULT false NOT NULL,
	`url` text,
	`content` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resources_schoolId_idx` ON `resource` (`schoolId`);--> statement-breakpoint
CREATE INDEX `resources_ownerId_idx` ON `resource` (`ownerId`);--> statement-breakpoint
CREATE INDEX `resources_courseId_idx` ON `resource` (`courseId`);--> statement-breakpoint
CREATE TABLE `runtimeEventOutbox` (
	`id` text PRIMARY KEY NOT NULL,
	`runtimeSessionId` text NOT NULL,
	`classroomSessionId` text NOT NULL,
	`stepId` text NOT NULL,
	`eventType` text NOT NULL,
	`messageId` text NOT NULL,
	`correlationId` text NOT NULL,
	`payloadJson` text NOT NULL,
	`deliveryChannel` text NOT NULL,
	`deliveryStatus` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer,
	`deliveredAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtimeEventOutbox_message_unique` ON `runtimeEventOutbox` (`messageId`);--> statement-breakpoint
CREATE INDEX `runtimeEventOutbox_session_created_idx` ON `runtimeEventOutbox` (`runtimeSessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `runtimeEventOutbox_delivery_idx` ON `runtimeEventOutbox` (`deliveryStatus`,`deliveryChannel`,`createdAt`);--> statement-breakpoint
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
CREATE TABLE `runtimeStepSession` (
	`id` text PRIMARY KEY NOT NULL,
	`classroomSessionId` text NOT NULL,
	`publishedVersionId` text NOT NULL,
	`lessonId` text NOT NULL,
	`stepId` text NOT NULL,
	`runtimeId` text NOT NULL,
	`runtimeVersion` text NOT NULL,
	`actorId` text NOT NULL,
	`actorScope` text NOT NULL,
	`schoolId` text NOT NULL,
	`resetReason` text,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`classroomSessionId`) REFERENCES `classroomSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`publishedVersionId`) REFERENCES `publishedLessonVersion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runtimeStepSessions_latest_identity_idx` ON `runtimeStepSession` (`classroomSessionId`,`stepId`,`actorId`,`actorScope`,`runtimeVersion`,`isLatest`);--> statement-breakpoint
CREATE INDEX `runtimeStepSessions_classroom_step_actor_idx` ON `runtimeStepSession` (`classroomSessionId`,`stepId`,`actorId`);--> statement-breakpoint
CREATE INDEX `runtimeStepSessions_actor_history_idx` ON `runtimeStepSession` (`actorId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `runtimeStepState` (
	`id` text PRIMARY KEY NOT NULL,
	`runtimeSessionId` text NOT NULL,
	`stateVersion` integer NOT NULL,
	`kind` text NOT NULL,
	`stateJson` text NOT NULL,
	`summaryJson` text NOT NULL,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`runtimeSessionId`) REFERENCES `runtimeStepSession`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtimeStepStates_session_version_unique` ON `runtimeStepState` (`runtimeSessionId`,`stateVersion`);--> statement-breakpoint
CREATE INDEX `runtimeStepStates_session_latest_idx` ON `runtimeStepState` (`runtimeSessionId`,`isLatest`);--> statement-breakpoint
CREATE INDEX `runtimeStepStates_session_history_idx` ON `runtimeStepState` (`runtimeSessionId`,`stateVersion`);--> statement-breakpoint
CREATE TABLE `scheduleAssistantProposal` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`proposalType` text NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text NOT NULL,
	`reason` text NOT NULL,
	`impactScopeJson` text NOT NULL,
	`fieldsRequiringConfirmationJson` text NOT NULL,
	`draftPayloadJson` text,
	`requestedById` text NOT NULL,
	`approvedById` text,
	`rejectedById` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requestedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approvedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rejectedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleAssistantProposal_school_status_idx` ON `scheduleAssistantProposal` (`schoolId`,`status`);--> statement-breakpoint
CREATE TABLE `scheduleBellSlot` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`label` text NOT NULL,
	`startsAt` text NOT NULL,
	`endsAt` text NOT NULL,
	`sortOrder` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleBellSlot_school_label_unique` ON `scheduleBellSlot` (`schoolId`,`label`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleBellSlot_school_sortOrder_unique` ON `scheduleBellSlot` (`schoolId`,`sortOrder`);--> statement-breakpoint
CREATE TABLE `scheduleHolidayCalendar` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`termId` text,
	`name` text NOT NULL,
	`createdById` text NOT NULL,
	`updatedById` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`termId`) REFERENCES `scheduleTerm`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleHolidayCalendar_school_name_unique` ON `scheduleHolidayCalendar` (`schoolId`,`name`);--> statement-breakpoint
CREATE TABLE `scheduleHolidayDate` (
	`id` text PRIMARY KEY NOT NULL,
	`calendarId` text NOT NULL,
	`schoolId` text NOT NULL,
	`date` text NOT NULL,
	`dayType` text NOT NULL,
	`label` text NOT NULL,
	`note` text,
	`createdById` text NOT NULL,
	`updatedById` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`calendarId`) REFERENCES `scheduleHolidayCalendar`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleHolidayDate_calendar_date_unique` ON `scheduleHolidayDate` (`calendarId`,`date`);--> statement-breakpoint
CREATE INDEX `scheduleHolidayDate_school_date_idx` ON `scheduleHolidayDate` (`schoolId`,`date`);--> statement-breakpoint
CREATE TABLE `scheduleImportBatch` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceLabel` text NOT NULL,
	`connectorKey` text,
	`uploadedById` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`isPrimary` integer DEFAULT false NOT NULL,
	`rowCount` integer DEFAULT 0 NOT NULL,
	`approvedRowCount` integer DEFAULT 0 NOT NULL,
	`rejectedRowCount` integer DEFAULT 0 NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploadedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleImportBatch_school_status_idx` ON `scheduleImportBatch` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `scheduleImportBatch_uploadedBy_idx` ON `scheduleImportBatch` (`uploadedById`);--> statement-breakpoint
CREATE TABLE `scheduleImportRow` (
	`id` text PRIMARY KEY NOT NULL,
	`batchId` text NOT NULL,
	`sourceRowKey` text NOT NULL,
	`rawPayloadJson` text NOT NULL,
	`normalizedDraftJson` text,
	`validationIssuesJson` text NOT NULL,
	`mappingSummaryJson` text,
	`conflictSummaryJson` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`approvalState` text DEFAULT 'pending' NOT NULL,
	`approvalNote` text,
	`reviewedById` text,
	`reviewedAt` integer,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`batchId`) REFERENCES `scheduleImportBatch`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleImportRow_batch_status_idx` ON `scheduleImportRow` (`batchId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleImportRow_batch_rowKey_unique` ON `scheduleImportRow` (`batchId`,`sourceRowKey`);--> statement-breakpoint
CREATE TABLE `scheduleMutationAudit` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`actionType` text NOT NULL,
	`actorId` text NOT NULL,
	`reason` text,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleMutationAudit_entity_idx` ON `scheduleMutationAudit` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `scheduleMutationAudit_school_created_idx` ON `scheduleMutationAudit` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `scheduleOverride` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`assignmentId` text NOT NULL,
	`recurringEntryId` text NOT NULL,
	`teacherId` text NOT NULL,
	`classId` text NOT NULL,
	`effectiveDate` text NOT NULL,
	`actionType` text NOT NULL,
	`reason` text NOT NULL,
	`substituteTeacherId` text,
	`replacementBellSlotId` text,
	`replacementRoomLabel` text,
	`originalTeacherId` text NOT NULL,
	`originalBellSlotId` text NOT NULL,
	`originalRoomLabel` text,
	`status` text DEFAULT 'active' NOT NULL,
	`sourceProposalId` text,
	`createdById` text NOT NULL,
	`updatedById` text,
	`revokedAt` integer,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignmentId`) REFERENCES `scheduleTeachingAssignment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recurringEntryId`) REFERENCES `scheduleRecurringEntry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacherId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classId`) REFERENCES `class`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`substituteTeacherId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`replacementBellSlotId`) REFERENCES `scheduleBellSlot`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`originalTeacherId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`originalBellSlotId`) REFERENCES `scheduleBellSlot`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleOverride_school_effectiveDate_idx` ON `scheduleOverride` (`schoolId`,`effectiveDate`);--> statement-breakpoint
CREATE INDEX `scheduleOverride_teacher_effectiveDate_idx` ON `scheduleOverride` (`teacherId`,`effectiveDate`);--> statement-breakpoint
CREATE INDEX `scheduleOverride_class_effectiveDate_idx` ON `scheduleOverride` (`classId`,`effectiveDate`);--> statement-breakpoint
CREATE TABLE `scheduleRecurringEntry` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`assignmentId` text NOT NULL,
	`termId` text NOT NULL,
	`weekPatternId` text NOT NULL,
	`weekday` integer NOT NULL,
	`bellSlotId` text NOT NULL,
	`roomLabel` text,
	`lessonId` text,
	`sourceBatchId` text,
	`sourceRowId` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignmentId`) REFERENCES `scheduleTeachingAssignment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`termId`) REFERENCES `scheduleTerm`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weekPatternId`) REFERENCES `scheduleWeekPattern`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bellSlotId`) REFERENCES `scheduleBellSlot`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sourceBatchId`) REFERENCES `scheduleImportBatch`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sourceRowId`) REFERENCES `scheduleImportRow`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleRecurringEntry_identity_unique` ON `scheduleRecurringEntry` (`assignmentId`,`weekPatternId`,`weekday`,`bellSlotId`);--> statement-breakpoint
CREATE INDEX `scheduleRecurringEntry_term_weekday_idx` ON `scheduleRecurringEntry` (`termId`,`weekday`,`bellSlotId`);--> statement-breakpoint
CREATE TABLE `scheduleReminderDispatch` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`actorId` text,
	`ruleId` text,
	`type` text NOT NULL,
	`channel` text NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`targetLabel` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`scheduledFor` integer NOT NULL,
	`deliveryTaskId` text,
	`dispatchClaimedAt` integer,
	`dispatchClaimedBy` text,
	`lastAttemptAt` integer,
	`sentAt` integer,
	`failureReason` text,
	`payloadJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ruleId`) REFERENCES `scheduleReminderRule`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleReminderDispatch_school_status_idx` ON `scheduleReminderDispatch` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `scheduleReminderDispatch_school_scheduled_idx` ON `scheduleReminderDispatch` (`schoolId`,`scheduledFor`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleReminderDispatch_deliveryTaskId_unique` ON `scheduleReminderDispatch` (`deliveryTaskId`);--> statement-breakpoint
CREATE TABLE `scheduleReminderRule` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`type` text NOT NULL,
	`channel` text NOT NULL,
	`recipientScope` text NOT NULL,
	`offsetMinutes` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`createdById` text NOT NULL,
	`updatedById` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleReminderRule_school_type_idx` ON `scheduleReminderRule` (`schoolId`,`type`);--> statement-breakpoint
CREATE TABLE `scheduleTeachingAssignment` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`classId` text NOT NULL,
	`courseId` text NOT NULL,
	`teacherId` text NOT NULL,
	`termId` text NOT NULL,
	`roomLabel` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classId`) REFERENCES `class`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacherId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`termId`) REFERENCES `scheduleTerm`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduleTeachingAssignment_teacher_idx` ON `scheduleTeachingAssignment` (`teacherId`,`termId`);--> statement-breakpoint
CREATE INDEX `scheduleTeachingAssignment_class_idx` ON `scheduleTeachingAssignment` (`classId`,`termId`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleTeachingAssignment_scope_unique` ON `scheduleTeachingAssignment` (`schoolId`,`classId`,`courseId`,`teacherId`,`termId`);--> statement-breakpoint
CREATE TABLE `scheduleTerm` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`name` text NOT NULL,
	`startsOn` text NOT NULL,
	`endsOn` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleTerm_school_name_unique` ON `scheduleTerm` (`schoolId`,`name`);--> statement-breakpoint
CREATE TABLE `scheduleWeekPattern` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`termId` text NOT NULL,
	`name` text NOT NULL,
	`cycleLength` integer DEFAULT 1 NOT NULL,
	`anchorDate` text NOT NULL,
	`patternJson` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`termId`) REFERENCES `scheduleTerm`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduleWeekPattern_term_name_unique` ON `scheduleWeekPattern` (`termId`,`name`);--> statement-breakpoint
CREATE TABLE `school` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `systemTransportSetting` (
	`id` text PRIMARY KEY NOT NULL,
	`classroomTransportMode` text DEFAULT 'local_only' NOT NULL,
	`updatedById` text,
	`updatedAt` integer,
	FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `taskSubmission` (
	`id` text PRIMARY KEY NOT NULL,
	`publishedVersionId` text NOT NULL,
	`lessonId` text NOT NULL,
	`stepId` text NOT NULL,
	`studentId` text NOT NULL,
	`attemptNo` integer NOT NULL,
	`payloadJson` text NOT NULL,
	`isLatest` integer DEFAULT true NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`publishedVersionId`) REFERENCES `publishedLessonVersion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `lessonStep`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `taskSubmissions_attempt_unique` ON `taskSubmission` (`publishedVersionId`,`stepId`,`studentId`,`attemptNo`);--> statement-breakpoint
CREATE INDEX `taskSubmissions_latest_idx` ON `taskSubmission` (`publishedVersionId`,`stepId`,`studentId`,`isLatest`);--> statement-breakpoint
CREATE INDEX `taskSubmissions_history_idx` ON `taskSubmission` (`publishedVersionId`,`stepId`,`studentId`,`attemptNo`);--> statement-breakpoint
CREATE TABLE `themeAuditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`themeId` text NOT NULL,
	`action` text NOT NULL,
	`payloadJson` text NOT NULL,
	`actorId` text,
	`createdAt` integer,
	FOREIGN KEY (`themeId`) REFERENCES `themeTokenRegistry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `themeTokenRegistry` (
	`id` text PRIMARY KEY NOT NULL,
	`schoolId` text NOT NULL,
	`name` text NOT NULL,
	`tokenJson` text NOT NULL,
	`validationStatus` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`studentNumber` text,
	`gender` text,
	`emailVerified` integer,
	`password` text,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_studentNumber_unique` ON `user` (`studentNumber`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
