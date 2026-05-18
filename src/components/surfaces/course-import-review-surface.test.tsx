// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CourseImportBatchDTO } from "@/lib/dto/course-import";

import { CourseImportReviewSurface } from "./course-import-review-surface";

vi.mock("@/actions/course-import-actions", () => ({
  applyCourseImportAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => cleanup());

const batch: CourseImportBatchDTO = {
  id: "batch-1",
  schoolId: "school-1",
  actorId: "teacher-1",
  sourceType: "csv",
  sourceLabel: "courses.csv",
  status: "in_review",
  rowCount: 3,
  summary: { total: 3, readyToCreate: 1, matchedExisting: 1, sameFileConflict: 1, invalid: 0, blocked: 0 },
  applySummary: { created: 0, updated: 0, skipped: 0, failed: 0 },
  latestAsyncTask: null,
  asyncTaskSummary: null,
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
  appliedAt: null,
  rows: [
    {
      id: "row-ready",
      sourceRowKey: "1",
      matchKey: "a",
      row: { title: "课程 A", subject: "科学", grade: "七年级", status: "draft" },
      status: "ready_to_create",
      validationIssues: [],
      matchedCourse: null,
      decision: null,
      result: null,
      resultReason: null,
    },
    {
      id: "row-match",
      sourceRowKey: "2",
      matchKey: "b",
      row: { title: "课程 B", subject: "数学", grade: "七年级", status: "published" },
      status: "matched_existing",
      validationIssues: [],
      matchedCourse: { id: "course-1", ownerId: "teacher-1", title: "课程 B", subject: "数学", grade: "七年级", status: "draft", canUpdate: true },
      decision: "skip",
      result: null,
      resultReason: null,
    },
    {
      id: "row-conflict",
      sourceRowKey: "3",
      matchKey: "c",
      row: { title: "课程 C", subject: "语文", grade: "七年级", status: "draft" },
      status: "same_file_conflict",
      validationIssues: [{ code: "SAME_FILE_CONFLICT", message: "同一批次内存在重复课程键，请保留唯一一行后再导入。", field: null }],
      matchedCourse: null,
      decision: null,
      result: null,
      resultReason: null,
    },
  ],
};

describe("CourseImportReviewSurface", () => {
  it("shows one batch apply CTA and no per-row apply button", () => {
    render(<CourseImportReviewSurface batch={batch} />);

    expect(screen.getByRole("button", { name: "应用本批导入" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "应用该行" })).toBeNull();
  });

  it("renders matched rows with only 更新 and 跳过 decisions", () => {
    render(<CourseImportReviewSurface batch={batch} />);

    expect(screen.getByText("逐行选择“更新”或“跳过”")).toBeTruthy();
    expect(screen.getByRole("button", { name: "更新" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "跳过" })).toBeTruthy();
  });

  it("renders grouped sections for matched, conflict and ready rows", () => {
    render(<CourseImportReviewSurface batch={batch} />);

    expect(screen.getAllByText("待创建课程").length).toBeGreaterThan(0);
    expect(screen.getAllByText("命中已有课程").length).toBeGreaterThan(0);
    expect(screen.getAllByText("同批重复").length).toBeGreaterThan(0);
  });

  it("renders read-only async runtime state after task creation", () => {
    render(
      <CourseImportReviewSurface
        batch={{
          ...batch,
          latestAsyncTask: null,
          asyncTaskSummary: {
            taskId: "task-1",
            status: "queued",
            statusLabel: "排队中",
            isActive: true,
            isTerminal: false,
            shouldFreezeReviewDecisions: true,
            progressPercent: 12,
            progressLabel: "排队中",
            progressNote: null,
            processedRows: 0,
            totalRows: 3,
            latestError: null,
            terminalHeadline: null,
            terminalGuidance: null,
            counts: null,
            batchDetailHref: "/teacher/courses/import/batch-1",
            lastUpdatedAt: "2026-05-15T00:00:00.000Z",
          },
        }}
      />,
    );

    expect(screen.getByText("排队中")).toBeTruthy();
    expect(screen.getByText(/逐行“更新 \/ 跳过”决定已切换为只读/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "应用本批导入" })).toBeNull();
  });

  it("renders exact partial-success headline and guidance", () => {
    render(
      <CourseImportReviewSurface
        batch={{
          ...batch,
          status: "partially_applied",
          applySummary: { created: 1, updated: 0, skipped: 1, failed: 1 },
          latestAsyncTask: null,
          asyncTaskSummary: {
            taskId: "task-2",
            status: "partially_completed",
            statusLabel: "已完成，但有失败项",
            isActive: false,
            isTerminal: true,
            shouldFreezeReviewDecisions: true,
            progressPercent: 100,
            progressLabel: null,
            progressNote: null,
            processedRows: 3,
            totalRows: 3,
            latestError: null,
            terminalHeadline: "已完成，但有失败项",
            terminalGuidance: "请根据失败原因修正 CSV 或处理冲突后，重新创建新的导入任务。",
            counts: { created: 1, updated: 0, skipped: 1, failed: 1 },
            batchDetailHref: "/teacher/courses/import/batch-1",
            lastUpdatedAt: "2026-05-15T00:00:00.000Z",
          },
        }}
      />,
    );

    expect(screen.getAllByText("已完成，但有失败项").length).toBeGreaterThan(0);
    expect(screen.getByText(/重新创建新的导入任务/)).toBeTruthy();
  });
});
