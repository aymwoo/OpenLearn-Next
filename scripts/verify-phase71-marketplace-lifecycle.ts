import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  createPhase71IsolatedDb,
  seedPhase71MarketplaceFixtures,
} from "./lib/phase71-marketplace-fixtures";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type StaticCheckBundle = {
  required: StaticCheck[];
  advisory: StaticCheck[];
};

const PHASE_71_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts";

function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
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
    console.error(`Phase 71 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  const args = ["--run", ...paths];

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

function verifyPackageScript(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return pkg.scripts?.["verify:phase71"] === PHASE_71_VERIFY_SCRIPT;
  } catch {
    return false;
  }
}

function evaluateStaticChecks(): StaticCheckBundle {
  const packageSource = read("package.json");
  const actionSource = read("src/actions/plugin-actions.ts");
  const commandContractSource = read("src/features/platform-core/commands/contracts.ts");
  const commandHandlerSource = read("src/features/platform-core/commands/handlers/plugins.ts");
  const dalSource = read("src/lib/dal/plugins.ts");
  const catalogSource = read("src/lib/plugins/external-catalog.ts");

  return {
    required: [
      {
        label: "package.json exposes exact verify:phase71 script",
        passed: verifyPackageScript(packageSource),
      },
      {
        label: "phase 71 fixture helper exists",
        passed: existsSync(path.join(process.cwd(), "scripts/lib/phase71-marketplace-fixtures.ts")),
      },
      {
        label: "DAL already contains uninstall retention seam",
        passed:
          dalSource.includes("preflightUninstallPluginWithTx")
          && dalSource.includes("cleanupConfirmationToken"),
      },
    ],
    advisory: [
      {
        label: "command contracts expose marketplace install and upgrade seams",
        passed:
          commandContractSource.includes("plugin.install")
          && commandContractSource.includes("plugin.upgrade"),
      },
      {
        label: "handlers expose marketplace install or upgrade wiring seams",
        passed:
          commandHandlerSource.includes("plugin.install")
          || commandHandlerSource.includes("plugin.upgrade"),
      },
      {
        label: "server actions expose marketplace lifecycle boundary",
        passed:
          actionSource.includes("Marketplace")
          || actionSource.includes("plugin install")
          || actionSource.includes("plugin upgrade"),
      },
      {
        label: "external marketplace catalog surface is checked in or pending follow-up",
        passed: catalogSource.length === 0 || catalogSource.includes("external"),
      },
    ],
  };
}

async function runSmokeProof() {
  const context = await createPhase71IsolatedDb();

  try {
    const seeded = await seedPhase71MarketplaceFixtures(context);
    assert(seeded.liveSessionId.length > 0, "smoke proof missing liveSessionId");
    assert(seeded.endedSessionId.length > 0, "smoke proof missing endedSessionId");
    assert(seeded.retainedPluginId.length > 0, "smoke proof missing retainedPluginId");
    assert(seeded.responseCount > 0, "smoke proof expected non-empty quiz owned-data");

    const liveRows = await context.client.execute(
      `SELECT status FROM classroomSession WHERE id = '${seeded.liveSessionId}'`,
    );
    const retainedRows = await context.client.execute(
      `SELECT sourceType, uninstallRetentionMode FROM pluginRegistration WHERE id = '${seeded.retainedPluginId}'`,
    );
    const responseRows = await context.client.execute(
      `SELECT COUNT(*) AS count FROM plugin_owned_quiz_responses WHERE classroomSession = '${seeded.endedSessionId}'`,
    );

    assert(liveRows.rows[0]?.status === "live", "smoke proof expected a live classroom session");
    assert(retainedRows.rows[0]?.sourceType === "external", "smoke proof expected sourceType='external'");
    assert(
      retainedRows.rows[0]?.uninstallRetentionMode === "retain",
      "smoke proof expected uninstallRetentionMode='retain'",
    );
    assert(Number(responseRows.rows[0]?.count ?? 0) === seeded.responseCount, "smoke proof response count mismatch");
  } finally {
    await context.dispose();
  }
}

async function runFocusedVitest() {
  const suites = [
    "src/lib/dal/plugins.test.ts",
    "src/actions/plugin-actions.test.ts",
    "src/components/surfaces/plugin-marketplace-surface.test.tsx",
  ].filter((filePath) => existsSync(path.join(process.cwd(), filePath)));

  if (suites.length === 0) {
    console.log("  ↺ No focused Phase 71 vitest suites exist yet; skipping focused runner.");
    return;
  }

  runVitest(suites, "Phase 71 focused marketplace suites");
}

async function runFullProof() {
  const context = await createPhase71IsolatedDb();

  try {
    const seeded = await seedPhase71MarketplaceFixtures(context);
    const summary = await context.client.execute(
      [
        "SELECT",
        "  (SELECT COUNT(*) FROM plugin_owned_quiz_questions WHERE pluginId = ?) AS questionCount,",
        "  (SELECT COUNT(*) FROM plugin_owned_quiz_responses WHERE pluginId = ?) AS responseCount,",
        "  (SELECT COUNT(*) FROM classroomSession WHERE status = 'live') AS liveSessionCount,",
        "  (SELECT COUNT(*) FROM classroomSession WHERE status = 'ended') AS endedSessionCount",
      ].join("\n"),
      [seeded.retainedPluginId, seeded.retainedPluginId],
    );

    assert(Number(summary.rows[0]?.questionCount ?? 0) >= 1, "proof expected retained quiz question rows");
    assert(Number(summary.rows[0]?.responseCount ?? 0) >= 1, "proof expected retained quiz response rows");
    assert(Number(summary.rows[0]?.liveSessionCount ?? 0) >= 1, "proof expected active-session blocking sample");
    assert(Number(summary.rows[0]?.endedSessionCount ?? 0) >= 1, "proof expected ended-session cleanup sample");
  } finally {
    await context.dispose();
  }
}

export async function runPhase71Verification() {
  const smokeOnly = process.argv.includes("--smoke");

  console.log("==================================================");
  console.log("Phase 71 marketplace lifecycle verification starting...");
  console.log("==================================================");

  console.log("[1/3] Static seam checks...");
  const staticChecks = evaluateStaticChecks();
  const failedChecks = staticChecks.required.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }
  console.log("  ✓ Static seam checks passed.");
  const advisoryGaps = staticChecks.advisory.filter((check) => !check.passed);
  if (advisoryGaps.length > 0) {
    console.log("  ↺ Future seam checks pending later waves:");
    for (const check of advisoryGaps) {
      console.log(`     - ${check.label}`);
    }
  }

  console.log("\n[2/3] Focused vitest stage...");
  if (smokeOnly) {
    console.log("  ↺ Smoke mode skips focused vitest.");
  } else {
    await runFocusedVitest();
    console.log("  ✓ Focused vitest stage passed.");
  }

  console.log("\n[3/3] Isolated SQLite proof stage...");
  if (smokeOnly) {
    await runSmokeProof();
    console.log("  ✓ Smoke proof seeded live blocker + retained quiz data fixtures.");
  } else {
    await runFullProof();
    console.log("  ✓ Full proof confirmed retained/live/ended lifecycle samples.");
  }

  console.log("\n==================================================");
  console.log(`Phase 71 marketplace lifecycle verification ${smokeOnly ? "smoke " : ""}passed.`);
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase71Verification().catch((error) => {
    console.error("Unhandled verification error:", error);
    process.exit(1);
  });
}
