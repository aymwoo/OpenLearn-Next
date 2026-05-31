import type { PlatformEvent } from "@/features/platform-core/events/contracts";

export type PlatformSubscriberContext = {
  event: PlatformEvent;
  commandId: string;
  attemptNumber: number;
  correlationId: string;
  causationId: string | null;
  dispatchId: string;
  eventId: string;
};

export type PlatformEventSelector = {
  eventTypes?: Array<PlatformEvent["eventType"]>;
  categories?: Array<PlatformEvent["category"]>;
  aggregateTypes?: Array<PlatformEvent["aggregateType"]>;
};

export type PlatformEventSubscriber = {
  id: string;
  selector: PlatformEventSelector;
  handle: (context: PlatformSubscriberContext) => Promise<void>;
};

export function matchesPlatformEventSelector(event: PlatformEvent, selector: PlatformEventSelector) {
  if (selector.eventTypes && !selector.eventTypes.includes(event.eventType)) {
    return false;
  }

  if (selector.categories && !selector.categories.includes(event.category)) {
    return false;
  }

  if (selector.aggregateTypes && !selector.aggregateTypes.includes(event.aggregateType)) {
    return false;
  }

  return true;
}

export function createPlatformSubscriberRegistry() {
  const subscribers = new Map<string, PlatformEventSubscriber>();

  return {
    register(subscriber: PlatformEventSubscriber) {
      subscribers.set(subscriber.id, subscriber);

      return () => {
        subscribers.delete(subscriber.id);
      };
    },
    list() {
      return [...subscribers.values()];
    },
    select(event: PlatformEvent) {
      return [...subscribers.values()].filter((subscriber) => matchesPlatformEventSelector(event, subscriber.selector));
    },
  };
}

export function selectOutcomeEvents(): PlatformEventSelector {
  return {
    categories: ["outcome"],
  };
}

export function selectDomainEvents(...eventTypes: Extract<PlatformEvent["eventType"], "plugin.installed" | "plugin.lifecycle.changed" | "plugin.kill_switch.changed">[]): PlatformEventSelector {
  return {
    categories: ["domain"],
    eventTypes,
  };
}
