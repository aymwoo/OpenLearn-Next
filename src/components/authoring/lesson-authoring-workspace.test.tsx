// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LessonAuthoringWorkspace } from "./lesson-authoring-workspace";

vi.mock("@/actions/lesson-authoring-actions", () => ({
  addLessonStepAction: vi.fn(),
  archiveLessonStepAction: vi.fn(),
  duplicateLessonStepAction: vi.fn(),
  reorderLessonStepAction: vi.fn(),
}));

vi.mock("@/components/authoring/lesson-step-editor", () => ({
  LessonStepEditor: () => <div data-testid="lesson-step-editor" />,
}));

describe("LessonAuthoringWorkspace built-in quick add", () => {
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
});
