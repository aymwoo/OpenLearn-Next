import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const revalidatePath = vi.fn();

const pluginActionMocks = vi.hoisted(() => ({
  transitionPluginLifecycleAction: vi.fn(),
  setPluginKillSwitchAction: vi.fn(),
}));

const classroomActionMocks = vi.hoisted(() => ({
  runCurrentVotingRecoveryAction: vi.fn(),
}));

vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath,
}));

vi.mock("@/actions/plugin-actions", () => pluginActionMocks);
vi.mock("@/actions/classroom-actions", () => classroomActionMocks);

describe("operator-posture-recovery-actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    pluginActionMocks.transitionPluginLifecycleAction.mockResolvedValue({ success: true });
    pluginActionMocks.setPluginKillSwitchAction.mockResolvedValue({ success: true });
    classroomActionMocks.runCurrentVotingRecoveryAction.mockResolvedValue({ ok: true, data: {} });
  });

  it("routes plugin resume through server-owned seam and refreshes detail paths", async () => {
    const { runOperatorPostureRecoveryAction } = await import("./operator-posture-recovery-actions");

    const result = await runOperatorPostureRecoveryAction({
      scope: "plugin",
      pluginId: "plugin-1",
      schoolId: "school-1",
      recoveryAction: "resume",
      reason: "kill_switch",
      revalidatePaths: ["/settings/labs/commands/command-1", "/settings/labs/plugins/plugin-1"],
    });

    expect(result).toEqual({ success: true });
    expect(pluginActionMocks.transitionPluginLifecycleAction).toHaveBeenCalledWith({
      pluginId: "plugin-1",
      schoolId: "school-1",
      targetState: "enabled",
      reason: "kill_switch",
    });
    expect(updateTag).toHaveBeenCalledWith("plugin:registry");
    expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/commands/command-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/plugins/plugin-1");
  });

  it("routes plugin fallback through kill-switch seam and records cache invalidation", async () => {
    const { runOperatorPostureRecoveryAction } = await import("./operator-posture-recovery-actions");

    const result = await runOperatorPostureRecoveryAction({
      scope: "plugin",
      pluginId: "plugin-1",
      schoolId: "school-1",
      recoveryAction: "fallback",
      reason: "operator_fallback",
      revalidatePaths: ["/settings/labs/plugins/plugin-1"],
    });

    expect(result).toEqual({ success: true });
    expect(pluginActionMocks.setPluginKillSwitchAction).toHaveBeenCalledWith({
      pluginId: "plugin-1",
      killSwitchEnabled: true,
    });
    expect(updateTag).toHaveBeenCalledWith("plugin:registry");
    expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/plugins/plugin-1");
  });

  it("routes classroom posture changes through voting recovery seam and refreshes incident/detail views", async () => {
    const { runOperatorPostureRecoveryAction } = await import("./operator-posture-recovery-actions");

    const result = await runOperatorPostureRecoveryAction({
      scope: "classroom",
      sessionId: "session-1",
      stepId: "step-1",
      recoveryAction: "suspend",
      reason: "operator_suspend",
      revalidatePaths: ["/settings/labs/incidents/session-1", "/settings/labs/commands/command-1"],
    });

    expect(result).toEqual({ success: true });
    expect(classroomActionMocks.runCurrentVotingRecoveryAction).toHaveBeenCalledWith({
      sessionId: "session-1",
      stepId: "step-1",
      recoveryAction: "suspend",
    });
    expect(updateTag).toHaveBeenCalledWith("classroom:session-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/incidents/session-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/commands/command-1");
  });

  it("returns seam errors without pretending success", async () => {
    const { runOperatorPostureRecoveryAction } = await import("./operator-posture-recovery-actions");

    pluginActionMocks.transitionPluginLifecycleAction.mockResolvedValueOnce({
      success: false,
      error: "PLUGIN_LIFECYCLE_TRANSITION_FAILED",
    });

    const result = await runOperatorPostureRecoveryAction({
      scope: "plugin",
      pluginId: "plugin-1",
      schoolId: "school-1",
      recoveryAction: "resume",
      reason: "kill_switch",
    });

    expect(result).toEqual({ success: false, error: "PLUGIN_LIFECYCLE_TRANSITION_FAILED" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
