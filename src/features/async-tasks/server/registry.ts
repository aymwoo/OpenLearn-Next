import { z } from "zod";

import {
  CourseImportAsyncTaskPayloadSchema,
  CourseImportAsyncTaskResultSchema,
} from "@/lib/dto/course-import";
import {
  ScheduleReminderDeliveryTaskPayloadSchema,
  ScheduleReminderDeliveryTaskResultSchema,
} from "@/features/schedule/shared/dto/reminders";

import {
  AsyncTaskDefinitionMetadataSchema,
  AsyncTaskProgressSnapshotSchema,
} from "../shared/contract";

const AsyncTaskOperatorRecoveryMetadataSchema = z
  .object({
    enabled: z.boolean().default(false),
    mode: z.literal("same_task_new_attempt").default("same_task_new_attempt"),
    terminalStatuses: z.array(z.literal("failed")).default(["failed"]),
  })
  .strict();

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
  operatorRecovery: z.infer<typeof AsyncTaskOperatorRecoveryMetadataSchema>;
  payloadSchema: PayloadSchema;
  progressSchema: ProgressSchema;
  resultSchema: ResultSchema;
};

export type AsyncTaskDefinitionInput<
  PayloadSchema extends z.ZodTypeAny = z.ZodTypeAny,
  ProgressSchema extends z.ZodTypeAny = z.ZodTypeAny,
  ResultSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = z.input<typeof AsyncTaskDefinitionMetadataSchema> & {
  operatorRecovery?: z.input<typeof AsyncTaskOperatorRecoveryMetadataSchema>;
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
  const { payloadSchema, progressSchema, resultSchema, operatorRecovery, ...metadata } = input;

  if (!isZodSchema(payloadSchema) || !isZodSchema(progressSchema) || !isZodSchema(resultSchema)) {
    throw new Error(
      "Async task definitions require payloadSchema, progressSchema, and resultSchema.",
    );
  }

  return {
    ...AsyncTaskDefinitionMetadataSchema.parse(metadata),
    operatorRecovery: AsyncTaskOperatorRecoveryMetadataSchema.parse(operatorRecovery ?? {}),
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
  visibilityScope: "school_operator",
  entityRefKind: "course_import_batch",
  labelKey: "asyncTasks.courseImport.applyBatch.label",
  summaryKey: "asyncTasks.courseImport.applyBatch.summary",
  payloadSchema: CourseImportAsyncTaskPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: CourseImportAsyncTaskResultSchema,
  operatorRecovery: {
    enabled: true,
    mode: "same_task_new_attempt",
    terminalStatuses: ["failed"],
  },
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

export const scheduleReminderDeliveryTaskDefinition = createAsyncTaskDefinition({
  taskType: "schedule.reminder_delivery",
  featureArea: "schedule",
  visibilityScope: "school_operator",
  entityRefKind: "schedule_reminder_dispatch",
  labelKey: "asyncTasks.schedule.reminderDelivery.label",
  summaryKey: "asyncTasks.schedule.reminderDelivery.summary",
  payloadSchema: ScheduleReminderDeliveryTaskPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: ScheduleReminderDeliveryTaskResultSchema,
  operatorRecovery: {
    enabled: true,
    mode: "same_task_new_attempt",
    terminalStatuses: ["failed"],
  },
  reliability: {
    queueName: "schedule-reminders",
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
  [scheduleReminderDeliveryTaskDefinition.taskType]: scheduleReminderDeliveryTaskDefinition,
} satisfies Record<string, AsyncTaskDefinition>;

export type AsyncTaskRegistry = typeof asyncTaskRegistry;
