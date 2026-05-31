import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const assertActiveTeacher = vi.fn();
const mockApplyDraftToLiveLesson = vi.fn();
const mockDiscardDraftLessonVersion = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
  applyDraftToLiveLesson: mockApplyDraftToLiveLesson,
  discardDraftLessonVersion: mockDiscardDraftLessonVersion,
}));

describe("applyDraftLessonVersionAction + discardDraftLessonVersionAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  // ── applyDraftLessonVersionAction ───────────────────────────────────────────

  it("calls DAL and returns { ok: true } on valid input", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockApplyDraftToLiveLesson.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 3,
    });

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: true });
    expect(mockApplyDraftToLiveLesson).toHaveBeenCalledWith({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });
  });

  it("merges optional editedSteps into DAL call", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockApplyDraftToLiveLesson.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 2,
    });

    await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
      editedSteps: [
        { index: 0, title: "编辑标题", description: "描述", content: "正文" },
      ],
    });

    expect(mockApplyDraftToLiveLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: "lesson-1",
        draftVersionId: "draft-1",
        editedSteps: expect.arrayContaining([
          expect.objectContaining({ index: 0, title: "编辑标题", description: "描述", content: "正文" }),
        ]),
      }),
    );
  });

  it("invalidates draftLesson, lesson, steps, course, and teacherCourses cache tags after success", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockApplyDraftToLiveLesson.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 2,
    });

    await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(updateTag).toHaveBeenCalledWith("draft:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
  });

  it("returns VALIDATION_ERROR when lessonId is missing", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    const result = await applyDraftLessonVersionAction({
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockApplyDraftToLiveLesson).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when draftVersionId is missing", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockApplyDraftToLiveLesson).not.toHaveBeenCalled();
  });

  it("returns UNAUTHORIZED when teacher scope fails", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
  });

  it("maps DRAFT_NOT_PENDING to structured error", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockApplyDraftToLiveLesson.mockRejectedValueOnce(new Error("DRAFT_NOT_PENDING"));

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "DRAFT_NOT_PENDING" });
    expect("message" in result && typeof result.message === "string").toBe(true);
  });

  it("maps DRAFT_NOT_FOUND to structured error", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockApplyDraftToLiveLesson.mockRejectedValueOnce(new Error("DRAFT_NOT_FOUND"));

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  // ── discardDraftLessonVersionAction ──────────────────────────────────────────

  it("calls DAL discard and returns { ok: true } on valid input", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDiscardDraftLessonVersion.mockResolvedValueOnce({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
      discardedAt: "2026-05-31T00:00:00.000Z",
    });

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: true });
    expect(mockDiscardDraftLessonVersion).toHaveBeenCalledWith({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });
  });

  it("invalidates draftLesson and lesson cache tags after success", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDiscardDraftLessonVersion.mockResolvedValueOnce({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
      discardedAt: "2026-05-31T00:00:00.000Z",
    });

    await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(updateTag).toHaveBeenCalledWith("draft:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
  });

  it("returns VALIDATION_ERROR when lessonId is missing", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    const result = await discardDraftLessonVersionAction({
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockDiscardDraftLessonVersion).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when draftVersionId is missing", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockDiscardDraftLessonVersion).not.toHaveBeenCalled();
  });

  it("returns UNAUTHORIZED when teacher scope fails", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
  });

  it("maps DRAFT_NOT_PENDING to structured error for discard", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDiscardDraftLessonVersion.mockRejectedValueOnce(new Error("DRAFT_NOT_PENDING"));

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "DRAFT_NOT_PENDING" });
    expect("message" in result && typeof result.message === "string").toBe(true);
  });

  it("maps DRAFT_NOT_FOUND to structured error for discard", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDiscardDraftLessonVersion.mockRejectedValueOnce(new Error("DRAFT_NOT_FOUND"));

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });
});
