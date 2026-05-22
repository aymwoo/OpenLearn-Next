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
    console.error(`Phase 54 verification failed while running: ${label}`);
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
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return (
      pkg.scripts?.["verify:phase54"] ===
      "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase54-ai-contracts.ts"
    );
  } catch {
    return false;
  }
}

function readPhase54Sources() {
  const roots = ["src/features/platform-core/ai-contracts", "src/components/surfaces"];

  return roots
    .flatMap((root) => listFiles(root))
    .filter(
      (filePath) =>
        (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) &&
        !filePath.endsWith(".test.ts") &&
        !filePath.endsWith(".test.tsx"),
    )
    .map((filePath) => ({ filePath, source: read(filePath) }));
}

function main() {
  console.log("==================================================");
  console.log("Starting Phase 54 AI Contract Verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const settingsSurfaceSource = read("src/components/surfaces/settings-surface.tsx");
  const delegationSource = read("src/features/platform-core/ai-contracts/delegation.ts");
  const registrySource = read("src/features/platform-core/ai-contracts/registry.ts");
  const combinedSource = readPhase54Sources()
    .map((entry) => entry.source)
    .join("\n");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase54 script",
      passed: verifyPackageScript(packageSource),
    },
    {
      label: "settings labs surface exposes a minimal ai discoverability panel",
      passed:
        settingsSurfaceSource.includes("AI Contract Discoverability") &&
        settingsSurfaceSource.includes("最小 discoverability surface") &&
        settingsSurfaceSource.includes("readPlatformAiDescriptorCatalog") &&
        settingsSurfaceSource.includes("delegationPosture") &&
        settingsSurfaceSource.includes("approvalPosture"),
    },
    {
      label: "action descriptors do not reclaim authority from source descriptors",
      passed:
        registrySource.includes("sourceDescriptor") &&
        !registrySource.includes("executionAuthority") &&
        !registrySource.includes("actorScope"),
    },
    {
      label: "delegated metadata preserves delegated-no-elevation posture",
      passed:
        delegationSource.includes("delegated-no-elevation") &&
        !/authorityPosture:\s*["'`]elevated/.test(delegationSource),
    },
    {
      label: "phase 54 surface does not creep into full runtime scope",
      passed:
        !/Agent Runtime/i.test(combinedSource) &&
        !/Skill Runtime/i.test(combinedSource) &&
        !/Workflow Engine/i.test(combinedSource) &&
        !/full Agent console/i.test(combinedSource),
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

  console.log("\n[2/2] Running focused Phase 54 tests...");
  runVitest(
    [
      "src/features/platform-core/ai-contracts/contracts.test.ts",
      "src/features/platform-core/ai-contracts/registry.test.ts",
      "src/features/platform-core/ai-contracts/read-model.test.ts",
      "src/features/platform-core/ai-contracts/delegation.test.ts",
      "src/components/surfaces/settings-surface.test.tsx",
    ],
    "Phase 54 ai contract regression suite",
  );

  console.log("\nPhase 54 verification complete.");
  console.log("==================================================");
  console.log("Phase 54 AI contract verification successfully PASSED!");
  console.log("==================================================");
}

main();
