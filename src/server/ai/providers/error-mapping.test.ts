import {
  JSONParseError,
  NoObjectGeneratedError,
  TypeValidationError,
} from "ai";
import { describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（classroom.test.ts:39 先例）。
vi.mock("server-only", () => ({}));

import { makeApiCallError } from "./__fixtures__/mock-model";
import {
  ProviderParseError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUpstreamError,
} from "./errors";
import { mapProviderError } from "./error-mapping";

describe("mapProviderError — AI SDK 原生错误归一（PROV-04）", () => {
  it("Test 1a: NoObjectGeneratedError → ProviderParseError(parse, retryable false, 中文)", () => {
    // NoObjectGeneratedError 的 d.ts 形参要求 response/usage/finishReason，
    // 运行期 isInstance 只校验标记符号，故此处 cast 以构造最小实例。
    const out = mapProviderError(
      new NoObjectGeneratedError({ message: "no object" } as never),
    );
    expect(out).toBeInstanceOf(ProviderParseError);
    const pe = out as ProviderParseError;
    expect(pe.kind).toBe("parse");
    expect(pe.retryable).toBe(false);
    expect(pe.message).toMatch(/[\u4e00-\u9fa5]/);
  });

  it("Test 1b: JSONParseError → ProviderParseError", () => {
    const out = mapProviderError(
      new JSONParseError({ text: "{bad", cause: new Error("x") }),
    );
    expect(out).toBeInstanceOf(ProviderParseError);
    expect((out as ProviderParseError).kind).toBe("parse");
  });

  it("Test 1c: TypeValidationError → ProviderParseError", () => {
    const out = mapProviderError(
      new TypeValidationError({ value: {}, cause: new Error("x") }),
    );
    expect(out).toBeInstanceOf(ProviderParseError);
    expect((out as ProviderParseError).kind).toBe("parse");
  });

  it("Test 2: APICallError 429 → ProviderRateLimitError，retryAfter 取 retry-after 头", () => {
    const out = mapProviderError(
      makeApiCallError({ status: 429, retryAfter: "12" }),
    );
    expect(out).toBeInstanceOf(ProviderRateLimitError);
    const rl = out as ProviderRateLimitError;
    expect(rl.kind).toBe("rate_limit");
    expect(rl.retryable).toBe(false);
    expect(rl.retryAfter).toBe(12);
  });

  it("Test 2b: APICallError 429 缺 retry-after 头 → retryAfter 回退 30", () => {
    const out = mapProviderError(makeApiCallError({ status: 429 }));
    expect((out as ProviderRateLimitError).retryAfter).toBe(30);
  });

  it("Test 3: APICallError isRetryable=true 非 429（503）→ ProviderUpstreamError retryable true，status 透传", () => {
    const out = mapProviderError(
      makeApiCallError({ status: 503, retryable: true }),
    );
    expect(out).toBeInstanceOf(ProviderUpstreamError);
    const up = out as ProviderUpstreamError;
    expect(up.kind).toBe("upstream");
    expect(up.retryable).toBe(true);
    expect(up.status).toBe(503);
  });

  it("Test 4: APICallError isRetryable=false（400）→ ProviderUpstreamError retryable false", () => {
    const out = mapProviderError(
      makeApiCallError({ status: 400, retryable: false }),
    );
    expect(out).toBeInstanceOf(ProviderUpstreamError);
    const up = out as ProviderUpstreamError;
    expect(up.retryable).toBe(false);
    expect(up.status).toBe(400);
  });

  it("Test 5: name 为 TimeoutError 的 Error → ProviderTimeoutError retryable true", () => {
    const err = new Error("aborted");
    err.name = "TimeoutError";
    const out = mapProviderError(err);
    expect(out).toBeInstanceOf(ProviderTimeoutError);
    const te = out as ProviderTimeoutError;
    expect(te.kind).toBe("timeout");
    expect(te.retryable).toBe(true);
  });

  it("Test 6: 已是 ProviderRateLimitError → 原样返回，不二次包装", () => {
    const original = new ProviderRateLimitError("我层限流", 7);
    const out = mapProviderError(original);
    expect(out).toBe(original);
    expect((out as ProviderRateLimitError).retryAfter).toBe(7);
  });

  it("Test 7: 未知错误 → ProviderUpstreamError retryable false", () => {
    const out = mapProviderError(new Error("something weird"));
    expect(out).toBeInstanceOf(ProviderUpstreamError);
    expect((out as ProviderUpstreamError).retryable).toBe(false);
  });
});
