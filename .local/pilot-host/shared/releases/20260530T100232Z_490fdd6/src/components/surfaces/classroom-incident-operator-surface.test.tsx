// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassroomIncidentOperatorDTO } from "@/lib/dto/classroom-incident-operator";

const routerRefresh = vi.fn();
const recoveryActionMock = vi.fn().mockResolvedValue({ success: true, action: "retry" });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock("@/actions/operator-classroom-recovery-actions", () => ({
  runOperatorClassroomRecoveryAction: (...args: unknown[]) => recoveryActionMock(...args),
}));

const surfaceSource = readFileSync(
  "src/components/surfaces/classroom-incident-operator-surface.tsx",
  "utf8",
);
const routeSource = readFileSync(
  "src/app/settings/labs/incidents/[sessionId]/page.tsx",
  "utf8",
);

const detail: ClassroomIncidentOperatorDTO = {
  scopeRole: "admin",
  hero: {
    classroomSessionId: "session-1",
    classId: "class-1",
    className: "高一一班",
    lessonId: "lesson-1",
    lessonTitle: "古诗导读",
    lessonVersionId: "pub-1",
    lessonVersionLabel: "v3",
    runtimeSessionId: "runtime-1",
    sessionStatus: "live",
    updatedAt: "2026-05-26T01:00:00.000Z",
    detailHref: "/settings/labs/incidents/session-1",
  },
  metrics: [
    { key: "session", label: "课堂状态", value: "degraded", tone: "degraded" },
    { key: "plugin", label: "插件姿态", value: "failed", tone: "failed" },
    { key: "command", label: "最新命令", value: "plugin.resume", tone: "failed" },
    { key: "impact", label: "影响范围", value: "platform", tone: "failed" },
  ],
  honesty: {
    trustedFacts: "仍可信什么：SQLite canonical truth 与课堂 session 仍可作为排查锚点。",
    untrustedFacts: "已不可信什么：插件恢复结果与任务补偿结果当前不能直接视为健康。",
    impactScope: "platform",
    recommendedNextStep: "推荐下一步：先查看问题任务，再回到课堂事件确认恢复结果。",
    nextStepHref: "/settings/labs/async-tasks/task-1",
  },
  problemCards: [
    {
      id: "incident:session-1",
      title: "高一一班 当前事件",
      summary: "课堂投票插件恢复失败，当前课堂与关联插件链路受影响。",
      posture: "failed",
      detailHref: "/settings/labs/incidents/session-1",
    },
  ],
  relatedCards: [
    {
      kind: "runtime",
      id: "runtime-1",
      label: "Runtime Inspector",
      summary: "runtime session runtime-1",
      href: "/settings/labs/runtime-inspector?runtimeSessionId=runtime-1",
      nextStepHref: "/settings/labs/runtime-inspector?runtimeSessionId=runtime-1",
    },
    {
      kind: "plugin",
      id: "plugin-1",
      label: "课堂投票",
      summary: "failed · activation_failed",
      href: "/settings/labs/plugins/plugin-1",
      nextStepHref: "/settings/labs/plugins/plugin-1",
    },
    {
      kind: "action",
      id: "action:addStepSuggestion",
      label: "addStepSuggestion",
      summary: "activation_failed -> retry",
      href: "/settings/labs/plugins/plugin-1/actions/addStepSuggestion",
      nextStepHref: "/settings/labs/plugins/plugin-1/actions/addStepSuggestion",
    },
    {
      kind: "command",
      id: "command-1",
      label: "最新命令",
      summary: "命令 command-1 是当前最近的恢复链路。",
      href: "/settings/labs/commands/command-1",
      nextStepHref: "/settings/labs/commands/command-1",
    },
    {
      kind: "task",
      id: "task-1",
      label: "问题任务",
      summary: "任务 task-1 需要 operator 关注。",
      href: "/settings/labs/async-tasks/task-1",
      nextStepHref: "/settings/labs/async-tasks/task-1",
    },
  ],
  lightActions: [
    { action: "retry", label: "追加恢复尝试", enabled: true, reason: null, nextStepHref: "/settings/labs/commands/command-1" },
    { action: "reconcile", label: "重新对账 authoritative truth", enabled: true, reason: null, nextStepHref: "/settings/labs/async-tasks/task-1" },
  ],
  guardedActions: [
    { action: "resume", label: "恢复运行姿态", enabled: false, reason: "该动作会改变运行姿态，必须在 detail view 中确认。", nextStepHref: "/settings/labs/commands/command-1" },
    { action: "suspend", label: "暂停当前姿态", enabled: false, reason: "该动作会改变运行姿态，必须在 detail view 中确认。", nextStepHref: "/settings/labs/commands/command-1" },
    { action: "fallback", label: "切换到降级姿态", enabled: false, reason: "该动作会改变运行姿态，必须在 detail view 中确认。", nextStepHref: "/settings/labs/commands/command-1" },
  ],
};

