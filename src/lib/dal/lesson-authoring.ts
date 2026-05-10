import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  classMembers,
  classes,
  courseClasses,
  courseEnrollments,
  courses,
  lessonMaterials,
  lessons,
  lessonSteps,
  pluginRegistrations,
  publishedLessonVersions,
} from "@/db/schema";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  AutosaveResultDTOSchema,
  BuiltInTeachingStepKeySchema,
  CourseDTOSchema,
  LessonEditorDTOSchema,
  LessonPublishReadinessDTOSchema,
  LessonSummaryDTOSchema,
  PublishResultDTOSchema,
  TeacherLessonPreviewDTOSchema,
  TeacherAuthoringOverviewDTOSchema,
  lessonStepPayloadSchema,
  type AutosaveResultDTO,
  type LessonPublishIssueDTO,
  type LessonStepPayload,
  type PublishResultDTO,
} from "@/lib/dto/lesson-authoring";
import { createInitialRank, createRankAfter, createRankBetween } from "@/lib/ranking/lexorank";

type TeacherScope = {
  userId: string;
  schoolIds: string[];
};

type CreateCourseInput = {
  schoolId: string;
  title: string;
  subject: string;
  grade: string;
};

type LessonDraftInput = {
  courseId: string;
  title: string;
  objective: string;
  expectedRevision?: number;
};

type AddLessonStepInput = {
  lessonId: string;
  type: "content" | "task" | "quiz";
  title: string;
  payload: LessonStepPayload;
  afterRank?: string;
};

type UpdateLessonStepInput = {
  stepId: string;
  title: string;
  payload: LessonStepPayload;
};

type ReorderLessonStepInput = {
  stepId: string;
  beforeRank?: string | null;
  afterRank?: string | null;
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

function assertSchoolAccess(scope: TeacherScope, schoolId: string) {
  if (!scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

function ensureCourseOwnership(scope: TeacherScope, course: typeof courses.$inferSelect) {
  assertSchoolAccess(scope, course.schoolId);

  if (course.ownerId !== scope.userId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

export async function assertActiveTeacher(): Promise<TeacherScope> {
  const user = await getCurrentUserDTO();

  if (!user) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((membership) => membership.role === "teacher" && membership.status === "active")
    .map((membership) => membership.schoolId);

  if (schoolIds.length === 0) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return { userId: user.id, schoolIds };
}

async function getScopedCourse(courseId: string, scope: TeacherScope) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  ensureCourseOwnership(scope, course);
  return course;
}

async function getScopedLesson(lessonId: string, scope: TeacherScope) {
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) });

  if (!lesson) {
    throw new Error("LESSON_NOT_FOUND");
  }

  const course = await getScopedCourse(lesson.courseId, scope);
  return { lesson, course };
}

async function getScopedStep(stepId: string, scope: TeacherScope) {
  const step = await db.query.lessonSteps.findFirst({ where: eq(lessonSteps.id, stepId) });

  if (!step) {
    throw new Error("STEP_NOT_FOUND");
  }

  const scoped = await getScopedLesson(step.lessonId, scope);
  return { step, ...scoped };
}

async function getCourseDTO(course: typeof courses.$inferSelect) {
  const relatedLessons = await db.query.lessons.findMany({ where: eq(lessons.courseId, course.id) });
  const relatedEnrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.courseId, course.id),
  });
  const links = await db
    .select({ className: classes.name })
    .from(courseClasses)
    .innerJoin(classes, eq(courseClasses.classId, classes.id))
    .where(eq(courseClasses.courseId, course.id));

  return CourseDTOSchema.parse({
    ...course,
    lessonCount: relatedLessons.length,
    classLabels: links.map((link) => link.className),
    enrollmentCount: relatedEnrollments.length,
    updatedAt: toIso(course.updatedAt),
  });
}

async function getLessonSummaryDTO(lesson: typeof lessons.$inferSelect) {
  const steps = await db.query.lessonSteps.findMany({
    where: and(eq(lessonSteps.lessonId, lesson.id), isNull(lessonSteps.archivedAt)),
  });

  return LessonSummaryDTOSchema.parse({
    ...lesson,
    stepCount: steps.length,
    publishedVersionId: lesson.publishedVersionId,
    updatedAt: toIso(lesson.updatedAt),
  });
}

async function getCourseClassDtos(courseId: string, scope: TeacherScope) {
  const linkedClassRows = await db.query.courseClasses.findMany({ where: eq(courseClasses.courseId, courseId) });

  if (linkedClassRows.length === 0) {
    return [];
  }

  const linkedClassIds = linkedClassRows.map((link) => link.classId);
  const classRows = await db.query.classes.findMany({ where: inArray(classes.id, linkedClassIds) });
  const scopedClassRows = classRows.filter((classRow) => scope.schoolIds.includes(classRow.schoolId));

  return Promise.all(
    scopedClassRows.map(async (classRow) => {
      const members = await db.query.classMembers.findMany({ where: eq(classMembers.classId, classRow.id) });

      return {
        id: classRow.id,
        schoolId: classRow.schoolId,
        name: classRow.name,
        studentCount: members.filter((member) => member.role === "student").length,
      };
    })
  );
}

