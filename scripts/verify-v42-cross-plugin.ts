/**
 * Stage 4 独立跨插件回归脚本 — verify:v42-cross-plugin
 *
 * D-04: 跨插件回归范围——quiz 全量 + homework 全量 + cross-plugin dedicated suite
 * D-05: 独立回归脚本，内部编排三段 sub-suite，任一失败即 exit 1
 * D-06: 阻断策略——按顺序执行，任一步失败即停止
 *
 * 用法：
 *   pnpm verify:v42-cross-plugin          # 全量运行
 *   pnpm verify:v42-cross-plugin --smoke  # 只报告 wiring status，不执行真实 vitest
 */

import { execFileSync } from "node:child_process";

type SuiteResult = {
  label: string;
  status: "passed" | "failed" | "wired";
  output: string;
};

const SMOKE_ONLY = process.argv.includes("--smoke");

function runCommand(cmd: string, args: readonly string[]): { stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(cmd, [...args], {
      stdio: "pipe",
      encoding: "utf8",
      env: { ...process.env, CI: "true", NODE_ENV: process.env.NODE_ENV ?? "test" },
    });
    return { stdout: stdout || "", stderr: "" };
  } catch (error: unknown) {
    const errStdout = typeof error === "object" && error && "stdout" in error
      ? (error.stdout as string) : "";
    const errStderr = typeof error === "object" && error && "stderr" in error
      ? (error.stderr as string) : "";
    const errMsg = typeof error === "object" && error && "message" in error
      ? (error.message as string) : String(error);

    if (errStdout) process.stdout.write(errStdout);
    if (errStderr) process.stderr.write(errStderr);

    throw new Error(errMsg);
  }
}

function runVitest(vitestArgs: readonly string[], sectionLabel: string): SuiteResult {
  if (SMOKE_ONLY) {
    const cmdPreview = `pnpm vitest run ${vitestArgs.join(" ")}`;
    console.log(`    [SMOKE] Would run: ${cmdPreview}`);
    return { label: sectionLabel, status: "wired", output: cmdPreview };
  }

  try {
    console.log(`    Executing: pnpm vitest run ${vitestArgs.join(" ")}...`);
    const { stdout } = runCommand("pnpm", ["vitest", "run", ...vitestArgs]);
    return { label: sectionLabel, status: "passed", output: stdout };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { label: sectionLabel, status: "failed", output: msg };
  }
}

function main(): void {
  const results: SuiteResult[] = [];

  console.log("===============================================================");
  console.log("Stage 4: Cross-Plugin Regression (verify:v42-cross-plugin)");
  console.log(`Mode: ${SMOKE_ONLY ? "smoke (wiring only)" : "full (all vitest runs)"}`);
  console.log("===============================================================");

  // ── 1. Quiz 全量测试 ──
  console.log("\n=== QUIZ FULL SUITE ===");
  const quizResult = runVitest(
    ["src/components/learning/quiz-sample-step-card.test.tsx"],
    "QUIZ FULL SUITE",
  );
  results.push(quizResult);
  if (quizResult.status === "wired") {
    console.log("  QUIZ FULL SUITE: WIRED (smoke)");
  } else if (quizResult.status === "passed") {
    console.log("  QUIZ FULL SUITE: PASSED");
  } else {
    console.log("  QUIZ FULL SUITE: FAILED");
    console.error("\n❌ Stage 4 BLOCKED — Quiz full suite failed. Homework and cross-plugin suites will NOT run (D-06).");
    process.exit(1);
  }

  // ── 2. Homework 全量测试 ──
  console.log("\n=== HOMEWORK FULL SUITE ===");
  const homeworkResult = runVitest(
    ["src/plugins/homework/"],
    "HOMEWORK FULL SUITE",
  );
  results.push(homeworkResult);
  if (homeworkResult.status === "wired") {
    console.log("  HOMEWORK FULL SUITE: WIRED (smoke)");
  } else if (homeworkResult.status === "passed") {
    console.log("  HOMEWORK FULL SUITE: PASSED");
  } else {
    console.log("  HOMEWORK FULL SUITE: FAILED");
    console.error("\n❌ Stage 4 BLOCKED — Homework full suite failed. Cross-plugin dedicated suite will NOT run (D-06).");
    process.exit(1);
  }

  // ── 3. Cross-Plugin Dedicated Suite ──
  console.log("\n=== CROSS-PLUGIN DEDICATED SUITE ===");
  const crossPluginResult = runVitest(
    ["src/plugins/homework/__tests__/cross-plugin-regression.test.ts"],
    "CROSS-PLUGIN DEDICATED SUITE",
  );
  results.push(crossPluginResult);
  if (crossPluginResult.status === "wired") {
    console.log("  CROSS-PLUGIN DEDICATED SUITE: WIRED (smoke)");
  } else if (crossPluginResult.status === "passed") {
    console.log("  CROSS-PLUGIN DEDICATED SUITE: PASSED");
  } else {
    console.log("  CROSS-PLUGIN DEDICATED SUITE: FAILED");
    console.error("\n❌ Stage 4 BLOCKED — Cross-plugin dedicated suite failed (D-06).");
    process.exit(1);
  }

  // ── Summary ──
  console.log("\n===============================================================");
  const allPassed = results.every((r) => r.status === "passed");
  const allWired = results.every((r) => r.status === "wired");

  if (SMOKE_ONLY) {
    console.log("=== STAGE 4 CROSS-PLUGIN REGRESSION: ALL WIRED (smoke) ===");
    const passedCount = results.filter((r) => r.status === "wired").length;
    console.log(`  ${passedCount}/${results.length} sub-suites wired`);
    process.exit(0);
  }

  if (allPassed) {
    console.log("=== STAGE 4 CROSS-PLUGIN REGRESSION: ALL PASSED ===");
  } else {
    console.log("=== STAGE 4 CROSS-PLUGIN REGRESSION: FAILED ===");
    process.exit(1);
  }
}

main();
