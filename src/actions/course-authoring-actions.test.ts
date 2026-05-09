import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const createCourseForTeacherScoped = vi.fn();
const updateCourseForTeacherScoped = vi.fn();
const assertActiveTeacher = vi.fn();

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/course-authoring", () => ({
  createCourseForTeacherScoped,
  updateCourseForTeacherScoped,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

describe("course authoring Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
  });

  it("D-08 rejects undeclared create fields with VALIDATION_ERROR", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "七年级科学探究",
      subject: "科学",
      grade: "七年级",
      ownerId: "unexpected-field",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(createCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("D-16 blocks updates outside teacher scope", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "课程标题",
      subject: "科学",
      grade: "七年级",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });
  });

  it("D-16 returns the latest course DTO after update succeeds", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    const updatedCourse = {
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程标题",
      subject: "科学",
      grade: "八年级",
      status: "published",
      updatedAt: "2026-05-09T12:20:00.000Z",
    };

    updateCourseForTeacherScoped.mockResolvedValueOnce(updatedCourse);

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程标题",
      subject: "科学",
      grade: "八年级",
      status: "published",
    });

    expect(result).toEqual({ ok: true, data: updatedCourse });
  });

  it("D-17 invalidates teacher list and course detail tags after create and update", async () => {
    const { createCourseAction, updateCourseAction } = await import("./course-authoring-actions");

    createCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-created",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "新课程",
      subject: "数学",
      grade: "七年级",
      status: "draft",
      updatedAt: "2026-05-09T12:20:00.000Z",
    });

    updateCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-created",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "新课程（已更新）",
      subject: "数学",
      grade: "七年级",
      status: "published",
      updatedAt: "2026-05-09T12:21:00.000Z",
    });

    await createCourseAction({
      schoolId: "school-1",
      title: "新课程",
      subject: "数学",
      grade: "七年级",
    });
    await updateCourseAction({
      courseId: "course-created",
      title: "新课程（已更新）",
      subject: "数学",
      grade: "七年级",
      status: "published",
    });

    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-created");
    expect(updateTag).toHaveBeenCalledTimes(4);
  });
});
