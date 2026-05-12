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

export const ScheduleImportPreviewScheduleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  bellSlotStartTime: z.string().nullable().default(null),
  bellSlotEndTime: z.string().nullable().default(null),
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
  bellSlotStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式必须为 HH:mm")
    .nullable()
    .optional(),
  bellSlotEndTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式必须为 HH:mm")
    .nullable()
    .optional(),
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
  previewSchedule: ScheduleImportPreviewScheduleSchema.nullable().optional(),
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
  isPrimary: z.boolean().default(false),
  rowCount: z.number().int().nonnegative(),
  approvedRowCount: z.number().int().nonnegative(),
  rejectedRowCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rows: z.array(ScheduleImportRowReviewDTOSchema).default([]),
});

export type ScheduleImportBatchStatus = z.infer<typeof ScheduleImportBatchStatusSchema>;
export type ScheduleImportRowStatus = z.infer<typeof ScheduleImportRowStatusSchema>;
export type ScheduleImportApprovalState = z.infer<typeof ScheduleImportApprovalStateSchema>;
export type ScheduleImportValidationIssue = z.infer<typeof ScheduleImportValidationIssueSchema>;
export type ScheduleImportMappingSummary = z.infer<typeof ScheduleImportMappingSummarySchema>;
export type ScheduleImportPreviewSchedule = z.infer<typeof ScheduleImportPreviewScheduleSchema>;
export type ScheduleImportConflictSummary = z.infer<typeof ScheduleImportConflictSummarySchema>;
export type ScheduleImportDraftRowInput = z.infer<typeof ScheduleImportDraftRowInputSchema>;
export type ScheduleImportDraftInput = z.infer<typeof ScheduleImportDraftInputSchema>;
export type ApproveScheduleImportInput = z.infer<typeof ApproveScheduleImportInputSchema>;
export type ScheduleImportRowReviewDTO = z.infer<typeof ScheduleImportRowReviewDTOSchema>;
export type ScheduleImportBatchDTO = z.infer<typeof ScheduleImportBatchDTOSchema>;
