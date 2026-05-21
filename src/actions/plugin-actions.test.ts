import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PluginManifest } from "@/lib/dto/resource-ai";

const updateTag = vi.fn();

const getCurrentUserDTOMock = vi.fn();
const getUserMembershipsDTOMock = vi.fn();

const mockGovernanceProducer = vi.hoisted(() => ({
  dispatchPluginGovernanceCommand: vi.fn(),
}));

const mockPluginDAL = vi.hoisted(() => ({
  listPluginsForSchool: vi.fn(),
  getPluginForSchool: vi.fn(),
  runPluginHook: vi.fn(),
}));

const mockRegistryReads = vi.hoisted(() => ({
  readExecutableActionCatalog: vi.fn(),
  readBlockedActionDiagnostics: vi.fn(),
  readPluginGovernanceLifecycle: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: (...args: unknown[]) => getCurrentUserDTOMock(...args),
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO: (...args: unknown[]) => getUserMembershipsDTOMock(...args),
}));

vi.mock("@/features/platform-core/commands/producers/plugin-governance", () => mockGovernanceProducer);

vi.mock("@/features/platform-core/actions/registry", () => mockRegistryReads);

vi.mock("@/lib/dal/plugins", () => mockPluginDAL);

const mockManifest = {
  id: "plugin-test-1",
  version: "1.0.0",
  manifestVersion: 1,
  permissions: [],
  anchors: ["dashboard.widget"],
  actions: ["addStepSuggestion"],
  builtIn: false,
  defaultEnabled: false,
  nonDeletable: false,
} satisfies PluginManifest;

const mockPluginDTO = {
  id: "plugin-1",
  schoolId: "school-1",
  name: "Test Plugin",
  manifestJson: mockManifest,
  pluginKey: "plugin-test-1",
  dbNamespace: "plugin_test_1",
  sourceType: "external",
  installSource: "manual",
  enabled: false,
  killSwitchEnabled: false,
  lifecycleState: "installed",
  builtIn: false,
  defaultEnabled: false,
  nonDeletable: false,
};

