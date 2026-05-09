import { existsSync, readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyCourses = vi.fn();
const findManyLessons = vi.fn();
const findManyLessonSteps = vi.fn();
const findManyCourseEnrollments = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyClasses = vi.fn();
const assertActiveTeacher = vi.fn();
const cacheLife = vi.fn();
const cacheTag = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife,
  cacheTag,
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      courses: { findMany: findManyCourses },
      lessons: { findMany: findManyLessons },
      lessonSteps: { findMany: findManyLessonSteps },
      courseEnrollments: { findMany: findManyCourseEnrollments },
      courseClasses: { findMany: findManyCourseClasses },
      classes: { findMany: findManyClasses },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

describe("course authoring DAL", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });

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
        ownerId: "teacher-2",
        title: "整本书阅读",
        subject: "语文",
        grade: "八年级",
        status: "published",
        updatedAt: new Date("2026-05-09T09:00:00.000Z"),
      },
      {
        id: "course-draft-older",
        schoolId: "school-1",
        ownerId: "teacher-3",
        title: "函数入门",
        subject: "数学",
        grade: "七年级",
        status: "draft",
        updatedAt: new Date("2026-05-07T10:00:00.000Z"),
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
    ]);

    findManyLessonSteps.mockResolvedValue([
      { id: "step-1", lessonId: "lesson-1", archivedAt: null },
      { id: "step-2", lessonId: "lesson-1", archivedAt: null },
      { id: "step-3", lessonId: "lesson-1", archivedAt: new Date("2026-05-09T09:00:00.000Z") },
      { id: "step-4", lessonId: "lesson-2", archivedAt: null },
      { id: "step-5", lessonId: "lesson-out-of-scope", archivedAt: null },
    ]);

    findManyCourseEnrollments.mockResolvedValue([
      { id: "enrollment-1", courseId: "course-draft-new" },
      { id: "enrollment-2", courseId: "course-draft-new" },
      { id: "enrollment-3", courseId: "course-published-newer" },
      { id: "enrollment-4", courseId: "course-out-of-scope" },
    ]);

    findManyCourseClasses.mockResolvedValue([
      { courseId: "course-draft-new", classId: "class-1" },
      { courseId: "course-draft-new", classId: "class-2" },
      { courseId: "course-archived", classId: "class-2" },
      { courseId: "course-out-of-scope", classId: "class-3" },
    ]);

    findManyClasses.mockResolvedValue([
      { id: "class-1", schoolId: "school-1", name: "七年级一班" },
      { id: "class-2", schoolId: "school-1", name: "七年级二班" },
      { id: "class-3", schoolId: "school-2", name: "外校实验班" },
    ]);
  });

  it("filters to teacher school scope only per D-16 and hides cross-school courses", async () => {
    const { getTeacherCourseCenterDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseCenterDTO();

    expect(dto.courses.map((course) => course.id)).not.toContain("course-out-of-scope");
    expect(dto.courses.every((course) => course.schoolId === "school-1")).toBe(true);
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
    expect(dto.lessons.map((lesson) => lesson.id)).toEqual(["lesson-2", "lesson-1"]);
    expect(dto.lessons[0]).toEqual(expect.objectContaining({ id: "lesson-2", stepCount: 1, status: "published" }));
    expect(dto.lessons[1]).toEqual(expect.objectContaining({ id: "lesson-1", stepCount: 2, status: "draft" }));
  });

  it("returns only current course lesson summaries for the course-aware lessons entry per D-09 D-10", async () => {
    const { getTeacherCourseLessonsEntryDTO } = await import("./course-authoring");

    const dto = await getTeacherCourseLessonsEntryDTO({ courseId: "course-draft-new" });

    expect(dto.course.id).toBe("course-draft-new");
    expect(dto.lessons.map((lesson) => lesson.id)).toEqual(["lesson-2", "lesson-1"]);
    expect(dto.lessons.some((lesson) => lesson.id === "lesson-out-of-scope")).toBe(false);
  });

  it("renders the empty-state primary CTA copy as 新建第一个课时 per D-11", () => {
    const surfacePath = "src/components/surfaces/course-lessons-entry-surface.tsx";

    expect(existsSync(surfacePath)).toBe(true);
    expect(readFileSync(surfacePath, "utf8")).toContain("新建第一个课时");
  });

  it("routes the course detail primary CTA to /teacher/courses/[courseId]/lessons per D-09", () => {
    const source = readFileSync("src/components/surfaces/teacher-course-detail-surface.tsx", "utf8");

    expect(source).toContain("/teacher/courses/");
    expect(source).toContain("/lessons");
  });
});
