/**
 * AI Provider 公共 barrel —— 收口教师侧可见面（PROV-01 / PROV-02）。
 *
 * 只 re-export 两类公共面：
 * 1. generate 入口：`aiGenerateText` / `aiGenerateObject`（唯一调用通道）。
 * 2. typed error 判型面：`ProviderError` 联合类型 + 4 个具体错误类（供调用方按
 *    `kind` / `instanceof` 决策重试/提示）。
 *
 * **刻意不导出** `config`（apiKey）、`registry`（model 工厂/provider 客户端）、
 * `rate-limit`、`redis-client`、`error-mapping` 等内部模块 —— 收窄公共面，
 * 杜绝调用方拿到 apiKey / 原始 provider 句柄（mitigate T-61-key-leak；
 * facade.test.ts Test 6 + no-leak.test.ts 断言导出面）。
 *
 * 注意：本模块经由 facade（`import "server-only"`）传递性绑定 server-only 边界，
 * 不应被 client/edge/plugin import（no-leak.test.ts A 组静态证明）。
 */

export { aiGenerateText, aiGenerateObject } from "./facade";
export type { GenerateTextArgs, GenerateObjectArgs } from "./facade";

export type { ProviderError } from "./errors";
export {
  ProviderParseError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUpstreamError,
} from "./errors";
