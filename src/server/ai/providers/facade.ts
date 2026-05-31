import "server-only";

import { generateObject, generateText } from "ai";
import type { z } from "zod";

import { mapProviderError } from "./error-mapping";
import { enforceRateLimit } from "./rate-limit";
import { getLanguageModel } from "./registry";

/**
 * Facade：教师侧 AI 调用的唯一公共入口（PROV-01 编排半边）。
 *
 * 把 Wave 1/2 的零件串成固定流水线：
 *   `enforceRateLimit` → `getLanguageModel` → AI SDK `generate*` → `mapProviderError`
 *
 * 设计约束：
 * - **限流先行（T-61-dos / T-61-retry-amplification）**：`enforceRateLimit` 在装配/生成
 *   之前 await，限流命中直接冒泡 `ProviderRateLimitError`，**绝不进入 generate** ——
 *   单次教师请求不会放大为上游调用，也不会二次计数。
 * - **错误归一（PROV-04）**：generate 的任何异常经 `mapProviderError` 归一为 4 类
 *   provider 错误后抛出，调用方只面对 `kind`/`retryable`，永不裸抛 AI SDK 原生错误。
 * - **retry 封顶（T-61-retry-amplification）**：显式 `maxRetries: 2` 给 AI SDK，
 *   不在本层叠加任何自定义重试循环，避免重试放大上游成本与限流计数。
 * - **零泄漏（T-61-key-leak）**：返回面仅为纯 `text` / `object`，不透出 model 句柄、
 *   apiKey、baseURL 或 provider 客户端（no-leak.test.ts B 组深 walk 断言）。
 *
 * 本 phase 不含 prompt 内容逻辑（D-11 → Phase 62）；prompt 由调用方传入。
 */

/** AI SDK 单次调用的重试上限——封顶不叠加（retry-amplification 缓解）。 */
const MAX_RETRIES = 2;

/** `aiGenerateText` 入参。 */
export interface GenerateTextArgs {
  /** 已鉴权的教师标识，仅作限流维度。 */
  teacherId: string;
  /** 调用方组装好的完整 prompt（本 phase 不做内容编排）。 */
  prompt: string;
  /** 可选模型覆盖；缺省走 config.modelId。 */
  modelId?: string;
}

/** `aiGenerateObject` 入参，`schema` 决定返回结构 `T`。 */
export interface GenerateObjectArgs<T> {
  teacherId: string;
  prompt: string;
  /** Zod schema：既约束返回类型，也驱动 AI SDK 结构化校验（失败归一为 ParseError）。 */
  schema: z.ZodType<T>;
  modelId?: string;
}

/**
 * 生成纯文本：限流 → 装配模型 → `generateText` → 归一错误。
 *
 * @returns 模型输出文本。
 * @throws ProviderRateLimitError 限流命中（短路，不触发上游）。
 * @throws ProviderError 上游/超时/未知错误经 `mapProviderError` 归一后抛出。
 */
export async function aiGenerateText({
  teacherId,
  prompt,
  modelId,
}: GenerateTextArgs): Promise<string> {
  // 限流先行：命中即冒泡，绝不进入装配/生成（retry-amplification 防护）。
  await enforceRateLimit(teacherId);

  const model = getLanguageModel(modelId);
  try {
    const { text } = await generateText({ model, prompt, maxRetries: MAX_RETRIES });
    return text;
  } catch (err) {
    throw mapProviderError(err);
  }
}

/**
 * 生成结构化对象：限流 → 装配模型 → `generateObject`（zod 校验）→ 归一错误。
 *
 * @returns 经 `schema` 校验的对象 `T`。
 * @throws ProviderRateLimitError 限流命中（短路，不触发上游）。
 * @throws ProviderParseError 结构化解析/校验失败（不可重试）。
 * @throws ProviderError 其余上游/超时/未知错误归一后抛出。
 */
export async function aiGenerateObject<T>({
  teacherId,
  prompt,
  schema,
  modelId,
}: GenerateObjectArgs<T>): Promise<T> {
  await enforceRateLimit(teacherId);

  const model = getLanguageModel(modelId);
  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      maxRetries: MAX_RETRIES,
    });
    return object;
  } catch (err) {
    throw mapProviderError(err);
  }
}
