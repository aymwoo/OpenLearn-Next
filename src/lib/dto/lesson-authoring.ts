import { z } from "zod";

const builtInTeachingStepKeys = [
  "directInstruction",
  "survey",
  "inquiry",
  "inClassQuiz",
  "evaluation",
] as const;

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

export const contentStepPayloadSchema = z.object({
  type: z.literal("content"),
  title: z.string().min(1),
  body: z.string().min(1),
  teacherNotes: z.string().optional(),
  materialRefs: z.array(materialRefSchema).default([]),
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

export const LessonEditorDTOSchema = z.object({
  course: CourseDTOSchema,
  classes: z.array(ClassRosterDTOSchema),
  lesson: LessonSummaryDTOSchema,
  steps: z.array(LessonStepDTOSchema),
  materials: z.array(LessonMaterialDTOSchema),
  publishState: z.object({
    isDraftHidden: z.boolean(),
    latestVersion: z.number().int().nonnegative().nullable(),
    publishedAt: z.string().nullable(),
    canPublish: z.boolean(),
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

export const LessonPublishIssueCodeSchema = z.enum([
  "LESSON_TITLE_REQUIRED",
  "LESSON_OBJECTIVE_REQUIRED",
  "NO_ACTIVE_STEPS",
  "STEP_PAYLOAD_INVALID",
  "BUILT_IN_PLUGIN_UNAVAILABLE",
]);

export const LessonPublishIssueDTOSchema = z.object({
  code: LessonPublishIssueCodeSchema,
  message: z.string(),
  stepId: z.string().nullable().optional(),
  pluginId: z.string().nullable().optional(),
  builtInKey: BuiltInTeachingStepKeySchema.nullable().optional(),
  pluginName: z.string().nullable().optional(),
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
export type LessonPublishIssueDTO = z.infer<typeof LessonPublishIssueDTOSchema>;
export type LessonPublishReadinessDTO = z.infer<typeof LessonPublishReadinessDTOSchema>;
export type TeacherLessonPreviewStepDTO = z.infer<typeof TeacherLessonPreviewStepDTOSchema>;
export type TeacherLessonPreviewDTO = z.infer<typeof TeacherLessonPreviewDTOSchema>;
