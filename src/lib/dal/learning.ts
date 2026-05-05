import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classMembers,
  classes,
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
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import {
  FeedbackInputSchema,
  MarkProgressInputSchema,
  MutationResultDTOSchema,
  StudentDashboardDTOSchema,
  StudentPlayerDTOSchema,
  SubmitQuizInputSchema,
  SubmitTaskInputSchema,
  TeacherLessonReviewDTOSchema,
  TeacherReviewFilterSchema,
  TeacherStudentReviewDTOSchema,
  type LearningStepDTO,
  type ProgressState,
  type StudentLessonCardDTO,
  type TeacherReviewFilter,
} from "@/lib/dto/learning";

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

function toTaskAttemptDTO(row: typeof taskSubmissions.$inferSelect, feedback: typeof attemptFeedback.$inferSelect | null = null) {
  return {
    id: row.id,
    publishedVersionId: row.publishedVersionId,
    lessonId: row.lessonId,
    stepId: row.stepId,
    studentId: row.studentId,
    attemptNo: row.attemptNo,
    payload: row.payloadJson,
    isLatest: row.isLatest,
    canRetryTask: true,
    feedback: feedback ? toFeedbackDTO(feedback, row.lessonId) : null,
    createdAt: toIso(row.createdAt),
  };
}

function toQuizAttemptDTO(row: typeof quizAttempts.$inferSelect, feedback: typeof attemptFeedback.$inferSelect | null = null) {
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
    canRetryQuiz: true,
    showCorrectAnswer: Boolean((row.outcomeJson as { showCorrectAnswer?: boolean }).showCorrectAnswer),
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

export async function getStudentPlayerDTO(input: { lessonId: string; forcedStepId?: string | null }) {
  const scope = await assertActiveStudent();
  const { lesson, published } = await assertStudentCanAccessLesson(input.lessonId, scope);
  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  const progress = summarizeProgress(steps, await getProgressRecords(published.id, scope.userId));
  // first incomplete is the default resume target; teacher-forced wins when supplied.
  const resumeStepId = input.forcedStepId ?? progress.firstIncompleteStepId;
  const taskRows = await db.query.taskSubmissions.findMany({
    where: and(eq(taskSubmissions.publishedVersionId, published.id), eq(taskSubmissions.studentId, scope.userId)),
    orderBy: desc(taskSubmissions.attemptNo),
  });
  const quizRows = await db.query.quizAttempts.findMany({
    where: and(eq(quizAttempts.publishedVersionId, published.id), eq(quizAttempts.studentId, scope.userId)),
    orderBy: desc(quizAttempts.attemptNo),
  });

  return StudentPlayerDTOSchema.parse({
    shell: {
      lessonId: lesson.id,
      publishedVersionId: published.id,
      title: snapshot.lesson?.title ?? lesson.title,
      objective: snapshot.lesson?.objective ?? lesson.objective,
      steps,
    },
    progress: {
      resumeStepId,
      resumeLabel: input.forcedStepId ? "老师指定" : "继续学习",
      steps: progress.steps,
    },
    runtime: {
      forcedStepId: input.forcedStepId ?? null,
      forcedLabel: "老师指定",
      locked: Boolean(input.forcedStepId),
      inaccessibleMessage: null,
    },
    canRetryTask: true,
    canRetryQuiz: true,
    showCorrectAnswer: false,
    latestSubmissions: {
      tasks: taskRows.filter((row) => row.isLatest).map((row) => toTaskAttemptDTO(row)),
      quizzes: quizRows.filter((row) => row.isLatest).map((row) => toQuizAttemptDTO(row)),
    },
    history: { tasks: taskRows.map((row) => toTaskAttemptDTO(row)), quizzes: quizRows.map((row) => toQuizAttemptDTO(row)) },
    inaccessibleMessage: INACCESSIBLE_LESSON_MESSAGE,
  });
}

export async function markStepProgress(input: unknown) {
  const scope = await assertActiveStudent();
  const payload = MarkProgressInputSchema.parse(input);
  await assertStudentCanAccessLesson(payload.lessonId, scope);
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
    await db.insert(lessonStepProgress).values({ ...payload, studentId: scope.userId, completedAt });
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
  await assertStudentCanAccessLesson(payload.lessonId, scope);

  const inserted = await db.transaction(async (tx) => {
    const previous = await tx.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.publishedVersionId, payload.publishedVersionId),
        eq(taskSubmissions.stepId, payload.stepId),
        eq(taskSubmissions.studentId, scope.userId)
      ),
      orderBy: desc(taskSubmissions.attemptNo),
    });
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
      .returning();

    return row;
  });

  // append-only latest marker preserves previous attempts while exposing current read model.
  return toTaskAttemptDTO(inserted);
}

