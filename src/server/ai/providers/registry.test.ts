import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（config.test.ts:4 先例）。
vi.mock("server-only", () => ({}));

// 用 vi.hoisted 创建跨 resetModules 持久的 mock 句柄：
// - providerFn：createOpenAICompatible 返回的 provider 函数，按 id 产出 model handle。
// - createOpenAICompatibleMock：装配入口，断言只被调一次（memoize）。
// - getProviderConfigMock：固定 config，避免触碰真实 env / 网络。
const { createOpenAICompatibleMock, providerFn, getProviderConfigMock } =
  vi.hoisted(() => {
    const providerFn = vi.fn((id: string) => ({ modelId: id }));
    const createOpenAICompatibleMock = vi.fn(() => providerFn);
    const getProviderConfigMock = vi.fn(() => ({
      baseURL: "https://api.example.com/v1",
      apiKey: "sk-test",
      modelId: "default-model",
      providerName: "openai-compatible",
    }));
    return { createOpenAICompatibleMock, providerFn, getProviderConfigMock };
  });

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: createOpenAICompatibleMock,
}));

vi.mock("./config", () => ({
  getProviderConfig: getProviderConfigMock,
}));

describe("registry — config → OpenAI-compatible LanguageModel 装配（PROV-01）", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("Test 1: 用 config 的 name/baseURL/apiKey 装配 provider，并以 config.modelId 解析 model", async () => {
    const { getLanguageModel } = await import("./registry");

    const model = getLanguageModel();

    expect(createOpenAICompatibleMock).toHaveBeenCalledTimes(1);
    expect(createOpenAICompatibleMock).toHaveBeenCalledWith({
      name: "openai-compatible",
      baseURL: "https://api.example.com/v1",
      apiKey: "sk-test",
    });
    expect(providerFn).toHaveBeenCalledWith("default-model");
    expect(model).toEqual({ modelId: "default-model" });
  });

  it("Test 2: 传入显式 modelId 覆盖 config 默认", async () => {
    const { getLanguageModel } = await import("./registry");

    const model = getLanguageModel("custom-model");

    expect(providerFn).toHaveBeenCalledWith("custom-model");
    expect(model).toEqual({ modelId: "custom-model" });
  });

  it("Test 3: 连续两次复用同一 provider（createOpenAICompatible 只被调一次）；resetModules 后重新构造", async () => {
    const mod = await import("./registry");
    mod.getLanguageModel();
    mod.getLanguageModel("another");

    expect(createOpenAICompatibleMock).toHaveBeenCalledTimes(1);

    vi.resetModules();
    const mod2 = await import("./registry");
    mod2.getLanguageModel();

    expect(createOpenAICompatibleMock).toHaveBeenCalledTimes(2);
  });

  it("Test 4（PROV-02 面）：导出面只含 getLanguageModel，不外泄 apiKey/provider 客户端", async () => {
    const mod = await import("./registry");

    expect(Object.keys(mod).sort()).toEqual(["getLanguageModel"]);
  });
});
