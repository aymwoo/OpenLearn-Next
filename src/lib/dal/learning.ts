import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import {
  classMembers,
  classes,
  classroomEvents,
  classroomSessions,
  courseClasses,
  courseEnrollments,
  courses,
  attemptFeedback,
  lessonStepProgress,
  lessons,
  publishedLessonVersions,
  quizAttempts,
  taskSubmissions,
  users,
} from "@/db/schema";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { ensureClassroomParticipant } from "@/lib/dal/classroom";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { cacheTags } from "@/lib/cache-policy";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import {
  FeedbackInputSchema,
  MarkProgressInputSchema,
  MutationResultDTOSchema,
  StudentDashboardDTOSchema,
  StudentPlayerDTOSchema,
  StudentPlayerPersonalDTOSchema,
  StudentPlayerShellDTOSchema,
  SubmitQuizInputSchema,
  SubmitTaskInputSchema,
  TeacherLessonReviewDTOSchema,
  TeacherReviewFilterSchema,
  TeacherStudentReviewDTOSchema,
  type LearningStepDTO,
  type ProgressState,
  type StudentStepActivityDTO,
  type StudentLessonCardDTO,
  type StudentPlayerPersonalDTO,
  type StudentPlayerShellDTO,
  type TeacherReviewFilter,
} from "@/lib/dto/learning";
import { resolveTeachingDesignInput } from "@/lib/teaching-design";

const INACCESSIBLE_LESSON_MESSAGE = "课时暂不可学习";

type StudentScope = {
  userId: string;
  studentName: string;
  schoolIds: string[];
};

type PublishedSnapshot = {
  lesson?: {
    id?: string;
    title?: string;
    objective?: string;
    updatedAt?: string;
  };
  course?: {
    title?: string;
  };
  steps?: Array<{
    id: string;
    lessonId: string;
    type: "content" | "task" | "quiz";
    title: string;
    rank: string;
    payload: unknown;
  }>;
};

type LearningWriteInput = {
  publishedVersionId: string;
  lessonId: string;
  stepId: string;
};

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function nullableIso(value: Date | number | null | undefined) {
  return value ? toIso(value) : null;
}

function parseSnapshot(value: unknown): PublishedSnapshot {
  return (value ?? {}) as PublishedSnapshot;
}

function parseSnapshotSteps(snapshot: PublishedSnapshot, fallbackLessonId: string): LearningStepDTO[] {
  return [...(snapshot.steps ?? [])]
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map((step) => ({
      id: step.id,
      lessonId: step.lessonId ?? fallbackLessonId,
      type: step.type,
      title: step.title,
      rank: step.rank,
      payload: lessonStepPayloadSchema.parse(step.payload),
    }));
}

function getAttemptPolicy(step?: LearningStepDTO) {
  const payload = step?.payload as { allowRetry?: boolean; retryPolicy?: string; revealCorrectAnswer?: boolean } | undefined;
  return {
    allowRetry: payload?.allowRetry === true || payload?.retryPolicy === "once" || payload?.retryPolicy === "unlimited",
    revealCorrectAnswer: payload?.revealCorrectAnswer === true,
  };
}

const ACTIVITY_GUIDANCE_COPY = {
  explain: "先阅读并抓住重点",
  practice: "独立完成本次课堂练习",
  check: "完成本次课堂作答",
  discuss: "先参与讨论并整理观点",
  reflect: "先回顾再写下你的想法",
  apply: "结合所学完成应用任务",
} as const;

const ACTIVITY_MODE_LABELS = {
  "mini-lecture": "全班跟随",
  independent: "独立完成",
  assessment: "独立作答",
  discussion: "小组讨论",
  pair: "两人讨论",
  group: "小组协作",
  "whole-class": "全班跟随",
} as const;

function sanitizeStudentPrompt(prompt: string) {
  return prompt.replace(/teacher-only/gi, "").replace(/\s+/g, " ").trim();
}

function getExpectedOutputCopy(step: LearningStepDTO) {
  if (step.type === "content") {
    return "读完本步骤内容，并抓住老师强调的重点。";
  }

  if (step.type === "task") {
    const payload = step.payload as { submissionType?: "text" | "image" | "file" | "link" };
    const outputBySubmissionType = {
      text: "提交一段文字回答或结论。",
      image: "提交一张图片，说明你的任务结果。",
      file: "提交一个文件，作为本步骤的任务结果。",
      link: "提交一个链接，作为本步骤的任务结果。",
    } as const;

    return outputBySubmissionType[payload.submissionType ?? "text"];
  }

  return "完成题目作答并提交你的答案。";
}

