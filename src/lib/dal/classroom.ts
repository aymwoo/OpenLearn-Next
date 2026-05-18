import "server-only";

import { and, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import {
  attemptFeedback,
  classes,
  classMembers,
  classroomEvents,
  classroomEvidence,
  classroomParticipants,
  classroomSessions,
  classroomTimeline,
  courses,
  courseClasses,
  courseEnrollments,
  lessons,
  lessonStepProgress,
  publishedLessonVersions,
  quizAttempts,
  taskSubmissions,
  users,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { classroomRedisFanoutManager } from "@/features/runtime-platform/seams/transport/redis-fanout-manager";
import { resolveSystemTransportModeForNewSessions } from "@/lib/dal/system-transport-settings";
import {
  ClassroomConsoleDTOSchema,
  ClassroomConsoleSessionEntryDTOSchema,
  ClassroomActionResultDTOSchema,
  ClassroomRecentSessionTrendDTOSchema,
  ClassroomEvidenceDTOSchema,
  ClassroomSessionRecapDTOSchema,
  ClassroomSessionParticipationLabelSchema,
  ClassroomSessionRecapDetailTabSchema,
  ClassroomStudentDetailDTOSchema,
  ClassroomSnapshotDTOSchema,
  ClassroomFormativeEvaluationPayloadSchema,
  GetClassroomSessionRecapInputSchema,
  GetClassroomStudentDetailInputSchema,
  ListStudentFormativeEvaluationEntriesInputSchema,
  RecordStudentFormativeEvaluationInputSchema,
  StudentQuickResponseInputSchema,
  StudentFormativeEvaluationEntryDTOSchema,
  ClassroomTimelineEntryDTOSchema,
  GetTeacherRecentSessionTrendInputSchema,
  RecordClassroomEvidenceInputSchema,
  RecordClassroomInterventionInputSchema,
  ChangeClassroomSlideInputSchema,
  LaunchClassroomInputSchema,
  ChangeClassroomStepInputSchema,
  ChangeClassroomModeInputSchema,
  RefreshClassroomSnapshotInputSchema,
  EndClassroomInputSchema,
} from "@/lib/dto/classroom";
import {
  LearningProgressDTOSchema,
  QuizAttemptDTOSchema,
  TaskAttemptDTOSchema,
} from "@/lib/dto/learning";
import {
  lessonStepPayloadSchema,
  type TeachingDesign,
} from "@/lib/dto/lesson-authoring";
import { resolveTeachingDesignInput } from "@/lib/teaching-design";
import {
  RuntimeHostActionResultDTOSchema,
} from "@/lib/dto/classroom";
import {
  RuntimeSaveResultSchema,
  RuntimeSubmitResultSchema,
  RuntimeTeacherControlResultSchema,
} from "@/features/runtime-platform/contracts/bridge";
import { invokeRuntimeHostAction } from "@/features/runtime-platform/host-actions/runtime-host";
import { publishTransportEvent } from "@/features/runtime-platform/seams";
import type {
  BootstrapRuntimeSessionInput,
  RecordRuntimeReadyInput,
  RecordRuntimeInteractionInput,
  RecordRuntimeTeacherControlInput,
  SaveRuntimeStateInput,
  SubmitRuntimeStateInput,
} from "@/lib/dto/classroom";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function publishClassroomTransportEvent(input: {
  sessionId: string;
  schoolId?: string | null;
  eventId: string;
  correlationId: string;
  kind: "launched" | "active_step_changed" | "lock_mode_changed" | "slide_changed" | "ended";
  payload: Record<string, unknown>;
}) {
  return publishTransportEvent({
    sessionId: input.sessionId,
    channel: "classroom-events",
    kind: input.kind,
    correlationId: input.correlationId,
    truthPersisted: true,
    truthRef: {
      type: "classroom-event",
      id: input.eventId,
      classroomSessionId: input.sessionId,
      schoolId: input.schoolId ?? undefined,
    },
    payload: input.payload,
  });
}

type PublishedSnapshot = {
  lesson?: { id?: string; title?: string; objective?: string; };
  course?: { title?: string; };
  steps?: Array<{ id: string; lessonId: string; type: string; title: string; rank: string; payload: unknown; }>;
  materials?: Array<{
    id?: string;
    stepId?: string | null;
    title?: string;
    kind?: string;
    url?: string | null;
    note?: string | null;
  }>;
};

type ClassroomSlideState = {
  stepId: string;
  slideIndex: number;
};

function parseSnapshot(value: unknown): PublishedSnapshot {
  return (value ?? {}) as PublishedSnapshot;
}

async function getLatestSlideState(sessionId: string): Promise<ClassroomSlideState | null> {
  const events = await db.query.classroomEvents.findMany({
    where: eq(classroomEvents.sessionId, sessionId),
    orderBy: (event, { desc }) => [desc(event.version)],
  });

  const slideEvent = events.find((event) => event.type === "slide_changed");
  if (!slideEvent) {
    return null;
  }

  const payload = slideEvent.payloadJson as Record<string, unknown>;
  if (typeof payload.stepId !== "string" || typeof payload.slideIndex !== "number") {
    return null;
  }

  return {
    stepId: payload.stepId,
    slideIndex: payload.slideIndex,
  };
}

function buildParticipantProgressLabel(input: {
  activeStepIndex: number;
  participantStepIndex: number;
}) {
  if (input.participantStepIndex === input.activeStepIndex) {
    return "跟随当前环节" as const;
  }

  if (input.participantStepIndex < input.activeStepIndex) {
    return "落后于当前环节" as const;
  }

  return "已进入后续环节" as const;
}

function buildParticipantAttention(input: {
  connectionState: "connected" | "reconnecting" | "offline";
  progressLabel: "跟随当前环节" | "落后于当前环节" | "已进入后续环节";
  submissionCount: number;
  activeStepType?: "content" | "task" | "quiz";
}) {
  const attentionReasons: string[] = [];

  if (input.connectionState === "offline") {
    attentionReasons.push("当前离线");
  }

  if (input.connectionState === "reconnecting") {
    attentionReasons.push("正在重新连接");
  }

  if (input.progressLabel === "落后于当前环节") {
    attentionReasons.push("落后于当前环节");
  }

  if ((input.activeStepType === "task" || input.activeStepType === "quiz") && input.submissionCount === 0) {
    attentionReasons.push("当前环节未提交");
  }

  return {
    needsAttention: attentionReasons.length > 0,
    attentionReasons,
  };
}

function extractRuntimeProofFromEvidence(input: {
  payload: unknown;
  createdAt: Date | number | null | undefined;
}) {
  const payload = (input.payload ?? {}) as {
    runtimeSessionId?: unknown;
    runtimeInstanceId?: unknown;
    submittedAt?: unknown;
    proofSummary?: {
      title?: unknown;
      submittedStateLabel?: unknown;
      inspectorHref?: unknown;
    };
  };

  if (typeof payload.runtimeSessionId !== "string" || payload.runtimeSessionId.length === 0) {
    return null;
  }

  const submittedAt = typeof payload.submittedAt === "string" && payload.submittedAt.length > 0
    ? payload.submittedAt
    : toIso(input.createdAt);
  const summaryTitle = typeof payload.proofSummary?.title === "string" && payload.proofSummary.title.length > 0
    ? payload.proofSummary.title
    : "运行时互动已提交";
  const summaryLabel = typeof payload.proofSummary?.submittedStateLabel === "string" && payload.proofSummary.submittedStateLabel.length > 0
    ? payload.proofSummary.submittedStateLabel
    : "已完成互动证明";
  const inspectorHref = typeof payload.proofSummary?.inspectorHref === "string" && payload.proofSummary.inspectorHref.length > 0
    ? payload.proofSummary.inspectorHref
    : `/settings/labs/runtime-inspector?runtimeSessionId=${payload.runtimeSessionId}`;

  return {
    runtimeSessionId: payload.runtimeSessionId,
    runtimeInstanceId: typeof payload.runtimeInstanceId === "string" ? payload.runtimeInstanceId : null,
    submittedAt,
    status: "submitted" as const,
    summaryTitle,
    summaryLabel,
    inspectorHref,
  };
}

function toParticipationLabel(level: "active" | "normal" | "attention" | null | undefined) {
  if (level === "active") {
    return ClassroomSessionParticipationLabelSchema.parse("积极参与");
  }

  if (level === "normal") {
    return ClassroomSessionParticipationLabelSchema.parse("正常参与");
  }

  if (level === "attention") {
    return ClassroomSessionParticipationLabelSchema.parse("需要关注");
  }

  return ClassroomSessionParticipationLabelSchema.parse("未评价");
}

function buildParticipationBuckets(levels: Array<"active" | "normal" | "attention" | null>) {
  return levels.reduce(
    (buckets, level) => {
      if (level === "active") {
        buckets.active += 1;
      } else if (level === "normal") {
        buckets.normal += 1;
      } else if (level === "attention") {
        buckets.attention += 1;
      } else {
        buckets.unevaluated += 1;
      }

      return buckets;
    },
    {
      active: 0,
      normal: 0,
      attention: 0,
      unevaluated: 0,
    },
  );
}

function buildCompletionLabel(completedCount: number, totalStudents: number) {
  return `已完成 ${completedCount}/${totalStudents}`;
}

function buildStudentCompletionLabel(input: {
  completedStepCount: number;
  totalStepCount: number;
}) {
  if (input.totalStepCount === 0) {
    return "暂无完成数据";
  }

  if (input.completedStepCount >= input.totalStepCount) {
    return `已完成全部 ${input.totalStepCount} 个环节`;
  }

  return `完成 ${input.completedStepCount}/${input.totalStepCount} 个环节`;
}

function buildRepresentativeFollowUpCopy(input: {
  needsAttention: boolean;
  hasUnevaluatedSignal: boolean;
  missingSubmissionCount: number;
}) {
  const detail: string[] = [];

  if (input.needsAttention) {
    detail.push("课堂表现被标记为需要关注");
  }

  if (input.hasUnevaluatedSignal) {
    detail.push("已有课堂证据但还未留下过程评价");
  }

  if (input.missingSubmissionCount > 0) {
    detail.push(`仍有 ${input.missingSubmissionCount} 个关键提交未完成`);
  }

  return detail;
}

function buildClassroomSignalWorkload(studentSignals: Array<{ studentId: string; needsFollowUp: boolean }>) {
  return studentSignals.filter((item) => item.needsFollowUp).length;
}

function buildTrendPrimaryRecapHref(sessionId: string, studentId?: string) {
  const params = new URLSearchParams({
    sessionId,
    recapTab: "students",
  });

  if (studentId) {
    params.set("studentId", studentId);
  }

  return `/classroom?${params.toString()}`;
}

function buildTrendSecondaryReviewHref(input: {
  lessonId: string;
  studentId?: string;
  pendingFeedbackCount: number;
}) {
  if (input.pendingFeedbackCount <= 0) {
    return null;
  }

  const params = new URLSearchParams({
    lessonId: input.lessonId,
    filter: "needs_feedback",
  });

  if (input.studentId) {
    params.set("studentId", input.studentId);
  }

  return `/teacher/review?${params.toString()}`;
}

function buildFeedbackWorkloadFromAttempts(input: {
  taskRows: Array<typeof taskSubmissions.$inferSelect>;
  quizRows: Array<typeof quizAttempts.$inferSelect>;
  feedbackRows: Array<typeof attemptFeedback.$inferSelect>;
}) {
  const feedbackTargetIds = new Set(input.feedbackRows.map((feedback) => feedback.targetId));
  const latestAttempts = [...input.taskRows, ...input.quizRows].filter((row) => row.isLatest);

  return {
    pendingFeedbackCount: latestAttempts.filter((attempt) => !feedbackTargetIds.has(attempt.id)).length,
    pendingAttemptIds: new Set(latestAttempts.filter((attempt) => !feedbackTargetIds.has(attempt.id)).map((attempt) => attempt.id)),
  };
}

function extractEvidenceDetail(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "已记录课堂证据";
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.note === "string" && record.note.trim().length > 0) {
    return record.note.trim();
  }

  if (typeof record.body === "string" && record.body.trim().length > 0) {
    return record.body.trim();
  }

  if (typeof record.observationNote === "string" && record.observationNote.trim().length > 0) {
    return record.observationNote.trim();
  }

  return "已记录课堂证据";
}

function toClassroomEvidencePayloadDTO(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const key of [
    "note",
    "body",
    "observationNote",
    "title",
    "lessonId",
    "kind",
    "participationLevel",
    "tags",
    "sourceType",
    "evidenceType",
    "runtimeBridge",
    "evidenceId",
  ]) {
    if (key in record) {
      sanitized[key] = record[key];
    }
  }

  return sanitized;
}

function parseSnapshotSteps(snapshot: PublishedSnapshot, fallbackLessonId: string) {
  return [...(snapshot.steps ?? [])]
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map((step) => {
      const payload = lessonStepPayloadSchema.parse(step.payload);

      return {
        id: step.id,
        lessonId: step.lessonId ?? fallbackLessonId,
        type: payload.type,
        title: step.title,
        rank: step.rank,
        payload,
      };
    });
}

function getAttemptPolicy(step?: ReturnType<typeof parseSnapshotSteps>[number]) {
  const payload = step?.payload as { allowRetry?: boolean; retryPolicy?: string; revealCorrectAnswer?: boolean } | undefined;

  return {
    allowRetry:
      payload?.allowRetry === true ||
      payload?.retryPolicy === "once" ||
      payload?.retryPolicy === "unlimited",
    revealCorrectAnswer: payload?.revealCorrectAnswer === true,
  };
}

