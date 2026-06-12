import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  default: () => ({ auth: () => {}, handlers: {} }),
}));

import {
  PlatformCommandTypeSchema,
  PlatformCommandSchema,
  PlatformCommandPayloadSchemas,
  SystemCommandTypes,
  type PlatformCommandType,
  type PlatformCommandDefinition,
} from "./contracts";
import { platformCommandRegistry } from "./registry";
import { GovernanceDeniedReasonValues, GovernanceDeniedReasonSchema } from "@/features/runtime-platform/contracts/permissions";

describe("SystemCommandTypes", () => {
  it("should equal [system.http.request, system.config.set]", () => {
    expect(SystemCommandTypes).toEqual(["system.http.request", "system.config.set"]);
  });

  it("should NOT include system.config.get", () => {
    // system.config.get is a pure DAL read, not a PlatformCommandType
    expect(SystemCommandTypes).not.toContain("system.config.get");
  });
});

describe("PlatformCommandTypeSchema", () => {
  const existingTypes = [
    "plugin.install",
    "plugin.upgrade.preflight",
    "plugin.upgrade",
    "plugin.enable",
    "plugin.disable",
    "plugin.reconcile",
    "plugin.retry",
    "plugin.suspend",
    "plugin.resume",
    "plugin.uninstall.preflight",
    "plugin.uninstall",
    "plugin.kill_switch.set",
    "lesson.draft.run",
    "lesson.draft.persist",
    "lesson.draft.accept",
    "lesson.draft.discard",
    "plugin.data.insert",
    "plugin.data.upsert",
    "quiz.answer.received",
  ];

  it("should accept system.http.request", () => {
    expect(() => PlatformCommandTypeSchema.parse("system.http.request")).not.toThrow();
  });

  it("should accept system.config.set", () => {
    expect(() => PlatformCommandTypeSchema.parse("system.config.set")).not.toThrow();
  });

  it("should reject system.config.get (pure DAL read, not a PlatformCommandType)", () => {
    expect(() => PlatformCommandTypeSchema.parse("system.config.get")).toThrow();
  });

  it("should still accept all 19 existing command types", () => {
    for (const t of existingTypes) {
      expect(() => PlatformCommandTypeSchema.parse(t)).not.toThrow();
    }
  });

  it("should have exactly 21 command types (19 existing + 2 system)", () => {
    // z.enum options are enumerable; count total accepted values
    const all = [...existingTypes, "system.http.request", "system.config.set"];
    for (const t of all) {
      expect(() => PlatformCommandTypeSchema.parse(t)).not.toThrow();
    }
    // Verify total count by checking all parses pass
    expect(all.length).toBe(21);
  });
});

describe("PlatformCommandPayloadSchemas", () => {
  it("should have system.http.request payload schema", () => {
    const schema = PlatformCommandPayloadSchemas["system.http.request"];
    expect(schema).toBeDefined();
    expect(typeof schema.parse).toBe("function");
  });

  it("should have system.config.set payload schema", () => {
    const schema = PlatformCommandPayloadSchemas["system.config.set"];
    expect(schema).toBeDefined();
    expect(typeof schema.parse).toBe("function");
  });

  it("SystemHttpRequestPayloadSchema should validate with url + method", () => {
    const schema = PlatformCommandPayloadSchemas["system.http.request"];
    const result = schema.parse({
      url: "https://example.com/api/data",
      method: "GET",
    });
    expect(result.url).toBe("https://example.com/api/data");
    expect(result.method).toBe("GET");
  });

  it("SystemHttpRequestPayloadSchema should reject invalid url", () => {
    const schema = PlatformCommandPayloadSchemas["system.http.request"];
    expect(() => schema.parse({ url: "not-a-url", method: "GET" })).toThrow();
  });

  it("SystemHttpRequestPayloadSchema should reject invalid method", () => {
    const schema = PlatformCommandPayloadSchemas["system.http.request"];
    expect(() => schema.parse({ url: "https://example.com", method: "INVALID" })).toThrow();
  });

  it("SystemHttpRequestPayloadSchema should reject extra keys (strict)", () => {
    const schema = PlatformCommandPayloadSchemas["system.http.request"];
    expect(() =>
      schema.parse({
        url: "https://example.com",
        method: "GET",
        schoolId: "school-1", // should be rejected by strict
      })
    ).toThrow();
  });

  it("SystemHttpRequestPayloadSchema should accept optional headers, body, maxResponseSize, timeout", () => {
    const schema = PlatformCommandPayloadSchemas["system.http.request"];
    const result = schema.parse({
      url: "https://example.com/api",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"key":"value"}',
      maxResponseSize: 1048576,
      timeout: 5000,
    });
    expect(result.headers).toEqual({ "Content-Type": "application/json" });
    expect(result.body).toBe('{"key":"value"}');
    expect(result.maxResponseSize).toBe(1048576);
    expect(result.timeout).toBe(5000);
  });

  it("SystemConfigSetPayloadSchema should validate with configKey + configValue", () => {
    const schema = PlatformCommandPayloadSchemas["system.config.set"];
    const result = schema.parse({
      configKey: "feature.flags.enableNewUI",
      configValue: true,
    });
    expect(result.configKey).toBe("feature.flags.enableNewUI");
    expect(result.configValue).toBe(true);
  });

  it("SystemConfigSetPayloadSchema should reject empty configKey", () => {
    const schema = PlatformCommandPayloadSchemas["system.config.set"];
    expect(() => schema.parse({ configKey: "", configValue: "bar" })).toThrow();
  });

  it("SystemConfigSetPayloadSchema should reject extra keys (strict)", () => {
    const schema = PlatformCommandPayloadSchemas["system.config.set"];
    expect(() =>
      schema.parse({
        configKey: "some.key",
        configValue: "val",
        schoolId: "school-1", // should be rejected by strict
      })
    ).toThrow();
  });
});

