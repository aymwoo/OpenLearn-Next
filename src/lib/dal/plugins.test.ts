import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyPluginRegistrations = vi.fn();
const findFirstPluginRegistrations = vi.fn();
const assertActiveTeacher = vi.fn();
const getUserMembershipsDTO = vi.fn();
const dispatchPluginAction = vi.fn();
const insertReturning = vi.fn();
const insertValues = vi.fn();
const dbInsert = vi.fn(() => ({ values: insertValues }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const dbUpdate = vi.fn(() => ({ set: updateSet }));
const deleteReturning = vi.fn();
const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
const dbDelete = vi.fn(() => ({ where: deleteWhere }));
const selectWhere = vi.fn();
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const dbSelect = vi.fn(() => ({ from: selectFrom }));
const transactionMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsert,
    update: dbUpdate,
    delete: dbDelete,
    select: dbSelect,
    transaction: transactionMock,
    query: {
      pluginRegistrations: {
        findMany: findManyPluginRegistrations,
        findFirst: findFirstPluginRegistrations,
      },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

vi.mock("@/lib/dal/themes", () => ({
  registerThemeTokens: vi.fn(),
}));

vi.mock("@/server/plugins/registry", () => ({
  dispatchPluginAction,
  PLUGIN_ACTION_PERMISSION_REQUIREMENTS: {},
}));

const source = readFileSync("src/lib/dal/plugins.ts", "utf8");
const registrySource = readFileSync("src/server/plugins/registry.ts", "utf8");

function createManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: "vendor/plugin-name",
    version: "1.0.0",
    manifestVersion: 1 as const,
    permissions: [] as Array<"lesson:write:suggestion" | "lesson:write:annotation" | "notification:create:stub" | "schedule:write:proposal">,
    anchors: ["dashboard.widget"] as Array<"dashboard.widget" | "lesson.sidebar" | "schedule.assistant">,
    actions: ["addStepSuggestion"] as Array<"addStepSuggestion" | "annotateLesson" | "createNotificationStub" | "suggestBuiltInTeachingStep" | "insertBuiltInTeachingStepTemplate" | "annotateScheduleConflict" | "createScheduleOverrideProposal" | "createScheduleReminderDraft">,
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    ...overrides,
  };
}

function createPluginRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "plugin-1",
    schoolId: "school-1",
    name: "Plugin One",
    manifestJson: createManifest(),
    pluginKey: "vendor/plugin-name",
    dbNamespace: "vendor_plugin_name",
    sourceType: "external",
    installSource: "manual",
    enabled: false,
    killSwitchEnabled: false,
    lifecycleState: "installed",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("plugin DAL security boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    insertValues.mockReturnValue({ returning: insertReturning });
    updateSet.mockReturnValue({ where: updateWhere });
    updateWhere.mockReturnValue({ returning: updateReturning });
    deleteWhere.mockReturnValue({ returning: deleteReturning });
    selectWhere.mockResolvedValue([]);
    transactionMock.mockImplementation(async (callback) => callback({
      insert: dbInsert,
      update: dbUpdate,
      delete: dbDelete,
    }));

    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
    getUserMembershipsDTO.mockResolvedValue([{ schoolId: "school-1", status: "active" }]);
    findManyPluginRegistrations.mockResolvedValue([]);
    findFirstPluginRegistrations.mockResolvedValue(createPluginRecord());
    insertReturning.mockResolvedValue([createPluginRecord()]);
    updateReturning.mockResolvedValue([createPluginRecord()]);
    deleteReturning.mockResolvedValue([createPluginRecord()]);
  });

  it("is server-only and exposes school-scoped lifecycle APIs", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("export async function setPluginEnabled");
    expect(source).toContain("export async function listPluginsForSchool");
    expect(source).toContain("export async function getPluginForSchool");
    expect(source).toContain("export async function deletePluginForSchool");
    expect(source).toContain("export async function getEnabledPluginsForAnchor");
    expect(source).toContain("export async function runPluginHook(input: RunPluginHookInput)");
  });

  it("requires authenticated actor scope and teacher membership for management paths", () => {
    expect(source).toContain("function assertActorId");
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("scope.userId !== input.actorId");
    expect(source).toContain("!scope.schoolIds.includes(input.schoolId)");
    expect(source).not.toContain("actorId?: string | null");
  });

  it("filters enabled plugins by school membership and declared hook anchors", () => {
    expect(source).toContain("hasActiveSchoolMembership");
    expect(source).toContain('membership.status === "active"');
    expect(source).toContain("eq(pluginRegistrations.schoolId, input.schoolId)");
    expect(source).toContain("eq(pluginRegistrations.enabled, true)");
    expect(source).toContain("eq(pluginRegistrations.killSwitchEnabled, false)");
    expect(source).toContain("eq(pluginRegistrations.lifecycleState, \"enabled\")");
    expect(source).toContain("plugin.manifestJson.anchors.includes");
  });

  it("denies and audits school mismatch, permission denial, disabled, and kill switch cases", () => {
    expect(source).toContain("school_mismatch");
    expect(source).toContain("permission_denied");
    expect(source).toContain("lifecycle_blocked");
    expect(source).toContain("kill_switch");
    expect(source).toContain("not_allowlisted");
    expect(source).toContain("requiredPermission");
    expect(source).toContain("denied: true");
    expect(source).toContain("plugin.schoolId !== input.schoolId");
    expect(source).toContain("await createHookRun");
    expect(source).toContain("await createPluginAudit");
    expect(source).toContain("await createGovernanceAudit");
  });

  it("persists lifecycle transitions and governance audit metadata", () => {
    expect(source).toContain("pluginLifecycleTransitions");
    expect(source).toContain("governanceAudits");
    expect(source).toContain("lifecycleState");
    expect(source).toContain("correlationId");
  });

  it("declares lifecycle transition matrix and illegal transition guard", () => {
    expect(source).toContain("PLUGIN_LIFECYCLE_TRANSITION_MATRIX");
    expect(source).toContain("export function assertPluginLifecycleTransition");
    expect(source).toContain('throw new Error("LIFECYCLE_ILLEGAL_TRANSITION")');
  });

  it("exports lifecycle transition and uninstall preflight APIs", () => {
    expect(source).toContain("export async function transitionPluginLifecycle");
    expect(source).toContain("export async function preflightUninstallPlugin");
    expect(source).toContain("export async function uninstallPlugin");
  });

  it("registers validated theme tokens when enabling theme plugins", () => {
    expect(source).toContain("manifest.theme");
    expect(source).toContain('`${plugin.name} theme`');
    expect(source).toContain("registerThemeTokens(plugin.schoolId");
    expect(source).toContain("registeredThemeId");
  });

  it("centralizes plugin install and reconcile truth in one DAL seam", () => {
    expect(source).toContain("export async function installOrReconcilePlugin");
    expect(source).toContain("return installOrReconcilePlugin({");
    expect(source).toContain('installSource: "manual"');
    expect(source).toContain("reason: \"registered\"");
    expect(source).toContain("reason: \"reconciled\"");
  });

  it("stores and guards canonical plugin identity and namespace fields", () => {
    expect(source).toContain("pluginKey = parsedManifest.id");
    expect(source).toContain("dbNamespace: derivedNamespace");
    expect(source).toContain("dbNamespace: targetRecord.dbNamespace");
    expect(source).toContain("PLUGIN_KEY_CONFLICT");
    expect(source).toContain("PLUGIN_DB_NAMESPACE_CONFLICT");
    expect(source).toContain("PLUGIN_DB_NAMESPACE_FROZEN");
    expect(source).toContain('const shouldReconcileExisting = input.installSource !== "manual" || Boolean(input.pluginId);');
  });

  it("keeps namespace helper aligned with migration parity corpus", () => {
    const migration = readFileSync("drizzle/0011_phase44_plugin_identity_namespace.sql", "utf8");

    expect(source).toContain("export function deriveDbNamespace");
    expect(source).toContain('.replace(/[-.:/@\\s]+/g, "_")');
    expect(source).toContain('.replace(/_+/g, "_")');
    expect(source).toContain('return prefixed.slice(0, 48);');
    expect(migration).toContain("vendor/plugin-name -> vendor_plugin_name");
    expect(migration).toContain("vendor--plugin..name -> vendor_plugin_name");
    expect(migration).toContain("123-plugin -> p_123_plugin");
    expect(migration).toContain("vendor/plugin-------------------------------------------extremely-long-suffix -> vendor_plugin_extremely_long_suffix");
  });

  it("derives namespace corpus values exactly for phase 44 edge cases", async () => {
    const { deriveDbNamespace } = await import("./plugins");

    expect(deriveDbNamespace("vendor/plugin-name")).toBe("vendor_plugin_name");
    expect(deriveDbNamespace("vendor--plugin..name")).toBe("vendor_plugin_name");
    expect(deriveDbNamespace("123-plugin")).toBe("p_123_plugin");
    expect(deriveDbNamespace("vendor/plugin-------------------------------------------extremely-long-suffix")).toBe(
      "vendor_plugin_extremely_long_suffix",
    );
  });

  it("installs plugin identity fields from SQL truth on first register", async () => {
    const { installOrReconcilePlugin } = await import("./plugins");

    const result = await installOrReconcilePlugin({
      schoolId: "school-1",
      actorId: "teacher-1",
      name: "Vendor Plugin",
      manifestJson: createManifest(),
      installSource: "manual",
    });

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      schoolId: "school-1",
      name: "Vendor Plugin",
      pluginKey: "vendor/plugin-name",
      dbNamespace: "vendor_plugin_name",
      sourceType: "external",
      installSource: "manual",
    }));
    expect(result).toMatchObject({
      id: "plugin-1",
      pluginKey: "vendor/plugin-name",
      dbNamespace: "vendor_plugin_name",
      sourceType: "external",
      installSource: "manual",
    });
  });

  it("rejects manual duplicate pluginKey installs with explicit conflict tokens", async () => {
    const { installOrReconcilePlugin, PLUGIN_KEY_CONFLICT } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({ id: "plugin-existing", pluginKey: "vendor/plugin-name", dbNamespace: "vendor_plugin_name" }),
    ]);

    await expect(
      installOrReconcilePlugin({
        schoolId: "school-1",
        actorId: "teacher-1",
        name: "Vendor Plugin",
        manifestJson: createManifest(),
        installSource: "manual",
      }),
    ).rejects.toThrow(PLUGIN_KEY_CONFLICT);
  });

  it("rejects same-school namespace collisions with explicit conflict tokens", async () => {
    const { installOrReconcilePlugin, PLUGIN_DB_NAMESPACE_CONFLICT } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({
        id: "plugin-existing",
        pluginKey: "vendor--plugin..name",
        dbNamespace: "vendor_plugin_name",
      }),
    ]);

    await expect(
      installOrReconcilePlugin({
        schoolId: "school-1",
        actorId: "teacher-1",
        name: "Vendor Plugin",
        manifestJson: createManifest(),
        installSource: "manual",
      }),
    ).rejects.toThrow(PLUGIN_DB_NAMESPACE_CONFLICT);
  });

  it("reconciles existing plugin rows in place without changing operator-managed posture", async () => {
    const { installOrReconcilePlugin } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({
        id: "plugin-existing",
        name: "Old Name",
        installSource: "bootstrap",
        enabled: false,
        killSwitchEnabled: true,
        lifecycleState: "disabled",
      }),
    ]);
    updateReturning.mockResolvedValueOnce([
      createPluginRecord({
        id: "plugin-existing",
        name: "New Name",
        installSource: "bootstrap",
        enabled: false,
        killSwitchEnabled: true,
        lifecycleState: "disabled",
      }),
    ]);

    const result = await installOrReconcilePlugin({
      pluginId: "plugin-existing",
      schoolId: "school-1",
      actorId: "teacher-1",
      name: "New Name",
      manifestJson: createManifest({ builtIn: true, defaultEnabled: true }),
      installSource: "bootstrap",
      forceDefaultEnabledSnapshot: true,
    });

    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      name: "New Name",
      pluginKey: "vendor/plugin-name",
      dbNamespace: "vendor_plugin_name",
      installSource: "bootstrap",
      enabled: false,
      killSwitchEnabled: true,
      lifecycleState: "disabled",
    }));
    expect(result).toMatchObject({
      id: "plugin-existing",
      dbNamespace: "vendor_plugin_name",
      installSource: "bootstrap",
      enabled: false,
      killSwitchEnabled: true,
      lifecycleState: "disabled",
    });
  });

  it("rejects namespace overrides once a plugin namespace is frozen", async () => {
    const { installOrReconcilePlugin, PLUGIN_DB_NAMESPACE_FROZEN } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({ id: "plugin-existing", dbNamespace: "vendor_plugin_name" }),
    ]);

    await expect(
      installOrReconcilePlugin({
        pluginId: "plugin-existing",
        schoolId: "school-1",
        actorId: "teacher-1",
        name: "Vendor Plugin",
        manifestJson: createManifest(),
        installSource: "repair",
        dbNamespace: "different_namespace",
      }),
    ).rejects.toThrow(PLUGIN_DB_NAMESPACE_FROZEN);
  });

  it("exports explicit plugin action permission requirements", () => {
    expect(registrySource).toContain("export const PLUGIN_ACTION_PERMISSION_REQUIREMENTS");
    expect(registrySource).toContain('addStepSuggestion: "lesson:write:suggestion"');
    expect(registrySource).toContain('annotateLesson: "lesson:write:annotation"');
    expect(registrySource).toContain('createNotificationStub: "notification:create:stub"');
  });

  it("exposes getPluginIdentityMetadataForSchool with correct authentication and DTO fields", async () => {
    const { getPluginIdentityMetadataForSchool } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({
        id: "plugin-opt",
        pluginKey: "vendor/op-plugin",
        dbNamespace: "vendor_op_plugin",
        sourceType: "external",
        installSource: "manual",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
      }),
    ]);

    const result = await getPluginIdentityMetadataForSchool({
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(assertActiveTeacher).toHaveBeenCalled();
    expect(findManyPluginRegistrations).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "plugin-opt",
      schoolId: "school-1",
      name: "Plugin One",
      pluginKey: "vendor/op-plugin",
      dbNamespace: "vendor_op_plugin",
      sourceType: "external",
      installSource: "manual",
      enabled: true,
      killSwitchEnabled: false,
      lifecycleState: "enabled",
    });
  });

  it("blocks illegal lifecycle transitions from installed to suspended", async () => {
    const { transitionPluginLifecycle } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ lifecycleState: "installed" }));

    await expect(
      transitionPluginLifecycle({
        pluginId: "plugin-1",
        schoolId: "school-1",
        actorId: "teacher-1",
        targetState: "suspended",
        reason: "manual",
      }),
    ).rejects.toThrow("LIFECYCLE_ILLEGAL_TRANSITION");
  });

  it("transitions lifecycle inside db.transaction and writes lifecycle + audit rows", async () => {
    const { transitionPluginLifecycle } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ lifecycleState: "installed", enabled: false }));
    updateReturning.mockResolvedValueOnce([
      createPluginRecord({ lifecycleState: "enabled", enabled: true }),
    ]);

    const result = await transitionPluginLifecycle({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      targetState: "enabled",
      reason: "enabled",
    });

    expect(transactionMock).toHaveBeenCalled();
    expect(dbInsert).toHaveBeenCalledTimes(2 + 1);
    expect(result).toMatchObject({ lifecycleState: "enabled", enabled: true });
  });

  it("preflights uninstall counts across all plugin-owned physical tables", async () => {
    const { preflightUninstallPlugin } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "external" }));
    selectWhere
      .mockResolvedValueOnce([{ lessonId: "lesson-1" }])
      .mockResolvedValueOnce([{ lessonStepId: "step-1" }, { lessonStepId: "step-2" }])
      .mockResolvedValueOnce([{ resourceId: "resource-1" }])
      .mockResolvedValueOnce([{ key: "key-1" }, { key: "key-2" }]);

    const result = await preflightUninstallPlugin({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(result).toMatchObject({
      blocked: false,
      lessonExtCount: 1,
      stepExtCount: 2,
      resourceExtCount: 1,
      ownedBusinessCount: 2,
      totalCount: 6,
    });
  });

  it("blocks default plugin uninstall in preflight and operation", async () => {
    const { preflightUninstallPlugin, uninstallPlugin } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "default" }));
    const preflight = await preflightUninstallPlugin({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });
    expect(preflight).toMatchObject({ blocked: true, reason: "UNINSTALL_BLOCKED_DEFAULT_PLUGIN" });

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "default" }));
    await expect(
      uninstallPlugin({ pluginId: "plugin-1", schoolId: "school-1", actorId: "teacher-1" }),
    ).rejects.toThrow("UNINSTALL_BLOCKED_DEFAULT_PLUGIN");
  });

  it("uninstalls external plugin in transaction and relies on cascade delete", async () => {
    const { uninstallPlugin } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "external" }));
    deleteReturning.mockResolvedValueOnce([createPluginRecord({ sourceType: "external" })]);

    const result = await uninstallPlugin({ pluginId: "plugin-1", schoolId: "school-1", actorId: "teacher-1" });

    expect(transactionMock).toHaveBeenCalled();
    expect(dbDelete).toHaveBeenCalled();
    expect(result).toMatchObject({ id: "plugin-1" });
  });
});
