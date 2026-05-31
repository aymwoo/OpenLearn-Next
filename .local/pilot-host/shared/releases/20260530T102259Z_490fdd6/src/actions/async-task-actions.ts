"use server";

import { z } from "zod";

import { enqueueAsyncTask } from "@/features/async-tasks/server/enqueue";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

type AsyncTaskActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

const AsyncTaskBootstrapInputSchema = z
  .object({
    entityType: z.string().trim().min(1),
    entityId: z.string().trim().min(1),
    entityLabel: z.string().trim().min(1).nullable().default(null),
    reason: z.string().trim().min(1).nullable().default(null),
  })
  .strict();

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

function validationError(): AsyncTaskActionResult<never> {
  return {
    ok: false,
    error: "VALIDATION_ERROR",
    message: "输入内容不完整，请检查后再试。",
  };
}

function handleActionError(error: unknown): AsyncTaskActionResult<never> {
  if (error instanceof z.ZodError) {
    return validationError();
  }

  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    };
  }

  return {
    ok: false,
    error: "ACTION_FAILED",
    message: "异步任务暂时没有创建成功，请稍后重试。",
  };
}

export async function createAsyncTaskBootstrapAction(
  input: FormData | Record<string, unknown>,
): Promise<AsyncTaskActionResult<Awaited<ReturnType<typeof enqueueAsyncTask>>>> {
  const normalized = normalizeInput(input);
  const parsed = AsyncTaskBootstrapInputSchema.safeParse(normalized);

  if (!parsed.success) {
    return validationError();
  }

  try {
    const actor = await assertActiveTeacher();
    const task = await enqueueAsyncTask({
      actorId: actor.userId,
      schoolId: actor.schoolIds[0]!,
      taskType: "platform.healthcheck",
      entityRef: {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        entityLabel: parsed.data.entityLabel,
      },
      payload: {
        requestedBy: "developer",
        reason: parsed.data.reason,
      },
      dispatchRequested: false,
    });

    return { ok: true, data: task };
  } catch (error) {
    return handleActionError(error);
  }
}
