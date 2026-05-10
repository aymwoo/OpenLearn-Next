"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { createCourseForTeacherScoped, updateCourseForTeacherScoped } from "@/lib/dal/course-authoring";
import { cacheTags } from "@/lib/cache-policy";
import {
  CourseCreateInputSchema,
  CourseUpdateInputSchema,
  type TeacherCourseDetailDTO,
} from "@/lib/dto/course-authoring";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string };
type CourseCreateActionResult = ActionResult<{ id: string }>;
type CourseUpdateActionResult = ActionResult<TeacherCourseDetailDTO>;

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
