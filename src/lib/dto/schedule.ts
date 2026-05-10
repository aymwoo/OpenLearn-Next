import { z } from "zod";

export const ScheduleImportBatchStatusSchema = z.enum([
  "draft",
  "in_review",
  "ready_to_apply",
  "partially_applied",
  "applied",
  "archived",
]);

export const ScheduleImportRowStatusSchema = z.enum([
  "pending_review",
  "validation_failed",
  "mapping_review",
  "conflict_review",
  "ready_to_apply",
  "approved",
  "rejected",
]);

export const ScheduleImportApprovalStateSchema = z.enum(["pending", "approved", "rejected"]);

export const ScheduleOverrideActionSchema = z.enum(["substitute", "cancel", "move"]);

export const ScheduleReminderTypeSchema = z.enum(["pre_class", "schedule_change"]);

export const ScheduleReminderStatusSchema = z.enum(["planned", "sent", "failed", "retry_required"]);

export const ScheduleAssistantProposalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "draft_created",
]);

export const ScheduleImportValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().nullable().default(null),
  severity: z.enum(["error", "warning"]).default("error"),
});

export const ScheduleImportMappingSummarySchema = z.object({
  termName: z.string(),
  weekdayLabel: z.string(),
  bellSlotLabel: z.string(),
  className: z.string(),
  courseTitle: z.string(),
  teacherName: z.string(),
  roomLabel: z.string().nullable().default(null),
});

export const ScheduleImportConflictSummarySchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  conflictingTargetLabel: z.string().nullable().default(null),
});

export const ScheduleImportDraftRowInputSchema = z.object({
  sourceRowKey: z.string().min(1),
  termName: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  bellSlotLabel: z.string().min(1),
  className: z.string().min(1),
  courseTitle: z.string().min(1),
  teacherName: z.string().min(1),
  roomLabel: z.string().nullable().default(null),
});

export const ScheduleImportDraftInputSchema = z
  .object({
    schoolId: z.string().min(1),
    sourceType: z.enum(["csv", "xlsx", "connector"]),
    sourceLabel: z.string().min(1),
    connectorKey: z.string().nullable().optional(),
    rows: z.array(ScheduleImportDraftRowInputSchema).min(1),
  })
  .strict();

export const ApproveScheduleImportInputSchema = z
  .object({
    batchId: z.string().min(1),
    approvedRowIds: z.array(z.string().min(1)).default([]),
    rejectedRowIds: z.array(z.string().min(1)).default([]),
    approvalNote: z.string().trim().nullable().optional(),
  })
  .strict();

export const ScheduleImportRowReviewDTOSchema = z.object({
  id: z.string(),
  sourceRowKey: z.string(),
  status: ScheduleImportRowStatusSchema,
  approvalState: ScheduleImportApprovalStateSchema,
  validationIssues: z.array(ScheduleImportValidationIssueSchema).default([]),
  mappingSummary: ScheduleImportMappingSummarySchema.nullable().default(null),
  conflictSummary: z.array(ScheduleImportConflictSummarySchema).default([]),
  approvalNote: z.string().nullable().default(null),
  reviewedById: z.string().nullable().default(null),
  reviewedAt: z.string().nullable().default(null),
});

export const ScheduleImportBatchDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  sourceType: z.enum(["csv", "xlsx", "connector"]),
  sourceLabel: z.string(),
  status: ScheduleImportBatchStatusSchema,
  rowCount: z.number().int().nonnegative(),
  approvedRowCount: z.number().int().nonnegative(),
  rejectedRowCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rows: z.array(ScheduleImportRowReviewDTOSchema).default([]),
});

export const TeacherDailyAgendaCardDTOSchema = z.object({
  id: z.string(),
  recurringEntryId: z.string(),
  assignmentId: z.string(),
  timeLabel: z.string(),
  classLabel: z.string(),
  locationLabel: z.string(),
  status: z.enum(["正常", "进行中", "即将开始", "已变更", "代课", "停课"]),
  courseTitle: z.string(),
  overrideSummary: z.string().nullable().default(null),
  lessonLink: z
    .object({
      lessonId: z.string(),
      lessonTitle: z.string(),
    })
    .nullable()
    .default(null),
});

export const TeacherDailyAgendaDTOSchema = z.object({
  teacherId: z.string(),
  date: z.string(),
  dateLabel: z.string(),
  weekLabel: z.string(),
  nextClassCountdownLabel: z.string().nullable().default(null),
  cards: z.array(TeacherDailyAgendaCardDTOSchema).default([]),
});

export const ClassDailyAgendaCardDTOSchema = z.object({
  id: z.string(),
  recurringEntryId: z.string(),
  assignmentId: z.string(),
  timeLabel: z.string(),
  teacherLabel: z.string(),
  locationLabel: z.string(),
  status: z.enum(["正常", "进行中", "即将开始", "已变更", "代课", "停课"]),
  courseTitle: z.string(),
  overrideSummary: z.string().nullable().default(null),
});

export const ScheduleOverrideInputSchema = z
  .object({
    recurringEntryId: z.string().min(1),
    effectiveDate: z.string().min(1),
    action: ScheduleOverrideActionSchema,
    reason: z.string().min(1),
    substituteTeacherId: z.string().nullable().optional(),
    replacementBellSlotId: z.string().nullable().optional(),
    replacementRoomLabel: z.string().nullable().optional(),
  })
  .strict();

