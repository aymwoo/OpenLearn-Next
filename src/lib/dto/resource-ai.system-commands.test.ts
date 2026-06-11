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

// ---------------------------------------------------------------------------
// Task 2: PluginManifestSchema systemCommands — discriminated union
// ---------------------------------------------------------------------------

describe("PluginManifestSchema systemCommands", () => {
  // Shared minimal valid manifest factory
  function baseManifest(overrides: Record<string, unknown> = {}) {
    return {
      id: "test.plugin",
      version: "1.0.0",
      manifestVersion: 2 as const,
      permissions: [] as string[],
      anchors: ["lesson.sidebar"] as string[],
      actions: ["suggestBuiltInTeachingStep"] as string[],
      governance: {
        manifestVersion: 2,
        contractVersion: "v2",
        dependencies: [],
        requestedCapabilities: ["runtime:submission:create"],
        permissions: ["lesson:write:suggestion"],
        lifecycle: {
          ownerType: "plugin-manager",
          installScope: "school",
          initialState: "installed" as const,
          mountMode: "manual" as const,
        },
      },
      ...overrides,
    };
  }

  describe("backward compatibility", () => {
    it("parses manifest without systemCommands", () => {
      const result = PluginManifestSchema.parse(baseManifest());
      expect(result.id).toBe("test.plugin");
      expect(result.systemCommands).toBeUndefined();
    });

    it("parses manifest with systemCommands=[]", () => {
      const result = PluginManifestSchema.parse(
        baseManifest({ systemCommands: [] }),
      );
      expect(result.systemCommands).toEqual([]);
    });

    it("parses buildExternalQuizManifest('1.0.0')", () => {
      const m = buildExternalQuizManifest("1.0.0");
      const result = PluginManifestSchema.parse(m);
      expect(result.id).toBe("external-marketplace.quiz-sample");
    });

    it("parses buildExternalQuizManifest('1.1.0')", () => {
      const m = buildExternalQuizManifest("1.1.0");
      const result = PluginManifestSchema.parse(m);
      expect(result.id).toBe("external-marketplace.quiz-sample");
    });

    it("parses buildExternalHomeworkManifest('1.0.0')", () => {
      const m = buildExternalHomeworkManifest("1.0.0");
      const result = PluginManifestSchema.parse(m);
      expect(result.id).toBe("external-marketplace.homework");
    });

    it("parses all EXTERNAL_MARKETPLACE_CATALOG entries", () => {
      for (const entry of EXTERNAL_MARKETPLACE_CATALOG) {
        expect(() => PluginManifestSchema.parse(entry.manifest)).not.toThrow();
      }
    });
  });

  describe("positive cases", () => {
    it("parses manifest with system.http.request entry", () => {
      const result = PluginManifestSchema.parse(
        baseManifest({
          systemCommands: [
            {
              command: "system.http.request",
              allowedDomains: ["api.example.com"],
              allowedMethods: ["GET"],
            },
          ],
        }),
      );
      expect(result.systemCommands).toHaveLength(1);
      expect(result.systemCommands![0].command).toBe("system.http.request");
    });

    it("parses manifest with system.config entry", () => {
      const result = PluginManifestSchema.parse(
        baseManifest({
          systemCommands: [
            {
              command: "system.config",
              allowedKeys: ["homework:*"],
            },
          ],
        }),
      );
      expect(result.systemCommands).toHaveLength(1);
      expect(result.systemCommands![0].command).toBe("system.config");
    });

    it("parses manifest with both command types", () => {
      const result = PluginManifestSchema.parse(
        baseManifest({
          systemCommands: [
            {
              command: "system.http.request",
              allowedDomains: ["api.example.com", "*.github.com"],
              allowedMethods: ["GET", "POST"],
            },
            {
              command: "system.config",
              allowedKeys: ["quiz:*"],
            },
          ],
        }),
      );
      expect(result.systemCommands).toHaveLength(2);
      const commands = result.systemCommands!.map((c) => c.command);
      expect(commands).toContain("system.http.request");
      expect(commands).toContain("system.config");
    });
  });

  describe("negative cases", () => {
    it("rejects unknown command name 'system.unknown'", () => {
      expect(() =>
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [{ command: "system.unknown" }],
          }),
        ),
      ).toThrow(ZodError);
    });

    it("rejects system.http.request with empty allowedDomains", () => {
      expect(() =>
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.http.request",
                allowedDomains: [],
                allowedMethods: ["GET"],
              },
            ],
          }),
        ),
      ).toThrow(ZodError);
      try {
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.http.request",
                allowedDomains: [],
                allowedMethods: ["GET"],
              },
            ],
          }),
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ZodError);
        const err = e as ZodError;
        const messages = err.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("SYSTEM_COMMAND_DOMAIN_INVALID"))).toBe(true);
      }
    });

    it("rejects system.http.request with invalid method", () => {
      expect(() =>
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.http.request",
                allowedDomains: ["example.com"],
                allowedMethods: ["UNKNOWN"],
              },
            ],
          }),
        ),
      ).toThrow(ZodError);
      try {
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.http.request",
                allowedDomains: ["example.com"],
                allowedMethods: ["UNKNOWN"],
              },
            ],
          }),
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ZodError);
        const err = e as ZodError;
        const messages = err.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("SYSTEM_COMMAND_METHOD_INVALID"))).toBe(true);
      }
    });

    it("rejects system.config with empty allowedKeys", () => {
      expect(() =>
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.config",
                allowedKeys: [],
              },
            ],
          }),
        ),
      ).toThrow(ZodError);
      try {
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.config",
                allowedKeys: [],
              },
            ],
          }),
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ZodError);
        const err = e as ZodError;
        const messages = err.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("SYSTEM_COMMAND_KEY_INVALID"))).toBe(true);
      }
    });

    it("rejects system.config with invalid key having multiple colons", () => {
      expect(() =>
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.config",
                allowedKeys: ["invalid:key:here"],
              },
            ],
          }),
        ),
      ).toThrow(ZodError);
      try {
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: [
              {
                command: "system.config",
                allowedKeys: ["invalid:key:here"],
              },
            ],
          }),
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ZodError);
        const err = e as ZodError;
        const messages = err.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("SYSTEM_COMMAND_KEY_INVALID"))).toBe(true);
      }
    });

    it("rejects non-object value in systemCommands array", () => {
      expect(() =>
        PluginManifestSchema.parse(
          baseManifest({
            systemCommands: ["not an object"],
          }),
        ),
      ).toThrow(ZodError);
    });
  });

  describe("governance interaction", () => {
    it("accepts manifestVersion=2 with governance + systemCommands", () => {
      const result = PluginManifestSchema.parse(
        baseManifest({
          manifestVersion: 2,
          governance: baseManifest().governance,
          systemCommands: [
            {
              command: "system.http.request",
              allowedDomains: ["api.example.com"],
              allowedMethods: ["GET"],
            },
          ],
        }),
      );
      expect(result.systemCommands).toHaveLength(1);
    });

    it("rejects manifestVersion=2 without governance but with systemCommands", () => {
      expect(() =>
        PluginManifestSchema.parse({
          id: "test.plugin",
          version: "1.0.0",
          manifestVersion: 2,
          permissions: [],
          anchors: ["lesson.sidebar"],
          actions: ["suggestBuiltInTeachingStep"],
          systemCommands: [
            {
              command: "system.config",
              allowedKeys: ["quiz:*"],
            },
          ],
        }),
      ).toThrow(ZodError);
    });

    it("accepts manifestVersion=1 with systemCommands (no governance required)", () => {
      const result = PluginManifestSchema.parse({
        id: "test.plugin",
        version: "1.0.0",
        manifestVersion: 1,
        permissions: [],
        anchors: ["lesson.sidebar"],
        actions: ["suggestBuiltInTeachingStep"],
        systemCommands: [
          {
            command: "system.http.request",
            allowedDomains: ["api.example.com"],
            allowedMethods: ["GET"],
          },
        ],
      });
      expect(result.systemCommands).toHaveLength(1);
    });
  });
});

