"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { approveScheduleImport, deleteScheduleImportBatch, draftScheduleImport, setPrimaryScheduleImportBatch, type ScheduleImportActionError } from "@/features/schedule/import/server";
import { assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { invalidateScheduleImportTags } from "@/features/schedule/shared/cache";
import { ApproveScheduleImportInputSchema, ScheduleImportDraftInputSchema } from "@/features/schedule/shared/dto/import";
import { normalizeScheduleImportColumnHeader, SCHEDULE_IMPORT_COLUMN_MAP } from "@/features/schedule/import/template";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };
const DeleteScheduleImportBatchInputSchema = z.object({ batchId: z.string().min(1) }).strict();
const SetPrimaryScheduleImportBatchInputSchema = z.object({ batchId: z.string().min(1) }).strict();

function normalizeImportTimeValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const matched = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) {
    return trimmed;
  }

  const [, hours, minutes] = matched;
  return `${hours.padStart(2, "0")}:${minutes}`;
}

function normalizeImportRow(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeScheduleImportColumnHeader(key);
    const englishKey = SCHEDULE_IMPORT_COLUMN_MAP[normalizedKey as keyof typeof SCHEDULE_IMPORT_COLUMN_MAP] ?? normalizedKey;

    if (englishKey === "weekday") {
      if (typeof value === "number") {
        mapped[englishKey] = value;
        continue;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        mapped[englishKey] = trimmed === "" ? value : Number(trimmed);
        continue;
      }
    }

    if (englishKey === "bellSlotStartTime" || englishKey === "bellSlotEndTime") {
      mapped[englishKey] = normalizeImportTimeValue(value);
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      mapped[englishKey] = trimmed === "" ? (englishKey === "roomLabel" ? null : "") : trimmed;
      continue;
    }

    mapped[englishKey] = value;
  }

  return mapped;
}

function normalizeDraftScheduleImportInput(input: FormData | Record<string, unknown>) {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : { ...input };

  if (typeof normalized.rows === "string") {
    try {
      normalized.rows = JSON.parse(normalized.rows) as unknown;
    } catch {
      return normalized;
    }
  }

  if (normalized.rows && Array.isArray(normalized.rows)) {
    normalized.rows = normalized.rows.map((row) => {
      if (!row || typeof row !== "object") {
        return row;
      }

      return normalizeImportRow(row as Record<string, unknown>);
    });
  }

  return normalized;
}

function transformChineseKeys<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => normalizeImportRow(row) as T);
}

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

  if (scheduleError?.code === "SET_PRIMARY_IMPORT_BLOCKED") {
    return {
      ok: false as const,
      error: "SET_PRIMARY_IMPORT_BLOCKED",
      message: scheduleError.userMessage ?? "当前课表暂时不能设为主课表。",
      issues: scheduleError.issues ?? [],
    };
  }

  return { ok: false as const, error: "ACTION_FAILED", message: "课表导入暂时没有成功，请稍后重试。" };
}

export async function draftScheduleImportAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = normalizeDraftScheduleImportInput(input);

  // Transform Chinese keys to English keys before validation
  if (normalized.rows && Array.isArray(normalized.rows)) {
    normalized.rows = transformChineseKeys(normalized.rows as Record<string, unknown>[]);
  }

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

export async function deleteScheduleImportBatchAction(batchId: string) {
  const parsed = DeleteScheduleImportBatchInputSchema.parse({ batchId });
  const actor = await assertScheduleTeacherScope();
  const deleted = await deleteScheduleImportBatch(parsed.batchId);

  invalidateScheduleImportTags(updateTag, {
    actorId: actor.userId,
    schoolId: deleted.schoolId,
    batchId: deleted.id,
  });

  redirect("/teacher/schedule");
}

export async function setPrimaryScheduleImportBatchAction(batchId: string) {
  const parsed = SetPrimaryScheduleImportBatchInputSchema.parse({ batchId });
  const actor = await assertScheduleTeacherScope();
  const batch = await setPrimaryScheduleImportBatch(parsed.batchId);

  invalidateScheduleImportTags(updateTag, {
    actorId: actor.userId,
    schoolId: batch.schoolId,
    batchId: batch.id,
  });

  redirect("/teacher/schedule");
}
