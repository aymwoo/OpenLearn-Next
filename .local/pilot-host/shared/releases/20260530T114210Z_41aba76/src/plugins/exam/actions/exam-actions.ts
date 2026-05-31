"use server"

import { z } from "zod"
import { loadExam, scoreExam } from "../dal/exam"
import type { Exam, ExamAnswer, ExamResult } from "../dto/exam-schemas"

const LoadExamActionInputSchema = z.object({
  examId: z.string(),
  questions: z.array(z.unknown()),
})

const SubmitExamActionInputSchema = z.object({
  examId: z.string(),
  questions: z.array(z.unknown()),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
    answeredAt: z.string().optional(),
  })),
  sessionId: z.string(),
  studentId: z.string(),
})

export async function loadExamAction(rawInput: unknown): Promise<Exam> {
  return loadExam(rawInput)
}

export async function submitExamAction(rawInput: unknown): Promise<ExamResult> {
  const input = SubmitExamActionInputSchema.parse(rawInput)

  const exam = loadExam({
    examId: input.examId,
    questions: input.questions,
  })

  const answers: ExamAnswer[] = input.answers.map((a) => ({
    questionId: a.questionId,
    answer: a.answer,
    answeredAt: a.answeredAt,
  }))

  const result = scoreExam(exam, answers)

  return {
    ...result,
    sessionId: input.sessionId,
    studentId: input.studentId,
  }
}