function toFeedbackDTO(row: typeof attemptFeedback.$inferSelect, lessonId?: string) {
  return {
    id: row.id,
    lessonId,
    targetType: row.targetType,
    targetId: row.targetId,
    teacherId: row.teacherId,
    studentId: row.studentId,
    body: row.body,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toTaskAttemptDTO(
  row: typeof taskSubmissions.$inferSelect,
  feedback: typeof attemptFeedback.$inferSelect | null = null,
  policy = { allowRetry: false },
) {
  const rawPayload = row.payloadJson;
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};

  return TaskAttemptDTOSchema.parse({
    id: row.id,
    publishedVersionId: row.publishedVersionId,
    lessonId: row.lessonId,
    stepId: row.stepId,
    studentId: row.studentId,
    attemptNo: row.attemptNo,
    payload,
    isLatest: row.isLatest,
    canRetryTask: policy.allowRetry,
    feedback: feedback ? toFeedbackDTO(feedback, row.lessonId) : null,
    createdAt: toIso(row.createdAt),
  });
}

function toQuizAttemptDTO(
  row: typeof quizAttempts.$inferSelect,
  feedback: typeof attemptFeedback.$inferSelect | null = null,
  policy = { allowRetry: false, revealCorrectAnswer: false },
) {
  return QuizAttemptDTOSchema.parse({
    id: row.id,
    publishedVersionId: row.publishedVersionId,
    lessonId: row.lessonId,
    stepId: row.stepId,
    studentId: row.studentId,
    attemptNo: row.attemptNo,
    answer: row.answerJson,
    outcome: row.outcomeJson,
    isLatest: row.isLatest,
    canRetryQuiz: policy.allowRetry,
    showCorrectAnswer:
      policy.revealCorrectAnswer &&
      Boolean((row.outcomeJson as { showCorrectAnswer?: boolean } | null)?.showCorrectAnswer),
    feedback: feedback ? toFeedbackDTO(feedback, row.lessonId) : null,
    createdAt: toIso(row.createdAt),
  });
}

function summarizeTaskAttemptPayload(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as { text?: string; answer?: string; body?: string };
    return record.text ?? record.answer ?? record.body ?? "已提交任务内容";
  }

  return "已提交任务内容";
}

function summarizeQuizOutcome(outcome: unknown) {
  if (!outcome || typeof outcome !== "object") {
    return "已记录你的答案";
  }

  const record = outcome as { isCorrect?: boolean | null; correct?: boolean | null };
  const isCorrect = typeof record.isCorrect === "boolean" ? record.isCorrect : record.correct;

  if (isCorrect === true) {
    return "答对了";
  }

  if (isCorrect === false) {
    return "还可以再想想";
  }

  return "已记录你的答案";
}

function formatTimelineDetail(
  row: typeof classroomTimeline.$inferSelect,
  stepMap: Map<string, ReturnType<typeof parseSnapshotSteps>[number]>,
) {
  const payload = (row.payloadJson ?? {}) as Record<string, unknown>;

  if (row.entryType === "intervention_noted") {
    const title = typeof payload.title === "string" ? payload.title.trim() : "课堂干预";
    const body = typeof payload.body === "string" ? payload.body.trim() : "已记录课堂干预";
    return `${title}：${body}`;
  }

  if (row.entryType === "presence_changed") {
    const state = payload.connectionState;
    const stepId = typeof payload.currentStepId === "string" ? payload.currentStepId : null;
    const stepTitle = stepId ? stepMap.get(stepId)?.title ?? null : null;
    const stateLabel =
      state === "connected"
        ? "已进入课堂"
        : state === "reconnecting"
          ? "正在重新连接"
          : state === "offline"
            ? "当前离线"
            : "在线状态已更新";

    return stepTitle ? `${stateLabel}，所在环节：${stepTitle}` : stateLabel;
  }

  if (row.entryType === "evidence_captured") {
    const sourceType = payload.sourceType;
    if (sourceType === "student-quick-response") {
      return "已记录课堂回应";
    }
    if (sourceType === "student-submission") {
      return "已记录课堂提交";
    }
    if (sourceType === "teacher-observation") {
      return "已记录课堂观察";
    }
  }

  return extractEvidenceDetail(row.payloadJson);
}

function summarizeProgressEntries(
  steps: ReturnType<typeof parseSnapshotSteps>,
  rows: Array<typeof lessonStepProgress.$inferSelect>,
) {
  const progressByStep = new Map(rows.map((row) => [row.stepId, row]));

  return steps.map((step) => {
    const row = progressByStep.get(step.id);
    return LearningProgressDTOSchema.parse({
      stepId: step.id,
      state: row?.state ?? "not_started",
      completedAt: row?.completedAt ? toIso(row.completedAt) : null,
      updatedAt: row?.updatedAt ? toIso(row.updatedAt) : undefined,
    });
  });
}

function progressStateLabel(state: "not_started" | "in_progress" | "completed" | "skipped") {
  switch (state) {
    case "completed":
      return "已完成";
    case "skipped":
      return "已跳过";
    case "in_progress":
      return "进行中";
    default:
      return "未开始";
  }
}

const STEP_FAMILY_LABELS: Record<"content" | "task" | "quiz", string> = {
  content: "教师讲授",
  task: "学生任务",
  quiz: "课堂测验",
};

const TEACHING_INTENT_LABELS: Record<TeachingDesign["activityIntent"], string> = {
  explain: "讲授",
  practice: "练习",
  check: "检测",
  discuss: "讨论",
  reflect: "反思",
  apply: "应用",
};

function summarizeText(value: string | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > 56 ? `${normalized.slice(0, 56).trim()}…` : normalized;
}

function resolveTeachingDesign(payload: ReturnType<typeof lessonStepPayloadSchema.parse>) {
  return resolveTeachingDesignInput(payload.type, payload.teachingDesign);
}

function buildEvidenceSummary(teachingDesign: TeachingDesign, inferred: boolean) {
  const prefix = teachingDesign.evidenceExpectation.required ? "需提交" : "观察记录";
  const fallback = inferred ? "（默认推断）" : "";

  return `${prefix}：${teachingDesign.evidenceExpectation.prompt}${fallback}`;
}

function getMaterialCues(snapshot: PublishedSnapshot, stepId: string, payload: ReturnType<typeof lessonStepPayloadSchema.parse>) {
  const stepMaterials = (snapshot.materials ?? [])
    .filter((material) => !material.stepId || material.stepId === stepId)
    .map((material) => material.title?.trim() || material.kind?.trim())
    .filter((value): value is string => Boolean(value));

  const payloadMaterials = ("materialRefs" in payload ? payload.materialRefs : [])
    .map((material) => material.title?.trim() || material.kind?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set([...stepMaterials, ...payloadMaterials])].slice(0, 3);
}

function buildLaunchPreview(snapshot: PublishedSnapshot, fallbackLessonId: string, fallbackLessonTitle: string) {
  const steps = parseSnapshotSteps(snapshot, fallbackLessonId).map((step, index) => {
    const resolution = resolveTeachingDesign(step.payload);
    const family = resolution.teachingDesignStatus === "explicit"
      ? `${TEACHING_INTENT_LABELS[resolution.teachingDesign.activityIntent]} / ${resolution.teachingDesign.activityMode}`
      : STEP_FAMILY_LABELS[step.type];
    let summary = "课堂将按已发布步骤继续推进。";

    if (step.payload.type === "content") {
      summary = summarizeText(step.payload.body, "课堂将从讲授内容与教师提示开始。");
    } else if (step.payload.type === "task") {
      summary = summarizeText(step.payload.prompt, "学生会根据任务提示完成本环节。");
    } else {
      summary = summarizeText(step.payload.question, "学生会围绕核心问题完成随堂测验。");
    }

    return {
      id: step.id,
      order: index + 1,
      title: step.title,
      family,
      summary,
      activityIntent: resolution.teachingDesign.activityIntent,
      activityMode: resolution.teachingDesign.activityMode,
      estimatedMinutes: resolution.teachingDesign.estimatedMinutes,
      evidenceSummary: buildEvidenceSummary(resolution.teachingDesign, resolution.teachingDesignStatus !== "explicit"),
      teachingDesignStatus: resolution.teachingDesignStatus,
      needsTeachingDesignRefinement: resolution.needsTeachingDesignRefinement,
      teachingDesignFallbackReason: resolution.teachingDesignFallbackReason,
      materialCues: getMaterialCues(snapshot, step.id, step.payload),
    };
  });

  return {
    lessonId: fallbackLessonId,
    lessonTitle: snapshot.lesson?.title ?? fallbackLessonTitle,
    totalEstimatedMinutes: steps.reduce((total, step) => total + step.estimatedMinutes, 0),
    stepCount: steps.length,
    steps,
  };
}

function buildLaunchRosterSummary(input: {
  classId: string;
  className: string;
  studentCount: number;
}) {
  return {
    classId: input.classId,
    className: input.className,
    studentCount: input.studentCount,
    launchScopeLabel: "整班启动",
    note: "本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。",
  };
}

function buildLaunchReadiness(input: {
  preview: ReturnType<typeof buildLaunchPreview>;
  launchableClassCount: number;
}) {
  const blockingIssues = input.launchableClassCount === 0
    ? [{
        code: "NO_LAUNCHABLE_CLASSES" as const,
        message: "当前课时还没有可直接开课的整班名单，请先确认已绑定班级且名单中有学生。",
      }]
    : [];

  const inferredSteps = input.preview.steps.filter((step) => step.teachingDesignStatus === "inferred");
  const refinementSteps = input.preview.steps.filter((step) => step.teachingDesignStatus === "needs-refinement");
  const missingMaterialSteps = input.preview.steps.filter((step) => step.materialCues.length === 0);
  const evidenceReviewSteps = input.preview.steps.filter((step) => step.teachingDesignStatus !== "explicit");

  const attentionIssues = [] as Array<{
    code: "TEACHING_DESIGN_NEEDS_REFINEMENT" | "TEACHING_DESIGN_INFERRED";
    message: string;
    stepId?: string | null;
  }>;
  const advisoryIssues = [] as Array<{
    code: "MATERIAL_CUES_MISSING" | "EVIDENCE_CUES_REVIEW";
    message: string;
    stepId?: string | null;
  }>;

  if (refinementSteps.length > 0) {
    attentionIssues.push({
      code: "TEACHING_DESIGN_NEEDS_REFINEMENT",
      message: `${refinementSteps.length} 个环节的教学设计仍需完善，建议开课前再确认活动方式与时间分配。`,
      stepId: refinementSteps[0]?.id ?? null,
    });
  }

  if (inferredSteps.length > 0) {
    attentionIssues.push({
      code: "TEACHING_DESIGN_INFERRED",
      message: `${inferredSteps.length} 个环节仍在使用默认推断，不会阻断开课，但建议教师先过一遍课堂节奏。`,
      stepId: inferredSteps[0]?.id ?? null,
    });
  }

  if (missingMaterialSteps.length > 0) {
    advisoryIssues.push({
      code: "MATERIAL_CUES_MISSING",
      message: `${missingMaterialSteps.length} 个环节还没有明确材料提示，建议开课前补齐讲义、链接或设备准备。`,
      stepId: missingMaterialSteps[0]?.id ?? null,
    });
  }

  if (evidenceReviewSteps.length > 0) {
    advisoryIssues.push({
      code: "EVIDENCE_CUES_REVIEW",
      message: `${evidenceReviewSteps.length} 个环节的采证提醒仍需教师确认，建议开课前明确要观察或收集什么。`,
      stepId: evidenceReviewSteps[0]?.id ?? null,
    });
  }

  return {
    blockingIssues,
    attentionIssues,
    advisoryIssues,
  };
}

function parseInterventionPayload(payload: unknown) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};

  return {
    title: typeof record.title === "string" && record.title.trim().length > 0 ? record.title.trim() : "课堂干预",
    body: typeof record.body === "string" ? record.body.trim() : "",
    targetScope: record.targetScope === "student" ? "student" as const : "class" as const,
    visibility: record.visibility === "teacher-only" ? "teacher-only" as const : "teacher-only" as const,
  };
}

