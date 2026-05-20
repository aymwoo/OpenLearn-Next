import { z } from "zod";

import {
  TeachingActivityIntentSchema,
  TeachingActivityModeSchema,
  TeachingDesignFallbackReasonSchema,
  TeachingDesignStatusSchema,
} from "@/lib/dto/lesson-authoring";
import {
  AttemptFeedbackDTOSchema,
  LearningProgressDTOSchema,
  QuizAttemptDTOSchema,
  TaskAttemptDTOSchema,
} from "@/lib/dto/learning";
import {
  RuntimeBootstrapRequestEnvelopeSchema,
  RuntimeReadyRequestEnvelopeSchema,
  RuntimeInteractionRequestEnvelopeSchema,
  RuntimeSaveRequestEnvelopeSchema,
  RuntimeSubmitRequestEnvelopeSchema,
  RuntimeTeacherControlRequestEnvelopeSchema,
  TeachingBridgeResultEnvelopeSchema,
} from "@/features/runtime-platform/contracts/bridge";
import {
  AsyncTaskOutcomeCountsSchema,
  AsyncTaskOutcomeStatusSchema,
  AsyncTaskResultSummarySchema,
} from "@/features/async-tasks/shared/contract";
export {
  CreateOrResumeRuntimeSessionInputSchema,
  RuntimeBootstrapDTOSchema,
  RuntimeCapabilityContextSummarySchema,
  RuntimeClassroomSummarySchema,
  RuntimeSessionIdentitySchema,
  RuntimeSessionSummarySchema,
  RuntimeStateSummarySchema,
  RuntimeStepSummarySchema,
  RuntimeLessonSummarySchema,
  RuntimeActorSummarySchema,
} from "@/features/runtime-platform/classroom/runtime-session-contracts";
import type {
  CreateOrResumeRuntimeSessionInput,
  RuntimeActorSummary,
  RuntimeBootstrapDTO,
  RuntimeCapabilityContextSummary,
  RuntimeClassroomSummary,
  RuntimeLessonSummary,
  RuntimeSessionIdentity,
  RuntimeSessionSummary,
  RuntimeStateSummary,
  RuntimeStepSummary,
} from "@/features/runtime-platform/classroom/runtime-session-contracts";

export const ClassroomModeSchema = z.enum(["locked", "unlocked"]);
export const ClassroomConnectionStateSchema = z.enum(["connected", "reconnecting", "offline"]);
export const ClassroomEvidenceSourceTypeSchema = z.enum(["student-quick-response", "student-submission", "teacher-observation", "system"]);
export const ClassroomEvidenceTypeSchema = z.enum(["observation", "response", "artifact", "submission", "quiz-response"]);
export const ClassroomInterventionTargetScopeSchema = z.enum(["student", "class"]);
export const ClassroomTimelineEntryTypeSchema = z.enum(["presence_changed", "evidence_captured", "intervention_noted"]);
export const ClassroomParticipationLevelSchema = z.enum(["active", "normal", "attention"]);
export const ClassroomEvaluationTagSchema = z.enum(["主动发言", "专注跟进", "协作支持", "表达清晰", "需要提醒", "需要跟进"]);
export const ClassroomStudentDetailTabSchema = z.enum(["evidence", "evaluation"]);
export const ClassroomSessionRecapDetailTabSchema = z.enum(["students", "steps"]);
export const ClassroomSessionParticipationLabelSchema = z.enum(["积极参与", "正常参与", "需要关注", "未评价"]);
export const ClassroomTrendViewSchema = z.enum(["sessions"]).default("sessions");
export const ClassroomTrendSignalLabelSchema = z.enum(["上升", "稳定", "回落", "需关注", "未评价"]);

export const ClassroomFormativeEvaluationPayloadSchema = z.object({
  kind: z.literal("formative-evaluation"),
  participationLevel: ClassroomParticipationLevelSchema,
  tags: z.array(ClassroomEvaluationTagSchema),
  observationNote: z.string(),
});

export const ClassroomEvidencePayloadDTOSchema = z
  .object({
    note: z.string().optional(),
    body: z.string().optional(),
    observationNote: z.string().optional(),
    title: z.string().optional(),
    lessonId: z.string().optional(),
    kind: z.string().optional(),
    participationLevel: ClassroomParticipationLevelSchema.optional(),
    tags: z.array(ClassroomEvaluationTagSchema).optional(),
    sourceType: ClassroomEvidenceSourceTypeSchema.optional(),
    evidenceType: ClassroomEvidenceTypeSchema.optional(),
    runtimeBridge: z.boolean().optional(),
    evidenceId: z.string().optional(),
  })
  .passthrough();

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

export const ClassroomConsoleSessionEntryDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  classId: z.string(),
  className: z.string(),
  updatedAt: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  locked: z.boolean(),
  version: z.number().int(),
  status: z.enum(["live", "ended"]),
});

export const ClassroomConsoleDTOSchema = z.object({
  liveSessions: z.array(ClassroomLiveSessionSummaryDTOSchema),
  sessionEntries: z.array(ClassroomConsoleSessionEntryDTOSchema),
  publishedLessons: z.array(ClassroomLaunchLessonOptionDTOSchema),
  emptyStateCopy: z.string(),
  launchPreviewEmptyState: ClassroomLaunchPreviewEmptyStateDTOSchema,
});

export const ClassroomSessionRecapEntryDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  createdAt: z.string().optional(),
});

export const ClassroomSessionRecapSummaryDTOSchema = z.object({
  completionLabel: z.string(),
  completionCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  submissionCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  participationBuckets: z.object({
    active: z.number().int().nonnegative(),
    normal: z.number().int().nonnegative(),
    attention: z.number().int().nonnegative(),
    unevaluated: z.number().int().nonnegative(),
  }),
});

export const ClassroomSessionWorkloadDTOSchema = z.object({
  followUpSignalsCount: z.number().int().nonnegative(),
  pendingFeedbackCount: z.number().int().nonnegative(),
});

export const ClassroomSessionRecapStudentSummaryDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  completionLabel: z.string(),
  participationLabel: ClassroomSessionParticipationLabelSchema,
  evidenceCount: z.number().int().nonnegative(),
  needsFollowUp: z.boolean(),
  pendingFeedbackCount: z.number().int().nonnegative(),
});

export const ClassroomSessionRecapStudentDetailDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  completionLabel: z.string(),
  participationLabel: ClassroomSessionParticipationLabelSchema,
  evidenceCount: z.number().int().nonnegative(),
  needsFollowUp: z.boolean(),
  pendingFeedbackCount: z.number().int().nonnegative(),
  completionItems: z.array(ClassroomSessionRecapEntryDTOSchema),
  submissionItems: z.array(ClassroomSessionRecapEntryDTOSchema),
  evaluationItems: z.array(ClassroomSessionRecapEntryDTOSchema),
  timelineItems: z.array(ClassroomSessionRecapEntryDTOSchema),
});

export const ClassroomSessionRecapStepSummaryDTOSchema = z.object({
  stepId: z.string(),
  stepTitle: z.string(),
  completionCount: z.number().int().nonnegative(),
  submissionCount: z.number().int().nonnegative(),
  attentionCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
});

export const GetClassroomSessionRecapInputSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1).optional(),
  stepId: z.string().min(1).optional(),
  detailTab: ClassroomSessionRecapDetailTabSchema.optional(),
});

export const ClassroomSessionRecapDTOSchema = z.object({
  session: z.object({
    id: z.string(),
    status: z.literal("ended"),
    lessonId: z.string(),
    classId: z.string(),
    lessonTitle: z.string(),
    className: z.string(),
    startedAt: z.string(),
    endedAt: z.string(),
  }),
  summary: ClassroomSessionRecapSummaryDTOSchema,
  workload: ClassroomSessionWorkloadDTOSchema,
  detailTab: ClassroomSessionRecapDetailTabSchema,
  studentSummaries: z.array(ClassroomSessionRecapStudentSummaryDTOSchema),
  selectedStudent: ClassroomSessionRecapStudentDetailDTOSchema.nullable(),
  stepSummaries: z.array(ClassroomSessionRecapStepSummaryDTOSchema),
  selectedStepId: z.string().nullable(),
});

export const ClassroomSessionSummaryTriggerModeSchema = z.enum(["incremental", "finalize"]);

export const ClassroomSessionSummaryTaskPayloadSchema = z.object({
  sessionId: z.string().min(1),
  schoolId: z.string().min(1),
  triggerMode: ClassroomSessionSummaryTriggerModeSchema,
  eventType: z.enum(["active_step_changed", "lock_mode_changed", "slide_changed", "ended"]),
  eventVersion: z.number().int().positive(),
}).strict();

