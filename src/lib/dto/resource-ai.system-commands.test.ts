/**
 * Comprehensive vitest assertions for PluginManifestSchema systemCommands extension.
 *
 * Phase 77-01: Extend PluginManifestSchema with .optional() systemCommands discriminated union.
 * Covers: SystemCommandHttpRequestSchema, SystemCommandConfigSchema, PluginManifestSchema
 *   backward compatibility, positive/negative/manifest-parse assertions.
 */

import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  PluginManifestSchema,
  SystemCommandHttpRequestSchema,
  SystemCommandConfigSchema,
  SystemCommandDiscriminatedSchema,
} from "@/lib/dto/resource-ai";
import {
  buildExternalQuizManifest,
  buildExternalHomeworkManifest,
  EXTERNAL_MARKETPLACE_CATALOG,
} from "@/lib/plugins/external-catalog";

// ---------------------------------------------------------------------------
// Task 1: SystemCommandHttpRequestSchema + SystemCommandConfigSchema tests
// ---------------------------------------------------------------------------

describe("SystemCommandHttpRequestSchema (standalone)", () => {
  it("parses valid http.request with multiple domains and methods", () => {
    const result = SystemCommandHttpRequestSchema.parse({
      allowedDomains: ["api.example.com", "*.github.com"],
      allowedMethods: ["GET", "POST"],
    });
    expect(result.allowedDomains).toEqual(["api.example.com", "*.github.com"]);
    expect(result.allowedMethods).toEqual(["GET", "POST"]);
  });

  it("parses http.request with single wildcard domain", () => {
    const result = SystemCommandHttpRequestSchema.parse({
      allowedDomains: ["*.my-service.io"],
      allowedMethods: ["POST"],
    });
    expect(result.allowedDomains).toEqual(["*.my-service.io"]);
    expect(result.allowedMethods).toEqual(["POST"]);
  });

  it("parses with optional maxResponseSize and defaultTimeout", () => {
    const result = SystemCommandHttpRequestSchema.parse({
      allowedDomains: ["api.example.com"],
      allowedMethods: ["GET"],
      maxResponseSize: 1048576,
      defaultTimeout: 5000,
    });
    expect(result.maxResponseSize).toBe(1048576);
    expect(result.defaultTimeout).toBe(5000);
  });

  it("rejects empty allowedDomains with SYSTEM_COMMAND_DOMAIN_INVALID", () => {
    expect(() =>
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: [],
        allowedMethods: ["GET"],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: [],
        allowedMethods: ["GET"],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_DOMAIN_INVALID"))).toBe(true);
    }
  });

  it("rejects invalid domain 'not a domain!!!' with SYSTEM_COMMAND_DOMAIN_INVALID", () => {
    expect(() =>
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: ["not a domain!!!"],
        allowedMethods: ["GET"],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: ["not a domain!!!"],
        allowedMethods: ["GET"],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_DOMAIN_INVALID"))).toBe(true);
    }
  });

  it("rejects invalid method 'INVALID_VERB' with SYSTEM_COMMAND_METHOD_INVALID", () => {
    expect(() =>
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: ["api.example.com"],
        allowedMethods: ["INVALID_VERB"],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: ["api.example.com"],
        allowedMethods: ["INVALID_VERB"],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_METHOD_INVALID"))).toBe(true);
    }
  });

  it("rejects empty allowedMethods with SYSTEM_COMMAND_METHOD_INVALID", () => {
    expect(() =>
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: ["api.example.com"],
        allowedMethods: [],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandHttpRequestSchema.parse({
        allowedDomains: ["api.example.com"],
        allowedMethods: [],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_METHOD_INVALID"))).toBe(true);
    }
  });
});

describe("SystemCommandConfigSchema (standalone)", () => {
  it("parses valid config with prefix wildcard and plain key", () => {
    const result = SystemCommandConfigSchema.parse({
      allowedKeys: ["homework:*", "quiz:stats"],
    });
    expect(result.allowedKeys).toEqual(["homework:*", "quiz:stats"]);
  });

  it("parses with optional maxValueSize", () => {
    const result = SystemCommandConfigSchema.parse({
      allowedKeys: ["settings:*"],
      maxValueSize: 65536,
    });
    expect(result.maxValueSize).toBe(65536);
  });

  it("rejects empty allowedKeys with SYSTEM_COMMAND_KEY_INVALID", () => {
    expect(() =>
      SystemCommandConfigSchema.parse({
        allowedKeys: [],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandConfigSchema.parse({
        allowedKeys: [],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_KEY_INVALID"))).toBe(true);
    }
  });

  it("rejects bare colon in wrong position with SYSTEM_COMMAND_KEY_INVALID", () => {
    expect(() =>
      SystemCommandConfigSchema.parse({
        allowedKeys: ["invalid:key:here"],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandConfigSchema.parse({
        allowedKeys: ["invalid:key:here"],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_KEY_INVALID"))).toBe(true);
    }
  });

  it("rejects bare colon at end without wildcard with SYSTEM_COMMAND_KEY_INVALID", () => {
    expect(() =>
      SystemCommandConfigSchema.parse({
        allowedKeys: ["homework:"],
      }),
    ).toThrow(ZodError);
    try {
      SystemCommandConfigSchema.parse({
        allowedKeys: ["homework:"],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const err = e as ZodError;
      const messages = err.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("SYSTEM_COMMAND_KEY_INVALID"))).toBe(true);
    }
  });
});