export async function submitQuizAttempt(input: unknown) {
  const scope = await assertActiveStudent();
  const payload = SubmitQuizInputSchema.parse(input);
  const { published, lesson } = await assertStudentCanAccessLesson(payload.lessonId, scope);
  const snapshot = parseSnapshot(published.snapshotJson);
  const step = parseSnapshotSteps(snapshot, lesson.id).find((item) => item.id === payload.stepId);
  const stepPayload = step?.payload as { correctOptionIndex?: number; explanation?: string } | undefined;
  const answerIndex = typeof payload.answer === "number" ? payload.answer : (payload.answer as { selectedIndex?: number })?.selectedIndex;
  const isCorrect = typeof stepPayload?.correctOptionIndex === "number" ? answerIndex === stepPayload.correctOptionIndex : null;
  const outcomeJson = {
    selectedIndex: answerIndex ?? null,
    isCorrect,
    correctOptionIndex: stepPayload?.correctOptionIndex ?? null,
    explanation: stepPayload?.explanation ?? null,
    showCorrectAnswer: typeof stepPayload?.correctOptionIndex === "number",
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
      .returning();

    return row;
  });

  return toQuizAttemptDTO(inserted);
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

async function buildTeacherStudentReview(studentId: string, lessonId: string, publishedVersionId: string, totalSteps: number) {
  const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
  const progressRows = await getProgressRecords(publishedVersionId, studentId);
  const latestTasks = await db.query.taskSubmissions.findMany({
    where: and(eq(taskSubmissions.publishedVersionId, publishedVersionId), eq(taskSubmissions.studentId, studentId), eq(taskSubmissions.isLatest, true)),
  });
  const latestQuizzes = await db.query.quizAttempts.findMany({
    where: and(eq(quizAttempts.publishedVersionId, publishedVersionId), eq(quizAttempts.studentId, studentId), eq(quizAttempts.isLatest, true)),
  });
  const feedbackRows = await db.query.attemptFeedback.findMany({ where: eq(attemptFeedback.studentId, studentId) });
  const latestAttempts = [...latestTasks.map((row) => row.id), ...latestQuizzes.map((row) => row.id)];
  const needsFeedback = latestAttempts.some((id) => !feedbackRows.some((feedback) => feedback.targetId === id));
  const completed = progressRows.filter((row) => row.state === "completed" || row.state === "skipped").length;

  return TeacherStudentReviewDTOSchema.parse({
    studentId,
    studentName: student?.name ?? "学生",
    progress: progressRows.map((row) => ({
      stepId: row.stepId,
      state: row.state,
      completedAt: nullableIso(row.completedAt),
      updatedAt: toIso(row.updatedAt),
    })),
    latestTaskSubmissions: latestTasks.map((row) => toTaskAttemptDTO(row, feedbackRows.find((item) => item.targetId === row.id) ?? null)),
    latestQuizAttempts: latestQuizzes.map((row) => toQuizAttemptDTO(row, feedbackRows.find((item) => item.targetId === row.id) ?? null)),
    needsFeedback,
    _status: completed === 0 ? "not_started" : completed >= totalSteps ? "completed" : "in_progress",
  });
}

export async function getTeacherLessonReviewDTO(input: { lessonId: string; filter?: TeacherReviewFilter }) {
  const filter = TeacherReviewFilterSchema.parse(input.filter ?? "all");
  const { lesson, course, published } = await getScopedTeacherLesson(input.lessonId);
  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  const studentIds = await getLessonStudentIds(course.id);
  const allStudents = await Promise.all(
    studentIds.map(async (studentId) => buildTeacherStudentReview(studentId, lesson.id, published.id, steps.length))
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
  const { lesson, published } = await getScopedTeacherLesson(input.lessonId);
  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);

  return buildTeacherStudentReview(input.studentId, lesson.id, published.id, steps.length);
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
