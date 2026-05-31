import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type Phase56StaticSources = {
  packageSource: string;
  dtoSource: string;
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
    console.error(`Phase 56 verification failed while running: ${label}`);
    throw error;
  }
}

export function withPhase56VitestEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...env,
    NODE_ENV: "test",
  } satisfies NodeJS.ProcessEnv;
}

function runVitest(paths: readonly string[], label: string) {
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  const args = ["--run", "--testTimeout=20000", ...paths];
  const env = withPhase56VitestEnv();

  if (existsSync(localBin)) {
    try {
      const output = execFileSync(localBin, args, {
        stdio: "pipe",
        encoding: "utf8",
        env,
      });
      if (output) process.stdout.write(output);
      return;
    } catch (error: unknown) {
      const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
      const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
      if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
      if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
      console.error(`Phase 56 verification failed while running: ${label}`);
      throw error;
    }
  }

  try {
    const output = execFileSync("pnpm", ["exec", "vitest", ...args], {
      stdio: "pipe",
      encoding: "utf8",
      env,
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 56 verification failed while running: ${label}`);
    throw error;
  }
}

export function verifyPhase56PackageScript(packageSource: string): boolean {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return (
      pkg.scripts?.["verify:phase56"] ===
      "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase56-voting-authoring.ts"
    );
  } catch {
    return false;
  }
}

function countCoreStepTypes(dtoSource: string) {
  const match = dtoSource.match(/const builtInTeachingStepKeys = \[([\s\S]*?)\] as const/);
  const unionMatch = dtoSource.match(/export const LessonStepDTOSchema = z\.object\([\s\S]*?type: z\.enum\(\[([\s\S]*?)\]\)/);

  const discriminated = dtoSource.match(/export const lessonStepPayloadSchema = z\.discriminatedUnion\("type", \[([\s\S]*?)\]\)/);

  return {
    builtInKeysPresent: Boolean(match),
    lessonStepTypeCount: unionMatch
      ? unionMatch[1].split(",").map((item) => item.trim()).filter(Boolean).length
      : 0,
    discriminatedVariantCount: discriminated
      ? discriminated[1].split(",").map((item) => item.trim()).filter((item) => item.endsWith("PayloadSchema")).length
      : 0,
  };
}

export function getPhase56VerificationSuitePaths() {
  return [
    "src/components/authoring/lesson-step-editor.test.tsx",
    "src/components/authoring/lesson-authoring-workspace.test.tsx",
    "src/lib/dal/plugins.builtins.test.ts",
    "src/lib/dal/lesson-authoring.test.ts",
    "src/actions/lesson-authoring-actions.test.ts",
    "src/components/authoring/authoring-status-panel.test.tsx",
  ] as const;
}

export function evaluatePhase56StaticChecks(sources: Phase56StaticSources): StaticCheck[] {
  const typeCounts = countCoreStepTypes(sources.dtoSource);

  return [
    {
      label: "package.json exposes exact verify:phase56 script",
      passed: verifyPhase56PackageScript(sources.packageSource),
    },
    {
      label: "phase 56 keeps exactly three core step DTO types",
      passed: typeCounts.lessonStepTypeCount === 3,
    },
    {
      label: "phase 56 keeps exactly three discriminated payload variants",
      passed: typeCounts.discriminatedVariantCount === 3,
    },
  ];
}

function main() {
  console.log("==================================================");
  console.log("Starting Phase 56 voting authoring verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const dtoSource = read("src/lib/dto/lesson-authoring.ts");

  const staticChecks = evaluatePhase56StaticChecks({
    packageSource,
    dtoSource,
  });

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log("  ✓ Static boundary checks passed.");

  console.log("\n[2/2] Running focused Phase 56 suites...");
  runVitest([...getPhase56VerificationSuitePaths()], "Phase 56 voting authoring regression suite");

  console.log("\nPhase 56 verification complete.");
  console.log("==================================================");
  console.log("Phase 56 voting authoring verification successfully PASSED!");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main();
}
