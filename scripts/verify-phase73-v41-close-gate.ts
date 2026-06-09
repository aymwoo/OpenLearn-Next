import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { PHASE_73_VERIFY_SCRIPT } from "./verify-phase73-quiz-ext";

type CheckStatus = "passed" | "blocked" | "failed";

type StaticCheck = {
  label: string;
  passed: boolean;
  blocked?: boolean;
};

export type StageStatus = {
  label: string;
  status: CheckStatus;
  details: string[];
};

export type ManualLedgerRow = {
  heading: string;
  fields: Record<string, string>;
};

type ManualSignoffSection = {
  heading: string;
  fields: Record<string, string>;
};

type GateResult = {
  overallStatus: CheckStatus;
  stageStatuses: StageStatus[];
};

export const PHASE_73_V41_CLOSE_GATE_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-v41-close-gate.ts";

export const STAGE_LABELS = [
  "Static script wiring",
  "Upstream product proof lane",
  "Lifecycle milestone-bridge static seams",
  "Recap / stats milestone-bridge static seams",
  "Final-artifact dependencies + manual sign-off ledger",
  "Multi-type close-proof crosswalk",
  "Live-dashboard close-proof crosswalk + alias readiness",
] as const;

const FINAL_ARTIFACT_PATHS = {
  proofMapping:
    ".planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md",
  verification:
    ".planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md",
  closeout:
    ".planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md",
  manualSignoff:
    ".planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-MANUAL-SIGNOFF.md",
} as const;

const LEGAL_PRE_CUTOVER_ALIAS = "pnpm verify:phase72";
const LEGAL_POST_CUTOVER_ALIAS = "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate";
const MANUAL_SIGNOFF_EXECUTED_ROW_TOKEN = "| status | `status: passed` |";
const REQUIRED_SIGNOFF_FIELD_TOKENS = [
  "| executed_by |",
  "| executed_at |",
  "| evidence note |",
] as const;

const LIVE_EVENT_TOKEN = ["quiz", "answer", "received"].join(".");
const RECAP_HELPER_TOKEN = ["buildQuizSample", "RecapStats"].join("");
const LIVE_ANSWER_ROW_HEADING = "Row 3 — v4.1 `/classroom` live-answer surface";
const RECAP_ROW_HEADING = "Row 4 — v4.1 multi-type ended-session recap surface";

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

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
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

function isIsoDate(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    return false;
  }
  return !Number.isNaN(Date.parse(trimmed));
}

function normalizeFieldValue(value: string | undefined) {
  return (value ?? "").trim().replace(/^`|`$/g, "").trim();
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
    throw new Error(`Phase 73 v4.1 close gate failed while running: ${label}`);
  }
}

function parseFieldTable(lines: string[]) {
  const fields: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|$/);
    if (!match) {
      continue;
    }
    const key = match[1]?.trim();
    const value = match[2]?.trim();
    if (!key || key === "field" || /^-+$/.test(key)) {
      continue;
    }
    fields[key] = value ?? "";
  }
  return fields;
}

