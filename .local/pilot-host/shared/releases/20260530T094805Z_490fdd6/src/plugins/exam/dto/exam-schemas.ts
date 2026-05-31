import { z } from "zod"

export const ExamQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["single-choice", "multi-choice", "true-false", "fill-blank", "subjective"]),
  title: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  score: z.number().default(1),
  explanation: z.string().optional(),
})

export const ExamSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(ExamQuestionSchema),
  timeLimit: z.number().optional(),
  passingScore: z.number().optional(),
  showResult: z.boolean().default(true),
  allowRetry: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
})

export const ExamAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
  answeredAt: z.string().optional(),
})

export const ExamSubmissionSchema = z.object({
  examId: z.string(),
  sessionId: z.string(),
  answers: z.array(ExamAnswerSchema),
  submittedAt: z.string().optional(),
  isFinal: z.boolean().default(false),
})

export const ExamResultSchema = z.object({
  examId: z.string(),
  sessionId: z.string(),
  studentId: z.string(),
  totalScore: z.number(),
  maxScore: z.number(),
  correctCount: z.number(),
  totalCount: z.number(),
  passed: z.boolean(),
  questionResults: z.array(z.object({
    questionId: z.string(),
    correct: z.boolean(),
    score: z.number(),
    maxScore: z.number(),
    userAnswer: z.union([z.string(), z.array(z.string())]).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  })),
  completedAt: z.string(),
})

export type Exam = z.infer<typeof ExamSchema>
export type ExamQuestion = z.infer<typeof ExamQuestionSchema>
export type ExamAnswer = z.infer<typeof ExamAnswerSchema>
export type ExamSubmission = z.infer<typeof ExamSubmissionSchema>
export type ExamResult = z.infer<typeof ExamResultSchema>
export type ExamQuestionResult = ExamResult["questionResults"][number]