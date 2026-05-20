import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(filePath: string): string {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function run(command: string, args: readonly string[], label: string): void {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 48 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string): void {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, "--run", ...paths], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, ["--run", ...paths], label);
    return;
  }

  run("pnpm", ["exec", "vitest", "--run", ...paths], label);
}

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 48 Close Gate Verification...");
  console.log("==================================================");

  console.log("[1/4] Running static lifecycle and uninstall audit...");
  const packageSource = read("package.json");
  const dalSource = read("src/lib/dal/plugins.ts");
  const actionSource = read("src/actions/plugin-actions.ts");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase48 script",
      passed: packageSource.includes(
        '"verify:phase48": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase48-lifecycle-and-uninstall.ts"',
      ),
    },
    {
      label: "lifecycle transition guard and matrix exist",
      passed:
        dalSource.includes("PLUGIN_LIFECYCLE_TRANSITION_MATRIX") &&
        dalSource.includes("export function assertPluginLifecycleTransition") &&
        dalSource.includes('throw new Error("LIFECYCLE_ILLEGAL_TRANSITION")'),
    },
    {
      label: "transactional lifecycle transition writes transition and audits",
      passed:
        dalSource.includes("export async function transitionPluginLifecycle") &&
        dalSource.includes("await db.transaction(async (tx) =>") &&
        dalSource.includes("tx.insert(pluginLifecycleTransitions)") &&
        dalSource.includes("tx.insert(pluginActionAudits)") &&
        dalSource.includes("tx.insert(governanceAudits)") &&
        dalSource.includes('action: "plugin.lifecycle.transition"'),
    },
    {
      label: "default plugin uninstall is hard blocked in preflight and uninstall",
      passed:
        dalSource.includes('if (plugin.sourceType === "default")') &&
        dalSource.includes('reason: "UNINSTALL_BLOCKED_DEFAULT_PLUGIN"') &&
        dalSource.includes('throw new Error("UNINSTALL_BLOCKED_DEFAULT_PLUGIN")'),
    },
    {
      label: "uninstall path uses transaction and registration delete for cascade cleanup",
      passed:
        dalSource.includes("export async function uninstallPlugin") &&
        dalSource.includes("await db.transaction(async (tx) =>") &&
        dalSource.includes("delete(pluginRegistrations)") &&
        dalSource.includes('action: "plugin.uninstall"'),
    },
    {
      label: "server actions expose preflight and lifecycle transition seams",
      passed:
        actionSource.includes("export async function transitionPluginLifecycleAction") &&
        actionSource.includes("export async function preflightUninstallPluginAction") &&
        actionSource.includes("export async function uninstallPluginAction"),
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
  console.log("  ✓ Lifecycle and uninstall static audit passed.");

  console.log("\n[2/4] Running Phase 48 vitest suites...");
  runVitest(["src/lib/dal/plugins.test.ts", "src/actions/plugin-actions.test.ts"], "Phase 48 Lifecycle & Uninstall Tests");
  console.log("  ✓ Phase 48 vitest suites passed.");

  console.log("\n[3/4] Running cascading regression verifications for Phases 44-47...");
  for (const phase of [44, 45, 46, 47]) {
    run(
      "node",
      [
        "--require",
        "./scripts/server-only-node-shim.cjs",
        "--import",
        "tsx",
        `scripts/verify-phase${phase}${
          phase === 44
            ? "-plugin-identity"
            : phase === 45
              ? "-plugin-schema"
              : phase === 46
                ? "-migration-governance"
                : "-dal-integration"
        }.ts`,
      ],
      `Phase ${phase} Regression`,
    );
  }
  console.log("  ✓ Phases 44-47 regression verification passed.");

  console.log("\n[4/4] Phase 48 close gate complete.");
  console.log("==================================================");
  console.log("🎉 Phase 48 closeout verification successfully PASSED!");
  console.log("- Illegal lifecycle transitions are blocked by the DAL state machine.");
  console.log("- Lifecycle transitions write transition + audit evidence inside one transaction.");
  console.log("- Default plugins are protected from uninstall in preflight and execution.");
  console.log("- Uninstall relies on SQLite cascade cleanup after deleting plugin registration.");
  console.log("==================================================");
}

runVerification().catch((error) => {
  console.error("Unhandled verification error:", error);
  process.exit(1);
});
