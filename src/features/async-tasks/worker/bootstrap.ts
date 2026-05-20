import "server-only";

import type { QueueEvents, Worker } from "bullmq";

import {
  closeBullmqConnections,
  getBullmqEnvironmentCapability,
  getBullmqInstanceId,
} from "@/features/async-tasks/infra/connection";
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
import {
  markAsyncWorkerHeartbeatStopped,
  markAsyncWorkerHeartbeatStopping,
  upsertAsyncWorkerHeartbeat,
} from "@/features/async-tasks/infra/heartbeat";
import { enqueueDueScheduleReminderDispatches } from "@/features/schedule/reminders/server";

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
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private dueDispatchSweepInterval: ReturnType<typeof setInterval> | null = null;

  private getQueueNamesSnapshot() {
    return [...this.workers.keys()];
  }

  private clearHeartbeatInterval() {
    if (!this.heartbeatInterval) {
      return;
    }

    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  private clearDueDispatchSweepInterval() {
    if (!this.dueDispatchSweepInterval) {
      return;
    }

    clearInterval(this.dueDispatchSweepInterval);
    this.dueDispatchSweepInterval = null;
  }

  private async writeHeartbeat(status: "ready" | "stopping" | "stopped", signal?: string) {
    const queueNames = this.getQueueNamesSnapshot();

    if (status === "ready") {
      await upsertAsyncWorkerHeartbeat({
        instanceId: getBullmqInstanceId(),
        status,
        queueNames,
        detail: {
          started: this.started,
        },
      });
      return;
    }

    if (status === "stopping") {
      await markAsyncWorkerHeartbeatStopping({
        instanceId: getBullmqInstanceId(),
        queueNames,
        signal: signal ?? "manual",
        detail: {
          started: this.started,
        },
      });
      return;
    }

    await markAsyncWorkerHeartbeatStopped({
      instanceId: getBullmqInstanceId(),
      queueNames,
      signal: signal ?? "manual",
      detail: {
        started: this.started,
      },
    });
  }

  private startHeartbeatInterval() {
    this.clearHeartbeatInterval();
    this.heartbeatInterval = setInterval(() => {
      void this.writeHeartbeat("ready");
    }, 15_000);
    this.heartbeatInterval.unref?.();
  }

  private startDueDispatchSweepLoop() {
    this.clearDueDispatchSweepInterval();

    const runSweep = () => {
      void enqueueDueScheduleReminderDispatches().catch(() => {
        // Sweep errors are reflected through durable task truth once dispatch rows bind to tasks.
      });
    };

    runSweep();
    this.dueDispatchSweepInterval = setInterval(runSweep, 5_000);
    this.dueDispatchSweepInterval.unref?.();
  }

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
    await this.writeHeartbeat("ready");
    this.startHeartbeatInterval();
    this.startDueDispatchSweepLoop();

    return this.getSnapshot();
  }

  async stop(signal = "manual") {
    if (this.activeSignal === signal) {
      return;
    }

    this.activeSignal = signal;
    this.clearHeartbeatInterval();
    this.clearDueDispatchSweepInterval();
    await this.writeHeartbeat("stopping", signal);

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
    await this.writeHeartbeat("stopped", signal);

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
