// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonEditorHeaderActions } from "./lesson-editor-header-actions";

type LessonEditorHeaderLesson = ComponentProps<typeof LessonEditorHeaderActions>["lesson"];

const asLessonEditorHeaderLesson = (value: unknown) => value as LessonEditorHeaderLesson;

const publishLessonAction = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/actions/lesson-authoring-actions", () => ({
  publishLessonAction: (...args: unknown[]) => publishLessonAction(...args),
}));

vi.mock("@/components/authoring/editor-settings-modal", () => ({
  EditorSettingsModal: () => <button type="button">设置</button>,
}));

describe("LessonEditorHeaderActions", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    publishLessonAction.mockReset();
    publishLessonAction.mockResolvedValue({ ok: true, data: { lessonId: "lesson-1" } });
    refresh.mockReset();
  });

  it("saves the active step through the shared editor command bus", async () => {
    const saveListener = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener("lesson-step-editor:save-request", saveListener);

    render(
      <LessonEditorHeaderActions
        lesson={asLessonEditorHeaderLesson({
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
          },
          publishState: { canPublish: true },
          materials: [],
        })}
        activeCourse={{ classLabels: [] }}
        activeStepCount={2}
        builtInStepCount={1}
        previewHref="/teacher/editor/preview?courseId=course-1&lessonId=lesson-1"
        themes={[]}
        activeThemeId={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));

    await waitFor(() => expect(saveListener).toHaveBeenCalledTimes(1));
    expect(screen.getByText("正在保存当前打开的教学环节。")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();

    window.removeEventListener("lesson-step-editor:save-request", saveListener);
  });

  it("publishes from the top action bar and refreshes the route on success", async () => {
    render(
      <LessonEditorHeaderActions
        lesson={asLessonEditorHeaderLesson({
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
          },
          publishState: { canPublish: true },
          materials: [],
        })}
        activeCourse={{ classLabels: [] }}
        activeStepCount={2}
        builtInStepCount={1}
        previewHref="/teacher/editor/preview?courseId=course-1&lessonId=lesson-1"
        themes={[]}
        activeThemeId={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "发布课时" }));

    await waitFor(() => expect(publishLessonAction).toHaveBeenCalledWith({ lessonId: "lesson-1", expectedRevision: 3 }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText("发布成功，学生端将读取最新已发布版本。")).toBeTruthy();
  });

  it("keeps preview and publish actions while surfacing a /teacher/launch handoff", () => {
    render(
      <LessonEditorHeaderActions
        lesson={asLessonEditorHeaderLesson({
          lesson: { id: "lesson-1", revision: 3 },
          preparationSummary: {
            launchHref: "/teacher/launch?courseId=course-1&lessonId=lesson-1",
          },
          publishState: { canPublish: true },
          materials: [],
        })}
        activeCourse={{ classLabels: [] }}
        activeStepCount={2}
        builtInStepCount={1}
        previewHref="/teacher/editor/preview?courseId=course-1&lessonId=lesson-1"
        themes={[]}
        activeThemeId={null}
      />,
    );

    expect(screen.getByRole("link", { name: "预览课堂" }).getAttribute("href")).toBe(
      "/teacher/editor/preview?courseId=course-1&lessonId=lesson-1",
    );
    expect(screen.getByRole("link", { name: "开课准备" }).getAttribute("href")).toBe(
      "/teacher/launch?courseId=course-1&lessonId=lesson-1",
    );
    expect(screen.getByRole("button", { name: "发布课时" })).toBeTruthy();
    expect(screen.getByText("开课前可进入 `/teacher/launch` 检查整班启动摘要与课堂节奏。")).toBeTruthy();
    expect(publishLessonAction).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
