// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformCommandOperatorDetailSurface } from "./platform-command-operator-detail-surface";
import type { PlatformCommandOperatorDetailDTO } from "@/features/platform-core/observability/dto";

const operatorRecoveryActionMock = vi.fn().mockResolvedValue({ success: true });

vi.mock("@/actions/operator-posture-recovery-actions", () => ({
  runOperatorPostureRecoveryAction: (...args: unknown[]) => operatorRecoveryActionMock(...args),
}));

const detail: PlatformCommandOperatorDetailDTO = {
  command: {
    commandId: "command-1",
    commandType: "plugin.resume",
    status: "failed",
    statusLabel: "已失败",
    latestAttemptNumber: 2,
    schoolId: "school-1",
    pluginId: "plugin-1",
    actorId: "teacher-1",
    actorScope: "teacher",
    correlationId: "corr-1",
    causationId: null,
    producer: "plugin-actions",
    createdAt: "2026-05-26T01:00:00.000Z",
    updatedAt: "2026-05-26T01:02:00.000Z",
    completedAt: "2026-05-26T01:02:00.000Z",
    resultSummary: null,
    resultSummaryLabel: "无结果摘要",
    auditSummary: null,
    auditSummaryLabel: "审批 approved / Teacher approved delegated command",
    failureAttribution: {
      scope: "plugin",
      pluginId: "plugin-1",
      reasonCode: "activation_failed",
      recommendedRecoveryAction: "retry",
    },
    failureSummaryLabel: "plugin:activation_failed -> retry",
    invalidationIntent: {
      tags: ["plugin:registry"],
      label: "plugin:registry",
    },
  },
  timeline: [
    {
      id: "event-1",
      commandId: "command-1",
      attemptNumber: 2,
      eventOrdinal: 1,
      eventType: "platform.command.failed",
      category: "outcome",
      aggregateType: "plugin",
      aggregateId: "plugin-1",
      occurredAt: "2026-05-26T01:02:00.000Z",
      payloadSummary: { reasonCode: "activation_failed" },
      payloadSummaryLabel: "reasonCode=activation_failed",
      auditSummary: null,
      auditSummaryLabel: "审批 approved / Teacher approved delegated command",
      dispatches: [
        {
          dispatchId: "dispatch-1",
          channel: "in-process",
          status: "failed",
          adapterId: "platform-persisted-event-bus",
          failureReason: "SUBSCRIBER_DOWN",
        },
      ],
    },
  ],
};

describe("PlatformCommandOperatorDetailSurface", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("gates high-risk posture changes behind a confirmation panel with impact, posture change, and audit copy", async () => {
    render(<PlatformCommandOperatorDetailSurface detail={detail} />);

    fireEvent.click(screen.getByRole("button", { name: "恢复运行姿态" }));

    expect(screen.getByText("影响范围")).toBeTruthy();
    expect(screen.getByText("姿态变化")).toBeTruthy();
    expect(screen.getByText("将写入的审计记录")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "确认恢复运行姿态" }));

    await waitFor(() => {
      expect(operatorRecoveryActionMock).toHaveBeenCalledWith({
        scope: "plugin",
        pluginId: "plugin-1",
        schoolId: "school-1",
        recoveryAction: "resume",
        reason: "activation_failed",
        revalidatePaths: [
          "/settings/labs/commands/command-1",
          "/settings/labs",
        ],
      });
    });
  });

  it("renders command summary, delegation / approval, and event dispatch timeline", () => {
    render(<PlatformCommandOperatorDetailSurface detail={detail} />);

    expect(screen.getAllByText(/plugin\.resume · plugin-1/).length).toBeGreaterThan(0);
    expect(screen.getByText("Delegation / Approval")).toBeTruthy();
    expect(screen.getAllByText(/Teacher approved delegated command/).length).toBeGreaterThan(0);
    expect(screen.getByText("event dispatch timeline")).toBeTruthy();
    expect(screen.getByText(/dispatch in-process · failed/)).toBeTruthy();
  });

  it("renders stable empty state when command is missing", () => {
    render(
      <PlatformCommandOperatorDetailSurface
        detail={{
          command: null,
          timeline: [],
        }}
      />,
    );

    expect(screen.getByText("未找到命令详情")).toBeTruthy();
  });

  it("keeps high-risk actions visible but disabled when current command is still running", () => {
    render(
      <PlatformCommandOperatorDetailSurface
        detail={{
          ...detail,
          command: detail.command
            ? {
                ...detail.command,
                status: "running",
                statusLabel: "执行中",
              }
            : null,
        }}
      />,
    );

    expect(screen.getAllByRole("button", { name: "恢复运行姿态" }).some((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.getByText(/当前 command 仍在执行中，需等待稳定结果后再做高风险姿态变更/)).toBeTruthy();
  });
});
