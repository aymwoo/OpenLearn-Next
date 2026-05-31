import { startAsyncTaskWorker } from "@/features/async-tasks/worker/bootstrap";

async function main() {
  const runtime = await startAsyncTaskWorker();

  if (!runtime.enabled) {
    console.warn("[async-task-worker] ASYNC_TASKS_ENABLED is false or BULLMQ_REDIS_URL is missing.");
    return;
  }

  console.log(`[async-task-worker] started queues: ${runtime.queueNames.join(", ") || "none"}`);
}

void main().catch((error) => {
  console.error("[async-task-worker] failed to start", error);
  process.exitCode = 1;
});
