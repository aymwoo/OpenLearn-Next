// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeacherEditorPage from "./page";

const assertActiveTeacher = vi.fn();
const getTeacherAuthoringOverview = vi.fn();
const getLessonEditorDTO = vi.fn();
const listBuiltInTeachingStepTemplates = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: () => assertActiveTeacher(),
  getTeacherAuthoringOverview: () => getTeacherAuthoringOverview(),
  getLessonEditorDTO: (...args: unknown[]) => getLessonEditorDTO(...args),
}));

vi.mock("@/lib/dal/plugins", () => ({
  listBuiltInTeachingStepTemplates: (...args: unknown[]) => listBuiltInTeachingStepTemplates(...args),
}));

vi.mock("@/components/surfaces/lesson-editor-surface", () => ({
  LessonEditorSurface: () => <div>lesson editor shell</div>,
}));

vi.mock("@/components/plugins/plugin-renderer", () => ({
  PluginRenderer: () => <div>plugin renderer</div>,
}));

describe("TeacherEditorPage runtime branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
    listBuiltInTeachingStepTemplates.mockResolvedValue([]);
  });

  it("shows course-aware guidance when courseId is missing per D-12", async () => {
    getTeacherAuthoringOverview.mockResolvedValue({ courses: [], lessons: [] });

    render(await TeacherEditorPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("请先从课程内课时入口进入 editor")).toBeTruthy();
    expect(screen.queryByText("lesson editor shell")).toBeNull();
  });

  it("returns only empty-lesson guidance when the scoped course has no lesson", async () => {
    getTeacherAuthoringOverview.mockResolvedValue({
      courses: [
        {
          id: "course-1",
          title: "七年级科学",
          subject: "科学",
          classLabels: [],
          enrollmentCount: 0,
        },
      ],
      lessons: [],
    });

    render(
      await TeacherEditorPage({
        searchParams: Promise.resolve({ courseId: "course-1" }),
      }),
    );

    expect(screen.getByText("七年级科学 还没有可编辑的课时")).toBeTruthy();
    expect(screen.getByRole("link", { name: "返回课程内课时入口" }).getAttribute("href")).toBe(
      "/teacher/courses/course-1/lessons",
    );
    expect(screen.queryByText("lesson editor shell")).toBeNull();
  });

  it("requires an explicit lessonId instead of defaulting to the first lesson", async () => {
    getTeacherAuthoringOverview.mockResolvedValue({
      courses: [
        {
          id: "course-1",
          title: "七年级科学",
          subject: "科学",
          classLabels: [],
          enrollmentCount: 0,
        },
      ],
      lessons: [
        {
          id: "lesson-1",
          courseId: "course-1",
          title: "第一课",
        },
      ],
    });

    render(
      await TeacherEditorPage({
        searchParams: Promise.resolve({ courseId: "course-1" }),
      }),
    );

    expect(screen.getByText("请先从 七年级科学 的课时入口选择要编辑的课时")).toBeTruthy();
    expect(screen.queryByText("lesson editor shell")).toBeNull();
    expect(getLessonEditorDTO).not.toHaveBeenCalled();
  });
});