function getEvidenceExpectationSummary(step: LearningStepDTO) {
  const payload = step.payload;
  const resolution = resolveTeachingDesignInput(step.type, payload.teachingDesign);
  const expectation = resolution.teachingDesign.evidenceExpectation;
  const safePrompt = sanitizeStudentPrompt(expectation.prompt);

  if (!expectation.required) {
    return "本步骤以课堂参与或老师观察为主，无需单独提交。";
  }

  if (expectation.studentVisibility === "student-visible" && safePrompt.length > 0) {
    return `本步骤需要提交结果：${safePrompt}`;
  }

  if (step.type === "task") {
    return "本步骤需要提交任务结果，提交后会记为一次新的课堂记录。";
  }

  if (step.type === "quiz") {
    return "本步骤需要提交作答结果，提交后会记为一次新的课堂记录。";
  }

  return "本步骤需要提交课堂回应，提交后会记为一次新的课堂记录。";
}

function getCompletionStateCopy(input: {
  step: LearningStepDTO;
  state: ProgressState;
  hasTaskAttempt: boolean;
  hasQuizAttempt: boolean;
}) {
  if (input.step.type === "content") {
    return input.state === "completed"
      ? "你已完成当前阅读，可按课堂节奏继续下一步。"
      : "阅读完成后点击“已完成阅读”，系统会记录你的进度。";
  }

  if (input.step.type === "task") {
    return input.hasTaskAttempt
      ? "最近一次任务结果已记录；如老师允许，可继续补充新的尝试。"
      : "完成任务后提交结果，系统会保留你这一次课堂记录。";
  }

  return input.hasQuizAttempt
    ? "最近一次作答结果已记录；如老师允许，可继续提交新的答案。"
    : "选好答案后立即提交，系统会记录本次课堂作答。";
}

function buildStudentStepActivities(input: {
  steps: LearningStepDTO[];
  progress: ReturnType<typeof summarizeProgress>;
  taskRows: Array<typeof taskSubmissions.$inferSelect>;
  quizRows: Array<typeof quizAttempts.$inferSelect>;
}): StudentStepActivityDTO[] {
  const progressByStep = new Map(input.progress.steps.map((step) => [step.stepId, step.state]));
  const latestTaskByStep = new Set(input.taskRows.filter((row) => row.isLatest).map((row) => row.stepId));
  const latestQuizByStep = new Set(input.quizRows.filter((row) => row.isLatest).map((row) => row.stepId));

  return input.steps.map((step) => {
    const payload = step.payload;
    const resolution = resolveTeachingDesignInput(step.type, payload.teachingDesign);

    return {
      stepId: step.id,
      activityGuidance: ACTIVITY_GUIDANCE_COPY[resolution.teachingDesign.activityIntent],
      expectedOutput: getExpectedOutputCopy(step),
      evidenceExpectationSummary: getEvidenceExpectationSummary(step),
      completionStateCopy: getCompletionStateCopy({
        step,
        state: progressByStep.get(step.id) ?? "not_started",
        hasTaskAttempt: latestTaskByStep.has(step.id),
        hasQuizAttempt: latestQuizByStep.has(step.id),
      }),
      activityModeLabel: ACTIVITY_MODE_LABELS[resolution.teachingDesign.activityMode],
      estimatedMinutesLabel: `预计 ${resolution.teachingDesign.estimatedMinutes} 分钟`,
    };
  });
}

function getStepById(steps: LearningStepDTO[], stepId: string, expectedType: LearningStepDTO["type"]) {
  const step = steps.find((item) => item.id === stepId);

  if (!step || step.type !== expectedType) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  return step;
}

async function assertStudentMutationTarget(input: LearningWriteInput, scope: StudentScope, expectedType: LearningStepDTO["type"]) {
  const { lesson, published } = await assertStudentCanAccessLesson(input.lessonId, scope);

  if (input.publishedVersionId !== published.id) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  const step = getStepById(steps, input.stepId, expectedType);

  return { lesson, published, snapshot, steps, step, policy: getAttemptPolicy(step) };
}

function toTaskAttemptDTO(row: typeof taskSubmissions.$inferSelect, feedback: typeof attemptFeedback.$inferSelect | null = null, policy = { allowRetry: false }) {
  return {
    id: row.id,
    publishedVersionId: row.publishedVersionId,
    lessonId: row.lessonId,
    stepId: row.stepId,
    studentId: row.studentId,
    attemptNo: row.attemptNo,
    payload: row.payloadJson,
    isLatest: row.isLatest,
    canRetryTask: policy.allowRetry,
    feedback: feedback ? toFeedbackDTO(feedback, row.lessonId) : null,
    createdAt: toIso(row.createdAt),
  };
}

