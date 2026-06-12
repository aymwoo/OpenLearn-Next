import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Use vi.hoisted to make mocks available to the vi.mock factory (which is hoisted)
const { mockValues, mockInsert } = vi.hoisted(() => {
  const mv = vi.fn().mockResolvedValue(undefined);
  const mi = vi.fn(() => ({ values: mv }));
  return { mockValues: mv, mockInsert: mi };
});

vi.mock("@/db", () => ({
  db: {
    insert: mockInsert,
  },
}));

vi.mock("@/db/schema", () => ({
  governanceAudits: {} as never,
}));

import { writeSystemCommandAudit } from "./audit";
import { governanceAudits } from "@/db/schema";

describe("writeSystemCommandAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes audit record with decision=allowed and action=system.http.request", async () => {
    const input = {
      pluginId: "plugin-123",
      schoolId: "school-456",
      commandId: "cmd-789",
      actorId: "actor-001",
      actorScope: "plugin",
      lifecycleState: "ready",
      correlationId: "corr-abc",
      decision: "allowed" as const,
      payloadJson: { url: "https://api.example.com/data", method: "GET", domain: "api.example.com" },
      commandType: "system.http.request" as const,
    };

    await writeSystemCommandAudit(input);

    // Verify db.insert was called with governanceAudits table
    expect(mockInsert).toHaveBeenCalledWith(governanceAudits);

    // Verify .values() was called with correct fields
    expect(mockValues).toHaveBeenCalledTimes(1);
    const valuesArg = mockValues.mock.calls[0]![0];

    expect(valuesArg.targetType).toBe("plugin");
    expect(valuesArg.targetId).toBe("plugin-123");
    expect(valuesArg.pluginId).toBe("plugin-123");
    expect(valuesArg.schoolId).toBe("school-456");
    expect(valuesArg.commandId).toBe("cmd-789");
    expect(valuesArg.action).toBe("system.http.request");
    expect(valuesArg.decision).toBe("allowed");
    expect(valuesArg.reasonCode).toBeNull();
    expect(valuesArg.actorId).toBe("actor-001");
    expect(valuesArg.actorScope).toBe("plugin");
    expect(valuesArg.lifecycleState).toBe("ready");
    expect(valuesArg.killSwitchEnabled).toBe(false);
    expect(valuesArg.requestedCapabilitiesJson).toEqual([]);
    expect(valuesArg.grantedCapabilitiesJson).toEqual([]);
    expect(valuesArg.requiredPermission).toBeNull();
    expect(valuesArg.correlationId).toBe("corr-abc");
    expect(valuesArg.payloadJson).toEqual({
      url: "https://api.example.com/data",
      method: "GET",
      domain: "api.example.com",
    });
  });

  it("writes audit record with decision=denied and reasonCode=domain_not_allowed", async () => {
    const input = {
      pluginId: "plugin-123",
      schoolId: "school-456",
      commandId: null,
      actorId: "actor-001",
      actorScope: "system",
      lifecycleState: "ready",
      correlationId: "corr-def",
      decision: "denied" as const,
      reasonCode: "domain_not_allowed",
      payloadJson: { url: "https://evil.com/data", method: "POST", domain: "evil.com" },
      commandType: "system.http.request" as const,
    };

    await writeSystemCommandAudit(input);

    const valuesArg = mockValues.mock.calls[0]![0];

    expect(valuesArg.decision).toBe("denied");
    expect(valuesArg.reasonCode).toBe("domain_not_allowed");
    expect(valuesArg.action).toBe("system.http.request");
    expect(valuesArg.commandId).toBeNull();
    expect(valuesArg.payloadJson).toEqual({
      url: "https://evil.com/data",
      method: "POST",
      domain: "evil.com",
    });
  });

  it("handles null pluginId correctly", async () => {
    const input = {
      pluginId: null,
      schoolId: "school-456",
      commandId: null,
      actorId: "actor-001",
      actorScope: "system" as const,
      lifecycleState: "ready",
      correlationId: "corr-null",
      decision: "denied" as const,
      reasonCode: "not_allowlisted",
      payloadJson: { url: "", method: "GET", domain: "" },
      commandType: "system.http.request" as const,
    };

    await writeSystemCommandAudit(input);

    const valuesArg = mockValues.mock.calls[0]![0];

    expect(valuesArg.targetId).toBe("");
    expect(valuesArg.pluginId).toBeNull();
  });
});
