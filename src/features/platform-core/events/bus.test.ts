import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPersistedPlatformEventBus } from "./bus";

describe("persisted platform event bus", () => {
  it("loads persisted events and dispatches before notifying subscribers", async () => {
    const loadEvents = vi.fn(async () => [
      {
        id: "event-1",
        commandId: "command-1",
        attemptNumber: 1,
        eventOrdinal: 1,
        correlationId: "corr-1",
        causationId: null,
        eventType: "platform.command.succeeded",
        category: "outcome" as const,
        aggregateType: "plugin",
        aggregateId: "plugin-1",
        payloadSummaryJson: {
          commandType: "plugin.enable",
          invalidationTags: ["plugin:registry"],
          resultSummary: { ok: true },
        },
        createdAt: new Date(),
      },
    ]);
    const loadDispatches = vi.fn(async () => [
      {
        id: "dispatch-1",
        eventId: "event-1",
        commandId: "command-1",
        attemptNumber: 1,
        correlationId: "corr-1",
        causationId: null,
        dispatchChannel: "in-process" as const,
        dispatchStatus: "pending" as const,
        adapterId: null,
        failureReason: null,
        createdAt: new Date(),
        deliveredAt: null,
        failedAt: null,
      },
    ]);
    const markDispatch = vi.fn(async () => undefined);
    const bus = createPersistedPlatformEventBus({
      loadEvents,
      loadDispatches,
      markDispatch,
    });
    const handler = vi.fn(async () => undefined);

    bus.registerSubscriber({
      id: "outcome-subscriber",
      selector: { categories: ["outcome"] },
      handle: handler,
    });

    await bus.publishPersisted({
      commandId: "command-1",
      attemptNumber: 1,
      eventIds: ["event-1"],
      dispatchIds: ["dispatch-1"],
    });

    expect(loadEvents).toHaveBeenCalledWith(["event-1"]);
    expect(loadDispatches).toHaveBeenCalledWith(["dispatch-1"]);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      commandId: "command-1",
      dispatchId: "dispatch-1",
      event: expect.objectContaining({
        eventType: "platform.command.succeeded",
      }),
    }));
    expect(markDispatch).toHaveBeenCalledWith({
      dispatchId: "dispatch-1",
      status: "delivered",
      adapterId: "platform-persisted-event-bus",
    });
  });

  it("filters subscribers by selector without runtime topics", async () => {
    const bus = createPersistedPlatformEventBus({
      loadEvents: async () => [
        {
          id: "event-1",
          commandId: "command-1",
          attemptNumber: 1,
          eventOrdinal: 1,
          correlationId: "corr-1",
          causationId: null,
          eventType: "plugin.lifecycle.changed",
          category: "domain" as const,
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payloadSummaryJson: {
            pluginId: "plugin-1",
            fromState: "installed",
            toState: "enabled",
            reasonCode: "enabled",
            transitionCounter: 1,
          },
          createdAt: new Date(),
        },
      ],
      loadDispatches: async () => [
        {
          id: "dispatch-1",
          eventId: "event-1",
          commandId: "command-1",
          attemptNumber: 1,
          correlationId: "corr-1",
          causationId: null,
          dispatchChannel: "in-process" as const,
          dispatchStatus: "pending" as const,
          adapterId: null,
          failureReason: null,
          createdAt: new Date(),
          deliveredAt: null,
          failedAt: null,
        },
      ],
      markDispatch: async () => undefined,
    });
    const outcomeHandler = vi.fn(async () => undefined);
    const domainHandler = vi.fn(async () => undefined);

    bus.registerSubscriber({
      id: "outcome-only",
      selector: { categories: ["outcome"] },
      handle: outcomeHandler,
    });
    bus.registerSubscriber({
      id: "domain-only",
      selector: { eventTypes: ["plugin.lifecycle.changed"] },
      handle: domainHandler,
    });

    await bus.publishPersisted({
      commandId: "command-1",
      attemptNumber: 1,
      eventIds: ["event-1"],
      dispatchIds: ["dispatch-1"],
    });

    expect(outcomeHandler).not.toHaveBeenCalled();
    expect(domainHandler).toHaveBeenCalledTimes(1);
  });

  it("marks dispatch failure when one subscriber throws", async () => {
    const markDispatch = vi.fn(async () => undefined);
    const bus = createPersistedPlatformEventBus({
      loadEvents: async () => [
        {
          id: "event-1",
          commandId: "command-1",
          attemptNumber: 1,
          eventOrdinal: 1,
          correlationId: "corr-1",
          causationId: null,
          eventType: "platform.command.succeeded",
          category: "outcome" as const,
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payloadSummaryJson: {
            commandType: "plugin.enable",
            invalidationTags: [],
            resultSummary: { ok: true },
          },
          createdAt: new Date(),
        },
      ],
      loadDispatches: async () => [
        {
          id: "dispatch-1",
          eventId: "event-1",
          commandId: "command-1",
          attemptNumber: 1,
          correlationId: "corr-1",
          causationId: null,
          dispatchChannel: "in-process" as const,
          dispatchStatus: "pending" as const,
          adapterId: null,
          failureReason: null,
          createdAt: new Date(),
          deliveredAt: null,
          failedAt: null,
        },
      ],
      markDispatch,
    });

    bus.registerSubscriber({
      id: "broken",
      selector: { categories: ["outcome"] },
      handle: async () => {
        throw new Error("SUBSCRIBER_DOWN");
      },
    });

    await bus.publishPersisted({
      commandId: "command-1",
      attemptNumber: 1,
      eventIds: ["event-1"],
      dispatchIds: ["dispatch-1"],
    });

    expect(markDispatch).toHaveBeenCalledWith({
      dispatchId: "dispatch-1",
      status: "failed",
      failureReason: "SUBSCRIBER_DOWN",
      adapterId: "platform-persisted-event-bus",
    });
  });
});
