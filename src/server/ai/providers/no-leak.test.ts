import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（registry.test.ts:4 先例）。
vi.mock("server-only", () => ({}));

/**
 * no-leak —— PROV-02 / T-61-key-leak 的「可证明不泄漏」静态 + 行为双证。
 *
 * A 组（import 图边界，纯静态、不执行 provider 代码）：
 *   扫描三类**绝不可触达 server-only provider** 的文件集合 ——
 *   ① 任何 `"use client"` 文件；② `src/proxy.ts` 与所有 `runtime = "edge"` route；
 *   ③ 所有 `plugins/` 目录下模块 —— 断言它们**均不 import** `server/ai/providers`
 *   （`@/` 别名或相对路径皆算）。命中即 fail 并打印文件名。
 *
 * B 组（返回面无凭证，行为）：
 *   mock 掉限流/装配/AI SDK，令 generate 返回**故意掺入 apiKey/baseURL/sk- 的污染包**，
 *   断言 facade 只外发纯 text/object，深 walk 返回值找不到任何凭证字面值。
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
// providers → ai → server → src
const SRC_ROOT = join(HERE, "..", "..", "..");

/** 递归收集 src 下所有 .ts/.tsx 源文件（跳过 d.ts 与 __fixtures__ 无关项保留）。 */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** 去除行注释/块注释行后的有效代码行（grep gate hygiene：避免注释误计）。 */
function codeLines(content: string): string[] {
  return content.split("\n").filter((line) => {
    const t = line.trim();
    return t.length > 0 && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
  });
}

/** 文件是否 import 了 server/ai/providers（别名或相对路径皆算）。 */
function importsProvider(content: string): boolean {
  const PROVIDER_SPEC = /server\/ai\/providers/;
  // import ... from "..."; / import("..."); / require("...")
  const SPEC_RE = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;
  for (const line of codeLines(content)) {
    let m: RegExpExecArray | null;
    SPEC_RE.lastIndex = 0;
    while ((m = SPEC_RE.exec(line)) !== null) {
      if (PROVIDER_SPEC.test(m[1])) return true;
    }
  }
  return false;
}

const ALL_FILES = collectSourceFiles(SRC_ROOT);

