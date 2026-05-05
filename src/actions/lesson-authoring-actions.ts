"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  addLessonStep,
  archiveLesson,
  archiveLessonStep,
  createCourseForTeacher,
  createLessonDraft,
  duplicateLesson,
  duplicateLessonStep,
  publishLesson,
  reorderLessonStep,
  updateLessonDraft,
  updateLessonStep,
} from "@/lib/dal/lesson-authoring";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import { cacheTags } from "@/lib/cache-policy";

const conflictMessage = "检测到更新冲突，请刷新后重试。";

const createCourseSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
});

const lessonDraftSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  title: z.string().min(1),
  objective: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive().optional(),
});

const lessonIdSchema = z.object({ lessonId: z.string().min(1) });
const stepIdSchema = z.object({ stepId: z.string().min(1) });

const addStepSchema = z.object({
  lessonId: z.string().min(1),
  type: z.enum(["content", "task", "quiz"]),
  title: z.string().min(1),
  payload: lessonStepPayloadSchema,
  afterRank: z.string().optional(),
});

const updateStepSchema = z.object({
  stepId: z.string().min(1),
  title: z.string().min(1),
  payload: lessonStepPayloadSchema,
});

const reorderStepSchema = z.object({
  stepId: z.string().min(1),
  lessonId: z.string().min(1),
  beforeRank: z.string().nullable().optional(),
  afterRank: z.string().nullable().optional(),
});

const publishSchema = z.object({
  lessonId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive().optional(),
});

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string };

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

function validationError() {
  return { ok: false as const, error: "VALIDATION_ERROR", message: "输入内容不完整，请检查后再保存。" };
}

function handleActionError(error: unknown) {
  if (error instanceof Error && error.message === "CONFLICT") {
    return { ok: false as const, error: "CONFLICT", message: conflictMessage };
  }

  if (error instanceof z.ZodError) {
    return validationError();
  }

  throw error;
}

export async function createCourseAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = createCourseSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const course = await createCourseForTeacher(parsed.data);
    updateTag(cacheTags.course(course.id));
    return { ok: true, data: course };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createLessonDraftAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonDraftSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const lesson = await createLessonDraft(parsed.data);
    updateTag(cacheTags.course(parsed.data.courseId));
    updateTag(cacheTags.lesson(lesson.id));
    return { ok: true, data: lesson };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function autosaveLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonDraftSchema.required({ lessonId: true }).safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await updateLessonDraft({ ...parsed.data, lessonId: parsed.data.lessonId });
    updateTag(cacheTags.lesson(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function duplicateLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const lesson = await duplicateLesson(parsed.data.lessonId);
    updateTag(cacheTags.lesson(parsed.data.lessonId));
    updateTag(cacheTags.lesson(lesson.id));
    return { ok: true, data: lesson };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function archiveLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await archiveLesson(parsed.data.lessonId);
    updateTag(cacheTags.lesson(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = addStepSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await addLessonStep(parsed.data);
    updateTag(cacheTags.lesson(parsed.data.lessonId));
    updateTag(cacheTags.steps(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function autosaveLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = updateStepSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await updateLessonStep(parsed.data);
    if (result.lessonId) {
      updateTag(cacheTags.lesson(result.lessonId));
      updateTag(cacheTags.steps(result.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function duplicateLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = stepIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await duplicateLessonStep(parsed.data.stepId);
    if (result.lessonId) {
      updateTag(cacheTags.lesson(result.lessonId));
      updateTag(cacheTags.steps(result.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function archiveLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = stepIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await archiveLessonStep(parsed.data.stepId);
    if (result.lessonId) {
      updateTag(cacheTags.lesson(result.lessonId));
      updateTag(cacheTags.steps(result.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function reorderLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = reorderStepSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await reorderLessonStep(parsed.data);
    updateTag(cacheTags.lesson(parsed.data.lessonId));
    updateTag(cacheTags.steps(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = publishSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await publishLesson(parsed.data);
    updateTag(cacheTags.lesson(parsed.data.lessonId));
    updateTag(cacheTags.steps(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}
