import { z } from "zod";

import {
  TeachingActivityIntentSchema,
  TeachingActivityModeSchema,
  TeachingDesignFallbackReasonSchema,
  TeachingDesignStatusSchema,
} from "@/lib/dto/lesson-authoring";

export const ClassroomModeSchema = z.enum(["locked", "unlocked"]);
export const ClassroomConnectionStateSchema = z.enum(["connected", "reconnecting", "offline"]);
export const ClassroomEvidenceSourceTypeSchema = z.enum(["student-quick-response", "student-submission", "teacher-observation", "system"]);
export const ClassroomEvidenceTypeSchema = z.enum(["observation", "response", "artifact", "submission", "quiz-response"]);
export const ClassroomInterventionTargetScopeSchema = z.enum(["student", "class"]);
export const ClassroomTimelineEntryTypeSchema = z.enum(["presence_changed", "evidence_captured", "intervention_noted"]);
export const ClassroomParticipationLevelSchema = z.enum(["active", "normal", "attention"]);
export const ClassroomEvaluationTagSchema = z.enum(["主动发言", "专注跟进", "协作支持", "表达清晰", "需要提醒", "需要跟进"]);
export const ClassroomStudentDetailTabSchema = z.enum(["evidence", "evaluation"]);

export const ClassroomFormativeEvaluationPayloadSchema = z.object({
  kind: z.literal("formative-evaluation"),
  participationLevel: ClassroomParticipationLevelSchema,
  tags: z.array(ClassroomEvaluationTagSchema),
  observationNote: z.string(),
});

export const RecordStudentFormativeEvaluationInputSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
  participationLevel: ClassroomParticipationLevelSchema,
  tags: z.array(ClassroomEvaluationTagSchema),
  observationNote: z.string().trim().min(1).max(1000),
});

export const ListStudentFormativeEvaluationEntriesInputSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
});

export const StudentFormativeEvaluationEntryDTOSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  studentId: z.string(),
  participationLevel: ClassroomParticipationLevelSchema,
  tags: z.array(ClassroomEvaluationTagSchema),
  observationNote: z.string(),
  capturedById: z.string(),
  createdAt: z.string(),
});

export const GetClassroomStudentDetailInputSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1).optional(),
});

export const ClassroomSlideStateDTOSchema = z.object({
  stepId: z.string(),
  slideIndex: z.number().int().nonnegative(),
});

export const ClassroomStepDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  rank: z.string(),
  type: z.enum(["content", "task", "quiz"]).optional(),
  payload: z.unknown().optional(),
});

export const ClassroomLaunchPreviewStepDTOSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  title: z.string(),
  family: z.string(),
  summary: z.string(),
  activityIntent: TeachingActivityIntentSchema,
  activityMode: TeachingActivityModeSchema,
  estimatedMinutes: z.number().int().nonnegative(),
  evidenceSummary: z.string(),
  teachingDesignStatus: TeachingDesignStatusSchema,
  needsTeachingDesignRefinement: z.boolean(),
  teachingDesignFallbackReason: TeachingDesignFallbackReasonSchema.nullable(),
  materialCues: z.array(z.string()).default([]),
});

export const ClassroomLaunchPreviewDTOSchema = z.object({
  lessonId: z.string(),
  lessonTitle: z.string(),
  totalEstimatedMinutes: z.number().int().nonnegative(),
  stepCount: z.number().int().nonnegative(),
  steps: z.array(ClassroomLaunchPreviewStepDTOSchema),
});

export const ClassroomLaunchPreviewEmptyStateDTOSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const ClassroomLaunchReadinessIssueCodeSchema = z.enum([
  "NO_LAUNCHABLE_CLASSES",
  "TEACHING_DESIGN_NEEDS_REFINEMENT",
  "TEACHING_DESIGN_INFERRED",
  "MATERIAL_CUES_MISSING",
  "EVIDENCE_CUES_REVIEW",
]);

export const ClassroomLaunchReadinessIssueDTOSchema = z.object({
  code: ClassroomLaunchReadinessIssueCodeSchema,
  message: z.string(),
  stepId: z.string().nullable().optional(),
});

export const ClassroomLaunchReadinessDTOSchema = z.object({
  blockingIssues: z.array(ClassroomLaunchReadinessIssueDTOSchema),
  attentionIssues: z.array(ClassroomLaunchReadinessIssueDTOSchema),
  advisoryIssues: z.array(ClassroomLaunchReadinessIssueDTOSchema),
});

