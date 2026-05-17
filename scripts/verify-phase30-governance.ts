import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function fail(label: "capability drift" | "manifest drift" | "lifecycle drift" | "audit drift", message: string) {
  console.error(`Phase 30 ${label}: ${message}`);
}

function run(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 30 verifier failed while running: ${label}`);
    throw error;
  }
}

const packageSource = read("package.json");
const guardSource = read("src/features/runtime-platform/host-actions/guards.ts");
const runtimeHostSource = read("src/features/runtime-platform/host-actions/runtime-host.ts");
const pluginHostSource = read("src/features/runtime-platform/host-actions/plugin-host.ts");
const descriptorSource = read("src/features/runtime-platform/contracts/descriptors.ts");
const permissionSource = read("src/features/runtime-platform/contracts/permissions.ts");
const resourceAiSource = read("src/lib/dto/resource-ai.ts");
const pluginSource = read("src/lib/dal/plugins.ts");
const schemaSource = read("src/db/schema.ts");
const runtimeSessionSource = read("src/features/runtime-platform/classroom/runtime-session.ts");

const checks = [
  {
    label: "capability drift" as const,
    passed:
      packageSource.includes('"verify:phase30"') &&
      guardSource.includes("createGuardedHostAction") &&
      guardSource.includes("resolveGovernance") &&
      runtimeHostSource.includes("capability_missing") &&
      pluginHostSource.includes("unsupported_action"),
    message: "host entry or capability denial semantics drifted away from the guarded governance path",
  },
  {
    label: "manifest drift" as const,
    passed:
      descriptorSource.includes("PluginManifestGovernanceV2Schema") &&
      descriptorSource.includes("runtime bootstrap must stay local-only") &&
      resourceAiSource.includes("manifestVersion") &&
      resourceAiSource.includes("governance") &&
      descriptorSource.includes("requestedCapabilities"),
    message: "manifest v2 contract or local-only runtime entry guard is missing",
  },
  {
    label: "lifecycle drift" as const,
    passed:
      permissionSource.includes("PluginLifecycleStateValues") &&
      permissionSource.includes('"failed"') &&
      schemaSource.includes("pluginLifecycleTransitions") &&
      schemaSource.includes("runtimeLifecycleTransitions") &&
      runtimeSessionSource.includes("updateRuntimeLifecycleState") &&
      pluginSource.includes("lifecycleState"),
    message: "lifecycle state or transition durability drifted away from canonical governance truth",
  },
  {
    label: "audit drift" as const,
    passed:
      schemaSource.includes("governanceAudits") &&
      schemaSource.includes("decision") &&
      pluginSource.includes("createGovernanceAudit") &&
      runtimeSessionSource.includes("createRuntimeGovernanceAudit") &&
      pluginSource.includes('decision: "allowed"') &&
      pluginSource.includes('decision: "denied"'),
    message: "allowed/denied governance audit persistence or query shape drifted",
  },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  for (const check of failed) {
    fail(check.label, check.message);
  }
  process.exit(1);
}

run(
  [
    "exec",
    "vitest",
    "--run",
    "src/features/runtime-platform/contracts/contracts.test.ts",
    "src/features/runtime-platform/host-actions/guards.test.ts",
    "src/lib/dal/plugins.test.ts",
    "src/lib/dal/plugins.builtins.test.ts",
    "src/features/runtime-platform/classroom/runtime-session.test.ts",
  ],
  "phase 30 governance suites",
);

console.log("Phase 30 governance verification passed");