describe("Individual schema exports for Phase 78/79 reuse", () => {
  it("SystemCommandHttpRequestSchema standalone parse works", () => {
    const result = SystemCommandHttpRequestSchema.parse({
      allowedDomains: ["api.example.com"],
      allowedMethods: ["GET"],
    });
    expect(result.allowedDomains).toEqual(["api.example.com"]);
    expect(result.allowedMethods).toEqual(["GET"]);
  });

  it("SystemCommandConfigSchema standalone parse works", () => {
    const result = SystemCommandConfigSchema.parse({
      allowedKeys: ["homework:*"],
    });
    expect(result.allowedKeys).toEqual(["homework:*"]);
  });

  it("SystemCommandDiscriminatedSchema parses system.http.request", () => {
    const result = SystemCommandDiscriminatedSchema.parse({
      command: "system.http.request",
      allowedDomains: ["api.example.com"],
      allowedMethods: ["GET"],
    });
    expect(result.command).toBe("system.http.request");
  });

  it("SystemCommandDiscriminatedSchema parses system.config", () => {
    const result = SystemCommandDiscriminatedSchema.parse({
      command: "system.config",
      allowedKeys: ["quiz:*"],
    });
    expect(result.command).toBe("system.config");
  });

  it("SystemCommandDiscriminatedSchema rejects unknown command", () => {
    expect(() =>
      SystemCommandDiscriminatedSchema.parse({
        command: "system.unknown",
      }),
    ).toThrow(ZodError);
  });
});
