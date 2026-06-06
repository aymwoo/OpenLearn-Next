import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PluginGovernanceSnapshotRecord } from "@/lib/dal/plugins";

const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();
const listPluginGovernanceSnapshotRecords = vi.fn();
const writePluginDataAccessAudit = vi.fn();

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: () => getCurrentUserDTO(),
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO: () => getUserMembershipsDTO(),
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
  getCurrentUserDTO.mockReset();
  getUserMembershipsDTO.mockReset();
  listPluginGovernanceSnapshotRecords.mockReset();
  writePluginDataAccessAudit.mockReset();
  writePluginDataAccessAudit.mockResolvedValue(undefined);
  getCurrentUserDTO.mockResolvedValue({ id: ACTOR_ID });
  getUserMembershipsDTO.mockResolvedValue([{ id: "membership-1", schoolId: SCHOOL_ID, role: "teacher", status: "active" }]);
});

describe("assertActionExecutable governance gate", () => {
  it("returns scope + projectionRow when plugin executable and actor is in-school", async () => {
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
    listPluginGovernanceSnapshotRecords.mockResolvedValue([]);

    await expect(
      assertActionExecutable({ actorId: ACTOR_ID, pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toMatchObject({ reason: "non_school_actor_rejected" });

    expect(writePluginDataAccessAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "denied", reasonCode: "non_school_actor_rejected" }),
    );
  });

  it("maps missing actor identity to non_school_actor_rejected (no internal error leak)", async () => {
    getCurrentUserDTO.mockResolvedValue(null);

    await expect(
      assertActionExecutable({ actorId: "", pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toMatchObject({ reason: "non_school_actor_rejected" });

    expect(writePluginDataAccessAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "denied", reasonCode: "non_school_actor_rejected" }),
    );
  });

  it("rejects when session actor identity does not match claimed actorId", async () => {
    getCurrentUserDTO.mockResolvedValue({ id: "someone-else" });

    await expect(
      assertActionExecutable({ actorId: ACTOR_ID, pluginKey: PLUGIN_KEY, verb: "insert", correlationId: "corr-1" }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    expect(listPluginGovernanceSnapshotRecords).not.toHaveBeenCalled();
  });

  it("allows active student memberships to use governed plugin-owned writes", async () => {
    getCurrentUserDTO.mockResolvedValue({ id: "student-1" });
    getUserMembershipsDTO.mockResolvedValue([{ id: "membership-student-1", schoolId: SCHOOL_ID, role: "student", status: "active" }]);
    listPluginGovernanceSnapshotRecords.mockResolvedValue([makeSnapshot()]);

    const result = await assertActionExecutable({
      actorId: "student-1",
      pluginKey: PLUGIN_KEY,
      verb: "upsert",
      correlationId: "corr-student-1",
    });

    expect(result.schoolId).toBe(SCHOOL_ID);
    expect(result.scope.userId).toBe("student-1");
    expect(result.projectionRow.executable).toBe(true);
  });
});
