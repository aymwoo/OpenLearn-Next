import { describe, expect, it } from "vitest";

import { getMimeType } from "./mime-fallback";

describe("getMimeType", () => {
  it("should return MIME based on extension for .jpg", () => {
    expect(getMimeType("photo.jpg", null)).toBe("image/jpeg");
  });

  it("should return MIME based on extension for .png", () => {
    expect(getMimeType("icon.png", null)).toBe("image/png");
  });

  it("should prefer DB MIME over extension-based lookup", () => {
    // DB says image/png, but extension is .jpg
    expect(getMimeType("photo.jpg", "image/png")).toBe("image/png");
  });

  it("should return DB MIME when available (even if unknown extension)", () => {
    expect(getMimeType("file.xyz", "text/csv")).toBe("text/csv");
  });

  it("should return application/octet-stream for unknown extensions with no DB MIME", () => {
    expect(getMimeType("unknown.xyz", null)).toBe("application/octet-stream");
  });

  it("should handle empty DB MIME string", () => {
    // Empty string should fall through to extension lookup
    expect(getMimeType("photo.jpg", "")).toBe("image/jpeg");
  });

  it("should return application/octet-stream for files without extension", () => {
    expect(getMimeType("README", null)).toBe("application/octet-stream");
  });
});
