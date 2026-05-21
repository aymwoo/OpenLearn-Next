import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyPluginRegistrations = vi.fn();
const findFirstPluginRegistrations = vi.fn();
const assertActiveTeacher = vi.fn();
const getUserMembershipsDTO = vi.fn();
const dispatchPluginAction = vi.fn();
const registerThemeTokensMock = vi.hoisted(() => vi.fn());
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
  registerThemeTokens: registerThemeTokensMock,
}));

vi.mock("@/server/plugins/registry", () => ({
  dispatchPluginAction,
  PLUGIN_ACTION_PERMISSION_REQUIREMENTS: {
    addStepSuggestion: "lesson:write:suggestion",
  },
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
    registerThemeTokensMock.mockResolvedValue({ id: "theme-1" });
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
    expect(source).toContain('if (actorScope === "system")');
    expect(source).toContain("scope.userId !== input.actorId");
    expect(source).toContain("!scope.schoolIds.includes(input.schoolId)");
    expect(source).not.toContain("actorId?: string | null");
  });

  it("filters runnable plugins by school membership and declared hook anchors", async () => {
    const { getEnabledPluginsForAnchor } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({ id: "plugin-enabled", enabled: true, lifecycleState: "enabled" }),
      createPluginRecord({
        id: "plugin-mounted",
        enabled: true,
        lifecycleState: "mounted",
        manifestJson: createManifest({ anchors: ["dashboard.widget"] }),
      }),
      createPluginRecord({
        id: "plugin-ready",
        enabled: true,
        lifecycleState: "ready",
        manifestJson: createManifest({ anchors: ["dashboard.widget"] }),
      }),
      createPluginRecord({
        id: "plugin-disabled",
        enabled: false,
        lifecycleState: "disabled",
        manifestJson: createManifest({ anchors: ["lesson.sidebar"] }),
      }),
    ]);

    const result = await getEnabledPluginsForAnchor({
      actorId: "teacher-1",
      schoolId: "school-1",
      hookAnchor: "dashboard.widget",
    });

    expect(result.map((plugin) => plugin.id)).toEqual([
      "plugin-enabled",
      "plugin-mounted",
      "plugin-ready",
    ]);
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
    expect(source).toContain("export async function installOrReconcilePluginWithTx");
    expect(source).toContain("export async function transitionPluginLifecycleWithTx");
    expect(source).toContain("export async function setPluginKillSwitchWithTx");
    expect(source).toContain("export async function preflightUninstallPluginWithTx");
    expect(source).toContain("export async function uninstallPluginWithTx");
    expect(source).toContain("commandContext");
    expect(source).toContain("return installOrReconcilePlugin({");
    expect(source).toContain('installSource: "manual"');
    expect(source).toContain("reason: \"registered\"");
    expect(source).toContain("reason: \"reconciled\"");
  });

  it("keeps legacy public DAL wrappers as thin compatibility adapters over the tx-aware seam", () => {
    expect(source).toContain("return db.transaction(async (tx) => installOrReconcilePluginWithTx({");
    expect(source).toContain("return db.transaction(async (tx) => transitionPluginLifecycleWithTx({");
    expect(source).toContain("const record = await db.transaction(async (tx) => uninstallPluginWithTx({");
    expect(source).toContain("return db.transaction(async (tx) => preflightUninstallPluginWithTx({");
  });

  it("stores and guards canonical plugin identity and namespace fields", () => {
    expect(source).toContain("pluginKey = parsedManifest.id");
    expect(source).toContain("dbNamespace: derivedNamespace");
    expect(source).toContain("dbNamespace: targetRecord.dbNamespace");
    expect(source).toContain("PLUGIN_KEY_CONFLICT");
    expect(source).toContain("PLUGIN_DB_NAMESPACE_CONFLICT");
    expect(source).toContain("PLUGIN_DB_NAMESPACE_FROZEN");
    expect(source).toContain("const hasExplicitRegistrationId = Boolean(input.pluginId);");
    expect(source).toContain('const shouldReconcileExisting = input.installSource !== "manual" || hasExplicitRegistrationId;');
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

  it("treats enabled, mounted, and ready as runnable lifecycle states", async () => {
    const { isRunnablePluginState } = await import("./plugins");

    expect(isRunnablePluginState("enabled")).toBe(true);
    expect(isRunnablePluginState("mounted")).toBe(true);
    expect(isRunnablePluginState("ready")).toBe(true);
    expect(isRunnablePluginState("disabled")).toBe(false);
    expect(isRunnablePluginState("suspended")).toBe(false);
    expect(isRunnablePluginState("failed")).toBe(false);
  });

  it("persists mounted and ready as active enabled posture", async () => {
    const { transitionPluginLifecycle } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValue(createPluginRecord({
      enabled: true,
      lifecycleState: "enabled",
    }));
    updateReturning.mockResolvedValueOnce([
      createPluginRecord({ lifecycleState: "mounted", enabled: true }),
    ]);

    await transitionPluginLifecycle({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      targetState: "mounted",
      reason: "mounted",
    });

    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      lifecycleState: "mounted",
      enabled: true,
    }));

    updateSet.mockClear();
    updateReturning.mockResolvedValueOnce([
      createPluginRecord({ lifecycleState: "ready", enabled: true }),
    ]);

    await transitionPluginLifecycle({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      targetState: "ready",
      reason: "ready",
    });

    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      lifecycleState: "ready",
      enabled: true,
    }));
  });

  it("runs hooks for mounted and ready plugins without lifecycle rejection", async () => {
    const { runPluginHook } = await import("./plugins");

    dispatchPluginAction.mockReturnValueOnce({
      proposalType: "stepSuggestion",
      payload: { id: "suggestion-1" },
    });

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({
      enabled: true,
      lifecycleState: "mounted",
      manifestJson: createManifest({
        permissions: ["lesson:write:suggestion"],
      }),
    }));

    const mountedResult = await runPluginHook({
      actorId: "teacher-1",
      pluginId: "plugin-1",
      schoolId: "school-1",
      hookAnchor: "dashboard.widget",
      input: {
        pluginId: "plugin-1",
        action: "addStepSuggestion",
        payload: {},
      },
    });

    expect(mountedResult).toMatchObject({
      proposalType: "stepSuggestion",
      payload: { id: "suggestion-1" },
    });

    dispatchPluginAction.mockReturnValueOnce({
      proposalType: "stepSuggestion",
      payload: { id: "suggestion-2" },
    });

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({
      enabled: true,
      lifecycleState: "ready",
      manifestJson: createManifest({
        permissions: ["lesson:write:suggestion"],
      }),
    }));

    const readyResult = await runPluginHook({
      actorId: "teacher-1",
      pluginId: "plugin-1",
      schoolId: "school-1",
      hookAnchor: "dashboard.widget",
      input: {
        pluginId: "plugin-1",
        action: "addStepSuggestion",
        payload: {},
      },
    });

    expect(readyResult).toMatchObject({
      proposalType: "stepSuggestion",
      payload: { id: "suggestion-2" },
    });
  });

  it("does not register theme tokens when lifecycle transition fails", async () => {
    const { setPluginEnabled } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({
      lifecycleState: "installed",
      manifestJson: createManifest({
        theme: {
          id: "theme.plugin",
          name: "Plugin Theme",
          tokens: {},
        },
      }),
    }));
    transactionMock.mockRejectedValueOnce(new Error("DB_WRITE_FAILED"));

    await expect(
      setPluginEnabled({
        pluginId: "plugin-1",
        schoolId: "school-1",
        actorId: "teacher-1",
        enabled: true,
      }),
    ).rejects.toThrow("DB_WRITE_FAILED");

    expect(registerThemeTokensMock).not.toHaveBeenCalled();

    transactionMock.mockImplementation(async (callback) => callback({
      insert: dbInsert,
      update: dbUpdate,
      delete: dbDelete,
    }));
  });

  it("blocks non-deletable plugins consistently in preflight and uninstall", async () => {
    const { preflightUninstallPlugin, uninstallPlugin } = await import("./plugins");

    const nonDeletablePlugin = createPluginRecord({
      sourceType: "external",
      manifestJson: createManifest({ nonDeletable: true }),
    });

    findFirstPluginRegistrations.mockResolvedValueOnce(nonDeletablePlugin);
    const preflight = await preflightUninstallPlugin({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(preflight).toMatchObject({
      blocked: true,
      reason: "PLUGIN_BUILT_IN_NOT_DELETABLE",
    });

    findFirstPluginRegistrations.mockResolvedValueOnce(nonDeletablePlugin);
    await expect(
      uninstallPlugin({ pluginId: "plugin-1", schoolId: "school-1", actorId: "teacher-1" }),
    ).rejects.toThrow("PLUGIN_BUILT_IN_NOT_DELETABLE");
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

  it("writes command-aware audit linkage when tx helpers receive command context", async () => {
    const { transitionPluginLifecycleWithTx } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ lifecycleState: "installed", enabled: false }));
    updateReturning.mockResolvedValueOnce([
      createPluginRecord({ lifecycleState: "enabled", enabled: true }),
    ]);

    await transitionPluginLifecycleWithTx({
      tx: {
        insert: dbInsert,
        update: dbUpdate,
      } as never,
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      targetState: "enabled",
      reason: "enabled",
      commandContext: {
        commandId: "command-1",
        correlationId: "corr-1",
        attemptNumber: 2,
      },
    });

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      action: "plugin.lifecycle.transition",
      commandId: "command-1",
      correlationId: "corr-1",
    }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      targetType: "plugin",
      commandId: "command-1",
      correlationId: "corr-1",
    }));
  });

  it("allows trusted system actor scope for tx-aware install reconciliation without session auth", async () => {
    const { installOrReconcilePluginWithTx } = await import("./plugins");

    await installOrReconcilePluginWithTx({
      tx: {
        insert: dbInsert,
        update: dbUpdate,
        delete: dbDelete,
      } as never,
      schoolId: "school-1",
      actorId: "teacher-1",
      actorScope: "system",
      name: "System Plugin",
      manifestJson: createManifest(),
      installSource: "bootstrap",
    });

    expect(assertActiveTeacher).not.toHaveBeenCalled();
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

  it("projects governance snapshot inputs with manifest dependencies and retain posture defaults", async () => {
    const { listPluginGovernanceSnapshotRecords } = await import("./plugins");

    findManyPluginRegistrations.mockResolvedValueOnce([
      createPluginRecord({
        enabled: true,
        lifecycleState: "ready",
        manifestJson: createManifest({
          manifestVersion: 2,
          governance: {
            manifestVersion: 2,
            dependencies: ["vendor/dependency"],
            requestedCapabilities: [],
            permissions: [],
            lifecycle: {
              ownerType: "host",
              installScope: "school",
              initialState: "installed",
              mountMode: "manual",
            },
          },
        }),
      }),
    ]);
    selectWhere.mockResolvedValue([]);

    const records = await listPluginGovernanceSnapshotRecords({
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(records).toMatchObject([
      {
        pluginKey: "vendor/plugin-name",
        dependencies: ["vendor/dependency"],
        activationStatus: "active",
        uninstall: {
          blocked: false,
          totalCount: 0,
          cleanupConfirmationToken: "cleanup:plugin-1:0:0:0:0:0",
        },
      },
    ]);
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

  it("uninstalls external plugin in cleanup mode and relies on cascade delete", async () => {
    const { uninstallPluginWithTx } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "external" }));
    selectWhere
      .mockResolvedValueOnce([{ lessonId: "lesson-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    deleteReturning.mockResolvedValueOnce([createPluginRecord({ sourceType: "external" })]);

    const result = await uninstallPluginWithTx({
      tx: {
        insert: dbInsert,
        update: dbUpdate,
        delete: dbDelete,
      } as never,
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      retentionMode: "cleanup",
      confirmationToken: "cleanup:plugin-1:1:0:0:0:1",
    } as never);

    expect(dbDelete).toHaveBeenCalled();
    expect(result).toMatchObject({ id: "plugin-1" });
  });

  it("generates deterministic cleanup confirmation tokens during uninstall preflight", async () => {
    const { preflightUninstallPlugin } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "external" }));
    selectWhere
      .mockResolvedValueOnce([{ lessonId: "lesson-1" }])
      .mockResolvedValueOnce([{ lessonStepId: "step-1" }, { lessonStepId: "step-2" }])
      .mockResolvedValueOnce([{ resourceId: "resource-1" }, { resourceId: "resource-2" }])
      .mockResolvedValueOnce([{ key: "biz-1" }]);

    const result = await preflightUninstallPlugin({
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(result).toMatchObject({
      cleanupConfirmationToken: "cleanup:plugin-1:1:2:2:1:6",
    });
  });

  it("retains plugin registrations with uninstall metadata instead of hard deleting on retain", async () => {
    const { uninstallPluginWithTx } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({
      sourceType: "external",
      enabled: true,
      killSwitchEnabled: true,
      lifecycleState: "ready",
    }));
    updateReturning.mockResolvedValueOnce([
      createPluginRecord({
        sourceType: "external",
        enabled: false,
        killSwitchEnabled: false,
        lifecycleState: "disabled",
        uninstalledAt: new Date("2026-05-22T00:00:00Z"),
        uninstallRetentionMode: "retain",
      }),
    ]);

    const result = await uninstallPluginWithTx({
      tx: {
        insert: dbInsert,
        update: dbUpdate,
        delete: dbDelete,
      } as never,
      pluginId: "plugin-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      retentionMode: "retain",
      commandContext: {
        commandId: "command-retain",
        correlationId: "corr-retain",
        attemptNumber: 1,
      },
    } as never);

    expect(dbDelete).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      killSwitchEnabled: false,
      lifecycleState: "disabled",
      uninstallRetentionMode: "retain",
    }));
    expect(result).toMatchObject({
      lifecycleState: "disabled",
      enabled: false,
      killSwitchEnabled: false,
    });
  });

  it("rejects cleanup uninstall without matching confirmation token", async () => {
    const { uninstallPluginWithTx } = await import("./plugins");

    findFirstPluginRegistrations.mockResolvedValueOnce(createPluginRecord({ sourceType: "external" }));
    selectWhere
      .mockResolvedValueOnce([{ lessonId: "lesson-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      uninstallPluginWithTx({
        tx: {
          insert: dbInsert,
          update: dbUpdate,
          delete: dbDelete,
        } as never,
        pluginId: "plugin-1",
        schoolId: "school-1",
        actorId: "teacher-1",
        retentionMode: "cleanup",
        confirmationToken: "cleanup:plugin-1:0:0:0:0:0",
      } as never),
    ).rejects.toThrow("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
  });
});
