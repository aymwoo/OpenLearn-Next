"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  addCourseClassAssociationForTeacherScoped,
  archiveCourseForTeacherScoped,
  createCourseForTeacherScoped,
  deleteCourseForTeacherScoped,
  publishCourseForTeacherScoped,
  removeCourseClassAssociationForTeacherScoped,
  unpublishCourseForTeacherScoped,
  updateCourseForTeacherScoped,
} from "@/lib/dal/course-authoring";
import { cacheTags } from "@/lib/cache-policy";
import {
  CourseClassAssociationInputSchema,
  CourseCreateInputSchema,
  CourseDeleteInputSchema,
  CourseLifecycleInputSchema,
  CourseUpdateInputSchema,
  type CourseDeleteBlockedReasonDTO,
  type TeacherCourseDetailDTO,
} from "@/lib/dto/course-authoring";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string };
type CourseCreateActionResult = ActionResult<{ id: string }>;
type CourseUpdateActionResult = ActionResult<TeacherCourseDetailDTO>;
type CourseLifecycleActionResult = ActionResult<TeacherCourseDetailDTO>;
type CourseDeleteActionResult =
  | { ok: true; data: { id: string; title: string } }
  | { ok: false; error: string; message: string }
  | { ok: false; error: "DELETE_BLOCKED"; message: string; reasons: CourseDeleteBlockedReasonDTO[] };

const validationMessage = "输入内容不完整，请检查后再保存。";
const actionErrorMessage = "课程信息暂时没有保存成功，请稍后重试。";

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

function validationError(message = validationMessage) {
  return { ok: false as const, error: "VALIDATION_ERROR", message };
}

function handleActionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return validationError();
  }

  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false as const, error: "UNAUTHORIZED", message: "您没有权限执行此操作。" };
  }

  if (error instanceof Error && error.message === "COURSE_NOT_FOUND") {
    return { ok: false as const, error: "NOT_FOUND", message: "课程不存在或已被移除。" };
  }

  if (error instanceof Error && error.message === "CLASS_NOT_FOUND") {
    return { ok: false as const, error: "NOT_FOUND", message: "班级不存在或已被移除。" };
  }

  if (error instanceof Error && error.message === "COURSE_DELETE_CONFIRMATION_MISMATCH") {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "请输入完整课程名称后再删除。" };
  }

  const blockedError = error as Error & {
    reasons?: CourseDeleteBlockedReasonDTO[];
    userMessage?: string;
  };
  if (blockedError?.message === "COURSE_DELETE_BLOCKED") {
    return {
      ok: false as const,
      error: "DELETE_BLOCKED",
      message: blockedError.userMessage ?? "课程暂时不能删除，请先处理以下阻断项。",
      reasons: blockedError.reasons ?? [],
    };
  }

  return { ok: false as const, error: "ACTION_FAILED", message: actionErrorMessage };
}

function invalidateCourseTags(actorId: string, courseId: string) {
  updateTag(cacheTags.teacherCourses(actorId));
  updateTag(cacheTags.course(courseId));
}

export async function createCourseAction(input: FormData | Record<string, unknown>): Promise<CourseCreateActionResult> {
  const normalized = normalizeInput(input);
  const parsed = CourseCreateInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const course = await createCourseForTeacherScoped(parsed.data);
    invalidateCourseTags(actor.userId, course.id);
    return { ok: true, data: course };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCourseAction(input: FormData | Record<string, unknown>): Promise<CourseUpdateActionResult> {
  const normalized = normalizeInput(input);
  const parsed = CourseUpdateInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const course = await updateCourseForTeacherScoped(parsed.data);
    invalidateCourseTags(actor.userId, course.id);
    return { ok: true, data: course };
  } catch (error) {
    return handleActionError(error);
  }
}

async function runCourseClassAssociationAction(
  input: FormData | Record<string, unknown>,
  handler: (input: { courseId: string; classId: string }) => Promise<TeacherCourseDetailDTO>
): Promise<CourseUpdateActionResult> {
  const normalized = normalizeInput(input);
  const parsed = CourseClassAssociationInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const course = await handler(parsed.data);
    invalidateCourseTags(actor.userId, course.id);
    return { ok: true, data: course };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addCourseClassAssociationAction(input: FormData | Record<string, unknown>): Promise<CourseUpdateActionResult> {
  return runCourseClassAssociationAction(input, addCourseClassAssociationForTeacherScoped);
}

export async function removeCourseClassAssociationAction(input: FormData | Record<string, unknown>): Promise<CourseUpdateActionResult> {
  return runCourseClassAssociationAction(input, removeCourseClassAssociationForTeacherScoped);
}

async function runCourseLifecycleAction(
  input: FormData | Record<string, unknown>,
  handler: (input: { courseId: string }) => Promise<TeacherCourseDetailDTO>
): Promise<CourseLifecycleActionResult> {
  const normalized = normalizeInput(input);
  const parsed = CourseLifecycleInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const course = await handler(parsed.data);
    invalidateCourseTags(actor.userId, course.id);
    return { ok: true, data: course };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishCourseAction(input: FormData | Record<string, unknown>): Promise<CourseLifecycleActionResult> {
  return runCourseLifecycleAction(input, publishCourseForTeacherScoped);
}

export async function unpublishCourseAction(input: FormData | Record<string, unknown>): Promise<CourseLifecycleActionResult> {
  return runCourseLifecycleAction(input, unpublishCourseForTeacherScoped);
}

export async function archiveCourseAction(input: FormData | Record<string, unknown>): Promise<CourseLifecycleActionResult> {
  return runCourseLifecycleAction(input, archiveCourseForTeacherScoped);
}

export async function deleteCourseAction(input: FormData | Record<string, unknown>): Promise<CourseDeleteActionResult> {
  const normalized = normalizeInput(input);
  const parsed = CourseDeleteInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const actor = await assertActiveTeacher();
    const deleted = await deleteCourseForTeacherScoped(parsed.data);
    invalidateCourseTags(actor.userId, deleted.id);
    return { ok: true, data: deleted };
  } catch (error) {
    return handleActionError(error) as CourseDeleteActionResult;
  }
}
