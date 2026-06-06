import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

const PHASE_72_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase72-close-gate.ts";

function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
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
    console.error(`Phase 72 verification failed while running: ${label}`);
    throw error;
  }
}

function verifyPackageScripts(packageSource: string): StaticCheck[] {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};

    return [
      {
        label: "package.json exposes phase67 migration-proof runner",
        passed: scripts["verify:phase67"]?.includes("scripts/verify-phase67-plugin-owned-data.ts") ?? false,
      },
      {
        label: "package.json exposes phase68 governed-access runner",
        passed: scripts["verify:phase68"]?.includes("scripts/verify-phase68-data-access-verbs.ts") ?? false,
      },
      {
        label: "package.json exposes phase69 quiz-sample runner",
        passed: scripts["verify:phase69"]?.includes("scripts/verify-phase69-quiz-sample.ts") ?? false,
      },
      {
        label: "package.json exposes phase70 stats recap runner",
        passed: scripts["verify:phase70"]?.includes("scripts/verify-phase70-quiz-stats.ts") ?? false,
      },
      {
        label: "package.json exposes phase71 marketplace lifecycle runner",
        passed: scripts["verify:phase71"]?.includes("scripts/verify-phase71-marketplace-lifecycle.ts") ?? false,
      },
      {
        label: "package.json exposes exact verify:phase72 script",
        passed: scripts["verify:phase72"] === PHASE_72_VERIFY_SCRIPT,
      },
      {
        label: "package.json routes verify:phase alias to phase72",
        passed: scripts["verify:phase"] === "pnpm verify:phase72",
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON with required verify scripts",
        passed: false,
      },
    ];
  }
}

function main() {
  console.log("==================================================");
  console.log("Phase 72 end-to-end close-gate verification starting...");
  console.log("(v4.0 authoritative chain: Phase 67 -> 68 -> 69 -> 70 -> 71)");
  console.log("==================================================");

  console.log("[1/6] Static script wiring checks...");
  const staticChecks = verifyPackageScripts(read("package.json"));
  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }
  console.log(`  ✓ All ${staticChecks.length} script wiring checks passed.`);

  console.log("\n[2/6] Running Phase 67 migration-proof gate...");
  run("pnpm", ["verify:phase67"], "Phase 67 migration-proof gate");

  console.log("\n[3/6] Running Phase 68 governed-access gate...");
  run("pnpm", ["verify:phase68"], "Phase 68 governed-access gate");

  console.log("\n[4/6] Running Phase 69 quiz sample chain gate...");
  run("pnpm", ["verify:phase69"], "Phase 69 quiz sample chain gate");

  console.log("\n[5/6] Running Phase 70 stats recap gate...");
  run("pnpm", ["verify:phase70"], "Phase 70 stats recap gate");

  console.log("\n[6/6] Running Phase 71 marketplace lifecycle gate...");
  run("pnpm", ["verify:phase71"], "Phase 71 marketplace lifecycle gate");

  console.log("\n==================================================");
  console.log("Phase 72 end-to-end close-gate verification passed.");
  console.log("==================================================");
}

main();