function buildTeacherTimeline(input: {
  timelineRows: Array<{
    id: string;
    sessionId: string;
    studentId: string | null;
    stepId: string | null;
    entryType: "presence_changed" | "evidence_captured" | "intervention_noted";
    actorId: string;
    payloadJson: unknown;
    createdAt: Date | number | null | undefined;
  }>;
  participants: Array<{ studentId: string; studentName: string }>;
  steps: Array<{ id: string; title: string }>;
}) {
  const studentNameMap = new Map(input.participants.map((participant) => [participant.studentId, participant.studentName]));
  const stepTitleMap = new Map(input.steps.map((step) => [step.id, step.title]));

  return input.timelineRows
    .filter((entry) => entry.sessionId === input.timelineRows[0]?.sessionId || input.timelineRows.length === 0)
    .filter((entry) => entry.entryType === "intervention_noted")
    .map((entry) => {
      const payload = parseInterventionPayload(entry.payloadJson);
      const studentName = entry.studentId ? studentNameMap.get(entry.studentId) ?? null : null;
      const stepTitle = entry.stepId ? stepTitleMap.get(entry.stepId) ?? null : null;
      const targetLabel = payload.targetScope === "student"
        ? studentName ?? "指定学生"
        : "全班";

      return {
        id: entry.id,
        sessionId: entry.sessionId,
        studentId: entry.studentId,
        studentName,
        stepId: entry.stepId,
        stepTitle,
        entryType: "intervention_noted" as const,
        title: payload.title,
        body: payload.body,
        targetScope: payload.targetScope,
        targetLabel,
        visibility: payload.visibility,
        actorId: entry.actorId,
        createdAt: toIso(entry.createdAt),
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function getSessionWithLessonSteps(sessionId: string) {
  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, sessionId) });
  if (!session) {
    throw new Error("CLASSROOM_ENDED");
  }

  return session;
}

async function getPublishedSessionSteps(session: {
  publishedVersionId: string;
  lessonId: string;
}) {
  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, session.publishedVersionId),
  });
  const snapshot = parseSnapshot(published?.snapshotJson);

  return parseSnapshotSteps(snapshot, session.lessonId);
}

async function assertSessionStepInPublishedSnapshot(
  session: { publishedVersionId: string; lessonId: string },
  stepId: string,
) {
  const steps = await getPublishedSessionSteps(session);
  const step = steps.find((item) => item.id === stepId);

  if (!step) {
    throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
  }
}

async function getStudentClassMember(classId: string, studentId: string) {
  return db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.userId, studentId), eq(classMembers.role, "student")),
  });
}

async function ensureSessionStudentParticipant(sessionId: string, studentId: string) {
  const participant = await db.query.classroomParticipants.findFirst({
    where: and(eq(classroomParticipants.sessionId, sessionId), eq(classroomParticipants.studentId, studentId)),
  });

  if (!participant) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  return participant;
}

async function getTeacherSessionScope(sessionId: string) {
  const scope = await assertActiveTeacher();
  const session = await getSessionWithLessonSteps(sessionId);

  if (session.teacherId !== scope.userId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return { scope, session };
}

type ClassroomSnapshotActorContext = {
  actorId: string;
  actorScope: "teacher" | "student";
};

async function buildClassroomSnapshotDTOForActor(input: {
  session: Awaited<ReturnType<typeof getSessionWithLessonSteps>>;
  actor: ClassroomSnapshotActorContext;
}) {
  const { session, actor } = input;
  const isTeacher = actor.actorScope === "teacher";

  if (isTeacher) {
    if (session.teacherId !== actor.actorId) {
      throw new Error("TEACHER_AUTH_REQUIRED");
    }
  } else {
    const classMember = await getStudentClassMember(session.classId, actor.actorId);
    if (!classMember) {
      throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
    }

    await ensureSessionStudentParticipant(session.id, actor.actorId);
  }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) });
  const clazz = await db.query.classes.findFirst({ where: eq(classes.id, session.classId) });
  const published = await db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) });
  const participants = await db.query.classroomParticipants.findMany({ where: eq(classroomParticipants.sessionId, session.id) });
  const timelineRows = await db.query.classroomTimeline.findMany({ where: eq(classroomTimeline.sessionId, session.id) });
  const evidenceRows = await db.query.classroomEvidence.findMany({
    where: and(
      eq(classroomEvidence.sessionId, session.id),
      or(
        eq(classroomEvidence.sourceType, "student-quick-response"),
        eq(classroomEvidence.sourceType, "student-submission")
      )
    ),
  });

  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, session.lessonId);
  const stepOrder = new Map(steps.map((step, index) => [step.id, index]));
  const activeStepIndex = stepOrder.get(session.activeStepId) ?? 0;
  const activeStep = steps.find((step) => step.id === session.activeStepId);
  const transportDegradedReason = await classroomRedisFanoutManager.getLatestDegradedReason(
    session.id,
  );

  const userIds = participants.map((participant) => participant.studentId);
  const studentUsers = userIds.length > 0 ? await db.query.users.findMany({ where: inArray(users.id, userIds) }) : [];
  const userMap = new Map(studentUsers.map((user) => [user.id, user.name]));
  const submissionCountByStudentId = new Map<string, number>();
  const runtimeProofByStudentId = new Map<string, ReturnType<typeof extractRuntimeProofFromEvidence>>();

  for (const evidence of evidenceRows) {
    if (!evidence.studentId || evidence.stepId !== session.activeStepId) {
      continue;
    }

    submissionCountByStudentId.set(
      evidence.studentId,
      (submissionCountByStudentId.get(evidence.studentId) ?? 0) + 1,
    );

    const runtimeProof = extractRuntimeProofFromEvidence({
      payload: evidence.payloadJson,
      createdAt: evidence.createdAt,
    });

    if (runtimeProof) {
      runtimeProofByStudentId.set(evidence.studentId, runtimeProof);
    }
  }

  const participantDtos = participants.map((participant) => {
    const participantStepIndex = stepOrder.get(participant.currentStepId) ?? activeStepIndex;
    const progressLabel = buildParticipantProgressLabel({
      activeStepIndex,
      participantStepIndex,
    });
    const submissionCount = submissionCountByStudentId.get(participant.studentId) ?? 0;
    const attentionState = buildParticipantAttention({
      connectionState: participant.connectionState,
      progressLabel,
      submissionCount,
      activeStepType: activeStep?.type,
    });

    return {
      studentId: participant.studentId,
      studentName: userMap.get(participant.studentId) ?? "学生",
      connectionState: participant.connectionState,
      currentStepId: participant.currentStepId,
      lastSeenAt: toIso(participant.lastSeenAt),
      progressLabel,
      submissionCount,
      needsAttention: attentionState.needsAttention,
      attentionReasons: attentionState.attentionReasons,
      runtimeProof: runtimeProofByStudentId.get(participant.studentId) ?? null,
    };
  });
  const monitoringSummary = {
    connectedCount: participantDtos.filter((participant) => participant.connectionState === "connected").length,
    reconnectingCount: participantDtos.filter((participant) => participant.connectionState === "reconnecting").length,
    offlineCount: participantDtos.filter((participant) => participant.connectionState === "offline").length,
    needsAttentionCount: participantDtos.filter((participant) => participant.needsAttention).length,
    submittedCount: participantDtos.filter((participant) => participant.submissionCount > 0).length,
  };
  const teacherTimeline = isTeacher
    ? buildTeacherTimeline({
        timelineRows,
        participants: participantDtos.map((participant) => ({
          studentId: participant.studentId,
          studentName: participant.studentName,
        })),
        steps: steps.map((step) => ({ id: step.id, title: step.title })),
      })
    : [];

  return ClassroomSnapshotDTOSchema.parse({
    sessionId: session.id,
    lessonId: session.lessonId,
    publishedVersionId: session.publishedVersionId,
    classId: session.classId,
    className: clazz?.name ?? "班级",
    teacherId: session.teacherId,
    lessonTitle: snapshot.lesson?.title ?? lesson?.title ?? "课堂",
    activeStepId: session.activeStepId,
    locked: Boolean(session.locked),
    status: session.status,
    version: session.version,
    updatedAt: toIso(session.updatedAt),
    participants: participantDtos,
    monitoringSummary,
    steps: steps.map((step) => ({
      id: step.id,
      title: step.title,
      rank: step.rank,
      type: step.type,
      payload: step.payload,
    })),
    slideState: await getLatestSlideState(session.id),
    transportStatus: {
      fanoutMode: session.transportModeSnapshot ?? "local_only",
      degraded: Boolean(transportDegradedReason),
      degradedReason: transportDegradedReason,
    },
    teacherTimeline,
    copy: {
      staleRefreshRequired: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
      pendingAction: "当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。",
      reconnecting: "正在重新连接课堂，会先显示最近一次课堂状态。",
      restored: "已恢复课堂状态，你现在看到的是最新步骤。",
    }
  });
}

async function createClassroomTimelineEntry(input: {
  sessionId: string;
  studentId?: string | null;
  stepId?: string | null;
  entryType: "presence_changed" | "evidence_captured" | "intervention_noted";
  actorId: string;
  payload: Record<string, unknown>;
}) {
  const [entry] = await db.insert(classroomTimeline).values({
    sessionId: input.sessionId,
    studentId: input.studentId ?? null,
    stepId: input.stepId ?? null,
    entryType: input.entryType,
    actorId: input.actorId,
    payloadJson: input.payload,
  }).returning();

  return ClassroomTimelineEntryDTOSchema.parse({
    id: entry.id,
    sessionId: entry.sessionId,
    studentId: entry.studentId,
    stepId: entry.stepId,
    entryType: entry.entryType,
    actorId: entry.actorId,
    payload: toClassroomEvidencePayloadDTO(entry.payloadJson),
    createdAt: toIso(entry.createdAt),
  });
}

async function insertRuntimeClassroomEvidence(input: {
  sessionId: string;
  studentId?: string | null;
  stepId?: string | null;
  sourceType: "student-submission" | "system";
  evidenceType: "submission" | "quiz-response" | "artifact";
  payload: Record<string, unknown>;
  capturedById: string;
}) {
  const session = await getSessionWithLessonSteps(input.sessionId);

  if (input.studentId) {
    await ensureSessionStudentParticipant(session.id, input.studentId);
  }

  if (input.stepId) {
    await assertSessionStepInPublishedSnapshot(session, input.stepId);
  }

  const [evidence] = await db.insert(classroomEvidence).values({
    sessionId: session.id,
    studentId: input.studentId ?? null,
    stepId: input.stepId ?? null,
    sourceType: input.sourceType,
    evidenceType: input.evidenceType,
    payloadJson: input.payload,
    capturedById: input.capturedById,
  }).returning();

  await createClassroomTimelineEntry({
    sessionId: session.id,
    studentId: input.studentId ?? null,
    stepId: input.stepId ?? null,
    entryType: "evidence_captured",
    actorId: input.capturedById,
    payload: {
      evidenceId: evidence.id,
      sourceType: input.sourceType,
      evidenceType: input.evidenceType,
      runtimeBridge: true,
    },
  });

  return ClassroomEvidenceDTOSchema.parse({
    id: evidence.id,
    sessionId: evidence.sessionId,
    studentId: evidence.studentId,
    stepId: evidence.stepId,
    sourceType: evidence.sourceType,
    evidenceType: evidence.evidenceType,
    payload: toClassroomEvidencePayloadDTO(evidence.payloadJson),
    capturedById: evidence.capturedById,
    createdAt: toIso(evidence.createdAt),
  });
}

export async function ensureClassroomParticipant(input: { sessionId: string; studentId: string }) {
  const session = await getSessionWithLessonSteps(input.sessionId);
  const currentUser = await getCurrentUserDTO();

  if (!currentUser || currentUser.id !== input.studentId) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  const classMember = await getStudentClassMember(session.classId, input.studentId);
  if (!classMember) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  await db.insert(classroomParticipants).values({
    sessionId: session.id,
    studentId: input.studentId,
    classMemberId: classMember.id,
    connectionState: "reconnecting",
    currentStepId: session.activeStepId,
  }).onConflictDoNothing();
}

export async function getClassroomSnapshotForActor(input: {
  sessionId: string;
  actorId: string;
  actorScope: "teacher" | "student";
  schoolId: string;
}) {
  const session = await getSessionWithLessonSteps(input.sessionId);
  const clazz = await db.query.classes.findFirst({ where: eq(classes.id, session.classId) });

  if (!clazz || clazz.schoolId !== input.schoolId) {
    throw new Error(input.actorScope === "teacher" ? "TEACHER_AUTH_REQUIRED" : "CLASSROOM_PARTICIPANT_REQUIRED");
  }

  return buildClassroomSnapshotDTOForActor({
    session,
    actor: {
      actorId: input.actorId,
      actorScope: input.actorScope,
    },
  });
}

export async function updateClassroomParticipantConnection(input: {
  sessionId: string;
  studentId: string;
  connectionState: "connected" | "reconnecting" | "offline";
  currentStepId?: string | null;
}) {
  const session = await getSessionWithLessonSteps(input.sessionId);
  const currentUser = await getCurrentUserDTO();

  if (!currentUser || currentUser.id !== input.studentId) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  await ensureClassroomParticipant({ sessionId: input.sessionId, studentId: input.studentId });

  const existingParticipant = await db.query.classroomParticipants.findFirst({
    where: and(eq(classroomParticipants.sessionId, session.id), eq(classroomParticipants.studentId, input.studentId)),
  });

  await db.update(classroomParticipants)
    .set({
      connectionState: input.connectionState,
      lastSeenAt: new Date(),
      ...(input.currentStepId ? { currentStepId: input.currentStepId } : {}),
    })
    .where(and(eq(classroomParticipants.sessionId, session.id), eq(classroomParticipants.studentId, input.studentId)));

  const connectionChanged = existingParticipant?.connectionState !== input.connectionState;
  const nextStepId = input.currentStepId ?? existingParticipant?.currentStepId ?? null;
  const stepChanged = nextStepId !== (existingParticipant?.currentStepId ?? null);

  if (connectionChanged || stepChanged) {
    await createClassroomTimelineEntry({
      sessionId: session.id,
      studentId: input.studentId,
      stepId: nextStepId,
      entryType: "presence_changed",
      actorId: input.studentId,
      payload: {
        previousConnectionState: existingParticipant?.connectionState ?? null,
        connectionState: input.connectionState,
        previousStepId: existingParticipant?.currentStepId ?? null,
        currentStepId: nextStepId,
      },
    });
  }
}

