import { z } from "zod";

export const ScheduleReminderTypeSchema = z.enum(["pre_class", "schedule_change"]);

export const ScheduleReminderStatusSchema = z.enum(["planned", "sent", "failed", "retry_required"]);

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
export type ScheduleReminderRuleInput = z.infer<typeof ScheduleReminderRuleInputSchema>;
export type ScheduleReminderRuleDTO = z.infer<typeof ScheduleReminderRuleDTOSchema>;
export type ScheduleReminderDispatchDTO = z.infer<typeof ScheduleReminderDispatchDTOSchema>;
export type ScheduleReminderCenterDTO = z.infer<typeof ScheduleReminderCenterDTOSchema>;
