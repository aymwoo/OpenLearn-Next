import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockWriteAudit } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockWriteAudit: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      pluginRegistrations: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

vi.mock("@/db/schema", () => ({
  pluginRegistrations: {
    id: { _: "pluginRegistrations.id" },
    schoolId: { _: "pluginRegistrations.schoolId" },
    manifestJson: { _: "pluginRegistrations.manifestJson" },
    lifecycleState: { _: "pluginRegistrations.lifecycleState" },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ _type: "eq", a, b }),
  and: (...args: unknown[]) => ({ _type: "and", args }),
}));

vi.mock("./ssrf-guard", () => ({
  validateUrl: (rawUrl: string) => {
    if (!rawUrl) throw new Error("SSRF_INVALID_URL");
    return new URL(rawUrl);
  },
  createPinnedAgent: () => ({ closed: false }),
  MAX_REDIRECTS: 5,
  isHostnameRawIP: () => false,
  isPrivateIP: () => false,
}));

vi.mock("./audit", () => ({
  writeSystemCommandAudit: mockWriteAudit,
}));

import { systemHttpRequestHandler } from "./handler";

// Helper: build a minimal PlatformCommand for system.http.request
function buildCommand(overrides: {
  pluginId?: string;
  schoolId?: string;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  commandId?: string;
  actorId?: string;
  actorScope?: string;
  correlationId?: string;
}): any {
  return {
    id: overrides.commandId ?? "cmd-test-1",
    type: "system.http.request" as const,
    actor: {
      actorId: overrides.actorId ?? "actor-1",
      actorScope: overrides.actorScope ?? "plugin",
    },
    scope: {
      schoolId: overrides.schoolId ?? "school-1",
      pluginId: overrides.pluginId ?? "plugin-1",
    },
    correlation: {
      correlationId: overrides.correlationId ?? "corr-1",
      causationId: null,
      producer: "test",
    },
    audit: {
      delegatedActor: null,
      approval: null,
    },
    payload: {
      url: overrides.url ?? "https://api.example.com/data",
      method: overrides.method ?? "GET",
      headers: overrides.headers,
      body: overrides.body,
    },
    dedupeKey: "dedup-1",
  };
}

const authorize = systemHttpRequestHandler["system.http.request"].authorize;

describe("authorize — manifest whitelist validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when url domain and method match manifest allowedDomains+allowedMethods", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["api.example.com"],
            allowedMethods: ["GET", "POST"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://api.example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    const result = await authorize({ command: command as any });
    expect(result).toBeDefined();
    expect(result.command).toBe("system.http.request");
    expect(result.allowedDomains).toEqual(["api.example.com"]);
    expect(result.allowedMethods).toEqual(["GET", "POST"]);
  });

  it("throws domain_not_allowed when url domain not in manifest allowedDomains", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["api.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://evil.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    // Audit written before throw
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockWriteAudit.mock.calls[0][0];
    expect(auditCall.decision).toBe("denied");
    expect(auditCall.reasonCode).toBe("domain_not_allowed");
  });

  it("throws method_not_allowed when domain matches but method does not", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["api.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://api.example.com/data",
      method: "POST",
      pluginId: "plugin-1",
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockWriteAudit.mock.calls[0][0];
    expect(auditCall.decision).toBe("denied");
    expect(auditCall.reasonCode).toBe("method_not_allowed");
  });

  it("wildcard *.example.com matches api.example.com", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["*.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://api.example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    const result = await authorize({ command: command as any });
    expect(result).toBeDefined();
  });

  it("wildcard *.example.com does NOT match a.b.example.com (D-06)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["*.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://a.b.example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("domain_not_allowed");
  });

  it("wildcard *.example.com does NOT match bare example.com (D-06)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["*.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("domain_not_allowed");
  });

  it("throws not_allowlisted when plugin has no systemCommands in manifest", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        // no systemCommands
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://api.example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("not_allowlisted");
  });

  it("throws not_allowlisted when systemCommands array is empty", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://api.example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("not_allowlisted");
  });

  it("throws when plugin registration not found", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const command = buildCommand({ pluginId: "nonexistent" });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
  });

  it("audit record written BEFORE throw on deny (audit-then-throw)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["allowed.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://evil.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    // Verify audit is called before the error is thrown
    let auditCalled = false;
    mockWriteAudit.mockImplementation(() => {
      auditCalled = true;
      return Promise.resolve();
    });

    await expect(authorize({ command: command as any })).rejects.toThrow();
    expect(auditCalled).toBe(true);
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
  });

  it("supports exact domain matching (no wildcard)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["api.example.com", "cdn.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://cdn.example.com/file",
      method: "GET",
      pluginId: "plugin-1",
    });

    const result = await authorize({ command: command as any });
    expect(result).toBeDefined();
    expect(result.allowedDomains).toContain("cdn.example.com");
  });

  it("first-match-wins short-circuits: first entry matches, second never checked", async () => {
    mockFindFirst.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "test-manifest",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: [],
        actions: [],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["*.example.com"],
            allowedMethods: ["GET"],
          },
          {
            command: "system.http.request",
            allowedDomains: ["should-not-match.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildCommand({
      url: "https://api.example.com/data",
      method: "GET",
      pluginId: "plugin-1",
    });

    const result = await authorize({ command: command as any });
    // Should match the first entry (wildcard), not the second
    expect(result.allowedDomains).toEqual(["*.example.com"]);
  });
});
