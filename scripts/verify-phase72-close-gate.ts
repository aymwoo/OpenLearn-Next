import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type Stage = {
  label: string;
  passed: boolean;
  details: string[];
};

const PHASE_72_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase72-close-gate.ts";
const LEGAL_PHASE72_ALIAS = "pnpm verify:phase72";
const LEGAL_V41_ALIAS = "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate";

const UPSTREAM_VERIFICATION_PATHS = {
  phase67: ".planning/milestones/v4.0-phases/67-declarative-plugin-owned-data-model-migration-proof/67-VERIFICATION.md",
  phase68: ".planning/milestones/v4.0-phases/68-governed-declarative-data-access-verbs/68-VERIFICATION.md",
  phase69: ".planning/milestones/v4.0-phases/69-interactive-single-choice-quiz-sample-plugin/69-VERIFICATION.md",
  phase70: ".planning/milestones/v4.0-phases/70-question-stats-post-class-recap/70-VERIFICATION.md",
  phase71: ".planning/milestones/v4.0-phases/71-marketplace-lifecycle-install-governance-semver-upgrade-reta/71-VERIFICATION.md",
} as const;

const ORDERED_PHASE_RUNNERS: ReadonlyArray<{ scriptKey: string; gateLabel: string }> = [
  { scriptKey: "verify:phase67", gateLabel: "Phase 67 migration-proof gate" },
  { scriptKey: "verify:phase68", gateLabel: "Phase 68 governed-access gate" },
  { scriptKey: "verify:phase69", gateLabel: "Phase 69 quiz sample chain gate" },
  { scriptKey: "verify:phase70", gateLabel: "Phase 70 stats recap gate" },
  { scriptKey: "verify:phase71", gateLabel: "Phase 71 marketplace lifecycle gate" },
];

// Wave-3 final-artifact dependency anchors (D-72.1-16 / T-72.1-06 mitigation).
// Hard-required by Stage 5 so the authoritative gate cannot pass without the
// archive-ready 72.1 close artifacts and the formal Phase 72 verification
// report. Without these the gate would silently regress to "orchestrator-only"
// and `GATE-01` would re-open in the next milestone audit.
const FINAL_ARTIFACT_PATHS = {
  phase72Verification:
    ".planning/milestones/v4.0-phases/72-end-to-end-verify-phase-close-gate/72-VERIFICATION.md",
  phase721Closeout:
    ".planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-CLOSEOUT.md",
  phase721ProofMapping:
    ".planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md",
} as const;

// Manual sign-off ledger row token (locked schema). The exact substring
// `| status | \`status: passed\` |` appears ONLY in executed rows of the
// proof-mapping ledger; the schema-reference table uses backticks around the
// field name (`| \`status\` | ...`) so the substring does not collide.
const MANUAL_SIGNOFF_EXECUTED_ROW_TOKEN = "| status | `status: passed` |";

// Two required manual sign-off rows in the ledger (sourced from
// 72.1-VALIDATION.md manual-only verification rows). The parser hard-fails
// unless each required field appears at least twice (once per row) and at
// least two executed rows are present.
const REQUIRED_SIGNOFF_FIELD_TOKENS = [
  "| executed_by |",
  "| executed_at |",
  "| evidence note |",
] as const;

function read(filePath: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function nonCommentIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token);
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
    console.error(`Phase 72 verification failed while running: ${label}`);
    throw error;
  }
}

function verifyPackageScripts(packageSource: string): StaticCheck[] {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};

    return [
      {
        label: "package.json exposes phase67 migration-proof runner",
        passed: scripts["verify:phase67"]?.includes("scripts/verify-phase67-plugin-owned-data.ts") ?? false,
      },
      {
        label: "package.json exposes phase68 governed-access runner",
        passed: scripts["verify:phase68"]?.includes("scripts/verify-phase68-data-access-verbs.ts") ?? false,
      },
      {
        label: "package.json exposes phase69 quiz-sample runner",
        passed: scripts["verify:phase69"]?.includes("scripts/verify-phase69-quiz-sample.ts") ?? false,
      },
      {
        label: "package.json exposes phase70 stats recap runner",
        passed: scripts["verify:phase70"]?.includes("scripts/verify-phase70-quiz-stats.ts") ?? false,
      },
      {
        label: "package.json exposes phase71 marketplace lifecycle runner",
        passed: scripts["verify:phase71"]?.includes("scripts/verify-phase71-marketplace-lifecycle.ts") ?? false,
      },
      {
        label: "package.json exposes exact verify:phase72 script",
        passed: scripts["verify:phase72"] === PHASE_72_VERIFY_SCRIPT,
      },
      {
        label: "package.json routes verify:phase alias to a legal phase72-based milestone gate",
        passed:
          scripts["verify:phase"] === LEGAL_PHASE72_ALIAS
          || scripts["verify:phase"] === LEGAL_V41_ALIAS,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON with required verify scripts",
        passed: false,
      },
    ];
  }
}