describe("ClassroomIncidentOperatorSurface", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("locks summary-first IA order and keeps detail-only content out of the surface", async () => {
    const { ClassroomIncidentOperatorSurface } = await import("./classroom-incident-operator-surface");

    const { container } = render(<ClassroomIncidentOperatorSurface detail={detail} />);

    const orderedHeadings = [
      screen.getByRole("heading", { name: "这堂课现在发生了什么" }),
      screen.getByRole("heading", { name: "当前摘要" }),
      screen.getByRole("heading", { name: "honesty posture" }),
      screen.getByRole("heading", { name: "当前问题" }),
      screen.getByRole("heading", { name: "关联对象与下一跳" }),
      screen.getByRole("heading", { name: "轻量恢复" }),
    ];

    for (let index = 0; index < orderedHeadings.length - 1; index += 1) {
      expect(
        orderedHeadings[index].compareDocumentPosition(orderedHeadings[index + 1])
          & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    expect(container.textContent).not.toContain("audit timeline");
    expect(container.textContent).not.toContain("attempt groups");
    expect(surfaceSource).not.toContain("timeline.map(");
    expect(surfaceSource).not.toContain("attemptGroups");
    expect(surfaceSource).not.toContain("raw diagnostics");
    expect(routeSource).toContain("ClassroomIncidentOperatorSurface");
    expect(routeSource).toContain("getClassroomIncidentOperatorDTO");
  });

  it("renders the fixed honesty template in the required three-part order", async () => {
    const { ClassroomIncidentOperatorSurface } = await import("./classroom-incident-operator-surface");

    render(<ClassroomIncidentOperatorSurface detail={detail} />);

    const honestyCard = screen.getByTestId("incident-honesty-card");
    expect(within(honestyCard).getByText("仍可信什么 / 已不可信什么")).toBeTruthy();
    expect(within(honestyCard).getByText("影响范围")).toBeTruthy();
    expect(within(honestyCard).getByText("推荐下一步")).toBeTruthy();
    expect(within(honestyCard).getByText(/SQLite canonical truth/)).toBeTruthy();
    expect(within(honestyCard).getByRole("link", { name: "查看任务详情" }).getAttribute("href")).toBe(
      "/settings/labs/async-tasks/task-1",
    );
  });

  it("runs retry and reconcile through the formal server action while keeping high-risk actions visible but disabled", async () => {
    const { ClassroomIncidentOperatorSurface } = await import("./classroom-incident-operator-surface");

    render(<ClassroomIncidentOperatorSurface detail={detail} />);

    fireEvent.click(screen.getByRole("button", { name: "追加恢复尝试" }));

    await waitFor(() => {
      expect(recoveryActionMock).toHaveBeenCalledWith({
        classroomSessionId: "session-1",
        action: "retry",
      });
      expect(routerRefresh).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "重新对账 authoritative truth" }));

    await waitFor(() => {
      expect(recoveryActionMock).toHaveBeenCalledWith({
        classroomSessionId: "session-1",
        action: "reconcile",
      });
    });

    for (const label of ["恢复运行姿态", "暂停当前姿态", "切换到降级姿态"]) {
      const disabledButton = screen.getByRole("button", { name: label });
      expect(disabledButton.hasAttribute("disabled")).toBe(true);
    }
    expect(screen.getAllByText(/detail view 中确认/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "改去详情确认" }).length).toBeGreaterThan(0);
  });

  it("exposes action drill-down cards instead of stopping at plugin posture labels", async () => {
    const { ClassroomIncidentOperatorSurface } = await import("./classroom-incident-operator-surface");

    render(<ClassroomIncidentOperatorSurface detail={detail} />);

    expect(screen.getByText("addStepSuggestion")).toBeTruthy();
    expect(screen.getByText(/activation_failed -> retry/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "查看动作详情" }).getAttribute("href")).toBe(
      "/settings/labs/plugins/plugin-1/actions/addStepSuggestion",
    );
  });
});
