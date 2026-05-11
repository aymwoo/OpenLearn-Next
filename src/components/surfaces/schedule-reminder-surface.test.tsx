// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScheduleReminderSurface } from "./schedule-reminder-surface";

vi.mock("@/features/schedule/reminders/actions", () => ({
  retryScheduleReminderDispatchAction: vi.fn(),
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
    render(
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
              status: "retry_required",
              targetLabel: "下一节课",
              scheduledFor: "2026-05-11T08:00:00.000Z",
              lastAttemptAt: null,
              failureReason: null,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("开课前提醒")).toBeTruthy();
    expect(screen.getByText("调课变更提醒")).toBeTruthy();
    expect(screen.getAllByText("已计划").length).toBeGreaterThan(0);
    expect(screen.getByText("需重试")).toBeTruthy();
  });
});
