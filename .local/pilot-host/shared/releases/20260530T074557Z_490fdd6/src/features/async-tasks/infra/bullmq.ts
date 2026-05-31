import "server-only";

import { Queue, QueueEvents, Worker, type Processor } from "bullmq";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";

import {
  getBullmqEnvironmentCapability,
  getBullmqProducerConnection,
  getBullmqQueueEventsConnection,
  getBullmqWorkerConnection,
} from "./connection";

const queueInstances = new Map<string, Queue>();

export function resolveAsyncTaskQueueName(taskType: keyof typeof asyncTaskRegistry) {
  const definition = asyncTaskRegistry[taskType];

  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  return definition.reliability.queueName ?? `${definition.featureArea}-default`;
}

export function getAsyncTaskQueueNames() {
  return [...new Set(Object.keys(asyncTaskRegistry).map((taskType) => resolveAsyncTaskQueueName(taskType)))];
}

export async function getAsyncTaskQueue(taskType: keyof typeof asyncTaskRegistry) {
  const queueName = resolveAsyncTaskQueueName(taskType);
  const capability = getBullmqEnvironmentCapability();

  if (queueInstances.has(queueName)) {
    return queueInstances.get(queueName)!;
  }

  const queue = new Queue(queueName, {
    connection: await getBullmqProducerConnection(),
    prefix: capability.prefix,
  });

  queueInstances.set(queueName, queue);
  return queue;
}

export async function createAsyncTaskWorker(queueName: string, processor: Processor) {
  const capability = getBullmqEnvironmentCapability();

  return new Worker(queueName, processor, {
    connection: await getBullmqWorkerConnection(),
    prefix: capability.prefix,
  });
}

export async function createAsyncTaskQueueEvents(queueName: string) {
  const capability = getBullmqEnvironmentCapability();

  return new QueueEvents(queueName, {
    connection: await getBullmqQueueEventsConnection(),
    prefix: capability.prefix,
  });
}

export async function closeAsyncTaskQueues() {
  await Promise.all([...queueInstances.values()].map((queue) => queue.close()));
  queueInstances.clear();
}
