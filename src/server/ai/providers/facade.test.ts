import { NoObjectGeneratedError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// server-only 在测试环境是 no-op（registry.test.ts:4 先例）。
vi.mock("server-only", () => ({}));

// 跨 mock 持久句柄：四个被编排的协作者。
// "ai" 用 importActual 透传，仅覆盖 generateText/generateObject —— 关键：
// 保留真实 NoObjectGeneratedError/APICallError 等错误类，使 facade → error-mapping
// 的 `*.isInstance()` 判别在归一时命中真实标记符号。
const {
  generateTextMock,
  generateObjectMock,
  enforceRateLimitMock,
  getLanguageModelMock,
} = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  generateObjectMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  getLanguageModelMock: vi.fn(),
}));

vi.mock("ai", async (importActual) => {
  const actual = await importActual<typeof import("ai")>();
  return {
    ...actual,
    generateText: generateTextMock,
    generateObject: generateObjectMock,
  };
});

vi.mock("./rate-limit", () => ({ enforceRateLimit: enforceRateLimitMock }));
vi.mock("./registry", () => ({ getLanguageModel: getLanguageModelMock }));

import { makeApiCallError } from "./__fixtures__/mock-model";
import {
  ProviderParseError,
  ProviderRateLimitError,
  ProviderUpstreamError,
} from "./errors";
import { aiGenerateObject, aiGenerateText } from "./facade";
import * as barrel from "./index";

const FAKE_MODEL = { id: "fake-model" } as const;
const SCHEMA = z.object({ a: z.string() });

describe("facade — 限流→装配→生成→错误归一 编排入口（PROV-01）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue(undefined);
    getLanguageModelMock.mockReturnValue(FAKE_MODEL);
  });

  it("Test 1: aiGenerateText 成功路径 —— 顺序 enforceRateLimit → getLanguageModel → generateText，返回 text，maxRetries 封顶", async () => {
    generateTextMock.mockResolvedValue({ text: "hello world" });

    const out = await aiGenerateText({ teacherId: "t1", prompt: "hi" });

    expect(out).toBe("hello world");
    expect(enforceRateLimitMock).toHaveBeenCalledWith("t1");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: FAKE_MODEL, prompt: "hi", maxRetries: 2 }),
    );

    // 调用顺序：限流必须先于装配，装配必须先于生成。
    const rl = enforceRateLimitMock.mock.invocationCallOrder[0];
    const gl = getLanguageModelMock.mock.invocationCallOrder[0];
    const gt = generateTextMock.mock.invocationCallOrder[0];
    expect(rl).toBeLessThan(gl);
    expect(gl).toBeLessThan(gt);
  });

  it("Test 2: aiGenerateObject 成功路径 —— 透传 zod schema 给 generateObject，返回 object", async () => {
    generateObjectMock.mockResolvedValue({ object: { a: "x" } });

    const out = await aiGenerateObject({
      teacherId: "t1",
      prompt: "p",
      schema: SCHEMA,
    });

    expect(out).toEqual({ a: "x" });
    expect(generateObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: FAKE_MODEL,
        schema: SCHEMA,
        prompt: "p",
        maxRetries: 2,
      }),
    );
  });

  it("Test 3: 限流命中 → 直接冒泡 ProviderRateLimitError，且 getLanguageModel/generate 均未被调用（retry-amplification 防护）", async () => {
    enforceRateLimitMock.mockRejectedValue(
      new ProviderRateLimitError("too many", 5),
    );

    await expect(
      aiGenerateText({ teacherId: "t1", prompt: "hi" }),
    ).rejects.toBeInstanceOf(ProviderRateLimitError);

    expect(getLanguageModelMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("Test 4: aiGenerateObject 抛 NoObjectGeneratedError → 经 mapProviderError 归一为 ProviderParseError（不裸抛原生错误）", async () => {
    generateObjectMock.mockRejectedValue(
      new NoObjectGeneratedError({ message: "no object" } as never),
    );

    await expect(
      aiGenerateObject({ teacherId: "t1", prompt: "p", schema: SCHEMA }),
    ).rejects.toBeInstanceOf(ProviderParseError);
  });

  it("Test 5: aiGenerateText 抛 APICallError(503, retryable) → ProviderUpstreamError(retryable true, status 透传)", async () => {
    generateTextMock.mockRejectedValue(
      makeApiCallError({ status: 503, retryable: true }),
    );

    const err = await aiGenerateText({ teacherId: "t1", prompt: "hi" }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(ProviderUpstreamError);
    expect((err as ProviderUpstreamError).retryable).toBe(true);
    expect((err as ProviderUpstreamError).status).toBe(503);
  });

  it("Test 6: index barrel 仅暴露公共面（generate 入口 + typed error 类），不含 config/registry 内部", () => {
    expect(typeof barrel.aiGenerateText).toBe("function");
    expect(typeof barrel.aiGenerateObject).toBe("function");
    expect(barrel.ProviderRateLimitError).toBe(ProviderRateLimitError);
    expect(barrel.ProviderUpstreamError).toBe(ProviderUpstreamError);
    expect(barrel.ProviderParseError).toBe(ProviderParseError);

    const keys = Object.keys(barrel);
    expect(keys).not.toContain("getProviderConfig");
    expect(keys).not.toContain("getLanguageModel");
    expect(keys).not.toContain("enforceRateLimit");
    expect(keys).not.toContain("mapProviderError");
  });
});