export async function recordClassroomEvidence(input: unknown) {
  const payload = RecordClassroomEvidenceInputSchema.parse(input);
  const user = await getCurrentUserDTO();

  if (!user?.id) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  const session = await getSessionWithLessonSteps(payload.sessionId);

  if (payload.sourceType.startsWith("student-")) {
    if (payload.studentId !== user.id) {
      throw new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED");
    }

    await ensureSessionStudentParticipant(session.id, user.id);
  } else if (session.teacherId !== user.id) {
    throw new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED");
  }

  if (payload.studentId && !payload.sourceType.startsWith("student-")) {
    await ensureSessionStudentParticipant(session.id, payload.studentId);
  }

  if (payload.stepId) {
    await assertSessionStepInPublishedSnapshot(session, payload.stepId);
  }

  const [evidence] = await db.insert(classroomEvidence).values({
    sessionId: session.id,
    studentId: payload.studentId ?? null,
    stepId: payload.stepId ?? null,
    sourceType: payload.sourceType,
    evidenceType: payload.evidenceType,
    payloadJson: payload.payload,
    capturedById: user.id,
  }).returning();

  await createClassroomTimelineEntry({
    sessionId: session.id,
    studentId: payload.studentId ?? null,
    stepId: payload.stepId ?? null,
    entryType: "evidence_captured",
    actorId: user.id,
    payload: {
      evidenceId: evidence.id,
      sourceType: payload.sourceType,
      evidenceType: payload.evidenceType,
    },
  });

  return ClassroomEvidenceDTOSchema.parse({
    id: evidence.id,
    sessionId: evidence.sessionId,
    studentId: evidence.studentId,
    stepId: evidence.stepId,
    sourceType: evidence.sourceType,
    evidenceType: evidence.evidenceType,
    payload: toClassroomEvidencePayloadDTO(evidence.payloadJson),
    capturedById: evidence.capturedById,
    createdAt: toIso(evidence.createdAt),
  });
}

export async function recordRuntimeClassroomEvidence(input: {
  sessionId: string;
  studentId?: string;
  stepId: string;
  sourceType: "student-submission" | "system";
  evidenceType: "submission" | "quiz-response" | "artifact";
  payload: Record<string, unknown>;
  capturedById: string;
}) {
  return insertRuntimeClassroomEvidence({
    ...input,
  });
}

export async function recordStudentQuickResponse(input: unknown) {
  const payload = StudentQuickResponseInputSchema.parse(input);
  const user = await getCurrentUserDTO();

  if (!user?.id) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  const evidence = await recordClassroomEvidence({
    sessionId: payload.sessionId,
    studentId: user.id,
    stepId: payload.stepId,
    sourceType: payload.sourceType,
    evidenceType: payload.evidenceType,
    payload: {
      body: payload.body,
      lessonId: payload.lessonId,
    },
  });

  const previousEvidence = await db.query.classroomEvidence.findMany({
    where: and(
      eq(classroomEvidence.sessionId, payload.sessionId),
      eq(classroomEvidence.stepId, payload.stepId),
      eq(classroomEvidence.studentId, user.id),
      eq(classroomEvidence.sourceType, payload.sourceType),
      eq(classroomEvidence.evidenceType, payload.evidenceType)
    ),
  });

  return {
    id: evidence.id,
    sessionId: payload.sessionId,
    stepId: payload.stepId,
    studentId: user.id,
    attemptNo: previousEvidence.length,
    body: payload.body,
    successMessage: "已记录为新的课堂回应",
    createdAt: evidence.createdAt,
  };
}

export async function recordStudentFormativeEvaluation(input: unknown) {
  const payload = RecordStudentFormativeEvaluationInputSchema.parse(input);

  await getTeacherSessionScope(payload.sessionId);

  const evidence = await recordClassroomEvidence({
    sessionId: payload.sessionId,
    studentId: payload.studentId,
    sourceType: "teacher-observation",
    evidenceType: "observation",
    payload: {
      kind: "formative-evaluation",
      participationLevel: payload.participationLevel,
      tags: payload.tags,
      observationNote: payload.observationNote,
    },
  });

  const formativePayload = ClassroomFormativeEvaluationPayloadSchema.parse(evidence.payload);

  return StudentFormativeEvaluationEntryDTOSchema.parse({
    id: evidence.id,
    sessionId: evidence.sessionId,
    studentId: evidence.studentId ?? payload.studentId,
    participationLevel: formativePayload.participationLevel,
    tags: formativePayload.tags,
    observationNote: formativePayload.observationNote,
    capturedById: evidence.capturedById,
    createdAt: evidence.createdAt,
  });
}

export async function listStudentFormativeEvaluationEntries(rawInput: unknown) {
  const input = ListStudentFormativeEvaluationEntriesInputSchema.parse(rawInput);

  await getTeacherSessionScope(input.sessionId);
  await ensureSessionStudentParticipant(input.sessionId, input.studentId);

  const evidenceRows = await db.query.classroomEvidence.findMany({
    where: and(
      eq(classroomEvidence.sessionId, input.sessionId),
      eq(classroomEvidence.studentId, input.studentId),
      eq(classroomEvidence.sourceType, "teacher-observation"),
      eq(classroomEvidence.evidenceType, "observation"),
    ),
  });

  return evidenceRows
    .map((evidence) => {
      const rawPayload = evidence.payloadJson;
      if (!rawPayload || typeof rawPayload !== "object") {
        return null;
      }

      const payload = rawPayload as Record<string, unknown>;
      const isFormativeEvaluation = payload.kind === "formative-evaluation";
      if (!isFormativeEvaluation) {
        return null;
      }

      const formativePayload = ClassroomFormativeEvaluationPayloadSchema.parse(payload);

      return StudentFormativeEvaluationEntryDTOSchema.parse({
        id: evidence.id,
        sessionId: evidence.sessionId,
        studentId: evidence.studentId ?? input.studentId,
        participationLevel: formativePayload.participationLevel,
        tags: formativePayload.tags,
        observationNote: formativePayload.observationNote,
        capturedById: evidence.capturedById,
        createdAt: toIso(evidence.createdAt),
      });
    })
    .filter((entry): entry is ReturnType<typeof StudentFormativeEvaluationEntryDTOSchema.parse> => Boolean(entry))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getClassroomStudentDetailDTO(rawInput: unknown) {
  const input = GetClassroomStudentDetailInputSchema.parse(rawInput);

  if (!input.studentId) {
    return null;
  }

  const { session } = await getTeacherSessionScope(input.sessionId);
  const participant = await db.query.classroomParticipants.findFirst({
    where: and(
      eq(classroomParticipants.sessionId, input.sessionId),
      eq(classroomParticipants.studentId, input.studentId),
    ),
  });

  if (!participant) {
    return null;
  }

  const [student, lesson, published, evidenceRows, timelineRows, progressRows, taskHistory, quizHistory, feedbackRows] =
    await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, input.studentId) }),
      db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) }),
      db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) }),
      db.query.classroomEvidence.findMany({
        where: and(
          eq(classroomEvidence.sessionId, input.sessionId),
          eq(classroomEvidence.studentId, input.studentId),
        ),
      }),
      db.query.classroomTimeline.findMany({
        where: and(
          eq(classroomTimeline.sessionId, input.sessionId),
          eq(classroomTimeline.studentId, input.studentId),
        ),
      }),
      db.query.lessonStepProgress.findMany({
        where: and(
          eq(lessonStepProgress.studentId, input.studentId),
          eq(lessonStepProgress.publishedVersionId, session.publishedVersionId),
        ),
      }),
      db.query.taskSubmissions.findMany({
        where: and(
          eq(taskSubmissions.studentId, input.studentId),
          eq(taskSubmissions.publishedVersionId, session.publishedVersionId),
        ),
      }),
      db.query.quizAttempts.findMany({
        where: and(
          eq(quizAttempts.studentId, input.studentId),
          eq(quizAttempts.publishedVersionId, session.publishedVersionId),
        ),
      }),
      db.query.attemptFeedback.findMany({ where: eq(attemptFeedback.studentId, input.studentId) }),
    ]);

  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson?.id ?? session.lessonId);
  const stepMap = new Map(steps.map((step) => [step.id, step]));
  const feedbackByTargetId = new Map(feedbackRows.map((row) => [row.targetId, row]));

  const evaluationEntries = evidenceRows
    .map((evidence) => {
      const rawPayload = evidence.payloadJson;
      if (!rawPayload || typeof rawPayload !== "object") {
        return null;
      }

      const payload = rawPayload as Record<string, unknown>;
      if (payload.kind !== "formative-evaluation") {
        return null;
      }

      const formativePayload = ClassroomFormativeEvaluationPayloadSchema.parse(payload);

      return StudentFormativeEvaluationEntryDTOSchema.parse({
        id: evidence.id,
        sessionId: evidence.sessionId,
        studentId: evidence.studentId ?? input.studentId,
        participationLevel: formativePayload.participationLevel,
        tags: formativePayload.tags,
        observationNote: formativePayload.observationNote,
        capturedById: evidence.capturedById,
        createdAt: toIso(evidence.createdAt),
      });
    })
    .filter((entry): entry is ReturnType<typeof StudentFormativeEvaluationEntryDTOSchema.parse> => Boolean(entry))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const progressEntries = summarizeProgressEntries(steps, progressRows);
  const taskSubmissionHistory = [...taskHistory]
    .sort((a, b) => a.attemptNo - b.attemptNo)
    .map((row) => toTaskAttemptDTO(row, feedbackByTargetId.get(row.id) ?? null, getAttemptPolicy(stepMap.get(row.stepId))));
  const quizAttemptHistory = [...quizHistory]
    .sort((a, b) => a.attemptNo - b.attemptNo)
    .map((row) => toQuizAttemptDTO(row, feedbackByTargetId.get(row.id) ?? null, getAttemptPolicy(stepMap.get(row.stepId))));
  const latestTaskSubmissions = taskSubmissionHistory.filter((row) => row.isLatest);
  const latestQuizAttempts = quizAttemptHistory.filter((row) => row.isLatest);
  const feedbackWorkload = buildFeedbackWorkloadFromAttempts({
    taskRows: taskHistory,
    quizRows: quizHistory,
    feedbackRows,
  });

  const evidenceEntries = evidenceRows
    .filter((evidence) => {
      const rawPayload = evidence.payloadJson;
      if (!rawPayload || typeof rawPayload !== "object") {
        return true;
      }

      const payload = rawPayload as Record<string, unknown>;
      return payload.kind !== "formative-evaluation";
    })
    .map((evidence) =>
      ClassroomEvidenceDTOSchema.parse({
        id: evidence.id,
        sessionId: evidence.sessionId,
        studentId: evidence.studentId,
        stepId: evidence.stepId,
        sourceType: evidence.sourceType,
        evidenceType: evidence.evidenceType,
        payload: toClassroomEvidencePayloadDTO(evidence.payloadJson),
        capturedById: evidence.capturedById,
        createdAt: toIso(evidence.createdAt),
      }),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const unifiedEvidenceItems = [
    {
      id: `presence-${participant.studentId}`,
      title: "课堂在线状态",
      detail:
        participant.connectionState === "connected"
          ? "当前在线，正在跟随课堂。"
          : participant.connectionState === "reconnecting"
            ? "正在重新连接课堂。"
            : "当前离线，需要关注是否已掉线。",
      kind: "presence" as const,
      createdAt: toIso(participant.lastSeenAt),
      feedbackTarget: null,
    },
    ...progressEntries
      .filter((entry) => entry.state !== "not_started")
      .map((entry) => ({
        id: `progress-${entry.stepId}`,
        title: stepMap.get(entry.stepId)?.title ?? "学习进度",
        detail: `进度状态：${progressStateLabel(entry.state)}`,
        kind: "progress" as const,
        createdAt: entry.updatedAt ?? entry.completedAt ?? null,
        feedbackTarget: null,
      })),
    ...latestTaskSubmissions.map((attempt) => ({
      id: `task-${attempt.id}`,
      title: stepMap.get(attempt.stepId)?.title ?? "任务提交",
      detail: summarizeTaskAttemptPayload(attempt.payload),
      kind: "task" as const,
      createdAt: attempt.createdAt,
      feedbackTarget: {
        targetType: "task_submission" as const,
        targetId: attempt.id,
        latestFeedback: attempt.feedback,
      },
    })),
    ...latestQuizAttempts.map((attempt) => ({
      id: `quiz-${attempt.id}`,
      title: stepMap.get(attempt.stepId)?.title ?? "测验作答",
      detail: summarizeQuizOutcome(attempt.outcome),
      kind: "quiz" as const,
      createdAt: attempt.createdAt,
      feedbackTarget: {
        targetType: "quiz_attempt" as const,
        targetId: attempt.id,
        latestFeedback: attempt.feedback,
      },
    })),
    ...evidenceEntries.map((entry) => ({
      id: `evidence-${entry.id}`,
      title: stepMap.get(entry.stepId ?? "")?.title ?? "课堂证据",
      detail: extractEvidenceDetail(entry.payload),
      kind: entry.sourceType === "student-quick-response" ? ("response" as const) : ("observation" as const),
      createdAt: entry.createdAt,
      feedbackTarget: null,
    })),
    ...timelineRows.map((row) => ({
      id: `timeline-${row.id}`,
      title:
        row.entryType === "intervention_noted"
          ? "课堂干预"
          : row.entryType === "presence_changed"
            ? "课堂在线状态"
            : "课堂采证",
      detail: formatTimelineDetail(row, stepMap),
      kind: "timeline" as const,
      createdAt: toIso(row.createdAt),
      feedbackTarget: null,
    })),
  ].sort((a, b) => Date.parse(b.createdAt ?? new Date(0).toISOString()) - Date.parse(a.createdAt ?? new Date(0).toISOString()));

  return ClassroomStudentDetailDTOSchema.parse({
    studentId: participant.studentId,
    studentName: student?.name ?? "学生",
    progressEntries,
    evidenceEntries,
    evaluationEntries,
    unifiedEvidenceItems,
    attemptSummary: {
      pendingFeedbackCount: feedbackWorkload.pendingFeedbackCount,
      latestTaskSubmissions,
      latestQuizAttempts,
      taskSubmissionHistory,
      quizAttemptHistory,
    },
    latestParticipationLevel: evaluationEntries[0]?.participationLevel ?? null,
  });
}

