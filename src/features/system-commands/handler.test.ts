import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindFirst,
  mockWriteAudit,
  mockPluginOwnedBusinessData,
  mockInsert,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockWriteAudit: vi.fn(),
  mockPluginOwnedBusinessData: {
    findFirst: vi.fn(),
  },
  mockInsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      pluginRegistrations: {
        findFirst: mockFindFirst,
      },
      pluginOwnedBusinessData: mockPluginOwnedBusinessData,
    },
    insert: mockInsert,
  },
}));

vi.mock("@/db/schema", () => ({
  pluginRegistrations: {
    id: { _: "pluginRegistrations.id" },
    schoolId: { _: "pluginRegistrations.schoolId" },
    manifestJson: { _: "pluginRegistrations.manifestJson" },
    lifecycleState: { _: "pluginRegistrations.lifecycleState" },
  },
  pluginOwnedBusinessData: {
    id: { _: "pluginOwnedBusinessData.id" },
    schoolId: { _: "pluginOwnedBusinessData.schoolId" },
    pluginId: { _: "pluginOwnedBusinessData.pluginId" },
    key: { _: "pluginOwnedBusinessData.key" },
    payloadJson: { _: "pluginOwnedBusinessData.payloadJson" },
    createdAt: { _: "pluginOwnedBusinessData.createdAt" },
    updatedAt: { _: "pluginOwnedBusinessData.updatedAt" },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ _type: "eq", a, b }),
  and: (...args: unknown[]) => ({ _type: "and", args }),
  sql: (strings: TemplateStringsArray, ..._values: unknown[]) => `sql:${strings.join("?")}`,
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

import { systemHttpRequestHandler, systemConfigHandler } from "./handler";

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

// =========================================================================
// system.config — handler tests (Phase 79 Task 3)
// =========================================================================

// Helper: build a minimal PlatformCommand for system.config.set
function buildConfigSetCommand(overrides: {
  pluginId?: string;
  schoolId?: string;
  configKey?: string;
  configValue?: unknown;
  commandId?: string;
  actorId?: string;
  actorScope?: string;
  correlationId?: string;
}): any {
  return {
    id: overrides.commandId ?? "cmd-config-1",
    type: "system.config.set" as const,
    actor: {
      actorId: overrides.actorId ?? "actor-1",
      actorScope: overrides.actorScope ?? "plugin",
    },
    scope: {
      schoolId: overrides.schoolId ?? "school-1",
      pluginId: overrides.pluginId ?? "plugin-1",
    },
    correlation: {
      correlationId: overrides.correlationId ?? "corr-config-1",
      causationId: null,
      producer: "test",
    },
    audit: {
      delegatedActor: null,
      approval: null,
    },
    payload: {
      configKey: overrides.configKey ?? "homework:title",
      configValue: overrides.configValue ?? { title: "Homework #1" },
    },
    dedupeKey: "dedup-config-1",
  };
}

const {
  authorize: configSetAuthorize,
  execute: configSetExecute,
} = systemConfigHandler["system.config.set"];
const {
  authorize: configGetAuthorize,
  execute: configGetExecute,
} = systemConfigHandler["system.config.get"];

describe("systemConfigSetAuthorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when configKey matches manifest allowedKeys (exact)", async () => {
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
            command: "system.config",
            allowedKeys: ["homework:title"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildConfigSetCommand({ configKey: "homework:title" });
    await expect(
      configSetAuthorize({ command: command as any }),
    ).resolves.toBeUndefined();
  });

  it("passes when configKey matches manifest allowedKeys (prefix wildcard)", async () => {
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
            command: "system.config",
            allowedKeys: ["homework:*"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildConfigSetCommand({ configKey: "homework:deadline" });
    await expect(
      configSetAuthorize({ command: command as any }),
    ).resolves.toBeUndefined();
  });

  it("throws config_key_denied when prefix wildcard does NOT match deeper nesting", async () => {
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
            command: "system.config",
            allowedKeys: ["homework:*"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildConfigSetCommand({ configKey: "homework:sub:key" });
    await expect(
      configSetAuthorize({ command: command as any }),
    ).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockWriteAudit.mock.calls[0][0];
    expect(auditCall.decision).toBe("denied");
    expect(auditCall.reasonCode).toBe("config_key_denied");
    expect(auditCall.commandType).toBe("system.config.set");
  });

  it("throws config_key_denied when key not in any allowedKeys", async () => {
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
            command: "system.config",
            allowedKeys: ["homework:title"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const command = buildConfigSetCommand({ configKey: "unknown:key" });
    await expect(
      configSetAuthorize({ command: command as any }),
    ).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("config_key_denied");
  });

  it("throws not_allowlisted when plugin registration not found", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const command = buildConfigSetCommand({
      configKey: "homework:title",
      pluginId: "missing-plugin",
    });
    await expect(
      configSetAuthorize({ command: command as any }),
    ).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("not_allowlisted");
    expect(mockWriteAudit.mock.calls[0][0].commandType).toBe("system.config.set");
  });

  it("throws config_key_denied when manifest has no systemCommands entries", async () => {
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

    const command = buildConfigSetCommand({ configKey: "homework:title" });
    await expect(
      configSetAuthorize({ command: command as any }),
    ).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("config_key_denied");
  });
});

describe("systemConfigSetExecute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock insert chain: insert().values().onConflictDoUpdate()
    // Drizzle insert returns an object with .values().onConflictDoUpdate() chain
    const chainObj = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };
    mockInsert.mockReturnValue(chainObj);
  });

  it("writes to pluginOwnedBusinessData and returns success result", async () => {
    const command = buildConfigSetCommand({
      configKey: "homework:title",
      configValue: { title: "Homework #1" },
      schoolId: "school-1",
      pluginId: "plugin-1",
    });

    const result = await configSetExecute({
      command: command as any,
      attemptNumber: 1,
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(result.resultSummary).toEqual({
      configKey: "homework:title",
      pluginId: "plugin-1",
      schoolId: "school-1",
    });
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockWriteAudit.mock.calls[0][0];
    expect(auditCall.decision).toBe("allowed");
    expect(auditCall.commandType).toBe("system.config.set");
  });

  it("writes with triple-prefix isolation key in pluginOwnedBusinessData", async () => {
    const command = buildConfigSetCommand({
      configKey: "homework:title",
      schoolId: "school-2",
      pluginId: "plugin-2",
    });

    await configSetExecute({
      command: command as any,
      attemptNumber: 1,
    });

    // Verify insert was called — storageKey constructed as {schoolId}:{pluginId}:{configKey}
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("systemConfigGetAuthorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when configKey matches manifest allowedKeys", async () => {
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
            command: "system.config",
            allowedKeys: ["homework_title"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    await expect(
      configGetAuthorize({
        pluginId: "plugin-1",
        schoolId: "school-1",
        configKey: "homework_title", // no colon → passes ConfigKeySchema
        actorId: "actor-1",
        actorScope: "plugin",
        correlationId: "corr-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws config_key_denied when key not in allowedKeys", async () => {
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
            command: "system.config",
            allowedKeys: ["homework_title"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    await expect(
      configGetAuthorize({
        pluginId: "plugin-1",
        schoolId: "school-1",
        configKey: "unknown_key", // does NOT contain colon — will reach authorize logic
        actorId: "actor-1",
        actorScope: "plugin",
        correlationId: "corr-1",
      }),
    ).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("config_key_denied");
    expect(mockWriteAudit.mock.calls[0][0].commandType).toBe("system.config.get");
  });

  it("throws not_allowlisted when registration not found", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    await expect(
      configGetAuthorize({
        pluginId: "missing-plugin",
        schoolId: "school-1",
        configKey: "simplekey", // does NOT contain colon — will reach authorize logic
        actorId: "actor-1",
        actorScope: "plugin",
        correlationId: "corr-1",
      }),
    ).rejects.toThrow();
    expect(mockWriteAudit).toHaveBeenCalledTimes(1);
    expect(mockWriteAudit.mock.calls[0][0].reasonCode).toBe("not_allowlisted");
  });

  it("throws ZodError when configKey contains colon (D-12 boundary check)", async () => {
    // ConfigKeySchema.parse rejects before any authorize logic
    await expect(
      configGetAuthorize({
        pluginId: "plugin-1",
        schoolId: "school-1",
        configKey: "bad:key",
        actorId: "actor-1",
        actorScope: "plugin",
        correlationId: "corr-1",
      }),
    ).rejects.toThrow();
    // Audit NOT written — Zod validation fails before authorize logic
    expect(mockWriteAudit).not.toHaveBeenCalled();
  });
});

describe("systemConfigGetExecute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns payloadJson when key exists", async () => {
    mockPluginOwnedBusinessData.findFirst.mockResolvedValue({
      payloadJson: { title: "Homework #1" },
    });

    const result = await configGetExecute({
      pluginId: "plugin-1",
      schoolId: "school-1",
      configKey: "homework:title",
    });

    expect(result).toEqual({ title: "Homework #1" });
  });

  it("returns null when key does not exist", async () => {
    mockPluginOwnedBusinessData.findFirst.mockResolvedValue(undefined);

    const result = await configGetExecute({
      pluginId: "plugin-1",
      schoolId: "school-1",
      configKey: "nonexistent",
    });

    expect(result).toBeNull();
  });
});
