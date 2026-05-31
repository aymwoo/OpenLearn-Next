import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type Phase58StaticSources = {
  packageSource: string;
  settingsSurfaceSource: string;
  settingsLabsPageSource: string;
  settingsLabsIncidentsPageSource: string;
  incidentSurfaceSource: string;
  classroomControlPanelSource: string;
  operatorRecoveryActionSource: string;
  pluginActionSource: string;
  pluginHandlerSource: string;
  pluginDetailRouteSource: string;
  pluginActionRouteSource: string;
  classroomActionsSource: string;
  runtimeInspectorSurfaceSource: string;
  asyncTaskOperatorSurfaceSource: string;
  pluginLifecycleSurfaceSource: string;
  operatorHonestySource: string;
  proofSource: string;
  runbookSource: string;
  commandDetailRouteExists: boolean;
  pluginDetailRouteExists: boolean;
  pluginActionRouteExists: boolean;
};

export const PHASE_58_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase58-operator-recovery-and-surfaces.ts";
export const PHASE_58_PROOF_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/proof-phase58-operator-recovery.ts";

export function getPhase58VerificationSuitePaths() {
  return [
    "src/features/platform-core/commands/handlers/plugins.test.ts",
    "src/actions/plugin-actions.test.ts",
    "src/actions/operator-posture-recovery-actions.test.ts",
    "scripts/verify-phase58-operator-recovery-and-surfaces.test.ts",
    "src/components/surfaces/settings-surface.test.tsx",
    "src/components/surfaces/classroom-incident-operator-surface.test.tsx",
    "src/components/classroom/classroom-control-panel.test.tsx",
    "src/components/surfaces/runtime-inspector-surface.test.tsx",
    "src/components/surfaces/async-task-operator-surface.test.tsx",
    "src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx",
    "src/features/async-tasks/server/recovery.test.ts",
  ] as const;
}

export function getPhase58ProofHardGateScenarios() {
  return ["plugin-failure-walkthrough", "transport-worker-degraded-walkthrough"] as const;
}

export function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function run(
  command: string,
  args: readonly string[],
  label: string,
  envOverrides?: NodeJS.ProcessEnv,
) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
      env: {
        ...process.env,
        ...envOverrides,
      },
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 58 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  const envOverrides: NodeJS.ProcessEnv = { NODE_ENV: "test" };

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, "--run", ...paths], label, envOverrides);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, ["--run", ...paths], label, envOverrides);
    return;
  }

  run("pnpm", ["exec", "vitest", "--run", ...paths], label, envOverrides);
}

function includesAll(source: string, tokens: readonly string[]) {
  return tokens.every((token) => source.includes(token));
}

export function verifyPhase58PackageScripts(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return (
      pkg.scripts?.["verify:phase58"] === PHASE_58_VERIFY_SCRIPT
      && pkg.scripts?.["proof:phase58"] === PHASE_58_PROOF_SCRIPT
    );
  } catch {
    return false;
  }
}

