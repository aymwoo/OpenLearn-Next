/**
 * 共享测试夹具：LLM 语言模型 Mock 工厂。
 *
 * 这是测试夹具（不加 `import "server-only"`），供后续所有 provider/facade/
 * error-mapping 测试零网络复用。基于 `ai@6.x` 的 `MockLanguageModelV3`
 * 与 `@ai-sdk/provider` 的 `APICallError`（经 `ai` 重导出）。
 *
 * 注意（版本漂移，见 SUMMARY）：实装 `@ai-sdk/provider@3.0.10` 的
 * `LanguageModelV3Usage` 为结构化形状（`inputTokens:{total,noCache,...}`、
 * `outputTokens:{total,text,reasoning}`），而非 PLAN interfaces 块给出的扁平
 * `{inputTokens,outputTokens,totalTokens}`。此处按实装类型构造。
 *
 * 成功路径以「直接传结果对象」而非 `async () => result` 形式注入 doGenerate，
 * 规避 MockLanguageModelV3 函数重载与 PromiseLike then 泛型的字面量反向收窄伪报错。
 */
import { MockLanguageModelV3 } from "ai/test";
import { APICallError } from "ai";

/** 结构化 usage —— 对齐 LanguageModelV3Usage（@ai-sdk/provider@3.0.x）。 */
const okUsage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
} as const;

/** 结构化 finishReason —— 对齐 LanguageModelV3FinishReason（@ai-sdk/provider@3.0.x）。 */
const okFinish = { unified: "stop", raw: undefined } as const;

/**
 * 成功返回纯文本的语言模型 Mock。
 * doGenerate → `content:[{type:"text",text}]`、`finishReason:"stop"`、usage、`warnings:[]`。
 */
export function makeOkTextModel(text = "hello"): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: {
      finishReason: okFinish,
      usage: okUsage,
      content: [{ type: "text" as const, text }],
      warnings: [],
    },
  });
}

/**
 * 成功返回 JSON 文本的语言模型 Mock（供 generateObject 解析）。
 * doGenerate → `content:[{type:"text",text:JSON.stringify(obj)}]`。
 */
export function makeOkObjectModel(obj: unknown): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: {
      finishReason: okFinish,
      usage: okUsage,
      content: [{ type: "text" as const, text: JSON.stringify(obj) }],
      warnings: [],
    },
  });
}

/**
 * doGenerate 抛错的语言模型 Mock，用于错误映射 / 重试路径测试。
 */
export function makeThrowingModel(err: unknown): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => {
      throw err;
    },
  });
}

/**
 * APICallError 便捷工厂 —— 供 error-mapping / facade 测试复用。
 * 设置 `statusCode`、`responseHeaders`（含 `retry-after`）、`isRetryable`。
 */
export function makeApiCallError(opts: {
  status: number;
  retryAfter?: string;
  retryable?: boolean;
}): APICallError {
  const responseHeaders: Record<string, string> = {};
  if (opts.retryAfter !== undefined) {
    responseHeaders["retry-after"] = opts.retryAfter;
  }
  return new APICallError({
    message: `mock API error ${opts.status}`,
    url: "https://mock.invalid/v1/chat/completions",
    requestBodyValues: {},
    statusCode: opts.status,
    responseHeaders,
    isRetryable: opts.retryable ?? (opts.status === 429 || opts.status >= 500),
  });
}
