import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { classes, courseClasses, courseEnrollments, courses, lessons, lessonSteps, schools } from "@/db/schema";
import { cacheTags } from "@/lib/cache-policy";
import {
  CourseLifecycleInputSchema,
  CourseDeleteEligibilityDTOSchema,
  CourseDeleteInputSchema,
  CourseCreateInputSchema,
  CourseClassAssociationInputSchema,
  CourseLessonEntryDTOSchema,
  CourseUpdateInputSchema,
  type CourseDeleteBlockedReasonDTO,
  TeacherCourseAvailableClassDTOSchema,
  TeacherCourseCardDTOSchema,
  TeacherCourseCenterDTOSchema,
  TeacherCourseDetailDTOSchema,
  TeacherCourseLessonsEntryDTOSchema,
  type CourseClassAssociationInput,
  type CourseCreateInput,
  type CourseDeleteInput,
  type CourseUpdateInput,
} from "@/lib/dto/course-authoring";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

const COURSE_STATUS_ORDER = {
  draft: 0,
  published: 1,
  archived: 2,
} as const;

type CourseCenterInput = {
  includeArchived?: boolean;
};

type CourseDetailInput = {
  courseId: string;
};

type ScopedCourseQueryInput = {
  actorId: string;
  schoolIds: string[];
};

type TeacherScope = {
  userId: string;
  schoolIds: string[];
};

type CourseDeleteEligibilityCounts = {
  lessonCount: number;
  classAssociationCount: number;
  enrollmentCount: number;
};

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

function sortClassesByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

async function getScopedOwnedCourse(courseId: string, scope: TeacherScope) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  ensureCourseOwnership(scope, course);
  return course;
}

async function getScopedSchoolClass(classId: string, schoolId: string, scope: TeacherScope) {
  assertSchoolAccess(scope, schoolId);

  const classRow = await db.query.classes.findFirst({ where: eq(classes.id, classId) });

  if (!classRow || classRow.schoolId !== schoolId) {
    throw new Error("CLASS_NOT_FOUND");
  }

  return classRow;
}

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function sortByStatusThenUpdatedAt<T extends { status: string; updatedAt: Date | number | null | undefined }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftWeight = COURSE_STATUS_ORDER[left.status as keyof typeof COURSE_STATUS_ORDER] ?? Number.MAX_SAFE_INTEGER;
    const rightWeight = COURSE_STATUS_ORDER[right.status as keyof typeof COURSE_STATUS_ORDER] ?? Number.MAX_SAFE_INTEGER;

    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight;
    }

    return new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
  });
}

function buildCourseDeleteReasons(counts: CourseDeleteEligibilityCounts): CourseDeleteBlockedReasonDTO[] {
  const reasons: CourseDeleteBlockedReasonDTO[] = [];

  if (counts.lessonCount > 0) {
    reasons.push({
      code: "COURSE_HAS_LESSONS",
      message: `当前课程下还有 ${counts.lessonCount} 个课时，需先清理课时后才能删除课程。`,
      count: counts.lessonCount,
    });
  }

  if (counts.classAssociationCount > 0) {
    reasons.push({
      code: "COURSE_HAS_CLASS_ASSOCIATIONS",
      message: `当前课程仍关联 ${counts.classAssociationCount} 个班级，需先解除班级关联后才能删除课程。`,
      count: counts.classAssociationCount,
    });
  }

  if (counts.enrollmentCount > 0) {
    reasons.push({
      code: "COURSE_HAS_ENROLLMENTS",
      message: `当前课程仍有 ${counts.enrollmentCount} 条学生关联记录，需先清理课程成员后才能删除课程。`,
      count: counts.enrollmentCount,
    });
  }

  return reasons;
}

function buildCourseDeleteEligibility(counts: CourseDeleteEligibilityCounts) {
  const reasons = buildCourseDeleteReasons(counts);

  return CourseDeleteEligibilityDTOSchema.parse({
    canDelete: reasons.length === 0,
    reasons,
  });
}

async function getScopedCourses(input: ScopedCourseQueryInput) {
  if (input.schoolIds.length === 0) {
    return [];
  }

  const courseRows = await db.query.courses.findMany({
    where: inArray(courses.schoolId, input.schoolIds),
  });

  return courseRows.filter((course) => input.schoolIds.includes(course.schoolId) && course.ownerId === input.actorId);
}

