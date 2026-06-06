// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PluginMarketplaceSurface } from "./plugin-marketplace-surface";

const registryMocks = vi.hoisted(() => ({
  readMarketplaceSurfaceBundle: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: vi.fn(async () => ({ id: "user-1" })),
  getCurrentUserSchoolIds: vi.fn(async () => ["school-1"]),
}));

vi.mock("@/features/platform-core/actions/registry", () => ({
  readMarketplaceSurfaceBundle: registryMocks.readMarketplaceSurfaceBundle,
}));

vi.mock("./plugin-marketplace-detail-panel", () => ({
  PluginMarketplaceDetailPanel: ({ rows }: { rows: Array<{ pluginKey: string }> }) => (
    <div>detail-panel:{rows.map((row) => row.pluginKey).join(",")}</div>
  ),
}));

describe("plugin marketplace surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registryMocks.readMarketplaceSurfaceBundle.mockResolvedValue({
      builtInRows: [
        {
          id: "builtin-1",
          schoolId: "school-1",
          name: "教师讲授",
          pluginKey: "builtin/direct-instruction",
          dbNamespace: "builtin_direct_instruction",
          sourceType: "default",
          installSource: "bootstrap",
          enabled: true,
          builtIn: true,
          defaultEnabled: true,
          nonDeletable: true,
        },
      ],
      externalRows: [
        {
          pluginKey: "external-marketplace.quiz-sample",
          displayName: "互动答题（外部插件）",
          posture: "upgrade-available",
          installedPluginId: "plugin-1",
          retainedPluginId: null,
          currentVersion: "1.0.0",
          availableVersion: "1.1.0",
          lifecycleState: "enabled",
          reasonCode: null,
          recommendedRecoveryAction: null,
          installSource: "manual",
          dbNamespace: "external_marketplace_quiz_sample",
          sourceType: "external",
          requestedPermissions: ["lesson:write:suggestion"],
          declaredDataTables: ["quiz_questions", "quiz_responses"],
          installRejectReason: null,
          activeSessions: [],
          uninstall: {
            blocked: false,
            reasonCode: null,
            cleanupConfirmationToken: "cleanup:plugin-1:0:0:0:0:0:0:0:0",
            preflightSummary: {
              lessonExtCount: 0,
              stepExtCount: 0,
              resourceExtCount: 0,
              ownedBusinessCount: 0,
              ownedQuestionCount: 0,
              ownedResponseCount: 0,
              affectedEndedSessionCount: 0,
              totalCount: 0,
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
              stages: ["backfill", "verify", "cutover"],
              blockers: [],
              statsParityPreview: {
                questionCount: 1,
                responseCount: 2,
                latestResponseHash: "hash",
              },
              activeSessions: [],
            },
          },
        },
      ],
      metrics: {
        builtInCount: 1,
        externalInstallableCount: 0,
        externalInstalledCount: 1,
        pendingUpgradeCount: 1,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders built-in and external sections on the same page", async () => {
    render(await PluginMarketplaceSurface());

    expect(screen.getByText("External Section")).toBeTruthy();
    expect(screen.getByText("Built-in Section")).toBeTruthy();
    expect(screen.getByText("治理摘要先于主 CTA")).toBeTruthy();
    expect(screen.getByText("互动答题（外部插件）")).toBeTruthy();
    expect(screen.getByText("Permissions: 1")).toBeTruthy();
    expect(screen.getByText("Data Model: 2")).toBeTruthy();
    expect(screen.getByText("查看升级预检")).toBeTruthy();
    expect(screen.getByText("detail-panel:external-marketplace.quiz-sample")).toBeTruthy();
  });

  it("keeps built-in cards visible but lower-priority than external governance cards", async () => {
    render(await PluginMarketplaceSurface());

    expect(screen.getByText("系统内置教学环节")).toBeTruthy();
    expect(screen.getByText("教师讲授")).toBeTruthy();
    expect(screen.getByText("Key: builtin/direct-instruction")).toBeTruthy();
    expect(screen.getByText("可发现、可安装、风险透明的同页治理市场")).toBeTruthy();
  });
});
