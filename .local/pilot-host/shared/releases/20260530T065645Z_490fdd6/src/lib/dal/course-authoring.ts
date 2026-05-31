import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { classMembers, classes, courseClasses, courseEnrollments, courses, lessons, lessonSteps, schools, users } from "@/db/schema";
import { cacheTags } from "@/lib/cache-policy";
import { getActorAsyncTaskListDTO } from "@/lib/dal/async-tasks";
import {
  CourseLifecycleInputSchema,
  CourseDeleteEligibilityDTOSchema,
  CourseDeleteInputSchema,
  CourseCreateInputSchema,
  CourseClassAssociationInputSchema,
  CourseEnrollmentInputSchema,
  CourseLessonEntryDTOSchema,
  CourseUpdateInputSchema,
  type CourseDeleteBlockedReasonDTO,
  TeacherCourseAvailableClassDTOSchema,
  TeacherCourseCardDTOSchema,
  TeacherCourseCenterDTOSchema,
  TeacherCourseCenterRecentImportTaskDTOSchema,
  TeacherCourseDetailDTOSchema,
  TeacherCourseEligibleStudentDTOSchema,
  TeacherCourseLessonsEntryDTOSchema,
  TeacherCourseMemberDTOSchema,
  type CourseClassAssociationInput,
  type CourseCreateInput,
  type CourseDeleteInput,
  type CourseEnrollmentInput,
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

type CourseMembershipRosterRow = {
  studentId: string;
  studentName: string;
  studentNumber: string;
  classLabels: string[];
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

function sortStudentsByIdentity<T extends { studentName: string; studentNumber: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const byStudentNumber = left.studentNumber.localeCompare(right.studentNumber, "zh-CN");

    if (byStudentNumber !== 0) {
      return byStudentNumber;
    }

    return left.studentName.localeCompare(right.studentName, "zh-CN");
  });
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

function normalizeRecentImportStatus(status: string) {
  switch (status) {
    case "pending_enqueue":
    case "dispatching":
    case "queued":
    case "stalled_recovery":
      return { status: "queued", label: "排队中" } as const;
    case "running":
      return { status: "running", label: "导入中" } as const;
    case "retrying":
      return { status: "retrying", label: "重试中" } as const;
    case "partially_completed":
      return { status: "partially_completed", label: "已完成，但有失败项" } as const;
    case "completed":
      return { status: "completed", label: "已完成" } as const;
    case "dispatch_failed":
      return { status: "dispatch_failed", label: "未入队" } as const;
    default:
      return { status: "failed", label: "导入失败" } as const;
  }
}

async function buildRecentImportTaskCard(actorId: string) {
  const recentTask = (await getActorAsyncTaskListDTO({ actorId, limit: 10 })).find(
    (task) => task.featureArea === "course_import" && task.entityRef.entityType === "course_import_batch",
  );

  if (!recentTask) {
    return null;
  }

  const normalizedStatus = normalizeRecentImportStatus(recentTask.status);
  const detail = recentTask.result?.detail ?? {};
  const applySummary = detail.applySummary as Record<string, unknown> | undefined;
  const counts = applySummary
    ? {
        created: Number(applySummary.created ?? 0),
        updated: Number(applySummary.updated ?? 0),
        skipped: Number(applySummary.skipped ?? 0),
        failed: Number(applySummary.failed ?? 0),
      }
    : null;
  const progressCounters = recentTask.progress?.counters;
  const processedRows = progressCounters
    ? progressCounters.completed + progressCounters.failed + progressCounters.skipped
    : null;
  const totalRows = progressCounters?.total ?? null;
  const summaryLabel = normalizedStatus.status === "queued" || normalizedStatus.status === "running" || normalizedStatus.status === "retrying"
    ? processedRows !== null && totalRows !== null
      ? `已处理 ${processedRows}/${totalRows} 行`
      : "任务已创建，等待返回批次详情查看进度。"
    : counts
      ? `created ${counts.created} · updated ${counts.updated} · skipped ${counts.skipped} · failed ${counts.failed}`
      : normalizedStatus.status === "dispatch_failed"
        ? "导入任务还没有成功进入队列。"
        : null;

  return TeacherCourseCenterRecentImportTaskDTOSchema.parse({
    taskId: recentTask.id,
    batchId: recentTask.entityRef.entityId,
    batchLabel: recentTask.entityRef.entityLabel ?? "最近导入批次",
    status: normalizedStatus.status,
    statusLabel: normalizedStatus.label,
    isActive:
      normalizedStatus.status === "queued" ||
      normalizedStatus.status === "running" ||
      normalizedStatus.status === "retrying",
    progressLabel: recentTask.progress?.stageLabelKey ?? recentTask.progress?.stage ?? null,
    progressPercent: recentTask.progress?.percentComplete ?? null,
    summaryLabel,
    latestError:
      normalizedStatus.status === "dispatch_failed"
        ? "请回到批次详情页检查当前批次是否仍可应用，然后重新触发导入。"
        : normalizedStatus.status === "failed"
          ? "请根据失败原因修正 CSV 或处理冲突后重新创建新任务。"
          : null,
    counts,
    href: `/teacher/courses/import/${recentTask.entityRef.entityId}`,
    updatedAt: recentTask.updatedAt,
  });
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
    enrollmentRows,
    courseClassRows,
    classRows,
    lessonCountByCourseId,
    enrollmentCountByCourseId,
    classLabelsByCourseId,
  };
}