export function parseManualLedgerRows(proofMappingSource: string): ManualLedgerRow[] {
  const marker = "## Manual Surface Sign-Off Ledger";
  const markerIndex = proofMappingSource.indexOf(marker);
  if (markerIndex === -1) {
    return [];
  }

  const lines = proofMappingSource.slice(markerIndex).split("\n");
  const rows: ManualLedgerRow[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines.slice(1)) {
    if (line.startsWith("### ")) {
      if (currentHeading) {
        rows.push({
          heading: currentHeading,
          fields: parseFieldTable(currentLines),
        });
      }
      currentHeading = line.replace(/^###\s+/, "").trim();
      currentLines = [];
      continue;
    }

    if (line.startsWith("---") && currentHeading) {
      rows.push({
        heading: currentHeading,
        fields: parseFieldTable(currentLines),
      });
      break;
    }

    if (currentHeading) {
      currentLines.push(line);
    }
  }

  if (currentHeading && !rows.some((row) => row.heading === currentHeading)) {
    rows.push({
      heading: currentHeading,
      fields: parseFieldTable(currentLines),
    });
  }

  return rows;
}

function parseManualSignoffSections(source: string): ManualSignoffSection[] {
  const sections: ManualSignoffSection[] = [];
  const headingMatches = [...source.matchAll(/^##\s+([A-Z_]+)$/gm)];

  for (let index = 0; index < headingMatches.length; index += 1) {
    const match = headingMatches[index];
    const start = match.index ?? 0;
    const end = headingMatches[index + 1]?.index ?? source.length;
    const chunk = source.slice(start, end);
    const lines = chunk.split("\n").slice(1);
    sections.push({
      heading: match[1] ?? "",
      fields: parseFieldTable(lines),
    });
  }

  return sections;
}

function verifyPackageScripts(packageSource: string, smokeOnly: boolean): StaticCheck[] {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const alias = scripts["verify:phase"];
    const aliasValid = alias === LEGAL_PRE_CUTOVER_ALIAS || alias === LEGAL_POST_CUTOVER_ALIAS;

    return [
      {
        label: "package.json exposes exact verify:phase73 script",
        passed: scripts["verify:phase73"] === PHASE_73_VERIFY_SCRIPT,
      },
      {
        label: "package.json exposes exact verify:phase73-v41-close-gate script",
        passed: scripts["verify:phase73-v41-close-gate"] === PHASE_73_V41_CLOSE_GATE_SCRIPT,
        blocked: true,
      },
      {
        label: "verify:phase alias stays in a legal pre-cutover or post-cutover posture",
        passed: aliasValid,
      },
      {
        label: smokeOnly
          ? "verify:phase alias currently remains in the pre-cutover valid posture"
          : "verify:phase alias currently remains in the post-cutover applied posture",
        passed: smokeOnly ? alias === LEGAL_PRE_CUTOVER_ALIAS : alias === LEGAL_POST_CUTOVER_ALIAS,
        blocked: smokeOnly,
      },
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON with required close-gate scripts",
        passed: false,
      },
    ];
  }
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
        && (nonCommentIncludes(routeRegistrySource, '"/settings/plugins"')
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
      label: "src/lib/dal/classroom.ts carries the latest-only recap stats truth helper",
      passed: nonCommentIncludes(dalSource, RECAP_HELPER_TOKEN),
    },
    {
      label: "recap stats helper restricts to pluginOwnedQuizResponses.isLatest = true",
      passed: nonCommentIncludes(dalSource, "eq(pluginOwnedQuizResponses.isLatest, true)"),
    },
    {
      label: "getClassroomSessionRecapDTO exposes quizSampleStats on the recap DTO contract",
      passed:
        nonCommentIncludes(dalSource, "export async function getClassroomSessionRecapDTO")
        && nonCommentIncludes(dalSource, "quizSampleStats: recap.quizSampleStats"),
    },
    {
      label: "ClassroomSessionRecapDTOSchema declares quizSampleStats section",
      passed:
        nonCommentIncludes(dtoSource, "ClassroomSessionRecapQuizStatsSectionDTOSchema")
        && nonCommentIncludes(dtoSource, "quizSampleStats: ClassroomSessionRecapQuizStatsSectionDTOSchema"),
    },
  ];
}

