import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteScheduleImportBatchAction, draftScheduleImportAction } from "./actions";

const mocks = vi.hoisted(() => ({
  assertScheduleTeacherScope: vi.fn(),
  draftScheduleImport: vi.fn(),
  approveScheduleImport: vi.fn(),
  deleteScheduleImportBatch: vi.fn(),
  invalidateScheduleImportTags: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/features/schedule/shared/auth", () => ({
  assertScheduleTeacherScope: mocks.assertScheduleTeacherScope,
}));

vi.mock("@/features/schedule/import/server", () => ({
  draftScheduleImport: mocks.draftScheduleImport,
  approveScheduleImport: mocks.approveScheduleImport,
  deleteScheduleImportBatch: mocks.deleteScheduleImportBatch,
}));

vi.mock("@/features/schedule/shared/cache", () => ({
  invalidateScheduleImportTags: mocks.invalidateScheduleImportTags,
}));

describe("schedule import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertScheduleTeacherScope.mockResolvedValue({ userId: "teacher-1" });
    mocks.draftScheduleImport.mockResolvedValue({ id: "batch-1", schoolId: "school-1" });
    mocks.deleteScheduleImportBatch.mockResolvedValue({ id: "batch-1", schoolId: "school-1" });
  });

  it("normalizes JSON rows from FormData with Chinese headers and single-digit times", async () => {
    const formData = new FormData();
    formData.append("schoolId", "school-1");
    formData.append("sourceType", "csv");
    formData.append("sourceLabel", "teacher-schedule-import-template.csv");
    formData.append(
      "rows",
      JSON.stringify([
        {
          "源记录标识": "1",
          学期名称: "2026 春季学期",
          "星期(0-6)": "1",
          节次标签: "第一节",
          上课开始时间: "8:00",
          上课结束时间: "8:40",
          班级名称: "高一（1）班",
          课程名称: "信息科技",
          教师姓名: "张老师",
          教室标签: "教学楼 302",
        },
      ]),
    );

    const result = await draftScheduleImportAction(formData);

    expect(result).toEqual({ ok: true, data: { id: "batch-1", schoolId: "school-1" } });
    expect(mocks.draftScheduleImport).toHaveBeenCalledWith({
      schoolId: "school-1",
      sourceType: "csv",
      sourceLabel: "teacher-schedule-import-template.csv",
      rows: [
        {
          sourceRowKey: "1",
          termName: "2026 春季学期",
          weekday: 1,
          bellSlotLabel: "第一节",
          bellSlotStartTime: "08:00",
          bellSlotEndTime: "08:40",
          className: "高一（1）班",
          courseTitle: "信息科技",
          teacherName: "张老师",
          roomLabel: "教学楼 302",
        },
      ],
    });
    expect(mocks.invalidateScheduleImportTags).toHaveBeenCalledWith(mocks.updateTag, {
      actorId: "teacher-1",
      schoolId: "school-1",
      batchId: "batch-1",
    });
  });

  it("returns validation error when rows JSON is invalid", async () => {
    const formData = new FormData();
    formData.append("schoolId", "school-1");
    formData.append("sourceType", "csv");
    formData.append("sourceLabel", "teacher-schedule-import-template.csv");
    formData.append("rows", "not-json");

    const result = await draftScheduleImportAction(formData);

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR", message: "导入内容不完整，请先检查输入。" });
    expect(mocks.draftScheduleImport).not.toHaveBeenCalled();
  });

  it("deletes an import batch and redirects back to the schedule page", async () => {
    await deleteScheduleImportBatchAction("batch-1");

    expect(mocks.deleteScheduleImportBatch).toHaveBeenCalledWith("batch-1");
    expect(mocks.invalidateScheduleImportTags).toHaveBeenCalledWith(mocks.updateTag, {
      actorId: "teacher-1",
      schoolId: "school-1",
      batchId: "batch-1",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/teacher/schedule");
  });
});
