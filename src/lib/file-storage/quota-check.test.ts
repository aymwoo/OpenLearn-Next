import { describe, expect, it, vi } from "vitest";

import { QuotaTransform } from "./quota-check";

describe("QuotaTransform", () => {
  it("should pass through chunks when bytesWritten <= maxBytes", () => {
    const qt = new QuotaTransform(100);
    const callback = vi.fn();

    qt._transform(Buffer.from("hello"), "utf8" as BufferEncoding, callback);

    expect(callback).toHaveBeenCalledWith();
    expect(qt.getTotalBytes()).toBe(5);
  });

  it("should emit error when bytesWritten exceeds maxBytes", () => {
    const qt = new QuotaTransform(5);
    const callback = vi.fn();

    // First chunk: 5 bytes (at the limit)
    qt._transform(Buffer.from("hello"), "utf8" as BufferEncoding, vi.fn());
    // Second chunk: exceeds limit
    qt._transform(Buffer.from("x"), "utf8" as BufferEncoding, callback);

    expect(callback).toHaveBeenCalled();
    const errorArg = callback.mock.calls[0]?.[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toContain("QUOTA_EXCEEDED");
  });

  it("should accumulate bytes across multiple chunks", () => {
    const qt = new QuotaTransform(50);
    const cb = vi.fn();

    qt._transform(Buffer.from("12345"), "utf8" as BufferEncoding, cb);
    qt._transform(Buffer.from("67890"), "utf8" as BufferEncoding, cb);

    expect(qt.getTotalBytes()).toBe(10);
  });

  it("should include label in error message", () => {
    const qt = new QuotaTransform(2, "test_label");
    const callback = vi.fn();

    qt._transform(Buffer.from("abc"), "utf8" as BufferEncoding, callback);

    const errorArg = callback.mock.calls[0]?.[0];
    expect((errorArg as Error).message).toContain("QUOTA_EXCEEDED:test_label");
  });

  it("should use default label 'file_upload'", () => {
    const qt = new QuotaTransform(2);
    const callback = vi.fn();

    qt._transform(Buffer.from("abc"), "utf8" as BufferEncoding, callback);

    const errorArg = callback.mock.calls[0]?.[0];
    expect((errorArg as Error).message).toContain("QUOTA_EXCEEDED:file_upload");
  });
});