function verifyUpstreamVerificationArtifacts(): StaticCheck[] {
  return [
    {
      label: "Phase 67 verification report exists at the planned path",
      passed: existsSync(path.join(process.cwd(), UPSTREAM_VERIFICATION_PATHS.phase67)),
    },
    {
      label: "Phase 68 verification report exists at the planned path",
      passed: existsSync(path.join(process.cwd(), UPSTREAM_VERIFICATION_PATHS.phase68)),
    },
    {
      label: "Phase 69 verification report exists at the planned path",
      passed: existsSync(path.join(process.cwd(), UPSTREAM_VERIFICATION_PATHS.phase69)),
    },
    {
      label: "Phase 70 verification report exists at the planned path",
      passed: existsSync(path.join(process.cwd(), UPSTREAM_VERIFICATION_PATHS.phase70)),
    },
    {
      label: "Phase 71 verification report exists at the planned path",
      passed: existsSync(path.join(process.cwd(), UPSTREAM_VERIFICATION_PATHS.phase71)),
    },
  ];
}

function verifyLifecycleMilestoneBridge(): StaticCheck[] {
  const actionSource = read("src/actions/plugin-actions.ts");
  const routeSource = read("src/app/settings/plugins/page.tsx");
  const surfaceSource = read("src/components/surfaces/plugin-marketplace-surface.tsx");
  const registrySource = read("src/features/platform-core/actions/registry.ts");
  const dalSource = read("src/lib/dal/plugins.ts");
  const migrationSource = read("src/lib/dal/plugin-migration.ts");
  const routeRegistrySource = read("src/lib/theme-layout/route-surface-registry.ts");

  return [
    {
      label: "/settings/plugins is the registered lifecycle entry route",
      passed:
        nonCommentIncludes(routeSource, "PluginMarketplaceSurface")
        && (nonCommentIncludes(routeRegistrySource, "\"/settings/plugins\"")
          || nonCommentIncludes(routeRegistrySource, "'/settings/plugins'")),
    },
    {
      label: "PluginMarketplaceSurface calls the readMarketplaceSurfaceBundle SSR bundle seam",
      passed:
        nonCommentIncludes(surfaceSource, "readMarketplaceSurfaceBundle")
        && nonCommentIncludes(surfaceSource, "PluginMarketplaceSurface"),
    },
    {
      label: "registry exposes readMarketplaceSurfaceBundle for the marketplace SSR bundle",
      passed: nonCommentIncludes(registrySource, "export async function readMarketplaceSurfaceBundle"),
    },
    {
      label: "recoverMarketplacePluginAction server action is exported on the marketplace action boundary",
      passed: nonCommentIncludes(actionSource, "export async function recoverMarketplacePluginAction"),
    },
    {
      label: "recoverRetainedPluginInstallWithTx is exported from DAL for the retain reinstall branch",
      passed: nonCommentIncludes(dalSource, "export async function recoverRetainedPluginInstallWithTx"),
    },
    {
      label: "recoverRetainedPluginInstallWithTx carries recoveredDataTakeover and recoveredFromPluginId for branch proof",
      passed:
        nonCommentIncludes(dalSource, "recoveredDataTakeover")
        && nonCommentIncludes(dalSource, "recoveredFromPluginId"),
    },
    {
      label: "preflightPluginUpgrade is exported from DAL for the upgrade branch",
      passed: nonCommentIncludes(dalSource, "export async function preflightPluginUpgrade"),
    },
    {
      label: "plugin-migration enforces the backfill -> verify -> cutover upgrade discipline",
      passed:
        nonCommentIncludes(migrationSource, '"backfill"')
        && nonCommentIncludes(migrationSource, '"verify"')
        && nonCommentIncludes(migrationSource, '"cutover"'),
    },
    {
      label: "preflightUninstallPluginWithTx is exported from DAL for the cleanup uninstall branch",
      passed: nonCommentIncludes(dalSource, "export async function preflightUninstallPluginWithTx"),
    },
    {
      label: "uninstallPluginWithTx is exported from DAL for the cleanup uninstall branch",
      passed: nonCommentIncludes(dalSource, "export async function uninstallPluginWithTx"),
    },
    {
      label: "uninstallPluginWithTx enforces cleanupConfirmationToken and PLUGIN_CLEANUP_CONFIRMATION_REQUIRED",
      passed:
        nonCommentIncludes(dalSource, "cleanupConfirmationToken")
        && nonCommentIncludes(dalSource, "PLUGIN_CLEANUP_CONFIRMATION_REQUIRED"),
    },
  ];
}