export async function recordClassroomIntervention(input: unknown) {
  const payload = RecordClassroomInterventionInputSchema.parse(input);
  const { scope, session } = await getTeacherSessionScope(payload.sessionId);

  if (payload.studentId) {
    await ensureSessionStudentParticipant(session.id, payload.studentId);
  }

  if (payload.stepId) {
    await assertSessionStepInPublishedSnapshot(session, payload.stepId);
  }

  if (payload.targetScope === "class" && payload.studentId) {
    throw new Error("CLASSROOM_INTERVENTION_UNAUTHORIZED");
  }

  return createClassroomTimelineEntry({
    sessionId: session.id,
    studentId: payload.studentId ?? null,
    stepId: payload.stepId ?? null,
    entryType: "intervention_noted",
    actorId: scope.userId,
    payload: {
      title: payload.title,
      body: payload.body,
      targetScope: payload.targetScope,
      visibility: "teacher-only",
    },
  });
}

export async function getClassroomConsoleDTO() {
  const scope = await assertActiveTeacher();

  const sessionRows = await db.query.classroomSessions.findMany({
    where: eq(classroomSessions.teacherId, scope.userId),
    orderBy: [desc(classroomSessions.updatedAt)],
  });

  const liveSessionRows = sessionRows.filter((session) => session.status === "live");

  const sessionRowsForLookup = sessionRows.length > 0 ? sessionRows : liveSessionRows;

  const [sessionLessons, sessionClasses] = await Promise.all([
    sessionRowsForLookup.length > 0
      ? db.query.lessons.findMany({
          where: inArray(
            lessons.id,
            [...new Set(sessionRowsForLookup.map((session) => session.lessonId))]
          ),
        })
      : Promise.resolve([]),
    sessionRowsForLookup.length > 0
      ? db.query.classes.findMany({
          where: inArray(
            classes.id,
            [...new Set(sessionRowsForLookup.map((session) => session.classId))]
          ),
        })
      : Promise.resolve([]),
  ]);

  const liveLessonMap = new Map(sessionLessons.map((lesson) => [lesson.id, lesson.title]));
  const liveClassMap = new Map(sessionClasses.map((clazz) => [clazz.id, clazz.name]));

  const sessionEntries = [...sessionRows]
    .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
    .map((session) =>
      ClassroomConsoleSessionEntryDTOSchema.parse({
        id: session.id,
        lessonId: session.lessonId,
        lessonTitle: liveLessonMap.get(session.lessonId) ?? "课堂",
        classId: session.classId,
        className: liveClassMap.get(session.classId) ?? "班级",
        updatedAt: toIso(session.updatedAt),
        startedAt: toIso(session.createdAt),
        endedAt: session.endedAt ? toIso(session.endedAt) : null,
        locked: Boolean(session.locked),
        version: session.version,
        status: session.status,
      }),
    );

  const liveSessions = [...liveSessionRows]
    .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
    .map((session) => ({
      id: session.id,
      lessonId: session.lessonId,
      lessonTitle: liveLessonMap.get(session.lessonId) ?? "课堂",
      classId: session.classId,
      className: liveClassMap.get(session.classId) ?? "班级",
      updatedAt: toIso(session.updatedAt),
      locked: Boolean(session.locked),
      version: session.version,
      status: "live" as const,
    }));

  const scopedCourses = await db.query.courses.findMany({
    where: inArray(courses.schoolId, scope.schoolIds),
  });
  const scopedCourseIds = scopedCourses.map((course) => course.id);

  const publishedLessonsRows = scopedCourseIds.length
    ? await db.query.lessons.findMany({
        where: and(eq(lessons.status, "published"), inArray(lessons.courseId, scopedCourseIds)),
      })
    : [];

  const [classesRows, courseClassesRows] = await Promise.all([
    db.query.classes.findMany({
      where: inArray(classes.schoolId, scope.schoolIds),
    }),
    scopedCourseIds.length
      ? db.query.courseClasses.findMany({
          where: inArray(courseClasses.courseId, scopedCourseIds),
        })
      : Promise.resolve([]),
  ]);

  const classMemberRows = classesRows.length > 0
    ? await db.query.classMembers.findMany({
        where: and(
          inArray(classMembers.classId, classesRows.map((clazz) => clazz.id)),
          eq(classMembers.role, "student")
        ),
      })
    : [];
  
  const publishedVersionIds = publishedLessonsRows
    .map((lesson) => lesson.publishedVersionId)
    .filter((value): value is string => Boolean(value));

  const publishedVersionRows = publishedVersionIds.length
    ? await db.query.publishedLessonVersions.findMany({
        where: inArray(publishedLessonVersions.id, publishedVersionIds),
      })
    : [];
  const publishedVersionMap = new Map(publishedVersionRows.map((version) => [version.id, version]));
  const studentCountByClassId = new Map<string, number>();

  for (const member of classMemberRows) {
    studentCountByClassId.set(member.classId, (studentCountByClassId.get(member.classId) ?? 0) + 1);
  }

  const publishedLessons = publishedLessonsRows
    .filter((lesson) => Boolean(lesson.publishedVersionId))
    .map((lesson) => {
      const courseClassIds = courseClassesRows.filter((courseClass) => courseClass.courseId === lesson.courseId).map((courseClass) => courseClass.classId);
      const linkedClasses = classesRows.filter((clazz) => courseClassIds.includes(clazz.id));
      const publishedVersion = publishedVersionMap.get(lesson.publishedVersionId!);
      const snapshot = parseSnapshot(publishedVersion?.snapshotJson);
      const launchPreview = buildLaunchPreview(snapshot, lesson.id, lesson.title);
      const classOptions = linkedClasses
        .map((clazz) => {
          const studentCount = studentCountByClassId.get(clazz.id) ?? 0;

          return {
            id: clazz.id,
            name: clazz.name,
            studentCount,
            rosterSummary: buildLaunchRosterSummary({
              classId: clazz.id,
              className: clazz.name,
              studentCount,
            }),
          };
        });

      const launchableClasses = classOptions.filter((clazz) => clazz.studentCount > 0);

      return {
        id: lesson.id,
        title: lesson.title,
        publishedVersionId: lesson.publishedVersionId!,
        courseId: lesson.courseId,
        classes: classOptions,
        launchPreview,
        launchReadiness: buildLaunchReadiness({
          preview: launchPreview,
          launchableClassCount: launchableClasses.length,
        }),
      };
    });

  return ClassroomConsoleDTOSchema.parse({
    liveSessions,
    sessionEntries,
    publishedLessons,
    emptyStateCopy: "还没有可开课的已发布课时或可用班级",
    launchPreviewEmptyState: {
      title: "先选择一个已发布课时",
      description: "选定课时后，这里会展示上课步骤顺序、每一步摘要、预计时长与所需材料提示，方便你在开课前快速确认课堂节奏。",
    },
  });
}

export async function getClassroomSnapshotDTO(input: { sessionId: string }) {
  const session = await getSessionWithLessonSteps(input.sessionId);

  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const isTeacher = session.teacherId === user.id;
  if (!isTeacher) {
    await ensureClassroomParticipant({ sessionId: session.id, studentId: user.id });
  }

  return buildClassroomSnapshotDTOForActor({
    session,
    actor: {
      actorId: user.id,
      actorScope: isTeacher ? "teacher" : "student",
    },
  });
}

export async function applyWebSocketTeacherControlForActor(input: {
  sessionId: string;
  actorId: string;
  schoolId: string;
  command: "focus-step" | "lock" | "unlock" | "set-slide";
  expectedVersion: number;
  targetStepId?: string;
  slideIndex?: number;
}) {
  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, input.sessionId) });
  if (!session) {
    throw new Error("CLASSROOM_ENDED");
  }

  if (session.teacherId !== input.actorId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  if (session.status !== "live") {
    throw new Error("CLASSROOM_ENDED");
  }

  if (session.version !== input.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: input.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotForActor({
        sessionId: session.id,
        actorId: input.actorId,
        actorScope: "teacher",
        schoolId: input.schoolId,
      }),
    });
  }

  if (input.command === "focus-step") {
    if (!input.targetStepId) {
      throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
    }

    const steps = await getPublishedSessionSteps(session);
    const targetStep = steps.find((step) => step.id === input.targetStepId);
    if (!targetStep) {
      throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
    }

    const [updated] = await db.update(classroomSessions)
      .set({
        activeStepId: input.targetStepId,
        version: session.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, input.expectedVersion)))
      .returning();

    if (!updated) {
      return ClassroomActionResultDTOSchema.parse({
        ok: false,
        sessionId: session.id,
        error: "VERSION_CONFLICT",
        code: "conflict",
        expectedVersion: input.expectedVersion,
        serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
        snapshot: await getClassroomSnapshotForActor({
          sessionId: session.id,
          actorId: input.actorId,
          actorScope: "teacher",
          schoolId: input.schoolId,
        }),
      });
    }

    const [event] = await db.insert(classroomEvents).values({
      sessionId: session.id,
      version: updated.version,
      type: "active_step_changed",
      actorId: input.actorId,
      payloadJson: { activeStepId: input.targetStepId, slideIndex: 0 },
    }).returning();

    await publishClassroomTransportEvent({
      sessionId: session.id,
      schoolId: input.schoolId,
      eventId: event.id,
      correlationId: `classroom:${session.id}:active_step_changed:${updated.version}`,
      kind: "active_step_changed",
      payload: { activeStepId: input.targetStepId, version: updated.version },
    });

    return ClassroomActionResultDTOSchema.parse({
      ok: true,
      sessionId: session.id,
      snapshot: await getClassroomSnapshotForActor({
        sessionId: session.id,
        actorId: input.actorId,
        actorScope: "teacher",
        schoolId: input.schoolId,
      }),
    });
  }

  if (input.command === "lock" || input.command === "unlock") {
    const locked = input.command === "lock";
    const [updated] = await db.update(classroomSessions)
      .set({
        locked,
        version: session.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, input.expectedVersion)))
      .returning();

    if (!updated) {
      return ClassroomActionResultDTOSchema.parse({
        ok: false,
        sessionId: session.id,
        error: "VERSION_CONFLICT",
        code: "conflict",
        expectedVersion: input.expectedVersion,
        serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
        snapshot: await getClassroomSnapshotForActor({
          sessionId: session.id,
          actorId: input.actorId,
          actorScope: "teacher",
          schoolId: input.schoolId,
        }),
      });
    }

    const [event] = await db.insert(classroomEvents).values({
      sessionId: session.id,
      version: updated.version,
      type: "lock_mode_changed",
      actorId: input.actorId,
      payloadJson: { locked },
    }).returning();

    await publishClassroomTransportEvent({
      sessionId: session.id,
      schoolId: input.schoolId,
      eventId: event.id,
      correlationId: `classroom:${session.id}:lock_mode_changed:${updated.version}`,
      kind: "lock_mode_changed",
      payload: { locked, version: updated.version },
    });

    return ClassroomActionResultDTOSchema.parse({
      ok: true,
      sessionId: session.id,
      snapshot: await getClassroomSnapshotForActor({
        sessionId: session.id,
        actorId: input.actorId,
        actorScope: "teacher",
        schoolId: input.schoolId,
      }),
    });
  }

  if (typeof input.slideIndex !== "number") {
    throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
  }

  const stepId = input.targetStepId ?? session.activeStepId;
  if (session.activeStepId !== stepId) {
    throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, input.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: input.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotForActor({
        sessionId: session.id,
        actorId: input.actorId,
        actorScope: "teacher",
        schoolId: input.schoolId,
      }),
    });
  }

  const [event] = await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "slide_changed",
    actorId: input.actorId,
    payloadJson: { stepId, slideIndex: input.slideIndex },
  }).returning();

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: input.schoolId,
    eventId: event.id,
    correlationId: `classroom:${session.id}:slide_changed:${updated.version}`,
    kind: "slide_changed",
    payload: { stepId, slideIndex: input.slideIndex, version: updated.version },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotForActor({
      sessionId: session.id,
      actorId: input.actorId,
      actorScope: "teacher",
      schoolId: input.schoolId,
    }),
  });
}

