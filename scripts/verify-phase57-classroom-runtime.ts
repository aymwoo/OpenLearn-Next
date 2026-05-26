import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type Phase57StaticSources = {
  packageSource: string;
};

export const PHASE_57_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase57-classroom-runtime.ts";
export const PHASE_57_PROOF_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/proof-phase57-classroom-runtime.ts";

export function getPhase57VerificationSuitePaths() {
  return [
    "src/actions/classroom-actions.test.ts",
    "src/components/classroom/classroom-control-panel.test.tsx",
    "src/features/runtime-platform/classroom/runtime-session.test.ts",
    "src/lib/dal/learning.test.ts",
    "src/components/learning/classroom-runtime-client.test.tsx",
    "src/lib/dal/classroom.test.ts",
    "src/components/classroom/classroom-roster-panel.test.tsx",
  ] as const;
}

export function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
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
    console.error(`Phase 57 verification failed while running: ${label}`);
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

export function verifyPhase57PackageScripts(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return (
      pkg.scripts?.["verify:phase57"] === PHASE_57_VERIFY_SCRIPT
      && pkg.scripts?.["proof:phase57"] === PHASE_57_PROOF_SCRIPT
    );
  } catch {
    return false;
  }
}

export function evaluatePhase57StaticChecks(sources: Phase57StaticSources): StaticCheck[] {
  return [
    {
      label: "package.json exposes exact verify:phase57 and proof:phase57 scripts",
      passed: verifyPhase57PackageScripts(sources.packageSource),
    },
    {
      label: "phase 57 keeps the focused launch/control/submit/result suite list",
      passed: getPhase57VerificationSuitePaths().length === 7,
    },
  ];
}

async function runBrowserProof() {
  const module = await import("./proof-phase57-classroom-runtime");
  await module.runPhase57BrowserProof();
}

export async function runPhase57Verification() {
  console.log("==================================================");
  console.log("Starting Phase 57 classroom runtime verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const staticChecks = evaluatePhase57StaticChecks({ packageSource });
  const failedChecks = staticChecks.filter((check) => !check.passed);

  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log("  ✓ Static boundary checks passed.");

  console.log("\n[1/5] launch readiness gate...");
  runVitest(["src/actions/classroom-actions.test.ts"], "Phase 57 launch readiness gate");

  console.log("\n[2/5] teacher round control gate...");
  runVitest(["src/components/classroom/classroom-control-panel.test.tsx"], "Phase 57 teacher round control gate");

  console.log("\n[3/5] runtime submit policy gate...");
  runVitest(
    [
      "src/features/runtime-platform/classroom/runtime-session.test.ts",
      "src/lib/dal/learning.test.ts",
      "src/components/learning/classroom-runtime-client.test.tsx",
    ],
    "Phase 57 runtime submit policy gate",
  );

  console.log("\n[4/5] teacher result visibility gate...");
  runVitest(
    [
      "src/lib/dal/classroom.test.ts",
      "src/components/classroom/classroom-roster-panel.test.tsx",
    ],
    "Phase 57 teacher result visibility gate",
  );

  console.log("\n[5/5] browser/UAT proof gate...");
  await runBrowserProof();

  console.log("\nPhase 57 verification complete.");
  console.log("==================================================");
  console.log("Phase 57 classroom runtime verification successfully PASSED!");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase57Verification().catch((error) => {
    console.error("Unhandled verification error:", error);
    process.exit(1);
  });
}
