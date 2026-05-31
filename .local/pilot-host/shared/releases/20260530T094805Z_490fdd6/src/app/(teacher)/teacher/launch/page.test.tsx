// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeacherLaunchPage from "./page";

const getClassroomConsoleDTO = vi.fn();
const classroomLaunchSurface = vi.fn();
const source = readFileSync("src/app/(teacher)/teacher/launch/page.tsx", "utf8");

vi.mock("@/features/runtime-platform/launch", () => ({
  getClassroomConsoleDTO: () => getClassroomConsoleDTO(),
}));

vi.mock("@/components/surfaces/classroom-launch-surface", () => ({
  ClassroomLaunchSurface: (props: unknown) => {
    classroomLaunchSurface(props);
    return <div>classroom launch surface</div>;
  },
}));

describe("TeacherLaunchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClassroomConsoleDTO.mockResolvedValue({
      publishedLessons: [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ],
      sessionEntries: [],
      emptyStateCopy: "暂无可开课课时",
      launchPreviewEmptyState: {
        title: "先选择一个已发布课时",
        description: "选定课时后会显示课堂节奏预览。",
      },
    });
  });

  it("continues to feed the launch surface with the published-snapshot console DTO", async () => {
    render(await TeacherLaunchPage());

    expect(screen.getByText("classroom launch surface")).toBeTruthy();
    expect(getClassroomConsoleDTO).toHaveBeenCalledTimes(1);
    expect(classroomLaunchSurface).toHaveBeenCalledWith(
      expect.objectContaining({
        consoleData: expect.objectContaining({
          publishedLessons: [expect.objectContaining({ publishedVersionId: "pub-1" })],
        }),
      }),
    );
  });

  it("keeps the route on the launch console boundary instead of introducing a runtime host entry", () => {
    expect(source).toContain("@/features/runtime-platform/launch");
    expect(source).toContain("getClassroomConsoleDTO");
    expect(source).not.toContain("invokeRuntimeHostAction");
    expect(source).not.toContain("runtime-host");
  });
});