export const ClassroomSessionSummaryArtifactSchema = z.object({
  sessionId: z.string(),
  lessonId: z.string(),
  classId: z.string(),
  lessonTitle: z.string(),
  className: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  completionLabel: z.string(),
  completionCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  submissionCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  participationBuckets: z.object({
    active: z.number().int().nonnegative(),
    normal: z.number().int().nonnegative(),
    attention: z.number().int().nonnegative(),
    unevaluated: z.number().int().nonnegative(),
  }),
  workload: ClassroomSessionWorkloadDTOSchema,
  studentSummaries: z.array(ClassroomSessionRecapStudentSummaryDTOSchema),
  stepSummaries: z.array(ClassroomSessionRecapStepSummaryDTOSchema),
}).strict();

export const ClassroomSessionSummaryTaskResultSchema = AsyncTaskResultSummarySchema.extend({
  sessionId: z.string().min(1),
  schoolId: z.string().min(1),
  triggerMode: ClassroomSessionSummaryTriggerModeSchema,
  eventType: ClassroomSessionSummaryTaskPayloadSchema.shape.eventType,
  eventVersion: z.number().int().positive(),
  artifactStatus: z.enum(["completed", "failed"]),
  counts: AsyncTaskOutcomeCountsSchema,
  outcome: AsyncTaskOutcomeStatusSchema,
  detail: z.object({
    sessionId: z.string().min(1),
    schoolId: z.string().min(1),
    triggerMode: ClassroomSessionSummaryTriggerModeSchema,
    eventType: ClassroomSessionSummaryTaskPayloadSchema.shape.eventType,
    eventVersion: z.number().int().positive(),
    lessonTitle: z.string().min(1),
    className: z.string().min(1),
    completionCount: z.number().int().nonnegative(),
    totalStudents: z.number().int().nonnegative(),
    submissionCount: z.number().int().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
    participationBuckets: ClassroomSessionSummaryArtifactSchema.shape.participationBuckets,
  }),
}).strict();

export const GetTeacherRecentSessionTrendInputSchema = z.object({
  classId: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  view: ClassroomTrendViewSchema.optional().default("sessions"),
  limit: z.number().int().positive().max(4).optional().default(4),
});

export const ClassroomTrendSessionPointDTOSchema = z.object({
  sessionId: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  classId: z.string(),
  className: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  completionRate: z.number().min(0).max(1),
  submissionRate: z.number().min(0).max(1),
  followUpSignalsCount: z.number().int().nonnegative(),
  pendingFeedbackCount: z.number().int().nonnegative(),
  attentionCount: z.number().int().nonnegative(),
  unevaluatedCount: z.number().int().nonnegative(),
  trendLabel: ClassroomTrendSignalLabelSchema,
  primaryRecapHref: z.string(),
  secondaryReviewHref: z.string().nullable(),
});

export const ClassroomClassTrendSummaryDTOSchema = z.object({
  classId: z.string(),
  className: z.string(),
  view: ClassroomTrendViewSchema,
  windowSize: z.number().int().positive(),
  sessionCount: z.number().int().nonnegative(),
  averageCompletionRate: z.number().min(0).max(1),
  averageSubmissionRate: z.number().min(0).max(1),
  totalFollowUpSignalsCount: z.number().int().nonnegative(),
  totalPendingFeedbackCount: z.number().int().nonnegative(),
  latestEndedAt: z.string().nullable(),
  trendLabel: ClassroomTrendSignalLabelSchema,
});

export const ClassroomStudentTrendSummaryDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  latestParticipationLabel: ClassroomSessionParticipationLabelSchema,
  needsFollowUpSessions: z.number().int().nonnegative(),
  unevaluatedSessions: z.number().int().nonnegative(),
  missingSubmissionSessions: z.number().int().nonnegative(),
  pendingFeedbackSessions: z.number().int().nonnegative(),
  primarySignalLabel: ClassroomTrendSignalLabelSchema,
  primaryRecapHref: z.string().nullable(),
  secondaryReviewHref: z.string().nullable(),
});

export const ClassroomTrendImpactedStudentDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  participationLabel: ClassroomSessionParticipationLabelSchema,
  needsFollowUp: z.boolean(),
  pendingFeedbackCount: z.number().int().nonnegative(),
  keySignals: z.array(z.string()),
  primaryRecapHref: z.string(),
  secondaryReviewHref: z.string().nullable(),
});

