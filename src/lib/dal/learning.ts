import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classMembers,
  classes,
  courseClasses,
  courseEnrollments,
  courses,
  lessonStepProgress,
  lessons,
  publishedLessonVersions,
  quizAttempts,
  taskSubmissions,
  users,
} from "@/db/schema";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import {
  StudentDashboardDTOSchema,
  StudentPlayerDTOSchema,
  type LearningStepDTO,
  type ProgressState,
  type StudentLessonCardDTO,
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
      tasks: taskRows.filter((row) => row.isLatest).map((row) => ({
        id: row.id,
        publishedVersionId: row.publishedVersionId,
        lessonId: row.lessonId,
        stepId: row.stepId,
        studentId: row.studentId,
        attemptNo: row.attemptNo,
        payload: row.payloadJson,
        isLatest: row.isLatest,
        canRetryTask: true,
        feedback: null,
        createdAt: toIso(row.createdAt),
      })),
      quizzes: quizRows.filter((row) => row.isLatest).map((row) => ({
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
        showCorrectAnswer: false,
        feedback: null,
        createdAt: toIso(row.createdAt),
      })),
    },
    history: { tasks: [], quizzes: [] },
    inaccessibleMessage: INACCESSIBLE_LESSON_MESSAGE,
  });
}
