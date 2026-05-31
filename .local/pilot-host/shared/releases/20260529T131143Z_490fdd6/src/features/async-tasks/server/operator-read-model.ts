import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { asyncTaskEvents, asyncTasks } from "@/db/schema";

type AsyncTaskRow = typeof asyncTasks.$inferSelect;
type AsyncTaskEventRow = typeof asyncTaskEvents.$inferSelect;

export type AsyncTaskOperatorTaskRow = AsyncTaskRow;

export async function listOperatorVisibleAsyncTasks(input: {
  schoolIds: string[];
  limit: number;
}) {
  if (input.schoolIds.length === 0) {
    return [] satisfies AsyncTaskRow[];
  }

  return db.query.asyncTasks.findMany({
    where: inArray(asyncTasks.schoolId, input.schoolIds),
    orderBy: [desc(asyncTasks.updatedAt)],
    limit: input.limit,
  });
}

export async function getAsyncTaskWithEvents(taskId: string): Promise<{
  task: AsyncTaskRow | null;
  events: AsyncTaskEventRow[];
}> {
  const task = await db.query.asyncTasks.findFirst({
    where: eq(asyncTasks.id, taskId),
  });

  if (!task) {
    return {
      task: null,
      events: [],
    };
  }

  const events = await db.query.asyncTaskEvents.findMany({
    where: eq(asyncTaskEvents.taskId, task.id),
    orderBy: [desc(asyncTaskEvents.createdAt)],
  });

  return {
    task,
    events,
  };
}