export async function getClassroomSessionRecapDTO(rawInput: unknown) {
  const input = GetClassroomSessionRecapInputSchema.parse(rawInput);
  const { session } = await getTeacherSessionScope(input.sessionId);

  if (session.status !== "ended") {
    throw new Error("CLASSROOM_RECAP_NOT_AVAILABLE");
  }

  const [lesson, clazz, published, participants, evidenceRows, timelineRows] = await Promise.all([
    db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) }),
    db.query.classes.findFirst({ where: eq(classes.id, session.classId) }),
    db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) }),
    db.query.classroomParticipants.findMany({ where: eq(classroomParticipants.sessionId, session.id) }),
    db.query.classroomEvidence.findMany({ where: eq(classroomEvidence.sessionId, session.id) }),
    db.query.classroomTimeline.findMany({ where: eq(classroomTimeline.sessionId, session.id) }),
  ]);

  const participantIds = participants.map((row) => row.studentId);
  const [studentUsers, progressRows, latestTaskRows, latestQuizRows, feedbackRows, enrollmentRows] = participantIds.length > 0
    ? await Promise.all([
        db.query.users.findMany({ where: inArray(users.id, participantIds) }),
        db.query.lessonStepProgress.findMany({
          where: and(eq(lessonStepProgress.publishedVersionId, session.publishedVersionId), inArray(lessonStepProgress.studentId, participantIds)),
        }),
        db.query.taskSubmissions.findMany({
          where: and(eq(taskSubmissions.publishedVersionId, session.publishedVersionId), inArray(taskSubmissions.studentId, participantIds), eq(taskSubmissions.isLatest, true)),
        }),
        db.query.quizAttempts.findMany({
          where: and(eq(quizAttempts.publishedVersionId, session.publishedVersionId), inArray(quizAttempts.studentId, participantIds), eq(quizAttempts.isLatest, true)),
        }),
        db.query.attemptFeedback.findMany({ where: inArray(attemptFeedback.studentId, participantIds) }),
        lesson
          ? db.query.courseEnrollments.findMany({
              where: and(eq(courseEnrollments.courseId, lesson.courseId), inArray(courseEnrollments.studentId, participantIds)),
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], [], []];

  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, session.lessonId);
  const stepMap = new Map(steps.map((step) => [step.id, step]));
  const userMap = new Map(studentUsers.map((user) => [user.id, user.name ?? "学生"]));
  const progressByStudent = new Map<string, Array<typeof lessonStepProgress.$inferSelect>>();
  const latestTaskByStudent = new Map<string, Array<typeof taskSubmissions.$inferSelect>>();
  const latestQuizByStudent = new Map<string, Array<typeof quizAttempts.$inferSelect>>();
  const evidenceByStudent = new Map<string, Array<typeof classroomEvidence.$inferSelect>>();
  const timelineByStudent = new Map<string, Array<typeof classroomTimeline.$inferSelect>>();
  const evaluationByStudent = new Map<string, Array<ReturnType<typeof StudentFormativeEvaluationEntryDTOSchema.parse>>>();

  for (const row of progressRows) {
    const list = progressByStudent.get(row.studentId) ?? [];
    list.push(row);
    progressByStudent.set(row.studentId, list);
  }

  for (const row of latestTaskRows) {
    const list = latestTaskByStudent.get(row.studentId) ?? [];
    list.push(row);
    latestTaskByStudent.set(row.studentId, list);
  }

  for (const row of latestQuizRows) {
    const list = latestQuizByStudent.get(row.studentId) ?? [];
    list.push(row);
    latestQuizByStudent.set(row.studentId, list);
  }

  for (const row of evidenceRows) {
    if (row.studentId) {
      const list = evidenceByStudent.get(row.studentId) ?? [];
      list.push(row);
      evidenceByStudent.set(row.studentId, list);
    }
  }

  for (const row of timelineRows) {
    if (row.studentId) {
      const list = timelineByStudent.get(row.studentId) ?? [];
      list.push(row);
      timelineByStudent.set(row.studentId, list);
    }
  }

  for (const row of evidenceRows) {
    if (!row.studentId) {
      continue;
    }

    const rawPayload = row.payloadJson;
    if (!rawPayload || typeof rawPayload !== "object") {
      continue;
    }

    const payload = rawPayload as Record<string, unknown>;
    if (payload.kind !== "formative-evaluation") {
      continue;
    }

    const formativePayload = ClassroomFormativeEvaluationPayloadSchema.parse(payload);
    const list = evaluationByStudent.get(row.studentId) ?? [];
    list.push(
      StudentFormativeEvaluationEntryDTOSchema.parse({
        id: row.id,
        sessionId: row.sessionId,
        studentId: row.studentId,
        participationLevel: formativePayload.participationLevel,
        tags: formativePayload.tags,
        observationNote: formativePayload.observationNote,
        capturedById: row.capturedById,
        createdAt: toIso(row.createdAt),
      }),
    );
    evaluationByStudent.set(row.studentId, list);
  }

  for (const entries of evaluationByStudent.values()) {
    entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  const feedbackWorkload = buildFeedbackWorkloadFromAttempts({
    taskRows: latestTaskRows,
    quizRows: latestQuizRows,
    feedbackRows,
  });
  const enrolledStudentIds = new Set(enrollmentRows.map((row) => row.studentId));

  const studentSummaries = participants.map((participant) => {
    const progress = progressByStudent.get(participant.studentId) ?? [];
    const completedStepCount = progress.filter((row) => row.state === "completed" || row.state === "skipped").length;
    const evidence = (evidenceByStudent.get(participant.studentId) ?? []).filter((row) => {
      const payload = row.payloadJson as Record<string, unknown> | null;
      return payload?.kind !== "formative-evaluation";
    });
    const evaluations = evaluationByStudent.get(participant.studentId) ?? [];
    const latestParticipationLevel = evaluations[0]?.participationLevel ?? null;
    const taskAttempts = latestTaskByStudent.get(participant.studentId) ?? [];
    const quizAttemptsForStudent = latestQuizByStudent.get(participant.studentId) ?? [];
    const pendingFeedbackCount = [...taskAttempts, ...quizAttemptsForStudent].filter((attempt) => feedbackWorkload.pendingAttemptIds.has(attempt.id)).length;
    const missingSubmissionCount = steps.filter((step) => {
      if (step.type === "content") {
        return false;
      }

      if (step.type === "task") {
        return !taskAttempts.some((attempt) => attempt.stepId === step.id);
      }

      return !quizAttemptsForStudent.some((attempt) => attempt.stepId === step.id);
    }).length;
    const hasUnevaluatedSignal = evidence.length > 0 && evaluations.length === 0;
    const needsFollowUp = latestParticipationLevel === "attention" || hasUnevaluatedSignal || missingSubmissionCount > 0;

    return {
      studentId: participant.studentId,
      studentName: userMap.get(participant.studentId) ?? "学生",
      completionLabel: buildStudentCompletionLabel({ completedStepCount, totalStepCount: steps.length }),
      participationLabel: toParticipationLabel(latestParticipationLevel),
      evidenceCount: evidence.length,
      needsFollowUp,
      pendingFeedbackCount,
      completionItems: [
        {
          id: `completion-${participant.studentId}`,
          title: "课堂完成情况",
          detail: enrolledStudentIds.has(participant.studentId)
            ? `本次课堂完成 ${completedStepCount}/${steps.length} 个环节。`
            : `该学生当前不在本课正式选课名单中，本次课堂完成 ${completedStepCount}/${steps.length} 个环节。`,
        },
      ],
      submissionItems: [
        ...taskAttempts.map((attempt) => ({
          id: attempt.id,
          title: stepMap.get(attempt.stepId)?.title ?? "任务提交",
          detail: feedbackWorkload.pendingAttemptIds.has(attempt.id) ? "已提交，等待教师反馈" : "已提交，教师已完成反馈",
          createdAt: toIso(attempt.createdAt),
        })),
        ...quizAttemptsForStudent.map((attempt) => ({
          id: attempt.id,
          title: stepMap.get(attempt.stepId)?.title ?? "测验作答",
          detail: feedbackWorkload.pendingAttemptIds.has(attempt.id) ? "已作答，等待教师反馈" : "已作答，教师已完成反馈",
          createdAt: toIso(attempt.createdAt),
        })),
        ...evidence.map((row) => ({
          id: row.id,
          title: stepMap.get(row.stepId ?? "")?.title ?? "课堂证据",
          detail: extractEvidenceDetail(row.payloadJson),
          createdAt: toIso(row.createdAt),
        })),
      ],
      evaluationItems: evaluations.map((entry) => ({
        id: entry.id,
        title: `${toParticipationLabel(entry.participationLevel)} · ${entry.tags.join(" / ") || "过程评价"}`,
        detail: entry.observationNote,
        createdAt: entry.createdAt,
      })),
      timelineItems: (timelineByStudent.get(participant.studentId) ?? []).map((row) => ({
        id: row.id,
        title: row.entryType === "intervention_noted" ? "课堂干预" : row.entryType === "presence_changed" ? "课堂在线状态" : "课堂采证",
        detail: extractEvidenceDetail(row.payloadJson),
        createdAt: toIso(row.createdAt),
      })),
      _completedStepCount: completedStepCount,
      _latestParticipationLevel: latestParticipationLevel,
      _missingSubmissionCount: missingSubmissionCount,
      _hasUnevaluatedSignal: hasUnevaluatedSignal,
      _followUpReasons: buildRepresentativeFollowUpCopy({
        needsAttention: latestParticipationLevel === "attention",
        hasUnevaluatedSignal,
        missingSubmissionCount,
      }),
    };
  });

  const selectedStudentId = input.studentId && studentSummaries.some((student) => student.studentId === input.studentId)
    ? input.studentId
    : studentSummaries.find((student) => student.needsFollowUp)?.studentId ?? studentSummaries[0]?.studentId ?? null;
  const selectedStudent = selectedStudentId
    ? studentSummaries.find((student) => student.studentId === selectedStudentId) ?? null
    : null;
  const participationBuckets = buildParticipationBuckets(studentSummaries.map((student) => student._latestParticipationLevel ?? null));
  const completedStudentCount = studentSummaries.filter((student) => student._completedStepCount >= steps.length && steps.length > 0).length;
  const stepSummaries = steps.map((step) => {
    const completionCount = studentSummaries.filter((student) => {
      const progress = progressByStudent.get(student.studentId) ?? [];
      const row = progress.find((item) => item.stepId === step.id);
      return row?.state === "completed" || row?.state === "skipped";
    }).length;
    const submissionCount = step.type === "task"
      ? latestTaskRows.filter((row) => row.stepId === step.id).length
      : step.type === "quiz"
        ? latestQuizRows.filter((row) => row.stepId === step.id).length
        : evidenceRows.filter((row) => row.stepId === step.id && row.sourceType === "student-quick-response").length;
    const attentionCount = studentSummaries.filter((student) => {
      if (student._latestParticipationLevel === "attention") {
        return true;
      }

      if (step.type === "task") {
        return !latestTaskByStudent.get(student.studentId)?.some((row) => row.stepId === step.id);
      }

      if (step.type === "quiz") {
        return !latestQuizByStudent.get(student.studentId)?.some((row) => row.stepId === step.id);
      }

      return false;
    }).length;

    return {
      stepId: step.id,
      stepTitle: step.title,
      completionCount,
      submissionCount,
      attentionCount,
      totalStudents: participants.length,
    };
  });

  const detailTab = ClassroomSessionRecapDetailTabSchema.parse(input.detailTab ?? "students");

  return ClassroomSessionRecapDTOSchema.parse({
    session: {
      id: session.id,
      status: "ended",
      lessonId: session.lessonId,
      classId: session.classId,
      lessonTitle: snapshot.lesson?.title ?? lesson?.title ?? "课堂",
      className: clazz?.name ?? "班级",
      startedAt: toIso(session.createdAt),
      endedAt: toIso(session.endedAt),
    },
    summary: {
      completionLabel: buildCompletionLabel(completedStudentCount, participants.length),
      completionCount: completedStudentCount,
      totalStudents: participants.length,
      submissionCount: latestTaskRows.length + latestQuizRows.length,
      evidenceCount: evidenceRows.length,
      participationBuckets,
    },
    workload: {
      followUpSignalsCount: buildClassroomSignalWorkload(studentSummaries),
      pendingFeedbackCount: feedbackWorkload.pendingFeedbackCount,
    },
    detailTab,
    studentSummaries: studentSummaries.map((student) => ({
      studentId: student.studentId,
      studentName: student.studentName,
      completionLabel: student.completionLabel,
      participationLabel: student.participationLabel,
      evidenceCount: student.evidenceCount,
      needsFollowUp: student.needsFollowUp,
      pendingFeedbackCount: student.pendingFeedbackCount,
    })),
    selectedStudent: selectedStudent
      ? {
          studentId: selectedStudent.studentId,
          studentName: selectedStudent.studentName,
          completionLabel: selectedStudent.completionLabel,
          participationLabel: selectedStudent.participationLabel,
          evidenceCount: selectedStudent.evidenceCount,
          needsFollowUp: selectedStudent.needsFollowUp,
          pendingFeedbackCount: selectedStudent.pendingFeedbackCount,
          completionItems: selectedStudent.completionItems,
          submissionItems: selectedStudent.submissionItems,
          evaluationItems: selectedStudent.evaluationItems,
          timelineItems: selectedStudent.timelineItems,
        }
      : null,
    stepSummaries,
    selectedStepId: input.stepId && stepSummaries.some((step) => step.stepId === input.stepId)
      ? input.stepId
      : stepSummaries[0]?.stepId ?? null,
  });
}

type TrendSessionStudentSummary = {
  studentId: string;
  studentName: string;
  participationLabel: "积极参与" | "正常参与" | "需要关注" | "未评价";
  needsFollowUp: boolean;
  pendingFeedbackCount: number;
  missingSubmissionCount: number;
  hasUnevaluatedSignal: boolean;
  keySignals: string[];
  primaryRecapHref: string;
  secondaryReviewHref: string | null;
};

export async function getTeacherRecentSessionTrendDTO(rawInput: unknown) {
  const input = GetTeacherRecentSessionTrendInputSchema.parse(rawInput);
  const scope = await assertActiveTeacher();
  const limit = input.limit ?? 4;

  const endedSessions = await db.query.classroomSessions.findMany({
    where: and(
      eq(classroomSessions.teacherId, scope.userId),
      eq(classroomSessions.status, "ended"),
      eq(classroomSessions.classId, input.classId),
      input.lessonId ? eq(classroomSessions.lessonId, input.lessonId) : undefined,
    ),
    orderBy: [desc(classroomSessions.endedAt), desc(classroomSessions.updatedAt)],
  });

  const sessions = endedSessions.slice(0, limit);
  if (sessions.length === 0) {
    return ClassroomRecentSessionTrendDTOSchema.parse({
      view: input.view,
      window: {
        kind: "latest-ended-sessions",
        limit,
      },
      classSummary: {
        classId: input.classId,
        className: "班级",
        view: input.view,
        windowSize: limit,
        sessionCount: 0,
        averageCompletionRate: 0,
        averageSubmissionRate: 0,
        totalFollowUpSignalsCount: 0,
        totalPendingFeedbackCount: 0,
        latestEndedAt: null,
        trendLabel: "稳定",
      },
      sessionPoints: [],
      studentSummaries: [],
      selectedSessionId: null,
      selectedDetail: null,
    });
  }

  const sessionIds = sessions.map((session) => session.id);
  const participantRows = await db.query.classroomParticipants.findMany({
    where: inArray(classroomParticipants.sessionId, sessionIds),
  });
  const participantIds = [...new Set(participantRows.map((row) => row.studentId))];
  const publishedVersionIds = [...new Set(sessions.map((session) => session.publishedVersionId))];
  const [
    lessonRows,
    classRow,
    publishedRows,
    evidenceRows,
    timelineRows,
    studentRows,
    progressRows,
    latestTaskRows,
    latestQuizRows,
    feedbackRows,
  ] = await Promise.all([
    db.query.lessons.findMany({
      where: inArray(lessons.id, [...new Set(sessions.map((session) => session.lessonId))]),
    }),
    db.query.classes.findFirst({ where: eq(classes.id, input.classId) }),
    db.query.publishedLessonVersions.findMany({
      where: inArray(publishedLessonVersions.id, publishedVersionIds),
    }),
    db.query.classroomEvidence.findMany({
      where: inArray(classroomEvidence.sessionId, sessionIds),
    }),
    db.query.classroomTimeline.findMany({
      where: inArray(classroomTimeline.sessionId, sessionIds),
    }),
    participantIds.length > 0
      ? db.query.users.findMany({ where: inArray(users.id, participantIds) })
      : Promise.resolve([]),
    participantIds.length > 0
      ? db.query.lessonStepProgress.findMany({
          where: and(
            inArray(lessonStepProgress.publishedVersionId, publishedVersionIds),
            inArray(lessonStepProgress.studentId, participantIds),
          ),
        })
      : Promise.resolve([]),
    participantIds.length > 0
      ? db.query.taskSubmissions.findMany({
          where: and(
            inArray(taskSubmissions.publishedVersionId, publishedVersionIds),
            inArray(taskSubmissions.studentId, participantIds),
            eq(taskSubmissions.isLatest, true),
          ),
        })
      : Promise.resolve([]),
    participantIds.length > 0
      ? db.query.quizAttempts.findMany({
          where: and(
            inArray(quizAttempts.publishedVersionId, publishedVersionIds),
            inArray(quizAttempts.studentId, participantIds),
            eq(quizAttempts.isLatest, true),
          ),
        })
      : Promise.resolve([]),
    participantIds.length > 0
      ? db.query.attemptFeedback.findMany({
          where: inArray(attemptFeedback.studentId, participantIds),
        })
      : Promise.resolve([]),
  ]);

  const lessonMap = new Map(lessonRows.map((lesson) => [lesson.id, lesson]));
  const publishedMap = new Map(publishedRows.map((version) => [version.id, version]));
  const studentNameMap = new Map(studentRows.map((student) => [student.id, student.name ?? "学生"]));
  const participantsBySession = new Map<string, Array<(typeof participantRows)[number]>>();
  const evidenceBySessionStudent = new Map<string, Array<(typeof evidenceRows)[number]>>();
  const evaluationsBySessionStudent = new Map<string, Array<ReturnType<typeof StudentFormativeEvaluationEntryDTOSchema.parse>>>();
  const progressByVersionStudent = new Map<string, Array<(typeof progressRows)[number]>>();
  const tasksByVersionStudent = new Map<string, Array<(typeof latestTaskRows)[number]>>();
  const quizzesByVersionStudent = new Map<string, Array<(typeof latestQuizRows)[number]>>();
  const timelineBySessionStudent = new Map<string, Array<(typeof timelineRows)[number]>>();

  for (const participant of participantRows) {
    const key = participantsBySession.get(participant.sessionId) ?? [];
    key.push(participant);
    participantsBySession.set(participant.sessionId, key);
  }

  for (const row of progressRows) {
    const key = `${row.publishedVersionId}:${row.studentId}`;
    const entries = progressByVersionStudent.get(key) ?? [];
    entries.push(row);
    progressByVersionStudent.set(key, entries);
  }

  for (const row of latestTaskRows) {
    const key = `${row.publishedVersionId}:${row.studentId}`;
    const entries = tasksByVersionStudent.get(key) ?? [];
    entries.push(row);
    tasksByVersionStudent.set(key, entries);
  }

  for (const row of latestQuizRows) {
    const key = `${row.publishedVersionId}:${row.studentId}`;
    const entries = quizzesByVersionStudent.get(key) ?? [];
    entries.push(row);
    quizzesByVersionStudent.set(key, entries);
  }

  for (const row of evidenceRows) {
    if (!row.studentId) {
      continue;
    }

    const key = `${row.sessionId}:${row.studentId}`;
    const rawPayload = row.payloadJson;
    if (rawPayload && typeof rawPayload === "object" && (rawPayload as Record<string, unknown>).kind === "formative-evaluation") {
      const entries = evaluationsBySessionStudent.get(key) ?? [];
      const payload = ClassroomFormativeEvaluationPayloadSchema.parse(rawPayload);
      entries.push(StudentFormativeEvaluationEntryDTOSchema.parse({
        id: row.id,
        sessionId: row.sessionId,
        studentId: row.studentId,
        participationLevel: payload.participationLevel,
        tags: payload.tags,
        observationNote: payload.observationNote,
        capturedById: row.capturedById,
        createdAt: toIso(row.createdAt),
      }));
      evaluationsBySessionStudent.set(key, entries);
      continue;
    }

    const entries = evidenceBySessionStudent.get(key) ?? [];
    entries.push(row);
    evidenceBySessionStudent.set(key, entries);
  }

  for (const row of timelineRows) {
    if (!row.studentId) {
      continue;
    }

    const key = `${row.sessionId}:${row.studentId}`;
    const entries = timelineBySessionStudent.get(key) ?? [];
    entries.push(row);
    timelineBySessionStudent.set(key, entries);
  }

  for (const entries of evaluationsBySessionStudent.values()) {
    entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  const sessionStudentSummaries = new Map<string, TrendSessionStudentSummary[]>();
  const aggregatedStudentMap = new Map<string, {
    studentId: string;
    studentName: string;
    latestParticipationLabel: "积极参与" | "正常参与" | "需要关注" | "未评价";
    needsFollowUpSessions: number;
    unevaluatedSessions: number;
    missingSubmissionSessions: number;
    pendingFeedbackSessions: number;
    primarySignalLabel: "上升" | "稳定" | "回落" | "需关注" | "未评价";
    primaryRecapHref: string | null;
    secondaryReviewHref: string | null;
  }>();

  const sessionPoints = sessions.map((session) => {
    const participants = participantsBySession.get(session.id) ?? [];
    const published = publishedMap.get(session.publishedVersionId);
    const snapshot = parseSnapshot(published?.snapshotJson);
    const lesson = lessonMap.get(session.lessonId);
    const steps = parseSnapshotSteps(snapshot, session.lessonId);
    const submittableSteps = steps.filter((step) => step.type === "task" || step.type === "quiz");
    const feedbackWorkload = buildFeedbackWorkloadFromAttempts({
      taskRows: latestTaskRows.filter((row) => row.publishedVersionId === session.publishedVersionId),
      quizRows: latestQuizRows.filter((row) => row.publishedVersionId === session.publishedVersionId),
      feedbackRows,
    });

    const students = participants.map((participant) => {
      const versionKey = `${session.publishedVersionId}:${participant.studentId}`;
      const sessionKey = `${session.id}:${participant.studentId}`;
      const progress = progressByVersionStudent.get(versionKey) ?? [];
      const taskAttempts = tasksByVersionStudent.get(versionKey) ?? [];
      const quizAttemptsForStudent = quizzesByVersionStudent.get(versionKey) ?? [];
      const evidence = evidenceBySessionStudent.get(sessionKey) ?? [];
      const evaluations = evaluationsBySessionStudent.get(sessionKey) ?? [];
      const latestParticipationLevel = evaluations[0]?.participationLevel ?? null;
      const completedStepCount = progress.filter((row) => row.state === "completed" || row.state === "skipped").length;
      const missingSubmissionCount = submittableSteps.filter((step) => {
        if (step.type === "task") {
          return !taskAttempts.some((attempt) => attempt.stepId === step.id);
        }

        return !quizAttemptsForStudent.some((attempt) => attempt.stepId === step.id);
      }).length;
      const hasUnevaluatedSignal = evidence.length > 0 && evaluations.length === 0;
      const needsFollowUp = latestParticipationLevel === "attention" || hasUnevaluatedSignal || missingSubmissionCount > 0;
      const pendingFeedbackCount = [...taskAttempts, ...quizAttemptsForStudent].filter((attempt) => feedbackWorkload.pendingAttemptIds.has(attempt.id)).length;
      const participationLabel = toParticipationLabel(latestParticipationLevel);
      const keySignals = buildRepresentativeFollowUpCopy({
        needsAttention: latestParticipationLevel === "attention",
        hasUnevaluatedSignal,
        missingSubmissionCount,
      });
      const primaryRecapHref = buildTrendPrimaryRecapHref(session.id, participant.studentId);
      const secondaryReviewHref = buildTrendSecondaryReviewHref({
        lessonId: session.lessonId,
        studentId: participant.studentId,
        pendingFeedbackCount,
      });

      const aggregatedStudent = aggregatedStudentMap.get(participant.studentId) ?? {
        studentId: participant.studentId,
        studentName: studentNameMap.get(participant.studentId) ?? "学生",
        latestParticipationLabel: participationLabel,
        needsFollowUpSessions: 0,
        unevaluatedSessions: 0,
        missingSubmissionSessions: 0,
        pendingFeedbackSessions: 0,
        primarySignalLabel: "稳定" as const,
        primaryRecapHref: null,
        secondaryReviewHref: null,
      };

      if (needsFollowUp) {
        aggregatedStudent.needsFollowUpSessions += 1;
      }
      if (participationLabel === "未评价") {
        aggregatedStudent.unevaluatedSessions += 1;
      }
      if (missingSubmissionCount > 0) {
        aggregatedStudent.missingSubmissionSessions += 1;
      }
      if (pendingFeedbackCount > 0) {
        aggregatedStudent.pendingFeedbackSessions += 1;
      }
      if (!aggregatedStudent.primaryRecapHref && needsFollowUp) {
        aggregatedStudent.primaryRecapHref = primaryRecapHref;
      }
      if (!aggregatedStudent.secondaryReviewHref && secondaryReviewHref) {
        aggregatedStudent.secondaryReviewHref = secondaryReviewHref;
      }
      if (aggregatedStudent.latestParticipationLabel === "未评价") {
        aggregatedStudent.latestParticipationLabel = participationLabel;
      }
      if (latestParticipationLevel === "attention") {
        aggregatedStudent.primarySignalLabel = "需关注";
      } else if (participationLabel === "未评价" && aggregatedStudent.primarySignalLabel !== "需关注") {
        aggregatedStudent.primarySignalLabel = "未评价";
      } else if (missingSubmissionCount > 0 && !["需关注", "未评价"].includes(aggregatedStudent.primarySignalLabel)) {
        aggregatedStudent.primarySignalLabel = "回落";
      }
      aggregatedStudentMap.set(participant.studentId, aggregatedStudent);

      return {
        studentId: participant.studentId,
        studentName: studentNameMap.get(participant.studentId) ?? "学生",
        participationLabel,
        needsFollowUp,
        pendingFeedbackCount,
        missingSubmissionCount,
        hasUnevaluatedSignal,
        keySignals,
        primaryRecapHref,
        secondaryReviewHref,
        completedStepCount,
      };
    });

    sessionStudentSummaries.set(session.id, students);

    const completedStudentCount = students.filter((student) => student.completedStepCount >= steps.length && steps.length > 0).length;
    const studentAttemptCount = students.filter((student) => {
      const versionKey = `${session.publishedVersionId}:${student.studentId}`;
      return (tasksByVersionStudent.get(versionKey) ?? []).length + (quizzesByVersionStudent.get(versionKey) ?? []).length > 0;
    }).length;
    const followUpSignalsCount = students.filter((student) => student.needsFollowUp).length;
    const attentionCount = students.filter((student) => student.participationLabel === "需要关注").length;
    const unevaluatedCount = students.filter((student) => student.participationLabel === "未评价").length;

    return {
      sessionId: session.id,
      lessonId: session.lessonId,
      lessonTitle: snapshot.lesson?.title ?? lesson?.title ?? "课堂",
      classId: session.classId,
      className: classRow?.name ?? "班级",
      startedAt: toIso(session.createdAt),
      endedAt: toIso(session.endedAt),
      completionRate: participants.length > 0 ? completedStudentCount / participants.length : 0,
      submissionRate: participants.length > 0 ? studentAttemptCount / participants.length : 0,
      followUpSignalsCount,
      pendingFeedbackCount: students.reduce((sum, student) => sum + student.pendingFeedbackCount, 0),
      attentionCount,
      unevaluatedCount,
      trendLabel: "稳定" as const,
      primaryRecapHref: buildTrendPrimaryRecapHref(session.id),
      secondaryReviewHref: buildTrendSecondaryReviewHref({
        lessonId: session.lessonId,
        pendingFeedbackCount: students.reduce((sum, student) => sum + student.pendingFeedbackCount, 0),
      }),
    };
  }).map((point, index, points) => {
    const previous = points[index + 1];
    let trendLabel: "上升" | "稳定" | "回落" | "需关注" | "未评价" = "稳定";

    if (point.followUpSignalsCount > 0 || point.unevaluatedCount > 0) {
      trendLabel = point.unevaluatedCount > 0 ? "未评价" : "需关注";
    } else if (previous && point.completionRate >= previous.completionRate + 0.05) {
      trendLabel = "上升";
    } else if (previous && point.completionRate <= previous.completionRate - 0.05) {
      trendLabel = "回落";
    }

    return {
      ...point,
      trendLabel,
    };
  });

  const selectedSessionId = input.sessionId && sessionPoints.some((point) => point.sessionId === input.sessionId)
    ? input.sessionId
    : sessionPoints.find((point) => point.followUpSignalsCount > 0)?.sessionId ?? sessionPoints[0]?.sessionId ?? null;
  const selectedSessionPoint = selectedSessionId
    ? sessionPoints.find((point) => point.sessionId === selectedSessionId) ?? null
    : null;
  const selectedStudents = selectedSessionId
    ? sessionStudentSummaries.get(selectedSessionId) ?? []
    : [];
  const detailStudents = (input.studentId
    ? selectedStudents.filter((student) => student.studentId === input.studentId)
    : selectedStudents.filter((student) => student.needsFollowUp))
    .slice(0, input.studentId ? 1 : 5);
  const selectedDetail = selectedSessionPoint
    ? {
        session: selectedSessionPoint,
        summary: `${selectedSessionPoint.className} 在本次课堂中有 ${selectedSessionPoint.followUpSignalsCount} 个需优先查看的趋势信号。`,
        keySignals: [
          `${selectedSessionPoint.followUpSignalsCount} 个课堂信号需要跟进`,
          `${selectedSessionPoint.pendingFeedbackCount} 项待反馈提交`,
          `${selectedSessionPoint.unevaluatedCount} 名学生仍处于未评价`,
        ],
        impactedStudents: detailStudents.map((student) => ({
          studentId: student.studentId,
          studentName: student.studentName,
          participationLabel: student.participationLabel,
          needsFollowUp: student.needsFollowUp,
          pendingFeedbackCount: student.pendingFeedbackCount,
          keySignals: student.keySignals,
          primaryRecapHref: student.primaryRecapHref,
          secondaryReviewHref: student.secondaryReviewHref,
        })),
        primaryRecapHref: selectedSessionPoint.primaryRecapHref,
        secondaryReviewHref: selectedSessionPoint.secondaryReviewHref,
      }
    : null;

  const studentSummaries = [...aggregatedStudentMap.values()]
    .sort((left, right) => {
      if (right.needsFollowUpSessions !== left.needsFollowUpSessions) {
        return right.needsFollowUpSessions - left.needsFollowUpSessions;
      }
      if (right.unevaluatedSessions !== left.unevaluatedSessions) {
        return right.unevaluatedSessions - left.unevaluatedSessions;
      }
      if (right.missingSubmissionSessions !== left.missingSubmissionSessions) {
        return right.missingSubmissionSessions - left.missingSubmissionSessions;
      }

      return left.studentName.localeCompare(right.studentName, "zh-CN");
    });

  const sessionCount = sessionPoints.length;
  const classSummary = {
    classId: input.classId,
    className: classRow?.name ?? "班级",
    view: input.view,
    windowSize: limit,
    sessionCount,
    averageCompletionRate: sessionCount > 0
      ? sessionPoints.reduce((sum, point) => sum + point.completionRate, 0) / sessionCount
      : 0,
    averageSubmissionRate: sessionCount > 0
      ? sessionPoints.reduce((sum, point) => sum + point.submissionRate, 0) / sessionCount
      : 0,
    totalFollowUpSignalsCount: sessionPoints.reduce((sum, point) => sum + point.followUpSignalsCount, 0),
    totalPendingFeedbackCount: sessionPoints.reduce((sum, point) => sum + point.pendingFeedbackCount, 0),
    latestEndedAt: sessionPoints[0]?.endedAt ?? null,
    trendLabel: sessionPoints.some((point) => point.trendLabel === "需关注" || point.trendLabel === "未评价")
      ? "需关注"
      : sessionPoints.some((point) => point.trendLabel === "上升")
        ? "上升"
        : sessionPoints.some((point) => point.trendLabel === "回落")
          ? "回落"
          : "稳定",
  };

  return ClassroomRecentSessionTrendDTOSchema.parse({
    view: input.view,
    window: {
      kind: "latest-ended-sessions",
      limit,
    },
    classSummary,
    sessionPoints,
    studentSummaries,
    selectedSessionId,
    selectedDetail,
  });
}

export async function launchClassroomSession(input: unknown) {
  const payload = LaunchClassroomInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const scopedCourses = await db.query.courses.findMany({
    where: inArray(courses.schoolId, scope.schoolIds),
  });
  const scopedCourseIds = new Set(scopedCourses.map((course) => course.id));

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, payload.lessonId) });
  if (!lesson || lesson.status !== "published" || !lesson.publishedVersionId || lesson.publishedVersionId !== payload.publishedVersionId) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }
  if (!scopedCourseIds.has(lesson.courseId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const clazz = await db.query.classes.findFirst({ where: eq(classes.id, payload.classId) });
  if (!clazz || !scope.schoolIds.includes(clazz.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const courseClass = await db.query.courseClasses.findFirst({
    where: and(
      eq(courseClasses.courseId, lesson.courseId),
      eq(courseClasses.classId, payload.classId)
    )
  });
  if (!courseClass) {
    throw new Error("CLASSROOM_EMPTY_ROSTER");
  }

  const members = await db.query.classMembers.findMany({
    where: and(eq(classMembers.classId, payload.classId), eq(classMembers.role, "student"))
  });

  if (members.length === 0) {
    throw new Error("CLASSROOM_EMPTY_ROSTER");
  }

  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, lesson.publishedVersionId)
  });
  if (!published) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }

  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  if (steps.length === 0) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }
  const firstStep = steps[0];

  const { session, launchEventId } = await db.transaction(async (tx) => {
    const transportSettings = await resolveSystemTransportModeForNewSessions();
    const [newSession] = await tx.insert(classroomSessions).values({
      lessonId: payload.lessonId,
      publishedVersionId: payload.publishedVersionId,
      classId: payload.classId,
      teacherId: scope.userId,
      activeStepId: firstStep.id,
      locked: false,
      transportModeSnapshot: transportSettings.effectiveMode,
      status: "live",
      version: 1,
    }).returning();

    const participantValues = members.map(m => ({
      sessionId: newSession.id,
      studentId: m.userId,
      classMemberId: m.id,
      connectionState: "offline" as const,
      currentStepId: firstStep.id,
    }));

    await tx.insert(classroomParticipants).values(participantValues);

    const [launchEvent] = await tx.insert(classroomEvents).values({
      sessionId: newSession.id,
      version: 1,
      type: "launched",
      actorId: scope.userId,
      payloadJson: { activeStepId: firstStep.id, locked: false, slideIndex: 0 },
    }).returning();

    return { session: newSession, launchEventId: launchEvent.id };
  });

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: clazz.schoolId,
    eventId: launchEventId,
    correlationId: `classroom:${session.id}:launched:${session.version}`,
    kind: "launched",
    payload: { activeStepId: session.activeStepId, locked: session.locked, version: session.version },
  });

  return getClassroomSnapshotDTO({ sessionId: session.id });
}

