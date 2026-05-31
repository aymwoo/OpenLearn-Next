import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  classifyPartialFailure,
  classifyReconnectRecovery,
  classifyRedisDegraded,
  classifyWorkerBacklog,
  summarizePhase60DrillOutcomes,
} from "./phase60-drill-classifier.js";
import { PHASE60_THRESHOLDS } from "./phase60-thresholds.js";

const GREEN_READY_PAYLOAD = {
  components: {
    worker: {
      posture: "green",
      blocking: true,
      reason: "worker ready",
      nextStep: "continue",
    },
    fanout: {
      posture: "green",
      blocking: false,
      reason: "fanout ready",
      nextStep: "continue",
    },
  },
};

describe("phase60 drill classifier", () => {
  it("treats worker backlog breaches as close blockers", () => {
    expect(
      classifyWorkerBacklog({
        backlogMs: PHASE60_THRESHOLDS.workerBacklogWindowMs + 1,
        readyPayload: GREEN_READY_PAYLOAD,
      }),
    ).toMatchObject({
      status: "close-blocker",
    });
  });

  it("turns reconnect and partial-failure breaches into rollback-trigger candidates", () => {
    expect(
      classifyReconnectRecovery({
        recoveryMs: PHASE60_THRESHOLDS.reconnectRecoveryMs + 5_000,
      }),
    ).toMatchObject({
      status: "rollback-trigger-candidate",
    });

    expect(
      classifyPartialFailure({
        failureRatio: PHASE60_THRESHOLDS.partialFailureRatioMax,
      }),
    ).toMatchObject({
      status: "rollback-trigger-candidate",
    });
  });

  it("keeps fanout-only degradation visible but non-blocking unless worker posture also fails", () => {
    const fanoutOnly = classifyRedisDegraded({
      degradedDurationMs: PHASE60_THRESHOLDS.degradedDurationMs + 1,
      readyPayload: {
        components: {
          worker: GREEN_READY_PAYLOAD.components.worker,
          fanout: {
            posture: "degraded",
            blocking: false,
            reason: "fanout redis unreachable",
            nextStep: "inspect transport",
          },
        },
      },
    });
    const workerBlocking = classifyRedisDegraded({
      degradedDurationMs: 5_000,
      readyPayload: {
        components: {
          worker: {
            posture: "degraded",
            blocking: true,
            reason: "worker heartbeat stale",
            nextStep: "restart worker",
          },
          fanout: {
            posture: "degraded",
            blocking: false,
            reason: "fanout redis unreachable",
            nextStep: "inspect transport",
          },
        },
      },
    });

    expect(fanoutOnly.status).toBe("escalate");
    expect(workerBlocking.status).toBe("close-blocker");
  });

  it("summarizes the worst drill outcome and keeps release-status honesty semantics in view", () => {
    const releaseStatusSource = readFileSync("src/lib/ops/release-status.ts", "utf8");

    expect(releaseStatusSource).toContain("worker:");
    expect(releaseStatusSource).toContain("blocking: true");
    expect(releaseStatusSource).toContain("fanout:");
    expect(releaseStatusSource).toContain("blocking: false");

    expect(
      summarizePhase60DrillOutcomes({
        redisDegraded: { status: "escalate", reason: "fanout degraded", nextStep: "inspect" },
        workerBacklog: { status: "pass", reason: "ok", nextStep: "continue" },
        reconnectRetry: { status: "rollback-trigger-candidate", reason: "slow reconnect", nextStep: "rollback" },
        partialFailure: { status: "pass", reason: "ok", nextStep: "continue" },
      }),
    ).toMatchObject({
      status: "rollback-trigger-candidate",
    });
  });
});