async function getCourseAggregation(courseIds: string[], schoolIds: string[]) {
  const [lessonRows, enrollmentRows, courseClassRows, classRows] = await Promise.all([
    courseIds.length
      ? db.query.lessons.findMany({
          where: inArray(lessons.courseId, courseIds),
        })
      : Promise.resolve([]),
    courseIds.length
      ? db.query.courseEnrollments.findMany({
          where: inArray(courseEnrollments.courseId, courseIds),
        })
      : Promise.resolve([]),
    courseIds.length
      ? db.query.courseClasses.findMany({
          where: inArray(courseClasses.courseId, courseIds),
        })
      : Promise.resolve([]),
    schoolIds.length
      ? db.query.classes.findMany({
          where: inArray(classes.schoolId, schoolIds),
        })
      : Promise.resolve([]),
  ]);

  const lessonCountByCourseId = new Map<string, number>();
  for (const lesson of lessonRows) {
    lessonCountByCourseId.set(lesson.courseId, (lessonCountByCourseId.get(lesson.courseId) ?? 0) + 1);
  }

  const enrollmentCountByCourseId = new Map<string, number>();
  for (const enrollment of enrollmentRows) {
    enrollmentCountByCourseId.set(
      enrollment.courseId,
      (enrollmentCountByCourseId.get(enrollment.courseId) ?? 0) + 1
    );
  }

  const classMap = new Map(classRows.map((item) => [item.id, item]));
  const classLabelsByCourseId = new Map<string, string[]>();
  for (const link of courseClassRows) {
    const classRow = classMap.get(link.classId);
    if (!classRow) {
      continue;
    }

    const labels = classLabelsByCourseId.get(link.courseId) ?? [];
    labels.push(classRow.name);
    classLabelsByCourseId.set(link.courseId, labels);
  }

  return {
    lessonRows,
    courseClassRows,
    classRows,
    lessonCountByCourseId,
    enrollmentCountByCourseId,
    classLabelsByCourseId,
  };
}

async function getCachedTeacherCourseCenterDTO(input: ScopedCourseQueryInput & { includeArchived: boolean }) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.teacherCourses(input.actorId));

  const [scopedCourses, availableSchoolRows] = await Promise.all([
    getScopedCourses(input),
    input.schoolIds.length
      ? db.query.schools.findMany({
          where: inArray(schools.id, input.schoolIds),
        })
      : Promise.resolve([]),
  ]);
  const filteredCourses = scopedCourses.filter((course) => input.includeArchived || course.status !== "archived");
  const { lessonCountByCourseId, enrollmentCountByCourseId, classLabelsByCourseId } = await getCourseAggregation(
    filteredCourses.map((course) => course.id),
    input.schoolIds
  );
  const schoolMap = new Map(availableSchoolRows.map((school) => [school.id, school]));
  const availableSchools = input.schoolIds
    .map((schoolId) => schoolMap.get(schoolId))
    .filter((school): school is (typeof availableSchoolRows)[number] => Boolean(school))
    .map((school) => ({ id: school.id, name: school.name }));

  return TeacherCourseCenterDTOSchema.parse({
    includeArchived: input.includeArchived,
    defaultSchoolId: input.schoolIds[0] ?? null,
    availableSchools,
    courses: sortByStatusThenUpdatedAt(filteredCourses).map((course) =>
      TeacherCourseCardDTOSchema.parse({
        ...course,
        lessonCount: lessonCountByCourseId.get(course.id) ?? 0,
        classLabels: classLabelsByCourseId.get(course.id) ?? [],
        enrollmentCount: enrollmentCountByCourseId.get(course.id) ?? 0,
        updatedAt: toIso(course.updatedAt),
      })
    ),
  });
}

