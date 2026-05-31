import { z } from "zod"
import type { Exam, ExamAnswer, ExamQuestion, ExamResult } from "../dto/exam-schemas"
import { ExamQuestionSchema, ExamResultSchema } from "../dto/exam-schemas"

const LoadExamInputSchema = z.object({
  examId: z.string(),
  questions: z.array(z.unknown()),
})

export function loadExam(rawInput: unknown): Exam {
  const input = LoadExamInputSchema.parse(rawInput)
  return {
    id: input.examId,
    title: "考试",
    questions: input.questions.map((q) => ExamQuestionSchema.parse(q)),
    showResult: true,
    allowRetry: false,
    shuffleQuestions: false,
    shuffleOptions: false,
  }
}

export function scoreExam(exam: Exam, answers: ExamAnswer[]): ExamResult {
  const questionResults = exam.questions.map((question) => {
    const userAnswer = answers.find((a) => a.questionId === question.id)
    const result = scoreQuestion(question, userAnswer?.answer)
    return {
      questionId: question.id,
      correct: result.correct,
      score: result.score,
      maxScore: question.score,
      userAnswer: userAnswer?.answer,
      correctAnswer: question.correctAnswer,
    }
  })

  const totalScore = questionResults.reduce((sum, r) => sum + r.score, 0)
  const maxScore = exam.questions.reduce((sum, q) => sum + q.score, 0)
  const correctCount = questionResults.filter((r) => r.correct).length
  const totalCount = exam.questions.length
  const passed = totalScore >= (exam.passingScore ?? maxScore * 0.6)

  return ExamResultSchema.parse({
    examId: exam.id,
    sessionId: "",
    studentId: "",
    totalScore,
    maxScore,
    correctCount,
    totalCount,
    passed,
    questionResults,
    completedAt: new Date().toISOString(),
  })
}

function scoreQuestion(question: ExamQuestion, userAnswer?: string | string[]): { correct: boolean; score: number } {
  if (!question.correctAnswer) {
    return { correct: false, score: 0 }
  }

  if (question.type === "single-choice" || question.type === "true-false") {
    const correct = userAnswer === question.correctAnswer
    return { correct, score: correct ? question.score : 0 }
  }

  if (question.type === "multi-choice") {
    const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [])
    const correctSet = new Set(Array.isArray(question.correctAnswer) ? question.correctAnswer : [])
    if (userSet.size !== correctSet.size) {
      return { correct: false, score: 0 }
    }
    const allMatch = [...userSet].every((a) => correctSet.has(a))
    return { correct: allMatch, score: allMatch ? question.score : 0 }
  }

  if (question.type === "fill-blank") {
    const userStr = String(userAnswer ?? "").trim().toLowerCase()
    const correctStr = String(question.correctAnswer).trim().toLowerCase()
    const correct = userStr === correctStr
    return { correct, score: correct ? question.score : 0 }
  }

  return { correct: false, score: 0 }
}