function toQuizAttemptDTO(row: typeof quizAttempts.$inferSelect, feedback: typeof attemptFeedback.$inferSelect | null = null, policy = { allowRetry: false, revealCorrectAnswer: false }) {
  return {
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
    showCorrectAnswer: policy.revealCorrectAnswer && Boolean((row.outcomeJson as { showCorrectAnswer?: boolean }).showCorrectAnswer),
    feedback: feedback ? toFeedbackDTO(feedback, row.lessonId) : null,
    createdAt: toIso(row.createdAt),
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

function summarizeProgress(steps: LearningStepDTO[], records: Array<typeof lessonStepProgress.$inferSelect>) {
  const progressByStep = new Map(records.map((record) => [record.stepId, record]));
  const normalized = steps.map((step) => {
    const record = progressByStep.get(step.id);
    return {
      stepId: step.id,
      state: (record?.state ?? "not_started") as ProgressState,
      completedAt: nullableIso(record?.completedAt),
      updatedAt: record?.updatedAt ? toIso(record.updatedAt) : undefined,
    };
  });
  const completedSteps = normalized.filter((item) => item.state === "completed" || item.state === "skipped").length;
  const firstIncomplete = normalized.find((item) => item.state !== "completed" && item.state !== "skipped");
  const progressState: ProgressState =
    completedSteps === 0 ? "not_started" : completedSteps >= steps.length ? "completed" : "in_progress";

  return {
    completedSteps,
    firstIncompleteStepId: firstIncomplete?.stepId ?? steps[0]?.id ?? null,
    progressState,
    steps: normalized,
  };
}

async function assertActiveStudent(): Promise<StudentScope> {
  const user = await getCurrentUserDTO();

  if (!user) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((membership) => membership.role === "student" && membership.status === "active")
    .map((membership) => membership.schoolId);

  if (schoolIds.length === 0) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  return { userId: user.id, studentName: user.name ?? "同学", schoolIds };
}

async function getStudentCourseIds(scope: StudentScope) {
  const directEnrollments = await db.query.courseEnrollments.findMany({
    where: and(eq(courseEnrollments.studentId, scope.userId), eq(courseEnrollments.status, "active")),
  });
  const studentClassLinks = await db.query.classMembers.findMany({
    where: and(eq(classMembers.userId, scope.userId), eq(classMembers.role, "student")),
  });
  const classLinks = studentClassLinks.length
    ? await db.query.courseClasses.findMany({
        where: inArray(
          courseClasses.classId,
          studentClassLinks.map((member) => member.classId)
        ),
      })
    : [];

  return [...new Set([...directEnrollments.map((item) => item.courseId), ...classLinks.map((item) => item.courseId)])];
}

async function getClassLabel(courseId: string, scope: StudentScope) {
  const studentClassLinks = await db.query.classMembers.findMany({
    where: and(eq(classMembers.userId, scope.userId), eq(classMembers.role, "student")),
  });

  if (studentClassLinks.length === 0) {
    return null;
  }

  const linkedClasses = await db
    .select({ name: classes.name })
    .from(courseClasses)
    .innerJoin(classes, eq(courseClasses.classId, classes.id))
    .where(
      and(
        eq(courseClasses.courseId, courseId),
        inArray(
          courseClasses.classId,
          studentClassLinks.map((member) => member.classId)
        )
      )
    );

  return linkedClasses[0]?.name ?? null;
}

async function assertStudentCanAccessLesson(lessonId: string, scope: StudentScope) {
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) });

  if (!lesson?.publishedVersionId || lesson.status !== "published") {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) });
  const courseIds = await getStudentCourseIds(scope);

  if (!course || !scope.schoolIds.includes(course.schoolId) || !courseIds.includes(course.id)) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, lesson.publishedVersionId),
  });

  if (!published) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  return { lesson, course, published };
}

export async function assertActiveStudentForPlayer(): Promise<StudentScope> {
  return assertActiveStudent();
}

export async function assertStudentCanOpenPlayer(input: { lessonId: string }): Promise<StudentScope> {
  const scope = await assertActiveStudentForPlayer();
  await assertStudentCanAccessLesson(input.lessonId, scope);

  return scope;
}