export const ClassroomTrendDetailDTOSchema = z.object({
  session: ClassroomTrendSessionPointDTOSchema,
  summary: z.string(),
  keySignals: z.array(z.string()),
  impactedStudents: z.array(ClassroomTrendImpactedStudentDTOSchema),
  primaryRecapHref: z.string(),
  secondaryReviewHref: z.string().nullable(),
});

export const ClassroomRecentSessionTrendDTOSchema = z.object({
  view: ClassroomTrendViewSchema,
  window: z.object({
    kind: z.literal("latest-ended-sessions"),
    limit: z.number().int().positive(),
  }),
  classSummary: ClassroomClassTrendSummaryDTOSchema,
  sessionPoints: z.array(ClassroomTrendSessionPointDTOSchema),
  studentSummaries: z.array(ClassroomStudentTrendSummaryDTOSchema),
  selectedSessionId: z.string().nullable(),
  selectedDetail: ClassroomTrendDetailDTOSchema.nullable(),
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
  runtimeProof: z
    .object({
      runtimeSessionId: z.string().min(1),
      runtimeInstanceId: z.string().min(1).nullable().default(null),
      submittedAt: z.string().min(1),
      status: z.enum(["submitted", "failed", "missing"]),
      summaryTitle: z.string().min(1),
      summaryLabel: z.string().min(1),
      inspectorHref: z.string().min(1),
    })
    .nullable()
    .default(null),
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
  transportStatus: z
    .object({
      fanoutMode: z.enum(["local_only", "redis_fanout"]),
      degraded: z.boolean(),
      degradedReason: z.string().nullable(),
    })
    .default({
      fanoutMode: "local_only",
      degraded: false,
      degradedReason: null,
    }),
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
  payload: ClassroomEvidencePayloadDTOSchema,
  capturedById: z.string(),
  createdAt: z.string(),
});

export const ClassroomStudentAttemptSummaryDTOSchema = z.object({
  pendingFeedbackCount: z.number().int().nonnegative(),
  latestTaskSubmissions: z.array(TaskAttemptDTOSchema),
  latestQuizAttempts: z.array(QuizAttemptDTOSchema),
  taskSubmissionHistory: z.array(TaskAttemptDTOSchema),
  quizAttemptHistory: z.array(QuizAttemptDTOSchema),
});

export const ClassroomStudentEvidenceItemDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  kind: z.enum(["presence", "progress", "task", "quiz", "response", "observation", "timeline", "feedback"]),
  createdAt: z.string().nullable().default(null),
  feedbackTarget: z
    .object({
      targetType: z.enum(["task_submission", "quiz_attempt"]),
      targetId: z.string(),
      latestFeedback: AttemptFeedbackDTOSchema.nullable().default(null),
    })
    .nullable()
    .default(null),
});

export const ClassroomStudentDetailDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  progressEntries: z.array(LearningProgressDTOSchema),
  evidenceEntries: z.array(ClassroomEvidenceDTOSchema),
  evaluationEntries: z.array(StudentFormativeEvaluationEntryDTOSchema),
  unifiedEvidenceItems: z.array(ClassroomStudentEvidenceItemDTOSchema),
  attemptSummary: ClassroomStudentAttemptSummaryDTOSchema,
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

