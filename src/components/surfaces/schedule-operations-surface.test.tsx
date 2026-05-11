// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScheduleOperationsSurface } from "./schedule-operations-surface";

vi.mock("@/features/schedule/operations/actions", () => ({
  createScheduleOverrideAction: vi.fn(),
  saveHolidayCalendarDateAction: vi.fn(),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ScheduleOperationsSurface", () => {
  it("renders the three allowed single-instance actions and 生效日期", () => {
    render(
      <ScheduleOperationsSurface
        data={{
          schoolId: "school-1",
          calendarId: null,
          recurringEntries: [
            {
              recurringEntryId: "entry-1",
              assignmentId: "assignment-1",
              classLabel: "高一一班",
              teacherLabel: "张老师",
              courseTitle: "数学",
              weekdayLabel: "周一",
              bellSlotLabel: "第一节",
              timeLabel: "08:00 - 08:45",
              roomLabel: "302",
            },
          ],
          holidayDates: [],
        }}
      />,
    );

    expect(screen.getByText("代课")).toBeTruthy();
    expect(screen.getByText("停课")).toBeTruthy();
    expect(screen.getByText("换时间/教室")).toBeTruthy();
    expect(screen.getByText("生效日期")).toBeTruthy();
  });
});
