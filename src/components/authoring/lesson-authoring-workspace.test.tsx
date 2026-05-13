// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  LessonStepEditor: ({ step }: { step: { id: string; title: string } | null }) => (
    step ? <div data-testid="lesson-step-editor"><span>实时预览</span><span>正在编辑: {step.title}</span></div> : null
  ),
}));

describe("LessonAuthoringWorkspace built-in quick add", () => {
  afterEach(() => {
    cleanup();
  });

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

    expect(screen.getAllByText("内置教学环节").length).toBeGreaterThan(0);
    expect(screen.getByText("2 个可用环节")).toBeTruthy();
    expect(screen.getByRole("button", { name: "教师讲授" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "课堂测验" })).toBeTruthy();
    expect(screen.queryByText("面向全班进行重点讲授。")).toBeNull();
    expect(screen.queryByText("用简短测验即时检查掌握情况。")).toBeNull();
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

    if (!(explanationCard instanceof HTMLElement)) {
      throw new Error("Expected explanation card container to be an HTMLElement");
    }

    fireEvent.click(within(explanationCard).getByRole("button", { name: "下移" }));

    await waitFor(() => {
      expect(reorderLessonStepAction).toHaveBeenCalledWith({
        stepId: "step-2",
        lessonId: "lesson-1",
        beforeRank: "c0",
        afterRank: null,
      });
    });
  });

  it("renders built-in source badges inside the integrated flow composition workspace", () => {
    render(
      <LessonAuthoringWorkspace
        overview={{ courses: [{ id: "course-1" }], lessons: [{ id: "lesson-1" }] } as any}
        lesson={{
          lesson: { id: "lesson-1" },
          materials: [],
          steps: [
            {
              id: "step-1",
              title: "教师讲授",
              type: "content",
              rank: "a0",
              archivedAt: null,
              payload: {
                type: "content",
                title: "教师讲授",
                body: "讲解关键概念。",
                materialRefs: [],
                builtInSource: {
                  pluginId: "plugin-1",
                  builtInKey: "directInstruction",
                  pluginName: "教师讲授",
                },
              },
            },
            {
              id: "step-2",
              title: "课堂练习",
              type: "task",
              rank: "b0",
              archivedAt: null,
              payload: {
                type: "task",
                prompt: "完成课堂练习。",
                submissionType: "text",
                materialRefs: [],
              },
            },
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    expect(screen.getAllByTestId("lesson-flow-composer")[0]).toBeTruthy();
    expect(screen.getAllByText("内置环节 · 教师讲授").length).toBeGreaterThan(0);
    expect(screen.getAllByText("流程主线")[0]).toBeTruthy();
    expect(screen.queryByText("当前编排概览")).toBeNull();
    expect(screen.queryByText("有效步骤")).toBeNull();
    expect(screen.queryByText("课堂流程组件")).toBeNull();
    expect(screen.queryByText("资源库")).toBeNull();
    expect(screen.queryByRole("button", { name: "筛选资源" })).toBeNull();
  });

  it("shows inferred teaching-design fallback cues without blocking lesson editing", () => {
    render(
      <LessonAuthoringWorkspace
        overview={{ courses: [{ id: "course-1" }], lessons: [{ id: "lesson-1" }] } as any}
        lesson={{
          lesson: { id: "lesson-1" },
          materials: [],
          steps: [
            {
              id: "step-1",
              title: "旧版导入",
              type: "content",
              rank: "a0",
              teachingDesignStatus: "inferred",
              needsTeachingDesignRefinement: true,
              teachingDesignFallbackReason: "legacy-content-default",
              archivedAt: null,
              payload: {
                type: "content",
                title: "旧版导入",
                body: "从旧版课时继承的步骤。",
                materialRefs: [],
                teachingDesign: {
                  activityIntent: "explain",
                  estimatedMinutes: 12,
                  activityMode: "mini-lecture",
                  evidenceExpectation: {
                    evidenceType: "observation",
                    prompt: "观察学生是否能复述关键概念。",
                    required: false,
                    checklist: [],
                    tags: ["legacy-default"],
                    studentVisibility: "teacher-only",
                  },
                },
              },
              updatedAt: "2026-05-12T10:00:00.000Z",
            },
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    expect(screen.getByText("默认推断")).toBeTruthy();
    expect(screen.getByText("待完善")).toBeTruthy();
    expect(document.body.textContent).toContain("默认推断：系统按旧版环节补齐教学设计，当前仍可继续编辑与发布。");
    expect(document.body.textContent).toContain("证据期待：观察学生是否能复述关键概念。");
    expect(screen.getByRole("button", { name: "编辑组件" })).toBeTruthy();
  });

  it("uses teaching-design estimated minutes in flow cards and totals", () => {
    render(
      <LessonAuthoringWorkspace
        overview={{ courses: [{ id: "course-1" }], lessons: [{ id: "lesson-1" }] } as any}
        lesson={{
          lesson: { id: "lesson-1" },
          materials: [],
          steps: [
            {
              id: "step-1",
              title: "分组实验",
              type: "task",
              rank: "a0",
              teachingDesignStatus: "explicit",
              needsTeachingDesignRefinement: false,
              teachingDesignFallbackReason: null,
              archivedAt: null,
              payload: {
                type: "task",
                prompt: "完成课堂练习。",
                submissionType: "text",
                materialRefs: [],
                teachingDesign: {
                  activityIntent: "practice",
                  estimatedMinutes: 18,
                  activityMode: "group",
                  evidenceExpectation: {
                    evidenceType: "artifact",
                    prompt: "提交实验记录",
                    required: true,
                    checklist: [],
                    tags: [],
                    studentVisibility: "teacher-only",
                  },
                },
              },
              updatedAt: "2026-05-12T10:00:00.000Z",
            },
            {
              id: "step-2",
              title: "旧版导入",
              type: "content",
              rank: "b0",
              teachingDesignStatus: "inferred",
              needsTeachingDesignRefinement: true,
              teachingDesignFallbackReason: "legacy-content-default",
              archivedAt: null,
              payload: {
                type: "content",
                title: "旧版导入",
                body: "从旧版课时继承的步骤。",
                materialRefs: [],
              },
              updatedAt: "2026-05-12T10:10:00.000Z",
            },
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    const explicitCard = screen.getAllByText("分组实验")[0]?.closest("div.group");
    const legacyCard = screen.getAllByText("旧版导入")[0]?.closest("div.group");

    expect(explicitCard).toBeTruthy();
    expect(legacyCard).toBeTruthy();

    if (!(explicitCard instanceof HTMLElement) || !(legacyCard instanceof HTMLElement)) {
      throw new Error("Expected flow step card container to be an HTMLElement");
    }

    expect(within(explicitCard).getByText("预计时长")).toBeTruthy();
    expect(within(explicitCard).getByText("18 分钟")).toBeTruthy();
    expect(within(legacyCard).getByText("预计时长")).toBeTruthy();
    expect(within(legacyCard).getByText("12 分钟")).toBeTruthy();
    expect(screen.getByText("总时长约 30 分钟")).toBeTruthy();
  });

  it("keeps the same fallback wording in teacher preview surfaces", () => {
    const source = readFileSync("src/components/surfaces/teacher-lesson-preview-surface.tsx", "utf8");

    expect(source).toContain("默认推断");
    expect(source).toContain("待完善");
    expect(source).toContain("系统按旧版环节补齐教学设计");
  });

  it("opens the step editor modal from the explicit flow-card edit button", () => {
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
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    expect(screen.queryByTestId("lesson-step-editor")).toBeNull();

    const explanationCard = screen.getAllByText("讲解")[0]?.closest("div.group");

    expect(explanationCard).toBeTruthy();

    if (!(explanationCard instanceof HTMLElement)) {
      throw new Error("Expected explanation card container to be an HTMLElement");
    }

    fireEvent.click(within(explanationCard).getByRole("button", { name: "编辑组件" }));

    expect(screen.getByRole("dialog", { name: "编辑教学环节" })).toBeTruthy();
    expect(screen.getByTestId("lesson-step-editor").textContent).toContain("讲解");
    expect(screen.getByText("实时预览")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "关闭编辑环节" }));

    expect(screen.queryByRole("dialog", { name: "编辑教学环节" })).toBeNull();
    expect(screen.queryByTestId("lesson-step-editor")).toBeNull();
  });

  it("saves the active step from the flow header save button", async () => {
    const saveListener = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener("lesson-step-editor:save-request", saveListener);

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
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    fireEvent.click(screen.getByTestId("lesson-flow-save-button"));

    await waitFor(() => expect(saveListener).toHaveBeenCalledTimes(1));
    expect(screen.getByText("正在保存当前打开的教学环节。")).toBeTruthy();

    window.removeEventListener("lesson-step-editor:save-request", saveListener);
  });

  it("shows auto-saved feedback when no step editor is open", () => {
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
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    fireEvent.click(screen.getByTestId("lesson-flow-save-button"));

    expect(screen.getByText("流程中的新增、排序和删除改动已自动保存。")).toBeTruthy();
  });

  it("no longer keeps a standalone step editor mounted below the flow by default", () => {
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
          ],
        } as any}
        builtInTemplates={[]}
      />,
    );

    expect(screen.queryByTestId("lesson-step-editor")).toBeNull();
    expect(screen.queryByTestId("lesson-step-editor-modal")).toBeNull();
  });

  it("removes the standalone vertical bar above the course end marker", () => {
    const source = readFileSync("src/components/authoring/lesson-authoring-workspace.tsx", "utf8");

    expect(source).toContain("课程结束");
    expect(source).not.toContain('absolute left-[1rem] bottom-full h-8 w-1 rounded-full bg-surface-variant');
  });

  it("does not wrap lesson-flow-composer in a Card section shell", () => {
    const source = readFileSync("src/components/authoring/lesson-authoring-workspace.tsx", "utf8");

    expect(source).toContain('data-testid="lesson-flow-composer"');
    expect(source).not.toContain('<Card className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-5">');
  });
});