export function evaluatePhase58StaticChecks(sources: Phase58StaticSources): StaticCheck[] {
  return [
    {
      label: "package.json exposes exact verify:phase58 and proof:phase58 scripts",
      passed: verifyPhase58PackageScripts(sources.packageSource),
    },
    {
      label: "settings labs stays incident-first and keeps dedicated incidents route",
      passed:
        includesAll(sources.settingsSurfaceSource, [
          "ClassroomIncidentListSurface",
          "getClassroomIncidentListDTO",
          "没有 classroom deep link 时，先从课堂事件进入",
          "Runtime Inspector",
          "Async Operator",
          "Plugin Governance",
        ])
        && includesAll(sources.settingsLabsPageSource, ['SettingsSurface mode="labs"'])
        && includesAll(sources.settingsLabsIncidentsPageSource, [
          "getClassroomIncidentListDTO",
          "ClassroomIncidentListSurface",
        ]),
    },
    {
      label: "incident surface locks honesty template and avoids summary-timeline regression",
      passed:
        includesAll(sources.incidentSurfaceSource, [
          'data-testid="incident-honesty-card"',
          "仍可信什么 / 已不可信什么",
          "影响范围",
          "推荐下一步",
          "查看任务详情",
          "当前问题",
          "关联对象与下一跳",
          "轻量恢复",
        ])
        && !sources.incidentSurfaceSource.includes("timeline.map(")
        && !sources.incidentSurfaceSource.includes("attemptGroups")
        && !sources.incidentSurfaceSource.includes("raw diagnostics"),
    },
    {
      label: "command detail route exists for incident drill-down",
      passed: sources.commandDetailRouteExists,
    },
    {
      label: "plugin detail and action detail routes exist and mount PluginLifecycleOperatorSurface",
      passed:
        sources.pluginDetailRouteExists
        && sources.pluginActionRouteExists
        && includesAll(sources.pluginDetailRouteSource, [
          "PluginLifecycleOperatorSurface",
          "getPluginLifecycleOperatorDetailDTO",
        ])
        && includesAll(sources.pluginActionRouteSource, [
          "PluginLifecycleOperatorSurface",
          "getPluginActionLifecycleOperatorDetailDTO",
        ]),
    },
    {
      label: "classroom shell keeps only retry or reconcile quick actions and sends detail-only guidance for high-risk actions",
      passed:
        includesAll(sources.classroomControlPanelSource, [
          "currentVotingRound.recoveryActions",
          "action.action === 'retry' || action.action === 'reconcile'",
          "resume、suspend、fallback 需前往课堂事件或 detail surface 进行强确认",
          "查看课堂事件",
        ])
        && !sources.classroomControlPanelSource.includes("暂停本轮")
        && !sources.classroomControlPanelSource.includes("切换到课堂内回退处理"),
    },
    {
      label: "operator recovery stays on server-owned seams and avoids DB surgery bypasses",
      passed:
        includesAll(sources.operatorRecoveryActionSource, [
          "runCurrentVotingRecoveryAction",
          "transitionPluginLifecycleForOperatorAction",
          "setPluginKillSwitchForOperatorAction",
          'revalidatePath("/settings/labs")',
          "revalidatePath(",
        ])
        && !sources.operatorRecoveryActionSource.includes("transitionPluginLifecycleAction(")
        && !sources.operatorRecoveryActionSource.includes("setPluginKillSwitchAction(")
        && !sources.operatorRecoveryActionSource.includes("@/db")
        && !sources.operatorRecoveryActionSource.includes("db.")
        && includesAll(sources.classroomActionsSource, [
          "recordRuntimeTeacherControl",
          "updateTag(cacheTags.classroom(input.sessionId))",
          'source: "classroom-voting-recovery"',
        ])
        && !sources.classroomActionsSource.includes("db surgery")
        && !sources.classroomActionsSource.includes("sqlite>"),
    },
    {
      label: "plugin operator recovery path enforces actorScope operator and handler operator authz branch",
      passed:
        includesAll(sources.pluginActionSource, [
          'actorScope: "operator"',
          "setPluginEnabledForOperatorAction",
          "reconcilePluginForOperatorAction",
          "retryPluginForOperatorAction",
          "transitionPluginLifecycleForOperatorAction",
          "setPluginKillSwitchForOperatorAction",
          "resolveOperatorSchoolId",
        ])
        && includesAll(sources.pluginLifecycleSurfaceSource, [
          "setPluginEnabledForOperatorAction",
          "reconcilePluginForOperatorAction",
          "retryPluginForOperatorAction",
          "runOperatorPostureRecoveryAction",
        ])
        && !sources.pluginLifecycleSurfaceSource.includes("setPluginEnabledAction({")
        && !sources.pluginLifecycleSurfaceSource.includes("reconcilePluginAction({")
        && !sources.pluginLifecycleSurfaceSource.includes("retryPluginAction({")
        && includesAll(sources.pluginHandlerSource, [
          'command.actor.actorScope === "operator"',
          "getUserMembershipsDTO",
          "OPERATOR_AUTH_REQUIRED",
        ]),
    },
    {
      label: "runtime or async or plugin surfaces share the fixed honesty helper",
      passed:
        includesAll(sources.operatorHonestySource, [
          'id: z.enum(["trustBoundary", "impactScope", "nextStep"])',
          'label: "仍可信什么 / 已不可信什么"',
          'label: "影响范围"',
          'label: "推荐下一步"',
        ])
        && includesAll(sources.runtimeInspectorSurfaceSource, ["toRuntimeInspectorHonestyCard", "honestyCard.sections.map"])
        && includesAll(sources.asyncTaskOperatorSurfaceSource, ["toAsyncTaskOperatorHonestyCard", "backlogHonesty.sections.map"])
        && includesAll(sources.pluginLifecycleSurfaceSource, ["toPluginLifecycleHonestyCard", "honestyCard.sections.map"]),
    },
    {
      label: "proof gate and runbook cover plugin failure, transport or worker degraded, and no-DB-surgery evidence",
      passed:
        includesAll(sources.proofSource, [
          "plugin-failure-walkthrough",
          "transport-worker-degraded-walkthrough",
          "ClassroomIncidentOperatorSurface",
          "PluginLifecycleOperatorSurface",
          "RuntimeInspectorSurface",
          "AsyncTaskOperatorSurface",
        ])
        && includesAll(sources.runbookSource, [
          "55-PROOF-INVENTORY.md",
          "55-FAILURE-RECOVERY-MATRIX.md",
          "plugin failure",
          "transport / worker degraded",
          "无需 DB surgery",
          "课堂事件",
        ]),
    },
  ];
}

