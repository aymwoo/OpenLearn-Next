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
  lessonAuthoringSource: string;
  pluginDataSource: string;
  pluginDalSource: string;
  actionsSource: string;
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
    {
      label: "voting publish blockers remain structured and specific",
      passed:
        sources.dtoSource.includes('"VOTING_PLUGIN_CONFIG_MISSING"') &&
        sources.dtoSource.includes('"VOTING_PLUGIN_CONFIG_INVALID"') &&
        sources.dtoSource.includes('"VOTING_PLUGIN_DISABLED"') &&
        sources.dtoSource.includes('"VOTING_PLUGIN_INCOMPATIBLE"') &&
        sources.lessonAuthoringSource.includes('code: "VOTING_PLUGIN_CONFIG_MISSING"') &&
        sources.lessonAuthoringSource.includes('code: "VOTING_PLUGIN_CONFIG_INVALID"') &&
        sources.lessonAuthoringSource.includes('code: "VOTING_PLUGIN_DISABLED"') &&
        sources.lessonAuthoringSource.includes('code: "VOTING_PLUGIN_INCOMPATIBLE"'),
    },
    {
      label: "publish freeze still writes classroom voting pluginContract into snapshot",
      passed:
        sources.lessonAuthoringSource.includes("function resolveVotingExecutableContract") &&
        sources.lessonAuthoringSource.includes("pluginContract: contract.contract") &&
        sources.lessonAuthoringSource.includes("runtimeContractVersion: \"v2\"") &&
        sources.lessonAuthoringSource.includes("executableConfig: parsedConfig.data"),
    },
    {
      label: "runtime snapshot is derived from DAL-backed plugin extension truth, not draft-only memory",
      passed:
        sources.lessonAuthoringSource.includes("listPluginStepExtensions") &&
        sources.lessonAuthoringSource.includes("extensionByStepId") &&
        sources.lessonAuthoringSource.includes("stepDtos: editor.steps") &&
        sources.pluginDataSource.includes("export async function listPluginStepExtensions") &&
        sources.pluginDataSource.includes("assertTeacherManagerScope") &&
        sources.pluginDataSource.includes("assertPluginBelongsToSchool") &&
        sources.pluginDataSource.includes("pluginLessonStepExtensions"),
    },
    {
      label: "authoring and publish surfaces do not bypass DAL to write plugin extension truth",
      passed:
        !sources.actionsSource.includes("pluginLessonStepExtensions") &&
        !sources.actionsSource.includes("db.query.pluginLessonStepExtensions") &&
        !sources.actionsSource.includes("pluginOwnedBusinessData") &&
        !sources.lessonAuthoringSource.includes("pluginLessonStepExtensions") &&
        !sources.lessonAuthoringSource.includes("db.query.pluginLessonStepExtensions") &&
        !sources.lessonAuthoringSource.includes("pluginOwnedBusinessData") &&
        sources.lessonAuthoringSource.includes("listPluginStepExtensions") &&
        sources.pluginDataSource.includes("from(pluginLessonStepExtensions)"),
    },
  ];
}

function main() {
  console.log("==================================================");
  console.log("Starting Phase 56 voting authoring verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const dtoSource = read("src/lib/dto/lesson-authoring.ts");
  const lessonAuthoringSource = read("src/lib/dal/lesson-authoring.ts");
  const pluginDataSource = read("src/lib/dal/plugin-data.ts");
  const pluginDalSource = read("src/lib/dal/plugins.ts");
  const actionsSource = read("src/actions/lesson-authoring-actions.ts");

  const staticChecks = evaluatePhase56StaticChecks({
    packageSource,
    dtoSource,
    lessonAuthoringSource,
    pluginDataSource,
    pluginDalSource,
    actionsSource,
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
