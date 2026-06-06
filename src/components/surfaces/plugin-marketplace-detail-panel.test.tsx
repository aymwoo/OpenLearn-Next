// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PluginMarketplaceDetailPanel } from "./plugin-marketplace-detail-panel";

const actionMocks = vi.hoisted(() => ({
  installMarketplacePluginAction: vi.fn(),
  preflightPluginUpgradeAction: vi.fn(),
  preflightUninstallPluginAction: vi.fn(),
  recoverMarketplacePluginAction: vi.fn(),
  uninstallPluginAction: vi.fn(),
  upgradePluginAction: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/actions/plugin-actions", () => actionMocks);

const baseRow = {
  pluginKey: "external-marketplace.quiz-sample",
  displayName: "互动答题（外部插件）",
  posture: "upgrade-available" as const,
  installedPluginId: "plugin-1",
  retainedPluginId: null,
  currentVersion: "1.0.0",
  availableVersion: "1.1.0",
  lifecycleState: "enabled" as const,
  reasonCode: null,
  recommendedRecoveryAction: null,
  installSource: "manual" as const,
  dbNamespace: "external_marketplace_quiz_sample",
  sourceType: "external" as const,
  requestedPermissions: ["lesson:write:suggestion"],
  declaredDataTables: ["quiz_questions", "quiz_responses"],
  installRejectReason: null,
  activeSessions: [],
  uninstall: {
    blocked: false,
    reasonCode: null,
    cleanupConfirmationToken: "cleanup:plugin-1:1:2:3:4:5:6:7:8",
    preflightSummary: {
      lessonExtCount: 1,
      stepExtCount: 2,
      resourceExtCount: 3,
      ownedBusinessCount: 4,
      ownedQuestionCount: 5,
      ownedResponseCount: 6,
      affectedEndedSessionCount: 7,
      totalCount: 8,
    },
  },
  upgrade: {
    available: true,
    targetVersion: "1.1.0",
    preflight: {
      pluginId: "plugin-1",
      schoolId: "school-1",
      currentVersion: "1.0.0",
      targetVersion: "1.1.0",
      hasOwnedQuizData: true,
      stages: ["backfill", "verify", "cutover"] as Array<"backfill" | "verify" | "cutover">,
      blockers: [],
      statsParityPreview: {
        questionCount: 1,
        responseCount: 2,
        latestResponseHash: "hash",
      },
      activeSessions: [],
    },
  },
};

describe("plugin marketplace detail panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.preflightPluginUpgradeAction.mockResolvedValue({
      success: true,
      data: baseRow.upgrade.preflight,
    });
    actionMocks.preflightUninstallPluginAction.mockResolvedValue({
      success: true,
      data: {
        pluginId: "plugin-1",
        schoolId: "school-1",
        blocked: false,
        reason: null,
        lessonExtCount: 1,
        stepExtCount: 2,
        resourceExtCount: 3,
        ownedBusinessCount: 4,
        ownedQuestionCount: 5,
        ownedResponseCount: 6,
        affectedEndedSessionCount: 7,
        totalCount: 8,
        impactedLessonIds: [],
        impactedLessonStepIds: [],
        impactedResourceIds: [],
        impactedBusinessKeys: [],
        activeSessions: [],
        cleanupConfirmationToken: "cleanup:plugin-1:1:2:3:4:5:6:7:8",
      },
    });
    actionMocks.upgradePluginAction.mockResolvedValue({
      success: true,
      data: {
        pluginId: "plugin-1",
        schoolId: "school-1",
        currentVersion: "1.0.0",
        targetVersion: "1.1.0",
        upgraded: false,
        verifyPassed: false,
        lifecycleState: "enabled",
        stages: [
          { name: "backfill", status: "completed" },
          { name: "verify", status: "failed" },
          { name: "cutover", status: "skipped" },
        ],
        failureDetail: "VERIFY_FAILED",
        invalidatedSessionIds: [],
      },
    });
    actionMocks.uninstallPluginAction.mockResolvedValue({ success: true, data: { uninstalled: true } });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows upgrade preflight details before execute and renders Backfill Verify Cutover stages", async () => {
    render(<PluginMarketplaceDetailPanel schoolId="school-1" rows={[baseRow]} />);

    fireEvent.click(screen.getByRole("button", { name: "查看升级预检" }));

    await waitFor(() => {
      expect(actionMocks.preflightPluginUpgradeAction).toHaveBeenCalledWith({
        schoolId: "school-1",
        pluginId: "plugin-1",
        targetVersion: "1.1.0",
      });
    });

    expect(screen.getByText("Backfill")).toBeTruthy();
    expect(screen.getByText("Verify")).toBeTruthy();
    expect(screen.getByText("Cutover")).toBeTruthy();
  });

  it("shows verify failure honesty copy after upgrade execute", async () => {
    render(<PluginMarketplaceDetailPanel schoolId="school-1" rows={[baseRow]} />);

    fireEvent.click(screen.getByRole("button", { name: "开始升级" }));

    await waitFor(() => {
      expect(actionMocks.upgradePluginAction).toHaveBeenCalledWith({
        schoolId: "school-1",
        pluginId: "plugin-1",
        targetVersion: "1.1.0",
      });
    });

    expect(screen.getAllByText("升级未完成，系统已保持旧版本继续可用。").length).toBeGreaterThan(0);
  });

  it("shows cleanup confirmation token and allows cleanup confirmation path", async () => {
    render(<PluginMarketplaceDetailPanel schoolId="school-1" rows={[baseRow]} />);

    fireEvent.click(screen.getByRole("button", { name: "卸载并保留数据" }));

    await waitFor(() => {
      expect(actionMocks.preflightUninstallPluginAction).toHaveBeenCalledWith({
        schoolId: "school-1",
        pluginId: "plugin-1",
      });
    });

    expect(screen.getByText("cleanup:plugin-1:1:2:3:4:5:6:7:8")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("输入 confirmation token"), {
      target: { value: "cleanup:plugin-1:1:2:3:4:5:6:7:8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "确认 cleanup" }));

    await waitFor(() => {
      expect(actionMocks.uninstallPluginAction).toHaveBeenCalledWith({
        schoolId: "school-1",
        pluginId: "plugin-1",
        retentionMode: "cleanup",
        confirmationToken: "cleanup:plugin-1:1:2:3:4:5:6:7:8",
      });
    });
  });

  it("shows active classroom blocker before destructive actions", () => {
    render(
      <PluginMarketplaceDetailPanel
        schoolId="school-1"
        rows={[
          {
            ...baseRow,
            posture: "active-blocked",
            activeSessions: [
              {
                sessionId: "session-1",
                lessonId: "lesson-1",
                classId: "class-1",
                status: "live",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("受影响课堂 / Session")).toBeTruthy();
    expect(screen.getByText(/class-1/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "查看受影响课堂" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "稍后重试" })).toBeTruthy();
  });
});