function verifyRecapMilestoneBridge(): StaticCheck[] {
  const routeSource = read("src/app/(classroom)/classroom/page.tsx");
  const recapSurfaceSource = read("src/components/classroom/classroom-session-recap-surface.tsx");
  const actionSource = read("src/actions/classroom-actions.ts");
  const cachePolicySource = read("src/lib/cache-policy.ts");
  const dalSource = read("src/lib/dal/classroom.ts");
  const dtoSource = read("src/lib/dto/classroom.ts");

  return [
    {
      label: "src/app/(classroom)/classroom/page.tsx calls getClassroomSessionRecapDTO on the ended-session recap path",
      passed:
        nonCommentIncludes(routeSource, "getClassroomSessionRecapDTO")
        && nonCommentIncludes(routeSource, "status === 'ended'"),
    },
    {
      label: "ClassroomSessionRecapSurface is exported from src/components/classroom/classroom-session-recap-surface.tsx",
      passed: nonCommentIncludes(recapSurfaceSource, "export function ClassroomSessionRecapSurface"),
    },
    {
      label: "ClassroomSessionRecapSurface renders the recap quiz question section + calm empty state",
      passed:
        nonCommentIncludes(recapSurfaceSource, "题目复盘")
        && nonCommentIncludes(recapSurfaceSource, "recap.quizSampleStats"),
    },
    {
      label: "src/actions/classroom-actions.ts owns the classroom action boundary and updateTag invalidation",
      passed:
        nonCommentIncludes(actionSource, "submitQuizSampleAnswerAction")
        && nonCommentIncludes(actionSource, "updateTag(cacheTags.quizStats("),
    },
    {
      label: "cacheTags.quizStats is registered in src/lib/cache-policy.ts as the cache invalidation key",
      passed: nonCommentIncludes(cachePolicySource, "quizStats: (sessionId: string) => `quiz-stats:${sessionId}`"),
    },
    {
      label: "src/lib/dal/classroom.ts carries the latest-only recap stats truth buildQuizSampleRecapStats",
      passed: nonCommentIncludes(dalSource, "async function buildQuizSampleRecapStats"),
    },
    {
      label: "buildQuizSampleRecapStats restricts to pluginOwnedQuizResponses.isLatest = true",
      passed: nonCommentIncludes(dalSource, "eq(pluginOwnedQuizResponses.isLatest, true)"),
    },
    {
      label: "getClassroomSessionRecapDTO exposes quizSampleStats on the recap DTO contract",
      passed:
        nonCommentIncludes(dalSource, "export async function getClassroomSessionRecapDTO")
        && nonCommentIncludes(dalSource, "quizSampleStats: recap.quizSampleStats"),
    },
    {
      label: "ClassroomSessionRecapDTOSchema declares quizSampleStats section (no summary-artifact writeback)",
      passed:
        nonCommentIncludes(dtoSource, "ClassroomSessionRecapQuizStatsSectionDTOSchema")
        && nonCommentIncludes(dtoSource, "quizSampleStats: ClassroomSessionRecapQuizStatsSectionDTOSchema"),
    },
  ];
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }
  let count = 0;
  let cursor = 0;
  while (true) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) {
      return count;
    }
    count += 1;
    cursor = found + needle.length;
  }
}