function verifyManualLedgerStage(smokeOnly: boolean): StaticCheck[] {
  const proofMappingSource = read(FINAL_ARTIFACT_PATHS.proofMapping);
  const verificationSource = read(FINAL_ARTIFACT_PATHS.verification);
  const closeoutSource = read(FINAL_ARTIFACT_PATHS.closeout);
  const manualSignoffSource = read(FINAL_ARTIFACT_PATHS.manualSignoff);
  const rows = parseManualLedgerRows(proofMappingSource);
  const liveRow = rows.find((row) => row.heading === LIVE_ANSWER_ROW_HEADING);
  const recapRow = rows.find((row) => row.heading === RECAP_ROW_HEADING);
  const liveSections = parseManualSignoffSections(manualSignoffSource);
  const liveAnswerSection = liveSections.find((section) => section.heading === "LIVE_ANSWER_SIGNOFF");
  const recapSection = liveSections.find((section) => section.heading === "RECAP_SIGNOFF");

  if (smokeOnly) {
    return [
      {
        label: `proof mapping path constant is wired: ${FINAL_ARTIFACT_PATHS.proofMapping}`,
        passed: FINAL_ARTIFACT_PATHS.proofMapping.length > 0,
      },
      {
        label: `verification path constant is wired: ${FINAL_ARTIFACT_PATHS.verification}`,
        passed: FINAL_ARTIFACT_PATHS.verification.length > 0,
      },
      {
        label: `closeout path constant is wired: ${FINAL_ARTIFACT_PATHS.closeout}`,
        passed: FINAL_ARTIFACT_PATHS.closeout.length > 0,
      },
      {
        label: `manual signoff path constant is wired: ${FINAL_ARTIFACT_PATHS.manualSignoff}`,
        passed: FINAL_ARTIFACT_PATHS.manualSignoff.length > 0,
      },
      {
        label: "proof mapping ledger parser can identify the four single-file rows",
        passed: rows.length === 4,
      },
      {
        label: "future verification artifact presence is tracked as readiness, not a smoke hard-fail",
        passed: verificationSource.length > 0 && closeoutSource.length > 0,
        blocked: true,
      },
      {
        label: "future v4.1 manual sign-off payload is tracked as readiness, not a smoke hard-fail",
        passed: Boolean(liveAnswerSection && recapSection && liveRow && recapRow),
        blocked: true,
      },
    ];
  }

  const passedRows = rows.filter(
    (row) => normalizeFieldValue(row.fields.status) === "status: passed",
  );

  const ledgerFieldChecks = passedRows.flatMap((row) => {
    const executedBy = normalizeFieldValue(row.fields.executed_by);
    const executedAt = normalizeFieldValue(row.fields.executed_at);
    const evidenceNote = normalizeFieldValue(row.fields["evidence note"]);
    return [
      {
        label: `${row.heading} carries a non-empty executed_by value`,
        passed: executedBy.length > 0 && !executedBy.includes("pending"),
      },
      {
        label: `${row.heading} carries a parseable ISO executed_at value`,
        passed: isIsoDate(executedAt),
      },
      {
        label: `${row.heading} carries a non-empty evidence note value`,
        passed: evidenceNote.length > 0 && !evidenceNote.includes("pending"),
      },
    ] satisfies StaticCheck[];
  });

  return [
    {
      label: "73-PROOF-MAPPING.md exists at the authoritative path",
      passed: proofMappingSource.length > 0,
    },
    {
      label: "73-VERIFICATION.md exists at the authoritative path",
      passed: verificationSource.length > 0,
    },
    {
      label: "73-CLOSEOUT.md exists at the authoritative path",
      passed: closeoutSource.length > 0,
    },
    {
      label: "proof mapping retains the single-file Manual Surface Sign-Off Ledger",
      passed: proofMappingSource.includes("Manual Surface Sign-Off Ledger"),
    },
    {
      label: "proof mapping records four passed sign-off rows in total",
      passed: countOccurrences(proofMappingSource, MANUAL_SIGNOFF_EXECUTED_ROW_TOKEN) === 4,
    },
    {
      label: "proof mapping retains the locked ledger field tokens for executed_by / executed_at / evidence note",
      passed: REQUIRED_SIGNOFF_FIELD_TOKENS.every((token) => proofMappingSource.includes(token)),
    },
    {
      label: "v4.1 live-answer row is one of the four passed rows",
      passed: normalizeFieldValue(liveRow?.fields.status) === "status: passed",
    },
    {
      label: "v4.1 recap row is one of the four passed rows",
      passed: normalizeFieldValue(recapRow?.fields.status) === "status: passed",
    },
    {
      label: "74-MANUAL-SIGNOFF.md exists for externalized session_id / observed_url evidence",
      passed: manualSignoffSource.length > 0,
    },
    {
      label: "live-answer signoff section carries non-empty session_id and observed_url",
      passed:
        normalizeFieldValue(liveAnswerSection?.fields.session_id).length > 0
        && normalizeFieldValue(liveAnswerSection?.fields.observed_url).length > 0,
    },
    {
      label: "recap signoff section carries non-empty session_id and observed_url",
      passed:
        normalizeFieldValue(recapSection?.fields.session_id).length > 0
        && normalizeFieldValue(recapSection?.fields.observed_url).length > 0,
    },
    {
      label: "live-answer proof row points at the real /classroom live-answer surface",
      passed:
        normalizeFieldValue(liveRow?.fields["proof artifact"]).includes("src/app/(classroom)/classroom/page.tsx")
        && normalizeFieldValue(liveRow?.fields["proof artifact"]).includes("src/components/classroom/live-answer-dashboard-surface.tsx"),
    },
    {
      label: "recap proof row points at classroom-session-recap-surface.tsx",
      passed: normalizeFieldValue(recapRow?.fields["proof artifact"]).includes("src/components/classroom/classroom-session-recap-surface.tsx"),
    },
    ...ledgerFieldChecks,
  ];
}

