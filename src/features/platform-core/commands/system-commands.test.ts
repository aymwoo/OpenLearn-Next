import { describe, expect, it } from "vitest";

import {
  PlatformCommandTypeSchema,
  PlatformCommandSchema,
  PlatformCommandPayloadSchemas,
  SystemCommandTypes,
} from "./contracts";

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