function verifyFinalArtifactDependencies(): StaticCheck[] {
  const closeoutSource = read(FINAL_ARTIFACT_PATHS.phase721Closeout);
  const proofMappingSource = read(FINAL_ARTIFACT_PATHS.phase721ProofMapping);
  const phase72VerificationSource = read(FINAL_ARTIFACT_PATHS.phase72Verification);

  return [
    {
      label: "72.1-CLOSEOUT.md exists at the planned archive path",
      passed: closeoutSource.length > 0,
    },
    {
      label: "72.1-PROOF-MAPPING.md exists at the planned archive path",
      passed: proofMappingSource.length > 0,
    },
    {
      label: "72-VERIFICATION.md exists at the planned formal verification path",
      passed: phase72VerificationSource.length > 0,
    },
    {
      label:
        "72.1-CLOSEOUT.md names verify:phase67 in the proof chain summary (D-72.1-06 hook)",
      passed: nonCommentIncludes(closeoutSource, "verify:phase67"),
    },
    {
      label:
        "72.1-CLOSEOUT.md names verify:phase68 in the proof chain summary (D-72.1-06 hook)",
      passed: nonCommentIncludes(closeoutSource, "verify:phase68"),
    },
    {
      label:
        "72.1-PROOF-MAPPING.md names verify:phase68 in the final proof chain (D-72.1-06 hook)",
      passed: nonCommentIncludes(proofMappingSource, "verify:phase68"),
    },
    {
      label:
        "72.1-PROOF-MAPPING.md names the forbidden lighter shortcuts (D-72.1-16 auditability)",
      passed:
        nonCommentIncludes(proofMappingSource, "D-72.1-16")
        && nonCommentIncludes(proofMappingSource, "Doc-only closure")
        && nonCommentIncludes(proofMappingSource, "Missing manual sign-off capture")
        && nonCommentIncludes(proofMappingSource, "Final-gate wiring without artifact dependency checks"),
    },
    {
      label:
        "72.1-PROOF-MAPPING.md carries the Manual Surface Sign-Off Ledger section",
      passed: nonCommentIncludes(proofMappingSource, "Manual Surface Sign-Off Ledger"),
    },
  ];
}

function verifyManualSignOffLedger(): StaticCheck[] {
  const proofMappingSource = read(FINAL_ARTIFACT_PATHS.phase721ProofMapping);
  const executedRowCount = countOccurrences(
    proofMappingSource,
    MANUAL_SIGNOFF_EXECUTED_ROW_TOKEN,
  );

  return [
    {
      label:
        "72.1-PROOF-MAPPING.md records two executed manual sign-off rows with status: passed",
      passed: executedRowCount >= 2,
    },
    {
      label:
        "72.1-PROOF-MAPPING.md sign-off rows carry executed_by field (>= 2 occurrences)",
      passed:
        countOccurrences(proofMappingSource, REQUIRED_SIGNOFF_FIELD_TOKENS[0]) >= 2,
    },
    {
      label:
        "72.1-PROOF-MAPPING.md sign-off rows carry executed_at field (>= 2 occurrences)",
      passed:
        countOccurrences(proofMappingSource, REQUIRED_SIGNOFF_FIELD_TOKENS[1]) >= 2,
    },
    {
      label:
        "72.1-PROOF-MAPPING.md sign-off rows carry evidence note field (>= 2 occurrences)",
      passed:
        countOccurrences(proofMappingSource, REQUIRED_SIGNOFF_FIELD_TOKENS[2]) >= 2,
    },
  ];
}

function summariseStaticChecks(stage: string, checks: StaticCheck[]): Stage {
  const details = checks.map((check) => `- ${check.passed ? "✓" : "✗"} ${check.label}`);
  return {
    label: stage,
    passed: checks.every((check) => check.passed),
    details,
  };
}

function reportStage(stage: Stage) {
  if (!stage.passed) {
    console.error(`  ❌ ${stage.label} failed:`);
    for (const detail of stage.details) {
      console.error(`     ${detail}`);
    }
    return;
  }
  console.log(`  ✓ ${stage.label} (${stage.details.length} checks):`);
  for (const detail of stage.details) {
    console.log(`     ${detail}`);
  }
}