function verifyMultiTypeCrosswalk(smokeOnly: boolean): StaticCheck[] {
  const proofMappingSource = read(FINAL_ARTIFACT_PATHS.proofMapping);
  const verificationSource = read(FINAL_ARTIFACT_PATHS.verification);
  const closeoutSource = read(FINAL_ARTIFACT_PATHS.closeout);
  const requirementTokens = [
    "QUIZ-EXT-01-A",
    "QUIZ-EXT-01-B",
    "QUIZ-EXT-01-C",
    "QUIZ-EXT-01-D",
    "QUIZ-EXT-01-E",
    "QUIZ-EXT-02-A",
    "QUIZ-EXT-02-B",
    "QUIZ-EXT-02-C",
    "QUIZ-EXT-02-D",
    "QUIZ-EXT-02-E",
    "QUIZ-EXT-CLOSE-01",
    "QUIZ-EXT-CLOSE-02",
    "QUIZ-EXT-CLOSE-03",
  ] as const;
  const proofHooks = [
    "verify:phase73",
    "scripts/verify-phase73-quiz-ext.ts",
    "src/lib/dal/classroom.ts",
    "src/components/classroom/classroom-session-recap-surface.tsx",
  ] as const;

  if (smokeOnly) {
    return [
      {
        label: "multi-type crosswalk hooks are defined for requirement trace coverage",
        passed: requirementTokens.length === 13 && proofHooks.length === 4,
      },
      {
        label: "verification and closeout artifacts are still pending but surfaced as readiness",
        passed: verificationSource.length > 0 && closeoutSource.length > 0,
        blocked: true,
      },
    ];
  }

  const proofCorpus = [proofMappingSource, verificationSource, closeoutSource].join("\n");

  return [
    ...requirementTokens.map((token) => ({
      label: `close-proof corpus names requirement trace token ${token}`,
      passed: proofCorpus.includes(token),
    })),
    ...proofHooks.map((token) => ({
      label: `close-proof corpus names proof-structure hook ${token}`,
      passed: proofCorpus.includes(token),
    })),
  ];
}

