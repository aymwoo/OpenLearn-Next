import {
  classifyPhase60Threshold,
  PHASE60_THRESHOLDS,
  summarizePhase60Outcomes,
} from "./phase60-thresholds.js";

function extractReadyComponent(readyPayload, key) {
  return readyPayload?.components?.[key] ?? null;
}

export function classifyWorkerBacklog(input) {
  const worker = extractReadyComponent(input.readyPayload, "worker");

  if (worker?.blocking && worker.posture !== "green") {
    return {
      label: "worker backlog",
      status: "close-blocker",
      measuredValue: input.backlogMs,
      threshold: PHASE60_THRESHOLDS.workerBacklogWindowMs,
      reason: `Worker posture is ${worker.posture}: ${worker.reason}`,
      nextStep: worker.nextStep,
    };
  }

  return classifyPhase60Threshold({
    label: "worker backlog",
    value: input.backlogMs,
    threshold: PHASE60_THRESHOLDS.workerBacklogWindowMs,
    onBreach: "close-blocker",
    breachReason: `Worker backlog reached ${input.backlogMs} ms and exceeded the ${PHASE60_THRESHOLDS.workerBacklogWindowMs} ms blocker window.`,
  });
}

export function classifyReconnectRecovery(input) {
  return classifyPhase60Threshold({
    label: "reconnect recovery",
    value: input.recoveryMs,
    threshold: PHASE60_THRESHOLDS.reconnectRecoveryMs,
    onBreach: "rollback-trigger-candidate",
    breachReason: `Reconnect recovery took ${input.recoveryMs} ms and exceeded the ${PHASE60_THRESHOLDS.reconnectRecoveryMs} ms stop rule.`,
  });
}

export function classifyPartialFailure(input) {
  return classifyPhase60Threshold({
    label: "partial failure ratio",
    value: input.failureRatio,
    threshold: PHASE60_THRESHOLDS.partialFailureRatioMax,
    comparator: "lt",
    onBreach: "rollback-trigger-candidate",
    breachReason: `Partial failure ratio reached ${input.failureRatio} and must stay below ${PHASE60_THRESHOLDS.partialFailureRatioMax}.`,
  });
}

export function classifyRedisDegraded(input) {
  const worker = extractReadyComponent(input.readyPayload, "worker");
  const fanout = extractReadyComponent(input.readyPayload, "fanout");

  if (worker?.blocking && worker.posture !== "green") {
    return {
      label: "redis degraded",
      status: "close-blocker",
      measuredValue: input.degradedDurationMs,
      threshold: PHASE60_THRESHOLDS.degradedDurationMs,
      reason: `Worker posture is ${worker.posture}: ${worker.reason}`,
      nextStep: worker.nextStep,
    };
  }

  if (!fanout || fanout.posture === "green") {
    return {
      label: "redis degraded",
      status: "pass",
      measuredValue: input.degradedDurationMs,
      threshold: PHASE60_THRESHOLDS.degradedDurationMs,
      reason: "Redis fanout posture is green or not required for the current pilot rehearsal.",
      nextStep: "No transport fallback rehearsal trigger is active.",
    };
  }

  const durationOutcome = classifyPhase60Threshold({
    label: "redis degraded duration",
    value: input.degradedDurationMs,
    threshold: PHASE60_THRESHOLDS.degradedDurationMs,
    onBreach: "escalate",
    breachReason: `Redis fanout stayed degraded for ${input.degradedDurationMs} ms, exceeding the ${PHASE60_THRESHOLDS.degradedDurationMs} ms operator window.`,
    nextStep: "Keep transport fallback in the manual rehearsal lane and capture operator evidence before deciding on rollback.",
  });

  return {
    label: "redis degraded",
    status: "escalate",
    measuredValue: input.degradedDurationMs,
    threshold: PHASE60_THRESHOLDS.degradedDurationMs,
    reason: durationOutcome.status === "pass"
      ? `Fanout is ${fanout.posture} but remains non-blocking: ${fanout.reason}`
      : durationOutcome.reason,
    nextStep: durationOutcome.nextStep,
  };
}

export function summarizePhase60DrillOutcomes(drills) {
  const ordered = [
    drills.redisDegraded,
    drills.workerBacklog,
    drills.reconnectRetry,
    drills.partialFailure,
  ];

  return summarizePhase60Outcomes(ordered);
}