export const ClassroomLaunchRosterSummaryDTOSchema = z.object({
  classId: z.string(),
  className: z.string(),
  studentCount: z.number().int().nonnegative(),
  launchScopeLabel: z.string(),
  note: z.string(),
});

export const ClassroomLaunchClassOptionDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  studentCount: z.number().int().nonnegative(),
  rosterSummary: ClassroomLaunchRosterSummaryDTOSchema,
});

export const ClassroomLaunchLessonOptionDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  publishedVersionId: z.string(),
  courseId: z.string(),
  classes: z.array(ClassroomLaunchClassOptionDTOSchema),
  launchPreview: ClassroomLaunchPreviewDTOSchema,
  launchReadiness: ClassroomLaunchReadinessDTOSchema,
});

export const ClassroomLiveSessionSummaryDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  classId: z.string(),
  className: z.string(),
  updatedAt: z.string(),
  locked: z.boolean(),
  version: z.number().int(),
  status: z.literal("live"),
});

export const ClassroomConsoleDTOSchema = z.object({
  liveSessions: z.array(ClassroomLiveSessionSummaryDTOSchema),
  publishedLessons: z.array(ClassroomLaunchLessonOptionDTOSchema),
  emptyStateCopy: z.string(),
  launchPreviewEmptyState: ClassroomLaunchPreviewEmptyStateDTOSchema,
});

export const ClassroomParticipantDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  connectionState: ClassroomConnectionStateSchema,
  currentStepId: z.string(),
  lastSeenAt: z.string(),
});

export const ClassroomRosterSummaryDTOSchema = z.object({
  connectedCount: z.number().int().nonnegative(),
  reconnectingCount: z.number().int().nonnegative(),
  offlineCount: z.number().int().nonnegative(),
  needsAttentionCount: z.number().int().nonnegative(),
  submittedCount: z.number().int().nonnegative(),
});

export const ClassroomParticipantMonitoringDTOSchema = ClassroomParticipantDTOSchema.extend({
  progressLabel: z.enum(["跟随当前环节", "落后于当前环节", "已进入后续环节"]),
  submissionCount: z.number().int().nonnegative(),
  needsAttention: z.boolean(),
  attentionReasons: z.array(z.string()),
});

export const ClassroomTeacherTimelineEntryDTOSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  studentId: z.string().nullable(),
  studentName: z.string().nullable(),
  stepId: z.string().nullable(),
  stepTitle: z.string().nullable(),
  entryType: z.literal("intervention_noted"),
  title: z.string(),
  body: z.string(),
  targetScope: ClassroomInterventionTargetScopeSchema,
  targetLabel: z.string(),
  visibility: z.literal("teacher-only"),
  actorId: z.string(),
  createdAt: z.string(),
});

export const ClassroomSnapshotDTOSchema = z.object({
  sessionId: z.string(),
  lessonId: z.string(),
  publishedVersionId: z.string(),
  classId: z.string(),
  className: z.string(),
  teacherId: z.string(),
  lessonTitle: z.string(),
  activeStepId: z.string(),
  locked: z.boolean(),
  status: z.enum(["live", "ended"]),
  version: z.number().int(),
  updatedAt: z.string(),
  participants: z.array(ClassroomParticipantMonitoringDTOSchema),
  monitoringSummary: ClassroomRosterSummaryDTOSchema,
  steps: z.array(ClassroomStepDTOSchema),
  slideState: ClassroomSlideStateDTOSchema.nullable().default(null),
  teacherTimeline: z.array(ClassroomTeacherTimelineEntryDTOSchema).default([]),
  copy: z.object({
    staleRefreshRequired: z.string().default("课堂状态已经被更新。请先恢复最新状态，再继续操作。"),
    pendingAction: z.string().default("当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。"),
    reconnecting: z.string().default("正在重新连接课堂，会先显示最近一次课堂状态。"),
    restored: z.string().default("已恢复课堂状态，你现在看到的是最新步骤。"),
  }),
});

export const ClassroomEventDTOSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  version: z.number().int(),
  type: z.enum(["launched", "active_step_changed", "lock_mode_changed", "slide_changed", "snapshot_refreshed", "ended"]),
  actorId: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
});

export const RecordClassroomEvidenceInputSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1).optional(),
  stepId: z.string().min(1).optional(),
  sourceType: ClassroomEvidenceSourceTypeSchema,
  evidenceType: ClassroomEvidenceTypeSchema,
  payload: z.record(z.string(), z.unknown()),
}).superRefine((value, ctx) => {
  if (value.sourceType.startsWith("student-") && !value.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studentId"],
      message: "student evidence requires studentId",
    });
  }
});

export const StudentQuickResponseInputSchema = z.object({
  sessionId: z.string().min(1),
  lessonId: z.string().min(1),
  stepId: z.string().min(1),
  body: z.string().trim().min(1).max(500),
  sourceType: z.literal("student-quick-response").default("student-quick-response"),
  evidenceType: z.literal("response").default("response"),
});

export const RecordClassroomInterventionInputSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  targetScope: ClassroomInterventionTargetScopeSchema,
  studentId: z.string().min(1).optional(),
  stepId: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  if (value.targetScope === "student" && !value.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studentId"],
      message: "student scope requires studentId",
    });
  }

  if (value.targetScope === "class" && value.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studentId"],
      message: "class scope does not accept studentId",
    });
  }
});

export const ClassroomEvidenceDTOSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  studentId: z.string().nullable(),
  stepId: z.string().nullable(),
  sourceType: ClassroomEvidenceSourceTypeSchema,
  evidenceType: ClassroomEvidenceTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  capturedById: z.string(),
  createdAt: z.string(),
});

export const ClassroomStudentDetailDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  evidenceEntries: z.array(ClassroomEvidenceDTOSchema),
  evaluationEntries: z.array(StudentFormativeEvaluationEntryDTOSchema),
  latestParticipationLevel: ClassroomParticipationLevelSchema.nullable(),
});

export const ClassroomTimelineEntryDTOSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  studentId: z.string().nullable(),
  stepId: z.string().nullable(),
  entryType: ClassroomTimelineEntryTypeSchema,
  actorId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const LaunchClassroomInputSchema = z.object({
  lessonId: z.string(),
  publishedVersionId: z.string(),
  classId: z.string(),
});

export const ChangeClassroomStepInputSchema = z.object({
  sessionId: z.string(),
  targetStepId: z.string(),
  expectedVersion: z.number().int(),
});

export const ChangeClassroomModeInputSchema = z.object({
  sessionId: z.string(),
  locked: z.boolean(),
  expectedVersion: z.number().int(),
});

export const ChangeClassroomSlideInputSchema = z.object({
  sessionId: z.string(),
  stepId: z.string(),
  slideIndex: z.number().int().nonnegative(),
  expectedVersion: z.number().int(),
});

export const RefreshClassroomSnapshotInputSchema = z.object({
  sessionId: z.string(),
  expectedVersion: z.number().int().optional(),
});

export const TouchClassroomPresenceInputSchema = z.object({
  sessionId: z.string().min(1),
  connectionState: ClassroomConnectionStateSchema,
  currentStepId: z.string().nullable().optional(),
});

export const EndClassroomInputSchema = z.object({
  sessionId: z.string(),
});

export const PendingTeacherControlDTOSchema = z.object({
  actionType: z.enum(["change_step", "change_mode"]),
  targetStepId: z.string().optional(),
  targetLocked: z.boolean().optional(),
});

export const ClassroomActionResultDTOSchema = z.object({
  ok: z.boolean(),
  sessionId: z.string().optional(),
  snapshot: ClassroomSnapshotDTOSchema.optional(),
  error: z.string().optional(),
  code: z.enum(["conflict", "unauthorized", "not_found", "internal_error"]).optional(),
  expectedVersion: z.number().int().optional(),
  serverVersion: z.number().int().optional(),
});

