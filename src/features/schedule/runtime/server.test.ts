import { describe, expect, it } from "vitest";

import { TeacherDailyAgendaDTOSchema } from "@/features/schedule/shared/dto/runtime";

describe("schedule runtime dto contract", () => {
  it("accepts weekly schedule rows with empty cells and current-day metadata", () => {
    const parsed = TeacherDailyAgendaDTOSchema.parse({
      teacherId: "teacher-1",
      schoolId: "school-1",
      date: "2026-05-11",
      dateLabel: "2026-05-11",
      weekLabel: "周一",
      nextClassCountdownLabel: "下一节课 08:00 - 08:45",
      cards: [],
      weeklySchedule: {
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
      },
    });

    expect(parsed.weeklySchedule.weekdays[0]?.isToday).toBe(true);
    expect(parsed.weeklySchedule.rows[0]?.cells).toHaveLength(5);
    expect(parsed.weeklySchedule.rows[0]?.cells[1]).toBeNull();
    expect(parsed.weeklySchedule.rows[0]?.cells[0]?.courseTitle).toBe("数学");
  });
});
