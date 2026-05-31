import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { getProviderConfig } from "./config";

/**
 * Registry：env config → OpenAI-compatible provider → LanguageModel 的装配收口（PROV-01）。
 *
 * 这是 facade 之下的「模型工厂」：唯一调用 `createOpenAICompatible` 的地方（D-02 禁用
 * `@ai-sdk/openai`，保证可换 provider —— 换 provider 只改本文件装配点，调用方不变）。
 *
 * `import "server-only"` 阻止本模块进入 client bundle；apiKey 仅在 `createOpenAICompatible`
 * 调用点被消费，对外只暴露 `getLanguageModel`，绝不返回 apiKey / 原始 provider 客户端
 * （mitigate T-61-key-leak；Test 4 断言导出面）。
 *
 * provider 做模块级 memoize（同一进程同一 config 不重复 new），测试间用
 * `vi.resetModules()` 重置缓存。
 */

let cachedProvider: ReturnType<typeof createOpenAICompatible> | undefined;

/** 惰性装配并 memoize OpenAI-compatible provider。 */
function provider(): ReturnType<typeof createOpenAICompatible> {
  if (!cachedProvider) {
    const { baseURL, apiKey, providerName } = getProviderConfig();
    cachedProvider = createOpenAICompatible({
      name: providerName,
      baseURL,
      apiKey,
    });
  }
  return cachedProvider;
}

/**
 * 解析一个可调用的 LanguageModel。
 *
 * @param modelId 可选；缺省时用 `getProviderConfig().modelId`。
 * @returns AI SDK 的 LanguageModel handle，喂给 `ai` 的 generateText/generateObject。
 */
export function getLanguageModel(modelId?: string) {
  const id = modelId ?? getProviderConfig().modelId;
  return provider()(id);
}
