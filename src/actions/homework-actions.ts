"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { cacheTags } from "@/lib/cache-policy";
import {
  insertHomeworkAssignment,
  submitHomework,
  upsertHomeworkGrade,
} from "@/lib/dal/homework";

// ── helpers ──────────────────────────────────────────────────────────────────

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

function validationError(): ActionResult {
  return { ok: false, error: "VALIDATION_ERROR", message: "请求参数不符合预期格式" };
}

function handleError(error: unknown): ActionResult {
  if (error instanceof Error) {
    return { ok: false, error: error.name, message: error.message };
  }
  return { ok: false, error: "UNKNOWN_ERROR", message: "操作失败，请重试" };
}

async function requireTeacher(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("请先登录");
  const roles = (session.user as { roles?: string[] }).roles ?? [];
  if (!roles.includes("teacher")) throw new Error("仅教师可执行此操作");
  return session.user.id;
}

async function requireStudent(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("请先登录");
  const roles = (session.user as { roles?: string[] }).roles ?? [];
  if (!roles.includes("student")) throw new Error("仅学生可执行此操作");
  return session.user.id;
}

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) return input;
  return Object.fromEntries(input.entries());
}

// ── create homework assignment ───────────────────────────────────────────────

const CreateHomeworkAssignmentInputSchema = z.strictObject({
  classroomSession: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export async function createHomeworkAssignmentAction(
  input: FormData | Record<string, unknown>,
): Promise<ActionResult> {
  const parsed = CreateHomeworkAssignmentInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    await requireTeacher();
    const result = await insertHomeworkAssignment(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.classroomSession));
    return { ok: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}

// ── submit homework ──────────────────────────────────────────────────────────

const SubmitHomeworkInputSchema = z.strictObject({
  classroomSession: z.string().min(1),
  student: z.string().min(1),
  assignment: z.string().min(1),
  content: z.string().min(1),
  attachmentUrl: z.string().optional(),
});

export async function submitHomeworkAction(
  input: FormData | Record<string, unknown>,
): Promise<ActionResult> {
  const parsed = SubmitHomeworkInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    await requireStudent();
    const result = await submitHomework(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.classroomSession));
    return { ok: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}

// ── submit homework grade ─────────────────────────────────────────────────────

const SubmitGradeInputSchema = z.strictObject({
  classroomSession: z.string().min(1),
  student: z.string().min(1),
  submission: z.string().min(1),
  score: z.number().int().min(0).max(100).optional(),
  comment: z.string().optional(),
});

export async function submitGradeAction(
  input: FormData | Record<string, unknown>,
): Promise<ActionResult> {
  const parsed = SubmitGradeInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    await requireTeacher();
    const result = await upsertHomeworkGrade(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.classroomSession));
    return { ok: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}
