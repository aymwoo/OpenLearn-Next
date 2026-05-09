import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyClassroomSessions = vi.fn();
const findManyLessons = vi.fn();
const findManyCourses = vi.fn();
const findManyClasses = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyPublishedLessonVersions = vi.fn();
const assertActiveTeacher = vi.fn();
const getCurrentUserDTO = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: { findMany: findManyClassroomSessions },
      lessons: { findMany: findManyLessons },
      courses: { findMany: findManyCourses },
      classes: { findMany: findManyClasses },
      courseClasses: { findMany: findManyCourseClasses },
      publishedLessonVersions: { findMany: findManyPublishedLessonVersions },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

describe("getClassroomConsoleDTO", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    findManyClassroomSessions.mockResolvedValue([]);
    findManyCourses.mockResolvedValue([
      { id: "course-in-scope", schoolId: "school-1", title: "语文课程" },
      { id: "course-out-of-scope", schoolId: "school-2", title: "外校课程" },
    ]);
    findManyLessons.mockResolvedValue([
      {
        id: "lesson-in-scope",
        title: "古诗导读",
        courseId: "course-in-scope",
        status: "published",
        publishedVersionId: "pub-1",
      },
    ]);
    findManyClasses.mockResolvedValue([
      { id: "class-in-scope", name: "一班", schoolId: "school-1" },
    ]);
    findManyCourseClasses.mockResolvedValue([
      { courseId: "course-in-scope", classId: "class-in-scope" },
      { courseId: "course-in-scope", classId: "class-out-of-scope" },
      { courseId: "course-out-of-scope", classId: "class-in-scope" },
    ]);
    findManyPublishedLessonVersions.mockResolvedValue([
      {
        id: "pub-1",
        snapshotJson: {
          lesson: { title: "古诗导读" },
          steps: [
            {
              id: "step-1",
              lessonId: "lesson-in-scope",
              type: "content",
              title: "开场导入",
              rank: "a0",
              payload: {
                type: "content",
                title: "开场导入",
                body: "老师先带学生整体感知文本。",
                teacherNotes: "提示",
                materialRefs: [],
              },
            },
          ],
          materials: [],
        },
      },
    ]);
  });

  it("only returns launchable lessons and classes inside the active teacher school scope", async () => {
    const { getClassroomConsoleDTO } = await import("./classroom");

    const dto = await getClassroomConsoleDTO();

    expect(findManyCourses).toHaveBeenCalledTimes(1);
    expect(findManyLessons).toHaveBeenCalledTimes(1);
    expect(findManyClasses).toHaveBeenCalledTimes(1);
    expect(findManyCourseClasses).toHaveBeenCalledTimes(1);
    expect(dto.publishedLessons).toHaveLength(1);
    expect(dto.publishedLessons[0]?.id).toBe("lesson-in-scope");
    expect(dto.publishedLessons[0]?.classes).toEqual([
      { id: "class-in-scope", name: "一班" },
    ]);
    expect(dto.publishedLessons[0]?.classes.some((clazz) => clazz.id === "class-out-of-scope")).toBe(false);
    expect(findManyCourses).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
    expect(findManyLessons).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
    expect(findManyClasses).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
  });
});
