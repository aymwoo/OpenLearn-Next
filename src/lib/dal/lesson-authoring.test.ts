import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstCourses = vi.fn();
const findManyCourses = vi.fn();
const findManyLessons = vi.fn();
const findManyLessonSteps = vi.fn();
const findManyCourseEnrollments = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyClasses = vi.fn();
const findManyClassMembers = vi.fn();
const selectCourseClassNames = vi.fn();
const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => selectCourseClassNames(),
        }),
      }),
    }),
    query: {
      courses: { findFirst: findFirstCourses, findMany: findManyCourses },
      lessons: { findFirst: vi.fn(), findMany: findManyLessons },
      lessonSteps: { findFirst: vi.fn(), findMany: findManyLessonSteps },
      courseEnrollments: { findMany: findManyCourseEnrollments },
      courseClasses: { findMany: findManyCourseClasses },
      classes: { findMany: findManyClasses },
      classMembers: { findMany: findManyClassMembers },
      lessonMaterials: { findMany: vi.fn() },
      publishedLessonVersions: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

const source = readFileSync("src/lib/dal/lesson-authoring.ts", "utf8");

describe("lesson authoring DAL boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "teacher", status: "active" },
    ]);

    findManyCourses.mockResolvedValue([
      {
        id: "course-owned",
        schoolId: "school-1",
        ownerId: "teacher-1",
        title: "我的课程",
        subject: "科学",
        grade: "七年级",
        status: "draft",
        updatedAt: new Date("2026-05-09T08:00:00.000Z"),
      },
      {
        id: "course-foreign",
        schoolId: "school-1",
        ownerId: "teacher-2",
        title: "同校其他教师课程",
        subject: "历史",
        grade: "七年级",
        status: "published",
        updatedAt: new Date("2026-05-09T09:00:00.000Z"),
      },
    ]);

    findManyLessons.mockResolvedValue([
      {
        id: "lesson-owned",
        courseId: "course-owned",
        title: "我的课时",
        objective: "观察现象",
        status: "draft",
        revision: 1,
        publishedVersionId: null,
        updatedAt: new Date("2026-05-09T08:30:00.000Z"),
      },
    ]);

    findManyLessonSteps.mockResolvedValue([{ id: "step-1", lessonId: "lesson-owned", archivedAt: null }]);
    findManyCourseEnrollments.mockResolvedValue([{ id: "enrollment-1", courseId: "course-owned" }]);
    findManyCourseClasses.mockResolvedValue([{ courseId: "course-owned", classId: "class-1" }]);
    findManyClasses.mockResolvedValue([{ id: "class-1", schoolId: "school-1", name: "七年级一班" }]);
    findManyClassMembers.mockResolvedValue([{ id: "member-1", classId: "class-1", role: "student" }]);
    selectCourseClassNames.mockResolvedValue([{ className: "七年级一班" }]);
    findFirstCourses.mockResolvedValue(null);
  });

  it("is server-only and enforces teacher authorization", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain("TEACHER_AUTH_REQUIRED");
  });

  it("validates payloads and DTOs", () => {
    expect(source).toContain("lessonStepPayloadSchema.parse");
    expect(source).toContain("LessonEditorDTOSchema.parse");
  });

  it("uses rank reorder and stable published snapshots", () => {
    expect(source).toContain("createRankBetween");
    expect(source).toContain("publishedLessonVersions");
    expect(source).toContain("snapshotJson");
  });

  it("persists updated lesson step payloads and bumps lesson revision", () => {
    expect(source).toContain("export async function updateLessonStep");
    expect(source).toContain("lessonStepPayloadSchema.parse(input.payload)");
    expect(source).toContain("revision: lesson.revision + 1");
    expect(source).toContain("await getScopedStep");
    expect(source).toContain("getLessonEditorDTO");
  });

  it("enforces course ownership for lesson authoring reads and writes", () => {
    expect(source).toContain("course.ownerId !== scope.userId");
    expect(source).toContain("courseRows.filter((course) => course.ownerId === scope.userId)");
  });

  it("resolves editor classes from linked class ids instead of class name matching", () => {
    expect(source).toContain("async function getCourseClassDtos");
    expect(source).toContain("db.query.courseClasses.findMany");
    expect(source).not.toContain("courseDto.classLabels.includes(classDto.name)");
  });

  it("returns only teacher-owned courses and lessons in the authoring overview", async () => {
    const { getTeacherAuthoringOverview } = await import("./lesson-authoring");

    const overview = await getTeacherAuthoringOverview();

    expect(overview.courses.map((course) => course.id)).toEqual(["course-owned"]);
    expect(overview.lessons.map((lesson) => lesson.id)).toEqual(["lesson-owned"]);
  });
});