function main() {
  const smokeOnly = process.argv.includes("--smoke");
  const startLabel = smokeOnly ? "smoke" : "full";

  console.log("==================================================");
  console.log(`Phase 72 end-to-end close-gate verification (${startLabel}) starting...`);
  console.log("(v4.0 authoritative chain: Phase 67 -> 68 -> 69 -> 70 -> 71 -> 72)");
  console.log("==================================================");

  const stages: Stage[] = [];

  console.log("\n[1/5] Static script wiring checks...");
  const scriptChecks = verifyPackageScripts(read("package.json"));
  const scriptStage = summariseStaticChecks("Static script wiring", scriptChecks);
  stages.push(scriptStage);
  reportStage(scriptStage);
  if (!scriptStage.passed) {
    process.exit(1);
  }

  console.log("\n[2/5] Upstream VERIFICATION artifact presence (67-71)...");
  const verificationChecks = verifyUpstreamVerificationArtifacts();
  const verificationStage = summariseStaticChecks("Upstream VERIFICATION artifacts present", verificationChecks);
  stages.push(verificationStage);
  reportStage(verificationStage);
  if (!verificationStage.passed) {
    process.exit(1);
  }

  console.log("\n[3/5] Lifecycle milestone-bridge static seams (MKT-01..05 / D-72.1-07 / D-72.1-08)...");
  const lifecycleChecks = verifyLifecycleMilestoneBridge();
  const lifecycleStage = summariseStaticChecks("Lifecycle milestone-bridge seams", lifecycleChecks);
  stages.push(lifecycleStage);
  reportStage(lifecycleStage);
  if (!lifecycleStage.passed) {
    process.exit(1);
  }

  console.log("\n[4/5] Recap / stats milestone-bridge static seams (STATS-01 / STATS-02 / D-72.1-02 / D-72.1-15)...");
  const recapChecks = verifyRecapMilestoneBridge();
  const recapStage = summariseStaticChecks("Recap / stats milestone-bridge seams", recapChecks);
  stages.push(recapStage);
  reportStage(recapStage);
  if (!recapStage.passed) {
    process.exit(1);
  }

  console.log("\n[5/5] Final-artifact dependencies + manual sign-off ledger (D-72.1-16 / T-72.1-06)...");
  const finalArtifactChecks = verifyFinalArtifactDependencies();
  const signOffChecks = verifyManualSignOffLedger();
  const finalArtifactChecksMerged = [...finalArtifactChecks, ...signOffChecks];
  const finalArtifactStage = summariseStaticChecks(
    "Final-artifact dependencies + manual sign-off ledger",
    finalArtifactChecksMerged,
  );
  stages.push(finalArtifactStage);
  reportStage(finalArtifactStage);
  if (!finalArtifactStage.passed) {
    process.exit(1);
  }

  if (!smokeOnly) {
    console.log("\n[6/5] Ordered pnpm runners (67 -> 68 -> 69 -> 70 -> 71)...");
    let orderedPassed = true;
    const orderedDetails: string[] = [];
    for (const runner of ORDERED_PHASE_RUNNERS) {
      try {
        run("pnpm", [runner.scriptKey], runner.gateLabel);
        orderedDetails.push(`✓ ${runner.gateLabel} (${runner.scriptKey})`);
      } catch (error) {
        orderedPassed = false;
        orderedDetails.push(`✗ ${runner.gateLabel} (${runner.scriptKey}) — ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const orderedStage: Stage = {
      label: "Ordered upstream pnpm runners",
      passed: orderedPassed,
      details: orderedDetails,
    };
    stages.push(orderedStage);
    reportStage(orderedStage);
    if (!orderedStage.passed) {
      process.exit(1);
    }
  } else {
    console.log("\n[6/5] Ordered pnpm runners (67 -> 68 -> 69 -> 70 -> 71)...");
    console.log("  ↺ Smoke mode skips ordered pnpm runners; static + bridge seams above are the bridge proof.");
  }

  console.log("\n==================================================");
  console.log(
    `Phase 72 end-to-end close-gate verification ${smokeOnly ? "smoke " : ""}passed: ${stages.length} stages, ${stages.reduce(
      (acc, stage) => acc + stage.details.length,
      0,
    )} checks.`,
  );
  console.log("==================================================");
}

main();
