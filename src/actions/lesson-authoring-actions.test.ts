import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { createLessonDraft, assertActiveTeacher, getLessonPublishReadinessDTO, publishLesson } = vi.hoisted(() => ({
  createLessonDraft: vi.fn(),
  assertActiveTeacher: vi.fn(),
  getLessonPublishReadinessDTO: vi.fn(),
  publishLesson: vi.fn(),
}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  addLessonStep: vi.fn(),
  assertActiveTeacher,
  archiveLesson: vi.fn(),
  archiveLessonStep: vi.fn(),
  createCourseForTeacher: vi.fn(),
  createLessonDraft,
  duplicateLesson: vi.fn(),
  duplicateLessonStep: vi.fn(),
  getLessonPublishReadinessDTO,
  publishLesson,
  reorderLessonStep: vi.fn(),
  updateLessonDraft: vi.fn(),
  updateLessonStep: vi.fn(),
}));

describe("lesson authoring Server Actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
    getLessonPublishReadinessDTO.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: true,
      blockingIssues: [],
    });
  });

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED for lesson create flows", async () => {
    const { createLessonDraftAction } = await import("./lesson-authoring-actions");

    createLessonDraft.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await createLessonDraftAction({
      courseId: "course-1",
      title: "未命名课时",
      objective: "请补充本课时的教学目标。",
    });

    expect(result).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("invalidates teacher and course caches after creating a lesson draft", async () => {
    const { createLessonDraftAction } = await import("./lesson-authoring-actions");

    createLessonDraft.mockResolvedValueOnce({ id: "lesson-1", courseId: "course-1" });

    const result = await createLessonDraftAction({
      courseId: "course-1",
      title: "未命名课时",
      objective: "请补充本课时的教学目标。",
    });

    expect(result).toEqual({ ok: true, data: { id: "lesson-1", courseId: "course-1" } });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  it("maps stale lesson references to NOT_FOUND instead of throwing", async () => {
    const { createLessonDraftAction } = await import("./lesson-authoring-actions");

    createLessonDraft.mockRejectedValueOnce(new Error("COURSE_NOT_FOUND"));

    const result = await createLessonDraftAction({
      courseId: "course-1",
      title: "未命名课时",
      objective: "请补充本课时的教学目标。",
    });

    expect(result).toEqual({
      ok: false,
      error: "NOT_FOUND",
      message: "当前课程、课时或步骤已不存在，请刷新后重试。",
    });
  });

  it("returns a structured blocked result when readiness reports blocking issues", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    getLessonPublishReadinessDTO.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: false,
      blockingIssues: [
        {
          code: "STEP_PAYLOAD_INVALID",
          message: "步骤内容结构无效，请重新编辑后再发布。",
          stepId: "step-1",
        },
      ],
    });

    const result = await publishLessonAction({ lessonId: "lesson-1", expectedRevision: 3 });

    expect(result).toEqual({
      ok: false,
      error: "PUBLISH_BLOCKED",
      message: "发布前检查未通过。",
      issues: [
        {
          code: "STEP_PAYLOAD_INVALID",
          message: "步骤内容结构无效，请重新编辑后再发布。",
          stepId: "step-1",
        },
      ],
    });
    expect(getLessonPublishReadinessDTO).toHaveBeenCalledWith({ lessonId: "lesson-1" });
    expect(publishLesson).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("still invalidates lesson and steps related cache tags on successful publish", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    publishLesson.mockResolvedValueOnce({
      ok: true,
      lessonId: "lesson-1",
      courseId: "course-1",
      version: 2,
    });

    const result = await publishLessonAction({ lessonId: "lesson-1", expectedRevision: 3 });

    expect(result).toEqual({
      ok: true,
      data: {
        ok: true,
        lessonId: "lesson-1",
        courseId: "course-1",
        version: 2,
      },
    });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  it("keeps existing conflict, unauthorized, and not-found mappings on publish", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    publishLesson.mockRejectedValueOnce(new Error("CONFLICT"));
    await expect(publishLessonAction({ lessonId: "lesson-1", expectedRevision: 3 })).resolves.toEqual({
      ok: false,
      error: "CONFLICT",
      message: "检测到更新冲突，请刷新后重试。",
    });

    publishLesson.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));
    await expect(publishLessonAction({ lessonId: "lesson-1", expectedRevision: 3 })).resolves.toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });

    publishLesson.mockRejectedValueOnce(new Error("LESSON_NOT_FOUND"));
    await expect(publishLessonAction({ lessonId: "lesson-1", expectedRevision: 3 })).resolves.toEqual({
      ok: false,
      error: "NOT_FOUND",
      message: "当前课程、课时或步骤已不存在，请刷新后重试。",
    });
  });
});
