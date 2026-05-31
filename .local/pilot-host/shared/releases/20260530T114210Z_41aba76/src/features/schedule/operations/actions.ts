"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  createScheduleOverride,
  removeHolidayCalendarDate,
  revokeScheduleOverride,
  saveHolidayCalendarDate,
  updateScheduleOverride,
} from "@/features/schedule/operations/server";
import { assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { invalidateScheduleOperationTags } from "@/features/schedule/shared/cache";
import { ScheduleHolidayDateInputSchema, ScheduleOverrideInputSchema } from "@/features/schedule/shared/dto/operations";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "调课或校历信息不完整，请检查后重试。" };
  }
  if (error instanceof Error && (error.message === "TEACHER_AUTH_REQUIRED" || error.message === "SCHEDULE_OVERRIDE_BLOCKED")) {
    return {
      ok: false as const,
      error: "SCHEDULE_OVERRIDE_BLOCKED",
      message: "当前调课请求不满足范围、生效日期或动作要求。",
    };
  }

  return { ok: false as const, error: "ACTION_FAILED", message: "课表变更暂时没有保存成功。" };
}

export async function createScheduleOverrideAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ScheduleOverrideInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "调课内容不完整，请检查后再保存。" };
  }

  try {
    const actor = await assertScheduleTeacherScope();
    const row = await createScheduleOverride(parsed.data);
    invalidateScheduleOperationTags(updateTag, { actorId: actor.userId, schoolId: row.schoolId, classId: row.classId, effectiveDate: row.effectiveDate });
    return { ok: true, data: row };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateScheduleOverrideAction(input: FormData | (Record<string, unknown> & { overrideId?: string })): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const overrideId = typeof normalized.overrideId === "string" ? normalized.overrideId : null;
  const parsed = ScheduleOverrideInputSchema.safeParse(normalized);
  if (!overrideId || !parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "调课内容不完整，请检查后再保存。" };
  }

  try {
    const actor = await assertScheduleTeacherScope();
    const row = await updateScheduleOverride({ overrideId, ...parsed.data });
    invalidateScheduleOperationTags(updateTag, { actorId: actor.userId, schoolId: row.schoolId, classId: row.classId, effectiveDate: row.effectiveDate });
    return { ok: true, data: row };
  } catch (error) {
    return handleError(error);
  }
}

export async function revokeScheduleOverrideAction(input: { overrideId: string; reason: string }): Promise<ActionResult<unknown>> {
  try {
    const actor = await assertScheduleTeacherScope();
    const row = await revokeScheduleOverride(input);
    invalidateScheduleOperationTags(updateTag, {
      actorId: actor.userId,
      schoolId: row.schoolId,
      classId: row.classId,
      effectiveDate: row.effectiveDate,
      proposalId: row.sourceProposalId ?? null,
    });
    return { ok: true, data: row };
  } catch (error) {
    return handleError(error);
  }
}

export async function saveHolidayCalendarDateAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ScheduleHolidayDateInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "校历信息不完整，请检查后重试。" };
  }

  try {
    const actor = await assertScheduleTeacherScope();
    const row = await saveHolidayCalendarDate(parsed.data);
    invalidateScheduleOperationTags(updateTag, { actorId: actor.userId, schoolId: row.schoolId, effectiveDate: row.date });
    return { ok: true, data: row };
  } catch (error) {
    return handleError(error);
  }
}

export async function removeHolidayCalendarDateAction(input: { holidayDateId: string }): Promise<ActionResult<unknown>> {
  try {
    const actor = await assertScheduleTeacherScope();
    const row = await removeHolidayCalendarDate(input);
    if (row) {
      invalidateScheduleOperationTags(updateTag, { actorId: actor.userId, schoolId: row.schoolId, effectiveDate: row.date });
    }
    return { ok: true, data: row };
  } catch (error) {
    return handleError(error);
  }
}