export type ClassroomMode = z.infer<typeof ClassroomModeSchema>;
export type ClassroomConnectionState = z.infer<typeof ClassroomConnectionStateSchema>;
export type ClassroomParticipationLevel = z.infer<typeof ClassroomParticipationLevelSchema>;
export type ClassroomEvaluationTag = z.infer<typeof ClassroomEvaluationTagSchema>;
export type ClassroomStudentDetailTab = z.infer<typeof ClassroomStudentDetailTabSchema>;
export type ClassroomStepDTO = z.infer<typeof ClassroomStepDTOSchema>;
export type ClassroomSlideStateDTO = z.infer<typeof ClassroomSlideStateDTOSchema>;
export type ClassroomLaunchPreviewStepDTO = z.infer<typeof ClassroomLaunchPreviewStepDTOSchema>;
export type ClassroomLaunchPreviewDTO = z.infer<typeof ClassroomLaunchPreviewDTOSchema>;
export type ClassroomLaunchPreviewEmptyStateDTO = z.infer<typeof ClassroomLaunchPreviewEmptyStateDTOSchema>;
export type ClassroomLaunchReadinessIssueCode = z.infer<typeof ClassroomLaunchReadinessIssueCodeSchema>;
export type ClassroomLaunchReadinessIssueDTO = z.infer<typeof ClassroomLaunchReadinessIssueDTOSchema>;
export type ClassroomLaunchReadinessDTO = z.infer<typeof ClassroomLaunchReadinessDTOSchema>;
export type ClassroomLaunchRosterSummaryDTO = z.infer<typeof ClassroomLaunchRosterSummaryDTOSchema>;
export type ClassroomLaunchClassOptionDTO = z.infer<typeof ClassroomLaunchClassOptionDTOSchema>;
export type ClassroomLaunchLessonOptionDTO = z.infer<typeof ClassroomLaunchLessonOptionDTOSchema>;
export type ClassroomLiveSessionSummaryDTO = z.infer<typeof ClassroomLiveSessionSummaryDTOSchema>;
export type ClassroomRosterSummaryDTO = z.infer<typeof ClassroomRosterSummaryDTOSchema>;
export type ClassroomConsoleDTO = z.infer<typeof ClassroomConsoleDTOSchema>;
export type ClassroomParticipantDTO = z.infer<typeof ClassroomParticipantDTOSchema>;
export type ClassroomParticipantMonitoringDTO = z.infer<typeof ClassroomParticipantMonitoringDTOSchema>;
export type ClassroomSnapshotDTO = z.infer<typeof ClassroomSnapshotDTOSchema>;
export type ClassroomEventDTO = z.infer<typeof ClassroomEventDTOSchema>;
export type RecordClassroomEvidenceInput = z.infer<typeof RecordClassroomEvidenceInputSchema>;
export type StudentQuickResponseInput = z.infer<typeof StudentQuickResponseInputSchema>;
export type RecordClassroomInterventionInput = z.infer<typeof RecordClassroomInterventionInputSchema>;
export type ClassroomFormativeEvaluationPayload = z.infer<typeof ClassroomFormativeEvaluationPayloadSchema>;
export type RecordStudentFormativeEvaluationInput = z.infer<typeof RecordStudentFormativeEvaluationInputSchema>;
export type ListStudentFormativeEvaluationEntriesInput = z.infer<typeof ListStudentFormativeEvaluationEntriesInputSchema>;
export type StudentFormativeEvaluationEntryDTO = z.infer<typeof StudentFormativeEvaluationEntryDTOSchema>;
export type ClassroomStudentDetailDTO = z.infer<typeof ClassroomStudentDetailDTOSchema>;
export type GetClassroomStudentDetailInput = z.infer<typeof GetClassroomStudentDetailInputSchema>;
export type ClassroomEvidenceDTO = z.infer<typeof ClassroomEvidenceDTOSchema>;
export type ClassroomTimelineEntryDTO = z.infer<typeof ClassroomTimelineEntryDTOSchema>;
export type ClassroomTeacherTimelineEntryDTO = z.infer<typeof ClassroomTeacherTimelineEntryDTOSchema>;
export type LaunchClassroomInput = z.infer<typeof LaunchClassroomInputSchema>;
export type ChangeClassroomStepInput = z.infer<typeof ChangeClassroomStepInputSchema>;
export type ChangeClassroomModeInput = z.infer<typeof ChangeClassroomModeInputSchema>;
export type ChangeClassroomSlideInput = z.infer<typeof ChangeClassroomSlideInputSchema>;
export type RefreshClassroomSnapshotInput = z.infer<typeof RefreshClassroomSnapshotInputSchema>;
export type TouchClassroomPresenceInput = z.infer<typeof TouchClassroomPresenceInputSchema>;
export type EndClassroomInput = z.infer<typeof EndClassroomInputSchema>;
export type PendingTeacherControlDTO = z.infer<typeof PendingTeacherControlDTOSchema>;
export type ClassroomActionResultDTO = z.infer<typeof ClassroomActionResultDTOSchema>;
