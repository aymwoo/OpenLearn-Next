import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  AsyncTaskDefinitionMetadataSchema,
  AsyncTaskEnqueueIntentStatusSchema,
  AsyncTaskProgressSnapshotSchema,
  AsyncTaskResultSummarySchema,
  AsyncTaskStatusSchema,
} from "./contract";
import {
  asyncTaskRegistry,
  createAsyncTaskDefinition,
  platformHealthCheckTaskDefinition,
} from "../server/registry";

describe("async task contracts", () => {
  it("rejects task definitions missing visibilityScope", () => {
    expect(() =>
      createAsyncTaskDefinition({
        taskType: "platform.invalid-missing-visibility",
        featureArea: "platform",
        entityRefKind: "system_health_check",
        labelKey: "asyncTasks.invalid.label",
        summaryKey: "asyncTasks.invalid.summary",
        payloadSchema: z.object({}).strict(),
        progressSchema: AsyncTaskProgressSnapshotSchema,
        resultSchema: z.object({ ok: z.boolean() }).strict(),
      } as never),
    ).toThrow();
  });

  it("rejects task definitions missing entityRefKind", () => {
    expect(() =>
      createAsyncTaskDefinition({
        taskType: "platform.invalid-missing-entity",
        featureArea: "platform",
        visibilityScope: "actor_owned",
        labelKey: "asyncTasks.invalid.label",
        summaryKey: "asyncTasks.invalid.summary",
        payloadSchema: z.object({}).strict(),
        progressSchema: AsyncTaskProgressSnapshotSchema,
        resultSchema: z.object({ ok: z.boolean() }).strict(),
      } as never),
    ).toThrow();
  });

  it("accepts a complete typed definition and exposes it from the registry", () => {
    expect(
      AsyncTaskDefinitionMetadataSchema.parse({
        taskType: platformHealthCheckTaskDefinition.taskType,
        featureArea: platformHealthCheckTaskDefinition.featureArea,
        visibilityScope: platformHealthCheckTaskDefinition.visibilityScope,
        entityRefKind: platformHealthCheckTaskDefinition.entityRefKind,
        labelKey: platformHealthCheckTaskDefinition.labelKey,
        summaryKey: platformHealthCheckTaskDefinition.summaryKey,
        reliability: platformHealthCheckTaskDefinition.reliability,
      }),
    ).toMatchObject({
      taskType: "platform.healthcheck",
      featureArea: "platform",
      visibilityScope: "actor_owned",
      entityRefKind: "system_health_check",
    });
    expect(asyncTaskRegistry[platformHealthCheckTaskDefinition.taskType]).toBe(
      platformHealthCheckTaskDefinition,
    );
  });

  it("preserves structured progress and partial-success result vocabulary", () => {
    expect(
      AsyncTaskProgressSnapshotSchema.parse({
        stage: "persisted",
        stageLabelKey: "asyncTasks.stage.persisted",
        messageKey: "asyncTasks.progress.persisted",
        percentComplete: 25,
        counters: {
          total: 4,
          completed: 1,
          failed: 0,
          skipped: 0,
          pending: 3,
        },
        detail: {
          attempt: 1,
        },
        updatedAt: "2026-05-18T12:00:00.000Z",
      }),
    ).toMatchObject({
      stage: "persisted",
      percentComplete: 25,
      counters: {
        total: 4,
      },
    });

    expect(
      AsyncTaskResultSummarySchema.parse({
        outcome: "partially_completed",
        titleKey: "asyncTasks.result.partial.title",
        summaryKey: "asyncTasks.result.partial.summary",
        counts: {
          total: 4,
          succeeded: 3,
          partiallySucceeded: 1,
          failed: 0,
          skipped: 0,
        },
        detail: {
          warningCount: 1,
        },
      }),
    ).toMatchObject({
      outcome: "partially_completed",
      counts: {
        partiallySucceeded: 1,
      },
    });
  });

  it("keeps honest enqueue vocabulary for pre-dispatch states", () => {
    expect(AsyncTaskEnqueueIntentStatusSchema.options).toEqual(
      expect.arrayContaining(["pending_enqueue", "dispatching", "dispatch_failed"]),
    );
  });

  it("extends runtime status vocabulary for retry and stalled recovery posture", () => {
    expect(AsyncTaskStatusSchema.options).toEqual(
      expect.arrayContaining(["retrying", "stalled_recovery"]),
    );
  });
});
