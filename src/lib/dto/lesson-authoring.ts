import { z } from "zod";

import { RuntimeDescriptorSchema } from "@/features/runtime-platform/contracts/descriptors";

const builtInTeachingStepKeys = [
  "directInstruction",
  "markdownDeck",
  "htmlCourseware",
  "classroomVoting",
  "survey",
  "inquiry",
  "inClassQuiz",
  "evaluation",
] as const;

const markdownRenderModeSchema = z.enum(["document", "reveal"]);

export const markdownAssetRefSchema = z.object({
  resourceId: z.string().min(1),
  materialId: z.string().min(1),
  title: z.string().min(1),
});

export const markdownStepConfigSchema = z.object({
  asset: markdownAssetRefSchema,
  source: z.string().min(1),
  renderMode: markdownRenderModeSchema.default("document"),
  mermaidEnabled: z.boolean().default(false),
});

export const BuiltInTeachingStepKeySchema = z.enum(builtInTeachingStepKeys);

export const materialRefSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  kind: z.string().default("link"),
  url: z.string().optional(),
  note: z.string().optional(),
});

export const builtInSourceSchema = z.object({
  pluginId: z.string().min(1),
  builtInKey: BuiltInTeachingStepKeySchema,
  pluginName: z.string().min(1),
});

export const TeachingActivityIntentSchema = z.enum([
  "explain",
  "practice",
  "check",
  "discuss",
  "reflect",
  "apply",
]);

export const TeachingActivityModeSchema = z.enum([
  "mini-lecture",
  "independent",
  "assessment",
  "discussion",
  "pair",
  "group",
  "whole-class",
]);

export const TeachingEvidenceTypeSchema = z.enum([
  "observation",
  "response",
  "artifact",
  "submission",
  "quiz-response",
]);

export const TeachingEvidenceStudentVisibilitySchema = z.enum([
  "teacher-only",
  "student-visible",
]);

export const TeachingEvidenceExpectationSchema = z.object({
  evidenceType: TeachingEvidenceTypeSchema,
  prompt: z.string().min(1),
  required: z.boolean(),
  checklist: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  studentVisibility: TeachingEvidenceStudentVisibilitySchema.default("teacher-only"),
});

export const TeachingDesignSchema = z.object({
  activityIntent: TeachingActivityIntentSchema,
  estimatedMinutes: z.number().int().positive(),
  activityMode: TeachingActivityModeSchema,
  evidenceExpectation: TeachingEvidenceExpectationSchema,
});

export const TeachingEvidenceExpectationInputSchema = TeachingEvidenceExpectationSchema.partial();

export const TeachingDesignInputSchema = z.object({
  activityIntent: TeachingActivityIntentSchema.optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  activityMode: TeachingActivityModeSchema.optional(),
  evidenceExpectation: TeachingEvidenceExpectationInputSchema.optional(),
});

export const TeachingDesignStatusSchema = z.enum(["explicit", "inferred", "needs-refinement"]);

export const TeachingDesignFallbackReasonSchema = z.enum([
  "legacy-content-default",
  "legacy-task-default",
  "legacy-quiz-default",
  "partial-teaching-design",
]);

export const contentStepPayloadSchema = z.object({
  type: z.literal("content"),
  title: z.string().min(1),
  body: z.string().min(1),
  teacherNotes: z.string().optional(),
  materialRefs: z.array(materialRefSchema).default([]),
  runtime: RuntimeDescriptorSchema.optional(),
  teachingDesign: TeachingDesignInputSchema.optional(),
  markdown: markdownStepConfigSchema.optional(),
  builtInSource: builtInSourceSchema.optional(),
});

export const taskStepPayloadSchema = z.object({
  type: z.literal("task"),
  prompt: z.string().min(1),
  submissionType: z.enum(["text", "image", "file", "link"]).default("text"),
  successCriteria: z.string().optional(),
  allowRetry: z.boolean().optional(),
  retryPolicy: z.enum(["none", "once", "unlimited"]).optional(),
  materialRefs: z.array(materialRefSchema).default([]),
  runtime: RuntimeDescriptorSchema.optional(),
  teachingDesign: TeachingDesignInputSchema.optional(),
  builtInSource: builtInSourceSchema.optional(),
});