export async function runPhase58Verification() {
  console.log("==================================================");
  console.log("Starting Phase 58 operator recovery verification...");
  console.log("==================================================");

  const staticChecks = evaluatePhase58StaticChecks({
    packageSource: read("package.json"),
    settingsSurfaceSource: read("src/components/surfaces/settings-surface.tsx"),
    settingsLabsPageSource: read("src/app/settings/labs/page.tsx"),
    settingsLabsIncidentsPageSource: read("src/app/settings/labs/incidents/page.tsx"),
    incidentSurfaceSource: read("src/components/surfaces/classroom-incident-operator-surface.tsx"),
    classroomControlPanelSource: read("src/components/classroom/classroom-control-panel.tsx"),
    operatorRecoveryActionSource: read("src/actions/operator-posture-recovery-actions.ts"),
    pluginActionSource: read("src/actions/plugin-actions.ts"),
    pluginHandlerSource: read("src/features/platform-core/commands/handlers/plugins.ts"),
    pluginDetailRouteSource: read("src/app/settings/labs/plugins/[pluginId]/page.tsx"),
    pluginActionRouteSource: read("src/app/settings/labs/plugins/[pluginId]/actions/[actionKey]/page.tsx"),
    classroomActionsSource: read("src/actions/classroom-actions.ts"),
    runtimeInspectorSurfaceSource: read("src/components/surfaces/runtime-inspector-surface.tsx"),
    asyncTaskOperatorSurfaceSource: read("src/components/surfaces/async-task-operator-surface.tsx"),
    pluginLifecycleSurfaceSource: read("src/components/surfaces/plugin-lifecycle-operator-surface.tsx"),
    operatorHonestySource: read("src/lib/dto/operator-honesty.ts"),
    proofSource: read("scripts/proof-phase58-operator-recovery.ts"),
    runbookSource: read(
      ".planning/phases/58-operator-recovery-and-production-surfaces/58-OPERATOR-RUNBOOK.md",
    ),
    commandDetailRouteExists: existsSync(
      path.join(process.cwd(), "src/app/settings/labs/commands/[commandId]/page.tsx"),
    ),
    pluginDetailRouteExists: existsSync(
      path.join(process.cwd(), "src/app/settings/labs/plugins/[pluginId]/page.tsx"),
    ),
    pluginActionRouteExists: existsSync(
      path.join(process.cwd(), "src/app/settings/labs/plugins/[pluginId]/actions/[actionKey]/page.tsx"),
    ),
  });

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log("  ✓ Static close-gate checks passed.");

  console.log("\n[1/2] Running focused Phase 58 suites...");
  runVitest(getPhase58VerificationSuitePaths(), "Phase 58 focused operator recovery suites");

  console.log("\n[2/2] Running operator walkthrough proof hard gate...");
  run(process.execPath, [
    "--require",
    "./scripts/server-only-node-shim.cjs",
    "--import",
    "tsx",
    "scripts/proof-phase58-operator-recovery.ts",
  ], "Phase 58 operator walkthrough proof");

  console.log("\nPhase 58 verification complete.");
  console.log("==================================================");
  console.log("Phase 58 operator recovery verification successfully PASSED!");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase58Verification().catch((error) => {
    console.error("Unhandled verification error:", error);
    process.exit(1);
  });
}
