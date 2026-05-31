"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { draftCourseImport, prepareCourseImportApplyTask } from "@/lib/dal/course-import";
import { cacheTags } from "@/lib/cache-policy";
import { ApplyCourseImportInputSchema, CourseImportDraftInputSchema } from "@/lib/dto/course-import";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };

function normalizeInput(input: FormData | Record<string, unknown>) {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : { ...input };
  if (typeof normalized.rows === "string") {
    try {
      normalized.rows = JSON.parse(normalized.rows);
    } catch {
      return normalized;
    }
  }

  if (typeof normalized.matchedRowDecisions === "string") {
    try {
      normalized.matchedRowDecisions = JSON.parse(normalized.matchedRowDecisions);
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return { ok: false, error: "VALIDATION_ERROR", message: "导入内容不完整，请先检查输入。" };
  }

  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false, error: "UNAUTHORIZED", message: "您没有权限处理当前课程导入。" };
  }

  if (error instanceof Error && error.message === "COURSE_IMPORT_BATCH_NOT_FOUND") {
    return { ok: false, error: "NOT_FOUND", message: "导入批次不存在或已失效。" };
  }

  if (error instanceof Error && error.message === "COURSE_IMPORT_BATCH_NOT_READY") {
    return { ok: false, error: "INVALID_STATE", message: "当前批次还不能触发导入，请先完成审核后再试。" };
  }

  return { ok: false, error: "ACTION_FAILED", message: "课程导入暂时没有成功，请稍后重试。" };
}

function invalidateCourseImportTags(actorId: string, schoolId: string, batchId: string) {
  updateTag(cacheTags.teacherCourses(actorId));
  updateTag(cacheTags.courseImportSchool(schoolId));
  updateTag(cacheTags.courseImportBatch(batchId));
}

function invalidateCourseImportAsyncTags(actorId: string, batchId: string, taskId: string) {
  updateTag(cacheTags.teacherCourses(actorId));
  updateTag(cacheTags.asyncTask(taskId));
  updateTag(cacheTags.asyncTaskList(actorId));
  updateTag(cacheTags.asyncTaskEntity("course_import_batch", batchId));
}

export async function draftCourseImportAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = normalizeInput(input);
  const parsed = CourseImportDraftInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "导入内容不完整，请先检查输入。" };
  }

  try {
    const actor = await assertActiveTeacher();
    const batch = await draftCourseImport(parsed.data);
    invalidateCourseImportTags(actor.userId, batch.schoolId, batch.id);
    return { ok: true, data: batch };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function applyCourseImportAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = normalizeInput(input);
  const parsed = ApplyCourseImportInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "应用参数不完整，请刷新后重试。" };
  }

  try {
    const actor = await assertActiveTeacher();
    const result = await prepareCourseImportApplyTask(parsed.data);
    invalidateCourseImportTags(actor.userId, result.schoolId, result.batchId);
    invalidateCourseImportAsyncTags(actor.userId, result.batchId, result.taskId);
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}
