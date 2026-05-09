import "server-only";

import { inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { classes, courseClasses, courseEnrollments, courses, lessons, lessonSteps } from "@/db/schema";
import { cacheTags } from "@/lib/cache-policy";
import {
  CourseLessonEntryDTOSchema,
  TeacherCourseCardDTOSchema,
  TeacherCourseCenterDTOSchema,
  TeacherCourseDetailDTOSchema,
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

async function getScopedCourses(input: ScopedCourseQueryInput) {
  if (input.schoolIds.length === 0) {
    return [];
  }

  const courseRows = await db.query.courses.findMany({
    where: inArray(courses.schoolId, input.schoolIds),
  });

  return courseRows.filter((course) => input.schoolIds.includes(course.schoolId));
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

  const scopedCourses = await getScopedCourses(input);
  const filteredCourses = scopedCourses.filter((course) => input.includeArchived || course.status !== "archived");
  const { lessonCountByCourseId, enrollmentCountByCourseId, classLabelsByCourseId } = await getCourseAggregation(
    filteredCourses.map((course) => course.id),
    input.schoolIds
  );

  return TeacherCourseCenterDTOSchema.parse({
    includeArchived: input.includeArchived,
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

  return TeacherCourseDetailDTOSchema.parse({
    ...course,
    lessonCount: lessonCountByCourseId.get(course.id) ?? 0,
    classLabels: classLabelsByCourseId.get(course.id) ?? [],
    classLinks,
    enrollmentCount: enrollmentCountByCourseId.get(course.id) ?? 0,
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
