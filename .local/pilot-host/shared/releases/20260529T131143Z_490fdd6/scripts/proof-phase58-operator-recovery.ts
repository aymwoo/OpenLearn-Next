import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type ProofScenario = {
  id: string;
  title: string;
  suites: readonly string[];
  requiredTokens: readonly string[];
};

export const PHASE58_PROOF_SCENARIOS: readonly ProofScenario[] = [
  {
    id: "plugin-failure-walkthrough",
    title: "plugin failure walkthrough",
    suites: [
      "src/components/surfaces/classroom-incident-operator-surface.test.tsx",
      "src/actions/operator-classroom-recovery-actions.test.ts",
      "src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx",
    ],
    requiredTokens: [
      "ClassroomIncidentOperatorSurface",
      "runOperatorClassroomRecoveryAction",
      "toPluginLifecycleHonestyCard",
      "recommendedRecoveryAction",
    ],
  },
  {
    id: "transport-worker-degraded-walkthrough",
    title: "transport / worker degraded walkthrough",
    suites: [
      "src/components/surfaces/settings-surface.test.tsx",
      "src/components/classroom/classroom-control-panel.test.tsx",
      "src/components/surfaces/runtime-inspector-surface.test.tsx",
      "src/components/surfaces/async-task-operator-surface.test.tsx",
      "src/features/async-tasks/server/recovery.test.ts",
    ],
    requiredTokens: [
      "ClassroomIncidentListSurface",
      "RuntimeInspectorSurface",
      "AsyncTaskOperatorSurface",
      "当前仅保证本实例课堂同步",
      "toRuntimeInspectorHonestyCard",
      "toAsyncTaskOperatorHonestyCard",
    ],
  },
] as const;

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
    console.error(`Phase 58 proof failed while running: ${label}`);
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

function assertIncludesAll(source: string, tokens: readonly string[], label: string) {
  const missing = tokens.filter((token) => !source.includes(token));
  if (missing.length > 0) {
    throw new Error(`${label} missing tokens: ${missing.join(", ")}`);
  }
}

export async function runPhase58Proof() {
  console.log("==================================================");
  console.log("Starting Phase 58 operator walkthrough proof...");
  console.log("==================================================");

  const runbookSource = read(
    ".planning/phases/58-operator-recovery-and-production-surfaces/58-OPERATOR-RUNBOOK.md",
  );
  const proofInventorySource = read(
    ".planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md",
  );
  const recoveryMatrixSource = read(
    ".planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md",
  );
  const incidentSurfaceSource = read("src/components/surfaces/classroom-incident-operator-surface.tsx");
  const pluginSurfaceSource = read("src/components/surfaces/plugin-lifecycle-operator-surface.tsx");
  const runtimeInspectorSource = read("src/components/surfaces/runtime-inspector-surface.tsx");
  const asyncOperatorSource = read("src/components/surfaces/async-task-operator-surface.tsx");
  const classroomShellSource = read("src/components/classroom/classroom-control-panel.tsx");
  const settingsSurfaceSource = read("src/components/surfaces/settings-surface.tsx");

  assertIncludesAll(runbookSource, [
    "55-PROOF-INVENTORY.md",
    "55-FAILURE-RECOVERY-MATRIX.md",
    "plugin failure",
    "transport / worker degraded",
    "无需 DB surgery",
  ], "runbook excerpt");
  assertIncludesAll(proofInventorySource, [
    "operator walkthrough for one plugin failure and one transport/worker failure",
    "support-facing runbook excerpt for classroom voting incident handling",
    "evidence that no DB surgery is required for standard recovery paths",
  ], "Phase 55 proof inventory");
  assertIncludesAll(recoveryMatrixSource, [
    "plugin disabled or incompatible",
    "transport degraded or reconnect issue",
    "worker backlog or retry failure",
  ], "Phase 55 failure recovery matrix");
  assertIncludesAll(settingsSurfaceSource, [
    "ClassroomIncidentListSurface",
    "incident-first fallback entry",
  ], "settings labs incident-first source");
  assertIncludesAll(pluginSurfaceSource, ["PluginLifecycleOperatorSurface"], "plugin governance source");
  assertIncludesAll(classroomShellSource, [
    "查看课堂事件",
    "resume、suspend、fallback 需前往课堂事件或 detail surface 进行强确认",
  ], "classroom shell source");

  for (const scenario of PHASE58_PROOF_SCENARIOS) {
    console.log(`\n[proof] ${scenario.id}: ${scenario.title}`);
    const scenarioSource = scenario.id === "plugin-failure-walkthrough"
      ? `${incidentSurfaceSource}\n${pluginSurfaceSource}`
      : `${settingsSurfaceSource}\n${runtimeInspectorSource}\n${asyncOperatorSource}\n${classroomShellSource}`;

    assertIncludesAll(scenarioSource, scenario.requiredTokens, scenario.id);
    runVitest(scenario.suites, `Phase 58 ${scenario.id}`);
  }

  console.log("\nPhase 58 walkthrough proof complete.");
  console.log("==================================================");
  console.log("Phase 58 operator walkthrough proof PASSED!");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase58Proof().catch((error) => {
    console.error("Phase 58 walkthrough proof failed:", error);
    process.exit(1);
  });
}
