// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

import { QuizSampleStepCard } from "./quiz-sample-step-card";
import type { LearningStepDTO, RuntimeStepStateDTO } from "@/lib/dto/learning";

const mocks = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  submitQuizSampleAnswerAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.routerRefresh }),
}));

vi.mock("@/actions/classroom-actions", () => ({
  submitQuizSampleAnswerAction: mocks.submitQuizSampleAnswerAction,
}));

const step: LearningStepDTO = {
  id: "step-quiz-sample",
  lessonId: "lesson-1",
  type: "quiz",
  title: "互动答题（样板）",
  rank: "a0",
  pluginContract: null,
  payload: {
    type: "quiz",
    question: "以下哪项正确？",
    options: ["选项 A", "选项 B", "选项 C"],
    materialRefs: [],
    correctOptionIndex: 0,
    builtInSource: {
      pluginId: "builtin-teaching-step-quiz-sample",
      builtInKey: "quizSample",
      pluginName: "互动答题（样板）",
    },
  },
};

const runtimeBase: Pick<RuntimeStepStateDTO, "latestVotingSubmission" | "roundEnded" | "roundStatusCopy"> = {
  latestVotingSubmission: null,
  roundEnded: false,
  roundStatusCopy: "开放作答",
};

describe("QuizSampleStepCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("requires explicit submit instead of auto-submit on option click", async () => {
    mocks.submitQuizSampleAnswerAction.mockResolvedValue({ ok: true, data: { successMessage: "已记录你的答案" } });

    render(<QuizSampleStepCard lessonId="lesson-1" sessionId="session-1" step={step} runtime={runtimeBase} />);

    fireEvent.click(screen.getByRole("button", { name: /选项 B/ }));
    expect(mocks.submitQuizSampleAnswerAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "提交答案" }));

    await waitFor(() => {
      expect(mocks.submitQuizSampleAnswerAction).toHaveBeenCalledWith({
        lessonId: "lesson-1",
        sessionId: "session-1",
        stepId: "step-quiz-sample",
        selectedOption: "B",
      });
    });
  });

  it("shows update-answer state when a latest answer already exists", () => {
    render(
      <QuizSampleStepCard
        lessonId="lesson-1"
        sessionId="session-1"
        step={step}
        runtime={{
          ...runtimeBase,
          latestVotingSubmission: {
            stepId: "step-quiz-sample",
            submittedAt: "2026-06-03T12:00:00.000Z",
            summary: "已记录你的答案",
            payload: { selectedOptionId: "C", selectedOptionIds: ["C"] },
          },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "更新答案" })).toBeTruthy();
    expect(screen.getByText("已记录，可在老师关闭前修改")).toBeTruthy();
  });

  it("becomes read-only after the round closes", () => {
    render(
      <QuizSampleStepCard
        lessonId="lesson-1"
        sessionId="session-1"
        step={step}
        runtime={{
          latestVotingSubmission: {
            stepId: "step-quiz-sample",
            submittedAt: "2026-06-03T12:00:00.000Z",
            summary: "已记录你的答案",
            payload: { selectedOptionId: "A", selectedOptionIds: ["A"] },
          },
          roundEnded: true,
          roundStatusCopy: "本题已关闭，当前答案已冻结",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "更新答案" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByText("本题已关闭，当前答案已冻结")).toHaveLength(2);
  });
});
