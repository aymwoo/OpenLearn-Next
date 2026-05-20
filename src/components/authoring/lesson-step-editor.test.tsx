// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { afterEach } from "vitest";

import { LessonStepEditor } from "./lesson-step-editor";
import type { LessonStepDTO } from "@/lib/dto/lesson-authoring";

const { RevealMock } = vi.hoisted(() => {
  const RevealMock = vi.fn().mockImplementation(function RevealMock() {
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      slide: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      getIndices: vi.fn(() => ({ h: 0 })),
    };
  });

  return { RevealMock };
});

const autosaveLessonStepAction = vi.fn();
const uploadLessonMarkdownAssetAction = vi.fn();

vi.mock("@/actions/lesson-authoring-actions", () => ({
  autosaveLessonStepAction: (...args: unknown[]) => autosaveLessonStepAction(...args),
  uploadLessonMarkdownAssetAction: (...args: unknown[]) => uploadLessonMarkdownAssetAction(...args),
}));

vi.mock("reveal.js", () => ({
  default: RevealMock,
}));

type LessonStepFixture = Omit<
  LessonStepDTO,
  "teachingDesignStatus" | "needsTeachingDesignRefinement" | "teachingDesignFallbackReason"
> &
  Partial<
    Pick<
      LessonStepDTO,
      "teachingDesignStatus" | "needsTeachingDesignRefinement" | "teachingDesignFallbackReason"
    >
  >;

function makeStep(step: LessonStepFixture): LessonStepDTO {
  return {
    teachingDesignStatus: "explicit",
    needsTeachingDesignRefinement: false,
    teachingDesignFallbackReason: null,
    ...step,
  };
}

