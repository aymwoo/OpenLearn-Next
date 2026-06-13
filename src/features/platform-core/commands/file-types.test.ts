/**
 * Phase 80: system.file — Command Bus type system extension tests
 *
 * Tests the SystemCommandTypes, PlatformCommandPayloadSchemas, and
 * PlatformCommandSchema extensions added in Task 3 of Plan 80-01.
 */

import { describe, it, expect } from "vitest";
import {
  PlatformCommandTypeSchema,
  PlatformCommandPayloadSchemas,
  PlatformCommandSchema,
  type PlatformCommand,
} from "./contracts";
import { GovernanceDeniedReasonValues } from "@/features/runtime-platform/contracts/permissions";

describe("PlatformCommandTypeSchema — system.file.* variants", () => {
  it("should accept system.file.upload", () => {
    const result = PlatformCommandTypeSchema.safeParse("system.file.upload");
    expect(result.success).toBe(true);
  });

  it("should accept system.file.delete", () => {
    const result = PlatformCommandTypeSchema.safeParse("system.file.delete");
    expect(result.success).toBe(true);
  });

  it("should reject system.file.download (pure DAL read, not a PlatformCommandType)", () => {
    const result = PlatformCommandTypeSchema.safeParse("system.file.download");
    expect(result.success).toBe(false);
  });

  it("should reject system.file.list (pure DAL read)", () => {
    const result = PlatformCommandTypeSchema.safeParse("system.file.list");
    expect(result.success).toBe(false);
  });

  it("should reject system.file.metadata (pure DAL read)", () => {
    const result = PlatformCommandTypeSchema.safeParse("system.file.metadata");
    expect(result.success).toBe(false);
  });
});

describe("PlatformCommandPayloadSchemas — system.file.* entries", () => {
  it("should have system.file.upload payload schema", () => {
    expect(PlatformCommandPayloadSchemas).toHaveProperty("system.file.upload");
  });

  it("should have system.file.delete payload schema", () => {
    expect(PlatformCommandPayloadSchemas).toHaveProperty("system.file.delete");
  });
});

describe("PlatformCommandSchema — system.file.* discriminated union variants", () => {
  const minimalEnvelope = {
    id: "cmd-001",
    actor: { actorId: "actor-1", actorScope: "plugin" as const },
    scope: { schoolId: "school-1", pluginId: "plugin-1" },
    correlation: { correlationId: "corr-1", causationId: null, producer: "test" },
    dedupeKey: "dedup-1",
  };

  it("should parse system.file.upload command envelope", () => {
    const result = PlatformCommandSchema.safeParse({
      ...minimalEnvelope,
      type: "system.file.upload",
      payload: {
        fileId: "file-001",
        sha256: "abc123",
        fileName: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        diskPath: "school-1/plugin-1/abc123.pdf",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should parse system.file.delete command envelope", () => {
    const result = PlatformCommandSchema.safeParse({
      ...minimalEnvelope,
      type: "system.file.delete",
      payload: {
        fileId: "file-001",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject system.file.upload with missing required payload fields", () => {
    const result = PlatformCommandSchema.safeParse({
      ...minimalEnvelope,
      type: "system.file.upload",
      payload: {
        fileId: "file-001",
        // missing sha256, fileName, mimeType, sizeBytes, diskPath
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject system.file.delete with empty fileId", () => {
    const result = PlatformCommandSchema.safeParse({
      ...minimalEnvelope,
      type: "system.file.delete",
      payload: {
        fileId: "",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("GovernanceDeniedReasonValues — system.file deny reasons", () => {
  it("should include path_not_allowed", () => {
    expect(GovernanceDeniedReasonValues).toContain("path_not_allowed");
  });

  it("should include operation_not_allowed", () => {
    expect(GovernanceDeniedReasonValues).toContain("operation_not_allowed");
  });

  it("should include quota_exceeded", () => {
    expect(GovernanceDeniedReasonValues).toContain("quota_exceeded");
  });
});
