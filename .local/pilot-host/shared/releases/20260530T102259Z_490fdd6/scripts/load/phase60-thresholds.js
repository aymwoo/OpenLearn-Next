export const PHASE60_THRESHOLDS = Object.freeze({
  classrooms: 5,
  studentsPerClassroom: 40,
  reconnectRecoveryMs: 15_000,
  workerBacklogWindowMs: 120_000,
  partialFailureRatioMax: 0.02,
  degradedDurationMs: 180_000,
});

export const PHASE60_OUTCOME_RANK = Object.freeze({
  pass: 0,
  escalate: 1,
  "rollback-trigger-candidate": 2,
  "close-blocker": 3,
});

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return String(value);
  }

  if (value >= 1_000) {
    return value.toLocaleString("en-US");
  }

  return String(value);
}

export function classifyPhase60Threshold(input) {
  const comparator = input.comparator ?? "lte";
  const breached = comparator === "lt"
    ? input.value >= input.threshold
    : input.value > input.threshold;

  if (!breached) {
    return {
      label: input.label,
      status: "pass",
      measuredValue: input.value,
      threshold: input.threshold,
      comparator,
      reason: input.passReason ?? `${input.label} stayed within the Phase 60 stop rule.`,
      nextStep: input.passNextStep ?? "Continue the rehearsal close gate.",
    };
  }

  const fallbackReason = comparator === "lt"
    ? `${input.label} reached ${formatNumber(input.value)} and must stay below ${formatNumber(input.threshold)}.`
    : `${input.label} reached ${formatNumber(input.value)} and must stay at or below ${formatNumber(input.threshold)}.`;

  const fallbackNextStep = input.onBreach === "close-blocker"
    ? "Stop the Phase 60 close gate until the blocking condition is cleared."
    : input.onBreach === "rollback-trigger-candidate"
      ? "Treat this result as a rollback-trigger candidate and re-check pilot safety before continuing."
      : "Escalate to the operator rehearsal lane and capture the degraded posture honestly.";

  return {
    label: input.label,
    status: input.onBreach,
    measuredValue: input.value,
    threshold: input.threshold,
    comparator,
    reason: input.breachReason ?? fallbackReason,
    nextStep: input.nextStep ?? fallbackNextStep,
  };
}

export function summarizePhase60Outcomes(outcomes) {
  const normalized = outcomes.filter(Boolean);
  const worst = normalized.reduce((currentWorst, outcome) => {
    if (!currentWorst) {
      return outcome;
    }

    return PHASE60_OUTCOME_RANK[outcome.status] > PHASE60_OUTCOME_RANK[currentWorst.status]
      ? outcome
      : currentWorst;
  }, null);

  return {
    status: worst?.status ?? "pass",
    blockingFailure: worst?.status === "close-blocker" ? worst.reason : null,
    nextStep: worst?.nextStep ?? "Continue the Phase 60 close gate.",
  };
}
