"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  importClassRosterForTeacher,
  importClassesForTeacher,
  updateClassNameForTeacher,
} from "@/lib/dal/class-management";
import {
  ImportClassRosterInputSchema,
  ImportClassesInputSchema,
  UpdateClassNameInputSchema,
} from "@/lib/dto/class-management";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string; missingClassNames?: string[] };

function handleClassManagementError(error: unknown, fallbackMessage: string): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return { ok: false, error: "VALIDATION_ERROR", message: "输入内容不完整，请检查后再试。" };
  }

  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false, error: "UNAUTHORIZED", message: "您没有权限执行此操作。" };
  }

  if (error instanceof Error && error.message === "CLASS_NOT_FOUND") {
    return { ok: false, error: "NOT_FOUND", message: "班级不存在或已被移除。" };
  }

  return { ok: false, error: "ACTION_FAILED", message: fallbackMessage };
}

function refreshClassesPage() {
  revalidatePath("/teacher/classes");
}

export async function updateClassNameAction(input: unknown): Promise<ActionResult<{ name: string }>> {
  const parsed = UpdateClassNameInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "班级名称不能为空。" };
  }

  try {
    const updated = await updateClassNameForTeacher(parsed.data);
    refreshClassesPage();
    return { ok: true, data: { name: updated.name } };
  } catch (error) {
    return handleClassManagementError(error, "班级名称暂时没有保存成功，请稍后重试。");
  }
}

export async function importClassesAction(input: unknown): Promise<ActionResult<{ totalCount: number; createdCount: number; skippedCount: number }>> {
  const parsed = ImportClassesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "未识别到有效的班级数据。" };
  }

  try {
    const result = await importClassesForTeacher(parsed.data);
    refreshClassesPage();
    return { ok: true, data: result };
  } catch (error) {
    return handleClassManagementError(error, "班级导入暂时没有成功，请稍后重试。");
  }
}

export async function importClassRosterAction(input: unknown): Promise<ActionResult<{ createdClassCount: number; createdStudentCount: number; linkedStudentCount: number }>> {
  const parsed = ImportClassRosterInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "未识别到有效的学生名册数据。" };
  }

  try {
    const result = await importClassRosterForTeacher(parsed.data);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        message: "发现部分班级尚未创建。",
        missingClassNames: result.missingClassNames,
      };
    }

    refreshClassesPage();
    return { ok: true, data: result };
  } catch (error) {
    return handleClassManagementError(error, "学生名册导入暂时没有成功，请稍后重试。");
  }
}
