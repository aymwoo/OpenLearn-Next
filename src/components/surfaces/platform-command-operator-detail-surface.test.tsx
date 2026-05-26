// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlatformCommandOperatorDetailSurface } from "./platform-command-operator-detail-surface";
import type { PlatformCommandOperatorDetailDTO } from "@/features/platform-core/observability/dto";

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
  it("renders command summary, delegation / approval, and event dispatch timeline", () => {
    render(<PlatformCommandOperatorDetailSurface detail={detail} />);

    expect(screen.getByText(/plugin\.resume · plugin-1/)).toBeTruthy();
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
});
