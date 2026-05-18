import { z } from "zod";

import {
  CourseImportAsyncTaskPayloadSchema,
  CourseImportAsyncTaskResultSchema,
} from "@/lib/dto/course-import";

import {
  AsyncTaskDefinitionMetadataSchema,
  AsyncTaskProgressSnapshotSchema,
} from "../shared/contract";

function isZodSchema(value: unknown): value is z.ZodTypeAny {
  return (
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

export type AsyncTaskDefinition<
  PayloadSchema extends z.ZodTypeAny = z.ZodTypeAny,
  ProgressSchema extends z.ZodTypeAny = z.ZodTypeAny,
  ResultSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = z.infer<typeof AsyncTaskDefinitionMetadataSchema> & {
  payloadSchema: PayloadSchema;
  progressSchema: ProgressSchema;
  resultSchema: ResultSchema;
};

export type AsyncTaskDefinitionInput<
  PayloadSchema extends z.ZodTypeAny = z.ZodTypeAny,
  ProgressSchema extends z.ZodTypeAny = z.ZodTypeAny,
  ResultSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = z.input<typeof AsyncTaskDefinitionMetadataSchema> & {
  payloadSchema: PayloadSchema;
  progressSchema: ProgressSchema;
  resultSchema: ResultSchema;
};

export function createAsyncTaskDefinition<
  PayloadSchema extends z.ZodTypeAny,
  ProgressSchema extends z.ZodTypeAny,
  ResultSchema extends z.ZodTypeAny,
>(
  input: AsyncTaskDefinitionInput<PayloadSchema, ProgressSchema, ResultSchema>,
): AsyncTaskDefinition<PayloadSchema, ProgressSchema, ResultSchema> {
  const { payloadSchema, progressSchema, resultSchema, ...metadata } = input;

  if (!isZodSchema(payloadSchema) || !isZodSchema(progressSchema) || !isZodSchema(resultSchema)) {
    throw new Error(
      "Async task definitions require payloadSchema, progressSchema, and resultSchema.",
    );
  }

  return {
    ...AsyncTaskDefinitionMetadataSchema.parse(metadata),
    payloadSchema,
    progressSchema,
    resultSchema,
  };
}

export const AsyncTaskPlatformHealthCheckPayloadSchema = z
  .object({
    requestedBy: z.enum(["developer", "system"]).default("developer"),
    reason: z.string().trim().min(1).nullable().default(null),
  })
  .strict();

export const AsyncTaskPlatformHealthCheckResultSchema = z
  .object({
    checksPassed: z.number().int().nonnegative(),
    checksFailed: z.number().int().nonnegative(),
  })
  .strict();

export const platformHealthCheckTaskDefinition = createAsyncTaskDefinition({
  taskType: "platform.healthcheck",
  featureArea: "platform",
  visibilityScope: "actor_owned",
  entityRefKind: "system_health_check",
  labelKey: "asyncTasks.platform.healthCheck.label",
  summaryKey: "asyncTasks.platform.healthCheck.summary",
  payloadSchema: AsyncTaskPlatformHealthCheckPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: AsyncTaskPlatformHealthCheckResultSchema,
  reliability: {
    queueName: "platform-health",
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1_000,
    },
    deadLetter: {
      terminalStatus: "failed",
      eventType: "task.failed",
    },
    idempotency: {
      strategy: "task_id",
    },
  },
});

export const courseImportApplyBatchTaskDefinition = createAsyncTaskDefinition({
  taskType: "course_import.apply_batch",
  featureArea: "course_import",
  visibilityScope: "actor_owned",
  entityRefKind: "course_import_batch",
  labelKey: "asyncTasks.courseImport.applyBatch.label",
  summaryKey: "asyncTasks.courseImport.applyBatch.summary",
  payloadSchema: CourseImportAsyncTaskPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: CourseImportAsyncTaskResultSchema,
  reliability: {
    queueName: "course-import",
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    deadLetter: {
      terminalStatus: "failed",
      eventType: "task.failed",
    },
    idempotency: {
      strategy: "task_id",
    },
  },
});

export const asyncTaskRegistry = {
  [platformHealthCheckTaskDefinition.taskType]: platformHealthCheckTaskDefinition,
  [courseImportApplyBatchTaskDefinition.taskType]: courseImportApplyBatchTaskDefinition,
} satisfies Record<string, AsyncTaskDefinition>;

export type AsyncTaskRegistry = typeof asyncTaskRegistry;
