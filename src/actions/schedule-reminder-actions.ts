"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { cacheTags } from "@/lib/cache-policy";
import { getScheduleReminderCenterDTO, retryScheduleReminderDispatch, saveScheduleReminderRule } from "@/lib/dal/schedule-reminders";
import { ScheduleReminderRuleInputSchema } from "@/lib/dto/schedule";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "提醒配置不完整，请先检查输入。" };
  }
  if (error instanceof Error && (error.message === "TEACHER_AUTH_REQUIRED" || error.message === "SCHEDULE_REMINDER_BLOCKED")) {
    return {
      ok: false as const,
      error: "SCHEDULE_REMINDER_BLOCKED",
      message: "当前提醒类型、对象或渠道不在首发允许范围内。",
    };
  }

  return { ok: false as const, error: "ACTION_FAILED", message: "提醒配置暂时没有保存成功。" };
}

export async function saveScheduleReminderRuleAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ScheduleReminderRuleInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "提醒配置不完整，请先检查输入。" };
  }

  try {
    const dto = await saveScheduleReminderRule(parsed.data);
    updateTag(cacheTags.scheduleReminder(parsed.data.schoolId));
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}

export async function retryScheduleReminderDispatchAction(input: { dispatchId: string }): Promise<ActionResult<unknown>> {
  try {
    const dto = await retryScheduleReminderDispatch(input);
    updateTag(cacheTags.scheduleReminder(dto.schoolId));
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}

export async function refreshScheduleReminderCenterAction(input?: { schoolId?: string }): Promise<ActionResult<unknown>> {
  try {
    const dto = await getScheduleReminderCenterDTO(input);
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}
