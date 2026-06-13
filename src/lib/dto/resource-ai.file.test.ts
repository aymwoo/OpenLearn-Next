/**
 * Phase 80: system.file — SystemCommandFileSchema + discriminated union tests
 *
 * Tests the manifest DTO schema extensions added in Task 2 of Plan 80-01:
 * - PATH_PATTERN validation
 * - SystemCommandFileSchema shape
 * - SystemCommandDiscriminatedSchema system.file variant
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  SystemCommandFileSchema,
  SystemCommandDiscriminatedSchema,
  SYSTEM_COMMAND_REASONS,
} from "./resource-ai";

describe("SystemCommandFileSchema", () => {
  it("should accept valid file config with upload and download operations", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/"],
      allowedOperations: ["upload", "download"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid file config with all five operations", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["docs/", "images/"],
      allowedOperations: ["upload", "download", "delete", "list", "metadata"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept paths with safe characters only", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["a-zA-Z0-9_-./sub/"],
      allowedOperations: ["upload"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept optional quota fields", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/"],
      allowedOperations: ["upload"],
      maxSingleFileSize: 1048576,
      maxTotalStorage: 10485760,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty allowedPaths array (min 1)", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: [],
      allowedOperations: ["upload"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject path containing .. (parent traversal)", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["../etc"],
      allowedOperations: ["upload"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // PATH_PATTERN regex should reject ".."
      const pathIssue = result.error.issues.find(
        (i) => i.path.includes("allowedPaths"),
      );
      expect(pathIssue).toBeDefined();
    }
  });

  it("should reject path containing null byte encoding %00", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/%00"],
      allowedOperations: ["upload"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty allowedOperations array (min 1)", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/"],
      allowedOperations: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid operation not in enum", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/"],
      allowedOperations: ["execute"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative maxSingleFileSize", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/"],
      allowedOperations: ["upload"],
      maxSingleFileSize: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero maxTotalStorage", () => {
    const result = SystemCommandFileSchema.safeParse({
      allowedPaths: ["uploads/"],
      allowedOperations: ["upload"],
      maxTotalStorage: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("SystemCommandDiscriminatedSchema — system.file variant", () => {
  it("should accept system.file command with valid config", () => {
    const result = SystemCommandDiscriminatedSchema.safeParse({
      command: "system.file",
      allowedPaths: ["docs/"],
      allowedOperations: ["list"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject system.file command with path traversal in allowedPaths", () => {
    const result = SystemCommandDiscriminatedSchema.safeParse({
      command: "system.file",
      allowedPaths: ["../etc"],
      allowedOperations: ["upload"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject unknown system command variants", () => {
    const result = SystemCommandDiscriminatedSchema.safeParse({
      command: "system.nonexistent",
    });
    expect(result.success).toBe(false);
  });
});

describe("SYSTEM_COMMAND_REASONS", () => {
  it("should include SYSTEM_COMMAND_PATH_INVALID", () => {
    expect(SYSTEM_COMMAND_REASONS).toContain("SYSTEM_COMMAND_PATH_INVALID");
  });

  it("should include SYSTEM_COMMAND_OPERATION_INVALID", () => {
    expect(SYSTEM_COMMAND_REASONS).toContain("SYSTEM_COMMAND_OPERATION_INVALID");
  });
});
