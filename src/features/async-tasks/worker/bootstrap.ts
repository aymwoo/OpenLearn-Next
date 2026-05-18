import "server-only";

import type { QueueEvents, Worker } from "bullmq";

import { closeBullmqConnections, getBullmqEnvironmentCapability } from "@/features/async-tasks/infra/connection";
import {
  closeAsyncTaskQueues,
  createAsyncTaskQueueEvents,
  createAsyncTaskWorker,
  getAsyncTaskQueueNames,
} from "@/features/async-tasks/infra/bullmq";
import {
  createAsyncTaskQueueEventsProjector,
  recordAsyncTaskWorkerShutdownRequested,
} from "@/features/async-tasks/infra/queue-events";

import { buildAsyncTaskQueueProcessor } from "./registry";

type AsyncTaskWorkerRuntimeSnapshot = {
  started: boolean;
  enabled: boolean;
  queueNames: string[];
};

class AsyncTaskWorkerRuntime {
  private workers = new Map<string, Worker>();
  private queueEvents = new Map<string, QueueEvents>();
  private projectors = new Map<
    string,
    ReturnType<typeof createAsyncTaskQueueEventsProjector>
  >();
  private started = false;
  private shutdownHandlersAttached = false;
  private activeSignal: string | null = null;

  private attachShutdownHandlers() {
    if (this.shutdownHandlersAttached) {
      return;
    }

    this.shutdownHandlersAttached = true;

    const shutdown = (signal: string) => {
      void this.stop(signal).finally(() => {
        process.exitCode = process.exitCode ?? 0;
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }

  async start() {
    if (this.started) {
      return this.getSnapshot();
    }

    const capability = getBullmqEnvironmentCapability();
    if (!capability.asyncTasksEnabled) {
      return this.getSnapshot();
    }

    this.attachShutdownHandlers();

    const queueNames = getAsyncTaskQueueNames();

    for (const queueName of queueNames) {
      const worker = await createAsyncTaskWorker(queueName, buildAsyncTaskQueueProcessor(queueName));
      const queueEvents = await createAsyncTaskQueueEvents(queueName);
      const projector = createAsyncTaskQueueEventsProjector({
        queueName,
        queueEvents,
      });

      worker.on("error", () => {
        // Worker error handling is projected in later phases.
      });
      queueEvents.on("error", () => {
        // QueueEvents projection lands in Phase 40-02.
      });
      projector.start();

      this.workers.set(queueName, worker);
      this.queueEvents.set(queueName, queueEvents);
      this.projectors.set(queueName, projector);
    }

    this.started = true;

    return this.getSnapshot();
  }

  async stop(signal = "manual") {
    if (this.activeSignal === signal) {
      return;
    }

    this.activeSignal = signal;

    await recordAsyncTaskWorkerShutdownRequested({
      queueNames: [...this.workers.keys()],
      signal,
    });

    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
    await Promise.all([...this.projectors.values()].map((projector) => projector.close()));
    await Promise.all([...this.queueEvents.values()].map((queueEvents) => queueEvents.close()));
    this.workers.clear();
    this.queueEvents.clear();
    this.projectors.clear();
    this.started = false;
    this.activeSignal = null;

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

export async function stopAsyncTaskWorker(signal?: string) {
  await asyncTaskWorkerRuntime.stop(signal);
}

export function getAsyncTaskWorkerRuntimeSnapshot() {
  return asyncTaskWorkerRuntime.getSnapshot();
}
