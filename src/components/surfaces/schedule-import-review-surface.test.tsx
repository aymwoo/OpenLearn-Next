// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScheduleImportReviewSurface } from "./schedule-import-review-surface";

vi.mock("@/features/schedule/import/actions", () => ({
  approveScheduleImportAction: vi.fn(),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("ScheduleImportReviewSurface", () => {
  it("shows a template download link in the hero area", () => {
    render(
      <ScheduleImportReviewSurface
        batch={{
          id: "batch-hero",
          schoolId: "school-1",
          sourceType: "csv",
          sourceLabel: "高一课表导入",
          status: "in_review",
          rowCount: 0,
          approvedRowCount: 0,
          rejectedRowCount: 0,
          createdAt: "2026-05-11T00:00:00.000Z",
          updatedAt: "2026-05-11T00:00:00.000Z",
          rows: [],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "下载导入模板" }).getAttribute("href")).toBe(
      "/teacher/schedule/import/template",
    );
  });

  it("keeps the primary CTA disabled while blocker rows remain", () => {
    render(
      <ScheduleImportReviewSurface
        batch={{
          id: "batch-1",
          schoolId: "school-1",
          sourceType: "csv",
          sourceLabel: "高一课表导入",
          status: "in_review",
          rowCount: 1,
          approvedRowCount: 0,
          rejectedRowCount: 0,
          createdAt: "2026-05-11T00:00:00.000Z",
          updatedAt: "2026-05-11T00:00:00.000Z",
          rows: [
            {
              id: "row-1",
              sourceRowKey: "1",
              status: "conflict_review",
              approvalState: "pending",
              validationIssues: [],
              mappingSummary: {
                termName: "2026 春季",
                weekdayLabel: "周一",
                bellSlotLabel: "第一节",
                className: "高一一班",
                courseTitle: "数学",
                teacherName: "张老师",
                roomLabel: "302",
              },
              conflictSummary: [
                {
                  code: "EXISTING_RECURRING_CONFLICT",
                  title: "冲突",
                  description: "同一节次已有课表。",
                  conflictingTargetLabel: "高一一班 / 第一节",
                },
              ],
              approvalNote: null,
              reviewedById: null,
              reviewedAt: null,
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "审核通过并写入课表" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/冲突待处理/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "下载导入模板" }).getAttribute("href")).toBe(
      "/teacher/schedule/import/template",
    );
  });

  it("shows the empty-state review copy when there is no latest batch yet", () => {
    render(<ScheduleImportReviewSurface batch={null} />);

    expect(screen.getByText("还没有可审核的导入批次。下一步可以先发起导入，再回到这里逐行确认课表映射结果。")).toBeTruthy();
  });
});
