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
    console.error(`Phase 52 verification failed while running: ${label}`);
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
    const script = scripts["verify:phase52"];
    return typeof script === "string" && script.includes("scripts/verify-phase52-action-registry-and-lifecycle.ts");
  } catch {
    return false;
  }
}

function includesAll(source: string, tokens: readonly string[]) {
  return tokens.every((token) => source.includes(token));
}

function verifyReasonAwareRecoverySurface(source: string) {
  return includesAll(source, [
    "const submitRecoveryAction = ",
    "transitionPluginLifecycleAction",
    "retryPluginAction",
    "reconcilePluginAction",
    'plugin.recommendedRecoveryAction',
    '? submitRecoveryAction(plugin)',
    ': submitToggle(plugin)',
  ]);
}

async function main() {
  console.log("==================================================");
  console.log("Starting Phase 52 Action Registry Verification...");
  console.log("==================================================");

  const packageSource = read("package.json");
  const actionRegistrySource = read("src/features/platform-core/actions/registry.ts");
  const commandContractsSource = read("src/features/platform-core/commands/contracts.ts");
  const commandRegistrySource = read("src/features/platform-core/commands/registry.ts");
  const producerSource = read("src/features/platform-core/commands/producers/plugin-governance.ts");
  const actionsSource = read("src/actions/plugin-actions.ts");
  const hostSource = read("src/features/runtime-platform/host-actions/plugin-host.ts");
  const handlerSource = read("src/features/platform-core/commands/handlers/plugins.ts");
  const dependencyGraphSource = read("src/features/platform-core/plugins/dependency-graph.ts");
  const governanceProjectionSource = read("src/features/platform-core/plugins/governance-projection.ts");
  const settingsSurfaceSource = read("src/components/surfaces/settings-surface.tsx");
  const surfaceSource = read("src/components/surfaces/plugin-lifecycle-operator-surface.tsx");
  const dalSource = read("src/lib/dal/plugins.ts");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes verify:phase52 script",
      passed: verifyPackageScript(packageSource),
    },
    {
      label: "registry exports executable catalog, blocked diagnostics, and lifecycle read model",
      passed: includesAll(actionRegistrySource, [
        "export async function readExecutableActionCatalog",
        "export async function readBlockedActionDiagnostics",
        "export async function readPluginGovernanceLifecycle",
        "blockedActionDiagnostics",
        "executableActionCatalog",
      ]),
    },
    {
      label: "plugin.reconcile is wired through command contracts, registry, producer, server actions, and host adapters",
      passed:
        includesAll(commandContractsSource, [
          '"plugin.reconcile"',
          'PluginReconcilePayloadSchema',
          'type: z.literal("plugin.reconcile")',
        ]) &&
        includesAll(commandRegistrySource, [
          '"plugin.reconcile": createPlatformCommandDefinition',
          'payloadSchema: PlatformCommandPayloadSchemas["plugin.reconcile"]',
          'authorize: pluginCommandHandlers["plugin.reconcile"].authorize',
          'execute: pluginCommandHandlers["plugin.reconcile"].execute',
        ]) &&
        includesAll(producerSource, [
          'BaseProducerInput<"plugin.reconcile"',
          'export async function producePluginReconcileCommand',
        ]) &&
        includesAll(actionsSource, [
          'export async function reconcilePluginAction',
          'type: "plugin.reconcile"',
        ]) &&
        includesAll(hostSource, [
          '"plugin.reconcile"',
          'case "plugin.reconcile":',
          'return action === "plugin.reconcile"',
        ]),
    },
    {
      label: "server actions consume unified registry read APIs and preserve retention mode",
      passed: includesAll(actionsSource, [
        "readExecutableActionCatalog",
        "readBlockedActionDiagnostics",
        "readPluginGovernanceLifecycle",
        'retentionMode: parsed.data.retentionMode',
        'confirmationToken: parsed.data.confirmationToken',
      ]),
    },
    {
      label: "DAL and governance projection keep retained uninstall metadata wired to external uninstalled state",
      passed:
        includesAll(dalSource, [
          'uninstalledAt: row.uninstalledAt',
          'uninstallRetentionMode: row.uninstallRetentionMode',
        ]) &&
        includesAll(governanceProjectionSource, [
          'input.uninstallRetentionMode === "retain" && input.uninstalledAt !== null',
          'return "uninstalled"',
          'reasonCode = "not_installed"',
          'recoveryAction = null',
        ]),
    },
    {
      label: "plugin host reads lifecycle through registry and gates recovery writes by reason code",
      passed: includesAll(hostSource, [
        '"read-lifecycle"',
        "readPluginGovernanceLifecycle",
        'retentionMode: input.payload.retentionMode === "cleanup" ? "cleanup" : "retain"',
        'reason: "lifecycle_blocked"',
        'case "activation_failed":',
        'return action === "plugin.retry"',
        'case "kill_switch":',
        'return action === "plugin.resume"',
      ]),
    },
    {
      label: "operator surface keeps governance diagnostics behind explicit entry, cleanup opt-in, and reason-aware recovery dispatch",
      passed: includesAll(surfaceSource, [
        "dashboard: GovernanceDashboardBundle",
        "查看治理诊断",
        "retain 为默认姿态；cleanup 需要显式 opt-in 与确认。",
        "我已确认 cleanup 会删除以上分类数据，并且这是显式的破坏性操作。",
        "该插件由系统提供，可启用或停用，但不会作为可删除扩展处理。",
      ]) && verifyReasonAwareRecoverySurface(surfaceSource) && !includesAll(surfaceSource, [
        "PluginRegistrationDTO",
        "lifecycleCopyMap",
        "isExecutablePlugin",
        "getDiagnosticReason",
      ]),
    },
    {
      label: "settings surface consumes governance dashboard bundle instead of raw plugin DTO wiring",
      passed: includesAll(settingsSurfaceSource, [
        "readGovernanceDashboardBundle",
        "<PluginLifecycleOperatorSurface schoolId={schoolId} dashboard={dashboard} />",
      ]) && !includesAll(settingsSurfaceSource, [
        "listPluginsAction",
        "plugins={plugins}",
      ]),
    },
    {
      label: "DAL blocks default plugin uninstall",
      passed: includesAll(dalSource, [
        'plugin.sourceType === "default"',
        'return "UNINSTALL_BLOCKED_DEFAULT_PLUGIN"',
      ]),
    },
    {
      label: "DAL enforces deterministic cleanup confirmation and retain uninstall metadata",
      passed: includesAll(dalSource, [
        "cleanupConfirmationToken",
        'cleanup:${input.pluginId}:${input.lessonExtCount}:${input.stepExtCount}:${input.resourceExtCount}:${input.ownedBusinessCount}:${input.totalCount}',
        'uninstallRetentionMode: "retain"',
        'uninstalledAt: new Date()',
        'PLUGIN_CLEANUP_CONFIRMATION_REQUIRED',
      ]),
    },
    {
      label: "dependency graph exposes activation chain helper",
      passed: includesAll(dependencyGraphSource, [
        "export function resolvePluginActivationChain",
        "orderedPluginIds",
        "missingDependencies",
        "cycles",
      ]),
    },
    {
      label: "command handlers consume dependency ordering before enable or resume transitions",
      passed: includesAll(handlerSource, [
        "listPluginsForSchool",
        "readRegistryProjectionBundleForSchool",
        'PLUGIN_DEPENDENCY_BLOCKED:',
        'PLUGIN_DEPENDENCY_CYCLE:',
        'dependency:${command.scope.pluginId}',
      ]),
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

  console.log("  ✓ Static contract checks passed.");

  console.log("\n[2/2] Running focused behavior tests...");
  runVitest([
    "src/features/platform-core/actions/static-catalog.test.ts",
    "src/features/platform-core/commands/handlers/plugins.test.ts",
    "src/actions/plugin-actions.test.ts",
    "src/features/platform-core/plugins/governance-projection.test.ts",
    "src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts",
    "src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx",
    "src/components/surfaces/settings-surface.test.tsx",
    "src/lib/dal/plugins.test.ts",
  ], "Phase 52 registry and lifecycle focused suites");
  console.log("  ✓ Phase 52 behavior verified.");

  console.log("\nPhase 52 verification complete.");
  console.log("==================================================");
  console.log("🎉 Phase 52 action registry verification successfully PASSED!");
  console.log("==================================================");
}

void main();