async function getPublishedStudentPlayerShellDTO(input: { lessonId: string }): Promise<StudentPlayerShellDTO> {
  'use cache'
  cacheLife('hours')
  cacheTag(cacheTags.lesson(input.lessonId))
  cacheTag(cacheTags.steps(input.lessonId))

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, input.lessonId) });

  if (!lesson?.publishedVersionId || lesson.status !== "published") {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, lesson.publishedVersionId),
  });

  if (!published) {
    throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  }

  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);

  return StudentPlayerShellDTOSchema.parse({
    lessonId: lesson.id,
    publishedVersionId: published.id,
    title: snapshot.lesson?.title ?? lesson.title,
    objective: snapshot.lesson?.objective ?? lesson.objective,
    steps,
  });
}

async function getProgressRecords(publishedVersionId: string, studentId: string) {
  return db.query.lessonStepProgress.findMany({
    where: and(eq(lessonStepProgress.publishedVersionId, publishedVersionId), eq(lessonStepProgress.studentId, studentId)),
  });
}

export async function getStudentDashboardDTO() {
  const scope = await assertActiveStudent();
  const courseIds = await getStudentCourseIds(scope);

  if (courseIds.length === 0) {
    return StudentDashboardDTOSchema.parse({ studentName: scope.studentName, lessons: [], emptyState: {} });
  }

  const lessonRows = await db.query.lessons.findMany({
    where: and(inArray(lessons.courseId, courseIds), eq(lessons.status, "published")),
    orderBy: desc(lessons.updatedAt),
  });
  const publishedLessons = lessonRows.filter((lesson) => lesson.publishedVersionId);
  const cards: StudentLessonCardDTO[] = [];

  for (const lesson of publishedLessons) {
    const published = await db.query.publishedLessonVersions.findFirst({
      where: eq(publishedLessonVersions.id, lesson.publishedVersionId!),
    });

    if (!published) {
      continue;
    }

    const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) });
    const snapshot = parseSnapshot(published.snapshotJson);
    const steps = parseSnapshotSteps(snapshot, lesson.id);
    const progress = summarizeProgress(steps, await getProgressRecords(published.id, scope.userId));

    cards.push({
      lessonId: lesson.id,
      publishedVersionId: published.id,
      title: snapshot.lesson?.title ?? lesson.title,
      courseTitle: snapshot.course?.title ?? course?.title ?? "课程",
      classLabel: await getClassLabel(lesson.courseId, scope),
      progressState: progress.progressState,
      completedSteps: progress.completedSteps,
      totalSteps: steps.length,
      resumeStepId: progress.firstIncompleteStepId,
      resumeLabel: progress.firstIncompleteStepId ? "继续学习" : "开始学习",
      updatedAt: toIso(lesson.updatedAt),
    });
  }

  const order = { in_progress: 0, not_started: 1, completed: 2, skipped: 3 } satisfies Record<ProgressState, number>;
  cards.sort((a, b) => order[a.progressState] - order[b.progressState] || b.updatedAt.localeCompare(a.updatedAt));

  return StudentDashboardDTOSchema.parse({ studentName: scope.studentName, lessons: cards, emptyState: {} });
}

export async function getStudentPlayerShellDTO(input: { lessonId: string; scope: StudentScope }): Promise<StudentPlayerShellDTO> {
  await assertStudentCanAccessLesson(input.lessonId, input.scope);

  return getPublishedStudentPlayerShellDTO({ lessonId: input.lessonId });
}

export async function getStudentClassroomRuntime(input: { lessonId: string; scope: StudentScope }) {
  const activeSession = await db
    .select({
      sessionId: classroomSessions.id,
      version: classroomSessions.version,
      locked: classroomSessions.locked,
      activeStepId: classroomSessions.activeStepId,
    })
    .from(classroomSessions)
    .innerJoin(classMembers, eq(classMembers.classId, classroomSessions.classId))
    .where(
      and(
        eq(classroomSessions.lessonId, input.lessonId),
        eq(classroomSessions.status, "live"),
        eq(classMembers.userId, input.scope.userId),
        eq(classMembers.role, "student"),
      )
    )
    .limit(1);

  if (activeSession.length === 0) {
    return null;
  }

  const { sessionId, version, locked, activeStepId } = activeSession[0];
  await ensureClassroomParticipant({ sessionId, studentId: input.scope.userId });

  const eventRows = await db.query.classroomEvents.findMany({
    where: eq(classroomEvents.sessionId, sessionId),
    orderBy: (event, { desc }) => [desc(event.version)],
  });
  const slideEvent = eventRows.find((event) => event.type === "slide_changed");
  const slidePayload = slideEvent?.payloadJson as { stepId?: string; slideIndex?: number } | undefined;

  return {
    sessionId,
    version,
    locked: Boolean(locked),
    activeStepId,
    slideIndex: slidePayload?.stepId === activeStepId && typeof slidePayload.slideIndex === "number" ? slidePayload.slideIndex : 0,
  };
}

