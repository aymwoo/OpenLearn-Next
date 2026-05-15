import { describe, expect, it } from "vitest";

import {
  defaultRuntimeEventBusAdapter,
  runtimePlatformSeams,
  sqliteRuntimeDatabaseAdapter,
  sseRuntimeTransportAdapter,
} from "./index";

const forbiddenTokens = [
  ["USE", "POSTGRES"].join("_"),
  ["ENABLE", "REDIS"].join("_"),
  ["ENABLE", "WEBSOCKET"].join("_"),
  ["cut", "over"].join(""),
  ["switch", "Provider"].join(""),
] as const;

describe("runtime-platform seams", () => {
  it("exports only default adapters with centralized seam posture", () => {
    expect(runtimePlatformSeams.database.defaultAdapter).toBe("sqliteRuntimeDatabaseAdapter");
    expect(runtimePlatformSeams.eventBus.defaultAdapter).toBe("defaultRuntimeEventBusAdapter");
    expect(runtimePlatformSeams.transport.defaultAdapter).toBe("sseRuntimeTransportAdapter");
  });

  it("keeps database truth ownership on sqlite classroom/session writes", () => {
    const ownership = sqliteRuntimeDatabaseAdapter.describeOwnership();

    expect(ownership.persistence).toBe("sqlite");
    expect(ownership.sourceOfTruth).toBe("classroom-session-write-path");
    expect(ownership.posture).toBe("default-only");
  });

  it("keeps event-bus and transport adapters in default-only posture", () => {
    expect(defaultRuntimeEventBusAdapter.describeOwnership().posture).toBe("default-only");
    expect(defaultRuntimeEventBusAdapter.describeOwnership().delivery).toBe("in-process");
    expect(sseRuntimeTransportAdapter.describeOwnership().deliveryMode).toBe("sse");
    expect(sseRuntimeTransportAdapter.describeOwnership().sourceOfTruth).toBe("classroom-session-write-path");
  });

  it("contains no provider toggles or hidden switches in seam metadata", () => {
    const serialized = JSON.stringify({
      runtimePlatformSeams,
      database: sqliteRuntimeDatabaseAdapter.describeOwnership(),
      eventBus: defaultRuntimeEventBusAdapter.describeOwnership(),
      transport: sseRuntimeTransportAdapter.describeOwnership(),
    });

    for (const token of forbiddenTokens) {
      expect(serialized).not.toContain(token);
    }
  });
});
