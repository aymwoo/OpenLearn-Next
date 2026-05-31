export type Phase60OutcomeStatus = "pass" | "escalate" | "rollback-trigger-candidate" | "close-blocker";

export type Phase60ThresholdOutcome = {
  label: string;
  status: Phase60OutcomeStatus;
  measuredValue: number;
  threshold: number;
  comparator?: "lt" | "lte";
  reason: string;
  nextStep: string;
};

export const PHASE60_THRESHOLDS: {
  classrooms: number;
  studentsPerClassroom: number;
  reconnectRecoveryMs: number;
  workerBacklogWindowMs: number;
  partialFailureRatioMax: number;
  degradedDurationMs: number;
};

export const PHASE60_OUTCOME_RANK: Record<Phase60OutcomeStatus, number>;

export function classifyPhase60Threshold(input: {
  label: string;
  value: number;
  threshold: number;
  comparator?: "lt" | "lte";
  onBreach: Exclude<Phase60OutcomeStatus, "pass">;
  breachReason?: string;
  passReason?: string;
  passNextStep?: string;
  nextStep?: string;
}): Phase60ThresholdOutcome;

export function summarizePhase60Outcomes(
  outcomes: Array<Pick<Phase60ThresholdOutcome, "status" | "reason" | "nextStep"> | null | undefined>,
): {
  status: Phase60OutcomeStatus;
  blockingFailure: string | null;
  nextStep: string;
};
