/**
 * TDD RED — Task 1: verify-v42-cross-plugin 跨插件回归脚本
 *
 * 验证 D-04/D-05/D-06 要求：
 *   - 脚本包含三个 sub-suite 的 section header
 *   - 脚本源码包含正确的 vitest run 命令
 *   - --smoke 模式 exit 0 且不执行真实 vitest
 *   - 脚本文件存在且可解析为 TypeScript
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "verify-v42-cross-plugin.ts",
);

function readScriptSource(): string {
  return existsSync(SCRIPT_PATH) ? readFileSync(SCRIPT_PATH, "utf8") : "";
}

const SHIM = "./scripts/server-only-node-shim.cjs";

describe("verify:v42-cross-plugin — file existence", () => {
  it("脚本文件 scripts/verify-v42-cross-plugin.ts 存在", () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it("脚本文件不是空的", () => {
    const source = readScriptSource();
    expect(source.length).toBeGreaterThan(0);
  });
});

describe("verify:v42-cross-plugin — three sub-suite section headers", () => {
  it("源码包含 QUIZ FULL SUITE section header", () => {
    const source = readScriptSource();
    expect(source).toContain("QUIZ FULL SUITE");
  });

  it("源码包含 HOMEWORK FULL SUITE section header", () => {
    const source = readScriptSource();
    expect(source).toContain("HOMEWORK FULL SUITE");
  });

  it("源码包含 CROSS-PLUGIN DEDICATED SUITE section header", () => {
    const source = readScriptSource();
    expect(source).toContain("CROSS-PLUGIN DEDICATED SUITE");
  });
});

describe("verify:v42-cross-plugin — vitest commands", () => {
  it("源码包含 quiz 全量测试命令: vitest run src/components/learning/quiz-sample-step-card.test.tsx", () => {
    const source = readScriptSource();
    expect(source).toContain(
      "vitest run src/components/learning/quiz-sample-step-card.test.tsx",
    );
  });

  it("源码包含 homework 全量测试命令: vitest run src/plugins/homework/", () => {
    const source = readScriptSource();
    expect(source).toContain(
      "vitest run src/plugins/homework/",
    );
  });

  it("源码包含 dedicated cross-plugin suite 命令: vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts", () => {
    const source = readScriptSource();
    expect(source).toContain(
      "vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts",
    );
  });
});

describe("verify:v42-cross-plugin — smoke mode", () => {
  it("--smoke 模式 exit code 为 0", () => {
    const output = execFileSync("node", [
      "--require",
      SHIM,
      "--import",
      "tsx",
      SCRIPT_PATH,
      "--smoke",
    ], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    });

    expect(output).toContain("STAGE 4 CROSS-PLUGIN REGRESSION");
  });

  it("--smoke 模式输出三段 sub-suite wiring status", () => {
    const output = execFileSync("node", [
      "--require",
      SHIM,
      "--import",
      "tsx",
      SCRIPT_PATH,
      "--smoke",
    ], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    });

    expect(output).toContain("QUIZ FULL SUITE");
    expect(output).toContain("HOMEWORK FULL SUITE");
    expect(output).toContain("CROSS-PLUGIN DEDICATED SUITE");
  });

  it("--smoke 模式不执行真实 vitest 命令（不应该包含 vitest run 输出特征）", () => {
    const output = execFileSync("node", [
      "--require",
      SHIM,
      "--import",
      "tsx",
      SCRIPT_PATH,
      "--smoke",
    ], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    });

    // Smoke 模式不执行 vitest，所以不应该有 "Tests " 输出
    expect(output).not.toContain("Tests ");
    // Smoke 模式应该输出 wiring status 报告
    expect(output).toContain("wired");
  });
});

describe("verify:v42-cross-plugin — D-04/D-05 blocking strategy", () => {
  it("脚本源码包含每个 sub-suite 的 exit code 检查或 shell && 链（阻断策略）", () => {
    const source = readScriptSource();
    const hasAndChain = source.includes("&&");
    const hasTryCatch = source.includes("try") && source.includes("catch");
    expect(hasAndChain || hasTryCatch).toBe(true);
  });

  it("脚本源码包含 PASSED/FAILED 输出逻辑", () => {
    const source = readScriptSource();
    expect(source).toContain("PASSED");
    expect(source).toContain("FAILED");
  });

  it("脚本源码包含 ALL PASSED 最终汇总输出", () => {
    const source = readScriptSource();
    expect(source).toContain("ALL PASSED");
  });
});
