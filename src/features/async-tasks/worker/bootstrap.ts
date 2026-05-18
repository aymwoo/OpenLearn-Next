import "server-only";

import type { QueueEvents, Worker } from "bullmq";

import { closeBullmqConnections, getBullmqEnvironmentCapability } from "@/features/async-tasks/infra/connection";
import {
  closeAsyncTaskQueues,
  createAsyncTaskQueueEvents,
  createAsyncTaskWorker,
  getAsyncTaskQueueNames,
} from "@/features/async-tasks/infra/bullmq";

import { buildAsyncTaskQueueProcessor } from "./registry";

type AsyncTaskWorkerRuntimeSnapshot = {
  started: boolean;
  enabled: boolean;
  queueNames: string[];
};

class AsyncTaskWorkerRuntime {
  private workers = new Map<string, Worker>();
  private queueEvents = new Map<string, QueueEvents>();
  private started = false;

  async start() {
    if (this.started) {
      return this.getSnapshot();
    }

    const capability = getBullmqEnvironmentCapability();
    if (!capability.asyncTasksEnabled) {
      return this.getSnapshot();
    }

    const queueNames = getAsyncTaskQueueNames();

    for (const queueName of queueNames) {
      const worker = await createAsyncTaskWorker(queueName, buildAsyncTaskQueueProcessor(queueName));
      const queueEvents = await createAsyncTaskQueueEvents(queueName);

      worker.on("error", () => {
        // Worker error handling is projected in later phases.
      });
      queueEvents.on("error", () => {
        // QueueEvents projection lands in Phase 40-02.
      });

      this.workers.set(queueName, worker);
      this.queueEvents.set(queueName, queueEvents);
    }

    this.started = true;

    return this.getSnapshot();
  }

  async stop() {
    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
    await Promise.all([...this.queueEvents.values()].map((queueEvents) => queueEvents.close()));
    this.workers.clear();
    this.queueEvents.clear();
    this.started = false;

    await closeAsyncTaskQueues();
    await closeBullmqConnections();
  }

  getSnapshot(): AsyncTaskWorkerRuntimeSnapshot {
    return {
      started: this.started,
      enabled: getBullmqEnvironmentCapability().asyncTasksEnabled,
      queueNames: [...this.workers.keys()],
    };
  }
}

const asyncTaskWorkerRuntime = new AsyncTaskWorkerRuntime();

export async function startAsyncTaskWorker() {
  return asyncTaskWorkerRuntime.start();
}

export async function stopAsyncTaskWorker() {
  await asyncTaskWorkerRuntime.stop();
}

export function getAsyncTaskWorkerRuntimeSnapshot() {
  return asyncTaskWorkerRuntime.getSnapshot();
}