export async function getStudentPlayerPersonalDTO(input: { lessonId: string; selectedStepId?: string | null; forcedStepId?: string | null; scope?: StudentScope }): Promise<StudentPlayerPersonalDTO> {
  const scope = input.scope ?? await assertActiveStudent();
  const { lesson, published } = await assertStudentCanAccessLesson(input.lessonId, scope);
  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const progressRows = await db.query.lessonStepProgress.findMany({
    where: and(eq(lessonStepProgress.publishedVersionId, published.id), eq(lessonStepProgress.studentId, scope.userId)),
  });
  const progress = summarizeProgress(steps, progressRows);
  const selectedStepId = steps.some((step) => step.id === input.selectedStepId) ? input.selectedStepId : null;

  const classroomRuntime = await getStudentClassroomRuntime({ lessonId: input.lessonId, scope });
  
  let forcedStepId = input.forcedStepId ?? null;
  let teacherRecommendedStepId = null;
  let locked = Boolean(input.forcedStepId);
  let classroomSessionId = null;
  let classroomVersion = null;
  let slideIndex: number | null = null;

  if (classroomRuntime) {
    classroomSessionId = classroomRuntime.sessionId;
    classroomVersion = classroomRuntime.version;
    slideIndex = classroomRuntime.slideIndex;
    if (classroomRuntime.locked) {
      forcedStepId = classroomRuntime.activeStepId;
      locked = true;
    } else {
      teacherRecommendedStepId = classroomRuntime.activeStepId;
      locked = false;
    }
  }

  // first incomplete is the default resume target; trusted teacher-forced runtime wins when supplied.
  const resumeStepId = forcedStepId ?? selectedStepId ?? progress.firstIncompleteStepId;
  const taskRows = await db.query.taskSubmissions.findMany({
    where: and(eq(taskSubmissions.publishedVersionId, published.id), eq(taskSubmissions.studentId, scope.userId)),
    orderBy: desc(taskSubmissions.attemptNo),
  });
  const quizRows = await db.query.quizAttempts.findMany({
    where: and(eq(quizAttempts.publishedVersionId, published.id), eq(quizAttempts.studentId, scope.userId)),
    orderBy: desc(quizAttempts.attemptNo),
  });
  const stepActivities = buildStudentStepActivities({
    steps,
    progress,
    taskRows,
    quizRows,
  });

  return StudentPlayerPersonalDTOSchema.parse({
    progress: {
      resumeStepId,
      resumeLabel: forcedStepId ? "老师指定" : "继续学习",
      steps: progress.steps,
    },
    stepActivities,
    runtime: {
      forcedStepId: forcedStepId,
      forcedLabel: "老师指定",
      locked: locked,
      inaccessibleMessage: null,
      classroomSessionId,
      classroomVersion,
      connectionState: classroomSessionId ? "reconnecting" : "offline", // Initial load is reconnecting
      teacherRecommendedStepId,
      slideIndex,
      disabledStepIds: locked ? steps.map(s => s.id).filter(id => id !== forcedStepId) : [],
      disabledReason: locked ? "老师已开启锁定跟随，你将停留在当前步骤。" : null,
      snapshotStatusCopy: (classroomSessionId && locked && forcedStepId !== progress.firstIncompleteStepId) ? "已恢复课堂状态，你现在看到的是最新步骤。" : null,
      manualRefreshAvailable: false,
    },
    canRetryTask: false,
    canRetryQuiz: false,
    showCorrectAnswer: false,
    latestSubmissions: {
      tasks: taskRows.filter((row) => row.isLatest).map((row) => toTaskAttemptDTO(row, null, getAttemptPolicy(stepById.get(row.stepId)))),
      quizzes: quizRows.filter((row) => row.isLatest).map((row) => toQuizAttemptDTO(row, null, getAttemptPolicy(stepById.get(row.stepId)))),
    },
    history: {
      tasks: taskRows.map((row) => toTaskAttemptDTO(row, null, getAttemptPolicy(stepById.get(row.stepId)))),
      quizzes: quizRows.map((row) => toQuizAttemptDTO(row, null, getAttemptPolicy(stepById.get(row.stepId)))),
    },
    inaccessibleMessage: INACCESSIBLE_LESSON_MESSAGE,
  });
}

