// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LessonAuthoringWorkspace } from "./lesson-authoring-workspace";

const { reorderLessonStepAction } = vi.hoisted(() => ({
  reorderLessonStepAction: vi.fn(),
}));

vi.mock("@/actions/lesson-authoring-actions", () => ({
  addLessonStepAction: vi.fn(),
  archiveLessonStepAction: vi.fn(),
  duplicateLessonStepAction: vi.fn(),
  reorderLessonStepAction,
}));

vi.mock("@/components/authoring/lesson-step-editor", () => ({
  LessonStepEditor: () => <div data-testid="lesson-step-editor" />,
}));

describe("LessonAuthoringWorkspace built-in quick add", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only renders enabled built-in teaching steps from the injected template list", () => {
    render(
      <LessonAuthoringWorkspace
        overview={{ courses: [{ id: "course-1" }], lessons: [{ id: "lesson-1" }] } as any}
        lesson={{
          lesson: { id: "lesson-1" },
          materials: [],
          steps: [
            {
              id: "step-1",
              title: "导入",
              type: "content",
              rank: "a0",
              archivedAt: null,
              payload: {
                type: "content",
                title: "导入",
                body: "从图片观察开始。",
                teacherNotes: null,
                materialRefs: [],
              },
            },
          ],
        } as any}
        builtInTemplates={[
          {
            id: "plugin-1",
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
            title: "教师讲授",
            summary: "面向全班进行重点讲授。",
            stepType: "content",
            initialTitle: "教师讲授",
            initialPayload: {
              type: "content",
              title: "教师讲授",
              body: "聚焦本课重点。",
              teacherNotes: "突出关键概念。",
              materialRefs: [],
            },
          },
          {
            id: "plugin-4",
            pluginId: "plugin-4",
            builtInKey: "inClassQuiz",
            pluginName: "课堂测验",
            title: "课堂测验",
            summary: "用简短测验即时检查掌握情况。",
            stepType: "quiz",
            initialTitle: "课堂测验",
            initialPayload: {
              type: "quiz",
              question: "以下哪项最符合本节课重点？",
              options: ["A", "B"],
              explanation: "核对课堂要点。",
              allowRetry: true,
              retryPolicy: "once",
              revealCorrectAnswer: true,
              correctOptionIndex: 0,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("内置教学环节")).toBeTruthy();
    expect(screen.getByText("2 个可用环节")).toBeTruthy();
    expect(screen.getByRole("button", { name: "教师讲授" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "课堂测验" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "问卷调查" })).toBeNull();
    expect(screen.queryByRole("button", { name: "学生探究" })).toBeNull();
    expect(screen.queryByRole("button", { name: "评价" })).toBeNull();
  });

  it("uses the next sibling rank as the lower anchor when moving a step down", async () => {
    render(
      <LessonAuthoringWorkspace
        overview={{ courses: [{ id: "course-1" }], lessons: [{ id: "lesson-1" }] } as any}
        lesson={{
          lesson: { id: "lesson-1" },
          materials: [],
          steps: [
            {
              id: "step-1",
              title: "导入",
              type: "content",
              rank: "a0",
              archivedAt: null,
              payload: { type: "content", title: "导入", body: "从图片观察开始。", materialRefs: [] },
            },
            {
              id: "step-2",
              title: "讲解",
              type: "content",
              rank: "b0",
              archivedAt: null,
              payload: { type: "content", title: "讲解", body: "讲解概念。", materialRefs: [] },
            },
            {
              id: "step-3",
              title: "练习",
              type: "task",
              rank: "c0",
              archivedAt: null,
              payload: { type: "task", prompt: "完成练习", submissionType: "text", materialRefs: [] },
            },
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    const explanationCard = screen.getAllByText("讲解")[0]?.closest("div.group");

    expect(explanationCard).toBeTruthy();

    fireEvent.click(within(explanationCard!).getByRole("button", { name: "下移" }));

    await waitFor(() => {
      expect(reorderLessonStepAction).toHaveBeenCalledWith({
        stepId: "step-2",
        lessonId: "lesson-1",
        beforeRank: "c0",
        afterRank: null,
      });
    });
  });
});
