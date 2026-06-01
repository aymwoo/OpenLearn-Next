import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const assertActiveTeacher = vi.fn();
const mockDispatchPlatformCommand = vi.fn();
const mockBuildLessonDraftCommand = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/resources", () => ({
  createTeacherResource: vi.fn(),
}));

// D-04：accept/discard 经 Command Bus 派发，不再直连 DAL。
// 此处 stub bus + producer，既阻断 bus → registry → handler → DAL → next-auth 的急切加载链，
// 又允许断言 action 是否正确构建并派发命令。
vi.mock("@/features/platform-core/commands/bus", () => ({
  dispatchPlatformCommand: mockDispatchPlatformCommand,
}));

vi.mock("@/features/platform-core/commands/producers/lesson-draft", () => ({
  buildLessonDraftCommand: mockBuildLessonDraftCommand,
  lessonDraftCommandBusDependencies: {},
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  addLessonStep: vi.fn(),
  applyDraftToLiveLesson: vi.fn(),
  assertActiveTeacher,
  archiveLesson: vi.fn(),
  archiveLessonStep: vi.fn(),
  createLessonDraft: vi.fn(),
  discardDraftLessonVersion: vi.fn(),
  duplicateLesson: vi.fn(),
  duplicateLessonStep: vi.fn(),
  getLessonPublishReadinessDTO: vi.fn(),
  publishLesson: vi.fn(),
  reorderLessonStep: vi.fn(),
  saveVotingLessonStepConfig: vi.fn(),
  updateLessonDraft: vi.fn(),
  updateLessonStep: vi.fn(),
}));

describe("applyDraftLessonVersionAction + discardDraftLessonVersionAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
    mockBuildLessonDraftCommand.mockReturnValue({ type: "stub-command" });
  });

  // ── applyDraftLessonVersionAction ───────────────────────────────────────────

  it("dispatches a lesson.draft.accept command and returns { ok: true } on valid input", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockResolvedValueOnce({
      resultSummary: { lessonId: "lesson-1", courseId: "course-1", version: 1, appliedStepCount: 3 },
    });

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: true });
    expect(mockBuildLessonDraftCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lesson.draft.accept",
        payload: expect.objectContaining({ lessonId: "lesson-1", draftVersionId: "draft-1" }),
      }),
    );
    expect(mockDispatchPlatformCommand).toHaveBeenCalledTimes(1);
  });

  it("merges optional editedSteps into the dispatched command payload", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockResolvedValueOnce({
      resultSummary: { lessonId: "lesson-1", courseId: "course-1", version: 1, appliedStepCount: 2 },
    });

    await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
      editedSteps: [
        { index: 0, title: "编辑标题", description: "描述", content: "正文" },
      ],
    });

    expect(mockBuildLessonDraftCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lesson.draft.accept",
        payload: expect.objectContaining({
          lessonId: "lesson-1",
          draftVersionId: "draft-1",
          editedSteps: expect.arrayContaining([
            expect.objectContaining({ index: 0, title: "编辑标题", description: "描述", content: "正文" }),
          ]),
        }),
      }),
    );
  });

  it("invalidates draftLesson, lesson, steps, course, and teacherCourses cache tags after success", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockResolvedValueOnce({
      resultSummary: { lessonId: "lesson-1", courseId: "course-1", version: 1, appliedStepCount: 2 },
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
    expect(mockDispatchPlatformCommand).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when draftVersionId is missing", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockDispatchPlatformCommand).not.toHaveBeenCalled();
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

    mockDispatchPlatformCommand.mockRejectedValueOnce(new Error("DRAFT_NOT_PENDING"));

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "DRAFT_NOT_PENDING" });
    expect("message" in result && typeof result.message === "string").toBe(true);
  });

  it("maps DRAFT_NOT_FOUND to structured error", async () => {
    const { applyDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockRejectedValueOnce(new Error("DRAFT_NOT_FOUND"));

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  // ── discardDraftLessonVersionAction ──────────────────────────────────────────

  it("dispatches a lesson.draft.discard command and returns { ok: true } on valid input", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockResolvedValueOnce({
      resultSummary: { lessonId: "lesson-1", draftVersionId: "draft-1", version: 1 },
    });

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: true });
    expect(mockBuildLessonDraftCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lesson.draft.discard",
        payload: expect.objectContaining({ lessonId: "lesson-1", draftVersionId: "draft-1" }),
      }),
    );
    expect(mockDispatchPlatformCommand).toHaveBeenCalledTimes(1);
  });

  it("invalidates draftLesson and lesson cache tags after success", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockResolvedValueOnce({
      resultSummary: { lessonId: "lesson-1", draftVersionId: "draft-1", version: 1 },
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
    expect(mockDispatchPlatformCommand).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when draftVersionId is missing", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockDispatchPlatformCommand).not.toHaveBeenCalled();
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

    mockDispatchPlatformCommand.mockRejectedValueOnce(new Error("DRAFT_NOT_PENDING"));

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "DRAFT_NOT_PENDING" });
    expect("message" in result && typeof result.message === "string").toBe(true);
  });

  it("maps DRAFT_NOT_FOUND to structured error for discard", async () => {
    const { discardDraftLessonVersionAction } = await import("./lesson-authoring-actions");

    mockDispatchPlatformCommand.mockRejectedValueOnce(new Error("DRAFT_NOT_FOUND"));

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });
});