describe("plugin-actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGovernanceProducer.dispatchPluginGovernanceCommand.mockReset();
    mockPluginDAL.listPluginsForSchool.mockReset();
    mockPluginDAL.getPluginForSchool.mockReset();
    mockPluginDAL.runPluginHook.mockReset();
    mockRegistryReads.readExecutableActionCatalog.mockReset();
    mockRegistryReads.readBlockedActionDiagnostics.mockReset();
    mockRegistryReads.readPluginGovernanceLifecycle.mockReset();
    getCurrentUserDTOMock.mockResolvedValue({ id: "user-1", name: "Teacher" });
    getUserMembershipsDTOMock.mockResolvedValue([{ schoolId: "school-1", status: "active", role: "teacher" }]);
    mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValue({
      success: true,
      data: mockPluginDTO,
      commandId: "command-1",
      attemptNumber: 1,
      invalidationTags: ["plugin:registry", "plugin:plugin-1"],
    });
    mockPluginDAL.getPluginForSchool.mockResolvedValue(mockPluginDTO);
    mockRegistryReads.readExecutableActionCatalog.mockResolvedValue([]);
    mockRegistryReads.readBlockedActionDiagnostics.mockResolvedValue([]);
    mockRegistryReads.readPluginGovernanceLifecycle.mockResolvedValue(null);
  });

  it("routes mutation actions through a shared plugin governance producer seam", async () => {
    const source = await readFile(new URL("./plugin-actions.ts", import.meta.url), "utf8");

    expect(source).toContain('from "@/features/platform-core/commands/producers/plugin-governance"');
    expect(source).toContain("dispatchPluginGovernanceCommand");
    expect(source).not.toContain("registerPluginManifest,");
    expect(source).not.toContain("setPluginEnabled,");
    expect(source).not.toContain("transitionPluginLifecycle,");
    expect(source).not.toContain("setPluginKillSwitch,");
    expect(source).not.toContain("preflightUninstallPlugin,");
    expect(source).not.toContain("uninstallPlugin,");
  });

  describe("registerPluginManifestAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { registerPluginManifestAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("registers plugin and invalidates cache on success", async () => {
      const { registerPluginManifestAction } = await import("./plugin-actions");

      const result = await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(result).toMatchObject({ success: true, data: mockPluginDTO });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.install",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: mockManifest.id },
        payload: {
          schoolId: "school-1",
          pluginId: mockManifest.id,
          existingRegistrationId: undefined,
          name: "Test Plugin",
          installSource: "manual",
          manifestJson: mockManifest,
        },
        source: "server-action",
        correlation: { producer: "plugin-actions.register" },
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          pluginKey: "plugin-test-1",
          dbNamespace: "plugin_test_1",
          sourceType: "external",
          installSource: "manual",
        }),
      });
    });

    it("sends manifest id as plugin key and leaves existingRegistrationId unset on first install", async () => {
      const { registerPluginManifestAction } = await import("./plugin-actions");

      await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenLastCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            pluginId: mockManifest.id,
            existingRegistrationId: undefined,
          }),
        }),
      );
    });

    it("returns explicit conflict tokens from DAL errors", async () => {
      const { registerPluginManifestAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockRejectedValueOnce(new Error("PLUGIN_KEY_CONFLICT"));

      const result = await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_KEY_CONFLICT" });
    });

    it("returns namespace conflict tokens from DAL errors", async () => {
      const { registerPluginManifestAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockRejectedValueOnce(new Error("PLUGIN_DB_NAMESPACE_CONFLICT"));

      const result = await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_DB_NAMESPACE_CONFLICT" });
    });
  });

  describe("setPluginEnabledAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { setPluginEnabledAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("enables plugin and updates cache including registered theme", async () => {
      const { setPluginEnabledAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-2",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1", "theme:registry", "theme:theme-1"],
        data: {
          ...mockPluginDTO,
          enabled: true,
          registeredThemeId: "theme-1",
        },
      });

      const result = await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ enabled: true }) });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.enable",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: { schoolId: "school-1", pluginId: "plugin-1", enabledBy: "user-1" },
        source: "server-action",
        correlation: { producer: "plugin-actions.toggle" },
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
      expect(updateTag).toHaveBeenCalledWith("theme:registry");
      expect(updateTag).toHaveBeenCalledWith("theme:theme-1");
    });

    it("updates cache without theme tags when no theme is registered", async () => {
      const { setPluginEnabledAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-3",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO, enabled: true },
      });

      await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
      expect(updateTag).not.toHaveBeenCalledWith("theme:registry");
    });

    it("returns PLUGIN_SET_ENABLED_FAILED on DAL error", async () => {
      const { setPluginEnabledAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockRejectedValueOnce(new Error("PLUGIN_NOT_FOUND"));

      const result = await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_NOT_FOUND" });
    });
  });

  describe("transitionPluginLifecycleAction", () => {
    it("transitions plugin lifecycle and invalidates cache", async () => {
      const { transitionPluginLifecycleAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-4",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: {
          ...mockPluginDTO,
          lifecycleState: "disabled",
          enabled: false,
        },
      });

      const result = await transitionPluginLifecycleAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        targetState: "disabled",
        reason: "manual-disable",
      });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ lifecycleState: "disabled" }) });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.disable",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: { schoolId: "school-1", pluginId: "plugin-1", disabledBy: "user-1" },
        source: "server-action",
        correlation: { producer: "plugin-actions.transition" },
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("preserves mounted and ready lifecycle targets when dispatching plugin.resume", async () => {
      const { transitionPluginLifecycleAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-mounted",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO, lifecycleState: "mounted", enabled: true },
      });

      await transitionPluginLifecycleAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        targetState: "mounted",
        reason: "mounted",
      });

      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenLastCalledWith({
        type: "plugin.resume",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: { schoolId: "school-1", pluginId: "plugin-1", reason: "mounted", targetState: "mounted" },
        source: "server-action",
        correlation: { producer: "plugin-actions.transition" },
      });

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-ready",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO, lifecycleState: "ready", enabled: true },
      });

      await transitionPluginLifecycleAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        targetState: "ready",
        reason: "ready",
      });

      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenLastCalledWith({
        type: "plugin.resume",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: { schoolId: "school-1", pluginId: "plugin-1", reason: "ready", targetState: "ready" },
        source: "server-action",
        correlation: { producer: "plugin-actions.transition" },
      });
    });

    it("rejects unsupported lifecycle targets at the server-action boundary", async () => {
      const { transitionPluginLifecycleAction } = await import("./plugin-actions");

      const result = await transitionPluginLifecycleAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        targetState: "installed",
        reason: "unsupported",
      } as never);

      expect(result).toMatchObject({ success: false });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).not.toHaveBeenCalled();
    });
  });

  describe("reconcilePluginAction", () => {
    it("dispatches explicit plugin.reconcile and invalidates plugin governance tags", async () => {
      const { reconcilePluginAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-reconcile",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO, lifecycleState: "ready" },
      });

      const result = await reconcilePluginAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        reason: "dependency recovery",
        targetState: "ready",
      });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ lifecycleState: "ready" }) });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.reconcile",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: {
          schoolId: "school-1",
          pluginId: "plugin-1",
          reason: "dependency recovery",
          targetState: "ready",
        },
        source: "server-action",
        correlation: { producer: "plugin-actions.reconcile" },
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });
  });

  describe("setPluginKillSwitchAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { setPluginKillSwitchAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await setPluginKillSwitchAction({ pluginId: "plugin-1", killSwitchEnabled: true });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("sets kill switch and invalidates plugin cache", async () => {
      const { setPluginKillSwitchAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-5",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO, killSwitchEnabled: true },
      });

      const result = await setPluginKillSwitchAction({ pluginId: "plugin-1", killSwitchEnabled: true });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ killSwitchEnabled: true }) });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.kill_switch.set",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: {
          schoolId: "school-1",
          pluginId: "plugin-1",
          enabled: true,
          reason: "kill-switch-enabled",
        },
        source: "server-action",
        correlation: { producer: "plugin-actions.kill-switch" },
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("ignores non-teacher active memberships while resolving plugin school scope", async () => {
      const { setPluginKillSwitchAction } = await import("./plugin-actions");

      getUserMembershipsDTOMock.mockResolvedValueOnce([
        { schoolId: "school-student", role: "student", status: "active" },
        { schoolId: "school-parent", role: "parent", status: "active" },
        { schoolId: "school-1", role: "teacher", status: "active" },
      ]);
      mockPluginDAL.getPluginForSchool
        .mockResolvedValueOnce({ ...mockPluginDTO, schoolId: "school-1" });
      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-5b",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO, killSwitchEnabled: true },
      });

      const result = await setPluginKillSwitchAction({ pluginId: "plugin-1", killSwitchEnabled: true });

      expect(result).toMatchObject({ success: true });
      expect(mockPluginDAL.getPluginForSchool).toHaveBeenCalledTimes(1);
      expect(mockPluginDAL.getPluginForSchool).toHaveBeenCalledWith({
        actorId: "user-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
      });
    });

    it("returns PLUGIN_KILL_SWITCH_FAILED on DAL error", async () => {
      const { setPluginKillSwitchAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockRejectedValueOnce(new Error("PLUGIN_NOT_FOUND"));

      const result = await setPluginKillSwitchAction({ pluginId: "plugin-1", killSwitchEnabled: true });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_NOT_FOUND" });
    });
  });

  describe("listPluginsAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { listPluginsAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await listPluginsAction({ schoolId: "school-1" });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("lists plugins for school", async () => {
      const { listPluginsAction } = await import("./plugin-actions");

      mockPluginDAL.listPluginsForSchool.mockResolvedValueOnce([mockPluginDTO]);

      const result = await listPluginsAction({ schoolId: "school-1" });

      expect(result).toMatchObject({ success: true, data: [mockPluginDTO] });
      expect(mockPluginDAL.listPluginsForSchool).toHaveBeenCalledWith({ schoolId: "school-1", actorId: "user-1" });
    });

    it("returns PLUGIN_LIST_FAILED on DAL error", async () => {
      const { listPluginsAction } = await import("./plugin-actions");

      mockPluginDAL.listPluginsForSchool.mockRejectedValueOnce(new Error("SCOPE_DENIED"));

      const result = await listPluginsAction({ schoolId: "school-1" });

      expect(result).toMatchObject({ success: false, error: "SCOPE_DENIED" });
    });
  });

  describe("getPluginAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { getPluginAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await getPluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("returns plugin data for valid request", async () => {
      const { getPluginAction } = await import("./plugin-actions");

      mockPluginDAL.getPluginForSchool.mockResolvedValueOnce(mockPluginDTO);

      const result = await getPluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({ success: true, data: mockPluginDTO });
    });

    it("returns PLUGIN_GET_FAILED on DAL error", async () => {
      const { getPluginAction } = await import("./plugin-actions");

      mockPluginDAL.getPluginForSchool.mockRejectedValueOnce(new Error("PLUGIN_NOT_FOUND"));

      const result = await getPluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_NOT_FOUND" });
    });
  });

  describe("deletePluginAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { deletePluginAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1", retentionMode: "retain" });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("deletes plugin and invalidates cache", async () => {
      const { deletePluginAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-6",
        attemptNumber: 1,
        invalidationTags: ["plugin:registry", "plugin:plugin-1"],
        data: { ...mockPluginDTO },
      });

      const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1", retentionMode: "retain" });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ id: "plugin-1" }) });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.uninstall",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: {
          schoolId: "school-1",
          pluginId: "plugin-1",
          retentionMode: "retain",
          confirmationToken: undefined,
        },
        source: "server-action",
        correlation: { producer: "plugin-actions.uninstall" },
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("forwards cleanup confirmation tokens to plugin.uninstall payloads", async () => {
      const { deletePluginAction } = await import("./plugin-actions");

      await deletePluginAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        retentionMode: "cleanup",
        confirmationToken: "cleanup:plugin-1:1:2:3:4:10",
      } as never);

      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenLastCalledWith(
        expect.objectContaining({
          payload: {
            schoolId: "school-1",
            pluginId: "plugin-1",
            retentionMode: "cleanup",
            confirmationToken: "cleanup:plugin-1:1:2:3:4:10",
          },
        }),
      );
    });

    it("returns PLUGIN_DELETE_FAILED on DAL error", async () => {
      const { deletePluginAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockRejectedValueOnce(new Error("UNINSTALL_BLOCKED_DEFAULT_PLUGIN"));

      const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1", retentionMode: "retain" });

      expect(result).toMatchObject({ success: false, error: "UNINSTALL_BLOCKED_DEFAULT_PLUGIN" });
    });
  });

  describe("preflightUninstallPluginAction", () => {
    it("returns preflight uninstall summary", async () => {
      const { preflightUninstallPluginAction } = await import("./plugin-actions");

      mockGovernanceProducer.dispatchPluginGovernanceCommand.mockResolvedValueOnce({
        success: true,
        commandId: "command-7",
        attemptNumber: 1,
        invalidationTags: [],
        data: {
          pluginId: "plugin-1",
          schoolId: "school-1",
          blocked: false,
          reason: null,
          lessonExtCount: 1,
          stepExtCount: 2,
          resourceExtCount: 3,
          ownedBusinessCount: 4,
          totalCount: 10,
          impactedLessonIds: ["lesson-1"],
          impactedLessonStepIds: ["step-1", "step-2"],
          impactedResourceIds: ["resource-1", "resource-2", "resource-3"],
          impactedBusinessKeys: ["dashboard", "settings", "gradebook", "metrics"],
        },
      });

      const result = await preflightUninstallPluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({ blocked: false, totalCount: 10 }),
      });
      expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
        type: "plugin.uninstall.preflight",
        actor: { actorId: "user-1", actorScope: "teacher" },
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: { pluginId: "plugin-1", schoolId: "school-1" },
        source: "server-action",
        correlation: { producer: "plugin-actions.uninstall-preflight" },
      });
    });
  });

  describe("runPluginHookAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      const { runPluginHookAction } = await import("./plugin-actions");

      getCurrentUserDTOMock.mockResolvedValueOnce(null);

      const result = await runPluginHookAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        hookAnchor: "dashboard.widget",
        input: { pluginId: "plugin-1", action: "addStepSuggestion", payload: {} },
      });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("runs plugin hook and invalidates plugin cache", async () => {
      const { runPluginHookAction } = await import("./plugin-actions");

      mockPluginDAL.runPluginHook.mockResolvedValueOnce({ proposalType: "stepSuggestion", payload: {} });

      const result = await runPluginHookAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        hookAnchor: "dashboard.widget",
        input: { pluginId: "plugin-1", action: "addStepSuggestion", payload: {} },
      });

      expect(result).toMatchObject({ success: true, data: { proposalType: "stepSuggestion", payload: {} } });
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("returns PLUGIN_HOOK_FAILED on DAL error", async () => {
      const { runPluginHookAction } = await import("./plugin-actions");

      mockPluginDAL.runPluginHook.mockRejectedValueOnce(new Error("PLUGIN_NOT_FOUND"));

      const result = await runPluginHookAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        hookAnchor: "dashboard.widget",
        input: { pluginId: "plugin-1", action: "addStepSuggestion", payload: {} },
      });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_NOT_FOUND" });
    });

    it("validates hookAnchor enum via Zod", async () => {
      const { runPluginHookAction } = await import("./plugin-actions");

      const result = await runPluginHookAction({
        pluginId: "plugin-1",
        schoolId: "school-1",
        hookAnchor: "invalid.anchor",
        input: { pluginId: "plugin-1", action: "addStepSuggestion", payload: {} },
      } as unknown as Parameters<typeof runPluginHookAction>[0]);

      expect(result).toMatchObject({ success: false });
      expect(result.error).toBeTruthy();
    });
  });
});
