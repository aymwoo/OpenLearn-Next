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
const saveQuizSampleLessonStepAction = vi.fn();
const saveVotingLessonStepAction = vi.fn();
const uploadLessonMarkdownAssetAction = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/actions/lesson-authoring-actions", () => ({
  autosaveLessonStepAction: (...args: unknown[]) => autosaveLessonStepAction(...args),
  saveQuizSampleLessonStepAction: (...args: unknown[]) => saveQuizSampleLessonStepAction(...args),
  saveVotingLessonStepAction: (...args: unknown[]) => saveVotingLessonStepAction(...args),
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
    saveQuizSampleLessonStepAction.mockReset();
    saveVotingLessonStepAction.mockReset();
    uploadLessonMarkdownAssetAction.mockReset();
    refresh.mockReset();
    autosaveLessonStepAction.mockResolvedValue({ ok: true, data: { lessonId: "lesson-1", stepId: "step-1" } });
    saveQuizSampleLessonStepAction.mockResolvedValue({ ok: true, data: { lessonId: "lesson-1", stepId: "step-1", publishState: { blockingIssues: [] } } });
    saveVotingLessonStepAction.mockResolvedValue({ ok: true, data: { lessonId: "lesson-1", stepId: "step-1", publishState: { blockingIssues: [] } } });
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
        materialRefs: [],
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
        materialRefs: [],
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

  it("renders dedicated classroom voting editor, hydrates defaults, validates locally, and echoes server errors", async () => {
    const step = makeStep({
      id: "step-voting",
      lessonId: "lesson-1",
      type: "quiz",
      title: "课堂投票",
      rank: "a6",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      pluginAuthoring: {
        persistedConfigJson: null,
        fallbackMessage: null,
      },
      payload: {
        type: "quiz",
        question: "旧题目",
        options: ["A", "B"],
        materialRefs: [],
        allowRetry: false,
        retryPolicy: "none",
        revealCorrectAnswer: false,
        builtInSource: {
          pluginId: "plugin-voting",
          builtInKey: "classroomVoting",
          pluginName: "课堂投票",
        },
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    expect(screen.getByLabelText("课堂投票配置")).toBeTruthy();
    expect(screen.queryByLabelText("正确答案序号")).toBeNull();
    expect(screen.queryByLabelText("答案说明")).toBeNull();
    expect(screen.getByText("已载入课堂投票默认配置，可按本节课需要修改。")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("投票题目"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("投票选项 1"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("参与时长（秒）"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存投票配置" }));

    expect(saveVotingLessonStepAction).not.toHaveBeenCalled();

    saveVotingLessonStepAction.mockResolvedValueOnce({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "配置未通过校验，请先修正红色标记字段。",
      fieldErrors: {
        "executableConfig.prompt": ["请填写投票题目。"],
      },
    });

    fireEvent.change(screen.getByLabelText("投票题目"), { target: { value: "新的投票题目" } });
    fireEvent.change(screen.getByLabelText("投票选项 1"), { target: { value: "选项一" } });
    fireEvent.change(screen.getByLabelText("投票选项 2"), { target: { value: "选项二" } });
    fireEvent.change(screen.getByLabelText("参与时长（秒）"), { target: { value: "90" } });
    await waitFor(() => expect(screen.queryByText("配置未通过校验，请先修正红色标记字段。")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /保存投票配置|正在保存投票配置/ }));

    await waitFor(() => expect(saveVotingLessonStepAction).toHaveBeenCalledTimes(1));
    expect(screen.getByText("请填写投票题目。")).toBeTruthy();
    expect(saveVotingLessonStepAction).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedUpdatedAt: step.updatedAt,
      }),
    );
  });

  it("maps server option row fieldErrors back to the matching option row", async () => {
    const step = makeStep({
      id: "step-voting-row-error",
      lessonId: "lesson-1",
      type: "quiz",
      title: "课堂投票",
      rank: "a9",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      pluginAuthoring: {
        persistedConfigJson: null,
        fallbackMessage: null,
      },
      payload: {
        type: "quiz",
        question: "旧题目",
        options: ["A", "B"],
        materialRefs: [],
        allowRetry: false,
        retryPolicy: "none",
        revealCorrectAnswer: false,
        builtInSource: {
          pluginId: "plugin-voting",
          builtInKey: "classroomVoting",
          pluginName: "课堂投票",
        },
      },
    });

    saveVotingLessonStepAction.mockResolvedValueOnce({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "配置未通过校验，请先修正红色标记字段。",
      fieldErrors: {
        "executableConfig.options.1.label": ["第 2 个选项不能为空。"],
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    fireEvent.change(screen.getByLabelText("投票题目"), { target: { value: "新的投票题目" } });
    fireEvent.change(screen.getByLabelText("投票选项 1"), { target: { value: "选项一" } });
    fireEvent.change(screen.getByLabelText("投票选项 2"), { target: { value: "选项二" } });
    fireEvent.change(screen.getByLabelText("参与时长（秒）"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: /保存投票配置|正在保存投票配置/ }));

    await waitFor(() => expect(saveVotingLessonStepAction).toHaveBeenCalledTimes(1));
    expect(screen.getByText("第 2 个选项不能为空。")).toBeTruthy();
  });

  it("refreshes route after successful voting save", async () => {
    const step = makeStep({
      id: "step-voting-success",
      lessonId: "lesson-1",
      type: "quiz",
      title: "课堂投票",
      rank: "a8",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      pluginAuthoring: {
        persistedConfigJson: null,
        fallbackMessage: null,
      },
      payload: {
        type: "quiz",
        question: "旧题目",
        options: ["A", "B"],
        materialRefs: [],
        allowRetry: false,
        retryPolicy: "none",
        revealCorrectAnswer: false,
        builtInSource: {
          pluginId: "plugin-voting",
          builtInKey: "classroomVoting",
          pluginName: "课堂投票",
        },
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    saveVotingLessonStepAction.mockResolvedValueOnce({
      ok: true,
      data: { lessonId: "lesson-1", stepId: "step-voting-success", publishState: { blockingIssues: [] } },
    });
    fireEvent.change(screen.getByLabelText("投票题目"), { target: { value: "新的投票题目" } });
    fireEvent.change(screen.getByLabelText("投票选项 1"), { target: { value: "选项一" } });
    fireEvent.change(screen.getByLabelText("投票选项 2"), { target: { value: "选项二" } });
    fireEvent.change(screen.getByLabelText("参与时长（秒）"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: /保存投票配置|正在保存投票配置/ }));
    await waitFor(() => expect(saveVotingLessonStepAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("renders quiz sample plugin config card and saves dedicated authoring config", async () => {
    const step = makeStep({
      id: "step-quiz-sample",
      lessonId: "lesson-1",
      type: "quiz",
      title: "互动答题（样板）",
      rank: "a10",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      pluginAuthoring: {
        persistedConfigJson: null,
        fallbackMessage: null,
      },
      payload: {
        type: "quiz",
        question: "旧题目",
        options: ["A", "B"],
        materialRefs: [],
        allowRetry: true,
        retryPolicy: "unlimited",
        revealCorrectAnswer: true,
        correctOptionIndex: 0,
        builtInSource: {
          pluginId: "plugin-quiz-sample",
          builtInKey: "quizSample",
          pluginName: "互动答题（样板）",
        },
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    expect(screen.getByLabelText("互动单选题插件专属配置")).toBeTruthy();
    expect(screen.getByText("互动单选题 · 插件专属配置")).toBeTruthy();
    expect(screen.queryByText("课堂投票配置")).toBeNull();
    expect(screen.getByText("正式答题卡预览")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("选项 A"), { target: { value: "选项 A" } });
    fireEvent.change(screen.getByLabelText("选项 B"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("正确答案"), { target: { value: "D" } });
    fireEvent.click(screen.getByRole("button", { name: "保存题目配置" }));

    expect(saveQuizSampleLessonStepAction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("请填写题干。")).toBeTruthy());

    saveQuizSampleLessonStepAction.mockResolvedValueOnce({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "当前题目配置不完整，请补全题干、有效选项和正确答案后再继续。",
      fieldErrors: {
        "executableConfig.correctOption": ["正确答案必须命中已启用选项。"],
      },
    });

    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "以下哪一项是正确答案？" } });
    fireEvent.change(screen.getByLabelText("选项 B"), { target: { value: "选项 B" } });
    fireEvent.change(screen.getByLabelText("选项 C"), { target: { value: "选项 C" } });
    fireEvent.change(screen.getByLabelText("正确答案"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /保存题目配置|正在保存题目配置/ }));

    await waitFor(() => expect(saveQuizSampleLessonStepAction).toHaveBeenCalledTimes(1));
    expect(screen.getByText("正确答案必须命中已启用选项。")) .toBeTruthy();
    expect(saveQuizSampleLessonStepAction).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginId: "plugin-quiz-sample",
        expectedUpdatedAt: step.updatedAt,
        executableConfig: expect.objectContaining({
          prompt: "以下哪一项是正确答案？",
          correctOption: "B",
        }),
      }),
    );
  });

  it("refreshes route after successful quiz sample save", async () => {
    const step = makeStep({
      id: "step-quiz-sample-success",
      lessonId: "lesson-1",
      type: "quiz",
      title: "互动答题（样板）",
      rank: "a11",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      pluginAuthoring: {
        persistedConfigJson: null,
        fallbackMessage: null,
      },
      payload: {
        type: "quiz",
        question: "旧题目",
        options: ["A", "B"],
        materialRefs: [],
        allowRetry: true,
        retryPolicy: "unlimited",
        revealCorrectAnswer: true,
        correctOptionIndex: 0,
        builtInSource: {
          pluginId: "plugin-quiz-sample",
          builtInKey: "quizSample",
          pluginName: "互动答题（样板）",
        },
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    saveQuizSampleLessonStepAction.mockResolvedValueOnce({
      ok: true,
      data: { lessonId: "lesson-1", stepId: "step-quiz-sample-success", publishState: { blockingIssues: [] } },
    });

    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "新的题目" } });
    fireEvent.change(screen.getByLabelText("选项 A"), { target: { value: "选项 A" } });
    fireEvent.change(screen.getByLabelText("选项 B"), { target: { value: "选项 B" } });
    fireEvent.change(screen.getByLabelText("正确答案"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /保存题目配置|正在保存题目配置/ }));

    await waitFor(() => expect(saveQuizSampleLessonStepAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("falls back to default voting config when persisted config is invalid", () => {
    const step = makeStep({
      id: "step-voting-invalid",
      lessonId: "lesson-1",
      type: "quiz",
      title: "课堂投票",
      rank: "a7",
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      pluginAuthoring: {
        persistedConfigJson: {
          executableConfig: {
            prompt: "",
            options: [{ id: "a", label: "A" }],
          },
        },
        fallbackMessage: "当前投票配置无法解析，已回退到默认值，请重新确认并保存。",
      },
      payload: {
        type: "quiz",
        question: "旧题目",
        options: ["A", "B"],
        materialRefs: [],
        allowRetry: false,
        retryPolicy: "none",
        revealCorrectAnswer: false,
        builtInSource: {
          pluginId: "plugin-voting",
          builtInKey: "classroomVoting",
          pluginName: "课堂投票",
        },
      },
    });

    render(
      <div role="dialog" aria-modal="true" aria-label="编辑教学环节">
        <LessonStepEditor step={step} />
      </div>,
    );

    expect(screen.getByText("当前投票配置无法解析，已回退到默认值，请重新确认并保存。")).toBeTruthy();
    expect((screen.getByLabelText("投票题目") as HTMLTextAreaElement).value).toBe("请选择你当前更认可的判断。");
  });
});
