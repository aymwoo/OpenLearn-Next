"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  markStepProgress,
  saveAttemptFeedback,
  submitQuizAttempt,
  submitTaskAttempt,
} from "@/lib/dal/learning";
import { cacheTags } from "@/lib/cache-policy";
import {
  FeedbackInputSchema,
  MarkProgressInputSchema,
  SubmitQuizInputSchema,
  SubmitTaskInputSchema,
} from "@/lib/dto/learning";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string };

const validationMessage = "输入内容不完整，请检查后重试。";
const submissionFailureMessage = "提交暂时失败，请保留当前内容后重试。";
const submissionSuccessFallbackMessage = "提交已记录，进度稍后同步";
const feedbackValidationMessage = "反馈最多 200 字，请修改后再发送。";
const feedbackFailureMessage = "反馈暂时没有发送成功，请保留内容后重试。";

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

function validationError(message = validationMessage) {
  return { ok: false as const, error: "VALIDATION_ERROR", message };
}

function handleLearningActionError(error: unknown, message = submissionFailureMessage) {
  if (error instanceof z.ZodError) {
    return validationError();
  }

  if (error instanceof Error) {
    return { ok: false as const, error: error.message || "LEARNING_ACTION_FAILED", message };
  }

  return { ok: false as const, error: "LEARNING_ACTION_FAILED", message };
}

export async function markStepProgressAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = MarkProgressInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await markStepProgress(parsed.data);
    if (result.studentId) {
      updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
    }
    updateTag(cacheTags.teacherReview(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleLearningActionError(error);
  }
}

export async function submitTaskAttemptAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = SubmitTaskInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await submitTaskAttempt(parsed.data);
    updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
    updateTag(cacheTags.submission(parsed.data.lessonId, result.studentId));
    updateTag(cacheTags.teacherReview(parsed.data.lessonId));
    return { ok: true, data: { ...result, successMessage: submissionSuccessFallbackMessage } };
  } catch (error) {
    return handleLearningActionError(error, submissionFailureMessage);
  }
}

export async function submitQuizAttemptAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = SubmitQuizInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await submitQuizAttempt(parsed.data);
    updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
    updateTag(cacheTags.submission(parsed.data.lessonId, result.studentId));
    updateTag(cacheTags.teacherReview(parsed.data.lessonId));
    return { ok: true, data: { ...result, successMessage: submissionSuccessFallbackMessage } };
  } catch (error) {
    return handleLearningActionError(error, submissionFailureMessage);
  }
}

export async function sendAttemptFeedbackAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = FeedbackInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError(feedbackValidationMessage);

  try {
    const result = await saveAttemptFeedback(parsed.data);
    if (result.lessonId) {
      updateTag(cacheTags.submission(result.lessonId, result.studentId));
      updateTag(cacheTags.teacherReview(result.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleLearningActionError(error, feedbackFailureMessage);
  }
}
