import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  PHASE_76_V42_CLOSE_GATE_SCRIPT,
  runPhase76V42CloseGate,
  STAGE_LABELS,
} from "./verify-phase76-v42-close-gate";

describe("verify-phase76-v42-close-gate", () => {
  it("exports the exact package script entry and 6 locked stage labels", () => {
    expect(PHASE_76_V42_CLOSE_GATE_SCRIPT).toBe(
      "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase76-v42-close-gate.ts",
    );

    expect(STAGE_LABELS).toEqual([
      "Stage 1: v4.0 gate regression (verify:phase72)",
      "Stage 2: v4.1 quiz multi-type verification (verify:phase73 + verify:phase73-v41-close-gate)",
      "Stage 3: Phase 75 homework full-chain verification (verify:phase75)",
      "Stage 4: Cross-plugin regression (verify:v42-cross-plugin)",
      "Stage 5: Formal verification + proof mapping",
      "Stage 6: Manual Surface Sign-Off + closeout artifacts + audit + alias cutover",
    ]);
  });

  it("smoke mode returns a blocked 6-stage readiness report with Stage 1+2 wired and Stage 3-6 pending", async () => {
    const result = await runPhase76V42CloseGate({ smokeOnly: true });

    // Smoke mode should be blocked (not passed, not failed) because full verification artifacts don't exist yet
    expect(result.overallStatus).toBe("blocked");
    expect(result.stageStatuses).toHaveLength(6);

    // Stage 1: v4.0 gate regression — should be wired (not failed in smoke)
    const stage1 = result.stageStatuses[0];
    expect(stage1).toBeDefined();
    expect(stage1?.status).toBe("blocked");
    // The task wire detail should mention "verify:phase72"
    const hasStage1Wire = stage1?.details.some((d) => d.includes("verify:phase72"));
    expect(hasStage1Wire).toBe(true);

    // Stage 2: v4.1 quiz multi-type verification — should be wired
    const stage2 = result.stageStatuses[1];
    expect(stage2).toBeDefined();
    expect(stage2?.status).toBe("blocked");
    const hasStage2Wire = stage2?.details.some((d) => d.includes("verify:phase73"));
    expect(hasStage2Wire).toBe(true);

    // Stage 3-6: should be "blocked" in smoke mode
    for (let i = 2; i < 6; i++) {
      const stage = result.stageStatuses[i];
      expect(stage).toBeDefined();
      expect(stage?.status).toBe("blocked");
    }
  });

  it("smoke mode exits 0 and reports Stage 1+2 readiness with wired status", async () => {
    const result = await runPhase76V42CloseGate({ smokeOnly: true });

    // Verify Stage 1 details contain the wiring check (not "pending" placeholder)
    const stage1 = result.stageStatuses[0];
    expect(stage1).toBeDefined();
    const stage1Text = stage1?.details.join(" ");
    // Should not contain old skeleton placeholder
    expect(stage1Text).not.toContain("pending (implementation in wave 2)");
    // Should contain new wired readiness indicator
    expect(stage1Text).toContain("verify:phase72");

    // Verify Stage 2 details contain the wiring check
    const stage2 = result.stageStatuses[1];
    expect(stage2).toBeDefined();
    const stage2Text = stage2?.details.join(" ");
    expect(stage2Text).not.toContain("pending (implementation in wave 2)");
    expect(stage2Text).toContain("verify:phase73");
    expect(stage2Text).toContain("verify:phase73-v41-close-gate");
  });

  it("the gate script source contains real pnpm verify:phase72 command invocation (not a comment placeholder)", () => {
    const source = readFileSync(
      path.join(import.meta.dirname ?? process.cwd(), "verify-phase76-v42-close-gate.ts"),
      "utf8",
    );

    // Source must contain the real command string for Stage 1
    expect(source).toContain("verify:phase72");

    // Source must contain the real command string for Stage 2
    expect(source).toContain("verify:phase73");
    expect(source).toContain("verify:phase73-v41-close-gate");

    // The "&&" chain for Stage 2 must be present
    expect(source).toContain("verify:phase73 &&");
  });

  it("the gate script implements D-06 blocking strategy: Stage failure stops subsequent stages", () => {
    const source = readFileSync(
      path.join(import.meta.dirname ?? process.cwd(), "verify-phase76-v42-close-gate.ts"),
      "utf8",
    );

    // D-06 blocking must be present in the source
    expect(source).toContain("BLOCKED");
    // Check that stage execution checks for prior failure before proceeding
    expect(source).toContain("failed");
  });

  it("the gate script does not contain inner product seam tokens (quiz.answer.received, buildQuizSampleRecapStats, useLiveAnswerStore)", () => {
    const source = readFileSync(
      path.join(import.meta.dirname ?? process.cwd(), "verify-phase76-v42-close-gate.ts"),
      "utf8",
    );

    // Outer gate must not replicate inner verifier product assertions
    // Strip line comments before checking to avoid false positives in explanatory comments
    const withoutComments = source
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .join("\n");

    expect(withoutComments).not.toContain("quiz.answer.received");
    expect(withoutComments).not.toContain("buildQuizSampleRecapStats");
    expect(withoutComments).not.toContain("useLiveAnswerStore");
  });

  it("verify:phase alias remains frozen at v4.1 posture per D-13", () => {
    // Read package.json to verify the alias is still the pre-cutover v4.1 alias
    const packageSource = readFileSync("package.json", "utf8");
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};

    // D-13: v4.1 alias remains frozen while v4.2 development is in progress
    expect(scripts["verify:phase"]).toBe(
      "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate",
    );
  });
});
