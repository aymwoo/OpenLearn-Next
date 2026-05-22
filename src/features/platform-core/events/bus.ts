import "server-only";

import type {
  PlatformEvent,
  PlatformEventPublicationPort,
  PlatformPersistedDispatchBatch,
} from "@/features/platform-core/events/contracts";
import {
  loadPlatformDispatchesByIds,
  loadPlatformEventsByIds,
  markPlatformEventDispatch,
} from "@/features/platform-core/events/ledger";
import {
  createPlatformSubscriberRegistry,
  type PlatformEventSubscriber,
} from "@/features/platform-core/events/subscribers";

type PersistedPlatformEventBusDependencies = {
  loadEvents?: typeof loadPlatformEventsByIds;
  loadDispatches?: typeof loadPlatformDispatchesByIds;
  markDispatch?: typeof markPlatformEventDispatch;
};

function eventSort(left: { attemptNumber: number; eventOrdinal: number }, right: { attemptNumber: number; eventOrdinal: number }) {
  if (left.attemptNumber !== right.attemptNumber) {
    return left.attemptNumber - right.attemptNumber;
  }

  return left.eventOrdinal - right.eventOrdinal;
}

export function createPersistedPlatformEventBus(
  dependencies: PersistedPlatformEventBusDependencies = {},
): PlatformEventPublicationPort & {
  registerSubscriber: (subscriber: PlatformEventSubscriber) => () => void;
} {
  const registry = createPlatformSubscriberRegistry();
  const loadEvents = dependencies.loadEvents ?? loadPlatformEventsByIds;
  const loadDispatches = dependencies.loadDispatches ?? loadPlatformDispatchesByIds;
  const markDispatch = dependencies.markDispatch ?? markPlatformEventDispatch;

  return {
    id: "platform-persisted-event-bus",
    ownership: {
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: [
        "Subscribers consume persisted platform events only.",
        "Delivery adapters do not replace SQLite event truth ownership.",
      ],
    },
    describeOwnership() {
      return this.ownership;
    },
    async publishPersisted(batch: PlatformPersistedDispatchBatch) {
      const [events, dispatches] = await Promise.all([
        loadEvents(batch.eventIds),
        loadDispatches(batch.dispatchIds),
      ]);
      const eventById = new Map(events.map((event) => [event.id, event]));

      const orderedDispatches = [...dispatches].sort((left, right) => {
        const leftEvent = eventById.get(left.eventId);
        const rightEvent = eventById.get(right.eventId);

        if (!leftEvent || !rightEvent) {
          return 0;
        }

        return eventSort(leftEvent, rightEvent);
      });

      for (const dispatch of orderedDispatches) {
        const persistedEvent = eventById.get(dispatch.eventId);

        if (!persistedEvent) {
          await markDispatch({
            dispatchId: dispatch.id,
            status: "failed",
            failureReason: "EVENT_ROW_NOT_FOUND",
            adapterId: this.id,
          });
          continue;
        }

        const event = {
          eventType: persistedEvent.eventType,
          category: persistedEvent.category,
          aggregateType: persistedEvent.aggregateType,
          aggregateId: persistedEvent.aggregateId,
          payload: persistedEvent.payloadSummaryJson,
        } as PlatformEvent;
        const subscribers = registry.select(event);

        if (subscribers.length === 0) {
          await markDispatch({
            dispatchId: dispatch.id,
            status: "delivered",
            adapterId: this.id,
          });
          continue;
        }

        try {
          for (const subscriber of subscribers) {
            await subscriber.handle({
              event,
              commandId: dispatch.commandId,
              attemptNumber: dispatch.attemptNumber,
              correlationId: dispatch.correlationId,
              causationId: dispatch.causationId ?? null,
              dispatchId: dispatch.id,
              eventId: persistedEvent.id,
            });
          }

          await markDispatch({
            dispatchId: dispatch.id,
            status: "delivered",
            adapterId: this.id,
          });
        } catch (error) {
          await markDispatch({
            dispatchId: dispatch.id,
            status: "failed",
            failureReason: error instanceof Error ? error.message : "SUBSCRIBER_FAILED",
            adapterId: this.id,
          });
        }
      }
    },
    subscribe(eventType, handler) {
      return registry.register({
        id: `subscription:${eventType}:${Math.random().toString(36).slice(2)}`,
        selector: eventType === "*"
          ? {}
          : { eventTypes: [eventType] },
        handle: async ({ event }) => handler(event),
      });
    },
    registerSubscriber(subscriber) {
      return registry.register(subscriber);
    },
  };
}

export const defaultPersistedPlatformEventBus = createPersistedPlatformEventBus();
