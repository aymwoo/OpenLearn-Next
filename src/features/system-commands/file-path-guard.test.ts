import { describe, expect, it } from "vitest";

import { sanitizeFilePath } from "./file-path-guard";

describe("sanitizeFilePath", () => {
  it("should return an absolute resolved path for a clean relative path", () => {
    const result = sanitizeFilePath("documents/report.pdf");
    expect(result).not.toBeNull();
    expect(result).toContain("documents/report.pdf");
  });

  it("should reject URL-encoded path traversal (%2e%2e%2f)", () => {
    const result = sanitizeFilePath("..%2f..%2fetc%2fpasswd");
    expect(result).toBeNull();
  });

  it("should reject double-encoded path traversal (%252e%252e%252f)", () => {
    const result = sanitizeFilePath("%252e%252e%252fetc%252fpasswd");
    expect(result).toBeNull();
  });

  it("should reject null bytes", () => {
    const result = sanitizeFilePath("foo\x00bar");
    expect(result).toBeNull();
  });

  it("should reject plain parent references (..)", () => {
    const result = sanitizeFilePath("../etc/passwd");
    expect(result).toBeNull();
  });

  it("should reject .. with slash alone", () => {
    const result = sanitizeFilePath("..");
    expect(result).toBeNull();
  });

  it("should reject paths that resolve outside the storage root", () => {
    // A symlink-based or crafted path that resolves outside
    const result = sanitizeFilePath("/etc/passwd");
    expect(result).toBeNull();
  });
});
