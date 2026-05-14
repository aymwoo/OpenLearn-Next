import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { assertActiveTeacher } = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
}));

const { createCourseForTeacherScoped, updateCourseForTeacherScoped } = vi.hoisted(() => ({
  createCourseForTeacherScoped: vi.fn(),
  updateCourseForTeacherScoped: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/course-authoring", () => ({
  createCourseForTeacherScoped,
  updateCourseForTeacherScoped,
}));

vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    teacherCourses: (actorId: string) => `teacher-courses:${actorId}`,
    course: (courseId: string) => `course:${courseId}`,
  },
}));

describe("createCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("returns validation error when input is incomplete", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    const result = await createCourseAction({
      title: "",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(createCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags on successful creation", async () => {
    const mockCourse = {
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
      status: "draft",
      lessonCount: 0,
      classLabels: [],
      enrollmentCount: 0,
      updatedAt: new Date().toISOString(),
    };
    createCourseForTeacherScoped.mockResolvedValueOnce(mockCourse);

    const { createCourseAction } = await import("./course-authoring-actions");
    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: true,
      data: mockCourse,
    });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("handles generic errors with ACTION_FAILED", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    createCourseForTeacherScoped.mockRejectedValueOnce(new Error("DATABASE_ERROR"));

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: false,
      error: "ACTION_FAILED",
      message: "课程信息暂时没有保存成功，请稍后重试。",
    });
  });

  it("handles ZodError as validation error", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");
    const { z } = await import("zod");

    createCourseForTeacherScoped.mockRejectedValueOnce(new z.ZodError([]));

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
  });
});

describe("updateCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("returns validation error when input is incomplete", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(updateCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("returns success with course detail and invalidates cache tags", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
      lessonCount: 5,
      classLabels: ["八年级一班"],
      classLinks: [{ id: "class-1", name: "八年级一班" }],
      enrollmentCount: 30,
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      id: "course-1",
      title: "更新后的课程",
      status: "published",
    });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("maps COURSE_NOT_FOUND to NOT_FOUND", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new Error("COURSE_NOT_FOUND"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "NOT_FOUND",
      message: "课程不存在或已被移除。",
    });
  });

  it("handles generic errors with ACTION_FAILED", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new Error("DATABASE_ERROR"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "ACTION_FAILED",
      message: "课程信息暂时没有保存成功，请稍后重试。",
    });
  });

  it("handles ZodError as validation error", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");
    const { z } = await import("zod");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new z.ZodError([]));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
  });
});