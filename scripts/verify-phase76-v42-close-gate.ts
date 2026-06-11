import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type CheckStatus = "passed" | "blocked" | "failed";

type StaticCheck = {
  label: string;
  passed: boolean;
  blocked?: boolean;
};

export type StageStatus = {
  label: string;
  status: CheckStatus;
  details: string[];
};

type GateResult = {
  overallStatus: CheckStatus;
  stageStatuses: StageStatus[];
};

export const PHASE_76_V42_CLOSE_GATE_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase76-v42-close-gate.ts";

// D-01: 6-stage authoritative close gate for v4.2 milestone
export const STAGE_LABELS = [
  "Stage 1: v4.0 gate regression (verify:phase72)",
  "Stage 2: v4.1 quiz multi-type verification (verify:phase73 + verify:phase73-v41-close-gate)",
  "Stage 3: Phase 75 homework full-chain verification (verify:phase75)",
  "Stage 4: Cross-plugin regression (verify:v42-cross-plugin)",
  "Stage 5: Formal verification + proof mapping",
  "Stage 6: Manual Surface Sign-Off + closeout artifacts + audit + alias cutover",
] as const;

// D-13: v4.1 alias remains frozen while v4.2 development is in progress
const LEGAL_PRE_CUTOVER_ALIAS = "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate";
// D-02: post-cutover v4.2 alias — applied only in Stage 6
const V42_POST_CUTOVER_ALIAS =
  "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate && pnpm verify:phase75 && pnpm verify:v42-cross-plugin";

// Stage 5 artifact paths — formal verification + proof mapping
const FORMAL_VERIFICATION_PATHS = {
  verification:
    ".planning/phases/76-v4-2-authoritative-close-gate/76-VERIFICATION.md",
  proofMap:
    ".planning/milestones/v4.2-PROOF-MAP.md",
} as const;

// Stage 6 artifact paths — manual sign-off + closeout artifacts + audit
const CLOSEOUT_PATHS = {
  manualSignoff:
    ".planning/phases/76-v4-2-authoritative-close-gate/76-MANUAL-SIGNOFF.md",
  milestoneAudit:
    ".planning/milestones/v4.2-MILESTONE-AUDIT.md",
  closeout:
    ".planning/milestones/v4.2-CLOSEOUT.md",
} as const;

function read(filePath: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function nonCommentIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token);
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }
  let count = 0;
  let cursor = 0;
  while (true) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) {
      return count;
    }
    count += 1;
    cursor = found + needle.length;
  }
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? "test",
      },
    });
    if (output) {
      process.stdout.write(output);
    }
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    throw new Error(`Phase 76 v4.2 close gate failed while running: ${label}`);
  }
}

function summariseStage(label: string, checks: StaticCheck[], smokeOnly: boolean): StageStatus {
  const failedChecks = checks.filter((check) => !check.passed);
  const status: CheckStatus =
    failedChecks.length === 0
      ? "passed"
      : smokeOnly && failedChecks.every((check) => check.blocked)
        ? "blocked"
        : "failed";

  return {
    label,
    status,
    details: checks.map((check) => {
      const icon = check.passed ? "✓" : check.blocked ? "↺" : "✗";
      const suffix = !check.passed && check.blocked ? " [readiness blocked]" : "";
      return `- ${icon} ${check.label}${suffix}`;
    }),
  };
}

function reportStage(stage: StageStatus) {
  const icon = stage.status === "passed" ? "✓" : stage.status === "blocked" ? "↺" : "❌";
  const heading = stage.status === "passed" ? "passed" : stage.status === "blocked" ? "blocked" : "failed";
  console.log(`  ${icon} ${stage.label} (${heading})`);
  for (const detail of stage.details) {
    console.log(`     ${detail}`);
  }
}

// ─── Stage 1: v4.0 gate regression ────────────────────────────────────────
// Wired: pnpm verify:phase72