export const quizStepPayloadSchema = z.object({
  type: z.literal("quiz"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctOptionIndex: z.number().int().nonnegative().optional(),
  explanation: z.string().optional(),
  allowRetry: z.boolean().optional(),
  retryPolicy: z.enum(["none", "once", "unlimited"]).optional(),
  revealCorrectAnswer: z.boolean().optional(),
  runtime: RuntimeDescriptorSchema.optional(),
  teachingDesign: TeachingDesignInputSchema.optional(),
  builtInSource: builtInSourceSchema.optional(),
});

export const lessonStepPayloadSchema = z.discriminatedUnion("type", [
  contentStepPayloadSchema,
  taskStepPayloadSchema,
  quizStepPayloadSchema,
]);

export type LessonStepPayload = z.infer<typeof lessonStepPayloadSchema>;

export const CourseDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  ownerId: z.string(),
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  status: z.string(),
  lessonCount: z.number().int().nonnegative().default(0),
  classLabels: z.array(z.string()).default([]),
  enrollmentCount: z.number().int().nonnegative().default(0),
  updatedAt: z.string(),
});

export const ClassRosterDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  studentCount: z.number().int().nonnegative().default(0),
});

export const LessonSummaryDTOSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  objective: z.string(),
  status: z.string(),
  revision: z.number().int().nonnegative(),
  stepCount: z.number().int().nonnegative().default(0),
  publishedVersionId: z.string().nullable(),
  updatedAt: z.string(),
});

export const LessonStepDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  type: z.enum(["content", "task", "quiz"]),
  title: z.string(),
  rank: z.string(),
  payload: lessonStepPayloadSchema,
  teachingDesignStatus: TeachingDesignStatusSchema,
  needsTeachingDesignRefinement: z.boolean(),
  teachingDesignFallbackReason: TeachingDesignFallbackReasonSchema.nullable(),
  archivedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const LessonMaterialDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  stepId: z.string().nullable(),
  title: z.string(),
  kind: z.string(),
  url: z.string().nullable(),
  note: z.string().nullable(),
});

export const LessonPublishIssueCodeSchema = z.enum([
  "LESSON_TITLE_REQUIRED",
  "LESSON_OBJECTIVE_REQUIRED",
  "NO_ACTIVE_STEPS",
  "STEP_PAYLOAD_INVALID",
  "BUILT_IN_PLUGIN_UNAVAILABLE",
  "VOTING_PLUGIN_CONFIG_MISSING",
  "VOTING_PLUGIN_CONFIG_INVALID",
  "VOTING_PLUGIN_DISABLED",
  "VOTING_PLUGIN_INCOMPATIBLE",
]);

export const LessonPublishIssueDTOSchema = z.object({
  code: LessonPublishIssueCodeSchema,
  message: z.string(),
  stepId: z.string().nullable().optional(),
  pluginId: z.string().nullable().optional(),
  builtInKey: BuiltInTeachingStepKeySchema.nullable().optional(),
  pluginName: z.string().nullable().optional(),
});

export const LessonPreparationIssueCodeSchema = z.enum([
  "LESSON_TITLE_REQUIRED",
  "LESSON_OBJECTIVE_REQUIRED",
  "NO_ACTIVE_STEPS",
  "STEP_PAYLOAD_INVALID",
  "BUILT_IN_PLUGIN_UNAVAILABLE",
  "VOTING_PLUGIN_CONFIG_MISSING",
  "VOTING_PLUGIN_CONFIG_INVALID",
  "VOTING_PLUGIN_DISABLED",
  "VOTING_PLUGIN_INCOMPATIBLE",
  "TEACHING_DESIGN_NEEDS_REFINEMENT",
  "TEACHING_DESIGN_INFERRED",
  "MATERIAL_CUES_MISSING",
  "EVIDENCE_EXPECTATION_MISSING",
]);

export const LessonPreparationIssueDTOSchema = z.object({
  code: LessonPreparationIssueCodeSchema,
  message: z.string(),
  stepId: z.string().nullable().optional(),
  pluginId: z.string().nullable().optional(),
  builtInKey: BuiltInTeachingStepKeySchema.nullable().optional(),
  pluginName: z.string().nullable().optional(),
});

export const LessonPreparationSummaryDTOSchema = z.object({
  activeStepCount: z.number().int().nonnegative(),
  totalEstimatedMinutes: z.number().int().nonnegative(),
  materialCueCount: z.number().int().nonnegative(),
  evidenceReadyStepCount: z.number().int().nonnegative(),
  launchHref: z.string().min(1),
  blockingIssues: z.array(LessonPreparationIssueDTOSchema),
  attentionIssues: z.array(LessonPreparationIssueDTOSchema),
  advisoryIssues: z.array(LessonPreparationIssueDTOSchema),
});