export async function changeClassroomActiveStep(input: unknown) {
  const payload = ChangeClassroomStepInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");

  const published = await db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) });
  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, session.lessonId);
  const targetStep = steps.find(s => s.id === payload.targetStepId);
  if (!targetStep) throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");

  if (session.version !== payload.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      activeStepId: payload.targetStepId,
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, payload.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [event] = await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "active_step_changed",
    actorId: scope.userId,
    payloadJson: { activeStepId: payload.targetStepId, slideIndex: 0 },
  }).returning();

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: null,
    eventId: event.id,
    correlationId: `classroom:${session.id}:active_step_changed:${updated.version}`,
    kind: "active_step_changed",
    payload: { activeStepId: payload.targetStepId, version: updated.version },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function changeClassroomMode(input: unknown) {
  const payload = ChangeClassroomModeInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");

  if (session.version !== payload.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      locked: payload.locked,
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, payload.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [event] = await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "lock_mode_changed",
    actorId: scope.userId,
    payloadJson: { locked: payload.locked },
  }).returning();

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: null,
    eventId: event.id,
    correlationId: `classroom:${session.id}:lock_mode_changed:${updated.version}`,
    kind: "lock_mode_changed",
    payload: { locked: payload.locked, version: updated.version },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function changeClassroomSlide(input: unknown) {
  const payload = ChangeClassroomSlideInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");
  if (session.activeStepId !== payload.stepId) throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");

  if (session.version !== payload.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, payload.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [event] = await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "slide_changed",
    actorId: scope.userId,
    payloadJson: { stepId: payload.stepId, slideIndex: payload.slideIndex },
  }).returning();

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: null,
    eventId: event.id,
    correlationId: `classroom:${session.id}:slide_changed:${updated.version}`,
    kind: "slide_changed",
    payload: { stepId: payload.stepId, slideIndex: payload.slideIndex, version: updated.version },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function refreshClassroomSnapshot(input: unknown) {
  const payload = RefreshClassroomSnapshotInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function endClassroomSession(input: unknown) {
  const payload = EndClassroomInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");

  const [updated] = await db.update(classroomSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
      updatedAt: new Date(),
      version: session.version + 1,
    })
    .where(eq(classroomSessions.id, session.id))
    .returning();

  const [event] = await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "ended",
    actorId: scope.userId,
    payloadJson: {},
  }).returning();

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: null,
    eventId: event.id,
    correlationId: `classroom:${session.id}:ended:${updated.version}`,
    kind: "ended",
    payload: { version: updated.version, status: "ended" },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function bootstrapRuntimeSession(input: BootstrapRuntimeSessionInput) {
  const result = await invokeRuntimeHostAction({
    action: "runtime-bootstrap",
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    payload: input.payload,
  });

  return result.bootstrap;
}

