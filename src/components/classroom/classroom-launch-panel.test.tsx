// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClassroomLaunchPanel } from "./classroom-launch-panel";

const launchClassroomSessionAction = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/actions/classroom-actions", () => ({
  launchClassroomSessionAction: (...args: unknown[]) => launchClassroomSessionAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("ClassroomLaunchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    launchClassroomSessionAction.mockResolvedValue({
      ok: true,
      data: { sessionId: "session-123" },
    });
  });

  it("routes to the exact classroom session returned by the launch action", async () => {
    render(
      <ClassroomLaunchPanel
        publishedLessons={[
          {
            id: "lesson-1",
            title: "古诗导读",
            publishedVersionId: "pub-1",
            courseId: "course-1",
            classes: [{ id: "class-1", name: "一班" }],
            launchPreview: {
              lessonId: "lesson-1",
              lessonTitle: "古诗导读",
              totalEstimatedMinutes: 15,
              stepCount: 1,
              steps: [
                {
                  id: "step-1",
                  order: 1,
                  title: "开场导入",
                  family: "教师讲授",
                  summary: "老师先带学生整体感知文本。",
                  estimatedMinutes: 15,
                  materialCues: [],
                },
              ],
            },
          },
        ]}
        emptyStateCopy="暂无可开课课时"
        launchPreviewEmptyState={{
          title: "先选择一个已发布课时",
          description: "选定课时后会显示课堂节奏预览。",
        }}
        successHref="/classroom"
      />
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "lesson-1" } });

    await waitFor(() => expect(screen.getAllByRole("combobox")).toHaveLength(2));

    fireEvent.change(screen.getAllByRole("combobox")[1]!, { target: { value: "class-1" } });
    fireEvent.click(screen.getByRole("button", { name: "开启新课堂" }));

    await waitFor(() => {
      expect(launchClassroomSessionAction).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/classroom?sessionId=session-123");
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
