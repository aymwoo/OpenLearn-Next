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

    expect(screen.getAllByText("排队中").length).toBeGreaterThan(0);
    expect(screen.getByText(/逐行“更新 \/ 跳过”决定已切换为只读/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "应用本批导入" })).toBeNull();
  });

  it("renders honest labels for queued running retrying dispatch_failed partially_completed and failed states", () => {
    const scenarios: Array<{
      status: NonNullable<CourseImportBatchDTO["asyncTaskSummary"]>["status"];
      label: string;
      headline: string | null;
      latestError?: string | null;
      guidance?: string | null;
    }> = [
      { status: "queued", label: "排队中", headline: null },
      { status: "running", label: "导入中", headline: null },
      {
        status: "retrying",
        label: "重试中",
        headline: null,
        latestError: "系统正在根据重试策略继续处理该批次。",
      },
      {
        status: "dispatch_failed",
        label: "未入队",
        headline: "未成功进入队列",
        latestError: "导入任务还没有成功进入队列。请先检查当前批次是否仍可应用，然后重新触发导入。",
      },
      {
        status: "partially_completed",
        label: "已完成，但有失败项",
        headline: "已完成，但有失败项",
        guidance: "请根据失败原因修正 CSV 或处理冲突后，重新创建新的导入任务。",
      },
      {
        status: "failed",
        label: "导入失败",
        headline: "导入失败",
        latestError: "导入任务未能完成，请检查失败原因后重新创建新任务。",
      },
    ];

    for (const scenario of scenarios) {
      const { unmount } = render(
        <CourseImportReviewSurface
          batch={{
            ...batch,
            status:
              scenario.status === "partially_completed" || scenario.status === "failed"
                ? "partially_applied"
                : batch.status,
            latestAsyncTask: null,
            asyncTaskSummary: {
              taskId: `task-${scenario.status}`,
              status: scenario.status,
              statusLabel: scenario.label,
              isActive: scenario.status === "queued" || scenario.status === "running" || scenario.status === "retrying",
              isTerminal:
                scenario.status === "dispatch_failed" ||
                scenario.status === "partially_completed" ||
                scenario.status === "failed",
              shouldFreezeReviewDecisions: true,
              progressPercent: scenario.status === "running" ? 45 : scenario.status === "queued" ? 12 : null,
              progressLabel: scenario.status === "running" ? "导入中" : scenario.status === "queued" ? "排队中" : null,
              progressNote: null,
              processedRows: scenario.status === "running" ? 1 : null,
              totalRows: scenario.status === "running" ? 3 : null,
              latestError: scenario.latestError ?? null,
              terminalHeadline: scenario.headline,
              terminalGuidance: scenario.guidance ?? null,
              counts:
                scenario.status === "partially_completed"
                  ? { created: 1, updated: 0, skipped: 1, failed: 1 }
                  : scenario.status === "failed"
                    ? { created: 0, updated: 0, skipped: 0, failed: 1 }
                    : null,
              batchDetailHref: "/teacher/courses/import/batch-1",
              lastUpdatedAt: "2026-05-15T00:00:00.000Z",
            },
          }}
        />,
      );

      expect(screen.getAllByText(scenario.label).length).toBeGreaterThan(0);
      if (scenario.headline) {
        expect(screen.getAllByText(scenario.headline).length).toBeGreaterThan(0);
      }
      if (scenario.latestError) {
      expect(screen.getByText(scenario.latestError)).toBeTruthy();
      }
      if (scenario.guidance) {
        expect(screen.getByText(scenario.guidance)).toBeTruthy();
      }

      unmount();
    }
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

  it("renders terminal summary before row detail content", () => {
    render(
      <CourseImportReviewSurface
        batch={{
          ...batch,
          status: "partially_applied",
          applySummary: { created: 1, updated: 0, skipped: 1, failed: 1 },
          rows: batch.rows.map((row, index) => ({
            ...row,
            result: index === 0 ? "created" : index === 1 ? "skipped" : "failed",
            resultReason: index === 2 ? "命中了重复键，导入失败。" : "已处理。",
          })),
          latestAsyncTask: null,
          asyncTaskSummary: {
            taskId: "task-summary-order",
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

    const summaryHeading = screen.getByText("结果概览");
    const rowTitle = screen.getByText("课程 A");

    expect(summaryHeading.compareDocumentPosition(rowTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText("created").length).toBeGreaterThan(0);
    expect(screen.getAllByText("failed").length).toBeGreaterThan(0);
    expect(screen.getByText("命中了重复键，导入失败。")).toBeTruthy();
  });
});
