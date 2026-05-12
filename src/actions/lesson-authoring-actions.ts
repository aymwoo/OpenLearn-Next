"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  addLessonStep,
  assertActiveTeacher,
  archiveLesson,
  archiveLessonStep,
  createLessonDraft,
  duplicateLesson,
  duplicateLessonStep,
  getLessonPublishReadinessDTO,
  publishLesson,
  reorderLessonStep,
  updateLessonDraft,
  updateLessonStep,
} from "@/lib/dal/lesson-authoring";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import { createTeacherResource } from "@/lib/dal/resources";
import { cacheTags } from "@/lib/cache-policy";

const conflictMessage = "检测到更新冲突，请刷新后重试。";

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

const uploadMarkdownAssetSchema = z.object({
  schoolId: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
});

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string; issues?: unknown[] };

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

function validationError() {
  return { ok: false as const, error: "VALIDATION_ERROR", message: "输入内容不完整，请检查后再保存。" };
}

function invalidateLessonAuthoringTags(actorId: string, courseId: string, lessonId: string) {
  updateTag(cacheTags.teacherCourses(actorId));
  updateTag(cacheTags.course(courseId));
  updateTag(cacheTags.lesson(lessonId));
  updateTag(cacheTags.steps(lessonId));
}

function handleActionError(error: unknown) {
  if (error instanceof Error && error.message === "CONFLICT") {
    return { ok: false as const, error: "CONFLICT", message: conflictMessage };
  }

  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false as const, error: "UNAUTHORIZED", message: "您没有权限执行此操作。" };
  }

  if (
    error instanceof Error &&
    (error.message === "COURSE_NOT_FOUND" || error.message === "LESSON_NOT_FOUND" || error.message === "STEP_NOT_FOUND")
  ) {
    return { ok: false as const, error: "NOT_FOUND", message: "当前课程、课时或步骤已不存在，请刷新后重试。" };
  }

  if (error instanceof z.ZodError) {
    return validationError();
  }

  throw error;
}

export async function createLessonDraftAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonDraftSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const lesson = await createLessonDraft(parsed.data);
    invalidateLessonAuthoringTags(actor.userId, parsed.data.courseId, lesson.id);
    return { ok: true, data: lesson };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function autosaveLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonDraftSchema.required({ lessonId: true }).safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const result = await updateLessonDraft({ ...parsed.data, lessonId: parsed.data.lessonId });
    invalidateLessonAuthoringTags(actor.userId, parsed.data.courseId, parsed.data.lessonId);
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function duplicateLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const lesson = await duplicateLesson(parsed.data.lessonId);
    invalidateLessonAuthoringTags(actor.userId, lesson.courseId, parsed.data.lessonId);
    invalidateLessonAuthoringTags(actor.userId, lesson.courseId, lesson.id);
    return { ok: true, data: lesson };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function archiveLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = lessonIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const result = await archiveLesson(parsed.data.lessonId);
    if (result.lessonId && result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);
    } else if (result.lessonId) {
      updateTag(cacheTags.lesson(result.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = addStepSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const result = await addLessonStep(parsed.data);
    if (result.lessonId && result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function autosaveLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = updateStepSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const result = await updateLessonStep(parsed.data);
    if (result.lessonId && result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);
    } else if (result.lessonId) {
      updateTag(cacheTags.lesson(result.lessonId));
      updateTag(cacheTags.steps(result.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function uploadLessonMarkdownAssetAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = uploadMarkdownAssetSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const data = await createTeacherResource({
      schoolId: parsed.data.schoolId,
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      visibility: "private",
      classification: "markdown",
      content: parsed.data.source,
      ragEligible: false,
    });

    updateTag(cacheTags.resources(parsed.data.schoolId));
    updateTag(cacheTags.resource(data.id));
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function duplicateLessonStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = stepIdSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const result = await duplicateLessonStep(parsed.data.stepId);
    if (result.lessonId && result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);
    } else if (result.lessonId) {
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
    const actor = await assertActiveTeacher();
    const result = await archiveLessonStep(parsed.data.stepId);
    if (result.lessonId && result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);
    } else if (result.lessonId) {
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
    const actor = await assertActiveTeacher();
    const result = await reorderLessonStep(parsed.data);
    if (result.lessonId && result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);
    } else {
      updateTag(cacheTags.lesson(parsed.data.lessonId));
      updateTag(cacheTags.steps(parsed.data.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishLessonAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = publishSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const readiness = await getLessonPublishReadinessDTO({ lessonId: parsed.data.lessonId });
    if (!readiness.canPublish) {
      return {
        ok: false,
        error: "PUBLISH_BLOCKED",
        message: "发布前检查未通过。",
        issues: readiness.blockingIssues,
      };
    }

    const result = await publishLesson(parsed.data);
    if (result.courseId) {
      invalidateLessonAuthoringTags(actor.userId, result.courseId, parsed.data.lessonId);
    } else {
      updateTag(cacheTags.lesson(parsed.data.lessonId));
      updateTag(cacheTags.steps(parsed.data.lessonId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}
