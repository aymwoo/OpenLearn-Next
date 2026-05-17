import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PluginManifest } from "@/lib/dto/resource-ai";

const updateTag = vi.fn();

const getCurrentUserDTOMock = vi.fn();

const mockPluginDAL = vi.hoisted(() => ({
  registerPluginManifest: vi.fn(),
  setPluginEnabled: vi.fn(),
  setPluginKillSwitch: vi.fn(),
  listPluginsForSchool: vi.fn(),
  getPluginForSchool: vi.fn(),
  deletePluginForSchool: vi.fn(),
  runPluginHook: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: (...args: unknown[]) => getCurrentUserDTOMock(...args),
}));

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
  enabled: false,
  killSwitchEnabled: false,
  builtIn: false,
  defaultEnabled: false,
  nonDeletable: false,
};

describe("plugin-actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentUserDTOMock.mockResolvedValue({ id: "user-1", name: "Teacher" });
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

      mockPluginDAL.registerPluginManifest.mockResolvedValueOnce(mockPluginDTO);

      const result = await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(result).toMatchObject({ success: true, data: mockPluginDTO });
      expect(mockPluginDAL.registerPluginManifest).toHaveBeenCalledWith({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
        actorId: "user-1",
      });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("returns PLUGIN_REGISTER_FAILED on DAL error", async () => {
      const { registerPluginManifestAction } = await import("./plugin-actions");

      mockPluginDAL.registerPluginManifest.mockRejectedValueOnce(new Error("DB_ERROR"));

      const result = await registerPluginManifestAction({
        schoolId: "school-1",
        name: "Test Plugin",
        manifestJson: mockManifest,
      });

      expect(result).toMatchObject({ success: false, error: "DB_ERROR" });
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

      mockPluginDAL.setPluginEnabled.mockResolvedValueOnce({
        ...mockPluginDTO,
        enabled: true,
        registeredThemeId: "theme-1",
      });

      const result = await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ enabled: true }) });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
      expect(updateTag).toHaveBeenCalledWith("theme:registry");
      expect(updateTag).toHaveBeenCalledWith("theme:theme-1");
    });

    it("updates cache without theme tags when no theme is registered", async () => {
      const { setPluginEnabledAction } = await import("./plugin-actions");

      mockPluginDAL.setPluginEnabled.mockResolvedValueOnce({ ...mockPluginDTO, enabled: true });

      await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
      expect(updateTag).not.toHaveBeenCalledWith("theme:registry");
    });

    it("returns PLUGIN_SET_ENABLED_FAILED on DAL error", async () => {
      const { setPluginEnabledAction } = await import("./plugin-actions");

      mockPluginDAL.setPluginEnabled.mockRejectedValueOnce(new Error("PLUGIN_NOT_FOUND"));

      const result = await setPluginEnabledAction({ pluginId: "plugin-1", schoolId: "school-1", enabled: true });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_NOT_FOUND" });
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

      mockPluginDAL.setPluginKillSwitch.mockResolvedValueOnce({ ...mockPluginDTO, killSwitchEnabled: true });

      const result = await setPluginKillSwitchAction({ pluginId: "plugin-1", killSwitchEnabled: true });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ killSwitchEnabled: true }) });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("returns PLUGIN_KILL_SWITCH_FAILED on DAL error", async () => {
      const { setPluginKillSwitchAction } = await import("./plugin-actions");

      mockPluginDAL.setPluginKillSwitch.mockRejectedValueOnce(new Error("PLUGIN_NOT_FOUND"));

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

      const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("deletes plugin and invalidates cache", async () => {
      const { deletePluginAction } = await import("./plugin-actions");

      mockPluginDAL.deletePluginForSchool.mockResolvedValueOnce({ ...mockPluginDTO });

      const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({ success: true, data: expect.objectContaining({ id: "plugin-1" }) });
      expect(updateTag).toHaveBeenCalledWith("plugin:registry");
      expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    });

    it("returns PLUGIN_DELETE_FAILED on DAL error", async () => {
      const { deletePluginAction } = await import("./plugin-actions");

      mockPluginDAL.deletePluginForSchool.mockRejectedValueOnce(new Error("PLUGIN_BUILT_IN_NOT_DELETABLE"));

      const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

      expect(result).toMatchObject({ success: false, error: "PLUGIN_BUILT_IN_NOT_DELETABLE" });
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