function buildIssue(input: LessonPublishIssueDTO): LessonPublishIssueDTO {
  return input;
}

function getBuiltInPluginAvailabilityMap(
  plugins: Array<{
    id: string;
    enabled: boolean;
    killSwitchEnabled: boolean;
    manifestJson?: { builtIn?: boolean } | null;
  }>,
) {
  return new Map(
    plugins.map((plugin) => [plugin.id, Boolean(plugin.enabled && !plugin.killSwitchEnabled && plugin.manifestJson?.builtIn)]),
  );
}

async function getBuiltInPluginRegistryForLesson(scope: TeacherScope, schoolId: string) {
  assertSchoolAccess(scope, schoolId);

  const plugins = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, schoolId),
    columns: { id: true, enabled: true, killSwitchEnabled: true, manifestJson: true },
  });

  return getBuiltInPluginAvailabilityMap(plugins as Parameters<typeof getBuiltInPluginAvailabilityMap>[0]);
}

function parseStepPayloadWithIssues(
  step: Pick<typeof lessonSteps.$inferSelect, "id" | "payloadJson">,
):
  | { ok: true; payload: LessonStepPayload }
  | { ok: false; issue: LessonPublishIssueDTO } {
  const parsed = lessonStepPayloadSchema.safeParse(step.payloadJson);

  if (!parsed.success) {
    return {
      ok: false,
      issue: buildIssue({
        code: "STEP_PAYLOAD_INVALID",
        message: "步骤内容结构无效，请重新编辑后再发布。",
        stepId: step.id,
      }),
    };
  }

  return { ok: true, payload: parsed.data };
}

export async function getLessonPublishReadinessDTO(input: { lessonId: string }) {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const pluginAvailability = await getBuiltInPluginRegistryForLesson(scope, course.schoolId);
  const blockingIssues: LessonPublishIssueDTO[] = [];
  let activeValidStepCount = 0;

  if (!lesson.title.trim()) {
    blockingIssues.push(buildIssue({ code: "LESSON_TITLE_REQUIRED", message: "发布前需要补充课时标题。" }));
  }

  if (!lesson.objective.trim()) {
    blockingIssues.push(buildIssue({ code: "LESSON_OBJECTIVE_REQUIRED", message: "发布前需要补充教学目标。" }));
  }

  for (const step of stepRows) {
    if (step.archivedAt) {
      continue;
    }

    const parsedStep = parseStepPayloadWithIssues(step);
    if (!parsedStep.ok) {
      blockingIssues.push(parsedStep.issue);
      continue;
    }

    activeValidStepCount += 1;
    const builtInSource = parsedStep.payload.builtInSource;
    if (!builtInSource) {
      continue;
    }

    BuiltInTeachingStepKeySchema.parse(builtInSource.builtInKey);

    if (!pluginAvailability.get(builtInSource.pluginId)) {
      blockingIssues.push(
        buildIssue({
          code: "BUILT_IN_PLUGIN_UNAVAILABLE",
          message: `内置教学环节插件“${builtInSource.pluginName}”当前不可用，请替换或重新启用后再发布。`,
          stepId: step.id,
          pluginId: builtInSource.pluginId,
          builtInKey: builtInSource.builtInKey,
          pluginName: builtInSource.pluginName,
        }),
      );
    }
  }

  if (activeValidStepCount === 0) {
    blockingIssues.push(buildIssue({ code: "NO_ACTIVE_STEPS", message: "发布前至少需要一个可用的未归档步骤。" }));
  }

  return LessonPublishReadinessDTOSchema.parse({
    lessonId: lesson.id,
    courseId: course.id,
    canPublish: blockingIssues.length === 0,
    blockingIssues,
  });
}

export async function getTeacherLessonPreviewDTO(input: { lessonId: string }) {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);
  const courseDto = await getCourseDTO(course);
  const lessonDto = await getLessonSummaryDTO(lesson);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const materialRows = await db.query.lessonMaterials.findMany({ where: eq(lessonMaterials.lessonId, lesson.id) });

  const steps = stepRows.flatMap((step) => {
    if (step.archivedAt) {
      return [];
    }

    const parsed = lessonStepPayloadSchema.safeParse(step.payloadJson);
    if (!parsed.success) {
      return [];
    }

    return [
      {
        id: step.id,
        lessonId: step.lessonId,
        type: step.type,
        title: step.title,
        rank: step.rank,
        payload: parsed.data,
        updatedAt: toIso(step.updatedAt),
        builtInSourceLabel: parsed.data.builtInSource?.pluginName ?? null,
      },
    ];
  });

  return TeacherLessonPreviewDTOSchema.parse({
    course: courseDto,
    lesson: lessonDto,
    steps,
    materials: materialRows.map((material) => ({
      id: material.id,
      lessonId: material.lessonId,
      stepId: material.stepId,
      title: material.title,
      kind: material.kind,
      url: material.url,
      note: material.note,
    })),
  });
}