describe("no-leak A 组 — import 图边界：client/edge/plugin 不得 import provider（PROV-02 / T-61-key-leak）", () => {
  const provView = (f: string) =>
    relative(SRC_ROOT, f).replace(/\\/g, "/");

  // 把每个文件读一次，按三类目标集合分类。
  const records = ALL_FILES.map((f) => ({
    file: f,
    rel: provView(f),
    content: readFileSync(f, "utf8"),
  }));

  // provider 自身目录的文件不在目标集合内（它们本就是 server-only 内部）。
  const isProviderInternal = (rel: string) =>
    rel.startsWith("server/ai/providers/");

  it("① 所有 \"use client\" 文件均不 import provider", () => {
    const offenders = records
      .filter((r) => !isProviderInternal(r.rel))
      .filter((r) => /^\s*["']use client["']/m.test(r.content))
      .filter((r) => importsProvider(r.content))
      .map((r) => r.rel);
    expect(offenders, `client 文件泄漏 import provider: ${offenders.join(", ")}`).toEqual([]);
  });

  it("② src/proxy.ts 与所有 runtime=\"edge\" route 均不 import provider", () => {
    const edgeFiles = records
      .filter((r) => !isProviderInternal(r.rel))
      .filter(
        (r) =>
          r.rel === "proxy.ts" ||
          /export\s+const\s+runtime\s*=\s*["']edge["']/.test(r.content),
      );
    // 至少覆盖到 proxy.ts（防呆：目标集合非空，避免「扫了个寂寞」）。
    expect(edgeFiles.some((r) => r.rel === "proxy.ts")).toBe(true);

    const offenders = edgeFiles
      .filter((r) => importsProvider(r.content))
      .map((r) => r.rel);
    expect(offenders, `edge/proxy 文件泄漏 import provider: ${offenders.join(", ")}`).toEqual([]);
  });

  it("③ 所有 plugins/ 目录下模块均不 import provider", () => {
    const pluginFiles = records
      .filter((r) => !isProviderInternal(r.rel))
      .filter((r) => /(^|\/)plugins\//.test(r.rel));
    // 防呆：仓库确有 plugins 目录，目标集合应非空。
    expect(pluginFiles.length).toBeGreaterThan(0);

    const offenders = pluginFiles
      .filter((r) => importsProvider(r.content))
      .map((r) => r.rel);
    expect(offenders, `plugin 模块泄漏 import provider: ${offenders.join(", ")}`).toEqual([]);
  });
});

// ── B 组：返回面无凭证（行为证）─────────────────────────────────────────────
const { generateTextMock, generateObjectMock, enforceRateLimitMock, getLanguageModelMock } =
  vi.hoisted(() => ({
    generateTextMock: vi.fn(),
    generateObjectMock: vi.fn(),
    enforceRateLimitMock: vi.fn(),
    getLanguageModelMock: vi.fn(),
  }));

vi.mock("ai", async (importActual) => {
  const actual = await importActual<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock, generateObject: generateObjectMock };
});
vi.mock("./rate-limit", () => ({ enforceRateLimit: enforceRateLimitMock }));
vi.mock("./registry", () => ({ getLanguageModel: getLanguageModelMock }));

const LEAK_API_KEY = "sk-leak-supersecret";
const LEAK_BASE_URL = `https://upstream.invalid/v1?key=${LEAK_API_KEY}`;

/** 深度遍历任意值，收集所有字符串（key 与 value 均纳入）。 */
function collectStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string") {
    acc.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, acc);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      acc.push(k);
      collectStrings(v, acc);
    }
  }
  return acc;
}

/** 断言一个返回值深 walk 后不含任何凭证特征。 */
function expectNoCredential(returned: unknown): void {
  const strings = collectStrings(returned);
  const blob = strings.join("\u0000");
  expect(blob).not.toContain(LEAK_API_KEY);
  expect(blob).not.toContain("sk-");
  expect(blob.toLowerCase()).not.toContain("authorization");
  expect(blob).not.toContain(LEAK_BASE_URL);
}

describe("no-leak B 组 — facade 返回面深 walk 无凭证（PROV-02 / T-61-key-leak）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue(undefined);
    getLanguageModelMock.mockReturnValue({ id: "m" });
  });

  it("aiGenerateText：generate 返回掺凭证污染包，facade 只外发纯 text", async () => {
    const { aiGenerateText } = await import("./facade");
    // 污染包：除 text 外掺入 apiKey/baseURL/Authorization —— facade 必须只取 text。
    generateTextMock.mockResolvedValue({
      text: "干净的模型文本输出",
      apiKey: LEAK_API_KEY,
      baseURL: LEAK_BASE_URL,
      response: { headers: { Authorization: `Bearer ${LEAK_API_KEY}` } },
    });

    const out = await aiGenerateText({ teacherId: "t1", prompt: "hi" });

    expect(out).toBe("干净的模型文本输出");
    expectNoCredential(out);
  });

  it("aiGenerateObject：generate 返回掺凭证污染包，facade 只外发纯 object", async () => {
    const { z } = await import("zod");
    const { aiGenerateObject } = await import("./facade");
    generateObjectMock.mockResolvedValue({
      object: { title: "教案", steps: ["导入", "讲授"] },
      apiKey: LEAK_API_KEY,
      baseURL: LEAK_BASE_URL,
      providerMetadata: { auth: `Bearer ${LEAK_API_KEY}` },
    });

    const out = await aiGenerateObject({
      teacherId: "t1",
      prompt: "p",
      schema: z.object({ title: z.string(), steps: z.array(z.string()) }),
    });

    expect(out).toEqual({ title: "教案", steps: ["导入", "讲授"] });
    expectNoCredential(out);
  });
});
