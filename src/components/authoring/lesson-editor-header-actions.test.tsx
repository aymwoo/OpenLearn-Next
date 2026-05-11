// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonEditorHeaderActions } from "./lesson-editor-header-actions";

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
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          publishState: { canPublish: true },
          materials: [],
        } as any}
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
        lesson={{
          lesson: { id: "lesson-1", revision: 3 },
          publishState: { canPublish: true },
          materials: [],
        } as any}
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
});