export async function getTeacherAuthoringOverview() {
  const scope = await assertActiveTeacher();
  const courseRows = await db.query.courses.findMany({ where: inArray(courses.schoolId, scope.schoolIds) });
  const scopedCourseRows = courseRows.filter((course) => course.ownerId === scope.userId);
  const classRows = await db.query.classes.findMany({ where: inArray(classes.schoolId, scope.schoolIds) });
  const lessonRows = scopedCourseRows.length
    ? await db.query.lessons.findMany({ where: inArray(lessons.courseId, scopedCourseRows.map((course) => course.id)) })
    : [];

  const classDtos = await Promise.all(
    classRows.map(async (classRow) => {
      const members = await db.query.classMembers.findMany({ where: eq(classMembers.classId, classRow.id) });

      return {
        id: classRow.id,
        schoolId: classRow.schoolId,
        name: classRow.name,
        studentCount: members.filter((member) => member.role === "student").length,
      };
    })
  );

  return TeacherAuthoringOverviewDTOSchema.parse({
    courses: await Promise.all(scopedCourseRows.map(getCourseDTO)),
    classes: classDtos,
    lessons: await Promise.all(lessonRows.map(getLessonSummaryDTO)),
  });
}

export async function getLessonEditorDTO(lessonId: string) {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(lessonId, scope);
  const courseDto = await getCourseDTO(course);
  const classDtos = await getCourseClassDtos(course.id, scope);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const materialRows = await db.query.lessonMaterials.findMany({ where: eq(lessonMaterials.lessonId, lesson.id) });
  const latestVersion = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.lessonId, lesson.id),
    orderBy: desc(publishedLessonVersions.version),
  });

  const readiness = await getLessonPublishReadinessDTO({ lessonId });

  return LessonEditorDTOSchema.parse({
    course: courseDto,
    classes: classDtos,
    lesson: await getLessonSummaryDTO(lesson),
    steps: stepRows.map((step) => ({
      id: step.id,
      lessonId: step.lessonId,
      type: step.type,
      title: step.title,
      rank: step.rank,
      payload: lessonStepPayloadSchema.parse(step.payloadJson),
      archivedAt: nullableIso(step.archivedAt),
      updatedAt: toIso(step.updatedAt),
    })),
    materials: materialRows.map((material) => ({
      id: material.id,
      lessonId: material.lessonId,
      stepId: material.stepId,
      title: material.title,
      kind: material.kind,
      url: material.url,
      note: material.note,
    })),
    publishState: {
      isDraftHidden: lesson.status !== "published",
      latestVersion: latestVersion?.version ?? null,
      publishedAt: nullableIso(latestVersion?.publishedAt),
      canPublish: readiness.canPublish,
      blockingIssues: readiness.blockingIssues,
      warnings: [],
    },
  });
}

export async function createCourseForTeacher(input: CreateCourseInput) {
  const scope = await assertActiveTeacher();
  assertSchoolAccess(scope, input.schoolId);

  const [course] = await db
    .insert(courses)
    .values({ ...input, ownerId: scope.userId, status: "draft" })
    .returning();

  return getCourseDTO(course);
}

export async function createLessonDraft(input: LessonDraftInput) {
  const scope = await assertActiveTeacher();
  await getScopedCourse(input.courseId, scope);

  const [lesson] = await db
    .insert(lessons)
    .values({
      courseId: input.courseId,
      createdById: scope.userId,
      title: input.title,
      objective: input.objective,
      status: "draft",
      revision: 1,
    })
    .returning();

  return getLessonSummaryDTO(lesson);
}

export async function updateLessonDraft(input: LessonDraftInput & { lessonId: string }): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(input.lessonId, scope);

  if (input.expectedRevision && input.expectedRevision !== lesson.revision) {
    throw new Error("CONFLICT");
  }

  const [updated] = await db
    .update(lessons)
    .set({
      title: input.title,
      objective: input.objective,
      revision: lesson.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, input.lessonId))
    .returning();

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: updated.id,
    courseId: updated.courseId,
    revision: updated.revision,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function duplicateLesson(lessonId: string) {
  await assertActiveTeacher();
  const editor = await getLessonEditorDTO(lessonId);
  const draft = await createLessonDraft({
    courseId: editor.lesson.courseId,
    title: `${editor.lesson.title} 副本`,
    objective: editor.lesson.objective,
  });

  for (const step of editor.steps.filter((item) => !item.archivedAt)) {
    await addLessonStep({ lessonId: draft.id, type: step.type, title: step.title, payload: step.payload });
  }

  await assertActiveTeacher();
  return draft;
}