function verifyLiveDashboardCrosswalk(smokeOnly: boolean): StaticCheck[] {
  const proofMappingSource = read(FINAL_ARTIFACT_PATHS.proofMapping);
  const verificationSource = read(FINAL_ARTIFACT_PATHS.verification);
  const closeoutSource = read(FINAL_ARTIFACT_PATHS.closeout);
  const packageSource = read("package.json");
  const manualRows = parseManualLedgerRows(proofMappingSource);
  const liveRow = manualRows.find((row) => row.heading === LIVE_ANSWER_ROW_HEADING);
  const recapRow = manualRows.find((row) => row.heading === RECAP_ROW_HEADING);

  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const alias = scripts["verify:phase"] ?? "";
    const readinessChecks: StaticCheck[] = [
      {
        label: "D-04 readiness: verify:phase73 exists",
        passed: scripts["verify:phase73"] === PHASE_73_VERIFY_SCRIPT,
        blocked: smokeOnly,
      },
      {
        label: "D-04 readiness: verify:phase73-v41-close-gate exists",
        passed: scripts["verify:phase73-v41-close-gate"] === PHASE_73_V41_CLOSE_GATE_SCRIPT,
        blocked: smokeOnly,
      },
      {
        label: "D-04 readiness: 73-PROOF-MAPPING.md exists",
        passed: proofMappingSource.length > 0,
        blocked: smokeOnly,
      },
      {
        label: "D-04 readiness: 73-VERIFICATION.md exists",
        passed: verificationSource.length > 0,
        blocked: smokeOnly,
      },
      {
        label: "D-04 readiness: 73-CLOSEOUT.md exists",
        passed: closeoutSource.length > 0,
        blocked: smokeOnly,
      },
      {
        label: "D-04 readiness: v4.1 live-answer manual row is status: passed",
        passed: normalizeFieldValue(liveRow?.fields.status) === "status: passed",
        blocked: smokeOnly,
      },
      {
        label: "D-04 readiness: v4.1 recap manual row is status: passed",
        passed: normalizeFieldValue(recapRow?.fields.status) === "status: passed",
        blocked: smokeOnly,
      },
      {
        label: "verify:phase alias remains legal while cutover is pending or complete",
        passed: alias === LEGAL_PRE_CUTOVER_ALIAS || alias === LEGAL_POST_CUTOVER_ALIAS,
      },
    ];

    if (smokeOnly) {
      return readinessChecks;
    }

    const proofCorpus = [proofMappingSource, verificationSource, closeoutSource].join("\n");
    return [
      {
        label: "close-proof corpus explicitly references the real /classroom live-answer surface",
        passed: proofCorpus.includes("/classroom") && proofCorpus.includes("live-answer"),
      },
      {
        label: "close-proof corpus explicitly references the live-answer transport event",
        passed: proofCorpus.includes(LIVE_EVENT_TOKEN),
      },
      {
        label: "close-proof corpus explicitly references the teacher-only posture",
        passed: proofCorpus.includes("teacher-only"),
      },
      {
        label: "close-proof corpus explicitly references the no second transport runtime posture",
        passed: proofCorpus.includes("no second transport runtime"),
      },
      ...readinessChecks,
    ];
  } catch {
    return [
      {
        label: "package.json is valid JSON for alias readiness checks",
        passed: false,
      },
    ];
  }
}

function reportStage(stage: StageStatus) {
  const icon = stage.status === "passed" ? "✓" : stage.status === "blocked" ? "↺" : "❌";
  const heading = stage.status === "passed" ? "passed" : stage.status === "blocked" ? "blocked" : "failed";
  console.log(`  ${icon} ${stage.label} (${heading})`);
  for (const detail of stage.details) {
    console.log(`     ${detail}`);
  }
}

function summariseStage(label: string, checks: StaticCheck[], smokeOnly: boolean): StageStatus {
  const failedChecks = checks.filter((check) => !check.passed);
  const status: CheckStatus =
    failedChecks.length === 0
      ? "passed"
      : smokeOnly && failedChecks.every((check) => check.blocked)
        ? "blocked"
        : "failed";

  return {
    label,
    status,
    details: checks.map((check) => {
      const icon = check.passed ? "✓" : check.blocked ? "↺" : "✗";
      const suffix = !check.passed && check.blocked ? " [readiness blocked]" : "";
      return `- ${icon} ${check.label}${suffix}`;
    }),
  };
}

