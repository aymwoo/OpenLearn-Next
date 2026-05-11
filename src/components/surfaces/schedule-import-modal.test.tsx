// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduleImportModal } from "./schedule-import-modal";

const mocks = vi.hoisted(() => ({
  draftScheduleImportAction: vi.fn(),
  approveScheduleImportAction: vi.fn(),
  parse: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/features/schedule/import/actions", () => ({
  approveScheduleImportAction: mocks.approveScheduleImportAction,
  draftScheduleImportAction: mocks.draftScheduleImportAction,
}));

vi.mock("papaparse", () => ({
  default: {
    parse: mocks.parse,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: mocks.success,
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

afterEach(() => {
  cleanup();
});

describe("ScheduleImportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    mocks.draftScheduleImportAction.mockResolvedValue({ ok: true, data: { id: "batch-1" } });
    mocks.approveScheduleImportAction.mockResolvedValue({ ok: true, data: { id: "batch-1" } });
    mocks.parse.mockImplementation((_file: File, options: { complete?: (results: { data: Record<string, string>[] }) => void }) => {
      options.complete?.({
        data: [
          {
            "\uFEFF源记录标识": "1",
            " 学期名称 ": "2026 春季学期",
            "星期(0-6)": "1",
            节次标签: "第一节",
            上课开始时间: "8:00",
            上课结束时间: "8:40",
            班级名称: "高一（1）班",
            课程名称: "信息科技",
            教师姓名: "张老师",
            教室标签: "教学楼 302",
          },
        ],
      });
    });
  });

  it("accepts Chinese CSV headers with BOM and whitespace before submitting", async () => {
    const { container } = render(<ScheduleImportModal schoolId="school-1" />);
    const input = container.querySelector('input[type="file"]');

    expect(input).toBeTruthy();

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["csv"], "teacher-schedule-import-template.csv", { type: "text/csv" })],
      },
    });

    await waitFor(() => {
      expect(mocks.draftScheduleImportAction).toHaveBeenCalledTimes(1);
    });

    const formData = mocks.draftScheduleImportAction.mock.calls[0]?.[0] as FormData;

    expect(formData.get("schoolId")).toBe("school-1");
    expect(formData.get("sourceType")).toBe("csv");
    expect(formData.get("sourceLabel")).toBe("teacher-schedule-import-template.csv");
    expect(JSON.parse(String(formData.get("rows")))).toEqual([
      {
        sourceRowKey: "1",
        termName: "2026 春季学期",
        weekday: "1",
        bellSlotLabel: "第一节",
        bellSlotStartTime: "8:00",
        bellSlotEndTime: "8:40",
        className: "高一（1）班",
        courseTitle: "信息科技",
        teacherName: "张老师",
        roomLabel: "教学楼 302",
      },
    ]);
    expect(screen.queryByText("未识别到有效的导入行，请检查 CSV 格式是否符合模板要求。")).toBeNull();
  });

  it("redirects back to the main schedule page after a successful import", async () => {
    vi.useFakeTimers();
    const { container } = render(<ScheduleImportModal schoolId="school-1" />);
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["csv"], "teacher-schedule-import-template.csv", { type: "text/csv" })],
      },
    });

    expect(mocks.draftScheduleImportAction).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(mocks.approveScheduleImportAction).toHaveBeenCalledWith({
      batchId: "batch-1",
      approvedRowIds: [],
      rejectedRowIds: [],
    });
    expect(mocks.success).toHaveBeenCalledWith("课表已导入成功", {
      description: "当前学期课表已回到主视图展示。",
    });
    expect(mocks.push).toHaveBeenCalledWith("/teacher/schedule");
    expect(mocks.refresh).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("skips untouched template sample rows and imports real rows", async () => {
    mocks.parse.mockImplementation((_file: File, options: { complete?: (results: { data: Record<string, string>[] }) => void }) => {
      options.complete?.({
        data: [
          {
            源记录标识: "1",
            学期名称: "2026 春季学期",
            "星期(0-6)": "1",
            节次标签: "第一节",
            上课开始时间: "08:00",
            上课结束时间: "08:45",
            班级名称: "高一（1）班",
            课程名称: "示例高一数学",
            教师姓名: "张老师",
            教室标签: "教学楼 302",
          },
          {
            源记录标识: "2",
            学期名称: "2026 春季学期",
            "星期(0-6)": "2",
            节次标签: "第二节",
            上课开始时间: "09:00",
            上课结束时间: "09:45",
            班级名称: "高一（2）班",
            课程名称: "真实数学",
            教师姓名: "李老师",
            教室标签: "教学楼 305",
          },
        ],
      });
    });

    const { container } = render(<ScheduleImportModal schoolId="school-1" />);
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["csv"], "teacher-schedule-import-template.csv", { type: "text/csv" })],
      },
    });

    await waitFor(() => {
      expect(mocks.draftScheduleImportAction).toHaveBeenCalledTimes(1);
    });

    const formData = mocks.draftScheduleImportAction.mock.calls[0]?.[0] as FormData;
    expect(JSON.parse(String(formData.get("rows")))).toEqual([
      {
        sourceRowKey: "2",
        termName: "2026 春季学期",
        weekday: "2",
        bellSlotLabel: "第二节",
        bellSlotStartTime: "09:00",
        bellSlotEndTime: "09:45",
        className: "高一（2）班",
        courseTitle: "真实数学",
        teacherName: "李老师",
        roomLabel: "教学楼 305",
      },
    ]);
  });

  it("groups blocking reasons into teacher-friendly categories", async () => {
    mocks.draftScheduleImportAction.mockResolvedValue({
      ok: true,
      data: {
        id: "batch-1",
        rows: [
          {
            id: "row-1",
            sourceRowKey: "3",
            status: "mapping_review",
            approvalState: "pending",
            validationIssues: [{ code: "CLASS_NOT_FOUND", message: "未找到对应班级，请先确认班级名称或创建班级映射。", field: "className", severity: "error" }],
            mappingSummary: null,
            conflictSummary: [],
            approvalNote: null,
            reviewedById: null,
            reviewedAt: null,
          },
          {
            id: "row-2",
            sourceRowKey: "4",
            status: "mapping_review",
            approvalState: "pending",
            validationIssues: [{ code: "COURSE_NOT_FOUND", message: "未找到对应课程，请先确认课程标题或创建课程。", field: "courseTitle", severity: "error" }],
            mappingSummary: null,
            conflictSummary: [],
            approvalNote: null,
            reviewedById: null,
            reviewedAt: null,
          },
          {
            id: "row-3",
            sourceRowKey: "5",
            status: "mapping_review",
            approvalState: "pending",
            validationIssues: [{ code: "TEACHER_NOT_FOUND", message: "未找到对应教师，请先确认教师姓名或教师成员关系。", field: "teacherName", severity: "error" }],
            mappingSummary: null,
            conflictSummary: [],
            approvalNote: null,
            reviewedById: null,
            reviewedAt: null,
          },
          {
            id: "row-4",
            sourceRowKey: "6",
            status: "conflict_review",
            approvalState: "pending",
            validationIssues: [],
            mappingSummary: null,
            conflictSummary: [{ code: "EXISTING_RECURRING_CONFLICT", title: "与现有课表冲突", description: "该班级在同一节次已经存在已入库课表，请先调课或拒绝本条导入。", conflictingTargetLabel: "高一（1）班 / 第一节" }],
            approvalNote: null,
            reviewedById: null,
            reviewedAt: null,
          },
          {
            id: "row-5",
            sourceRowKey: "7",
            status: "validation_failed",
            approvalState: "pending",
            validationIssues: [{ code: "INVALID_WEEKDAY", message: "星期字段无效，请改为 0-6 范围内的数字。", field: "weekday", severity: "error" }],
            mappingSummary: null,
            conflictSummary: [],
            approvalNote: null,
            reviewedById: null,
            reviewedAt: null,
          },
        ],
      },
    });

    const { container } = render(<ScheduleImportModal schoolId="school-1" />);
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["csv"], "teacher-schedule-import-template.csv", { type: "text/csv" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("导入已暂存，但还不能自动写入主课表。请先处理以下问题。")).toBeTruthy();
    });

    expect(screen.getByText("班级不存在（1）")).toBeTruthy();
    expect(screen.getByText("课程不存在（1）")).toBeTruthy();
    expect(screen.getByText("教师不存在（1）")).toBeTruthy();
    expect(screen.getByText("冲突（1）")).toBeTruthy();
    expect(screen.getByText("其他（1）")).toBeTruthy();
    expect(screen.getByText("源记录 3：未找到对应班级，请先确认班级名称或创建班级映射。")).toBeTruthy();
    expect(screen.getByText("源记录 4：未找到对应课程，请先确认课程标题或创建课程。")).toBeTruthy();
    expect(screen.getByText("源记录 5：未找到对应教师，请先确认教师姓名或教师成员关系。")).toBeTruthy();
    expect(screen.getByText("源记录 6：该班级在同一节次已经存在已入库课表，请先调课或拒绝本条导入。")).toBeTruthy();
    expect(screen.getByText("源记录 7：星期字段无效，请改为 0-6 范围内的数字。")).toBeTruthy();
    expect(mocks.approveScheduleImportAction).not.toHaveBeenCalled();
  });
});