export async function getStudentPlayerDTO(input: { lessonId: string; selectedStepId?: string | null; forcedStepId?: string | null }) {
  const scope = await assertStudentCanOpenPlayer({ lessonId: input.lessonId });
  const shell = await getStudentPlayerShellDTO({ lessonId: input.lessonId, scope });
  const personal = await getStudentPlayerPersonalDTO({ ...input, scope });

  return StudentPlayerDTOSchema.parse({ shell, ...personal });
}

export async function markStepProgress(input: unknown) {
  const scope = await assertActiveStudent();
  const payload = MarkProgressInputSchema.parse(input);
  await assertStudentMutationTarget(payload, scope, "content");
  const completedAt = payload.state === "completed" ? new Date() : null;
  const existing = await db.query.lessonStepProgress.findFirst({
    where: and(
      eq(lessonStepProgress.publishedVersionId, payload.publishedVersionId),
      eq(lessonStepProgress.stepId, payload.stepId),
      eq(lessonStepProgress.studentId, scope.userId)
    ),
  });

  if (existing) {
    await db
      .update(lessonStepProgress)
      .set({ state: payload.state, completedAt, updatedAt: new Date() })
      .where(eq(lessonStepProgress.id, existing.id));
  } else {
    await db
      .insert(lessonStepProgress)
      .values({ ...payload, studentId: scope.userId, completedAt })
      .onConflictDoUpdate({
        target: [lessonStepProgress.publishedVersionId, lessonStepProgress.stepId, lessonStepProgress.studentId],
        set: { state: payload.state, completedAt, updatedAt: new Date() },
      });
  }

  return MutationResultDTOSchema.parse({
    ok: true,
    lessonId: payload.lessonId,
    studentId: scope.userId,
    successMessage: "学习进度已更新",
  });
}

export async function submitTaskAttempt(input: unknown) {
  const scope = await assertActiveStudent();
  const payload = SubmitTaskInputSchema.parse(input);
  const { policy } = await assertStudentMutationTarget(payload, scope, "task");

  const inserted = await db.transaction(async (tx) => {
    const previous = await tx.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.publishedVersionId, payload.publishedVersionId),
        eq(taskSubmissions.stepId, payload.stepId),
        eq(taskSubmissions.studentId, scope.userId)
      ),
      orderBy: desc(taskSubmissions.attemptNo),
    });
    if (previous.length > 0 && !policy.allowRetry) {
      throw new Error("RETRY_NOT_ALLOWED");
    }
    const attemptNo = (previous[0]?.attemptNo ?? 0) + 1;

    await tx
      .update(taskSubmissions)
      .set({ isLatest: false }) // isLatest: 0
      .where(
        and(
          eq(taskSubmissions.publishedVersionId, payload.publishedVersionId),
          eq(taskSubmissions.stepId, payload.stepId),
          eq(taskSubmissions.studentId, scope.userId)
        )
      );

    const [row] = await tx
      .insert(taskSubmissions)
      .values({
        publishedVersionId: payload.publishedVersionId,
        lessonId: payload.lessonId,
        stepId: payload.stepId,
        studentId: scope.userId,
        attemptNo,
        payloadJson: payload.payload,
        isLatest: true, // isLatest: 1
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      throw new Error("DUPLICATE_ATTEMPT");
    }

    return row;
  });

  // append-only latest marker preserves previous attempts while exposing current read model.
  return toTaskAttemptDTO(inserted, null, policy);
}

