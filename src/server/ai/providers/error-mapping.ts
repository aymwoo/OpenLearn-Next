import "server-only";

import {
  APICallError,
  JSONParseError,
  NoObjectGeneratedError,
  TypeValidationError,
} from "ai";

import {
  ProviderParseError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUpstreamError,
} from "./errors";

/** 限流缺省回退（秒）——上游未给 `retry-after` 头时使用。 */
const DEFAULT_RETRY_AFTER_SEC = 30;

/**
 * 将任意错误归一为 provider 层错误（PROV-04）。
 *
 * 判别顺序（防御性，见 RESEARCH A2）：
 * 1. 已是 `ProviderRateLimitError`（如限流器主动抛出）→ 原样上抛，不二次包装。
 * 2. 结构化解析/校验失败 → `ProviderParseError`（不可重试，D-10）。
 * 3. `APICallError`：429 → `ProviderRateLimitError`（retry-after 头或缺省 30）；
 *    其余按 SDK `isRetryable` → 可/不可重试的 `ProviderUpstreamError`，透传 status。
 * 4. `name === "TimeoutError"`（AbortSignal.timeout）→ `ProviderTimeoutError`。
 * 5. 其余未知 → 不可重试 `ProviderUpstreamError`。
 *
 * 跨打包边界用 `static isInstance()` 判错（AI SDK v4+ 约定），而非 `instanceof`。
 */
export function mapProviderError(err: unknown): Error {
  // 1) 我层限流错误原样上抛
  if (err instanceof ProviderRateLimitError) return err;

  // 2) 解析/校验失败 → ParseError
  if (
    NoObjectGeneratedError.isInstance(err) ||
    JSONParseError.isInstance(err) ||
    TypeValidationError.isInstance(err)
  ) {
    return new ProviderParseError(
      "AI 返回内容无法解析为目标结构，请重试或换用更强模型。",
      err,
    );
  }

  // 3) 上游 API 错误
  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    if (status === 429) {
      const ra = Number(err.responseHeaders?.["retry-after"]);
      return new ProviderRateLimitError(
        "AI 服务暂时繁忙，请稍后再试。",
        Number.isFinite(ra) && ra > 0 ? ra : DEFAULT_RETRY_AFTER_SEC,
      );
    }
    if (err.isRetryable) {
      return new ProviderUpstreamError(
        "AI 上游服务暂时不可用，请稍后重试。",
        status,
        true,
        err,
      );
    }
    return new ProviderUpstreamError("AI 调用被上游拒绝。", status, false, err);
  }

  // 4) AbortSignal.timeout 触发的取消
  if (err instanceof Error && err.name === "TimeoutError") {
    return new ProviderTimeoutError("AI 调用超时，请重试。", err);
  }

  // 5) 未知错误
  return new ProviderUpstreamError(
    "AI 调用发生未知错误。",
    undefined,
    false,
    err,
  );
}
