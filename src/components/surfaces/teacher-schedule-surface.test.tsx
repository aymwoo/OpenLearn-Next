// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ScheduleImportBatchDTO } from "@/features/schedule/shared/dto/import";
import type { TeacherWeeklyScheduleDTO } from "@/features/schedule/shared/dto/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeacherScheduleSurface } from "./teacher-schedule-surface";

vi.mock("@/components/surfaces/schedule-import-modal", () => ({
  ScheduleImportModal: () => <button type="button">导入课表</button>,
}));

vi.mock("@/features/schedule/import/actions", () => ({
  deleteScheduleImportBatchAction: vi.fn(),
  setPrimaryScheduleImportBatchAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function getTooltipTextContent() {
  return screen.getByRole("tooltip").textContent ?? "";
}

const historyBatch: ScheduleImportBatchDTO = {
  id: "batch-history",
  schoolId: "school-1",
  sourceType: "csv",
  sourceLabel: "2025 秋季导入",
  status: "applied",
  isPrimary: false,
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
      validationIssues: [
        { code: "CLASS_PENDING_STUDENT_IMPORT", message: "班级“高一一班”已自动创建，请后续导入学生名册。", field: "className", severity: "warning" },
      ],
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
  isPrimary: true,
  updatedAt: "2026-05-11T00:00:00.000Z",
  rows: [
    {
      id: "row-current",
      sourceRowKey: "source-current",
      status: "approved",
      approvalState: "approved",
      validationIssues: [
        { code: "CLASS_PENDING_STUDENT_IMPORT", message: "班级“高一一班”已自动创建，请后续导入学生名册。", field: "className", severity: "warning" },
      ],
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

const pendingBatch: ScheduleImportBatchDTO = {
  ...currentBatch,
  id: "batch-pending",
  sourceLabel: "2026 夏季导入",
  status: "in_review",
  isPrimary: false,
  approvedRowCount: 0,
  updatedAt: "2026-05-12T00:00:00.000Z",
};

const displayOnlyPendingBatch: ScheduleImportBatchDTO = {
  ...currentBatch,
  id: "batch-display-only",
  sourceLabel: "2026 春季导入待补映射",
  status: "in_review",
  isPrimary: true,
  rowCount: 1,
  approvedRowCount: 0,
  updatedAt: "2026-05-12T08:00:00.000Z",
  rows: [
    {
      id: "row-display-only",
      sourceRowKey: "source-display-only",
      status: "mapping_review",
      approvalState: "pending",
      previewSchedule: {
        weekday: 1,
        bellSlotStartTime: "08:00",
        bellSlotEndTime: "08:45",
      },
      validationIssues: [
        { code: "TEACHER_NOT_FOUND", message: "未找到对应教师，请先确认教师姓名或教师成员关系。", field: "teacherName", severity: "error" },
      ],
      mappingSummary: {
        termName: "2026 春季学期",
        weekdayLabel: "周一",
        bellSlotLabel: "第一节",
        className: "高一一班",
        courseTitle: "数学",
        teacherName: "待补教师",
        roomLabel: "302",
      },
      conflictSummary: [],
      approvalNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
  ],
};

const hardBlockedPendingBatch: ScheduleImportBatchDTO = {
  ...displayOnlyPendingBatch,
  id: "batch-hard-blocked",
  sourceLabel: "2026 夏季导入待补课程",
  isPrimary: true,
  rows: [
    {
      ...displayOnlyPendingBatch.rows[0],
      id: "row-hard-blocked",
      validationIssues: [
        { code: "COURSE_NOT_FOUND", message: "未找到对应课程，请先确认课程标题或创建课程。", field: "courseTitle", severity: "error" },
      ],
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
        [
          {
            id: "cell-1",
            weekday: 1,
            weekdayLabel: "周一",
            timeLabel: "08:00 - 08:45",
            bellSlotLabel: "第一节",
            classLabel: "高一一班",
            teacherLabel: null,
            locationLabel: "302",
            courseTitle: "数学",
            status: "进行中",
            overrideSummary: null,
          },
        ],
        [],
        [],
        [],
        [],
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
      cells: [[], [], [], [], []],
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
          viewMode: "teacher",
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

  it("renders a compact class-first weekly card and defers details until interaction", () => {
    render(
        <TeacherScheduleSurface
          data={{
            teacherId: "teacher-1",
            schoolId: "school-1",
          viewMode: "teacher",
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
    expect(screen.getByText("高一一班")).toBeTruthy();
    expect(screen.getByRole("button", { name: "高一一班 数学 快捷操作" })).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("uses the lesson link contract instead of guessing courseId from assignmentId", () => {
    render(
      <TeacherScheduleSurface
          data={{
            teacherId: "teacher-1",
            schoolId: "school-1",
          viewMode: "teacher",
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
    expect(screen.getByText("当前批次有 1 个班级为“待导学生”状态，可去班级管理继续导入学生名册。")).toBeTruthy();
  });

  it("renders historical term rows with action buttons on the right", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
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
    expect(screen.getByText((_, element) => element?.textContent === "待导学生 1")).toBeTruthy();
    expect(screen.getByRole("link", { name: "下载 2025 秋季学期 导入批次" }).getAttribute("href")).toBe("/teacher/schedule/export/batch-history");
    expect(screen.getByRole("button", { name: "删除 2025 秋季学期 课表" }).getAttribute("type")).toBe("submit");
    expect(screen.getByRole("link", { name: "更改 2025 秋季学期 课表" }).getAttribute("href")).toBe("/teacher/schedule/changes");
    expect(screen.getByRole("button", { name: "设为主课表" })).toBeTruthy();
  });

  it("prefers the persisted primary batch over the latest import guess", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={{ ...pendingBatch, isPrimary: false }}
        importBatches={[{ ...currentBatch, isPrimary: true }, { ...pendingBatch, isPrimary: false }, historyBatch]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "2026 春季学期课程表" })).toBeTruthy();
    expect(screen.queryByText("2026 夏季导入课程表")).toBeNull();
  });

  it("renders the weekly timetable as the current term main section", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
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
    expect(screen.getByRole("button", { name: "高一一班 数学 快捷操作" })).toBeTruthy();
  });

  it("does not treat an unapproved latest import batch as the current main schedule", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={pendingBatch}
        importBatches={[pendingBatch, currentBatch, historyBatch]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "2026 春季学期课程表" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "2026 夏季导入课程表" })).toBeNull();
    expect(screen.getByText("20/20 已生效")).toBeTruthy();
  });

  it("treats a latest batch with only class or teacher mapping gaps as the current main schedule", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={displayOnlyPendingBatch}
        importBatches={[displayOnlyPendingBatch, currentBatch, historyBatch]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "2026 春季学期课程表" })).toBeTruthy();
    expect(screen.getByText("导入中")).toBeTruthy();
    expect(screen.getByText("0/1 已生效")).toBeTruthy();
    expect(screen.getByText("当前主课表正在显示最新导入预览，班级、教师或课程映射可后续补齐；正式入库仍需通过审批链路。")).toBeTruthy();
  });

  it("renders the imported preview grid when the latest display-only batch has not entered runtime yet", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
          cards: [],
          weeklySchedule: emptyWeeklySchedule,
        }}
        latestImportBatch={displayOnlyPendingBatch}
        importBatches={[displayOnlyPendingBatch]}
        currentTeacherName="待补教师"
      />,
    );

    expect(screen.queryByText("当前学期尚未导入课表")).toBeNull();
    fireEvent.focus(screen.getByRole("button", { name: "高一一班 数学 快捷操作" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(getTooltipTextContent()).toContain("教师映射待补");
  });

  it("does not fall back to the not-imported empty state when a primary batch exists but has no matching lessons", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
          cards: [],
          weeklySchedule: emptyWeeklySchedule,
        }}
        latestImportBatch={displayOnlyPendingBatch}
        importBatches={[displayOnlyPendingBatch]}
        currentTeacherName="李老师"
      />,
    );

    expect(screen.queryByText("当前学期尚未导入课表")).toBeNull();
    expect(screen.getByText("当前主课表正在显示最新导入预览，班级、教师或课程映射可后续补齐；正式入库仍需通过审批链路。")).toBeTruthy();
    expect(screen.getByText("当前没有匹配到你的授课安排")).toBeTruthy();
  });

  it("treats a latest batch with course mapping gaps as the current main schedule and shows action links", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一节课 08:00 - 08:45",
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={hardBlockedPendingBatch}
        importBatches={[hardBlockedPendingBatch, currentBatch, historyBatch]}
      />,
    );

    expect(screen.getByText("0/1 已生效")).toBeTruthy();
    expect(screen.getByText("当前主课表正在显示最新导入预览，班级、教师或课程映射可后续补齐；正式入库仍需通过审批链路。")).toBeTruthy();
    fireEvent.focus(screen.getByRole("button", { name: "高一一班 数学 快捷操作" }));
    expect(getTooltipTextContent()).toContain("课程映射待补");
    expect(screen.getByRole("link", { name: "新建课程" }).getAttribute("href")).toBe("/teacher/courses");
  });

  it("shows class course and teacher actions for combined missing mappings", () => {
    const mixedMissingBatch: ScheduleImportBatchDTO = {
      ...displayOnlyPendingBatch,
      id: "batch-mixed-missing",
      rows: [
        {
          ...displayOnlyPendingBatch.rows[0],
          id: "row-mixed-missing",
          validationIssues: [
            { code: "CLASS_NOT_FOUND", message: "未找到对应班级，请先确认班级名称或创建班级映射。", field: "className", severity: "error" },
            { code: "COURSE_NOT_FOUND", message: "未找到对应课程，请先确认课程标题或创建课程。", field: "courseTitle", severity: "error" },
            { code: "TEACHER_NOT_FOUND", message: "未找到对应教师，请先确认教师姓名或教师成员关系。", field: "teacherName", severity: "error" },
          ],
        },
      ],
    };

    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
          cards: [],
          weeklySchedule: emptyWeeklySchedule,
        }}
        latestImportBatch={mixedMissingBatch}
        importBatches={[mixedMissingBatch]}
      />,
    );

    fireEvent.focus(screen.getByRole("button", { name: "高一一班 数学 快捷操作" }));
    expect(getTooltipTextContent()).toContain("班级/课程/教师待补");
    expect(screen.getByRole("link", { name: "查看班级" }).getAttribute("href")).toBe("/teacher/classes");
    expect(screen.getByRole("link", { name: "新建课程" }).getAttribute("href")).toBe("/teacher/courses");
    expect(screen.getByRole("link", { name: "核对教师关系" }).getAttribute("href")).toBe("/teacher/schedule#import-review");
  });

  it("prefers the primary batch over a newer non-primary batch", () => {
    const latestNonPrimaryBatch: ScheduleImportBatchDTO = {
      ...displayOnlyPendingBatch,
      id: "batch-latest-non-primary",
      sourceLabel: "2026 夏季导入",
      isPrimary: false,
      rows: [
        {
          ...displayOnlyPendingBatch.rows[0],
          id: "row-latest-non-primary",
          mappingSummary: {
            ...displayOnlyPendingBatch.rows[0].mappingSummary!,
            termName: "2026 夏季学期",
            courseTitle: "物理",
          },
        },
      ],
    };

    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={latestNonPrimaryBatch}
        importBatches={[latestNonPrimaryBatch, currentBatch, historyBatch]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "2026 春季学期课程表" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "2026 夏季学期课程表" })).toBeNull();
    expect(screen.getByRole("button", { name: "高一一班 数学 快捷操作" })).toBeTruthy();
  });

  it("shows admin teacher details on focus and quick action toolbar after selection", () => {
    const adminWeeklySchedule: TeacherWeeklyScheduleDTO = {
      ...baseWeeklySchedule,
      rows: [
        {
          ...baseWeeklySchedule.rows[0],
          cells: [
            [
              {
                id: "cell-admin-1",
                weekday: 1,
                weekdayLabel: "周一",
                timeLabel: "08:00 - 08:45",
                bellSlotLabel: "第一节",
                classLabel: "高一一班",
                teacherLabel: "张老师",
                locationLabel: "302",
                courseTitle: "数学",
                status: "进行中",
                overrideSummary: null,
              },
              {
                id: "cell-admin-2",
                weekday: 1,
                weekdayLabel: "周一",
                timeLabel: "08:00 - 08:45",
                bellSlotLabel: "第一节",
                classLabel: "高二二班",
                teacherLabel: "李老师",
                locationLabel: "501",
                courseTitle: "物理",
                status: "正常",
                overrideSummary: null,
              },
            ],
            [],
            [],
            [],
            [],
          ],
        },
      ],
    };

    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "admin_school",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: "下一时段 08:00 - 08:45 · 2 节课",
          cards: [],
          weeklySchedule: adminWeeklySchedule,
        }}
        latestImportBatch={currentBatch}
      />,
    );

    expect(screen.getByText((_, element) => element?.textContent === "全校教师")).toBeTruthy();
    fireEvent.focus(screen.getByRole("button", { name: "高一一班 数学 快捷操作" }));
    expect(getTooltipTextContent()).toContain("张老师");
    fireEvent.click(screen.getByRole("button", { name: "高一一班 数学 快捷操作" }));
    expect(screen.getByRole("toolbar", { name: "高一一班 快捷操作" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "调课管理" }).getAttribute("href")).toBe("/teacher/schedule/changes");
    expect(screen.getByRole("link", { name: "提醒配置" }).getAttribute("href")).toBe("/teacher/schedule/reminders");
    expect(screen.getByRole("link", { name: "查看班级" }).getAttribute("href")).toBe("/teacher/classes");
  });

  it("reveals weekly detail tooltip on hover", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          schoolId: "school-1",
          viewMode: "teacher",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
          cards: [],
          weeklySchedule: baseWeeklySchedule,
        }}
        latestImportBatch={currentBatch}
      />,
    );

    const pillButton = screen.getByRole("button", { name: "高一一班 数学 快捷操作" });
    fireEvent.mouseEnter(pillButton.closest("article")!);

    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(getTooltipTextContent()).toContain("08:00 - 08:45");
    expect(getTooltipTextContent()).toContain("302");
    expect(getTooltipTextContent()).toContain("进行中");
  });

});