export async function archiveLesson(lessonId: string): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(lessonId, scope);
  const [updated] = await db
    .update(lessons)
    .set({ status: "archived", revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId))
    .returning();

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId,
    courseId: lesson.courseId,
    revision: updated.revision,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function addLessonStep(input: AddLessonStepInput): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(input.lessonId, scope);
  const payload = lessonStepPayloadSchema.parse(input.payload);
  const lastStep = await db.query.lessonSteps.findFirst({
    where: eq(lessonSteps.lessonId, input.lessonId),
    orderBy: desc(lessonSteps.rank),
  });
  const rank = input.afterRank ? createRankAfter(input.afterRank) : lastStep ? createRankAfter(lastStep.rank) : createInitialRank();
  const [step] = await db
    .insert(lessonSteps)
    .values({ lessonId: input.lessonId, type: input.type, title: input.title, rank, payloadJson: payload })
    .returning();

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, input.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: input.lessonId,
    courseId: lesson.courseId,
    stepId: step.id,
    savedAt: toIso(step.updatedAt),
  });
}

export async function updateLessonStep(input: UpdateLessonStepInput): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(input.stepId, scope);
  const payload = lessonStepPayloadSchema.parse(input.payload);
  const [updated] = await db
    .update(lessonSteps)
    .set({ title: input.title, type: payload.type, payloadJson: payload, updatedAt: new Date() })
    .where(eq(lessonSteps.id, input.stepId))
    .returning();

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, step.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: step.lessonId,
    courseId: course.id,
    stepId: updated.id,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function duplicateLessonStep(stepId: string): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step } = await getScopedStep(stepId, scope);

  return addLessonStep({
    lessonId: step.lessonId,
    type: step.type as "content" | "task" | "quiz",
    title: `${step.title} 副本`,
    payload: lessonStepPayloadSchema.parse(step.payloadJson),
    afterRank: step.rank,
  });
}

export async function archiveLessonStep(stepId: string): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(stepId, scope);
  const [updated] = await db
    .update(lessonSteps)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(lessonSteps.id, stepId))
    .returning();

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, step.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: step.lessonId,
    courseId: course.id,
    stepId: updated.id,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function reorderLessonStep(input: ReorderLessonStepInput): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(input.stepId, scope);
  const rank = input.beforeRank && input.afterRank
    ? createRankBetween(input.beforeRank, input.afterRank)
    : input.beforeRank
      ? createRankAfter(input.beforeRank)
      : input.afterRank
        ? createRankBetween("0", input.afterRank)
        : createInitialRank();

  const [updated] = await db
    .update(lessonSteps)
    .set({ rank, updatedAt: new Date() })
    .where(eq(lessonSteps.id, input.stepId))
    .returning();

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, step.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: step.lessonId,
    courseId: course.id,
    stepId: updated.id,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function publishLesson(input: { lessonId: string; expectedRevision?: number }): Promise<PublishResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(input.lessonId, scope);

  if (input.expectedRevision && input.expectedRevision !== lesson.revision) {
    throw new Error("CONFLICT");
  }

  const readiness = await getLessonPublishReadinessDTO({ lessonId: input.lessonId });
  if (!readiness.canPublish) {
    throw new Error("PUBLISH_BLOCKED");
  }

  const editor = await getLessonEditorDTO(input.lessonId);
  const latestVersion = await db
    .select({ value: sql<number>`coalesce(max(${publishedLessonVersions.version}), 0)` })
    .from(publishedLessonVersions)
    .where(eq(publishedLessonVersions.lessonId, input.lessonId));
  const version = (latestVersion[0]?.value ?? 0) + 1;
  const snapshotJson = {
    lesson: editor.lesson,
    course: editor.course,
    steps: editor.steps.filter((step) => !step.archivedAt),
    materials: editor.materials,
    publishedAt: new Date().toISOString(),
  };
  const [published] = await db
    .insert(publishedLessonVersions)
    .values({ lessonId: input.lessonId, version, snapshotJson, publishedById: scope.userId })
    .returning();

  await db
    .update(lessons)
    .set({
      publishedVersionId: published.id,
      status: "published",
      revision: lesson.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, input.lessonId));

  return PublishResultDTOSchema.parse({
    ok: true,
    lessonId: input.lessonId,
    courseId: lesson.courseId,
    version,
    publishedVersionId: published.id,
    publishedAt: toIso(published.publishedAt),
  });
}
