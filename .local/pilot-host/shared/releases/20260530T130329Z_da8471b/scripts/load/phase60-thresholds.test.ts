import { describe, expect, it } from "vitest";

import {
  classifyPhase60Threshold,
  PHASE60_THRESHOLDS,
  summarizePhase60Outcomes,
} from "./phase60-thresholds.js";

describe("phase60 threshold contract", () => {
  it("freezes the shared 40/5 capacity and stop-rule numbers in one object", () => {
    expect(PHASE60_THRESHOLDS).toEqual({
      classrooms: 5,
      studentsPerClassroom: 40,
      reconnectRecoveryMs: 15_000,
      workerBacklogWindowMs: 120_000,
      partialFailureRatioMax: 0.02,
      degradedDurationMs: 180_000,
    });
  });

  it("classifies healthy measurements as pass and breached measurements as blocker-grade outcomes", () => {
    expect(
      classifyPhase60Threshold({
        label: "worker backlog",
        value: 60_000,
        threshold: PHASE60_THRESHOLDS.workerBacklogWindowMs,
        onBreach: "close-blocker",
      }),
    ).toMatchObject({
      status: "pass",
    });

    expect(
      classifyPhase60Threshold({
        label: "worker backlog",
        value: 180_000,
        threshold: PHASE60_THRESHOLDS.workerBacklogWindowMs,
        onBreach: "close-blocker",
      }),
    ).toMatchObject({
      status: "close-blocker",
      nextStep: expect.stringContaining("Stop the Phase 60 close gate"),
    });
  });

  it("keeps escalation and rollback-candidate results explicit instead of advisory text", () => {
    const reconnect = classifyPhase60Threshold({
      label: "reconnect recovery",
      value: 25_000,
      threshold: PHASE60_THRESHOLDS.reconnectRecoveryMs,
      onBreach: "rollback-trigger-candidate",
    });
    const degraded = classifyPhase60Threshold({
      label: "redis degraded duration",
      value: 240_000,
      threshold: PHASE60_THRESHOLDS.degradedDurationMs,
      onBreach: "escalate",
    });

    expect(reconnect.status).toBe("rollback-trigger-candidate");
    expect(degraded.status).toBe("escalate");
    expect(summarizePhase60Outcomes([degraded, reconnect])).toMatchObject({
      status: "rollback-trigger-candidate",
    });
  });
});