export const LessonEditorDTOSchema = z.object({
  course: CourseDTOSchema,
  classes: z.array(ClassRosterDTOSchema),
  lesson: LessonSummaryDTOSchema,
  steps: z.array(LessonStepDTOSchema),
  materials: z.array(LessonMaterialDTOSchema),
  preparationSummary: LessonPreparationSummaryDTOSchema,
  publishState: z.object({
    isDraftHidden: z.boolean(),
    latestVersion: z.number().int().nonnegative().nullable(),
    publishedAt: z.string().nullable(),
    canPublish: z.boolean(),
    blockingIssues: z.array(LessonPublishIssueDTOSchema),
    warnings: z.array(LessonPublishIssueDTOSchema).default([]),
  }),
});

export const TeacherAuthoringOverviewDTOSchema = z.object({
  courses: z.array(CourseDTOSchema),
  classes: z.array(ClassRosterDTOSchema),
  lessons: z.array(LessonSummaryDTOSchema),
});

export const AutosaveResultDTOSchema = z.object({
  ok: z.boolean(),
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
  stepId: z.string().optional(),
  revision: z.number().int().nonnegative().optional(),
  savedAt: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PublishResultDTOSchema = z.object({
  ok: z.boolean(),
  lessonId: z.string(),
  courseId: z.string(),
  version: z.number().int().nonnegative().optional(),
  publishedVersionId: z.string().optional(),
  publishedAt: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const LessonPublishReadinessDTOSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  canPublish: z.boolean(),
  blockingIssues: z.array(LessonPublishIssueDTOSchema),
});

export const TeacherLessonPreviewStepDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  type: z.enum(["content", "task", "quiz"]),
  title: z.string(),
  rank: z.string(),
  payload: lessonStepPayloadSchema,
  teachingDesignStatus: TeachingDesignStatusSchema,
  needsTeachingDesignRefinement: z.boolean(),
  teachingDesignFallbackReason: TeachingDesignFallbackReasonSchema.nullable(),
  updatedAt: z.string(),
  builtInSourceLabel: z.string().nullable(),
});

export const TeacherLessonPreviewDTOSchema = z.object({
  course: CourseDTOSchema,
  lesson: LessonSummaryDTOSchema,
  steps: z.array(TeacherLessonPreviewStepDTOSchema),
  materials: z.array(LessonMaterialDTOSchema),
});

export type CourseDTO = z.infer<typeof CourseDTOSchema>;
export type ClassRosterDTO = z.infer<typeof ClassRosterDTOSchema>;
export type LessonSummaryDTO = z.infer<typeof LessonSummaryDTOSchema>;
export type LessonStepDTO = z.infer<typeof LessonStepDTOSchema>;
export type LessonMaterialDTO = z.infer<typeof LessonMaterialDTOSchema>;
export type LessonEditorDTO = z.infer<typeof LessonEditorDTOSchema>;
export type TeacherAuthoringOverviewDTO = z.infer<typeof TeacherAuthoringOverviewDTOSchema>;
export type AutosaveResultDTO = z.infer<typeof AutosaveResultDTOSchema>;
export type PublishResultDTO = z.infer<typeof PublishResultDTOSchema>;
export type BuiltInSource = z.infer<typeof builtInSourceSchema>;
export type TeachingDesign = z.infer<typeof TeachingDesignSchema>;
export type TeachingDesignInput = z.infer<typeof TeachingDesignInputSchema>;
export type TeachingDesignStatus = z.infer<typeof TeachingDesignStatusSchema>;
export type TeachingDesignFallbackReason = z.infer<typeof TeachingDesignFallbackReasonSchema>;
export type LessonPublishIssueDTO = z.infer<typeof LessonPublishIssueDTOSchema>;
export type LessonPreparationIssueDTO = z.infer<typeof LessonPreparationIssueDTOSchema>;
export type LessonPreparationSummaryDTO = z.infer<typeof LessonPreparationSummaryDTOSchema>;
export type LessonPublishReadinessDTO = z.infer<typeof LessonPublishReadinessDTOSchema>;
export type TeacherLessonPreviewStepDTO = z.infer<typeof TeacherLessonPreviewStepDTOSchema>;
export type TeacherLessonPreviewDTO = z.infer<typeof TeacherLessonPreviewDTOSchema>;