function verifyStage1V40Regression(smokeOnly: boolean): StaticCheck[] {
  const packageSource = read("package.json");
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    return [
      {
        label: "verify:phase72 script is registered in package.json",
        passed: typeof scripts["verify:phase72"] === "string" && scripts["verify:phase72"].length > 0,
      },
      {
        label: "verify:phase72 entry references the canonical close-gate script",
        passed: nonCommentIncludes(scripts["verify:phase72"] ?? "", "scripts/verify-phase72-close-gate.ts"),
      },
      {
        label: "Stage 1: pnpm verify:phase72 — wired (skipped in smoke, executes in full mode)",
        passed: !smokeOnly,
        blocked: smokeOnly,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON for Stage 1 checks",
        passed: false,
      },
    ];
  }
}

async function runStage1V40Regression(): Promise<StageStatus> {
  console.log("    EXECUTING: pnpm verify:phase72...");
  try {
    run("pnpm", ["verify:phase72"], "Stage 1: v4.0 gate regression (verify:phase72)");
    return {
      label: STAGE_LABELS[0],
      status: "passed",
      details: ["- ✓ Stage 1: pnpm verify:phase72 — PASSED"],
    };
  } catch (error) {
    return {
      label: STAGE_LABELS[0],
      status: "failed",
      details: [
        `- ✗ Stage 1: pnpm verify:phase72 — FAILED: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

// ─── Stage 2: v4.1 quiz multi-type verification ──────────────────────────
// Wired: pnpm verify:phase73 && pnpm verify:phase73-v41-close-gate

function verifyStage2V41QuizMultiType(smokeOnly: boolean): StaticCheck[] {
  const packageSource = read("package.json");
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    return [
      {
        label: "verify:phase73 script is registered in package.json",
        passed: typeof scripts["verify:phase73"] === "string" && scripts["verify:phase73"].length > 0,
      },
      {
        label: "verify:phase73-v41-close-gate script is registered in package.json",
        passed: typeof scripts["verify:phase73-v41-close-gate"] === "string" && scripts["verify:phase73-v41-close-gate"].length > 0,
      },
      {
        label: "Stage 2: pnpm verify:phase73 && pnpm verify:phase73-v41-close-gate — wired (skipped in smoke, executes in full mode)",
        passed: !smokeOnly,
        blocked: smokeOnly,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON for Stage 2 checks",
        passed: false,
      },
    ];
  }
}

async function runStage2V41QuizMultiType(): Promise<StageStatus> {
  console.log("    EXECUTING: pnpm verify:phase73...");
  try {
    run("pnpm", ["verify:phase73"], "Stage 2: v4.1 quiz multi-type verification (verify:phase73)");
  } catch (error) {
    return {
      label: STAGE_LABELS[1],
      status: "failed",
      details: [
        `- ✗ Stage 2: pnpm verify:phase73 — FAILED: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  console.log("    EXECUTING: pnpm verify:phase73-v41-close-gate...");
  try {
    run("pnpm", ["verify:phase73-v41-close-gate"], "Stage 2: v4.1 quiz multi-type verification (verify:phase73-v41-close-gate)");
    return {
      label: STAGE_LABELS[1],
      status: "passed",
      details: ["- ✓ Stage 2: pnpm verify:phase73 && pnpm verify:phase73-v41-close-gate — PASSED"],
    };
  } catch (error) {
    return {
      label: STAGE_LABELS[1],
      status: "failed",
      details: [
        `- ✗ Stage 2: pnpm verify:phase73-v41-close-gate — FAILED: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

// ─── Stage 3: Phase 75 homework full-chain verification ──────────────────
// Wired: pnpm verify:phase75

function verifyStage3HomeworkFullChain(smokeOnly: boolean): StaticCheck[] {
  const packageSource = read("package.json");
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const phase75Registered =
      typeof scripts["verify:phase75"] === "string" && scripts["verify:phase75"].length > 0;
    return [
      {
        label: "verify:phase75 script is registered in package.json",
        passed: phase75Registered,
        blocked: !phase75Registered,
      },
      {
        label: `Stage 3: pnpm verify:phase75 — wired (skipped in smoke, executes in full mode)`,
        passed: !smokeOnly,
        blocked: smokeOnly,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON for Stage 3 checks",
        passed: false,
      },
    ];
  }
}

async function runStage3HomeworkFullChain(): Promise<StageStatus> {
  console.log("    EXECUTING: pnpm verify:phase75...");
  try {
    run("pnpm", ["verify:phase75"], "Stage 3: Phase 75 homework full-chain verification (verify:phase75)");
    return {
      label: STAGE_LABELS[2],
      status: "passed",
      details: ["- ✓ Stage 3: pnpm verify:phase75 — PASSED"],
    };
  } catch (error) {
    return {
      label: STAGE_LABELS[2],
      status: "failed",
      details: [
        `- ✗ Stage 3: pnpm verify:phase75 — FAILED: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

// ─── Stage 4: Cross-plugin regression ────────────────────────────────────
// Wired: pnpm verify:v42-cross-plugin
// D-04: quiz full suite + homework full suite, independent runs & reports
// D-05: dedicated cross-plugin regression script, orchestrating quiz + homework
// D-06: any sub-suite failure blocks gate execution

function verifyStage4CrossPluginRegression(smokeOnly: boolean): StaticCheck[] {
  const packageSource = read("package.json");
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const crossPluginRegistered =
      typeof scripts["verify:v42-cross-plugin"] === "string" && scripts["verify:v42-cross-plugin"].length > 0;
    const crossPluginScriptExists = existsSync(
      path.join(process.cwd(), "scripts", "verify-v42-cross-plugin.ts"),
    );
    return [
      {
        label: "verify:v42-cross-plugin script is registered in package.json",
        passed: crossPluginRegistered,
        blocked: !crossPluginRegistered,
      },
      {
        label: "scripts/verify-v42-cross-plugin.ts exists",
        passed: crossPluginScriptExists,
        blocked: !crossPluginScriptExists,
      },
      {
        label: "Stage 4: pnpm verify:v42-cross-plugin — wired (skipped in smoke, executes in full mode)",
        passed: !smokeOnly,
        blocked: smokeOnly,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON for Stage 4 checks",
        passed: false,
      },
    ];
  }
}

async function runStage4CrossPluginRegression(): Promise<StageStatus> {
  console.log("    EXECUTING: pnpm verify:v42-cross-plugin...");
  try {
    run("pnpm", ["verify:v42-cross-plugin"], "Stage 4: Cross-plugin regression (verify:v42-cross-plugin)");
    return {
      label: STAGE_LABELS[3],
      status: "passed",
      details: ["- ✓ Stage 4: pnpm verify:v42-cross-plugin — PASSED"],
    };
  } catch (error) {
    return {
      label: STAGE_LABELS[3],
      status: "failed",
      details: [
        `- ✗ Stage 4: pnpm verify:v42-cross-plugin — FAILED: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

// ─── Stage 5: Formal verification + proof mapping ────────────────────────
// Full implementation in wave 5 (plan 05).
// Artifact paths:
//   - .planning/phases/76-v4-2-authoritative-close-gate/76-VERIFICATION.md
//   - .planning/milestones/v4.2-PROOF-MAP.md
// D-09: VERIFICATION.md structure follows Phase 74 7-section template
// D-11: proof mapping traces requirement → plan → commit → test

function verifyStage5FormalVerification(smokeOnly: boolean): StaticCheck[] {
  const verificationSource = read(FORMAL_VERIFICATION_PATHS.verification);
  const proofMapSource = read(FORMAL_VERIFICATION_PATHS.proofMap);

  if (smokeOnly) {
    return [
      {
        label: `verification path constant is wired: ${FORMAL_VERIFICATION_PATHS.verification}`,
        passed: FORMAL_VERIFICATION_PATHS.verification.length > 0,
      },
      {
        label: `proof-map path constant is wired: ${FORMAL_VERIFICATION_PATHS.proofMap}`,
        passed: FORMAL_VERIFICATION_PATHS.proofMap.length > 0,
      },
      {
        label: "future formal verification artifact presence is tracked as readiness, not a smoke hard-fail",
        passed: verificationSource.length > 0 && proofMapSource.length > 0,
        blocked: true,
      },
    ];
  }

  return [
    {
      label: `${FORMAL_VERIFICATION_PATHS.verification} exists (formal verification report)`,
      passed: verificationSource.length > 0,
    },
    {
      label: `${FORMAL_VERIFICATION_PATHS.proofMap} exists (requirement → plan → commit → test traceability)`,
      passed: proofMapSource.length > 0,
    },
  ];
}

// ─── Stage 6: Manual Surface Sign-Off + closeout artifacts + audit + alias cutover ──
// Full implementation in wave 6 (plan 06).
// Artifact paths:
//   - .planning/phases/76-v4-2-authoritative-close-gate/76-MANUAL-SIGNOFF.md
//   - .planning/milestones/v4.2-MILESTONE-AUDIT.md
//   - .planning/milestones/v4.2-CLOSEOUT.md
// D-07: 8-row sign-off ledger (4 quiz + 4 homework)
// D-08: each row requires status: passed + date + signer
// D-10: v4.2 milestone audit framework
// D-02: post-cutover alias applied here

function verifyStage6SignoffCloseout(smokeOnly: boolean): StaticCheck[] {
  const manualSignoffSource = read(CLOSEOUT_PATHS.manualSignoff);
  const milestoneAuditSource = read(CLOSEOUT_PATHS.milestoneAudit);
  const closeoutSource = read(CLOSEOUT_PATHS.closeout);
  const packageSource = read("package.json");

  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const alias = scripts["verify:phase"] ?? "";

    if (smokeOnly) {
      return [
        {
          label: `manual signoff path constant is wired: ${CLOSEOUT_PATHS.manualSignoff}`,
          passed: CLOSEOUT_PATHS.manualSignoff.length > 0,
        },
        {
          label: `milestone audit path constant is wired: ${CLOSEOUT_PATHS.milestoneAudit}`,
          passed: CLOSEOUT_PATHS.milestoneAudit.length > 0,
        },
        {
          label: `closeout path constant is wired: ${CLOSEOUT_PATHS.closeout}`,
          passed: CLOSEOUT_PATHS.closeout.length > 0,
        },
        {
          label:
            "verify:phase alias currently remains in the frozen v4.1 posture (per D-13)",
          passed: alias === LEGAL_PRE_CUTOVER_ALIAS,
        },
        {
          label: "future closeout artifact presence is tracked as readiness, not a smoke hard-fail",
          passed:
            manualSignoffSource.length > 0
            && milestoneAuditSource.length > 0
            && closeoutSource.length > 0,
          blocked: true,
        },
      ];
    }

    return [
      {
        label: `${CLOSEOUT_PATHS.manualSignoff} exists (8-row sign-off ledger per D-07/D-08)`,
        passed: manualSignoffSource.length > 0,
      },
      {
        label: `${CLOSEOUT_PATHS.milestoneAudit} exists (v4.2 audit framework per D-10)`,
        passed: milestoneAuditSource.length > 0,
      },
      {
        label: `${CLOSEOUT_PATHS.closeout} exists (closeout summary per D-11)`,
        passed: closeoutSource.length > 0,
      },
      {
        label: "verify:phase alias has been cut over to v4.2 composite alias (per D-02)",
        passed: alias === V42_POST_CUTOVER_ALIAS,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON for Stage 6 checks",
        passed: false,
      },
    ];
  }
}

// ─── Main gate entry point ────────────────────────────────────────────────

export async function runPhase76V42CloseGate(options?: { smokeOnly?: boolean }): Promise<GateResult> {
  const smokeOnly = options?.smokeOnly ?? process.argv.includes("--smoke");

  console.log("===============================================================");
  console.log(`Phase 76 v4.2 authoritative close-gate verification (${smokeOnly ? "smoke" : "full"}) starting...`);
  console.log("(D-01: 6-stage authoritative close gate for v4.2 milestone)");
  console.log("(D-03: 6-wave/6-plan structure — gate skeleton → verification stages → formal → sign-off)");
  console.log("(D-06: sequential stage execution — any stage failure blocks all subsequent stages)");
  console.log("===============================================================");

  const stageStatuses: StageStatus[] = [];

  // ── Stage 1: v4.0 gate regression ──
  console.log(`\n[1/6] ${STAGE_LABELS[0]}...`);
  if (smokeOnly) {
    const stage1 = summariseStage(STAGE_LABELS[0], verifyStage1V40Regression(smokeOnly), smokeOnly);
    stageStatuses.push(stage1);
    reportStage(stage1);
  } else {
    const stage1 = await runStage1V40Regression();
    stageStatuses.push(stage1);
    reportStage(stage1);
    // D-06: Stage 1 failure blocks all subsequent stages
    if (stage1.status === "failed") {
      stageStatuses.push({ label: STAGE_LABELS[1], status: "blocked", details: ["- ↺ BLOCKED by Stage 1 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[2], status: "blocked", details: ["- ↺ BLOCKED by Stage 1 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[3], status: "blocked", details: ["- ↺ BLOCKED by Stage 1 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[4], status: "blocked", details: ["- ↺ BLOCKED by Stage 1 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[5], status: "blocked", details: ["- ↺ BLOCKED by Stage 1 failure"] });
      reportBlockedStages(1);
      return summaryReport(stageStatuses, "failed");
    }
  }

  // ── Stage 2: v4.1 quiz multi-type verification ──
  console.log(`\n[2/6] ${STAGE_LABELS[1]}...`);
  if (smokeOnly) {
    const stage2 = summariseStage(STAGE_LABELS[1], verifyStage2V41QuizMultiType(smokeOnly), smokeOnly);
    stageStatuses.push(stage2);
    reportStage(stage2);
  } else {
    const stage2 = await runStage2V41QuizMultiType();
    stageStatuses.push(stage2);
    reportStage(stage2);
    // D-06: Stage 2 failure blocks all subsequent stages
    if (stage2.status === "failed") {
      stageStatuses.push({ label: STAGE_LABELS[2], status: "blocked", details: ["- ↺ BLOCKED by Stage 2 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[3], status: "blocked", details: ["- ↺ BLOCKED by Stage 2 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[4], status: "blocked", details: ["- ↺ BLOCKED by Stage 2 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[5], status: "blocked", details: ["- ↺ BLOCKED by Stage 2 failure"] });
      reportBlockedStages(2);
      return summaryReport(stageStatuses, "failed");
    }
  }

  // ── Stage 3: Phase 75 homework full-chain verification ──
  console.log(`\n[3/6] ${STAGE_LABELS[2]}...`);
  if (smokeOnly) {
    const stage3 = summariseStage(STAGE_LABELS[2], verifyStage3HomeworkFullChain(smokeOnly), smokeOnly);
    stageStatuses.push(stage3);
    reportStage(stage3);
  } else {
    const stage3 = await runStage3HomeworkFullChain();
    stageStatuses.push(stage3);
    reportStage(stage3);
    // D-06: Stage 3 failure blocks all subsequent stages
    if (stage3.status === "failed") {
      stageStatuses.push({ label: STAGE_LABELS[3], status: "blocked", details: ["- ↺ BLOCKED by Stage 3 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[4], status: "blocked", details: ["- ↺ BLOCKED by Stage 3 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[5], status: "blocked", details: ["- ↺ BLOCKED by Stage 3 failure"] });
      reportBlockedStages(3);
      return summaryReport(stageStatuses, "failed");
    }
  }

  // ── Stage 4: Cross-plugin regression ──
  console.log(`\n[4/6] ${STAGE_LABELS[3]}...`);
  if (smokeOnly) {
    const stage4 = summariseStage(STAGE_LABELS[3], verifyStage4CrossPluginRegression(smokeOnly), smokeOnly);
    stageStatuses.push(stage4);
    reportStage(stage4);
  } else {
    const stage4 = await runStage4CrossPluginRegression();
    stageStatuses.push(stage4);
    reportStage(stage4);
    // D-06: Stage 4 failure blocks all subsequent stages
    if (stage4.status === "failed") {
      stageStatuses.push({ label: STAGE_LABELS[4], status: "blocked", details: ["- ↺ BLOCKED by Stage 4 failure"] });
      stageStatuses.push({ label: STAGE_LABELS[5], status: "blocked", details: ["- ↺ BLOCKED by Stage 4 failure"] });
      reportBlockedStages(4);
      return summaryReport(stageStatuses, "failed");
    }
  }

  // ── Stage 5: Formal verification + proof mapping ──
  console.log(`\n[5/6] ${STAGE_LABELS[4]}...`);
  const stage5 = summariseStage(STAGE_LABELS[4], verifyStage5FormalVerification(smokeOnly), smokeOnly);
  stageStatuses.push(stage5);
  reportStage(stage5);

  // ── Stage 6: Manual Surface Sign-Off + closeout + audit + alias cutover ──
  console.log(`\n[6/6] ${STAGE_LABELS[5]}...`);
  const stage6 = summariseStage(STAGE_LABELS[5], verifyStage6SignoffCloseout(smokeOnly), smokeOnly);
  stageStatuses.push(stage6);
  reportStage(stage6);

  const overallStatus: CheckStatus = smokeOnly
    ? stageStatuses.some((stage) => stage.status === "failed")
      ? "failed"
      : stageStatuses.some((stage) => stage.status === "blocked")
        ? "blocked"
        : "passed"
    : stageStatuses.every((stage) => stage.status === "passed")
      ? "passed"
      : "failed";

  return summaryReport(stageStatuses, overallStatus);
}

function reportBlockedStages(fromStage: number) {
  for (let i = fromStage + 1; i <= 6; i++) {
    console.log(`\n[${i}/6] ${STAGE_LABELS[i - 1]}...`);
    console.log(`  ↺ BLOCKED — upstream stage ${fromStage} failure stopped gate execution (D-06)`);
  }
}

function summaryReport(stageStatuses: StageStatus[], overallStatus: CheckStatus): GateResult {
  console.log("\n===============================================================");
  console.log(
    `Phase 76 v4.2 authoritative close-gate verification ${overallStatus}.`,
  );
  const totalChecks = stageStatuses.reduce((acc, s) => acc + s.details.length, 0);
  console.log(`  ${stageStatuses.length} stages, ${totalChecks} checks`);
  console.log(
    `  Passed: ${stageStatuses.filter((s) => s.status === "passed").length}, ` +
    `Blocked: ${stageStatuses.filter((s) => s.status === "blocked").length}, ` +
    `Failed: ${stageStatuses.filter((s) => s.status === "failed").length}`,
  );
  console.log("===============================================================");

  return {
    overallStatus,
    stageStatuses,
  };
}

// CLI entry — run when executed directly (not imported)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase76V42CloseGate().then((result) => {
    if (result.overallStatus === "failed") {
      process.exit(1);
    }
    process.exit(0);
  }).catch((error) => {
    console.error("Unhandled close-gate error:", error);
    process.exit(1);
  });
}
