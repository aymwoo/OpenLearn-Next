"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { retryAsyncTaskForOperator } from "@/features/async-tasks/server/recovery";
import { cacheTags } from "@/lib/cache-policy";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string; issues?: unknown[] };

const RetryAsyncTaskForOperatorInputSchema = z
  .object({
    taskId: z.string().trim().min(1),
  })
  .strict();

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "任务标识不完整，请刷新后重试。",
      issues: error.issues,
    };
  }

  if (
    error instanceof Error
    && [
      "AUTH_REQUIRED",
      "ASYNC_TASK_OPERATOR_FORBIDDEN",
      "ASYNC_TASK_NOT_FOUND",
      "ASYNC_TASK_RECOVERY_NOT_SUPPORTED",
      "ASYNC_TASK_RECOVERY_NOT_ALLOWED",
      "ASYNC_TASK_JOB_NOT_FOUND",
    ].includes(error.message)
  ) {
    return {
      ok: false,
      error: error.message,
      message: "当前任务暂时不能执行 operator recovery。",
    };
  }

  return {
    ok: false,
    error: "ACTION_FAILED",
    message: "恢复请求没有成功提交，请稍后再试。",
  };
}

export async function retryAsyncTaskForOperatorAction(
  input: { taskId: string },
): Promise<ActionResult<Awaited<ReturnType<typeof retryAsyncTaskForOperator>>>> {
  const parsed = RetryAsyncTaskForOperatorInputSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  try {
    const result = await retryAsyncTaskForOperator(parsed.data);
    updateTag(cacheTags.asyncTask(result.taskId));
    updateTag(cacheTags.asyncTaskEntity(result.entityType, result.entityId));
    updateTag(cacheTags.asyncTaskList(result.actorId));
    revalidatePath("/settings/labs/async-tasks");
    revalidatePath(`/settings/labs/async-tasks/${result.taskId}`);
    return { ok: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}