describe("lesson step editor persistence", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    autosaveLessonStepAction.mockReset();
    uploadLessonMarkdownAssetAction.mockReset();
    autosaveLessonStepAction.mockResolvedValue({ ok: true, data: { lessonId: "lesson-1", stepId: "step-1" } });
    uploadLessonMarkdownAssetAction.mockResolvedValue({ ok: true, data: { id: "resource-md-1" } });
  });

  it("submits content payload updates while preserving materialRefs", async () => {
    const step = makeStep({
      id: "step-1",
      lessonId: "lesson-1",
      type: "content",
      title: "原始标题",
      rank: "a0",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      payload: {
        type: "content",
        title: "原始标题",
        body: "原始正文",
        teacherNotes: "原始提示",
        materialRefs: [{ title: "教材链接", kind: "link", url: "https://example.com" }],
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} className="h-full" />
      </div>,
    );

    const preview = screen.getByRole("region", { name: "实时预览" });

    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "更新标题" } });
    fireEvent.change(screen.getByLabelText("正文"), { target: { value: "更新正文" } });
    fireEvent.change(screen.getByLabelText("引用材料"), { target: { value: "新的讲义" } });

    expect(autosaveLessonStepAction).not.toHaveBeenCalled();
    expect(within(preview).getByText("更新标题")).toBeTruthy();
    expect(within(preview).getByText("更新正文")).toBeTruthy();
    expect(within(preview).getByText("新的讲义")).toBeTruthy();
    expect(within(preview).queryByText("预览摘要")).toBeNull();
    expect(within(preview).queryByText("实时预览说明")).toBeNull();

    fireEvent.change(screen.getByLabelText("教师提示"), { target: { value: "更新提示" } });
    fireEvent.click(screen.getByRole("button", { name: "保存步骤" }));

    await waitFor(() => expect(autosaveLessonStepAction).toHaveBeenCalledTimes(1));
    expect(autosaveLessonStepAction).toHaveBeenCalledWith({
      stepId: "step-1",
      title: "更新标题",
      payload: {
        type: "content",
        title: "更新标题",
        body: "更新正文",
        teacherNotes: "更新提示",
        materialRefs: [{ title: "新的讲义", kind: "link", url: undefined }],
        builtInSource: undefined,
      },
    });
    await waitFor(() => expect(screen.getByText("已保存")).toBeTruthy());
  });

  it("submits task payload updates with valid submissionType and successCriteria", async () => {
    const step = makeStep({
      id: "step-2",
      lessonId: "lesson-1",
      type: "task",
      title: "任务标题",
      rank: "a1",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      payload: {
        type: "task",
        prompt: "原始任务",
        submissionType: "text",
        successCriteria: "原始标准",
        allowRetry: true,
        retryPolicy: "once",
        materialRefs: [{ title: "素材", kind: "link" }],
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    const preview = screen.getByRole("region", { name: "实时预览" });

    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "任务更新" } });
    fireEvent.change(screen.getByLabelText("任务说明"), { target: { value: "新的任务说明" } });
    fireEvent.change(screen.getByLabelText("提交要求"), { target: { value: "image" } });
    fireEvent.change(screen.getByLabelText("成功标准"), { target: { value: "提交一张图片" } });

    expect(within(preview).getByText("任务更新")).toBeTruthy();
    expect(within(preview).getByText("新的任务说明")).toBeTruthy();
    expect(within(preview).getByText("提交一张图片")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "保存步骤" }));

    await waitFor(() => expect(autosaveLessonStepAction).toHaveBeenCalledTimes(1));
    expect(autosaveLessonStepAction).toHaveBeenCalledWith({
      stepId: "step-2",
      title: "任务更新",
      payload: {
        type: "task",
        prompt: "新的任务说明",
        submissionType: "image",
        successCriteria: "提交一张图片",
        allowRetry: true,
        retryPolicy: "once",
        materialRefs: [{ title: "素材", kind: "link" }],
        builtInSource: undefined,
      },
    });
  });

  it("submits quiz payload updates with filtered options and numeric correct answer", async () => {
    const step = makeStep({
      id: "step-3",
      lessonId: "lesson-1",
      type: "quiz",
      title: "测验标题",
      rank: "a2",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      payload: {
        type: "quiz",
        question: "原始题目",
        options: ["A", "B"],
        correctOptionIndex: 1,
        explanation: "原始说明",
        allowRetry: true,
        retryPolicy: "unlimited",
        revealCorrectAnswer: true,
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    const preview = screen.getByRole("region", { name: "实时预览" });

    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "测验更新" } });
    fireEvent.change(screen.getByLabelText("题目"), { target: { value: "新的题目" } });
    fireEvent.change(screen.getByLabelText("选项"), { target: { value: "选项一\n\n选项二\n选项三" } });
    fireEvent.change(screen.getByLabelText("正确答案序号"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("答案说明"), { target: { value: "新的说明" } });

    expect(within(preview).getByText("测验更新")).toBeTruthy();
    expect(within(preview).getByText("新的题目")).toBeTruthy();
    expect(within(preview).getByText("新的说明")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "保存步骤" }));

    await waitFor(() => expect(autosaveLessonStepAction).toHaveBeenCalledTimes(1));
    expect(autosaveLessonStepAction).toHaveBeenCalledWith({
      stepId: "step-3",
      title: "测验更新",
      payload: {
        type: "quiz",
        question: "新的题目",
        options: ["选项一", "选项二", "选项三"],
        correctOptionIndex: 2,
        explanation: "新的说明",
        allowRetry: true,
        retryPolicy: "unlimited",
        revealCorrectAnswer: true,
        builtInSource: undefined,
      },
    });
  });

  it("shows built-in source metadata and preserves it during save", async () => {
    const step = makeStep({
      id: "step-4",
      lessonId: "lesson-1",
      type: "content",
      title: "教师讲授",
      rank: "a3",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      payload: {
        type: "content",
        title: "教师讲授",
        body: "原始讲授内容",
        teacherNotes: "关注关键概念",
        materialRefs: [{ title: "投影片", kind: "link" }],
        builtInSource: {
          pluginId: "plugin-1",
          builtInKey: "directInstruction",
          pluginName: "教师讲授",
        },
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    expect(screen.getByRole("dialog", { name: "编辑教学环节" })).toBeTruthy();
    expect(screen.getByText("步骤来源")).toBeTruthy();
    expect(screen.getAllByText("内置环节 · 教师讲授").length).toBeGreaterThan(0);
    expect(screen.getByText("directInstruction")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "实时预览" })).getByText("内置环节 · 教师讲授")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "实时预览" })).getByText("环节预览")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "教师讲授更新" } });
    fireEvent.change(screen.getByLabelText("正文"), { target: { value: "更新后的讲授内容" } });
    fireEvent.click(screen.getByRole("button", { name: "保存步骤" }));

    await waitFor(() => expect(autosaveLessonStepAction).toHaveBeenCalledTimes(1));
    expect(autosaveLessonStepAction).toHaveBeenCalledWith({
      stepId: "step-4",
      title: "教师讲授更新",
      payload: {
        type: "content",
        title: "教师讲授更新",
        body: "更新后的讲授内容",
        teacherNotes: "关注关键概念",
        materialRefs: [{ title: "投影片", kind: "link" }],
        builtInSource: {
          pluginId: "plugin-1",
          builtInKey: "directInstruction",
          pluginName: "教师讲授",
        },
      },
    });
  });

  it("restores the current form when the shared reset command is fired", async () => {
    const step = makeStep({
      id: "step-5",
      lessonId: "lesson-1",
      type: "content",
      title: "讲解",
      rank: "a4",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      payload: {
        type: "content",
        title: "讲解",
        body: "讲解概念。",
        teacherNotes: "提醒学生做标注。",
        materialRefs: [],
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    fireEvent.change(screen.getByLabelText("正文"), { target: { value: "临时改动" } });
    fireEvent(window, new CustomEvent("lesson-step-editor:reset-request", { bubbles: true, cancelable: true }));

    await waitFor(() => expect((screen.getByLabelText("正文") as HTMLTextAreaElement).value).toBe("讲解概念。"));
    expect(screen.getByText("已恢复到最近一次保存的内容。")).toBeTruthy();
  });

  it("saves markdown content config inside content payload", async () => {
    const step = makeStep({
      id: "step-md",
      lessonId: "lesson-1",
      type: "content",
      title: "Markdown 课件",
      rank: "a5",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      payload: {
        type: "content",
        title: "Markdown 课件",
        body: "说明",
        teacherNotes: "提示",
        materialRefs: [],
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} schoolId="school-1" courseId="course-1" />
      </div>,
    );

    fireEvent.change(screen.getByLabelText("Markdown 标题"), { target: { value: "分数课件" } });
    fireEvent.change(screen.getByLabelText("Markdown 渲染模式"), { target: { value: "reveal" } });
    fireEvent.click(screen.getByRole('checkbox', { name: /启用 Mermaid 渲染/i }));
    fireEvent.change(screen.getByLabelText("Markdown 源码"), { target: { value: "# 第一页\n\n---\n\n# 第二页" } });

    fireEvent.click(screen.getByRole("button", { name: "保存步骤" }));

    await waitFor(() => expect(autosaveLessonStepAction).toHaveBeenCalledTimes(1));
    expect(autosaveLessonStepAction).toHaveBeenCalledWith({
      stepId: "step-md",
      title: "Markdown 课件",
      payload: expect.objectContaining({
        type: "content",
        markdown: expect.anything(),
      }),
    });
  });
});
