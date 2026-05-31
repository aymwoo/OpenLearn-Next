import { describe, expect, it } from "vitest";

import {
  buildPhase60DeployCommand,
  buildPhase60RollbackCommand,
  determinePhase60RollbackTrigger,
  evaluatePhase60RollbackSuccess,
  PHASE60_TRANSPORT_FALLBACK_MANUAL_NOTE,
} from "./rehearse-phase60-rollout-rollback";

describe("phase60 rollout/rollback rehearsal", () => {
  it("reuses only the canonical deploy and rollback scripts", () => {
    const deploy = buildPhase60DeployCommand({
      environment: "pilot-single-school",
      actor: "operator",
      sharedRoot: "/srv/openlearn/shared",
      currentRoot: "/srv/openlearn/current",
      baseUrl: "http://127.0.0.1:3000",
      schoolId: "school-1",
      classroomSessionId: "session-1",
      lessonVersionId: "lesson-version-1",
      pluginId: "plugin-1",
      actionKey: "launchVote",
      commandId: "command-1",
      taskId: "task-1",
      dryRun: true,
    });
    const rollback = buildPhase60RollbackCommand({
      releaseId: "release-1",
      reason: "sample regression",
      sharedRoot: "/srv/openlearn/shared",
      currentRoot: "/srv/openlearn/current",
      baseUrl: "http://127.0.0.1:3000",
      dryRun: true,
    });

    expect(deploy.command).toBe("bash");
    expect(deploy.args[0]).toBe("ops/deploy/deploy.sh");
    expect(rollback.command).toBe("bash");
    expect(rollback.args[0]).toBe("ops/deploy/rollback.sh");
  });

  it("allows rollback triggers only from sample-smoke regression or ready blockers", () => {
    expect(
      determinePhase60RollbackTrigger({
        smokeResult: { status: "close-blocker", blockingFailure: "sample broken" },
        readyStatus: 200,
        readyPayload: { blocking: [] },
      }),
    ).toMatchObject({
      kind: "sample-smoke-regression",
    });

    expect(
      determinePhase60RollbackTrigger({
        smokeResult: { status: "passed" },
        readyStatus: 503,
        readyPayload: { blocking: ["worker"], reason: "worker degraded" },
      }),
    ).toMatchObject({
      kind: "ready-blocker",
    });

    expect(
      determinePhase60RollbackTrigger({
        smokeResult: { status: "passed" },
        readyStatus: 200,
        readyPayload: { blocking: [] },
      }),
    ).toBeNull();
  });

  it("requires health, ready, and sample smoke for rollback success", () => {
    expect(
      evaluatePhase60RollbackSuccess({
        healthStatus: 200,
        readyStatus: 200,
        smokeStatus: "passed",
        dryRun: false,
      }),
    ).toMatchObject({
      ok: true,
    });

    expect(
      evaluatePhase60RollbackSuccess({
        healthStatus: 200,
        readyStatus: 503,
        smokeStatus: "passed",
        dryRun: false,
      }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("keeps transport fallback as manual evidence rather than an automated pass", () => {
    expect(PHASE60_TRANSPORT_FALLBACK_MANUAL_NOTE).toContain("manual evidence only");
    expect(PHASE60_TRANSPORT_FALLBACK_MANUAL_NOTE).toContain("transport-fallback-notes.md");
    expect(PHASE60_TRANSPORT_FALLBACK_MANUAL_NOTE).toContain("do not treat it as an automated pass bit");
  });
});
