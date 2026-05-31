import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import { toAsyncTaskDetailDTOInput } from "@/features/async-tasks/server/mapper";

const source = readFileSync("src/lib/dal/async-task-operator.ts", "utf8");
const verifierSource = existsSync("scripts/verify-phase43-validation-workloads.ts")
  ? readFileSync("scripts/verify-phase43-validation-workloads.ts", "utf8")
  : "";

type OperatorTaskFixture = Parameters<typeof toAsyncTaskDetailDTOInput>[0];

function buildTaskFixture(taskType: keyof typeof asyncTaskRegistry): OperatorTaskFixture {
  const definition = asyncTaskRegistry[taskType];

  return {
    id: `task-${taskType}`,
    actorId: "teacher-1",
    schoolId: "school-1",
    taskType,
    featureArea: definition.featureArea,
    status: "failed",
    enqueueIntentStatus: "dispatched",
    visibilityScope: definition.visibilityScope,
    entityType: definition.entityRefKind,
    entityId: `entity-${taskType}`,
    entityLabel: `Entity for ${taskType}`,
    labelKey: definition.labelKey,
    summaryKey: definition.summaryKey,
    payloadJson: {},
    latestProgressJson: null,
    latestResultJson: null,
    latestRecoveryJson: {
      posture: "retry_supported",
      updatedAt: "2026-05-20T00:00:00.000Z",
    },
    latestFailureReason: `${taskType}: failed`,
    latestAttemptNumber: 2,
    queueJobId: `job-${taskType}`,
    completedAt: null,
    startedAt: null,
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
  } as OperatorTaskFixture;
}

describe("async task operator dal", () => {
  it("keeps operator overview and detail request-fresh instead of using Next data cache", () => {
    expect(source).not.toContain('"use cache"');
    expect(source).not.toContain("cacheLife(");
    expect(source).not.toContain("cacheTag(");
    expect(source).toContain("Request-fresh by design");
  });

  it("limits operator scope to admin and developer memberships", () => {
    expect(source).toContain('role: "developer"');
    expect(source).toContain('role: "admin"');
    expect(source).toContain("ASYNC_TASK_OPERATOR_FORBIDDEN");
    expect(source).toContain("getUserMembershipsDTO");
  });

  it("derives overview health from heartbeat, BullMQ connection snapshot, and durable task ledger only", () => {
    expect(source).toContain("getBullmqConnectionHealthSnapshot");
    expect(source).toContain("listAsyncWorkerHeartbeats");
    expect(source).toContain("listOperatorVisibleAsyncTasks");
    expect(source).toContain("getAsyncTaskWithEvents");
    expect(source).not.toContain("bullmq");
  });

  it("maps retryEligibility from registry operatorRecovery metadata and groups attempts", () => {
    expect(source).toContain("buildRetryEligibility");
    expect(source).toContain("definition.operatorRecovery");
    expect(source).toContain("canOperatorAccessTask");
    expect(source).toContain("buildAttemptGroups");
    expect(source).toContain("attemptNumber");
  });

  it("keeps operator detail metadata generic for reminder, classroom summary, and knowledge-source workloads", () => {
    const fixtures = [
      "schedule.reminder_delivery",
      "classroom.session_summary",
      "resource.knowledge_source_ingest",
    ] as const;

    for (const taskType of fixtures) {
      const task = buildTaskFixture(taskType);
      const detail = toAsyncTaskDetailDTOInput(task, []);

      expect(detail.metadata.labelKey).toBe(asyncTaskRegistry[taskType].labelKey);
      expect(detail.metadata.summaryKey).toBe(asyncTaskRegistry[taskType].summaryKey);
      expect(detail.recovery?.posture).toBe("retry_supported");
      expect(detail.entityRef.entityLabel).toContain(taskType);
    }
  });

  it("requires a dedicated phase43 verifier with operator-facing workload assertions", () => {
    expect(verifierSource).toContain("schedule.reminder_delivery");
    expect(verifierSource).toContain("classroom.session_summary");
    expect(verifierSource).toContain("resource.knowledge_source_ingest");
    expect(verifierSource).toContain("labelKey");
    expect(verifierSource).toContain("summaryKey");
    expect(verifierSource).toContain("retryEligibility");
  });
});
