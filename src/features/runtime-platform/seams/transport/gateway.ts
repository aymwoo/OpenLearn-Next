import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  transportConsumerTraces,
  transportDeliveryAttempts,
} from "@/db/schema";

import {
  RuntimeTransportConsumerTraceInputSchema,
  RuntimeTransportPublishInputSchema,
  RuntimeTransportPublishResultSchema,
  type RuntimeTransportAdapter,
  type RuntimeTransportConsumerTraceInput,
  type RuntimeTransportPublishInput,
  type RuntimeTransportPublishResult,
} from "./contract";
import { sseRuntimeTransportAdapter } from "./sse-adapter";
import { wsRuntimeTransportAdapter } from "./ws-adapter";

const transportAdapters: RuntimeTransportAdapter[] = [
  sseRuntimeTransportAdapter,
  wsRuntimeTransportAdapter,
];

function adapterSupportsEvent(
  candidate: RuntimeTransportAdapter,
  input: RuntimeTransportPublishInput,
) {
  if (!(input.channel.startsWith("classroom") || input.kind.startsWith("runtime."))) {
    return false;
  }

  if (candidate.mode === "sse") {
    return true;
  }

  if (candidate.mode === "websocket") {
    return true;
  }

  return false;
}

function summarizePayload(payload: RuntimeTransportPublishInput["payload"]) {
  return {
    keys: Object.keys(payload).slice(0, 12),
  };
}

function resolveTransportAdapter(input: RuntimeTransportPublishInput) {
  const candidates = transportAdapters.filter((candidate) =>
    adapterSupportsEvent(candidate, input),
  );

  return (
    candidates.find((candidate) => candidate.mode === "sse") ??
    candidates.find((candidate) => candidate.mode === "websocket") ??
    null
  );
}

function resolveSupplementalTransportAdapters(
  input: RuntimeTransportPublishInput,
  primaryAdapter: RuntimeTransportAdapter | null,
) {
  return transportAdapters.filter(
    (candidate) =>
      candidate.id !== primaryAdapter?.id && adapterSupportsEvent(candidate, input),
  );
}

export async function publishTransportEvent(input: RuntimeTransportPublishInput): Promise<RuntimeTransportPublishResult> {
  const event = RuntimeTransportPublishInputSchema.parse(input);
  const adapter = resolveTransportAdapter(event);
  const supplementalAdapters = resolveSupplementalTransportAdapters(event, adapter);

  const [attempt] = await db
    .insert(transportDeliveryAttempts)
    .values({
      runtimeSessionId: event.truthRef.runtimeSessionId ?? null,
      classroomSessionId: event.truthRef.classroomSessionId ?? event.sessionId,
      schoolId: event.truthRef.schoolId ?? null,
      truthRefType: event.truthRef.type,
      truthRefId: event.truthRef.id,
      channel: event.channel,
      kind: event.kind,
      adapterId: adapter?.id ?? null,
      adapterMode: adapter?.mode ?? null,
      messageId: crypto.randomUUID(),
      correlationId: event.correlationId,
      truthPersisted: event.truthPersisted,
      deliveryAttempted: Boolean(adapter),
      attemptStatus: adapter ? "pending" : "skipped",
      payloadSummaryJson: summarizePayload(event.payload),
      attemptedAt: new Date(),
    })
    .returning();

  if (!adapter) {
    return RuntimeTransportPublishResultSchema.parse({
      attemptId: attempt.id,
      adapterId: null,
      adapterMode: null,
      truthPersisted: event.truthPersisted,
      deliveryAttempted: false,
      attemptStatus: "skipped",
      failureReason: "TRANSPORT_ADAPTER_NOT_FOUND",
    });
  }

  try {
    await adapter.deliver(event);

    if (supplementalAdapters.length > 0) {
      await Promise.allSettled(
        supplementalAdapters.map((secondaryAdapter) => secondaryAdapter.deliver(event)),
      );
    }

    await db
      .update(transportDeliveryAttempts)
      .set({
        deliveryAttempted: true,
        attemptStatus: "delivered",
        deliveredAt: new Date(),
        failureReason: null,
      })
      .where(eq(transportDeliveryAttempts.id, attempt.id));

    return RuntimeTransportPublishResultSchema.parse({
      attemptId: attempt.id,
      adapterId: adapter.id,
      adapterMode: adapter.mode,
      truthPersisted: event.truthPersisted,
      deliveryAttempted: true,
      attemptStatus: "delivered",
      failureReason: null,
    });
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "TRANSPORT_DELIVERY_FAILED";

    await db
      .update(transportDeliveryAttempts)
      .set({
        deliveryAttempted: true,
        attemptStatus: "failed",
        failureReason,
        failedAt: new Date(),
      })
      .where(eq(transportDeliveryAttempts.id, attempt.id));

    return RuntimeTransportPublishResultSchema.parse({
      attemptId: attempt.id,
      adapterId: adapter.id,
      adapterMode: adapter.mode,
      truthPersisted: event.truthPersisted,
      deliveryAttempted: true,
      attemptStatus: "failed",
      failureReason,
    });
  }
}

export async function recordTransportConsumerTrace(input: RuntimeTransportConsumerTraceInput) {
  const trace = RuntimeTransportConsumerTraceInputSchema.parse(input);
  const attempt = trace.attemptId
    ? await db.query.transportDeliveryAttempts.findFirst({
        where: eq(transportDeliveryAttempts.id, trace.attemptId),
      })
    : await db.query.transportDeliveryAttempts.findFirst({
        where: and(
          eq(transportDeliveryAttempts.classroomSessionId, trace.sessionId),
          eq(transportDeliveryAttempts.correlationId, trace.correlationId),
        ),
      });

  const now = new Date();
  const [row] = await db
    .insert(transportConsumerTraces)
    .values({
      attemptId: attempt?.id ?? trace.attemptId ?? null,
      classroomSessionId: trace.sessionId,
      runtimeSessionId: attempt?.runtimeSessionId ?? null,
      correlationId: trace.correlationId,
      adapterId: trace.adapterId,
      adapterMode: trace.adapterMode,
      traceType: trace.traceType,
      status: trace.status,
      snapshotVersion: trace.snapshotVersion ?? null,
      detailJson: trace.detail,
      emittedAt: trace.status === "emitted" ? now : null,
      failedAt: trace.status === "failed" ? now : null,
      closedAt: trace.status === "closed" ? now : null,
    })
    .returning();

  return row;
}
