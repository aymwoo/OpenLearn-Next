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
    console.error(`Phase 53 verification failed while running: ${label}`);
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
    const script = scripts["verify:phase53"];
    return typeof script === "string" && script.includes("scripts/verify-phase53-platform-events.ts");
  } catch {
    return false;
  }
}

function readTargetSources() {
  const roots = [
    "src/features/platform-core/events",
    "src/features/platform-core/commands",
    "src/features/platform-core/observability",
  ];

  return roots
    .flatMap((root) => listFiles(root))
    .filter(
      (filePath) =>
        (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) &&
        !filePath.endsWith(".test.ts") &&
        !filePath.endsWith(".test.tsx"),
    )
    .map((filePath) => ({
      filePath,
      source: read(filePath),
    }));
}

function main() {
  console.log("==================================================");
  console.log("Starting Phase 53 Platform Event Verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const contractsSource = read("src/features/platform-core/events/contracts.ts");
  const futureBridgesSource = read("src/features/platform-core/events/adapters/future-bridges.ts");
  const sources = readTargetSources();
  const combinedSource = sources.map((entry) => entry.source).join("\n");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase53 script",
      passed: verifyPackageScript(packageSource),
    },
    {
      label: "phase 53 sources do not reuse runtimeEventOutbox or runtime event bus truth",
      passed:
        !combinedSource.includes("runtimeEventOutbox") &&
        !combinedSource.includes("runtime-platform/seams/event-bus"),
    },
    {
      label: "phase 53 does not introduce a noisy platform.cache.invalidation event family",
      passed: !contractsSource.includes("platform.cache.invalidation"),
    },
    {
      label: "future bridges do not claim redis or websocket as source of truth",
      passed:
        !/sourceOfTruth\s*:\s*"redis/i.test(futureBridgesSource) &&
        !/sourceOfTruth\s*:\s*"websocket/i.test(futureBridgesSource),
    },
    {
      label: "phase 53 surfaces do not leak phase 54 descriptor or capability vocabulary",
      passed:
        !/\bdescriptor\b/i.test(combinedSource) &&
        !/\bcapability\b/i.test(combinedSource) &&
        !/\bdelegation\b/i.test(combinedSource),
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

  console.log("  ✓ Static boundary checks passed.");

  console.log("\n[2/2] Running focused Phase 53 tests...");
  runVitest(
    [
      "src/features/platform-core/events/contracts.test.ts",
      "src/features/platform-core/events/ledger.test.ts",
      "src/features/platform-core/commands/handlers/plugins.events.test.ts",
      "src/features/platform-core/commands/bus.test.ts",
      "src/features/platform-core/commands/producers/plugin-governance.test.ts",
      "src/features/platform-core/events/bus.test.ts",
      "src/features/platform-core/events/adapters.test.ts",
      "src/features/platform-core/observability/operator-read-model.test.ts",
    ],
    "Phase 53 platform event regression suite",
  );

  console.log("\nPhase 53 verification complete.");
  console.log("==================================================");
  console.log("Phase 53 platform event verification successfully PASSED!");
  console.log("==================================================");
}

main();
