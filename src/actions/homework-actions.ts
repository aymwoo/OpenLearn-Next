"use server";

import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import {
  createHomeworkAssignment,
  submitHomework,
  gradeHomework,
  getHomeworkAssignments,
  getHomeworkSubmissions,
  getHomeworkGrades,
} from "@/lib/dal/homework";
import { HomeworkAssignmentDTOSchema, HomeworkSubmissionDTOSchema, HomeworkGradeDTOSchema } from "@/lib/dto/plugin-data-model";

// ── Auth helpers ────────────────────────────────────────────────────────────

async function assertTeacher() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录");
  // role 检查：只有教师可创建作业/打分
  const role = (session.user as { role?: string }).role;
  if (role !== "teacher") throw new Error("仅教师可执行此操作");
  return session.user.id;
}

async function assertAuthenticated() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录");
  return { actorId: session.user.id, role: (session.user as { role?: string }).role };
}

// ── Teacher Actions ─────────────────────────────────────────────────────────

export async function createHomeworkAssignmentAction(rawInput: unknown) {
  const actorId = await assertTeacher();
  const base = HomeworkAssignmentDTOSchema.parse(rawInput);
  return createHomeworkAssignment({ ...base, actorId });
}

export async function gradeHomeworkAction(rawInput: unknown) {
  const actorId = await assertTeacher();
  const base = HomeworkGradeDTOSchema.parse(rawInput);
  return gradeHomework({ ...base, actorId });
}

export async function getHomeworkSubmissionsAction(rawInput: unknown) {
  const { actorId } = await assertAuthenticated();
  const input = z.object({ classroomSession: z.string().min(1), assignment: z.string().min(1) }).parse(rawInput);
  return getHomeworkSubmissions({ ...input, actorId });
}

// ── Student Actions ─────────────────────────────────────────────────────────

export async function submitHomeworkAction(rawInput: unknown) {
  const actorId = await assertAuthenticated();
  // 学生提交时 student 字段必须与认证身份一致
  const base = HomeworkSubmissionDTOSchema.parse(rawInput);
  return submitHomework({ ...base, actorId: actorId.actorId });
}

// ── Shared Actions ──────────────────────────────────────────────────────────

export async function getHomeworkAssignmentsAction(rawInput: unknown) {
  const { actorId } = await assertAuthenticated();
  const input = z.object({ classroomSession: z.string().min(1) }).parse(rawInput);
  return getHomeworkAssignments({ ...input, actorId });
}

export async function getHomeworkGradesAction(rawInput: unknown) {
  const { actorId } = await assertAuthenticated();
  const input = z.object({
    classroomSession: z.string().min(1),
    student: z.string().min(1),
    submission: z.string().min(1),
  }).parse(rawInput);
  return getHomeworkGrades({ ...input, actorId });
}
