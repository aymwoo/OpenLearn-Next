// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeacherEditorPreviewPage from "./page";

const getTeacherAuthoringOverview = vi.fn();
const getTeacherLessonPreviewDTO = vi.fn();
const teacherLessonPreviewSurface = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  getTeacherAuthoringOverview: () => getTeacherAuthoringOverview(),
  getTeacherLessonPreviewDTO: (...args: unknown[]) => getTeacherLessonPreviewDTO(...args),
}));

vi.mock("@/components/surfaces/teacher-lesson-preview-surface", () => ({
  TeacherLessonPreviewSurface: (props: unknown) => {
    teacherLessonPreviewSurface(props);
    return <div>teacher lesson preview surface</div>;
  },
}));

describe("TeacherEditorPreviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeacherAuthoringOverview.mockResolvedValue({
      courses: [{ id: "course-1", title: "七年级科学" }],
      lessons: [{ id: "lesson-1", courseId: "course-1", title: "第一课" }],
    });
    getTeacherLessonPreviewDTO.mockResolvedValue({
      course: { id: "course-1", title: "七年级科学" },
      lesson: { id: "lesson-1", title: "第一课", objective: "观察与讲解" },
      steps: [
        {
          id: "step-1",
          lessonId: "lesson-1",
          type: "content",
          title: "教师讲授",
          rank: "a0",
          payload: { type: "content", title: "教师讲授", body: "讲解重点", materialRefs: [] },
          updatedAt: "2026-05-10T09:30:00.000Z",
          builtInSourceLabel: "教师讲授",
        },
      ],
      materials: [],
    });
  });

  it("requires explicit courseId and lessonId query params", async () => {
    render(await TeacherEditorPreviewPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("请从 editor 内带着明确课时进入课堂预览")).toBeTruthy();
    expect(getTeacherLessonPreviewDTO).not.toHaveBeenCalled();
  });

  it("blocks preview when the lesson is outside the current course-aware editor scope", async () => {
    getTeacherAuthoringOverview.mockResolvedValue({
      courses: [{ id: "course-1", title: "七年级科学" }],
      lessons: [{ id: "lesson-2", courseId: "course-2", title: "别的课时" }],
    });

    render(
      await TeacherEditorPreviewPage({
        searchParams: Promise.resolve({ courseId: "course-1", lessonId: "lesson-1" }),
      }),
    );

    expect(screen.getByText("当前预览上下文已失效")).toBeTruthy();
    expect(getTeacherLessonPreviewDTO).not.toHaveBeenCalled();
  });

  it("loads teacher-owned draft preview data instead of student runtime state", async () => {
    render(
      await TeacherEditorPreviewPage({
        searchParams: Promise.resolve({ courseId: "course-1", lessonId: "lesson-1" }),
      }),
    );

    expect(getTeacherLessonPreviewDTO).toHaveBeenCalledWith({ lessonId: "lesson-1" });
    expect(screen.getByText("teacher lesson preview surface")).toBeTruthy();
    expect(teacherLessonPreviewSurface).toHaveBeenCalledWith(
      expect.objectContaining({
        preview: expect.objectContaining({
          lesson: expect.objectContaining({ id: "lesson-1" }),
        }),
      }),
    );
  });
});