async function getCachedTeacherCourseDetailDTO(input: ScopedCourseQueryInput & CourseDetailInput) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.teacherCourses(input.actorId));
  cacheTag(cacheTags.course(input.courseId));

  const scopedCourses = await getScopedCourses(input);
  const course = scopedCourses.find((item) => item.id === input.courseId);

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  const { lessonRows, courseClassRows, classRows, lessonCountByCourseId, enrollmentCountByCourseId, classLabelsByCourseId } =
    await getCourseAggregation([course.id], input.schoolIds);

  const scopedLessons = lessonRows.filter((lesson) => lesson.courseId === course.id);
  const stepRows = scopedLessons.length
    ? await db.query.lessonSteps.findMany({
        where: inArray(lessonSteps.lessonId, scopedLessons.map((lesson) => lesson.id)),
      })
    : [];

  const stepCountByLessonId = new Map<string, number>();
  for (const step of stepRows) {
    if (step.archivedAt) {
      continue;
    }

    stepCountByLessonId.set(step.lessonId, (stepCountByLessonId.get(step.lessonId) ?? 0) + 1);
  }

  const classMap = new Map(classRows.map((item) => [item.id, item]));
  const classLinks = courseClassRows
    .filter((link) => link.courseId === course.id)
    .map((link) => classMap.get(link.classId))
    .filter((item): item is (typeof classRows)[number] => Boolean(item))
    .map((item) => ({ id: item.id, name: item.name }));
  const linkedClassIds = new Set(classLinks.map((item) => item.id));
  const availableClasses = sortClassesByName(
    classRows
      .filter((item) => item.schoolId === course.schoolId && !linkedClassIds.has(item.id))
      .map((item) => TeacherCourseAvailableClassDTOSchema.parse({ id: item.id, name: item.name }))
  );
  const deleteEligibility = buildCourseDeleteEligibility({
    lessonCount: scopedLessons.length,
    classAssociationCount: classLinks.length,
    enrollmentCount: enrollmentCountByCourseId.get(course.id) ?? 0,
  });

  return TeacherCourseDetailDTOSchema.parse({
    ...course,
    lessonCount: lessonCountByCourseId.get(course.id) ?? 0,
    classLabels: classLabelsByCourseId.get(course.id) ?? [],
    classLinks,
    availableClasses,
    enrollmentCount: enrollmentCountByCourseId.get(course.id) ?? 0,
    deleteEligibility,
    updatedAt: toIso(course.updatedAt),
    lessons: [...scopedLessons]
      .sort((left, right) => new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime())
      .map((lesson) =>
      CourseLessonEntryDTOSchema.parse({
        ...lesson,
        stepCount: stepCountByLessonId.get(lesson.id) ?? 0,
        updatedAt: toIso(lesson.updatedAt),
      })
      ),
  });
}

async function getCachedTeacherCourseLessonsEntryDTO(input: ScopedCourseQueryInput & CourseDetailInput) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.teacherCourses(input.actorId));
  cacheTag(cacheTags.course(input.courseId));

  const scopedCourses = await getScopedCourses(input);
  const course = scopedCourses.find((item) => item.id === input.courseId && item.status !== "archived");

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  const { lessonRows, lessonCountByCourseId, enrollmentCountByCourseId, classLabelsByCourseId } = await getCourseAggregation(
    [course.id],
    input.schoolIds
  );

  const scopedLessons = lessonRows
    .filter((lesson) => lesson.courseId === course.id)
    .sort((left, right) => new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime());

  const stepRows = scopedLessons.length
    ? await db.query.lessonSteps.findMany({
        where: inArray(lessonSteps.lessonId, scopedLessons.map((lesson) => lesson.id)),
      })
    : [];

  const stepCountByLessonId = new Map<string, number>();
  for (const step of stepRows) {
    if (step.archivedAt) {
      continue;
    }

    stepCountByLessonId.set(step.lessonId, (stepCountByLessonId.get(step.lessonId) ?? 0) + 1);
  }

  const lessonEntries = scopedLessons.map((lesson) =>
    CourseLessonEntryDTOSchema.parse({
      ...lesson,
      stepCount: stepCountByLessonId.get(lesson.id) ?? 0,
      updatedAt: toIso(lesson.updatedAt),
    })
  );

  return TeacherCourseLessonsEntryDTOSchema.parse({
    course: {
      ...course,
      lessonCount: lessonCountByCourseId.get(course.id) ?? 0,
      classLabels: classLabelsByCourseId.get(course.id) ?? [],
      enrollmentCount: enrollmentCountByCourseId.get(course.id) ?? 0,
      updatedAt: toIso(course.updatedAt),
      lessons: lessonEntries,
    },
    lessons: lessonEntries,
  });
}

export async function getTeacherCourseCenterDTO(input: CourseCenterInput = {}) {
  const scope = await assertActiveTeacher();

  return getCachedTeacherCourseCenterDTO({
    actorId: scope.userId,
    schoolIds: scope.schoolIds,
    includeArchived: input.includeArchived ?? false,
  });
}

export async function getTeacherCourseDetailDTO(input: CourseDetailInput) {
  const scope = await assertActiveTeacher();

  return getCachedTeacherCourseDetailDTO({
    actorId: scope.userId,
    schoolIds: scope.schoolIds,
    courseId: input.courseId,
  });
}

export async function getTeacherCourseLessonsEntryDTO(input: CourseDetailInput) {
  const scope = await assertActiveTeacher();

  return getCachedTeacherCourseLessonsEntryDTO({
    actorId: scope.userId,
    schoolIds: scope.schoolIds,
    courseId: input.courseId,
  });
}

export async function createCourseForTeacherScoped(input: CourseCreateInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseCreateInputSchema.parse(input);

  assertSchoolAccess(scope, parsed.schoolId);

  const [course] = await db
    .insert(courses)
    .values({
      schoolId: parsed.schoolId,
      ownerId: scope.userId,
      title: parsed.title,
      subject: parsed.subject,
      grade: parsed.grade,
      status: parsed.status ?? "draft",
    })
    .returning();

  return TeacherCourseCardDTOSchema.parse({
    ...course,
    lessonCount: 0,
    classLabels: [],
    enrollmentCount: 0,
    updatedAt: toIso(course.updatedAt),
  });
}

