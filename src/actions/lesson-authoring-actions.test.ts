import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { assertActiveTeacher, getLessonPublishReadinessDTO, publishLesson } = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  getLessonPublishReadinessDTO: vi.fn(),
  publishLesson: vi.fn(),
}));

const mockCreateLessonDraft = vi.fn();
const mockDuplicateLesson = vi.fn();
const mockArchiveLesson = vi.fn();
const mockAddLessonStep = vi.fn();
const mockReorderLessonStep = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/resources", () => ({
  createTeacherResource: vi.fn(),
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  addLessonStep: mockAddLessonStep,
  assertActiveTeacher,
  archiveLesson: mockArchiveLesson,
  archiveLessonStep: vi.fn(),
  createCourseForTeacher: vi.fn(),
  createLessonDraft: mockCreateLessonDraft,
  duplicateLesson: mockDuplicateLesson,
  duplicateLessonStep: vi.fn(),
  getLessonPublishReadinessDTO,
  publishLesson,
  reorderLessonStep: mockReorderLessonStep,
  updateLessonDraft: vi.fn(),
  updateLessonStep: vi.fn(),
}));

describe("lesson authoring Server Actions — extended", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  // ── createLessonDraftAction ────────────────────────────────────────────────

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { createLessonDraftAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await createLessonDraftAction({
      courseId: "course-1",
      title: "未命名课时",
      objective: "请补充本课时的教学目标。",
    });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("maps COURSE_NOT_FOUND to NOT_FOUND", async () => {
    const { createLessonDraftAction } = await import("./lesson-authoring-actions");

    mockCreateLessonDraft.mockRejectedValueOnce(new Error("COURSE_NOT_FOUND"));

    const result = await createLessonDraftAction({
      courseId: "course-1",
      title: "未命名课时",
      objective: "请补充本课时的教学目标。",
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("invalidates lesson-authoring cache tags after creating draft", async () => {
    const { createLessonDraftAction } = await import("./lesson-authoring-actions");

    mockCreateLessonDraft.mockResolvedValueOnce({ id: "lesson-1", courseId: "course-1" });

    const result = await createLessonDraftAction({
      courseId: "course-1",
      title: "未命名课时",
      objective: "请补充本课时的教学目标。",
    });

    expect(result).toMatchObject({ ok: true });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  // ── duplicateLessonAction ─────────────────────────────────────────────────

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { duplicateLessonAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await duplicateLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
  });

  it("maps LESSON_NOT_FOUND to NOT_FOUND", async () => {
    const { duplicateLessonAction } = await import("./lesson-authoring-actions");

    mockDuplicateLesson.mockRejectedValueOnce(new Error("LESSON_NOT_FOUND"));

    const result = await duplicateLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("invalidates both original and duplicate lesson cache tags on success", async () => {
    const { duplicateLessonAction } = await import("./lesson-authoring-actions");

    mockDuplicateLesson.mockResolvedValueOnce({ id: "lesson-2", courseId: "course-1" });

    await duplicateLessonAction({ lessonId: "lesson-1" });

    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-2");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-2");
  });

  // ── archiveLessonAction ──────────────────────────────────────────────────

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { archiveLessonAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await archiveLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
  });

  it("maps LESSON_NOT_FOUND to NOT_FOUND", async () => {
    const { archiveLessonAction } = await import("./lesson-authoring-actions");

    mockArchiveLesson.mockRejectedValueOnce(new Error("LESSON_NOT_FOUND"));

    const result = await archiveLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("invalidates lesson and steps cache tags on success", async () => {
    const { archiveLessonAction } = await import("./lesson-authoring-actions");

    mockArchiveLesson.mockResolvedValueOnce({ ok: true, lessonId: "lesson-1", courseId: "course-1" });

    await archiveLessonAction({ lessonId: "lesson-1" });

    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  it("falls back to lesson-only tag when courseId is missing in result", async () => {
    const { archiveLessonAction } = await import("./lesson-authoring-actions");

    mockArchiveLesson.mockResolvedValueOnce({ ok: true, lessonId: "lesson-1" });

    await archiveLessonAction({ lessonId: "lesson-1" });

    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).not.toHaveBeenCalledWith("teacher-courses:teacher-1");
  });

  // ── addLessonStepAction ──────────────────────────────────────────────────

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { addLessonStepAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await addLessonStepAction({
      lessonId: "lesson-1",
      type: "content",
      title: "新步骤",
      payload: { type: "content", title: "新步骤", body: "正文" },
    });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
  });

  it("maps LESSON_NOT_FOUND to NOT_FOUND", async () => {
    const { addLessonStepAction } = await import("./lesson-authoring-actions");

    mockAddLessonStep.mockRejectedValueOnce(new Error("LESSON_NOT_FOUND"));

    const result = await addLessonStepAction({
      lessonId: "lesson-1",
      type: "content",
      title: "新步骤",
      payload: { type: "content", title: "新步骤", body: "正文" },
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("returns VALIDATION_ERROR when payload is missing required fields", async () => {
    const { addLessonStepAction } = await import("./lesson-authoring-actions");

    const result = await addLessonStepAction({ lessonId: "lesson-1", type: "content" });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
  });

  it("invalidates lesson-authoring cache tags on success", async () => {
    const { addLessonStepAction } = await import("./lesson-authoring-actions");

    mockAddLessonStep.mockResolvedValueOnce({
      ok: true,
      lessonId: "lesson-1",
      courseId: "course-1",
      stepId: "step-1",
    });

    await addLessonStepAction({
      lessonId: "lesson-1",
      type: "content",
      title: "新步骤",
      payload: { type: "content", title: "新步骤", body: "正文" },
    });

    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  // ── reorderLessonStepAction ──────────────────────────────────────────────

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { reorderLessonStepAction } = await import("./lesson-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await reorderLessonStepAction({
      stepId: "step-1",
      lessonId: "lesson-1",
      beforeRank: "0|hzzzzz:",
      afterRank: "0|hzzzzz:0|",
    });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
  });

  it("maps STEP_NOT_FOUND to NOT_FOUND", async () => {
    const { reorderLessonStepAction } = await import("./lesson-authoring-actions");

    mockReorderLessonStep.mockRejectedValueOnce(new Error("STEP_NOT_FOUND"));

    const result = await reorderLessonStepAction({
      stepId: "step-1",
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("maps CONFLICT to CONFLICT", async () => {
    const { reorderLessonStepAction } = await import("./lesson-authoring-actions");

    mockReorderLessonStep.mockRejectedValueOnce(new Error("CONFLICT"));

    const result = await reorderLessonStepAction({
      stepId: "step-1",
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("invalidates lesson and steps cache tags on success", async () => {
    const { reorderLessonStepAction } = await import("./lesson-authoring-actions");

    mockReorderLessonStep.mockResolvedValueOnce({
      ok: true,
      lessonId: "lesson-1",
      courseId: "course-1",
      stepId: "step-1",
    });

    await reorderLessonStepAction({ stepId: "step-1", lessonId: "lesson-1" });

    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  // ── publishLessonAction ──────────────────────────────────────────────────

  it("maps CONFLICT to CONFLICT", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    getLessonPublishReadinessDTO.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: true,
      blockingIssues: [],
    });
    publishLesson.mockRejectedValueOnce(new Error("CONFLICT"));

    const result = await publishLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("maps LESSON_NOT_FOUND to NOT_FOUND", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    getLessonPublishReadinessDTO.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: true,
      blockingIssues: [],
    });
    publishLesson.mockRejectedValueOnce(new Error("LESSON_NOT_FOUND"));

    const result = await publishLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("returns blocked result with issues when readiness is false", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    getLessonPublishReadinessDTO.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: false,
      blockingIssues: [
        {
          code: "NO_ACTIVE_STEPS",
          message: "发布前至少需要一个可用的未归档步骤。",
          stepId: null,
        },
      ],
    });

    const result = await publishLessonAction({ lessonId: "lesson-1" });

    expect(result).toMatchObject({ ok: false, error: "PUBLISH_BLOCKED" });
    if (result.ok) {
      throw new Error("expected blocked publish result");
    }

    expect(result).toHaveProperty("issues");
    expect(result.issues).toHaveLength(1);
    expect(publishLesson).not.toHaveBeenCalled();
  });

  it("invalidates cache tags on successful publish", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    getLessonPublishReadinessDTO.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: true,
      blockingIssues: [],
    });

    publishLesson.mockResolvedValueOnce({
      ok: true,
      lessonId: "lesson-1",
      courseId: "course-1",
      version: 1,
    });

    await publishLessonAction({ lessonId: "lesson-1", expectedRevision: 1 });

    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
  });

  it("falls back to lesson-only tags when courseId is missing in publish result", async () => {
    const { publishLessonAction } = await import("./lesson-authoring-actions");

    getLessonPublishReadinessDTO.mockResolvedValueOnce({
      lessonId: "lesson-1",
      courseId: "course-1",
      canPublish: true,
      blockingIssues: [],
    });

    publishLesson.mockResolvedValueOnce({
      ok: true,
      lessonId: "lesson-1",
      version: 1,
    });

    await publishLessonAction({ lessonId: "lesson-1" });

    expect(updateTag).toHaveBeenCalledWith("lesson:lesson-1");
    expect(updateTag).toHaveBeenCalledWith("steps:lesson-1");
    expect(updateTag).not.toHaveBeenCalledWith("teacher-courses:teacher-1");
  });
});
