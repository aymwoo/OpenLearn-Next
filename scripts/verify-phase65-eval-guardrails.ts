import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function listFiles(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  if (!existsSync(absoluteRoot)) {
    return [];
  }

  const queue = [absoluteRoot];
  const results: string[] = [];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        results.push(path.relative(process.cwd(), fullPath));
      }
    }
  }

  return results;
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 65 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  const args = ["--run", "--testTimeout=20000", ...paths];

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, ...args], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, args, label);
    return;
  }

  run("pnpm", ["exec", "vitest", ...args], label);
}

function verifyPackageScript(packageSource: string): boolean {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return (
      pkg.scripts?.["verify:phase65"] ===
        "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase65-eval-guardrails.ts" &&
      pkg.scripts?.["verify:phase"] === "pnpm verify:phase65"
    );
  } catch {
    return false;
  }
}

function main() {
  console.log("==================================================");
  console.log("Starting Phase 65 Eval + Guardrail Close-Gate Verification...");
  console.log("(v3.2 end-to-end: Phase 61–65 build + static boundaries + regression)");
  console.log("==================================================");

  // ── Read sources once (D-10 ground truth + Phase 61/63/64 contract anchors). ──
  const packageSource = read("package.json");
  const lessonDraftSource = read("src/server/ai/tools/lesson-draft.ts");
  const guardrailsSource = read("src/server/ai/tools/guardrails.ts");
  const guardrailsDtoSource = read("src/lib/dto/draft-guardrails.ts");
  const contractsSource = read("src/features/platform-core/events/contracts.ts");
  const handlerSource = read("src/features/platform-core/commands/handlers/lesson-draft.ts");
  const providersIndexSource = read("src/server/ai/providers/index.ts");
  const facadeSource = read("src/server/ai/providers/facade.ts");

  // Tool-layer combined source — EXCLUDES tests/fixtures (generation-boundary scope).
  const toolLayerSource = listFiles("src/server/ai/tools")
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.includes("__fixtures__"))
    .map(read)
    .join("\n");

  // Agent-layer combined source — DB-dispatch import is legitimate here (see check 5).
  const agentLayerSource = listFiles("src/server/ai/agents")
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map(read)
    .join("\n");

  // DB-schema combined source — scope guard (T-65-GATE-SCOPE).
  const dbSource = listFiles("src/db")
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map(read)
    .join("\n");

  // Extract the tool inputSchema block once for the teacherId-exclusion assertion.
  const inputSchemaBlock =
    lessonDraftSource.match(/draftStepInputSchema\s*=\s*z\.object\(\{([\s\S]*?)\}\)/)?.[1] ?? "";

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase65 + verify:phase alias",
      passed: verifyPackageScript(packageSource),
    },
    {
      label: "[D-10.1] tool inputSchema excludes teacherId (closure-injected)",
      passed: inputSchemaBlock.length > 0 && !/teacherId/.test(inputSchemaBlock),
    },
    {
      label: "[D-10.2] tool generates ONLY via aiGenerateObject (no direct ai generateObject/generateText)",
      // facade form `aiGenerateObject(` has a capital G so the lowercase \b(generateObject|generateText)\b
      // word-boundary pattern below does NOT match it — only a direct lowercase call/import trips.
      passed:
        lessonDraftSource.includes("aiGenerateObject(") &&
        !/\b(generateObject|generateText)\s*\(/.test(lessonDraftSource) &&
        !/import\s*\{[^}]*\b(generateObject|generateText)\b[^}]*\}\s*from\s*["']ai["']/.test(
          lessonDraftSource,
        ),
    },
    {
      label: "[D-10.3a] AI tool layer has no eval / no DB-client import / no provider-key import",
      passed:
        !/\beval\s*\(/.test(toolLayerSource) &&
        !/from\s+["']@\/db["']/.test(toolLayerSource) &&
        !/@libsql\/client|better-sqlite3/.test(toolLayerSource) &&
        !/process\.env\.[A-Z0-9_]*KEY/.test(toolLayerSource),
    },
    {
      // The agent layer LEGITIMATELY `import { db } from "@/db"` to dispatch persisted platform
      // commands, so the DB-client ban is TOOL-scoped per D-10's generation-boundary intent.
      // The agent layer is held only to no-eval + no-provider-key.
      label: "[D-10.3b] AI agent layer has no eval / no provider-key import (DB-dispatch import allowed)",
      passed:
        !/\beval\s*\(/.test(agentLayerSource) &&
        !/process\.env\.[A-Z0-9_]*KEY/.test(agentLayerSource),
    },
    {
      label: "[D-10.4] guardrail validator exists, is server-only and pure",
      passed:
        guardrailsSource.includes("server-only") &&
        guardrailsSource.includes("assertStepWithinGuardrails") &&
        guardrailsSource.includes("FORBIDDEN_MARKERS"),
    },
    {
      // Asserts the reason-code contract module is NOT a server-only module. The DTO prose
      // comments mention "server-only" by name, so assert the absence of the actual
      // `import "server-only"` directive (not a bare substring) to avoid a false-RED.
      label: "guardrail reason-code contract is non-server-only and exports DraftGuardrailRejection",
      passed:
        guardrailsDtoSource.includes("class DraftGuardrailRejection") &&
        !/import\s+["']server-only["']/.test(guardrailsDtoSource),
    },
    {
      label: "draft tool invokes the guardrail before returning the step",
      passed: lessonDraftSource.includes("assertStepWithinGuardrails("),
    },
    {
      // WARNING-1: assert the canonical reasonCode field, NOT reason.
      label: "[D-10.5] lesson.draft.rejected is registered summary-only with the canonical reasonCode field",
      passed:
        contractsSource.includes("lesson.draft.rejected") &&
        contractsSource.includes("LessonDraftRejectedEventSchema") &&
        contractsSource.includes("summaryOnlyStrictPayload") &&
        /reasonCode\s*:/.test(contractsSource),
    },
    {
      label: "handler distinguishes guardrail rejection from real failure",
      passed: handlerSource.includes("instanceof DraftGuardrailRejection"),
    },
    {
      label: "[Phase 61] provider facade is the single server-only generation channel",
      passed:
        /export\s*\{[^}]*aiGenerateObject[^}]*\}\s*from\s*["']\.\/facade["']/.test(
          providersIndexSource,
        ) && facadeSource.includes("server-only"),
    },
    {
      label: "[Phase 63] draft-persist contracts present (produced + persisted)",
      passed:
        contractsSource.includes("lesson.draft.produced") &&
        contractsSource.includes("lesson.draft.persisted"),
    },
    {
      label: "[Phase 64] accept→publish contracts present (accepted + applied + discarded)",
      passed:
        contractsSource.includes("lesson.draft.accepted") &&
        contractsSource.includes("lesson.draft.applied") &&
        contractsSource.includes("lesson.draft.discarded"),
    },
    {
      // T-65-GATE-SCOPE: Phase 65 introduces NO guardrail persistence table.
      label: "[scope guard / T-65-GATE] phase 65 introduces NO guardrail persistence table",
      passed: !/guardrailRejection|draftRejection/i.test(dbSource),
    },
  ];

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log(`  ✓ All ${staticChecks.length} static boundary checks passed.`);

  // ── (a) Build BEFORE the vitest subset (D-08 a). `run` throws on non-zero exit. ──
  console.log("\n[1/2] Running production build (npm run build)...");
  run("npm", ["run", "build"], "Phase 65 close-gate: npm run build");

  // ── (b)+(c) Phase 61–65 end-to-end v3.2 regression subset (D-08 b+c). ──
  console.log("\n[2/2] Running Phase 61–65 v3.2 AI draft-chain regression suite...");
  runVitest(
    [
      // Phase 61 (provider facade)
      "src/server/ai/providers/facade.test.ts",
      "src/server/ai/providers/no-leak.test.ts",
      "src/server/ai/providers/registry.test.ts",
      "src/server/ai/providers/rate-limit.test.ts",
      // Phase 62 (typed tool + agent)
      "src/server/ai/tools/lesson-draft.test.ts",
      "src/server/ai/tools/no-leak.test.ts",
      "src/server/ai/agents/lesson-agent.test.ts",
      // Phase 63 (draft persist)
      "src/lib/dal/lesson-authoring.draft-persist.test.ts",
      "src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts",
      "src/features/platform-core/events/lesson-draft-persisted.contract.test.ts",
      // Phase 64 (review / accept-publish)
      "src/lib/dal/lesson-authoring.draft-review.test.ts",
      "src/actions/lesson-authoring-draft-review-actions.test.ts",
      "src/components/authoring/lesson-draft-review-workspace.test.tsx",
      // Phase 65 (eval / guardrail / events) — (c) EVAL-01 suite is lesson-draft.eval.test.ts
      "src/lib/dto/draft-guardrails.test.ts",
      "src/server/ai/tools/guardrails.test.ts",
      "src/server/ai/tools/lesson-draft.eval.test.ts",
      "src/features/platform-core/events/contracts.test.ts",
      "src/features/platform-core/commands/handlers/lesson-draft.events.test.ts",
    ],
    "Phase 61–65 v3.2 AI draft-chain regression suite",
  );

  console.log("\nPhase 65 verification complete.");
  console.log("==================================================");
  console.log("Phase 65 eval + guardrail close-gate successfully PASSED!");
  console.log("==================================================");
}

main();