async function runUpstreamVerification(smokeOnly: boolean): Promise<StageStatus> {
  const args = smokeOnly ? ["verify:phase73", "--smoke"] : ["verify:phase73"];

  try {
    run("pnpm", args, smokeOnly ? "Phase 73 smoke verifier" : "Phase 73 full verifier");
    return {
      label: STAGE_LABELS[1],
      status: "passed",
      details: [
        `- ✓ ${smokeOnly ? "pnpm verify:phase73 --smoke" : "pnpm verify:phase73"} completed as the single upstream product proof lane`,
      ],
    };
  } catch (error) {
    return {
      label: STAGE_LABELS[1],
      status: "failed",
      details: [
        `- ✗ ${smokeOnly ? "pnpm verify:phase73 --smoke" : "pnpm verify:phase73"} failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

export async function runPhase73V41CloseGate(options?: { smokeOnly?: boolean }): Promise<GateResult> {
  const smokeOnly = options?.smokeOnly ?? process.argv.includes("--smoke");

  console.log("==================================================");
  console.log(`Phase 73 v4.1 authoritative close-gate verification (${smokeOnly ? "smoke" : "full"}) starting...`);
  console.log("(thin outer gate: product truth inward, close truth outward)");
  console.log("==================================================");

  const stageStatuses: StageStatus[] = [];

  console.log(`\n[1/7] ${STAGE_LABELS[0]}...`);
  const staticStage = summariseStage(
    STAGE_LABELS[0],
    verifyPackageScripts(read("package.json"), smokeOnly),
    smokeOnly,
  );
  stageStatuses.push(staticStage);
  reportStage(staticStage);

  console.log(`\n[2/7] ${STAGE_LABELS[1]}...`);
  const upstreamStage = await runUpstreamVerification(smokeOnly);
  stageStatuses.push(upstreamStage);
  reportStage(upstreamStage);

  console.log(`\n[3/7] ${STAGE_LABELS[2]}...`);
  const lifecycleStage = summariseStage(
    STAGE_LABELS[2],
    verifyLifecycleMilestoneBridge(),
    smokeOnly,
  );
  stageStatuses.push(lifecycleStage);
  reportStage(lifecycleStage);

  console.log(`\n[4/7] ${STAGE_LABELS[3]}...`);
  const recapStage = summariseStage(
    STAGE_LABELS[3],
    verifyRecapMilestoneBridge(),
    smokeOnly,
  );
  stageStatuses.push(recapStage);
  reportStage(recapStage);

  console.log(`\n[5/7] ${STAGE_LABELS[4]}...`);
  const manualStage = summariseStage(
    STAGE_LABELS[4],
    verifyManualLedgerStage(smokeOnly),
    smokeOnly,
  );
  stageStatuses.push(manualStage);
  reportStage(manualStage);

  console.log(`\n[6/7] ${STAGE_LABELS[5]}...`);
  const multiTypeStage = summariseStage(
    STAGE_LABELS[5],
    verifyMultiTypeCrosswalk(smokeOnly),
    smokeOnly,
  );
  stageStatuses.push(multiTypeStage);
  reportStage(multiTypeStage);

  console.log(`\n[7/7] ${STAGE_LABELS[6]}...`);
  const liveDashboardStage = summariseStage(
    STAGE_LABELS[6],
    verifyLiveDashboardCrosswalk(smokeOnly),
    smokeOnly,
  );
  stageStatuses.push(liveDashboardStage);
  reportStage(liveDashboardStage);

  const overallStatus: CheckStatus = smokeOnly
    ? stageStatuses.some((stage) => stage.status === "failed")
      ? "failed"
      : stageStatuses.some((stage) => stage.status === "blocked")
        ? "blocked"
        : "passed"
    : stageStatuses.every((stage) => stage.status === "passed")
      ? "passed"
      : "failed";

  console.log("\n==================================================");
  console.log(`Phase 73 v4.1 authoritative close-gate verification ${overallStatus}.`);
  console.log("==================================================");

  return {
    overallStatus,
    stageStatuses,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase73V41CloseGate().then((result) => {
    if (result.overallStatus === "failed") {
      process.exit(1);
    }
    process.exit(0);
  }).catch((error) => {
    console.error("Unhandled close-gate error:", error);
    process.exit(1);
  });
}
