import "server-only";

/**
 * Provider 配置：服务端 env 读取的唯一收口（PROV-02）。
 *
 * `import "server-only"` 在编译期阻止本模块进入 client bundle —— apiKey/baseURL
 * 永不外泄到浏览器（mitigate T-61-key-leak）。返回对象仅供内部装配 provider，
 * 绝不作为 DTO 返回给任何调用方；返回面只含 4 个约定字段，不夹带 headers/
 * Authorization 等可能回显鉴权信息的字段。
 *
 * 缺失任一必填 env 抛 `AI_PROVIDER_NOT_CONFIGURED`（UPPER_SNAKE code，仿
 * `connection.ts` 的 `BULLMQ_ENV_NOT_READY` 先例），由上层统一处理为不可用态。
 */

/** getProviderConfig 返回的内部装配契约（不是 DTO）。 */
export interface ProviderConfig {
  readonly baseURL: string;
  readonly apiKey: string;
  readonly modelId: string;
  readonly providerName: string;
}

/**
 * 从 `process.env` 读取 OpenAI-Compatible provider 配置。
 *
 * @throws Error 当 baseURL / apiKey / modelId 任一缺失时抛 `AI_PROVIDER_NOT_CONFIGURED`。
 */
export function getProviderConfig(): ProviderConfig {
  const baseURL = process.env.OPENAI_COMPAT_BASE_URL;
  const apiKey = process.env.OPENAI_COMPAT_API_KEY;
  const modelId = process.env.OPENAI_COMPAT_MODEL;
  const providerName = process.env.OPENAI_COMPAT_NAME ?? "openai-compatible";

  if (!baseURL || !apiKey || !modelId) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }

  return { baseURL, apiKey, modelId, providerName };
}