export async function submitQuizAttempt(input: unknown) {
  const scope = await assertActiveStudent();
  const payload = SubmitQuizInputSchema.parse(input);
  const { policy, step } = await assertStudentMutationTarget(payload, scope, "quiz");
  const stepPayload = step.payload as { correctOptionIndex?: number; explanation?: string } | undefined;
  const answerIndex = typeof payload.answer === "number" ? payload.answer : (payload.answer as { selectedIndex?: number })?.selectedIndex;
  const isCorrect = typeof stepPayload?.correctOptionIndex === "number" ? answerIndex === stepPayload.correctOptionIndex : null;
  const outcomeJson = {
    selectedIndex: answerIndex ?? null,
    isCorrect,
    correctOptionIndex: policy.revealCorrectAnswer ? (stepPayload?.correctOptionIndex ?? null) : null,
    explanation: policy.revealCorrectAnswer ? (stepPayload?.explanation ?? null) : null,
    showCorrectAnswer: policy.revealCorrectAnswer && typeof stepPayload?.correctOptionIndex === "number",
  };

  const inserted = await db.transaction(async (tx) => {
    const previous = await tx.query.quizAttempts.findMany({
      where: and(
        eq(quizAttempts.publishedVersionId, payload.publishedVersionId),
        eq(quizAttempts.stepId, payload.stepId),
        eq(quizAttempts.studentId, scope.userId)
      ),
      orderBy: desc(quizAttempts.attemptNo),
    });
    if (previous.length > 0 && !policy.allowRetry) {
      throw new Error("RETRY_NOT_ALLOWED");
    }
    const attemptNo = (previous[0]?.attemptNo ?? 0) + 1;

    await tx
      .update(quizAttempts)
      .set({ isLatest: false }) // isLatest: 0
      .where(
        and(
          eq(quizAttempts.publishedVersionId, payload.publishedVersionId),
          eq(quizAttempts.stepId, payload.stepId),
          eq(quizAttempts.studentId, scope.userId)
        )
      );

    const [row] = await tx
      .insert(quizAttempts)
      .values({
        publishedVersionId: payload.publishedVersionId,
        lessonId: payload.lessonId,
        stepId: payload.stepId,
        studentId: scope.userId,
        attemptNo,
        answerJson: payload.answer,
        outcomeJson,
        isLatest: true, // isLatest: 1
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      throw new Error("DUPLICATE_ATTEMPT");
    }

    return row;
  });

  return toQuizAttemptDTO(inserted, null, policy);
}

async function getScopedTeacherLesson(lessonId: string) {
  const scope = await assertActiveTeacher();
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) });

  if (!lesson?.publishedVersionId) {
    throw new Error("LESSON_NOT_FOUND");
  }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) });

  if (!course || !scope.schoolIds.includes(course.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, lesson.publishedVersionId),
  });

  if (!published) {
    throw new Error("LESSON_NOT_FOUND");
  }

  return { scope, lesson, course, published };
}

async function getLessonStudentIds(courseId: string) {
  const directEnrollments = await db.query.courseEnrollments.findMany({
    where: and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.status, "active")),
  });
  const classLinks = await db.query.courseClasses.findMany({ where: eq(courseClasses.courseId, courseId) });
  const members = classLinks.length
    ? await db.query.classMembers.findMany({
        where: and(
          inArray(
            classMembers.classId,
            classLinks.map((link) => link.classId)
          ),
          eq(classMembers.role, "student")
        ),
      })
    : [];

  return [...new Set([...directEnrollments.map((item) => item.studentId), ...members.map((item) => item.userId)])];
}

async function buildTeacherStudentReview(studentId: string, lessonId: string, publishedVersionId: string, steps: LearningStepDTO[]) {
  const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
  const progressRows = await getProgressRecords(publishedVersionId, studentId);
  const progress = summarizeProgress(steps, progressRows).steps;
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const taskHistory = await db.query.taskSubmissions.findMany({
    where: and(eq(taskSubmissions.publishedVersionId, publishedVersionId), eq(taskSubmissions.studentId, studentId)),
  });
  const quizHistory = await db.query.quizAttempts.findMany({
    where: and(eq(quizAttempts.publishedVersionId, publishedVersionId), eq(quizAttempts.studentId, studentId)),
  });
  const latestTasks = await db.query.taskSubmissions.findMany({
    where: and(eq(taskSubmissions.publishedVersionId, publishedVersionId), eq(taskSubmissions.studentId, studentId), eq(taskSubmissions.isLatest, true)),
  });
  const latestQuizzes = await db.query.quizAttempts.findMany({
    where: and(eq(quizAttempts.publishedVersionId, publishedVersionId), eq(quizAttempts.studentId, studentId), eq(quizAttempts.isLatest, true)),
  });
  const feedbackRows = await db.query.attemptFeedback.findMany({ where: eq(attemptFeedback.studentId, studentId) });
  const latestAttempts = [...latestTasks.map((row) => row.id), ...latestQuizzes.map((row) => row.id)];
  const needsFeedback = latestAttempts.some((id) => !feedbackRows.some((feedback) => feedback.targetId === id));
  const completed = progress.filter((row) => row.state === "completed" || row.state === "skipped").length;

  return TeacherStudentReviewDTOSchema.parse({
    studentId,
    studentName: student?.name ?? "学生",
    progress,
    latestTaskSubmissions: latestTasks.map((row) => toTaskAttemptDTO(row, feedbackRows.find((item) => item.targetId === row.id) ?? null, getAttemptPolicy(stepById.get(row.stepId)))),
    latestQuizAttempts: latestQuizzes.map((row) => toQuizAttemptDTO(row, feedbackRows.find((item) => item.targetId === row.id) ?? null, getAttemptPolicy(stepById.get(row.stepId)))),
    taskSubmissionHistory: taskHistory
      .sort((a, b) => a.attemptNo - b.attemptNo)
      .map((row) => toTaskAttemptDTO(row, feedbackRows.find((item) => item.targetId === row.id) ?? null, getAttemptPolicy(stepById.get(row.stepId)))),
    quizAttemptHistory: quizHistory
      .sort((a, b) => a.attemptNo - b.attemptNo)
      .map((row) => toQuizAttemptDTO(row, feedbackRows.find((item) => item.targetId === row.id) ?? null, getAttemptPolicy(stepById.get(row.stepId)))),
    needsFeedback,
    _status: completed === 0 ? "not_started" : completed >= steps.length ? "completed" : "in_progress",
  });
}

