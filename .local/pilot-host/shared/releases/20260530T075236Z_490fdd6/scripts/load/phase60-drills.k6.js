import http from "k6/http";
import { check } from "k6";

import {
  classifyPartialFailure,
  classifyReconnectRecovery,
  classifyRedisDegraded,
  classifyWorkerBacklog,
  summarizePhase60DrillOutcomes,
} from "./phase60-drill-classifier.js";

const BASE_URL = __ENV.PHASE60_BASE_URL || "http://127.0.0.1:3000";

export const options = {
  scenarios: {
    rehearsal_drills: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "1m",
    },
  },
  thresholds: {
    checks: ["rate>0.999"],
  },
};

function numberFromEnv(name, fallback) {
  const raw = __ENV[name];
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function runPhase60Drills() {
  const response = http.get(`${BASE_URL}/api/ready`, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  check(response, {
    "ready probe responds": (res) => res.status === 200 || res.status === 503,
  });
}

export function handleSummary(data) {
  const response = http.get(`${BASE_URL}/api/ready`, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
  const readyPayload = response.status === 200 || response.status === 503 ? response.json() : null;

  const drills = {
    redisDegraded: classifyRedisDegraded({
      degradedDurationMs: numberFromEnv("PHASE60_DEGRADED_DURATION_MS", 0),
      readyPayload,
    }),
    workerBacklog: classifyWorkerBacklog({
      backlogMs: numberFromEnv("PHASE60_WORKER_BACKLOG_MS", 0),
      readyPayload,
    }),
    reconnectRetry: classifyReconnectRecovery({
      recoveryMs: numberFromEnv("PHASE60_RECONNECT_RECOVERY_MS", 0),
    }),
    partialFailure: classifyPartialFailure({
      failureRatio: numberFromEnv("PHASE60_PARTIAL_FAILURE_RATIO", 0),
    }),
  };
  const summary = summarizePhase60DrillOutcomes(drills);

  return {
    "ops/releases/evidence/phase60/drill-results.json": JSON.stringify({
      checkedAt: new Date().toISOString(),
      drills,
      status: summary.status,
      blockingFailure: summary.blockingFailure,
      manualRequired: {
        transportFallback: true,
      },
      nextStep: summary.nextStep,
    }, null, 2),
  };
}
