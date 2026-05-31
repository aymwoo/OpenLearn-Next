import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { asyncTaskEvents, asyncTasks } from "@/db/schema";
import {
  AsyncTaskDetailDTOSchema,
  AsyncTaskListItemDTOSchema,
  type AsyncTaskDetailDTO,
  type AsyncTaskListItemDTO,
} from "@/features/async-tasks";
import {
  toAsyncTaskDetailDTOInput,
  toAsyncTaskListItemDTOInput,
} from "@/features/async-tasks/server/mapper";
import { cacheTags } from "@/lib/cache-policy";

const AsyncTaskActorListInputSchema = z
  .object({
    actorId: z.string().trim().min(1),
    limit: z.number().int().positive().max(100).default(20),
  })
  .strict();

const AsyncTaskEntityListInputSchema = z
  .object({
    entityType: z.string().trim().min(1),
    entityId: z.string().trim().min(1),
    schoolId: z.string().trim().min(1).optional(),
    limit: z.number().int().positive().max(100).default(20),
  })
  .strict();

const AsyncTaskDetailInputSchema = z
  .object({
    taskId: z.string().trim().min(1),
  })
  .strict();

async function getCachedActorAsyncTaskListDTO(
  input: z.infer<typeof AsyncTaskActorListInputSchema>,
) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.asyncTaskList(input.actorId));

  const rows = await db.query.asyncTasks.findMany({
    where: eq(asyncTasks.actorId, input.actorId),
    orderBy: [desc(asyncTasks.createdAt)],
    limit: input.limit,
  });

  return rows.map((row) => AsyncTaskListItemDTOSchema.parse(toAsyncTaskListItemDTOInput(row)));
}

async function getCachedEntityAsyncTaskListDTO(
  input: z.infer<typeof AsyncTaskEntityListInputSchema>,
) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.asyncTaskEntity(input.entityType, input.entityId));

  const rows = await db.query.asyncTasks.findMany({
    where: input.schoolId
      ? and(
          eq(asyncTasks.entityType, input.entityType),
          eq(asyncTasks.entityId, input.entityId),
          eq(asyncTasks.schoolId, input.schoolId),
        )
      : and(eq(asyncTasks.entityType, input.entityType), eq(asyncTasks.entityId, input.entityId)),
    orderBy: [desc(asyncTasks.createdAt)],
    limit: input.limit,
  });

  return rows.map((row) => AsyncTaskListItemDTOSchema.parse(toAsyncTaskListItemDTOInput(row)));
}

async function getCachedAsyncTaskDetailDTO(
  input: z.infer<typeof AsyncTaskDetailInputSchema>,
) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.asyncTask(input.taskId));

  const task = await db.query.asyncTasks.findFirst({
    where: eq(asyncTasks.id, input.taskId),
  });

  if (!task) {
    throw new Error("ASYNC_TASK_NOT_FOUND");
  }

  cacheTag(cacheTags.asyncTaskList(task.actorId));
  cacheTag(cacheTags.asyncTaskEntity(task.entityType, task.entityId));

  const events = await db.query.asyncTaskEvents.findMany({
    where: eq(asyncTaskEvents.taskId, input.taskId),
    orderBy: [desc(asyncTaskEvents.createdAt)],
  });

  return AsyncTaskDetailDTOSchema.parse(toAsyncTaskDetailDTOInput(task, events));
}

export async function getActorAsyncTaskListDTO(
  rawInput: z.input<typeof AsyncTaskActorListInputSchema>,
): Promise<AsyncTaskListItemDTO[]> {
  const input = AsyncTaskActorListInputSchema.parse(rawInput);
  return getCachedActorAsyncTaskListDTO(input);
}

export async function getEntityAsyncTaskListDTO(
  rawInput: z.input<typeof AsyncTaskEntityListInputSchema>,
): Promise<AsyncTaskListItemDTO[]> {
  const input = AsyncTaskEntityListInputSchema.parse(rawInput);
  return getCachedEntityAsyncTaskListDTO(input);
}

export async function getAsyncTaskDetailDTO(
  rawInput: z.input<typeof AsyncTaskDetailInputSchema>,
): Promise<AsyncTaskDetailDTO> {
  const input = AsyncTaskDetailInputSchema.parse(rawInput);
  return getCachedAsyncTaskDetailDTO(input);
}