export async function recordRuntimeInteraction(input: RecordRuntimeInteractionInput) {
  const result = await invokeRuntimeHostAction({
    action: "runtime-interaction",
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    payload: input.payload,
  });

  return RuntimeHostActionResultDTOSchema.parse(result.envelope);
}

export async function recordRuntimeReady(input: RecordRuntimeReadyInput) {
  const result = await invokeRuntimeHostAction({
    action: "runtime-ready",
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    payload: input.payload,
  });

  return RuntimeHostActionResultDTOSchema.parse(result.envelope);
}

export async function saveRuntimeSessionState(input: SaveRuntimeStateInput) {
  const result = await invokeRuntimeHostAction({
    action: "runtime-save",
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    payload: input.payload,
  });

  return RuntimeSaveResultSchema.parse(RuntimeHostActionResultDTOSchema.parse(result.envelope).result);
}

export async function submitRuntimeSessionState(input: SubmitRuntimeStateInput) {
  const result = await invokeRuntimeHostAction({
    action: "runtime-submit",
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    payload: input.payload,
  });

  return RuntimeSubmitResultSchema.parse(RuntimeHostActionResultDTOSchema.parse(result.envelope).result);
}

export async function recordRuntimeTeacherControl(input: RecordRuntimeTeacherControlInput) {
  const result = await invokeRuntimeHostAction({
    action: "runtime-teacher-control",
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    payload: input.payload,
  });

  return RuntimeTeacherControlResultSchema.parse(RuntimeHostActionResultDTOSchema.parse(result.envelope).result);
}
