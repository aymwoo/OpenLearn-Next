import "server-only";

/**
 * Provider 层归一错误（PROV-04）。
 *
 * 将 AI SDK 原生错误（`APICallError` / `NoObjectGeneratedError` /
 * `JSONParseError` / `TypeValidationError`）与超时/未知错误，统一收口为
 * 4 类带 `kind` 判别字段的错误类，供上层 facade / Server Action 按
 * `kind` + `retryable` 决策（重试、提示、限流回退）。
 *
 * 设计：
 * - `timeout`：可重试（AbortSignal.timeout 取消）。
 * - `upstream`：上游 API 错误，`retryable` 由 SDK `isRetryable` 判定，透传 `status`。
 * - `parse`：结构化解析/校验失败，不可重试（换模型或人工介入，D-10）。
 * - `rate_limit`：限流，不可重试，携带 `retryAfter`（秒）。
 *
 * 所有 message 为面向用户的简体中文文案。
 */

/** 4 类 provider 错误的判别联合（discriminated union）。 */
export type ProviderError =
  | ProviderTimeoutError
  | ProviderUpstreamError
  | ProviderParseError
  | ProviderRateLimitError;

/** 调用超时——可重试。 */
export class ProviderTimeoutError extends Error {
  readonly kind = "timeout" as const;
  readonly retryable = true as const;
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderTimeoutError";
  }
}

/** 上游 API 错误——`retryable` 由 SDK 判定，透传 HTTP `status`。 */
export class ProviderUpstreamError extends Error {
  readonly kind = "upstream" as const;
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable: boolean = true,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderUpstreamError";
  }
}

/** 结构化解析/校验失败——不可重试。 */
export class ProviderParseError extends Error {
  readonly kind = "parse" as const;
  readonly retryable = false as const;
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderParseError";
  }
}

/** 限流——不可重试，携带 `retryAfter`（秒）。 */
export class ProviderRateLimitError extends Error {
  readonly kind = "rate_limit" as const;
  readonly retryable = false as const;
  constructor(
    message: string,
    readonly retryAfter: number,
  ) {
    super(message);
    this.name = "ProviderRateLimitError";
  }
}
