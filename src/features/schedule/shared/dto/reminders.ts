import { z } from "zod";

import {
  AsyncTaskOutcomeCountsSchema,
  AsyncTaskOutcomeStatusSchema,
  AsyncTaskResultSummarySchema,
} from "@/features/async-tasks/shared/contract";

export const ScheduleReminderTypeSchema = z.enum(["pre_class", "schedule_change"]);

export const ScheduleReminderStatusSchema = z.enum([
  "planned",
  "queued",
  "dispatching",
  "running",
  "retrying",
  "sent",
  "failed",
  "retry_required",
]);

export const ScheduleReminderPayloadSchema = z
  .object({
    recipientScope: z.enum(["teacher", "class_operator"]),
    simulateFailure: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const ScheduleReminderDeliveryTaskPayloadSchema = z
  .object({
    dispatchId: z.string().min(1),
    schoolId: z.string().min(1),
    ruleId: z.string().min(1).nullable().default(null),
    actorId: z.string().min(1),
    channel: z.string().min(1),
    scheduledFor: z.string().min(1),
    payload: ScheduleReminderPayloadSchema,
  })
  .strict();

export const ScheduleReminderDeliveryTaskResultSchema = AsyncTaskResultSummarySchema.extend({
  dispatchId: z.string().min(1),
  schoolId: z.string().min(1),
  ruleId: z.string().min(1).nullable().default(null),
  channel: z.string().min(1),
  deliveryStatus: ScheduleReminderStatusSchema,
  failureReason: z.string().nullable().default(null),
  counts: AsyncTaskOutcomeCountsSchema,
  outcome: AsyncTaskOutcomeStatusSchema,
}).strict();

export const ScheduleReminderRuleInputSchema = z
  .object({
    schoolId: z.string().min(1),
    type: ScheduleReminderTypeSchema,
    channel: z.string().min(1),
    recipientScope: z.enum(["teacher", "class_operator"]),
    offsetMinutes: z.number().int().min(0).max(1440),
    enabled: z.boolean().default(true),
  })
  .strict();

export const ScheduleReminderRuleDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  type: ScheduleReminderTypeSchema,
  channel: z.string(),
  recipientScope: z.enum(["teacher", "class_operator"]),
  offsetMinutes: z.number().int().nonnegative(),
  enabled: z.boolean(),
  latestStatus: ScheduleReminderStatusSchema.nullable().default(null),
});

export const ScheduleReminderDispatchDTOSchema = z.object({
  id: z.string(),
  ruleId: z.string().nullable().default(null),
  type: ScheduleReminderTypeSchema,
  channel: z.string(),
  status: ScheduleReminderStatusSchema,
  targetLabel: z.string(),
  scheduledFor: z.string(),
  deliveryTaskId: z.string().nullable().default(null),
  dispatchClaimedAt: z.string().nullable().default(null),
  lastAttemptAt: z.string().nullable().default(null),
  failureReason: z.string().nullable().default(null),
});

export const ScheduleReminderCenterDTOSchema = z.object({
  schoolId: z.string(),
  rules: z.array(ScheduleReminderRuleDTOSchema).default([]),
  deliveries: z.array(ScheduleReminderDispatchDTOSchema).default([]),
});

export type ScheduleReminderType = z.infer<typeof ScheduleReminderTypeSchema>;
export type ScheduleReminderStatus = z.infer<typeof ScheduleReminderStatusSchema>;
export type ScheduleReminderPayload = z.infer<typeof ScheduleReminderPayloadSchema>;
export type ScheduleReminderRuleInput = z.infer<typeof ScheduleReminderRuleInputSchema>;
export type ScheduleReminderRuleDTO = z.infer<typeof ScheduleReminderRuleDTOSchema>;
export type ScheduleReminderDispatchDTO = z.infer<typeof ScheduleReminderDispatchDTOSchema>;
export type ScheduleReminderCenterDTO = z.infer<typeof ScheduleReminderCenterDTOSchema>;
export type ScheduleReminderDeliveryTaskPayload = z.infer<typeof ScheduleReminderDeliveryTaskPayloadSchema>;
export type ScheduleReminderDeliveryTaskResult = z.infer<typeof ScheduleReminderDeliveryTaskResultSchema>;
