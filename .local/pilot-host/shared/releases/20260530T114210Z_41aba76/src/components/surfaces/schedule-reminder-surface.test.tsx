// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScheduleReminderSurface } from "./schedule-reminder-surface";

vi.mock("@/features/schedule/reminders/actions", () => ({
  saveScheduleReminderRuleAction: vi.fn(),
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

describe("ScheduleReminderSurface", () => {
  it("shows the two first-release reminder categories and honest delivery states", () => {
    const { container } = render(
      <ScheduleReminderSurface
        data={{
          schoolId: "school-1",
          rules: [
            {
              id: "rule-1",
              schoolId: "school-1",
              type: "pre_class",
              channel: "wecom-notify",
              recipientScope: "teacher",
              offsetMinutes: 20,
              enabled: true,
              latestStatus: "planned",
            },
          ],
          deliveries: [
              {
                id: "delivery-1",
                ruleId: "rule-1",
                type: "pre_class",
                channel: "wecom-notify",
                status: "queued",
                targetLabel: "下一节课",
                scheduledFor: "2026-05-11T08:00:00.000Z",
                deliveryTaskId: "task-1",
                dispatchClaimedAt: "2026-05-11T07:55:00.000Z",
                lastAttemptAt: null,
                failureReason: null,
              },
              {
                id: "delivery-2",
                ruleId: "rule-2",
                type: "schedule_change",
                channel: "wecom-notify",
                status: "running",
                targetLabel: "高一二班",
                scheduledFor: "2026-05-11T09:00:00.000Z",
                deliveryTaskId: "task-2",
                dispatchClaimedAt: "2026-05-11T08:59:00.000Z",
                lastAttemptAt: null,
                failureReason: null,
              },
              {
                id: "delivery-3",
                ruleId: "rule-2",
                type: "schedule_change",
                channel: "wecom-notify",
                status: "retry_required",
                targetLabel: "高一三班",
                scheduledFor: "2026-05-11T10:00:00.000Z",
                deliveryTaskId: "task-3",
                dispatchClaimedAt: "2026-05-11T09:59:00.000Z",
                lastAttemptAt: "2026-05-11T10:02:00.000Z",
                failureReason: "provider timeout",
              },
           ],
        }}
      />,
    );

    expect(screen.getByText("开课前提醒")).toBeTruthy();
    expect(screen.getByText("调课变更提醒")).toBeTruthy();
    expect(screen.getAllByText("已计划").length).toBeGreaterThan(0);
    expect(screen.getByText("排队中")).toBeTruthy();
    expect(screen.getByText("正在投递")).toBeTruthy();
    expect(screen.getByText("投递失败，需 operator 处理")).toBeTruthy();
    expect(screen.getByText(/教师页仅展示最近状态/)).toBeTruthy();
    expect(container.textContent).not.toContain("重试");
  });
});
