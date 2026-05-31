import type { Phase60OutcomeStatus, Phase60ThresholdOutcome } from "./phase60-thresholds.js";

type ReadyComponent = {
  posture: "green" | "degraded" | "failed";
  blocking: boolean;
  reason: string;
  nextStep: string;
};

type ReadyPayloadLike = {
  components?: {
    worker?: ReadyComponent;
    fanout?: ReadyComponent;
  };
};

export function classifyWorkerBacklog(input: {
  backlogMs: number;
  readyPayload: ReadyPayloadLike | null;
}): Phase60ThresholdOutcome;

export function classifyReconnectRecovery(input: {
  recoveryMs: number;
}): Phase60ThresholdOutcome;

export function classifyPartialFailure(input: {
  failureRatio: number;
}): Phase60ThresholdOutcome;

export function classifyRedisDegraded(input: {
  degradedDurationMs: number;
  readyPayload: ReadyPayloadLike | null;
}): Phase60ThresholdOutcome;

export function summarizePhase60DrillOutcomes(drills: {
  redisDegraded: Pick<Phase60ThresholdOutcome, "status" | "reason" | "nextStep">;
  workerBacklog: Pick<Phase60ThresholdOutcome, "status" | "reason" | "nextStep">;
  reconnectRetry: Pick<Phase60ThresholdOutcome, "status" | "reason" | "nextStep">;
  partialFailure: Pick<Phase60ThresholdOutcome, "status" | "reason" | "nextStep">;
}): {
  status: Phase60OutcomeStatus;
  blockingFailure: string | null;
  nextStep: string;
};
