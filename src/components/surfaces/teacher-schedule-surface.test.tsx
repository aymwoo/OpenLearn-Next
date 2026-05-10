// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeacherScheduleSurface } from "./teacher-schedule-surface";

describe("TeacherScheduleSurface", () => {
  it("renders the empty state with the exact Chinese copy", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
          date: "2026-05-11",
          dateLabel: "2026-05-11",
          weekLabel: "周一",
          nextClassCountdownLabel: null,
          cards: [],
        }}
      />,
    );

    expect(screen.getByText("今天还没有生成可执行课表")).toBeTruthy();
    expect(screen.getByText("先导入并审核课表数据，或检查今天是否被设置为节假日/非教学日。")).toBeTruthy();
  });

  it("keeps time class location status as the first visible information layer", () => {
    render(
      <TeacherScheduleSurface
        data={{
          teacherId: "teacher-1",
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
        }}
      />,
    );

    expect(screen.getByText("时间")).toBeTruthy();
    expect(screen.getByText("班级")).toBeTruthy();
    expect(screen.getByText("地点")).toBeTruthy();
    expect(screen.getByText("状态")).toBeTruthy();
  });
});
