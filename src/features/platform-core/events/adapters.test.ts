import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultInProcessPlatformEventAdapter } from "./adapters/in-process";
import {
  assertFuturePlatformBridgeAdapter,
  createFuturePlatformBridgeOwnership,
} from "./adapters/future-bridges";

describe("platform event adapters", () => {
  it("declares in-process delivery as secondary to sqlite event truth", () => {
    expect(defaultInProcessPlatformEventAdapter.describeOwnership()).toEqual({
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: expect.any(Array),
    });
  });

  it("accepts future redis and websocket bridge contracts only when truth stays in sqlite", () => {
    expect(() =>
      assertFuturePlatformBridgeAdapter({
        id: "redis-bridge",
        delivery: "redis-bridge",
        describeOwnership: () => createFuturePlatformBridgeOwnership("redis-bridge"),
      }),
    ).not.toThrow();

    expect(() =>
      assertFuturePlatformBridgeAdapter({
        id: "websocket-bridge",
        delivery: "websocket-bridge",
        describeOwnership: () => ({
          sourceOfTruth: "sqlite-platform-event-ledger",
          delivery: "websocket-bridge",
          posture: "ledger-first",
          notes: [],
        }),
      }),
    ).not.toThrow();
  });

  it("rejects future bridge adapters that try to claim non-ledger ownership", () => {
    expect(() =>
      assertFuturePlatformBridgeAdapter({
        id: "invalid-redis",
        delivery: "redis-bridge",
        describeOwnership: () => ({
          sourceOfTruth: "sqlite-platform-event-ledger",
          delivery: "redis-bridge",
          posture: "default-only" as never,
          notes: [],
        }),
      }),
    ).toThrow("PLATFORM_EVENT_BRIDGE_POSTURE_FORBIDDEN");
  });
});