async function getCourseMembershipRoster(input: {
  linkedClasses: Array<{ id: string; name: string }>;
  enrollmentRows: Array<{ courseId: string; studentId: string }>;
  courseId: string;
}) {
  const linkedClassIds = input.linkedClasses.map((item) => item.id);
  const classNameById = new Map(input.linkedClasses.map((item) => [item.id, item.name]));
  const linkedClassMembershipRows = linkedClassIds.length
    ? await db.query.classMembers.findMany({
        where: and(inArray(classMembers.classId, linkedClassIds), eq(classMembers.role, "student")),
      })
    : [];
  const scopedMembershipRows = linkedClassMembershipRows.filter(
    (member) => linkedClassIds.includes(member.classId) && member.role === "student"
  );

  const classLabelsByStudentId = new Map<string, Set<string>>();
  for (const member of scopedMembershipRows) {
    const className = classNameById.get(member.classId);
    if (!className) {
      continue;
    }

    const currentLabels = classLabelsByStudentId.get(member.userId) ?? new Set<string>();
    currentLabels.add(className);
    classLabelsByStudentId.set(member.userId, currentLabels);
  }

  const enrolledStudentIds = [...new Set(
    input.enrollmentRows.filter((row) => row.courseId === input.courseId).map((row) => row.studentId)
  )];
  const rosterStudentIds = [...new Set(scopedMembershipRows.map((row) => row.userId))];
  const studentIds = [...new Set([...enrolledStudentIds, ...rosterStudentIds])];
  const studentRows = studentIds.length ? await db.query.users.findMany({ where: inArray(users.id, studentIds) }) : [];
  const studentById = new Map(studentRows.map((row) => [row.id, row]));

  const rosterByStudentId = new Map<string, CourseMembershipRosterRow>();
  for (const studentId of studentIds) {
    const student = studentById.get(studentId);
    if (!student) {
      continue;
    }

    rosterByStudentId.set(studentId, {
      studentId,
      studentName: student.name?.trim() || "未命名学生",
      studentNumber: student.studentNumber?.trim() || studentId,
      classLabels: input.linkedClasses
        .map((classItem) => classItem.name)
        .filter((className) => classLabelsByStudentId.get(studentId)?.has(className) ?? false),
    });
  }

  const members = sortStudentsByIdentity(
    enrolledStudentIds
      .map((studentId) => rosterByStudentId.get(studentId))
      .filter((row): row is CourseMembershipRosterRow => Boolean(row))
  ).map((row) =>
    TeacherCourseMemberDTOSchema.parse({
      ...row,
      enrollmentStatus: "active",
    })
  );

  const eligibleStudents = sortStudentsByIdentity(
    rosterStudentIds
      .filter((studentId) => !enrolledStudentIds.includes(studentId))
      .map((studentId) => rosterByStudentId.get(studentId))
      .filter((row): row is CourseMembershipRosterRow => Boolean(row))
  ).map((row) =>
    TeacherCourseEligibleStudentDTOSchema.parse({
      ...row,
      isAlreadyEnrolled: false,
    })
  );

  return {
    members,
    eligibleStudents,
  };
}

