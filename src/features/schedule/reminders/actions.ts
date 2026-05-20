"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getScheduleReminderCenterDTO, retryScheduleReminderDispatch, saveScheduleReminderRule } from "@/features/schedule/reminders/server";
import { invalidateScheduleReminderTags } from "@/features/schedule/shared/cache";
import { ScheduleReminderRuleInputSchema } from "@/features/schedule/shared/dto/reminders";

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

  if (error instanceof Error && error.message === "SCHEDULE_REMINDER_OPERATOR_RECOVERY_ONLY") {
    return {
      ok: false as const,
      error: "SCHEDULE_REMINDER_OPERATOR_RECOVERY_ONLY",
      message: "提醒失败后的恢复已收口到 operator 面，请前往异步任务恢复面处理。",
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
    invalidateScheduleReminderTags(updateTag, parsed.data.schoolId);
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}

export async function retryScheduleReminderDispatchAction(input: { dispatchId: string }): Promise<ActionResult<unknown>> {
  try {
    await retryScheduleReminderDispatch(input);
    return { ok: true, data: null };
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
