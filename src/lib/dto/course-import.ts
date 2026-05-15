import { z } from "zod";

import { TeacherCourseStatusSchema } from "@/lib/dto/course-authoring";

export const CourseImportSourceTypeSchema = z.enum(["csv"]);
export const CourseImportBatchStatusSchema = z.enum([
  "draft",
  "in_review",
  "ready_to_apply",
  "applied",
  "partially_applied",
]);
export const CourseImportRowStatusSchema = z.enum([
  "ready_to_create",
  "matched_existing",
  "same_file_conflict",
  "invalid",
  "blocked",
]);
export const CourseImportRowDecisionSchema = z.enum(["update", "skip"]);
export const CourseImportRowResultSchema = z.enum(["created", "updated", "skipped", "failed"]);

export const CourseImportValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().nullable().default(null),
});

export const CourseImportDraftRowInputSchema = z
  .object({
    title: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    grade: z.string().trim().min(1),
    status: TeacherCourseStatusSchema,
  })
  .strict();

export const CourseImportDraftInputSchema = z
  .object({
    schoolId: z.string().min(1),
    sourceType: CourseImportSourceTypeSchema.default("csv"),
    sourceLabel: z.string().trim().min(1),
    rows: z.array(CourseImportDraftRowInputSchema).min(1),
  })
  .strict();

export const CourseImportMatchedCourseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  status: TeacherCourseStatusSchema,
  canUpdate: z.boolean(),
});

export const CourseImportRowReviewDTOSchema = z.object({
  id: z.string(),
  sourceRowKey: z.string(),
  matchKey: z.string(),
  row: CourseImportDraftRowInputSchema,
  status: CourseImportRowStatusSchema,
  validationIssues: z.array(CourseImportValidationIssueSchema).default([]),
  matchedCourse: CourseImportMatchedCourseSchema.nullable().default(null),
  decision: CourseImportRowDecisionSchema.nullable().default(null),
  result: CourseImportRowResultSchema.nullable().default(null),
  resultReason: z.string().nullable().default(null),
});

export const CourseImportBatchSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  readyToCreate: z.number().int().nonnegative(),
  matchedExisting: z.number().int().nonnegative(),
  sameFileConflict: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
});

export const CourseImportApplySummarySchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const CourseImportBatchDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  actorId: z.string(),
  sourceType: CourseImportSourceTypeSchema,
  sourceLabel: z.string(),
  status: CourseImportBatchStatusSchema,
  rowCount: z.number().int().nonnegative(),
  summary: CourseImportBatchSummarySchema,
  applySummary: CourseImportApplySummarySchema,
  rows: z.array(CourseImportRowReviewDTOSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  appliedAt: z.string().nullable(),
});

export const ApplyCourseImportInputSchema = z
  .object({
    batchId: z.string().min(1),
    matchedRowDecisions: z.array(
      z
        .object({
          rowId: z.string().min(1),
          decision: CourseImportRowDecisionSchema,
        })
        .strict(),
    ),
  })
  .strict();

export const CourseImportApplyResultSchema = z.object({
  batchId: z.string(),
  schoolId: z.string(),
  status: z.enum(["applied", "partially_applied"]),
  summary: CourseImportApplySummarySchema,
  rows: z.array(CourseImportRowReviewDTOSchema),
});

export type CourseImportBatchStatus = z.infer<typeof CourseImportBatchStatusSchema>;
export type CourseImportRowStatus = z.infer<typeof CourseImportRowStatusSchema>;
export type CourseImportRowDecision = z.infer<typeof CourseImportRowDecisionSchema>;
export type CourseImportRowResult = z.infer<typeof CourseImportRowResultSchema>;
export type CourseImportValidationIssue = z.infer<typeof CourseImportValidationIssueSchema>;
export type CourseImportDraftRowInput = z.infer<typeof CourseImportDraftRowInputSchema>;
export type CourseImportDraftInput = z.infer<typeof CourseImportDraftInputSchema>;
export type CourseImportMatchedCourse = z.infer<typeof CourseImportMatchedCourseSchema>;
export type CourseImportRowReviewDTO = z.infer<typeof CourseImportRowReviewDTOSchema>;
export type CourseImportBatchSummary = z.infer<typeof CourseImportBatchSummarySchema>;
export type CourseImportApplySummary = z.infer<typeof CourseImportApplySummarySchema>;
export type CourseImportBatchDTO = z.infer<typeof CourseImportBatchDTOSchema>;
export type ApplyCourseImportInput = z.infer<typeof ApplyCourseImportInputSchema>;
export type CourseImportApplyResult = z.infer<typeof CourseImportApplyResultSchema>;
