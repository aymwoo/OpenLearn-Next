import { describe, expect, it } from "vitest";

import { buildStoragePath, resolveStoragePath } from "./storage-path";

describe("buildStoragePath", () => {
  it("should build a path in the format {root}/{schoolId}/{pluginKey}/{sha256}.{ext}", () => {
    const result = buildStoragePath("school-a", "plugin-1", "a1b2c3d4e5f6", "pdf");
    expect(result).toContain("data/files");
    expect(result).toContain("school-a");
    expect(result).toContain("plugin-1");
    expect(result).toContain("a1b2c3d4e5f6.pdf");
  });

  it("should return an absolute path", () => {
    const result = buildStoragePath("school-a", "plugin-1", "sha256hex", "png");
    // Should start with / (absolute path on Linux) or resolve to one
    expect(result.startsWith("/")).toBe(true);
  });
});

describe("resolveStoragePath", () => {
  it("should resolve a relative path against the storage root", () => {
    const result = resolveStoragePath("school-a/plugin-1/abc.pdf");
    expect(result).toContain("data/files");
    expect(result).toContain("school-a/plugin-1/abc.pdf");
  });

  it("should return an absolute path", () => {
    const result = resolveStoragePath("some/file.txt");
    expect(result.startsWith("/")).toBe(true);
  });
});
