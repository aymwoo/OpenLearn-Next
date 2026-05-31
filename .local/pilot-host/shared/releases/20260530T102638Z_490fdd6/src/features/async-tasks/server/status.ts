import {
  AsyncTaskEnqueueIntentStatusSchema,
  AsyncTaskStatusSchema,
  type AsyncTaskStatus,
} from "../shared/contract";

const TERMINAL_ASYNC_TASK_STATUSES = new Set<AsyncTaskStatus>([
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
]);

export function isAsyncTaskTerminalStatus(status: unknown) {
  return TERMINAL_ASYNC_TASK_STATUSES.has(AsyncTaskStatusSchema.parse(status));
}

export function resolveAsyncTaskDisplayStatus(input: {
  status: unknown;
  enqueueIntentStatus?: unknown;
}) {
  const status = AsyncTaskStatusSchema.parse(input.status);
  const enqueueIntentStatus =
    input.enqueueIntentStatus == null
      ? null
      : AsyncTaskEnqueueIntentStatusSchema.parse(input.enqueueIntentStatus);

  if (status === "pending_enqueue" && enqueueIntentStatus === "dispatching") {
    return "dispatching" satisfies AsyncTaskStatus;
  }

  if (
    (status === "pending_enqueue" || status === "queued") &&
    enqueueIntentStatus === "dispatch_failed"
  ) {
    return "dispatch_failed" satisfies AsyncTaskStatus;
  }

  return status;
}
