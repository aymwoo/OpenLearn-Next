import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PluginGovernanceSnapshotRecord } from "@/lib/dal/plugins";

const assertActiveTeacher = vi.fn();
const listPluginGovernanceSnapshotRecords = vi.fn();
const writePluginDataAccessAudit = vi.fn();

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: () => assertActiveTeacher(),
}));

vi.mock("@/lib/dal/plugins", () => ({
  listPluginGovernanceSnapshotRecords: (input: unknown) => listPluginGovernanceSnapshotRecords(input),
}));

vi.mock("@/features/platform-core/plugin-data-access/audit", () => ({
  writePluginDataAccessAudit: (input: unknown) => writePluginDataAccessAudit(input),
}));

import { assertActionExecutable } from "@/features/platform-core/plugin-data-access/governance-gate";
import { PluginDataAccessError } from "@/features/platform-core/plugin-data-access/allowlist";

const SCHOOL_ID = "school-1";
const ACTOR_ID = "teacher-1";
const PLUGIN_KEY = "core.quiz";

function makeSnapshot(overrides: Partial<PluginGovernanceSnapshotRecord> = {}): PluginGovernanceSnapshotRecord {
  const pluginId = overrides.pluginId ?? "plugin-1";
  return {
    pluginId,
    pluginKey: PLUGIN_KEY,
    name: "Quiz",
    enabled: true,
    killSwitchEnabled: false,
    lifecycleState: "ready",
    uninstalledAt: null,
    uninstallRetentionMode: null,
    sourceType: "default",
    dependencies: [],
    activationStatus: "active",
    failureDetail: null,
    uninstall: {
      pluginId,
      schoolId: SCHOOL_ID,
      blocked: false,
      reason: null,
      lessonExtCount: 0,
      stepExtCount: 0,
      resourceExtCount: 0,
      ownedBusinessCount: 0,
      totalCount: 0,
      impactedLessonIds: [],
      impactedLessonStepIds: [],
      impactedResourceIds: [],
      impactedBusinessKeys: [],
      cleanupConfirmationToken: "token",
    },
    ...overrides,
  };
}

beforeEach(() => {
  assertActiveTeacher.mockReset();
  listPluginGovernanceSnapshotRecords.mockReset();
  writePluginDataAccessAudit.mockReset();
  writePluginDataAccessAudit.mockResolvedValue(undefined);
});

describe("assertActionExecutable governance gate", () => {
  it("returns scope + projectionRow when plugin executable and actor is in-school", async () => {
    assertActiveTeacher.mockResolvedValue({ userId: ACTOR_ID, schoolIds: [SCHOOL_ID] });
    listPluginGovernanceSnapshotRecords.mockResolvedValue([makeSnapshot()]);

    const result = await assertActionExecutable({
      actorId: ACTOR_ID,
      pluginKey: PLUGIN_KEY,
      verb: "insert",
      correlationId: "corr-1",
    });

    expect(result.schoolId).toBe(SCHOOL_ID);
    expect(result.scope.userId).toBe(ACTOR_ID);
    expect(result.projectionRow.executable).toBe(true);
    expect(writePluginDataAccessAudit).not.toHaveBeenCalled();
  });

  it("rejects with kill_switch_rejected + denial audit when kill switch enabled", async () => {
    assertActiveTeacher.mockResolvedValue({ userId: ACTOR_ID, schoolIds: [SCHOOL_ID] });
    listPluginGovernanceSnapshotRecords.mockResolvedValue([makeSnapshot({ killSwitchEnabled: true })]);

    await expect(
      assertActionExecutable({ actorId: ACTOR_ID, pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toMatchObject({ reason: "kill_switch_rejected" });

    expect(writePluginDataAccessAudit).toHaveBeenCalledTimes(1);
    expect(writePluginDataAccessAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "denied", reasonCode: "kill_switch_rejected", schoolId: SCHOOL_ID }),
    );
  });

  it("rejects with lifecycle_not_executable + denial audit when suspended (no kill switch)", async () => {
    assertActiveTeacher.mockResolvedValue({ userId: ACTOR_ID, schoolIds: [SCHOOL_ID] });
    listPluginGovernanceSnapshotRecords.mockResolvedValue([
      makeSnapshot({ killSwitchEnabled: false, lifecycleState: "suspended" }),
    ]);

    await expect(
      assertActionExecutable({ actorId: ACTOR_ID, pluginKey: PLUGIN_KEY, verb: "count", correlationId: "corr-1" }),
    ).rejects.toMatchObject({ reason: "lifecycle_not_executable" });

    expect(writePluginDataAccessAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "denied", reasonCode: "lifecycle_not_executable" }),
    );
  });

  it("rejects non-school actor (plugin not in any of actor's schools) with non_school_actor_rejected", async () => {
    assertActiveTeacher.mockResolvedValue({ userId: ACTOR_ID, schoolIds: [SCHOOL_ID] });
    listPluginGovernanceSnapshotRecords.mockResolvedValue([]);

    await expect(
      assertActionExecutable({ actorId: ACTOR_ID, pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toMatchObject({ reason: "non_school_actor_rejected" });

    expect(writePluginDataAccessAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "denied", reasonCode: "non_school_actor_rejected" }),
    );
  });

  it("maps missing actor identity to non_school_actor_rejected (no internal error leak)", async () => {
    assertActiveTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

    await expect(
      assertActionExecutable({ actorId: "", pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toMatchObject({ reason: "non_school_actor_rejected" });

    expect(writePluginDataAccessAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "denied", reasonCode: "non_school_actor_rejected" }),
    );
  });

  it("rejects when session actor identity does not match claimed actorId", async () => {
    assertActiveTeacher.mockResolvedValue({ userId: "someone-else", schoolIds: [SCHOOL_ID] });

    await expect(
      assertActionExecutable({ actorId: ACTOR_ID, pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    expect(listPluginGovernanceSnapshotRecords).not.toHaveBeenCalled();
  });
});
