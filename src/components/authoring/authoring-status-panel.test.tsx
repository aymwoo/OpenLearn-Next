// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthoringStatusPanel } from "./authoring-status-panel";

const publishLessonAction = vi.fn();

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
    expect(screen.getByText("内置教学环节当前不可用")).toBeTruthy();
  });
});
