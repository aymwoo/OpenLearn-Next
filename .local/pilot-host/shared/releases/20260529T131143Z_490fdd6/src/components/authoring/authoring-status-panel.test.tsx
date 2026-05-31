// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthoringStatusPanel } from "./authoring-status-panel";

const publishLessonAction = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/actions/lesson-authoring-actions", () => ({
  publishLessonAction: (...args: unknown[]) => publishLessonAction(...args),
}));

describe("AuthoringStatusPanel", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    publishLessonAction.mockReset();
    publishLessonAction.mockResolvedValue({ ok: true, data: { lessonId: "lesson-1" } });
    refresh.mockReset();
  });

  it("renders structured blocking issues and disables publish when readiness is blocked", () => {
    render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          publishState: {
            canPublish: false,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [
              {
                code: "STEP_PAYLOAD_INVALID",
                message: "步骤 2 的内容结构不完整。",
                stepId: "step-2",
              },
              {
                code: "BUILT_IN_PLUGIN_UNAVAILABLE",
                message: "内置教学环节插件“教师讲授”当前不可用，请替换或重新启用后再发布。",
                pluginId: "plugin-1",
                pluginName: "教师讲授",
                builtInKey: "directInstruction",
              },
            ],
            warnings: [],
          },
        } as any}
      />,
    );

    const blockingGroup = screen.getByLabelText("阻断项");
    expect(within(blockingGroup).getByText("步骤内容结构无效")).toBeTruthy();
    expect(within(blockingGroup).getByText("内置教学环节当前不可用")).toBeTruthy();
    expect(screen.getByRole("button", { name: "发布课时" }).hasAttribute("disabled")).toBe(true);
  });

  it("renders warnings separately and enables publish when there are no blocking issues", () => {
    render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 2,
            totalEstimatedMinutes: 30,
            materialCueCount: 1,
            evidenceReadyStepCount: 2,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: true,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [],
            warnings: [
              {
                code: "LESSON_OBJECTIVE_REQUIRED",
                message: "建议再确认教学目标是否足够明确。",
              },
            ],
          },
        } as any}
      />,
    );

    const warningGroup = screen.getByLabelText("提醒项");
    expect(within(warningGroup).getByText("缺少教学目标")).toBeTruthy();
    expect(screen.getByRole("button", { name: "发布课时" }).hasAttribute("disabled")).toBe(false);
  });

  it("renders preparation summary with 阻断项 / 需关注 / 建议完善 buckets", () => {
    render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 3,
            totalEstimatedMinutes: 42,
            materialCueCount: 1,
            evidenceReadyStepCount: 2,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [
              {
                code: "STEP_PAYLOAD_INVALID",
                message: "步骤 2 的内容结构不完整。",
                stepId: "step-2",
              },
            ],
            attentionIssues: [
              {
                code: "TEACHING_DESIGN_NEEDS_REFINEMENT",
                message: "步骤“分组实验”的教学设计仍需完善。",
                stepId: "step-3",
              },
            ],
            advisoryIssues: [
              {
                code: "MATERIAL_CUES_MISSING",
                message: "步骤“教师讲授”还没有补充材料提示。",
                stepId: "step-1",
              },
            ],
          },
          publishState: {
            canPublish: true,
            latestVersion: 1,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [],
            warnings: [],
          },
        } as any}
      />,
    );

    expect(screen.getByText("开课前摘要")).toBeTruthy();
    expect(screen.getByText("有效步骤")).toBeTruthy();
    expect(screen.getByLabelText("阻断项")).toBeTruthy();
    expect(screen.getByLabelText("需关注")).toBeTruthy();
    expect(screen.getByLabelText("建议完善")).toBeTruthy();
    expect(screen.getByText("教学设计仍需完善")).toBeTruthy();
    expect(screen.getByText("缺少材料提示")).toBeTruthy();
  });

  it("surfaces publish blocked feedback inside the current shell", async () => {
    publishLessonAction.mockResolvedValue({
      ok: false,
      error: "PUBLISH_BLOCKED",
      message: "发布前检查未通过。",
      issues: [
        {
          code: "BUILT_IN_PLUGIN_UNAVAILABLE",
          message: "内置教学环节插件“教师讲授”当前不可用，请替换或重新启用后再发布。",
          pluginId: "plugin-1",
          pluginName: "教师讲授",
          builtInKey: "directInstruction",
        },
      ],
    });

    render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: true,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [],
            warnings: [],
          },
        } as any}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "发布课时" }));

    await waitFor(() => expect(publishLessonAction).toHaveBeenCalledWith({ lessonId: "lesson-1", expectedRevision: 3 }));
    await waitFor(() => expect(screen.getByText("发布前检查未通过，请先处理以下阻断项。")).toBeTruthy());
    expect(refresh).toHaveBeenCalled();
  });

  it("turns the draft save button into a real action instead of a dead button", async () => {
    const saveListener = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener("lesson-step-editor:save-request", saveListener);

    render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: false,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [],
            warnings: [],
          },
        } as any}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));

    await waitFor(() => expect(saveListener).toHaveBeenCalledTimes(1));
    expect(screen.getByText("正在保存当前打开的教学环节。")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();

    window.removeEventListener("lesson-step-editor:save-request", saveListener);
  });

  it("refreshes blocker list from latest lesson props instead of cached first-frame issues", () => {
    const { rerender } = render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: false,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [
              {
                code: "VOTING_PLUGIN_CONFIG_MISSING",
                message: "课堂投票步骤还没有保存正式配置。",
                stepId: "step-1",
              },
            ],
            warnings: [],
          },
        } as any}
      />,
    );

    expect(screen.getByText("课堂投票缺少可发布配置")).toBeTruthy();

    rerender(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 4 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: false,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [
              {
                code: "BUILT_IN_PLUGIN_UNAVAILABLE",
                message: "内置教学环节插件“教师讲授”当前不可用。",
                stepId: "step-2",
                pluginId: "plugin-1",
                pluginName: "教师讲授",
                builtInKey: "directInstruction",
              },
            ],
            warnings: [],
          },
        } as any}
      />,
    );

    expect(screen.queryByText("课堂投票缺少可发布配置")).toBeNull();
    expect(screen.getByText("内置教学环节当前不可用")).toBeTruthy();
  });

  it("shows refresh copy after save-driven lesson prop update", () => {
    const saveListener = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener("lesson-step-editor:save-request", saveListener);

    const { rerender } = render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: false,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [
              {
                code: "VOTING_PLUGIN_CONFIG_MISSING",
                message: "课堂投票步骤还没有保存正式配置。",
                stepId: "step-1",
              },
            ],
            warnings: [],
          },
        } as any}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
    expect(screen.getByText("正在保存当前打开的教学环节。")).toBeTruthy();

    rerender(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 4 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: true,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [],
            warnings: [],
          },
        } as any}
      />,
    );

    expect(screen.getByText("正在刷新发布检查...")).toBeTruthy();
    window.removeEventListener("lesson-step-editor:save-request", saveListener);
  });

  it("updates publish CTA disabled state when refreshed readiness truth changes", () => {
    const { rerender } = render(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: false,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [
              {
                code: "VOTING_PLUGIN_CONFIG_MISSING",
                message: "课堂投票步骤还没有保存正式配置。",
                stepId: "step-1",
              },
            ],
            warnings: [],
          },
        } as any}
      />,
    );

    expect(screen.getByRole("button", { name: "发布课时" }).hasAttribute("disabled")).toBe(true);

    rerender(
      <AuthoringStatusPanel
        lesson={{
          lesson: { id: "lesson-1", revision: 4 },
          preparationSummary: {
            activeStepCount: 1,
            totalEstimatedMinutes: 12,
            materialCueCount: 0,
            evidenceReadyStepCount: 0,
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
            blockingIssues: [],
            attentionIssues: [],
            advisoryIssues: [],
          },
          publishState: {
            canPublish: true,
            latestVersion: null,
            publishedAt: null,
            isDraftHidden: true,
            blockingIssues: [],
            warnings: [],
          },
        } as any}
      />,
    );

    expect(screen.getByRole("button", { name: "发布课时" }).hasAttribute("disabled")).toBe(false);
  });
});