async function getLinkedClassEligibleStudentIds(courseId: string) {
  const linkedClassRows = await db.query.courseClasses.findMany({
    where: eq(courseClasses.courseId, courseId),
  });

  const linkedClassIds = [...new Set(linkedClassRows.map((row) => row.classId))];
  if (linkedClassIds.length === 0) {
    return [];
  }

  const linkedClassMembers = await db.query.classMembers.findMany({
    where: and(inArray(classMembers.classId, linkedClassIds), eq(classMembers.role, "student")),
  });

  return [...new Set(
    linkedClassMembers
      .filter((member) => linkedClassIds.includes(member.classId) && member.role === "student")
      .map((member) => member.userId)
  )];
}

async function getCachedTeacherCourseCenterDTO(input: ScopedCourseQueryInput & { includeArchived: boolean }) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.teacherCourses(input.actorId));

  const [scopedCourses, availableSchoolRows, recentImportTask] = await Promise.all([
    getScopedCourses(input),
    input.schoolIds.length
      ? db.query.schools.findMany({
          where: inArray(schools.id, input.schoolIds),
        })
      : Promise.resolve([]),
    buildRecentImportTaskCard(input.actorId),
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
    recentImportTask,
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

  const { lessonRows, enrollmentRows, courseClassRows, classRows, lessonCountByCourseId, enrollmentCountByCourseId, classLabelsByCourseId } =
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
  const membershipRoster = await getCourseMembershipRoster({
    linkedClasses: classLinks,
    enrollmentRows,
    courseId: course.id,
  });
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
    members: membershipRoster.members,
    eligibleStudents: membershipRoster.eligibleStudents,
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

export async function addCourseEnrollmentForTeacherScoped(input: CourseEnrollmentInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseEnrollmentInputSchema.parse(input);
  const course = await getScopedOwnedCourse(parsed.courseId, scope);

  if (course.status === "archived") {
    throw new Error("COURSE_MEMBERSHIP_READ_ONLY");
  }

  const eligibleStudentIds = await getLinkedClassEligibleStudentIds(course.id);
  if (!eligibleStudentIds.includes(parsed.studentId)) {
    throw new Error("STUDENT_NOT_ELIGIBLE");
  }

  const existingEnrollment = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.studentId, parsed.studentId)),
  });

  if (existingEnrollment) {
    throw new Error("COURSE_ENROLLMENT_EXISTS");
  }

  await db.insert(courseEnrollments).values({
    courseId: course.id,
    studentId: parsed.studentId,
    status: "active",
  });

  const detail = await getTeacherCourseDetailDTO({ courseId: course.id });
  return TeacherCourseDetailDTOSchema.parse(detail);
}

export async function removeCourseEnrollmentForTeacherScoped(input: CourseEnrollmentInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseEnrollmentInputSchema.parse(input);
  const course = await getScopedOwnedCourse(parsed.courseId, scope);

  if (course.status === "archived") {
    throw new Error("COURSE_MEMBERSHIP_READ_ONLY");
  }

  const eligibleStudentIds = await getLinkedClassEligibleStudentIds(course.id);
  if (!eligibleStudentIds.includes(parsed.studentId)) {
    throw new Error("STUDENT_NOT_ELIGIBLE");
  }

  await db
    .delete(courseEnrollments)
    .where(and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.studentId, parsed.studentId)));

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