export async function updateCourseForTeacherScoped(input: CourseUpdateInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseUpdateInputSchema.parse(input);
  const course = await getScopedOwnedCourse(parsed.courseId, scope);

  const [updated] = await db
    .update(courses)
    .set({
      title: parsed.title,
      subject: parsed.subject,
      grade: parsed.grade,
      status: parsed.status,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, course.id))
    .returning();

  const detail = await getTeacherCourseDetailDTO({ courseId: updated.id });
  return TeacherCourseDetailDTOSchema.parse(detail);
}

export async function addCourseClassAssociationForTeacherScoped(input: CourseClassAssociationInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseClassAssociationInputSchema.parse(input);
  const course = await getScopedOwnedCourse(parsed.courseId, scope);
  const classRow = await getScopedSchoolClass(parsed.classId, course.schoolId, scope);

  const existingLink = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, course.id), eq(courseClasses.classId, classRow.id)),
  });

  if (!existingLink) {
    await db.insert(courseClasses).values({
      courseId: course.id,
      classId: classRow.id,
    });
  }

  const detail = await getTeacherCourseDetailDTO({ courseId: course.id });
  return TeacherCourseDetailDTOSchema.parse(detail);
}

export async function removeCourseClassAssociationForTeacherScoped(input: CourseClassAssociationInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseClassAssociationInputSchema.parse(input);
  const course = await getScopedOwnedCourse(parsed.courseId, scope);
  const classRow = await getScopedSchoolClass(parsed.classId, course.schoolId, scope);

  await db
    .delete(courseClasses)
    .where(and(eq(courseClasses.courseId, course.id), eq(courseClasses.classId, classRow.id)));

  const detail = await getTeacherCourseDetailDTO({ courseId: course.id });
  return TeacherCourseDetailDTOSchema.parse(detail);
}

async function updateCourseStatusForTeacherScoped(input: { courseId: string; nextStatus: "draft" | "published" | "archived" }) {
  const scope = await assertActiveTeacher();
  const parsed = CourseLifecycleInputSchema.parse({ courseId: input.courseId });
  const course = await getScopedOwnedCourse(parsed.courseId, scope);

  const targetStatus = input.nextStatus;

  if (course.status === targetStatus) {
    return getTeacherCourseDetailDTO({ courseId: course.id });
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: targetStatus,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, course.id))
    .returning();

  const detail = await getTeacherCourseDetailDTO({ courseId: updated.id });
  return TeacherCourseDetailDTOSchema.parse(detail);
}

export async function publishCourseForTeacherScoped(input: { courseId: string }) {
  return updateCourseStatusForTeacherScoped({
    courseId: input.courseId,
    nextStatus: "published",
  });
}

export async function unpublishCourseForTeacherScoped(input: { courseId: string }) {
  return updateCourseStatusForTeacherScoped({
    courseId: input.courseId,
    nextStatus: "draft",
  });
}

export async function archiveCourseForTeacherScoped(input: { courseId: string }) {
  return updateCourseStatusForTeacherScoped({
    courseId: input.courseId,
    nextStatus: "archived",
  });
}

export async function updateMatchedCourseStatusForTeacherScoped(input: {
  courseId: string;
  status: "draft" | "published" | "archived";
}) {
  const scope = await assertActiveTeacher();
  const course = await getScopedOwnedCourse(input.courseId, scope);

  if (course.status === input.status) {
    return course;
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, course.id))
    .returning();

  return updated;
}

export async function deleteCourseForTeacherScoped(input: CourseDeleteInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseDeleteInputSchema.parse(input);
  const course = await getScopedOwnedCourse(parsed.courseId, scope);
  const detail = await getTeacherCourseDetailDTO({ courseId: course.id });

  if (parsed.confirmationText !== detail.title) {
    throw new Error("COURSE_DELETE_CONFIRMATION_MISMATCH");
  }

  if (!detail.deleteEligibility.canDelete) {
    const error = new Error("COURSE_DELETE_BLOCKED") as Error & {
      reasons?: CourseDeleteBlockedReasonDTO[];
      userMessage?: string;
    };
    error.reasons = detail.deleteEligibility.reasons;
    error.userMessage = "课程暂时不能删除，请先处理以下阻断项。";
    throw error;
  }

  await db.delete(courses).where(eq(courses.id, course.id));

  return {
    id: course.id,
    title: course.title,
  };
}
