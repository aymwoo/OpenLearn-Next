import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  platformCommandAttempts,
  platformCommands,
  platformEventDispatches,
  platformEvents,
} from "@/db/schema";
import type {
  PlatformEvent,
  PlatformFailureAttribution,
} from "@/features/platform-core/events/contracts";

type PersistPlatformEventsInput = {
  commandId: string;
  attemptNumber: number;
  correlationId: string;
  causationId?: string | null;
  invalidationTags: string[];
  failureAttribution?: PlatformFailureAttribution | null;
  events: PlatformEvent[];
  dispatchChannel?: "in-process" | "redis-bridge" | "websocket-bridge";
};

type MarkPlatformEventDispatchInput = {
  dispatchId: string;
  status: "pending" | "delivered" | "failed";
  failureReason?: string | null;
  adapterId?: string | null;
};

export type PersistedPlatformEventRecord = typeof platformEvents.$inferSelect;
export type PersistedPlatformEventDispatchRecord = typeof platformEventDispatches.$inferSelect;

function toEventInsert(input: PersistPlatformEventsInput) {
  return input.events.map((event, index) => ({
    commandId: input.commandId,
    attemptNumber: input.attemptNumber,
    eventOrdinal: index + 1,
    correlationId: input.correlationId,
    causationId: input.causationId ?? null,
    eventType: event.eventType,
    category: event.category,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payloadSummaryJson: event.payload,
  }));
}

export async function appendPlatformEvents(input: PersistPlatformEventsInput): Promise<{
  events: PersistedPlatformEventRecord[];
  dispatches: PersistedPlatformEventDispatchRecord[];
}> {
  const insertedEvents = await db.insert(platformEvents).values(toEventInsert(input)).returning();

  const dispatches = insertedEvents.length
    ? await db.insert(platformEventDispatches).values(
        insertedEvents.map((event) => ({
          eventId: event.id,
          commandId: input.commandId,
          attemptNumber: input.attemptNumber,
          correlationId: input.correlationId,
          causationId: input.causationId ?? null,
          dispatchChannel: input.dispatchChannel ?? "in-process",
          dispatchStatus: "pending" as const,
        })),
      ).returning()
    : [];

  await db.update(platformCommands).set({
    invalidationTagsJson: input.invalidationTags,
    failureAttributionJson: input.failureAttribution ?? null,
    updatedAt: new Date(),
  }).where(eq(platformCommands.id, input.commandId));

  await db.update(platformCommandAttempts).set({
    completedAt: new Date(),
  }).where(and(
    eq(platformCommandAttempts.commandId, input.commandId),
    eq(platformCommandAttempts.attemptNumber, input.attemptNumber),
  ));

  return {
    events: insertedEvents,
    dispatches,
  };
}

export async function loadPlatformEventsByCommand(commandId: string) {
  return db.query.platformEvents.findMany({
    where: eq(platformEvents.commandId, commandId),
  });
}

export async function loadPlatformEventById(eventId: string) {
  return db.query.platformEvents.findFirst({
    where: eq(platformEvents.id, eventId),
  });
}

export async function loadPlatformEventsByIds(eventIds: string[]) {
  if (eventIds.length === 0) {
    return [];
  }

  return db.query.platformEvents.findMany({
    where: inArray(platformEvents.id, eventIds),
  });
}

export async function allocatePlatformEventDispatches(input: {
  eventIds: string[];
  commandId: string;
  attemptNumber: number;
  correlationId: string;
  causationId?: string | null;
  dispatchChannel?: "in-process" | "redis-bridge" | "websocket-bridge";
}) {
  if (input.eventIds.length === 0) {
    return [];
  }

  return db.insert(platformEventDispatches).values(
    input.eventIds.map((eventId) => ({
      eventId,
      commandId: input.commandId,
      attemptNumber: input.attemptNumber,
      correlationId: input.correlationId,
      causationId: input.causationId ?? null,
      dispatchChannel: input.dispatchChannel ?? "in-process",
      dispatchStatus: "pending" as const,
    })),
  ).returning();
}

export async function markPlatformEventDispatch(input: MarkPlatformEventDispatchInput) {
  await db.update(platformEventDispatches).set({
    dispatchStatus: input.status,
    adapterId: input.adapterId ?? null,
    failureReason: input.status === "failed" ? input.failureReason ?? "DISPATCH_FAILED" : null,
    deliveredAt: input.status === "delivered" ? new Date() : null,
    failedAt: input.status === "failed" ? new Date() : null,
  }).where(eq(platformEventDispatches.id, input.dispatchId));
}

export async function loadPlatformDispatchesByCommand(commandId: string) {
  return db.query.platformEventDispatches.findMany({
    where: eq(platformEventDispatches.commandId, commandId),
  });
}

export async function loadPlatformDispatchesByIds(dispatchIds: string[]) {
  if (dispatchIds.length === 0) {
    return [];
  }

  return db.query.platformEventDispatches.findMany({
    where: inArray(platformEventDispatches.id, dispatchIds),
  });
}
