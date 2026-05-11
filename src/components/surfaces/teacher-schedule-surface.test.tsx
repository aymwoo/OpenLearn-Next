// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ScheduleImportBatchDTO } from "@/features/schedule/shared/dto/import";
import type { TeacherWeeklyScheduleDTO } from "@/features/schedule/shared/dto/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeacherScheduleSurface } from "./teacher-schedule-surface";

vi.mock("@/components/surfaces/schedule-import-modal", () => ({
  ScheduleImportModal: () => <button type="button">导入课表</button>,
}));

vi.mock("@/features/schedule/import/actions", () => ({
  deleteScheduleImportBatchAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const historyBatch: ScheduleImportBatchDTO = {
  id: "batch-history",
  schoolId: "school-1",
  sourceType: "csv",
  sourceLabel: "2025 秋季导入",
  status: "applied",
  rowCount: 20,
  approvedRowCount: 20,
  rejectedRowCount: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
  rows: [
    {
      id: "row-history",
      sourceRowKey: "source-history",
      status: "approved",
      approvalState: "approved",
      validationIssues: [],
      mappingSummary: {
        termName: "2025 秋季学期",
        weekdayLabel: "周一",
        bellSlotLabel: "第一节",
        className: "高一一班",
        courseTitle: "数学",
        teacherName: "张老师",
        roomLabel: "302",
      },
      conflictSummary: [],
      approvalNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
  ],
};

const currentBatch: ScheduleImportBatchDTO = {
  ...historyBatch,
  id: "batch-current",
  sourceLabel: "2026 春季导入",
  updatedAt: "2026-05-11T00:00:00.000Z",
  rows: [
    {
      id: "row-current",
      sourceRowKey: "source-current",
      status: "approved",
      approvalState: "approved",
      validationIssues: [],
      mappingSummary: {
        termName: "2026 春季学期",
        weekdayLabel: "周一",
        bellSlotLabel: "第一节",
        className: "高一一班",
        courseTitle: "数学",
        teacherName: "张老师",
        roomLabel: "302",
      },
      conflictSummary: [],
      approvalNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
  ],
};

const baseWeeklySchedule: TeacherWeeklyScheduleDTO = {
  rangeLabel: "05-11 - 05-15",
  weekdays: [
    { key: "2026-05-11", label: "周一 05-11", shortLabel: "周一", isToday: true },
    { key: "2026-05-12", label: "周二 05-12", shortLabel: "周二", isToday: false },
    { key: "2026-05-13", label: "周三 05-13", shortLabel: "周三", isToday: false },
    { key: "2026-05-14", label: "周四 05-14", shortLabel: "周四", isToday: false },
    { key: "2026-05-15", label: "周五 05-15", shortLabel: "周五", isToday: false },
  ],
  rows: [
    {
      slotId: "slot-1",
      bellSlotLabel: "第一节",
      timeLabel: "08:00 - 08:45",
      cells: [
        {
          id: "cell-1",
          weekday: 1,
          weekdayLabel: "周一",
          timeLabel: "08:00 - 08:45",
          bellSlotLabel: "第一节",
          classLabel: "高一一班",
          locationLabel: "302",
          courseTitle: "数学",
          status: "进行中",
          overrideSummary: null,
        },
        null,
        null,
        null,
        null,
      ],
    },
  ],
};

const emptyWeeklySchedule: TeacherWeeklyScheduleDTO = {
  ...baseWeeklySchedule,
  rows: [
    {
      slotId: "slot-1",
      bellSlotLabel: "第一节",
      timeLabel: "08:00 - 08:45",
      cells: [null, null, null, null, null],
    },
  ],
};

describe("TeacherScheduleSurface", () => {
  it("renders the empty state with the exact Chinese copy", () => {
    render(
        <TeacherScheduleSurface
          data={{
            teacherId: "teacher-1",
            schoolId: "school-1",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
            cards: [],
            weeklySchedule: emptyWeeklySchedule,
          }}
        />,
      );

    expect(screen.getByText("当前学期尚未导入课表")).toBeTruthy();
    expect(screen.getByText("先导入当前学期课表，再开始日常维护")).toBeTruthy();
  });

  it("keeps time class location status as the first visible information layer", () => {
    render(
        <TeacherScheduleSurface
          data={{
            teacherId: "teacher-1",
            schoolId: "school-1",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
            cards: [
              {
                id: "card-1",
                recurringEntryId: "entry-1",
              assignmentId: "assignment-1",
              timeLabel: "08:00 - 08:45",
              classLabel: "高一一班",
              locationLabel: "302",
              status: "进行中",
              courseTitle: "数学",
              overrideSummary: null,
                lessonLink: null,
              },
            ],
            weeklySchedule: baseWeeklySchedule,
          }}
          latestImportBatch={currentBatch}
        />,
      );

    expect(screen.getByRole("heading", { level: 2, name: "2026 春季学期课程表" })).toBeTruthy();
    expect(screen.getByText("时间 / 星期")).toBeTruthy();
    expect(screen.getByText("第一节")).toBeTruthy();
  });

  it("uses the lesson link contract instead of guessing courseId from assignmentId", () => {
    render(
      <TeacherScheduleSurface
          data={{
            teacherId: "teacher-1",
            schoolId: "school-1",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
            cards: [
              {
                id: "card-1",
                recurringEntryId: "entry-1",
              assignmentId: "assignment-1",
              timeLabel: "08:00 - 08:45",
              classLabel: "高一一班",
              locationLabel: "302",
              status: "进行中",
              courseTitle: "数学",
              overrideSummary: null,
                lessonLink: {
                  courseId: "course-1",
                  lessonId: "lesson-1",
                  lessonTitle: "函数导入",
                },
              },
            ],
            weeklySchedule: baseWeeklySchedule,
          }}
          latestImportBatch={currentBatch}
        />,
      );

    expect(screen.getByText("下一节课 08:00 - 08:45")).toBeTruthy();
    expect(screen.getByText("已生效")).toBeTruthy();
  });

  it("renders historical term rows with action buttons on the right", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={currentBatch}
        importBatches={[currentBatch, historyBatch]}
      />,
    );

    expect(screen.getByText("2025 秋季学期")).toBeTruthy();
    expect(screen.getByRole("link", { name: "下载 2025 秋季学期 导入批次" }).getAttribute("href")).toBe("/teacher/schedule/export/batch-history");
    expect(screen.getByRole("button", { name: "删除 2025 秋季学期 课表" }).getAttribute("type")).toBe("submit");
    expect(screen.getByRole("link", { name: "更改 2025 秋季学期 课表" }).getAttribute("href")).toBe("/teacher/schedule/changes");
  });

  it("renders the weekly timetable as the current term main section", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={currentBatch}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "2026 春季学期课程表" })).toBeTruthy();
    expect(screen.getByText("时间 / 星期")).toBeTruthy();
    expect(screen.getByText("第一节")).toBeTruthy();
    expect(screen.getAllByText("数学").length).toBeGreaterThan(0);
  });

});
