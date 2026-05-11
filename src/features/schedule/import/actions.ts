"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { approveScheduleImport, draftScheduleImport, type ScheduleImportActionError } from "@/features/schedule/import/server";
import { assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { invalidateScheduleImportTags } from "@/features/schedule/shared/cache";
import { ApproveScheduleImportInputSchema, ScheduleImportDraftInputSchema } from "@/features/schedule/shared/dto/import";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };

function handleScheduleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "导入内容不完整，请先检查输入。" };
  }

  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false as const, error: "UNAUTHORIZED", message: "您没有权限处理当前课表数据。" };
  }

  const scheduleError = error as ScheduleImportActionError;
  if (scheduleError?.code === "APPROVE_IMPORT_BLOCKED") {
    return {
      ok: false as const,
      error: "APPROVE_IMPORT_BLOCKED",
      message: scheduleError.userMessage ?? "还有未解决的导入阻断项。",
      issues: scheduleError.issues ?? [],
    };
  }

  return { ok: false as const, error: "ACTION_FAILED", message: "课表导入暂时没有成功，请稍后重试。" };
}

export async function draftScheduleImportAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ScheduleImportDraftInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "导入内容不完整，请先检查输入。" };
  }

  try {
    const actor = await assertScheduleTeacherScope();
    const batch = await draftScheduleImport(parsed.data);
    invalidateScheduleImportTags(updateTag, { actorId: actor.userId, schoolId: batch.schoolId, batchId: batch.id });
    return { ok: true, data: batch };
  } catch (error) {
    return handleScheduleError(error);
  }
}

export async function approveScheduleImportAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ApproveScheduleImportInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "审批参数不完整，请刷新后重试。" };
  }

  try {
    const actor = await assertScheduleTeacherScope();
    const batch = await approveScheduleImport(parsed.data);
    invalidateScheduleImportTags(updateTag, { actorId: actor.userId, schoolId: batch.schoolId, batchId: batch.id });
    return { ok: true, data: batch };
  } catch (error) {
    return handleScheduleError(error);
  }
}
