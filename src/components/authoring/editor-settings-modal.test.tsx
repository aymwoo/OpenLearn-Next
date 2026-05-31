// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorSettingsModal } from "./editor-settings-modal";

type EditorSettingsLesson = ComponentProps<typeof EditorSettingsModal>["lesson"];

const asEditorSettingsLesson = (value: unknown) => value as EditorSettingsLesson;

const refresh = vi.fn();
const setActiveThemeAction = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/actions/theme-actions", () => ({
  setActiveThemeAction: (...args: unknown[]) => setActiveThemeAction(...args),
}));

vi.mock("@/components/authoring/authoring-status-panel", () => ({
  AuthoringStatusPanel: () => <div>status panel</div>,
}));

describe("EditorSettingsModal", () => {
  beforeEach(() => {
    refresh.mockReset();
    setActiveThemeAction.mockReset();
    setActiveThemeAction.mockResolvedValue({ success: true, data: { themeId: "theme-2" } });

    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("supports preview, save, and apply for theme selection", async () => {
    render(
      <EditorSettingsModal
        lesson={asEditorSettingsLesson({
          lesson: { id: "lesson-1", revision: 2 },
          publishState: { latestVersion: 1 },
          materials: [],
        })}
        activeCourse={{ classLabels: ["七年级一班"] }}
        activeStepCount={3}
        builtInStepCount={1}
        previewHref="/teacher/editor/preview?courseId=course-1&lessonId=lesson-1"
        activeThemeId="theme-1"
        themes={[
          {
            id: "theme-1",
            schoolId: "school-1",
            name: "星夜课堂主题",
            tokenJson: {},
            validationStatus: "valid",
            layoutSummary: {
              shellMode: "left-nav",
              shellLabel: "左侧导航",
              mainSplit: "60/40",
              mainSplitLabel: "主内容 60:40",
              helperRegionSummary: [],
              fallbackRegions: [],
              fallbackLabel: null,
              description: "左侧导航 / 主内容 60:40 / 未启用左侧辅栏 / 未启用上下文侧栏 / 未启用页面底栏",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: "theme-2",
            schoolId: "school-1",
            name: "晨光教务台主题",
            tokenJson: {},
            validationStatus: "valid",
            layoutSummary: {
              shellMode: "top-nav-secondary-rail",
              shellLabel: "顶部导航 + 左侧辅栏",
              mainSplit: "50/50",
              mainSplitLabel: "主内容 50:50",
              helperRegionSummary: [],
              fallbackRegions: ["context-panel"],
              fallbackLabel: "context-panel",
              description: "顶部导航 + 左侧辅栏 / 主内容 50:50 / 启用左侧辅栏 / 启用上下文侧栏 / 未启用页面底栏",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开课时设置" }));
    fireEvent.click(screen.getByRole("button", { name: /晨光教务台主题/ }));

    const applyButton = screen.getByRole("button", { name: "生效" });
    expect((applyButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "预览" }));
    expect(screen.getByText("已更新主题预览：晨光教务台主题")).toBeTruthy();
    expect(screen.getByText("当前预览")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("已保存待生效主题：晨光教务台主题")).toBeTruthy();
    expect((screen.getByRole("button", { name: "生效" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "生效" }));

    await waitFor(() => {
      expect(setActiveThemeAction).toHaveBeenCalledWith({ themeId: "theme-2" });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("applies default theme by clearing the active theme id", async () => {
    render(
      <EditorSettingsModal
        lesson={null}
        activeCourse={{ classLabels: [] }}
        activeStepCount={0}
        builtInStepCount={0}
        previewHref={null}
        activeThemeId="theme-1"
        themes={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开课时设置" }));
    fireEvent.click(screen.getByRole("button", { name: /默认主题/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    fireEvent.click(screen.getByRole("button", { name: "生效" }));

    await waitFor(() => {
      expect(setActiveThemeAction).toHaveBeenCalledWith({ themeId: undefined });
    });
  });
});