export async function getTeacherLessonReviewDTO(input: { lessonId: string; filter?: TeacherReviewFilter }) {
  const filter = TeacherReviewFilterSchema.parse(input.filter ?? "all");
  const { lesson, course, published } = await getScopedTeacherLesson(input.lessonId);
  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  const studentIds = await getLessonStudentIds(course.id);
  const allStudents = await Promise.all(
    studentIds.map(async (studentId) => buildTeacherStudentReview(studentId, lesson.id, published.id, steps))
  );
  const withStatus = allStudents.map((student) => {
    const completed = student.progress.filter((row) => row.state === "completed" || row.state === "skipped").length;
    const status = completed === 0 ? "not_started" : completed >= steps.length ? "completed" : "in_progress";
    return { student, status };
  });
  const students = withStatus
    .filter((item) => filter === "all" || item.status === filter || (filter === "needs_feedback" && item.student.needsFeedback))
    .map((item) => item.student);

  return TeacherLessonReviewDTOSchema.parse({
    lessonId: lesson.id,
    publishedVersionId: published.id,
    title: snapshot.lesson?.title ?? lesson.title,
    filter,
    overview: {
      notStartedCount: withStatus.filter((item) => item.status === "not_started").length,
      inProgressCount: withStatus.filter((item) => item.status === "in_progress").length,
      completedCount: withStatus.filter((item) => item.status === "completed").length,
      needsFeedbackCount: withStatus.filter((item) => item.student.needsFeedback).length,
    },
    students,
  });
}

export async function getTeacherStudentReviewDTO(input: { lessonId: string; studentId: string }) {
  const { lesson, course, published } = await getScopedTeacherLesson(input.lessonId);
  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  const studentIds = await getLessonStudentIds(course.id);

  if (!studentIds.includes(input.studentId)) {
    throw new Error("STUDENT_NOT_IN_LESSON_ROSTER");
  }

  return buildTeacherStudentReview(input.studentId, lesson.id, published.id, steps);
}

export async function saveAttemptFeedback(input: unknown) {
  const scope = await assertActiveTeacher();
  const payload = FeedbackInputSchema.parse(input);

  if (payload.body.length > 200) {
    throw new Error("FEEDBACK_TOO_LONG");
  }

  const target = payload.targetType === "task_submission"
    ? await db.query.taskSubmissions.findFirst({ where: eq(taskSubmissions.id, payload.targetId) })
    : await db.query.quizAttempts.findFirst({ where: eq(quizAttempts.id, payload.targetId) });

  if (!target) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  await getScopedTeacherLesson(target.lessonId);

  const existing = await db.query.attemptFeedback.findFirst({
    where: and(eq(attemptFeedback.targetType, payload.targetType), eq(attemptFeedback.targetId, payload.targetId)),
  });

  if (existing) {
    const [updated] = await db
      .update(attemptFeedback)
      .set({ body: payload.body, updatedAt: new Date() })
      .where(eq(attemptFeedback.id, existing.id))
      .returning();

    return toFeedbackDTO(updated, target.lessonId);
  }

  const [created] = await db
    .insert(attemptFeedback)
    .values({ ...payload, teacherId: scope.userId, studentId: target.studentId })
    .returning();

  return toFeedbackDTO(created, target.lessonId);
}
