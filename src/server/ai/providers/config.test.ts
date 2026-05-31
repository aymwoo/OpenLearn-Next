import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（classroom.test.ts:39 先例）。
vi.mock("server-only", () => ({}));

/** 备份并清理本测试关心的 env，避免污染其他用例。 */
const ENV_KEYS = [
  "OPENAI_COMPAT_BASE_URL",
  "OPENAI_COMPAT_API_KEY",
  "OPENAI_COMPAT_MODEL",
  "OPENAI_COMPAT_NAME",
] as const;

const saved: Record<string, string | undefined> = {};

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

/** 递归收集对象所有 key（防止嵌套泄漏 Authorization/headers 等字段）。 */
function collectKeys(obj: unknown, acc: Set<string> = new Set()): Set<string> {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      acc.add(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}

describe("getProviderConfig — server-only env 读取收口（PROV-02）", () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    vi.resetModules();
    clearEnv();
  });

  afterEach(() => {
    clearEnv();
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  });

  it("Test 1: 配齐 baseURL/apiKey/modelId 时返回约定对象，providerName 默认 openai-compatible", async () => {
    process.env.OPENAI_COMPAT_BASE_URL = "https://api.example.com/v1";
    process.env.OPENAI_COMPAT_API_KEY = "sk-test";
    process.env.OPENAI_COMPAT_MODEL = "gpt-4o-mini";

    const { getProviderConfig } = await import("./config");

    expect(getProviderConfig()).toEqual({
      baseURL: "https://api.example.com/v1",
      apiKey: "sk-test",
      modelId: "gpt-4o-mini",
      providerName: "openai-compatible",
    });
  });

  it("Test 1b: OPENAI_COMPAT_NAME 显式给定时透传", async () => {
    process.env.OPENAI_COMPAT_BASE_URL = "https://api.example.com/v1";
    process.env.OPENAI_COMPAT_API_KEY = "sk-test";
    process.env.OPENAI_COMPAT_MODEL = "gpt-4o-mini";
    process.env.OPENAI_COMPAT_NAME = "my-provider";

    const { getProviderConfig } = await import("./config");

    expect(getProviderConfig().providerName).toBe("my-provider");
  });

  it.each([
    ["OPENAI_COMPAT_API_KEY"],
    ["OPENAI_COMPAT_BASE_URL"],
    ["OPENAI_COMPAT_MODEL"],
  ])("Test 2: 缺 %s 时抛 AI_PROVIDER_NOT_CONFIGURED", async (missing) => {
    process.env.OPENAI_COMPAT_BASE_URL = "https://api.example.com/v1";
    process.env.OPENAI_COMPAT_API_KEY = "sk-test";
    process.env.OPENAI_COMPAT_MODEL = "gpt-4o-mini";
    delete process.env[missing];

    const { getProviderConfig } = await import("./config");

    expect(() => getProviderConfig()).toThrow("AI_PROVIDER_NOT_CONFIGURED");
  });

  it("Test 3（PROV-02 返回面）：返回对象只含 4 个约定字段，无 Authorization/headers 等泄漏", async () => {
    process.env.OPENAI_COMPAT_BASE_URL = "https://api.example.com/v1";
    process.env.OPENAI_COMPAT_API_KEY = "sk-test";
    process.env.OPENAI_COMPAT_MODEL = "gpt-4o-mini";

    const { getProviderConfig } = await import("./config");

    const keys = collectKeys(getProviderConfig());
    expect([...keys].sort()).toEqual(
      ["apiKey", "baseURL", "modelId", "providerName"].sort(),
    );
  });
});
