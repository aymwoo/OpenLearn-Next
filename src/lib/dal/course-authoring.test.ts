import { existsSync, readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyCourses = vi.fn();
const findFirstCourses = vi.fn();
const findManyLessons = vi.fn();
const findManyLessonSteps = vi.fn();
const findManyCourseEnrollments = vi.fn();
const findFirstCourseEnrollments = vi.fn();
const findManyCourseClasses = vi.fn();
const findFirstCourseClasses = vi.fn();
const findManyClasses = vi.fn();
const findFirstClasses = vi.fn();
const findManyClassMembers = vi.fn();
const findManyUsers = vi.fn();
const findManySchools = vi.fn();
const assertActiveTeacher = vi.fn();
const cacheLife = vi.fn();
const cacheTag = vi.fn();
const deleteWhere = vi.fn();
const insertValues = vi.fn();
const dbInsert = vi.fn(() => ({ values: insertValues }));
const dbDelete = vi.fn(() => ({ where: deleteWhere }));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife,
  cacheTag,
}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsert,
    delete: dbDelete,
    query: {
      courses: { findMany: findManyCourses, findFirst: findFirstCourses },
      lessons: { findMany: findManyLessons },
      lessonSteps: { findMany: findManyLessonSteps },
      courseEnrollments: { findMany: findManyCourseEnrollments, findFirst: findFirstCourseEnrollments },
      courseClasses: { findMany: findManyCourseClasses, findFirst: findFirstCourseClasses },
      classMembers: { findMany: findManyClassMembers },
      classes: { findMany: findManyClasses, findFirst: findFirstClasses },
      users: { findMany: findManyUsers },
      schools: { findMany: findManySchools },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

describe("course authoring DAL", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mockFn of [
      findManyCourses,
      findFirstCourses,
      findManyLessons,
      findManyLessonSteps,
      findManyCourseEnrollments,
      findFirstCourseEnrollments,
      findManyCourseClasses,
      findFirstCourseClasses,
      findManyClasses,
      findFirstClasses,
      findManyClassMembers,
      findManyUsers,
      findManySchools,
      assertActiveTeacher,
      cacheLife,
      cacheTag,
      deleteWhere,
      insertValues,
      dbInsert,
      dbDelete,
    ]) {
      mockFn.mockReset();
    }

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    deleteWhere.mockResolvedValue(undefined);
    insertValues.mockResolvedValue(undefined);
    findFirstCourseClasses.mockResolvedValue(null);
    findFirstCourseEnrollments.mockResolvedValue(null);

    findManyCourses.mockResolvedValue([
      {
        id: "course-draft-new",
        schoolId: "school-1",
        ownerId: "teacher-1",
        title: "七年级科学探究",
        subject: "科学",
        grade: "七年级",
        status: "draft",
        updatedAt: new Date("2026-05-08T10:00:00.000Z"),
      },
      {
        id: "course-published-newer",
        schoolId: "school-1",
        ownerId: "teacher-1",
        title: "整本书阅读",
        subject: "语文",
        grade: "八年级",
        status: "published",
        updatedAt: new Date("2026-05-09T09:00:00.000Z"),
      },
      {
        id: "course-draft-older",
        schoolId: "school-1",
        ownerId: "teacher-1",
        title: "函数入门",
        subject: "数学",
        grade: "七年级",
        status: "draft",
        updatedAt: new Date("2026-05-07T10:00:00.000Z"),
      },
      {
        id: "course-same-school-foreign",
        schoolId: "school-1",
        ownerId: "teacher-2",
        title: "同校其他教师课程",
        subject: "历史",
        grade: "七年级",
        status: "published",
        updatedAt: new Date("2026-05-11T10:00:00.000Z"),
      },
      {
        id: "course-archived",
        schoolId: "school-1",
        ownerId: "teacher-1",
        title: "往期实验复盘",
        subject: "科学",
        grade: "七年级",
        status: "archived",
        updatedAt: new Date("2026-05-10T10:00:00.000Z"),
      },
      {
        id: "course-out-of-scope",
        schoolId: "school-2",
        ownerId: "teacher-9",
        title: "外校课程",
        subject: "英语",
        grade: "九年级",
        status: "draft",
        updatedAt: new Date("2026-05-11T10:00:00.000Z"),
      },
    ]);
    findFirstCourses.mockImplementation(async ({ where }: { where?: unknown }) => {
      if (typeof where === "function") {
        const allCourses = await findManyCourses.mock.results.at(-1)?.value;
        return allCourses?.find((item: { id: string }) => item.id === "course-published-newer") ?? null;
      }

      const candidates = findManyCourses.mock.results.at(-1)?.value;
      const resolved = await candidates;

      if (!where || typeof where !== "object" || resolved == null) {
        return resolved?.[0] ?? null;
      }

      const whereText = JSON.stringify(where);
      if (whereText.includes("course-draft-new")) {
        return resolved.find((item: { id: string }) => item.id === "course-draft-new") ?? null;
      }
      if (whereText.includes("course-published-newer")) {
        return resolved.find((item: { id: string }) => item.id === "course-published-newer") ?? null;
      }
      if (whereText.includes("course-archived")) {
        return resolved.find((item: { id: string }) => item.id === "course-archived") ?? null;
      }
      if (whereText.includes("course-same-school-foreign")) {
        return resolved.find((item: { id: string }) => item.id === "course-same-school-foreign") ?? null;
      }

      return null;
    });

    findManyLessons.mockResolvedValue([
      {
        id: "lesson-1",
        courseId: "course-draft-new",
        title: "第一课：问题提出",
        objective: "观察现象",
        status: "draft",
        revision: 2,
        updatedAt: new Date("2026-05-09T08:00:00.000Z"),
      },
      {
        id: "lesson-2",
        courseId: "course-draft-new",
        title: "第二课：实验设计",
        objective: "形成假设",
        status: "published",
        revision: 3,
        updatedAt: new Date("2026-05-10T08:00:00.000Z"),
      },
      {
        id: "lesson-out-of-scope",
        courseId: "course-out-of-scope",
        title: "外校课时",
        objective: "不应出现",
        status: "draft",
        revision: 1,
        updatedAt: new Date("2026-05-11T08:00:00.000Z"),
      },
      {
        id: "lesson-same-school-foreign",
        courseId: "course-same-school-foreign",
        title: "同校越权课时",
        objective: "不应出现",
        status: "draft",
        revision: 1,
        updatedAt: new Date("2026-05-12T08:00:00.000Z"),
      },
    ]);

    findManyLessonSteps.mockResolvedValue([
      { id: "step-1", lessonId: "lesson-1", archivedAt: null },
      { id: "step-2", lessonId: "lesson-1", archivedAt: null },
      { id: "step-3", lessonId: "lesson-1", archivedAt: new Date("2026-05-09T09:00:00.000Z") },
      { id: "step-4", lessonId: "lesson-2", archivedAt: null },
      { id: "step-5", lessonId: "lesson-out-of-scope", archivedAt: null },
      { id: "step-6", lessonId: "lesson-same-school-foreign", archivedAt: null },
    ]);

    findManyCourseEnrollments.mockResolvedValue([
      { id: "enrollment-1", courseId: "course-draft-new", studentId: "student-1" },
      { id: "enrollment-2", courseId: "course-draft-new", studentId: "student-2" },
      { id: "enrollment-3", courseId: "course-published-newer", studentId: "student-3" },
      { id: "enrollment-foreign", courseId: "course-same-school-foreign", studentId: "student-2" },
      { id: "enrollment-4", courseId: "course-out-of-scope", studentId: "student-9" },
    ]);

    findManyCourseClasses.mockResolvedValue([
      { courseId: "course-draft-new", classId: "class-1" },
      { courseId: "course-draft-new", classId: "class-2" },
      { courseId: "course-same-school-foreign", classId: "class-2" },
      { courseId: "course-archived", classId: "class-2" },
      { courseId: "course-out-of-scope", classId: "class-3" },
    ]);

    findManyClasses.mockResolvedValue([
      { id: "class-1", schoolId: "school-1", name: "七年级一班" },
      { id: "class-2", schoolId: "school-1", name: "七年级二班" },
      { id: "class-4", schoolId: "school-1", name: "七年级三班" },
      { id: "class-3", schoolId: "school-2", name: "外校实验班" },
    ]);
    findManyClassMembers.mockResolvedValue([
      { id: "member-1", classId: "class-1", userId: "student-1", role: "student" },
      { id: "member-2", classId: "class-1", userId: "student-3", role: "student" },
      { id: "member-3", classId: "class-2", userId: "student-2", role: "student" },
      { id: "member-4", classId: "class-2", userId: "student-3", role: "student" },
      { id: "member-5", classId: "class-2", userId: "teacher-2", role: "teacher" },
      { id: "member-6", classId: "class-3", userId: "student-9", role: "student" },
      { id: "member-7", classId: "class-4", userId: "student-4", role: "student" },
    ]);
    findManyUsers.mockResolvedValue([
      { id: "student-1", name: "林小满", studentNumber: "S-001" },
      { id: "student-2", name: "周以恒", studentNumber: "S-002" },
      { id: "student-3", name: "许知远", studentNumber: "S-003" },
      { id: "student-4", name: "沈星河", studentNumber: "S-004" },
      { id: "student-9", name: "外校学生", studentNumber: "S-999" },
      { id: "teacher-2", name: "同班教师", studentNumber: null },
    ]);
    findManySchools.mockResolvedValue([
      { id: "school-1", name: "晨曦实验学校" },
      { id: "school-2", name: "星河联合校区" },
      { id: "school-3", name: "未授权学校" },
    ]);
  });

  it("filters to teacher-owned school scope only per D-16 and hides foreign courses", async () => {
    const { getTeacherCourseCenterDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseCenterDTO();

    expect(dto.courses.map((course) => course.id)).not.toContain("course-out-of-scope");
    expect(dto.courses.map((course) => course.id)).not.toContain("course-same-school-foreign");
    expect(dto.courses.every((course) => course.schoolId === "school-1")).toBe(true);
    expect(dto.courses.every((course) => course.ownerId === "teacher-1")).toBe(true);
    expect(dto.defaultSchoolId).toBe("school-1");
    expect(dto.availableSchools).toEqual([{ id: "school-1", name: "晨曦实验学校" }]);
  });

  it("applies D-13 D-14 D-15 ordering and archived visibility rules by default", async () => {
    const { getTeacherCourseCenterDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseCenterDTO();

    expect(dto.includeArchived).toBe(false);
    expect(dto.courses.map((course) => course.id)).toEqual([
      "course-draft-new",
      "course-draft-older",
      "course-published-newer",
    ]);
    expect(dto.courses.some((course) => course.status === "archived")).toBe(false);
  });

  it("returns archived courses only when explicitly requested", async () => {
    const { getTeacherCourseCenterDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseCenterDTO({ includeArchived: true });

    expect(dto.includeArchived).toBe(true);
    expect(dto.courses.map((course) => course.id)).toEqual([
      "course-draft-new",
      "course-draft-older",
      "course-published-newer",
      "course-archived",
    ]);
  });

  it("returns course detail DTO with title, subject, grade, status, lesson summaries, class links, and enrollment count", async () => {
    const { getTeacherCourseDetailDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseDetailDTO({ courseId: "course-draft-new" });

    expect(dto.id).toBe("course-draft-new");
    expect(dto.title).toBe("七年级科学探究");
    expect(dto.subject).toBe("科学");
    expect(dto.grade).toBe("七年级");
    expect(dto.status).toBe("draft");
    expect(dto.enrollmentCount).toBe(2);
    expect(dto.lessonCount).toBe(2);
    expect(dto.classLinks).toEqual([
      { id: "class-1", name: "七年级一班" },
      { id: "class-2", name: "七年级二班" },
    ]);
    expect(dto.availableClasses).toEqual([{ id: "class-4", name: "七年级三班" }]);
    expect(dto.members).toEqual([
      {
        studentId: "student-1",
        studentName: "林小满",
        studentNumber: "S-001",
        classLabels: ["七年级一班"],
        enrollmentStatus: "active",
      },
      {
        studentId: "student-2",
        studentName: "周以恒",
        studentNumber: "S-002",
        classLabels: ["七年级二班"],
        enrollmentStatus: "active",
      },
    ]);
    expect(dto.eligibleStudents).toEqual([
      {
        studentId: "student-3",
        studentName: "许知远",
        studentNumber: "S-003",
        classLabels: ["七年级一班", "七年级二班"],
        isAlreadyEnrolled: false,
      },
    ]);
    expect(dto.lessons.map((lesson) => lesson.id)).toEqual(["lesson-2", "lesson-1"]);
    expect(dto.lessons[0]).toEqual(expect.objectContaining({ id: "lesson-2", stepCount: 1, status: "published" }));
    expect(dto.lessons[1]).toEqual(expect.objectContaining({ id: "lesson-1", stepCount: 2, status: "draft" }));
  });

  it("limits membership candidates to linked classes only and excludes unrelated school roster rows", async () => {
    const { getTeacherCourseDetailDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseDetailDTO({ courseId: "course-draft-new" });

    expect(dto.members.every((student) => student.studentId !== "student-9")).toBe(true);
    expect(dto.eligibleStudents.map((student) => student.studentId)).toEqual(["student-3"]);
    expect(dto.eligibleStudents.some((student) => student.studentId === "student-4")).toBe(false);
  });

  it("adds a class association within the teacher school scope and returns refreshed detail DTO", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findFirstClasses.mockResolvedValueOnce({ id: "class-4", schoolId: "school-1", name: "七年级三班" });
    findFirstCourseClasses.mockResolvedValueOnce(null);
    findManyCourseClasses.mockResolvedValueOnce([
      { courseId: "course-draft-new", classId: "class-1" },
      { courseId: "course-draft-new", classId: "class-2" },
      { courseId: "course-draft-new", classId: "class-4" },
    ]);

    const { addCourseClassAssociationForTeacherScoped } = await import("./course-authoring");

    const dto = await addCourseClassAssociationForTeacherScoped({
      courseId: "course-draft-new",
      classId: "class-4",
    });

    expect(dbInsert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith({
      courseId: "course-draft-new",
      classId: "class-4",
    });
    expect(dto.classLinks).toEqual([
      { id: "class-1", name: "七年级一班" },
      { id: "class-2", name: "七年级二班" },
      { id: "class-4", name: "七年级三班" },
    ]);
    expect(dto.availableClasses).toEqual([]);
  });

  it("removes a class association and returns refreshed detail DTO", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findFirstClasses.mockResolvedValueOnce({ id: "class-2", schoolId: "school-1", name: "七年级二班" });
    findManyCourseClasses.mockResolvedValueOnce([
      { courseId: "course-draft-new", classId: "class-1" },
    ]);

    const { removeCourseClassAssociationForTeacherScoped } = await import("./course-authoring");

    const dto = await removeCourseClassAssociationForTeacherScoped({
      courseId: "course-draft-new",
      classId: "class-2",
    });

    expect(dbDelete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
    expect(dto.classLinks).toEqual([{ id: "class-1", name: "七年级一班" }]);
    expect(dto.availableClasses).toEqual([
      { id: "class-2", name: "七年级二班" },
      { id: "class-4", name: "七年级三班" },
    ]);
  });

  it("rejects cross-school class associations with CLASS_NOT_FOUND", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findFirstClasses.mockResolvedValueOnce({ id: "class-3", schoolId: "school-2", name: "外校实验班" });
    const { addCourseClassAssociationForTeacherScoped } = await import("./course-authoring");

    await expect(
      addCourseClassAssociationForTeacherScoped({
        courseId: "course-draft-new",
        classId: "class-3",
      })
    ).rejects.toThrow("CLASS_NOT_FOUND");
  });

  it("adds an eligible course enrollment and returns refreshed detail DTO", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findManyCourseClasses.mockResolvedValueOnce([
      { courseId: "course-draft-new", classId: "class-1" },
      { courseId: "course-draft-new", classId: "class-2" },
    ]);
    findManyClassMembers.mockResolvedValueOnce([
      { id: "member-1", classId: "class-1", userId: "student-1", role: "student" },
      { id: "member-2", classId: "class-2", userId: "student-2", role: "student" },
      { id: "member-3", classId: "class-2", userId: "student-3", role: "student" },
    ]);
    findFirstCourseEnrollments.mockResolvedValueOnce(null);
    findManyCourseEnrollments.mockResolvedValueOnce([
      { id: "enrollment-1", courseId: "course-draft-new", studentId: "student-1" },
      { id: "enrollment-2", courseId: "course-draft-new", studentId: "student-2" },
      { id: "enrollment-3", courseId: "course-draft-new", studentId: "student-3" },
    ]);

    const { addCourseEnrollmentForTeacherScoped } = await import("./course-authoring");

    const dto = await addCourseEnrollmentForTeacherScoped({
      courseId: "course-draft-new",
      studentId: "student-3",
    });

    expect(dbInsert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith({
      courseId: "course-draft-new",
      studentId: "student-3",
      status: "active",
    });
    expect(dto.members.map((member) => member.studentId)).toEqual(["student-1", "student-2", "student-3"]);
    expect(dto.eligibleStudents).toEqual([]);
    expect(dto.enrollmentCount).toBe(3);
  });

  it("rejects duplicate course enrollments explicitly", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findManyCourseClasses.mockResolvedValueOnce([
      { courseId: "course-draft-new", classId: "class-1" },
      { courseId: "course-draft-new", classId: "class-2" },
    ]);
    findManyClassMembers.mockResolvedValueOnce([
      { id: "member-1", classId: "class-1", userId: "student-1", role: "student" },
      { id: "member-2", classId: "class-2", userId: "student-2", role: "student" },
    ]);
    findFirstCourseEnrollments.mockResolvedValueOnce({
      id: "enrollment-2",
      courseId: "course-draft-new",
      studentId: "student-2",
    });

    const { addCourseEnrollmentForTeacherScoped } = await import("./course-authoring");

    await expect(
      addCourseEnrollmentForTeacherScoped({
        courseId: "course-draft-new",
        studentId: "student-2",
      })
    ).rejects.toThrow("COURSE_ENROLLMENT_EXISTS");
  });

  it("rejects out-of-scope students when adding a course enrollment", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findManyCourseClasses.mockResolvedValueOnce([{ courseId: "course-draft-new", classId: "class-1" }]);
    findManyClassMembers.mockResolvedValueOnce([
      { id: "member-1", classId: "class-1", userId: "student-1", role: "student" },
    ]);

    const { addCourseEnrollmentForTeacherScoped } = await import("./course-authoring");

    await expect(
      addCourseEnrollmentForTeacherScoped({
        courseId: "course-draft-new",
        studentId: "student-9",
      })
    ).rejects.toThrow("STUDENT_NOT_ELIGIBLE");
  });

  it("blocks archived course membership writes", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-archived",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "往期实验复盘",
      subject: "科学",
      grade: "七年级",
      status: "archived",
      updatedAt: new Date("2026-05-10T10:00:00.000Z"),
    });

    const { addCourseEnrollmentForTeacherScoped, removeCourseEnrollmentForTeacherScoped } = await import("./course-authoring");

    await expect(
      addCourseEnrollmentForTeacherScoped({
        courseId: "course-archived",
        studentId: "student-2",
      })
    ).rejects.toThrow("COURSE_MEMBERSHIP_READ_ONLY");

    findFirstCourses.mockResolvedValueOnce({
      id: "course-archived",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "往期实验复盘",
      subject: "科学",
      grade: "七年级",
      status: "archived",
      updatedAt: new Date("2026-05-10T10:00:00.000Z"),
    });

    await expect(
      removeCourseEnrollmentForTeacherScoped({
        courseId: "course-archived",
        studentId: "student-2",
      })
    ).rejects.toThrow("COURSE_MEMBERSHIP_READ_ONLY");
  });

  it("removes a course enrollment and returns the student to the eligible pool", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-draft-new",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      status: "draft",
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    findManyCourseClasses.mockResolvedValueOnce([
      { courseId: "course-draft-new", classId: "class-1" },
      { courseId: "course-draft-new", classId: "class-2" },
    ]);
    findManyClassMembers.mockResolvedValueOnce([
      { id: "member-1", classId: "class-1", userId: "student-1", role: "student" },
      { id: "member-2", classId: "class-2", userId: "student-2", role: "student" },
      { id: "member-3", classId: "class-2", userId: "student-3", role: "student" },
    ]);
    findManyCourseEnrollments.mockResolvedValueOnce([
      { id: "enrollment-1", courseId: "course-draft-new", studentId: "student-1" },
      { id: "enrollment-3", courseId: "course-draft-new", studentId: "student-3" },
    ]);

    const { removeCourseEnrollmentForTeacherScoped } = await import("./course-authoring");

    const dto = await removeCourseEnrollmentForTeacherScoped({
      courseId: "course-draft-new",
      studentId: "student-2",
    });

    expect(dbDelete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
    expect(dto.members.map((member) => member.studentId)).toEqual(["student-1", "student-3"]);
    expect(dto.eligibleStudents).toEqual([
      {
        studentId: "student-2",
        studentName: "周以恒",
        studentNumber: "S-002",
        classLabels: ["七年级二班"],
        isAlreadyEnrolled: false,
      },
    ]);
  });

  it("returns only current course lesson summaries for the course-aware lessons entry per D-09 D-10", async () => {
    const { getTeacherCourseLessonsEntryDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseLessonsEntryDTO({ courseId: "course-draft-new" });

    expect(dto.course.id).toBe("course-draft-new");
    expect(dto.lessons.map((lesson) => lesson.id)).toEqual(["lesson-2", "lesson-1"]);
    expect(dto.lessons.some((lesson) => lesson.id === "lesson-out-of-scope")).toBe(false);
  });

  it("hides archived courses from the lessons entry teacher flow per COURSE-04", async () => {
    const { getTeacherCourseLessonsEntryDTO } = await import("./course-authoring");

    await expect(getTeacherCourseLessonsEntryDTO({ courseId: "course-archived" })).rejects.toThrow("COURSE_NOT_FOUND");
  });

  it("rejects same-school foreign course detail reads with COURSE_NOT_FOUND", async () => {
    const { getTeacherCourseDetailDTO } = await import("./course-authoring");

    await expect(getTeacherCourseDetailDTO({ courseId: "course-same-school-foreign" })).rejects.toThrow(
      "COURSE_NOT_FOUND"
    );
  });

  it("rejects same-school foreign course lessons entry reads with COURSE_NOT_FOUND", async () => {
    const { getTeacherCourseLessonsEntryDTO } = await import("./course-authoring");

    await expect(getTeacherCourseLessonsEntryDTO({ courseId: "course-same-school-foreign" })).rejects.toThrow(
      "COURSE_NOT_FOUND"
    );
  });

  it("returns all scoped school metadata for multi-school teachers without hardcoded defaults", async () => {
    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-2", "school-1"],
    });

    const { getTeacherCourseCenterDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseCenterDTO();

    expect(dto.defaultSchoolId).toBe("school-2");
    expect(dto.availableSchools).toEqual([
      { id: "school-2", name: "星河联合校区" },
      { id: "school-1", name: "晨曦实验学校" },
    ]);
    expect(dto.availableSchools.every((school) => ["school-2", "school-1"].includes(school.id))).toBe(true);
  });

  it("renders the empty-state primary CTA copy as 新建第一个课时 per D-11", () => {
    const surfacePath = "src/components/surfaces/course-lessons-entry-surface.tsx";

    expect(existsSync(surfacePath)).toBe(true);
    expect(readFileSync(surfacePath, "utf8")).toContain("新建第一个课时");
  });

  it("keeps recoverable lesson-draft failures on the lessons entry page instead of throwing 500", () => {
    const source = readFileSync("src/components/surfaces/course-lessons-entry-surface.tsx", "utf8");

    expect(source).toContain("/teacher/courses/${courseId}/lessons?error=${encodeURIComponent(result.message)}");
    expect(source).not.toContain('throw new Error("LESSON_DRAFT_CREATE_FAILED")');
  });

  it("routes the course detail primary CTA to /teacher/courses/[courseId]/lessons per D-09", () => {
    const source = readFileSync("src/components/surfaces/teacher-course-detail-surface.tsx", "utf8");

    expect(source).toContain("/teacher/courses/");
    expect(source).toContain("/lessons");
  });

  it("keeps archived courses out of the adjacent lessons-entry CTA copy per COURSE-04", () => {
    const source = readFileSync("src/components/surfaces/teacher-course-detail-surface.tsx", "utf8");

    expect(source).toContain("已归档课程需先恢复为草稿后再进入课时管理");
  });

  it("returns delete eligibility reasons for courses with lessons, class links, or enrollments per COURSE-05", async () => {
    const { getTeacherCourseDetailDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseDetailDTO({ courseId: "course-draft-new" });

    expect(dto.deleteEligibility.canDelete).toBe(false);
    expect(dto.deleteEligibility.reasons).toEqual([
      expect.objectContaining({ code: "COURSE_HAS_LESSONS", count: 2 }),
      expect.objectContaining({ code: "COURSE_HAS_CLASS_ASSOCIATIONS", count: 2 }),
      expect.objectContaining({ code: "COURSE_HAS_ENROLLMENTS", count: 2 }),
    ]);
    expect(dto.members).toHaveLength(dto.enrollmentCount);
  });

  it("keeps archived course detail readable with membership slices aligned to delete blockers", async () => {
    findManyCourseEnrollments.mockResolvedValueOnce([
      { id: "archived-enrollment-1", courseId: "course-archived", studentId: "student-2" },
    ]);
    findManyCourseClasses.mockResolvedValueOnce([{ courseId: "course-archived", classId: "class-2" }]);

    const { getTeacherCourseDetailDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseDetailDTO({ courseId: "course-archived" });

    expect(dto.status).toBe("archived");
    expect(dto.members).toEqual([
      {
        studentId: "student-2",
        studentName: "周以恒",
        studentNumber: "S-002",
        classLabels: ["七年级二班"],
        enrollmentStatus: "active",
      },
    ]);
    expect(dto.enrollmentCount).toBe(1);
    expect(dto.deleteEligibility.reasons).toEqual([
      expect.objectContaining({ code: "COURSE_HAS_CLASS_ASSOCIATIONS", count: 1 }),
      expect.objectContaining({ code: "COURSE_HAS_ENROLLMENTS", count: 1 }),
    ]);
  });

  it("deletes eligible teacher-owned courses only after delete guardrails pass", async () => {
    findFirstCourses.mockResolvedValueOnce({
      id: "course-published-newer",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "整本书阅读",
      subject: "语文",
      grade: "八年级",
      status: "published",
      updatedAt: new Date("2026-05-09T09:00:00.000Z"),
    });
    findManyLessons.mockResolvedValueOnce([]);
    findManyCourseClasses.mockResolvedValueOnce([]);
    findManyCourseEnrollments.mockResolvedValueOnce([]);

    const { deleteCourseForTeacherScoped } = await import("./course-authoring");

    const result = await deleteCourseForTeacherScoped({
      courseId: "course-published-newer",
      confirmationText: "整本书阅读",
    });

    expect(result).toEqual({
      id: "course-published-newer",
      title: "整本书阅读",
    });
    expect(dbDelete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
  });
});
