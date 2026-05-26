import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const revalidatePath = vi.fn();

const classroomActionMocks = vi.hoisted(() => ({
  runCurrentVotingRecoveryAction: vi.fn(),
}));

const classroomDalMocks = vi.hoisted(() => ({
  getClassroomSnapshotDTO: vi.fn(),
}));

vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath,
}));

vi.mock("@/actions/classroom-actions", () => classroomActionMocks);
vi.mock("@/lib/dal/classroom", () => classroomDalMocks);

describe("operator-classroom-recovery-actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    classroomDalMocks.getClassroomSnapshotDTO.mockResolvedValue({
      sessionId: "session-1",
      activeStepId: "step-1",
    });
    classroomActionMocks.runCurrentVotingRecoveryAction.mockResolvedValue({
      ok: true,
      data: { sessionId: "session-1", applied: true },
    });
  });

  it("routes retry through the server-owned voting recovery seam and refreshes incident surfaces", async () => {
    const { runOperatorClassroomRecoveryAction } = await import("./operator-classroom-recovery-actions");

    const result = await runOperatorClassroomRecoveryAction({
      classroomSessionId: "session-1",
      action: "retry",
    });

    expect(result).toEqual({ success: true, action: "retry" });
    expect(classroomDalMocks.getClassroomSnapshotDTO).toHaveBeenCalledWith({
      sessionId: "session-1",
    });
    expect(classroomActionMocks.runCurrentVotingRecoveryAction).toHaveBeenCalledWith({
      sessionId: "session-1",
      stepId: "step-1",
      recoveryAction: "retry",
    });
    expect(updateTag).toHaveBeenCalledWith("classroom:session-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/incidents");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/incidents/session-1");
  });

  it("routes reconcile through the same recovery seam", async () => {
    const { runOperatorClassroomRecoveryAction } = await import("./operator-classroom-recovery-actions");

    const result = await runOperatorClassroomRecoveryAction({
      classroomSessionId: "session-1",
      action: "reconcile",
    });

    expect(result).toEqual({ success: true, action: "reconcile" });
    expect(classroomActionMocks.runCurrentVotingRecoveryAction).toHaveBeenCalledWith({
      sessionId: "session-1",
      stepId: "step-1",
      recoveryAction: "reconcile",
    });
  });

  it("rejects high-risk actions from the summary surface contract", async () => {
    const { runOperatorClassroomRecoveryAction } = await import("./operator-classroom-recovery-actions");

    const result = await runOperatorClassroomRecoveryAction({
      classroomSessionId: "session-1",
      action: "resume" as "resume",
    });

    expect(result.success).toBe(false);
    expect(classroomActionMocks.runCurrentVotingRecoveryAction).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
