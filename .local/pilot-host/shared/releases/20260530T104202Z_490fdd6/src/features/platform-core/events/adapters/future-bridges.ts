import type { PlatformEventBridgeOwnership } from "@/features/platform-core/events/contracts";

export type FuturePlatformBridgeDelivery = Extract<PlatformEventBridgeOwnership["delivery"], "redis-bridge" | "websocket-bridge">;

export type FuturePlatformBridgeAdapter = {
  id: string;
  delivery: FuturePlatformBridgeDelivery;
  describeOwnership(): PlatformEventBridgeOwnership;
};

export function createFuturePlatformBridgeOwnership(delivery: FuturePlatformBridgeDelivery): PlatformEventBridgeOwnership {
  return {
    sourceOfTruth: "sqlite-platform-event-ledger",
    delivery,
    posture: "ledger-first",
    notes: [
      "Future bridge adapters are delivery-only.",
      "Redis/WebSocket cannot claim replay or canonical truth ownership.",
    ],
  };
}

export function assertFuturePlatformBridgeAdapter(adapter: FuturePlatformBridgeAdapter) {
  const ownership = adapter.describeOwnership();

  if (ownership.sourceOfTruth !== "sqlite-platform-event-ledger") {
    throw new Error("PLATFORM_EVENT_BRIDGE_TRUTH_OWNERSHIP_FORBIDDEN");
  }

  if (ownership.posture !== "ledger-first") {
    throw new Error("PLATFORM_EVENT_BRIDGE_POSTURE_FORBIDDEN");
  }

  if (ownership.delivery !== adapter.delivery) {
    throw new Error("PLATFORM_EVENT_BRIDGE_DELIVERY_MISMATCH");
  }

  return adapter;
}
