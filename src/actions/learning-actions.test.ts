import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { markStepProgress, submitTaskAttempt, submitQuizAttempt, saveAttemptFeedback } = vi.hoisted(() => ({
  markStepProgress: vi.fn(),
  submitTaskAttempt: vi.fn(),
  submitQuizAttempt: vi.fn(),
  saveAttemptFeedback: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/learning", () => ({
  markStepProgress,
  submitTaskAttempt,
  submitQuizAttempt,
  saveAttemptFeedback,
}));

vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    progress: (lessonId: string, userId: string) => `progress:${lessonId}:${userId}`,
    submission: (lessonId: string, userId: string) => `submission:${lessonId}:${userId}`,
    teacherReview: (lessonId: string) => `teacher-review:${lessonId}`,
  },
}));

describe("markStepProgressAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when input is invalid", async () => {
    const { markStepProgressAction } = await import("./learning-actions");

    const result = await markStepProgressAction({});

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后重试。",
    });
    expect(markStepProgress).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags on success", async () => {
    const { markStepProgressAction } = await import("./learning-actions");

    markStepProgress.mockResolvedValueOnce({
      ok: true,
      lessonId: "lesson-1",
      studentId: "student-1",
      successMessage: "学习进度已更新",
    });

    const result = await markStepProgressAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      state: "completed",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        ok: true,
        lessonId: "lesson-1",
        studentId: "student-1",
        successMessage: "学习进度已更新",
      },
    });
    expect(updateTag).toHaveBeenCalledWith("progress:lesson-1:student-1");
    expect(updateTag).toHaveBeenCalledWith("teacher-review:lesson-1");
  });

  it("handles DAL errors and returns appropriate error", async () => {
    const { markStepProgressAction } = await import("./learning-actions");

    markStepProgress.mockRejectedValueOnce(new Error("LESSON_INACCESSIBLE"));

    const result = await markStepProgressAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      state: "completed",
    });

    expect(result).toEqual({
      ok: false,
      error: "LESSON_INACCESSIBLE",
      message: "提交暂时失败，请保留当前内容后重试。",
    });
  });

  it("handles ZodError as validation error", async () => {
    const { markStepProgressAction } = await import("./learning-actions");
    const { z } = await import("zod");

    markStepProgress.mockRejectedValueOnce(new z.ZodError([]));

    const result = await markStepProgressAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      state: "completed",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后重试。",
    });
  });
});

describe("submitTaskAttemptAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when input is invalid", async () => {
    const { submitTaskAttemptAction } = await import("./learning-actions");

    const result = await submitTaskAttemptAction({});

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后重试。",
    });
    expect(submitTaskAttempt).not.toHaveBeenCalled();
  });

  it("returns success with fallback message and invalidates cache tags", async () => {
    const { submitTaskAttemptAction } = await import("./learning-actions");

    submitTaskAttempt.mockResolvedValueOnce({
      id: "attempt-1",
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      studentId: "student-1",
      attemptNo: 1,
      payload: { body: "my answer" },
      isLatest: true,
      canRetryTask: false,
      feedback: null,
      createdAt: new Date().toISOString(),
    });

    const result = await submitTaskAttemptAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      payload: { body: "my answer" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful task submission result");
    }

    expect(result.data).toMatchObject({
      id: "attempt-1",
      studentId: "student-1",
      successMessage: "提交已记录，进度稍后同步",
    });
    expect(updateTag).toHaveBeenCalledWith("progress:lesson-1:student-1");
    expect(updateTag).toHaveBeenCalledWith("submission:lesson-1:student-1");
    expect(updateTag).toHaveBeenCalledWith("teacher-review:lesson-1");
  });

  it("handles DAL errors and returns submission failure message", async () => {
    const { submitTaskAttemptAction } = await import("./learning-actions");

    submitTaskAttempt.mockRejectedValueOnce(new Error("RETRY_NOT_ALLOWED"));

    const result = await submitTaskAttemptAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      payload: { body: "my answer" },
    });

    expect(result).toEqual({
      ok: false,
      error: "RETRY_NOT_ALLOWED",
      message: "提交暂时失败，请保留当前内容后重试。",
    });
  });
});

