import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(filePath: string) {
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
    console.error(`Phase 51 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
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

function verifyPackageScript(packageSource: string): boolean {
  try {
    const pkg = JSON.parse(packageSource);
    const scripts = pkg.scripts || {};
    const script = scripts["verify:phase51"];
    return typeof script === "string" && script.includes("scripts/verify-phase51-command-bus.ts");
  } catch {
    return false;
  }
}

function assertNoLegacyMutationImports(source: string) {
  const importMatch = source.match(/import\s*\{([\s\S]*?)\}\s*from\s+"@\/lib\/dal\/plugins";/);
  const directMutationCalls = [
    /\binstallOrReconcilePlugin\s*\(/,
    /\bregisterPluginManifest\s*\(/,
    /\bsetPluginEnabled\s*\(/,
    /\btransitionPluginLifecycle\s*\(/,
    /\bsetPluginKillSwitch\s*\(/,
    /\bpreflightUninstallPlugin\s*\(/,
    /\buninstallPlugin\s*\(/,
  ];

  if (importMatch) {
    const importedNames = importMatch[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const bannedImports = new Set([
      "installOrReconcilePlugin",
      "registerPluginManifest",
      "setPluginEnabled",
      "transitionPluginLifecycle",
      "setPluginKillSwitch",
      "preflightUninstallPlugin",
      "uninstallPlugin",
    ]);

    if (importedNames.some((name) => bannedImports.has(name))) {
      return false;
    }
  }

  return directMutationCalls.every((pattern) => !pattern.test(source));
}

async function main() {
  console.log("==================================================");
  console.log("Starting Phase 51 Command Bus Verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const actionSource = read("src/actions/plugin-actions.ts");
  const hostSource = read("src/features/runtime-platform/host-actions/plugin-host.ts");
  const bootstrapSource = read("scripts/bootstrap-dev-db.ts");
  const patternsSource = read(".planning/phases/51-command-bus-foundation/51-PATTERNS.md");
  const schemaSource = read("src/db/schema.ts");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase51 script",
      passed: verifyPackageScript(packageSource),
    },
    {
      label: "server actions no longer import legacy plugin mutation DAL helpers",
      passed: assertNoLegacyMutationImports(actionSource),
    },
    {
      label: "plugin host no longer imports legacy mutation seams and enumerates explicit command names",
      passed:
        assertNoLegacyMutationImports(hostSource) &&
        [
          '"plugin.enable"',
          '"plugin.disable"',
          '"plugin.suspend"',
          '"plugin.resume"',
          '"plugin.retry"',
          '"plugin.uninstall.preflight"',
          '"plugin.uninstall"',
          '"plugin.kill_switch.set"',
        ].every((token) => hostSource.includes(token)) &&
        !hostSource.includes("plugin.transition"),
    },
    {
      label: "bootstrap producer migrates to plugin.install and avoids legacy installOrReconcilePlugin seam",
      passed:
        bootstrapSource.includes("producePluginInstallCommand") &&
        bootstrapSource.includes("existingRegistrationId: undefined") &&
        bootstrapSource.includes('installSource: "bootstrap"') &&
        bootstrapSource.includes('installSource: "seed"') &&
        !bootstrapSource.includes("installOrReconcilePlugin(") &&
        !bootstrapSource.includes("plugin.transition"),
    },
    {
      label: "append-only latest indexes no longer use boolean unique constraints",
      passed:
        !schemaSource.includes("taskSubmissions_latest_unique") &&
        !schemaSource.includes("quizAttempts_latest_unique") &&
        !schemaSource.includes("runtimeStepStates_session_latest_unique") &&
        schemaSource.includes("runtimeStepStates_session_latest_idx"),
    },
    {
      label: "pattern map records absence of worker/async plugin governance producers",
      passed:
        patternsSource.includes("did **not** find any current worker / async producer") &&
        patternsSource.includes("scripts/verify-phase51-command-bus.ts"),
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

  console.log("  ✓ Static producer seam checks passed.");

  console.log("\n[2/2] Running focused behavior tests...");
  runVitest([
    "src/features/runtime-platform/host-actions/plugin-host.test.ts",
    "src/features/platform-core/commands/bus.test.ts",
    "src/features/platform-core/commands/handlers/plugins.test.ts",
    "src/actions/plugin-actions.test.ts",
  ], "Phase 51 command bus behavior tests");
  console.log("  ✓ Command bus behavior verified.");

  console.log("\nPhase 51 verification complete.");
  console.log("==================================================");
  console.log("🎉 Phase 51 command bus verification successfully PASSED!");
  console.log("==================================================");
}

void main();
