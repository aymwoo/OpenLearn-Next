import { describe, expect, it } from "vitest";

describe("plugin governance lifecycle contracts", () => {
  it("defines the external five-state lifecycle vocabulary and explicit recovery actions", async () => {
    const contracts = await import("./lifecycle-contracts");

    expect(contracts.GovernanceLifecycleStateSchema.options).toEqual([
      "installed",
      "enabled",
      "active",
      "suspended",
      "uninstalled",
    ]);
    expect(contracts.GovernanceLifecycleStateSchema.options).not.toContain("mounted");
    expect(contracts.GovernanceLifecycleStateSchema.options).not.toContain("ready");
    expect(contracts.GovernanceLifecycleStateSchema.options).not.toContain("failed");

    expect(contracts.PluginGovernanceReasonCodeSchema.options).toEqual(
      expect.arrayContaining([
        "dependency_missing",
        "dependency_cycle",
        "activation_failed",
        "kill_switch",
        "not_enabled",
        "not_installed",
        "cleanup_confirmation_required",
      ]),
    );

    expect(contracts.PluginRecoveryActionSchema.options).toEqual([
      "enable",
      "retry",
      "resume",
      "reconcile",
      "confirm_cleanup",
    ]);
    expect(contracts.PluginRecoveryActionSchema.options).not.toContain("auto_recover");
  });

  it("extends governance snapshots with external lifecycle, internal substate, reason code, and recovery action", async () => {
    const permissions = await import("@/features/runtime-platform/contracts/permissions");

    expect(permissions.GovernanceLifecycleStateSchema.parse("active")).toBe("active");
    expect(() => permissions.GovernanceLifecycleStateSchema.parse("ready")).toThrow();

    expect(
      permissions.GovernanceLifecycleSnapshotSchema.parse({
        state: "enabled",
        blocked: true,
        killSwitchEnabled: false,
        internalSubstate: "failed",
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      }),
    ).toMatchObject({
      state: "enabled",
      internalSubstate: "failed",
      reasonCode: "activation_failed",
      recommendedRecoveryAction: "retry",
    });
  });
});