export const ScheduleHolidayDateInputSchema = z
  .object({
    calendarId: z.string().min(1),
    date: z.string().min(1),
    dayType: z.enum(["holiday", "non_teaching", "make_up", "teaching"]),
    label: z.string().min(1),
    note: z.string().trim().nullable().optional(),
  })
  .strict();

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

export const ScheduleRecurringSummaryDTOSchema = z.object({
  recurringEntryId: z.string(),
  assignmentId: z.string(),
  classLabel: z.string(),
  teacherLabel: z.string(),
  courseTitle: z.string(),
  weekdayLabel: z.string(),
  bellSlotLabel: z.string(),
  timeLabel: z.string(),
  roomLabel: z.string().nullable().default(null),
});

export const ScheduleHolidayDateDTOSchema = z.object({
  id: z.string(),
  date: z.string(),
  dayType: z.enum(["holiday", "non_teaching", "make_up", "teaching"]),
  label: z.string(),
  note: z.string().nullable().default(null),
});

export const ScheduleOperationsCenterDTOSchema = z.object({
  schoolId: z.string(),
  calendarId: z.string(),
  recurringEntries: z.array(ScheduleRecurringSummaryDTOSchema).default([]),
  holidayDates: z.array(ScheduleHolidayDateDTOSchema).default([]),
});

export const ScheduleAssistantProposalDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  proposalType: z.enum(["import_mapping", "conflict_explanation", "override_suggestion"]),
  targetType: z.string(),
  targetId: z.string(),
  status: ScheduleAssistantProposalStatusSchema,
  title: z.string(),
  reason: z.string(),
  impactScope: z.array(z.string()).default([]),
  fieldsRequiringConfirmation: z.array(z.string()).default([]),
  draftPayload: z.record(z.string(), z.unknown()).nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScheduleAssistantCenterDTOSchema = z.object({
  schoolId: z.string(),
  proposals: z.array(ScheduleAssistantProposalDTOSchema).default([]),
});

export type ScheduleImportBatchStatus = z.infer<typeof ScheduleImportBatchStatusSchema>;
export type ScheduleImportRowStatus = z.infer<typeof ScheduleImportRowStatusSchema>;
export type ScheduleImportApprovalState = z.infer<typeof ScheduleImportApprovalStateSchema>;
export type ScheduleOverrideAction = z.infer<typeof ScheduleOverrideActionSchema>;
export type ScheduleReminderType = z.infer<typeof ScheduleReminderTypeSchema>;
export type ScheduleReminderStatus = z.infer<typeof ScheduleReminderStatusSchema>;
export type ScheduleAssistantProposalStatus = z.infer<typeof ScheduleAssistantProposalStatusSchema>;
export type ScheduleImportValidationIssue = z.infer<typeof ScheduleImportValidationIssueSchema>;
export type ScheduleImportMappingSummary = z.infer<typeof ScheduleImportMappingSummarySchema>;
export type ScheduleImportConflictSummary = z.infer<typeof ScheduleImportConflictSummarySchema>;
export type ScheduleImportDraftRowInput = z.infer<typeof ScheduleImportDraftRowInputSchema>;
export type ScheduleImportDraftInput = z.infer<typeof ScheduleImportDraftInputSchema>;
export type ApproveScheduleImportInput = z.infer<typeof ApproveScheduleImportInputSchema>;
export type ScheduleImportRowReviewDTO = z.infer<typeof ScheduleImportRowReviewDTOSchema>;
export type ScheduleImportBatchDTO = z.infer<typeof ScheduleImportBatchDTOSchema>;
export type TeacherDailyAgendaCardDTO = z.infer<typeof TeacherDailyAgendaCardDTOSchema>;
export type TeacherDailyAgendaDTO = z.infer<typeof TeacherDailyAgendaDTOSchema>;
export type ClassDailyAgendaCardDTO = z.infer<typeof ClassDailyAgendaCardDTOSchema>;
export type ScheduleOverrideInput = z.infer<typeof ScheduleOverrideInputSchema>;
export type ScheduleHolidayDateInput = z.infer<typeof ScheduleHolidayDateInputSchema>;
export type ScheduleReminderRuleInput = z.infer<typeof ScheduleReminderRuleInputSchema>;
export type ScheduleReminderRuleDTO = z.infer<typeof ScheduleReminderRuleDTOSchema>;
export type ScheduleReminderDispatchDTO = z.infer<typeof ScheduleReminderDispatchDTOSchema>;
export type ScheduleReminderCenterDTO = z.infer<typeof ScheduleReminderCenterDTOSchema>;
export type ScheduleRecurringSummaryDTO = z.infer<typeof ScheduleRecurringSummaryDTOSchema>;
export type ScheduleHolidayDateDTO = z.infer<typeof ScheduleHolidayDateDTOSchema>;
export type ScheduleOperationsCenterDTO = z.infer<typeof ScheduleOperationsCenterDTOSchema>;
export type ScheduleAssistantProposalDTO = z.infer<typeof ScheduleAssistantProposalDTOSchema>;
export type ScheduleAssistantCenterDTO = z.infer<typeof ScheduleAssistantCenterDTOSchema>;
