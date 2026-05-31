// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CourseImportModal } from "./course-import-modal";

const mocks = vi.hoisted(() => ({
  draftCourseImportAction: vi.fn(),
  parse: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/actions/course-import-actions", () => ({
  draftCourseImportAction: mocks.draftCourseImportAction,
}));

vi.mock("papaparse", () => ({
  default: { parse: mocks.parse },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mocks.success }),
}));

afterEach(() => cleanup());

describe("CourseImportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    mocks.draftCourseImportAction.mockResolvedValue({ ok: true, data: { id: "batch-1" } });
    mocks.parse.mockImplementation((_file: File, options: { complete?: (result: { data: Record<string, string>[] }) => void }) => {
      options.complete?.({
        data: [{ 标题: "七年级科学探究", 学科: "科学", 年级: "七年级", 课程状态: "draft" }],
      });
    });
  });

  it("parses fixed Chinese headers and redirects to review page", async () => {
    const { container } = render(<CourseImportModal schoolId="school-1" />);

    fireEvent.click(screen.getByRole("button", { name: "批量导入课程" }));
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["csv"], "courses.csv", { type: "text/csv" })],
      },
    });

    await waitFor(() => {
      expect(mocks.draftCourseImportAction).toHaveBeenCalledTimes(1);
    });

    expect(mocks.draftCourseImportAction).toHaveBeenCalledWith({
      schoolId: "school-1",
      sourceType: "csv",
      sourceLabel: "courses.csv",
      rows: [{ title: "七年级科学探究", subject: "科学", grade: "七年级", status: "draft" }],
    });
    expect(mocks.push).toHaveBeenCalledWith("/teacher/courses/import/batch-1");
  });
});