export const BootstrapRuntimeSessionInputSchema = RuntimeBootstrapRequestEnvelopeSchema;
export const RecordRuntimeReadyInputSchema = RuntimeReadyRequestEnvelopeSchema;
export const RecordRuntimeInteractionInputSchema = RuntimeInteractionRequestEnvelopeSchema;
export const SaveRuntimeStateInputSchema = RuntimeSaveRequestEnvelopeSchema;
export const SubmitRuntimeStateInputSchema = RuntimeSubmitRequestEnvelopeSchema;
export const RecordRuntimeTeacherControlInputSchema = RuntimeTeacherControlRequestEnvelopeSchema;
export const RuntimeHostActionResultDTOSchema = TeachingBridgeResultEnvelopeSchema;

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
export type ClassroomConsoleSessionEntryDTO = z.infer<typeof ClassroomConsoleSessionEntryDTOSchema>;
export type ClassroomRosterSummaryDTO = z.infer<typeof ClassroomRosterSummaryDTOSchema>;
export type ClassroomConsoleDTO = z.infer<typeof ClassroomConsoleDTOSchema>;
export type ClassroomSessionRecapDetailTab = z.infer<typeof ClassroomSessionRecapDetailTabSchema>;
export type ClassroomSessionParticipationLabel = z.infer<typeof ClassroomSessionParticipationLabelSchema>;
export type ClassroomSessionRecapEntryDTO = z.infer<typeof ClassroomSessionRecapEntryDTOSchema>;
export type ClassroomSessionRecapSummaryDTO = z.infer<typeof ClassroomSessionRecapSummaryDTOSchema>;
export type ClassroomSessionWorkloadDTO = z.infer<typeof ClassroomSessionWorkloadDTOSchema>;
export type ClassroomSessionRecapStudentSummaryDTO = z.infer<typeof ClassroomSessionRecapStudentSummaryDTOSchema>;
export type ClassroomSessionRecapStudentDetailDTO = z.infer<typeof ClassroomSessionRecapStudentDetailDTOSchema>;
export type ClassroomSessionRecapStepSummaryDTO = z.infer<typeof ClassroomSessionRecapStepSummaryDTOSchema>;
export type ClassroomSessionSummaryTriggerMode = z.infer<typeof ClassroomSessionSummaryTriggerModeSchema>;
export type ClassroomSessionSummaryTaskPayload = z.infer<typeof ClassroomSessionSummaryTaskPayloadSchema>;
export type ClassroomSessionSummaryArtifact = z.infer<typeof ClassroomSessionSummaryArtifactSchema>;
export type ClassroomSessionSummaryTaskResult = z.infer<typeof ClassroomSessionSummaryTaskResultSchema>;
export type GetClassroomSessionRecapInput = z.infer<typeof GetClassroomSessionRecapInputSchema>;
export type ClassroomSessionRecapDTO = z.infer<typeof ClassroomSessionRecapDTOSchema>;
export type GetTeacherRecentSessionTrendInput = z.infer<typeof GetTeacherRecentSessionTrendInputSchema>;
export type ClassroomTrendSessionPointDTO = z.infer<typeof ClassroomTrendSessionPointDTOSchema>;
export type ClassroomClassTrendSummaryDTO = z.infer<typeof ClassroomClassTrendSummaryDTOSchema>;
export type ClassroomStudentTrendSummaryDTO = z.infer<typeof ClassroomStudentTrendSummaryDTOSchema>;
export type ClassroomTrendImpactedStudentDTO = z.infer<typeof ClassroomTrendImpactedStudentDTOSchema>;
export type ClassroomTrendDetailDTO = z.infer<typeof ClassroomTrendDetailDTOSchema>;
export type ClassroomRecentSessionTrendDTO = z.infer<typeof ClassroomRecentSessionTrendDTOSchema>;
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
export type ClassroomStudentAttemptSummaryDTO = z.infer<typeof ClassroomStudentAttemptSummaryDTOSchema>;
export type ClassroomStudentEvidenceItemDTO = z.infer<typeof ClassroomStudentEvidenceItemDTOSchema>;
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
export type BootstrapRuntimeSessionInput = z.infer<typeof BootstrapRuntimeSessionInputSchema>;
export type RecordRuntimeReadyInput = z.infer<typeof RecordRuntimeReadyInputSchema>;
export type RecordRuntimeInteractionInput = z.infer<typeof RecordRuntimeInteractionInputSchema>;
export type SaveRuntimeStateInput = z.infer<typeof SaveRuntimeStateInputSchema>;
export type SubmitRuntimeStateInput = z.infer<typeof SubmitRuntimeStateInputSchema>;
export type RecordRuntimeTeacherControlInput = z.infer<typeof RecordRuntimeTeacherControlInputSchema>;
export type RuntimeHostActionResultDTO = z.infer<typeof RuntimeHostActionResultDTOSchema>;
export type {
  RuntimeSessionIdentity,
  RuntimeSessionSummary,
  RuntimeStateSummary,
  RuntimeStepSummary,
  RuntimeLessonSummary,
  RuntimeClassroomSummary,
  RuntimeActorSummary,
  RuntimeCapabilityContextSummary,
  RuntimeBootstrapDTO,
  CreateOrResumeRuntimeSessionInput,
};