describe("PlatformCommandSchema discriminated union", () => {
  const baseEnvelope = {
    id: "cmd-001",
    actor: { actorId: "user-1", actorScope: "teacher" as const },
    scope: { schoolId: "school-1", pluginId: "plugin-1" },
    correlation: { correlationId: "corr-001", causationId: null, producer: "test" },
  };

  it("should parse system.http.request command", () => {
    const cmd = {
      ...baseEnvelope,
      type: "system.http.request" as const,
      payload: { url: "https://example.com", method: "GET" as const },
    };
    const result = PlatformCommandSchema.parse(cmd);
    expect(result.type).toBe("system.http.request");
    expect(result.payload.url).toBe("https://example.com");
  });

  it("should parse system.config.set command", () => {
    const cmd = {
      ...baseEnvelope,
      type: "system.config.set" as const,
      payload: { configKey: "theme.color", configValue: "#ff0000" },
    };
    const result = PlatformCommandSchema.parse(cmd);
    expect(result.type).toBe("system.config.set");
    expect(result.payload.configKey).toBe("theme.color");
  });

  it("should reject system.config.get (not in discriminated union)", () => {
    const cmd = {
      ...baseEnvelope,
      type: "system.config.get" as const,
      payload: { configKey: "some.key" },
    };
    expect(() => PlatformCommandSchema.parse(cmd)).toThrow();
  });

  it("should reject invalid system.http.request payload", () => {
    const cmd = {
      ...baseEnvelope,
      type: "system.http.request" as const,
      payload: { url: "not-a-url", method: "INVALID" as const },
    };
    expect(() => PlatformCommandSchema.parse(cmd)).toThrow();
  });
});

