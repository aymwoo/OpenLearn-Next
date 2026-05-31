import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（providers/no-leak.test.ts:8 先例）。
vi.mock("server-only", () => ({}));

/**
 * no-leak A 组 —— AGENT-02 / T-62-05 的「边界静态可证」。
 *
 * 照搬 providers/no-leak.test.ts A 组结构，把目标 spec 从 `server/ai/providers`
 * 换成 `server/ai/tools`：扫描三类**绝不可触达 server-only tool 层**的文件集合 ——
 *   ① 任何 `"use client"` 文件；② `src/proxy.ts` 与所有 `runtime = "edge"` route；
 *   ③ 所有 `plugins/` 目录下模块 —— 断言它们**均不 import** `server/ai/tools`
 *   （`@/` 别名或相对路径皆算）。命中即 fail 并打印文件名。
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
// tools → ai → server → src
const SRC_ROOT = join(HERE, "..", "..", "..");

/** 递归收集 src 下所有 .ts/.tsx 源文件（跳过 d.ts）。 */
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

/** 文件是否 import 了 server/ai/tools（别名或相对路径皆算）。 */
function importsTools(content: string): boolean {
  const TOOLS_SPEC = /server\/ai\/tools/;
  // import ... from "..."; / import("..."); / require("...")
  const SPEC_RE = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;
  for (const line of codeLines(content)) {
    let m: RegExpExecArray | null;
    SPEC_RE.lastIndex = 0;
    while ((m = SPEC_RE.exec(line)) !== null) {
      if (TOOLS_SPEC.test(m[1])) return true;
    }
  }
  return false;
}

const ALL_FILES = collectSourceFiles(SRC_ROOT);

describe("no-leak A 组 — import 图边界：client/edge/plugin 不得 import server/ai/tools（AGENT-02 / T-62-05）", () => {
  const toolsView = (f: string) => relative(SRC_ROOT, f).replace(/\\/g, "/");

  // 把每个文件读一次，按三类目标集合分类。
  const records = ALL_FILES.map((f) => ({
    file: f,
    rel: toolsView(f),
    content: readFileSync(f, "utf8"),
  }));

  // tools 自身目录的文件不在目标集合内（它们本就是 server-only 内部）。
  const isToolsInternal = (rel: string) => rel.startsWith("server/ai/tools/");

  it("① 所有 \"use client\" 文件均不 import server/ai/tools", () => {
    const offenders = records
      .filter((r) => !isToolsInternal(r.rel))
      .filter((r) => /^\s*["']use client["']/m.test(r.content))
      .filter((r) => importsTools(r.content))
      .map((r) => r.rel);
    expect(offenders, `client 文件泄漏 import server/ai/tools: ${offenders.join(", ")}`).toEqual([]);
  });

  it("② src/proxy.ts 与所有 runtime=\"edge\" route 均不 import server/ai/tools", () => {
    const edgeFiles = records
      .filter((r) => !isToolsInternal(r.rel))
      .filter(
        (r) =>
          r.rel === "proxy.ts" ||
          /export\s+const\s+runtime\s*=\s*["']edge["']/.test(r.content),
      );
    // 至少覆盖到 proxy.ts（防呆：目标集合非空，避免「扫了个寂寞」）。
    expect(edgeFiles.some((r) => r.rel === "proxy.ts")).toBe(true);

    const offenders = edgeFiles
      .filter((r) => importsTools(r.content))
      .map((r) => r.rel);
    expect(offenders, `edge/proxy 文件泄漏 import server/ai/tools: ${offenders.join(", ")}`).toEqual([]);
  });

  it("③ 所有 plugins/ 目录下模块均不 import server/ai/tools", () => {
    const pluginFiles = records
      .filter((r) => !isToolsInternal(r.rel))
      .filter((r) => /(^|\/)plugins\//.test(r.rel));
    // 防呆：仓库确有 plugins 目录，目标集合应非空。
    expect(pluginFiles.length).toBeGreaterThan(0);

    const offenders = pluginFiles
      .filter((r) => importsTools(r.content))
      .map((r) => r.rel);
    expect(offenders, `plugin 模块泄漏 import server/ai/tools: ${offenders.join(", ")}`).toEqual([]);
  });
});