describe("submitQuizAttemptAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when input is invalid", async () => {
    const { submitQuizAttemptAction } = await import("./learning-actions");

    const result = await submitQuizAttemptAction({});

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后重试。",
    });
    expect(submitQuizAttempt).not.toHaveBeenCalled();
  });

  it("returns success with fallback message and invalidates cache tags", async () => {
    const { submitQuizAttemptAction } = await import("./learning-actions");

    submitQuizAttempt.mockResolvedValueOnce({
      id: "attempt-1",
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      studentId: "student-1",
      attemptNo: 1,
      answer: { selectedIndex: 1 },
      outcome: { selectedIndex: 1, isCorrect: true },
      isLatest: true,
      canRetryQuiz: false,
      showCorrectAnswer: false,
      feedback: null,
      createdAt: new Date().toISOString(),
    });

    const result = await submitQuizAttemptAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      answer: { selectedIndex: 1 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful quiz submission result");
    }

    expect(result.data).toMatchObject({
      id: "attempt-1",
      studentId: "student-1",
      successMessage: "提交已记录，进度稍后同步",
    });
    expect(updateTag).toHaveBeenCalledWith("progress:lesson-1:student-1");
    expect(updateTag).toHaveBeenCalledWith("submission:lesson-1:student-1");
    expect(updateTag).toHaveBeenCalledWith("teacher-review:lesson-1");
  });

  it("handles DAL errors and returns submission failure message", async () => {
    const { submitQuizAttemptAction } = await import("./learning-actions");

    submitQuizAttempt.mockRejectedValueOnce(new Error("DUPLICATE_ATTEMPT"));

    const result = await submitQuizAttemptAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      answer: { selectedIndex: 1 },
    });

    expect(result).toEqual({
      ok: false,
      error: "DUPLICATE_ATTEMPT",
      message: "提交暂时失败，请保留当前内容后重试。",
    });
  });

  it("preserves explicit voting contract errors from DAL", async () => {
    const { submitQuizAttemptAction } = await import("./learning-actions");

    submitQuizAttempt.mockRejectedValueOnce(new Error("VOTING_ROUND_CLOSED"));

    const result = await submitQuizAttemptAction({
      publishedVersionId: "pub-ver-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      answer: { selectedOptionIds: ["option-a"] },
    });

    expect(result).toEqual({
      ok: false,
      error: "VOTING_ROUND_CLOSED",
      message: "提交暂时失败，请保留当前内容后重试。",
    });
  });
});

describe("sendAttemptFeedbackAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when input is invalid", async () => {
    const { sendAttemptFeedbackAction } = await import("./learning-actions");

    const result = await sendAttemptFeedbackAction({});

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "反馈最多 200 字，请修改后再发送。",
    });
    expect(saveAttemptFeedback).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags when feedback is saved", async () => {
    const { sendAttemptFeedbackAction } = await import("./learning-actions");

    saveAttemptFeedback.mockResolvedValueOnce({
      id: "feedback-1",
      lessonId: "lesson-1",
      targetType: "task_submission",
      targetId: "attempt-1",
      teacherId: "teacher-1",
      studentId: "student-1",
      body: "很好，继续加油",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await sendAttemptFeedbackAction({
      targetType: "task_submission",
      targetId: "attempt-1",
      body: "很好，继续加油",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "feedback-1",
        lessonId: "lesson-1",
        targetType: "task_submission",
        targetId: "attempt-1",
        teacherId: "teacher-1",
        studentId: "student-1",
        body: "很好，继续加油",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
    expect(updateTag).toHaveBeenCalledWith("submission:lesson-1:student-1");
    expect(updateTag).toHaveBeenCalledWith("teacher-review:lesson-1");
  });

  it("returns success without invalidating tags when lessonId is not returned", async () => {
    const { sendAttemptFeedbackAction } = await import("./learning-actions");

    saveAttemptFeedback.mockResolvedValueOnce({
      id: "feedback-1",
      lessonId: undefined,
      targetType: "quiz_attempt",
      targetId: "quiz-attempt-1",
      teacherId: "teacher-1",
      studentId: "student-1",
      body: "答案正确",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await sendAttemptFeedbackAction({
      targetType: "quiz_attempt",
      targetId: "quiz-attempt-1",
      body: "答案正确",
    });

    expect(result.ok).toBe(true);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("handles DAL errors and returns feedback failure message", async () => {
    const { sendAttemptFeedbackAction } = await import("./learning-actions");

    saveAttemptFeedback.mockRejectedValueOnce(new Error("ATTEMPT_NOT_FOUND"));

    const result = await sendAttemptFeedbackAction({
      targetType: "task_submission",
      targetId: "attempt-1",
      body: "很好，继续加油",
    });

    expect(result).toEqual({
      ok: false,
      error: "ATTEMPT_NOT_FOUND",
      message: "反馈暂时没有发送成功，请保留内容后重试。",
    });
  });
});