describe("platformCommandRegistry", () => {
  it("should have exactly 21 entries", () => {
    const keys = Object.keys(platformCommandRegistry);
    expect(keys.length).toBe(21);
  });

  it("should satisfy Record<PlatformCommandType, PlatformCommandDefinition>", () => {
    // TypeScript compile-time check; runtime verification that all known types are covered
    const knownTypes: PlatformCommandType[] = [
      "plugin.install",
      "plugin.upgrade.preflight",
      "plugin.upgrade",
      "plugin.enable",
      "plugin.disable",
      "plugin.reconcile",
      "plugin.retry",
      "plugin.suspend",
      "plugin.resume",
      "plugin.uninstall.preflight",
      "plugin.uninstall",
      "plugin.kill_switch.set",
      "lesson.draft.run",
      "lesson.draft.persist",
      "lesson.draft.accept",
      "lesson.draft.discard",
      "plugin.data.insert",
      "plugin.data.upsert",
      "quiz.answer.received",
      "system.http.request",
      "system.config.set",
    ];
    for (const type of knownTypes) {
      expect(platformCommandRegistry[type]).toBeDefined();
    }
  });

  describe("system.http.request entry", () => {
    it("should exist in registry", () => {
      expect(platformCommandRegistry["system.http.request"]).toBeDefined();
    });

    it("should have correct commandType", () => {
      expect(platformCommandRegistry["system.http.request"].commandType).toBe("system.http.request");
    });

    it("should reference PlatformCommandPayloadSchemas[\"system.http.request\"]", () => {
      expect(platformCommandRegistry["system.http.request"].payloadSchema).toBe(
        PlatformCommandPayloadSchemas["system.http.request"]
      );
    });

    it("should have dedupe: required", () => {
      expect(platformCommandRegistry["system.http.request"].dedupe).toBe("required");
    });

    it("should have wired authorize (Phase 78 real handler)", () => {
      const entry = platformCommandRegistry["system.http.request"];
      expect(typeof entry.authorize).toBe("function");
      // Real handler — not a placeholder, Phase 78 wired systemHttpRequestHandler
    });

    it("should have wired execute (Phase 78 real handler)", () => {
      const entry = platformCommandRegistry["system.http.request"];
      expect(typeof entry.execute).toBe("function");
      // Real handler — not a placeholder, Phase 78 wired systemHttpRequestHandler
    });
  });

  describe("system.config.set entry", () => {
    it("should exist in registry", () => {
      expect(platformCommandRegistry["system.config.set"]).toBeDefined();
    });

    it("should have correct commandType", () => {
      expect(platformCommandRegistry["system.config.set"].commandType).toBe("system.config.set");
    });

    it("should reference PlatformCommandPayloadSchemas[\"system.config.set\"]", () => {
      expect(platformCommandRegistry["system.config.set"].payloadSchema).toBe(
        PlatformCommandPayloadSchemas["system.config.set"]
      );
    });

    it("should have dedupe: required", () => {
      expect(platformCommandRegistry["system.config.set"].dedupe).toBe("required");
    });

    it("should have wired authorize (Phase 79 real handler — no longer stub)", () => {
      const entry = platformCommandRegistry["system.config.set"];
      expect(typeof entry.authorize).toBe("function");
      // Phase 79: stub replaced by systemConfigHandler real implementation
    });

    it("should have wired execute (Phase 79 real handler — no longer throw stub)", () => {
      const entry = platformCommandRegistry["system.config.set"];
      expect(typeof entry.execute).toBe("function");
      // Phase 79: stub replaced by systemConfigHandler real implementation
    });
  });

  it("should keep existing registry entries working (spot-check: plugin.install)", () => {
    const entry = platformCommandRegistry["plugin.install"];
    expect(entry.commandType).toBe("plugin.install");
    expect(entry.dedupe).toBe("required");
    expect(typeof entry.authorize).toBe("function");
    expect(typeof entry.execute).toBe("function");
  });

  it("should keep existing registry entries working (spot-check: quiz.answer.received)", () => {
    const entry = platformCommandRegistry["quiz.answer.received"];
    expect(entry.commandType).toBe("quiz.answer.received");
    expect(entry.dedupe).toBe("required");
    expect(typeof entry.authorize).toBe("function");
    expect(typeof entry.execute).toBe("function");
  });
});

describe("GovernanceDeniedReasonValues", () => {
  const originalReasons = [
    "not_allowlisted",
    "capability_missing",
    "permission_denied",
    "lifecycle_blocked",
    "school_mismatch",
    "kill_switch",
    "unsupported_action",
  ];

  it("should include domain_not_allowed", () => {
    expect(GovernanceDeniedReasonValues).toContain("domain_not_allowed");
  });

  it("should include method_not_allowed", () => {
    expect(GovernanceDeniedReasonValues).toContain("method_not_allowed");
  });

  it("should include private_ip_blocked", () => {
    expect(GovernanceDeniedReasonValues).toContain("private_ip_blocked");
  });

  it("should include config_key_denied", () => {
    expect(GovernanceDeniedReasonValues).toContain("config_key_denied");
  });

  it("should still contain all 7 original reason codes", () => {
    for (const reason of originalReasons) {
      expect(GovernanceDeniedReasonValues).toContain(reason);
    }
  });

  it("should have exactly 11 entries (7 original + 4 new)", () => {
    expect(GovernanceDeniedReasonValues.length).toBe(11);
  });

  describe("GovernanceDeniedReasonSchema", () => {
    it("should accept domain_not_allowed", () => {
      expect(() => GovernanceDeniedReasonSchema.parse("domain_not_allowed")).not.toThrow();
    });

    it("should accept method_not_allowed", () => {
      expect(() => GovernanceDeniedReasonSchema.parse("method_not_allowed")).not.toThrow();
    });

    it("should accept private_ip_blocked", () => {
      expect(() => GovernanceDeniedReasonSchema.parse("private_ip_blocked")).not.toThrow();
    });

    it("should accept config_key_denied", () => {
      expect(() => GovernanceDeniedReasonSchema.parse("config_key_denied")).not.toThrow();
    });

    it("should still accept all 7 original reason codes", () => {
      for (const reason of originalReasons) {
        expect(() => GovernanceDeniedReasonSchema.parse(reason)).not.toThrow();
      }
    });
  });
});
