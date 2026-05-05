import { z } from "zod";

import { lessonStepPayloadSchema } from "./lesson-authoring";

export const ProgressStateSchema = z.enum(["not_started", "in_progress", "completed", "skipped"]);

export const LearningStepDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  type: z.enum(["content", "task", "quiz"]),
  title: z.string(),
  rank: z.string(),
  payload: lessonStepPayloadSchema,
});

export const RuntimeStepStateDTOSchema = z.object({
  forcedStepId: z.string().nullable(),
  forcedLabel: z.string().default("老师指定"),
  locked: z.boolean().default(false),
  inaccessibleMessage: z.string().nullable().default(null),
});

export const AttemptFeedbackDTOSchema = z.object({
  id: z.string(),
  targetType: z.enum(["task_submission", "quiz_attempt"]),
  targetId: z.string(),
  teacherId: z.string(),
  studentId: z.string(),
  body: z.string().min(1).max(200),
  createdAt: z.string(),
  updatedAt: z.string(),
  feedbackEmptyLabel: z.string().default("老师还没有留下反馈"),
});

export const TaskAttemptDTOSchema = z.object({
  id: z.string(),
  publishedVersionId: z.string(),
  lessonId: z.string(),
  stepId: z.string(),
  studentId: z.string(),
  attemptNo: z.number().int().positive(),
  payload: z.unknown(),
  isLatest: z.boolean(),
  canRetryTask: z.boolean(),
  successMessage: z.string().default("已提交，本次尝试已记录"),
  feedback: AttemptFeedbackDTOSchema.nullable().default(null),
  createdAt: z.string(),
});

export const QuizAttemptDTOSchema = z.object({
  id: z.string(),
  publishedVersionId: z.string(),
  lessonId: z.string(),
  stepId: z.string(),
  studentId: z.string(),
  attemptNo: z.number().int().positive(),
  answer: z.unknown(),
  outcome: z.unknown(),
  isLatest: z.boolean(),
  canRetryQuiz: z.boolean(),
  showCorrectAnswer: z.boolean(),
  successMessage: z.string().default("已提交，系统已记录本次作答结果"),
  feedback: AttemptFeedbackDTOSchema.nullable().default(null),
  createdAt: z.string(),
});

export const LearningProgressDTOSchema = z.object({
  stepId: z.string(),
  state: ProgressStateSchema,
  completedAt: z.string().nullable().default(null),
  updatedAt: z.string().optional(),
});

export const StudentLessonCardDTOSchema = z.object({
  lessonId: z.string(),
  publishedVersionId: z.string(),
  title: z.string(),
  courseTitle: z.string(),
  classLabel: z.string().nullable().default(null),
  progressState: ProgressStateSchema,
  completedSteps: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
  resumeStepId: z.string().nullable(),
  resumeLabel: z.string(),
  updatedAt: z.string(),
});

export const StudentDashboardDTOSchema = z.object({
  studentName: z.string(),
  lessons: z.array(StudentLessonCardDTOSchema),
  emptyState: z.object({
    title: z.string().default("还没有可学习的课时"),
    body: z.string().default("老师发布课时后，这里会显示你的学习任务。你可以先查看课程列表。"),
    actionLabel: z.string().default("查看课程列表"),
  }),
});

export const StudentPlayerDTOSchema = z.object({
  shell: z.object({
    lessonId: z.string(),
    publishedVersionId: z.string(),
    title: z.string(),
    objective: z.string(),
    steps: z.array(LearningStepDTOSchema),
  }),
  progress: z.object({
    resumeStepId: z.string().nullable(),
    resumeLabel: z.string(),
    steps: z.array(LearningProgressDTOSchema),
  }),
  runtime: RuntimeStepStateDTOSchema,
  latestSubmissions: z.object({
    tasks: z.array(TaskAttemptDTOSchema),
    quizzes: z.array(QuizAttemptDTOSchema),
  }),
  history: z.object({
    tasks: z.array(TaskAttemptDTOSchema),
    quizzes: z.array(QuizAttemptDTOSchema),
  }),
  inaccessibleMessage: z.string().default("课时暂不可学习"),
});

export const SubmitTaskInputSchema = z.object({
  publishedVersionId: z.string(),
  lessonId: z.string(),
  stepId: z.string(),
  payload: z.unknown(),
});

export const SubmitQuizInputSchema = z.object({
  publishedVersionId: z.string(),
  lessonId: z.string(),
  stepId: z.string(),
  answer: z.unknown(),
});

export const MarkProgressInputSchema = z.object({
  publishedVersionId: z.string(),
  lessonId: z.string(),
  stepId: z.string(),
  state: ProgressStateSchema,
});

export const TeacherReviewFilterSchema = z.enum(["all", "not_started", "in_progress", "completed", "needs_feedback"]);

export const TeacherStudentReviewDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  progress: z.array(LearningProgressDTOSchema),
  latestTaskSubmissions: z.array(TaskAttemptDTOSchema),
  latestQuizAttempts: z.array(QuizAttemptDTOSchema),
  needsFeedback: z.boolean(),
  feedbackEmptyLabel: z.string().default("老师还没有留下反馈"),
});

export const TeacherLessonReviewDTOSchema = z.object({
  lessonId: z.string(),
  publishedVersionId: z.string(),
  title: z.string(),
  filter: TeacherReviewFilterSchema.default("all"),
  overview: z.object({
    notStartedCount: z.number().int().nonnegative(),
    inProgressCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    needsFeedbackCount: z.number().int().nonnegative(),
  }),
  students: z.array(TeacherStudentReviewDTOSchema),
});

export const FeedbackInputSchema = z.object({
  targetType: z.enum(["task_submission", "quiz_attempt"]),
  targetId: z.string(),
  body: z.string().min(1).max(200),
});

export const MutationResultDTOSchema = z.object({
  ok: z.boolean(),
  successMessage: z.string().optional(),
  error: z.string().optional(),
});

export type ProgressState = z.infer<typeof ProgressStateSchema>;
export type LearningStepDTO = z.infer<typeof LearningStepDTOSchema>;
export type StudentLessonCardDTO = z.infer<typeof StudentLessonCardDTOSchema>;
export type StudentDashboardDTO = z.infer<typeof StudentDashboardDTOSchema>;
export type RuntimeStepStateDTO = z.infer<typeof RuntimeStepStateDTOSchema>;
export type TaskAttemptDTO = z.infer<typeof TaskAttemptDTOSchema>;
export type QuizAttemptDTO = z.infer<typeof QuizAttemptDTOSchema>;
export type AttemptFeedbackDTO = z.infer<typeof AttemptFeedbackDTOSchema>;
export type StudentPlayerDTO = z.infer<typeof StudentPlayerDTOSchema>;
export type SubmitTaskInput = z.infer<typeof SubmitTaskInputSchema>;
export type SubmitQuizInput = z.infer<typeof SubmitQuizInputSchema>;
export type MarkProgressInput = z.infer<typeof MarkProgressInputSchema>;
export type TeacherReviewFilter = z.infer<typeof TeacherReviewFilterSchema>;
export type TeacherLessonReviewDTO = z.infer<typeof TeacherLessonReviewDTOSchema>;
export type TeacherStudentReviewDTO = z.infer<typeof TeacherStudentReviewDTOSchema>;
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;
export type MutationResultDTO = z.infer<typeof MutationResultDTOSchema>;
