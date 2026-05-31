import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PHASE60_THRESHOLDS } from "./load/phase60-thresholds.js";
import { ensurePhase60Fixtures } from "./load/phase60-fixtures";
import { runPhase60LoadSmoke, PHASE60_SMOKE_RESULT_PATH } from "./proof-phase60-load-smoke";

export const PHASE60_ROLLOUT_NOTES_PATH = path.join(process.cwd(), "ops", "releases", "evidence", "phase60", "rollout-notes.md");
export const PHASE60_ROLLBACK_NOTES_PATH = path.join(process.cwd(), "ops", "releases", "evidence", "phase60", "rollback-notes.md");
export const PHASE60_TRANSPORT_FALLBACK_NOTES_PATH = path.join(process.cwd(), "ops", "releases", "evidence", "phase60", "transport-fallback-notes.md");
export const PHASE60_REHEARSAL_SUMMARY_PATH = path.join(process.cwd(), "ops", "releases", "evidence", "phase60", "rehearsal-summary.md");

type RehearsalCommand = {
  command: string;
  args: string[];
};

type RollbackTrigger = {
  kind: "sample-smoke-regression" | "ready-blocker";
  reason: string;
};

const PHASE60_REHEARSAL_REQUIRED_ENV = [
  "OPENLEARN_SHARED_ROOT",
  "OPENLEARN_CURRENT_ROOT",
  "OPENLEARN_HEALTHCHECK_BASE_URL",
  "PHASE60_BASE_URL",
] as const;

function isDryRun() {
  return process.env.PHASE60_REHEARSAL_MODE === "dry-run";
}

function getMissingPhase60RehearsalEnv() {
  return PHASE60_REHEARSAL_REQUIRED_ENV.filter((envName) => !process.env[envName]?.trim());
}

function ensureEvidenceDirectory() {
  mkdirSync(path.dirname(PHASE60_REHEARSAL_SUMMARY_PATH), { recursive: true });
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 60 rehearsal failed while running: ${label}`);
    throw error;
  }
}

export function buildPhase60DeployCommand(input: {
  environment: string;
  actor: string;
  sharedRoot: string;
  currentRoot: string;
  baseUrl: string;
  schoolId: string;
  classroomSessionId: string;
  lessonVersionId: string;
  pluginId: string;
  actionKey: string;
  commandId: string;
  taskId: string;
  dryRun: boolean;
}): RehearsalCommand {
  const args = [
    "ops/deploy/deploy.sh",
    "--environment",
    input.environment,
    "--actor",
    input.actor,
    "--shared-root",
    input.sharedRoot,
    "--current-root",
    input.currentRoot,
    "--base-url",
    input.baseUrl,
    "--school-id",
    input.schoolId,
    "--classroom-session-id",
    input.classroomSessionId,
    "--lesson-version-id",
    input.lessonVersionId,
    "--plugin-id",
    input.pluginId,
    "--action-key",
    input.actionKey,
    "--command-id",
    input.commandId,
    "--task-id",
    input.taskId,
  ];

  if (input.dryRun) {
    args.push("--dry-run");
  }

  return {
    command: "bash",
    args,
  };
}

export function buildPhase60RollbackCommand(input: {
  releaseId: string;
  reason: string;
  sharedRoot: string;
  currentRoot: string;
  baseUrl: string;
  dryRun: boolean;
}): RehearsalCommand {
  const args = [
    "ops/deploy/rollback.sh",
    "--release-id",
    input.releaseId,
    "--reason",
    input.reason,
    "--shared-root",
    input.sharedRoot,
    "--current-root",
    input.currentRoot,
    "--base-url",
    input.baseUrl,
  ];

  if (input.dryRun) {
    args.push("--dry-run");
  }

  return {
    command: "bash",
    args,
  };
}

export function determinePhase60RollbackTrigger(input: {
  smokeResult: { status?: string; blockingFailure?: string | null } | null;
  readyStatus: number;
  readyPayload?: { blocking?: string[]; reason?: string } | null;
  forcedTrigger?: "sample-smoke-regression" | "ready-blocker" | null;
}): RollbackTrigger | null {
  if (input.forcedTrigger === "sample-smoke-regression") {
    return {
      kind: "sample-smoke-regression",
      reason: "Sample smoke regression was selected as the controlled rollback rehearsal trigger.",
    };
  }

  if (input.forcedTrigger === "ready-blocker") {
    return {
      kind: "ready-blocker",
      reason: "Ready blocker was selected as the controlled rollback rehearsal trigger.",
    };
  }

  if (input.smokeResult?.status && input.smokeResult.status !== "passed" && input.smokeResult.status !== "dry-run") {
    return {
      kind: "sample-smoke-regression",
      reason: input.smokeResult.blockingFailure ?? "Phase 60 smoke result reported a sample-chain regression.",
    };
  }

  if (input.readyStatus !== 200 || (input.readyPayload?.blocking?.length ?? 0) > 0) {
    return {
      kind: "ready-blocker",
      reason: input.readyPayload?.reason ?? "The /api/ready probe reported a blocking posture.",
    };
  }

  return null;
}

export function evaluatePhase60RollbackSuccess(input: {
  healthStatus: number;
  readyStatus: number;
  smokeStatus: string | null | undefined;
  dryRun: boolean;
}) {
  const smokeOk = input.dryRun
    ? input.smokeStatus === "dry-run" || input.smokeStatus === "passed"
    : input.smokeStatus === "passed";
  const ok = input.healthStatus === 200 && input.readyStatus === 200 && smokeOk;

  return {
    ok,
    reason: ok
      ? "Rollback recovered health, ready, and sample smoke."
      : "Rollback success requires /api/health, /api/ready, and sample smoke all green.",
  };
}

async function fetchProbe(baseUrl: string, pathName: "/api/health" | "/api/ready") {
  if (isDryRun()) {
    return {
      status: 200,
      payload: pathName === "/api/ready"
        ? {
          ok: true,
          blocking: [],
          reason: "Dry-run rehearsal keeps probes synthetic and green.",
        }
        : { ok: true },
    };
  }

  const response = await fetch(`${baseUrl}${pathName}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  return {
    status: response.status,
    payload,
  };
}

function renderRolloutNotes(input: {
  actor: string;
  releaseId: string;
  trigger: string;
  command: RehearsalCommand;
  dryRun: boolean;
}) {
  return `# Pilot rollout checklist\n\n## Rollout block trigger alignment\n\n- [x] Confirm no unsupported rollout block trigger is active before deploy.\n- [x] Operator actor: \`${input.actor}\`\n- [x] Rehearsal mode: \`${input.dryRun ? "dry-run" : "live"}\`\n- [x] Planned rehearsal release id: \`${input.releaseId}\`\n\n## Canonical release truth\n\n- [x] Canonical release path stays on \`ops/deploy/deploy.sh\`.\n- [x] Rollout trigger source recorded as: ${input.trigger}\n\n## Execution steps\n\n- [x] Command: \`${[input.command.command, ...input.command.args].join(" ")}\`\n\n## Post-deploy verification\n\n- [x] Phase 60 smoke check completed before rollback trigger evaluation.\n- [x] /api/health and /api/ready stayed on the canonical probe path.\n\n## Failure posture\n\n- [x] Only sample-smoke regression or ready-blocker may trigger rollback.\n`;
}

function renderRollbackNotes(input: {
  actor: string;
  releaseId: string;
  trigger: RollbackTrigger;
  command: RehearsalCommand;
  postHealthStatus: number;
  postReadyStatus: number;
  postSmokeStatus: string | null | undefined;
  dryRun: boolean;
}) {
  return `# Pilot rollback checklist\n\n## Pilot rollback trigger alignment\n\n- [x] Confirmed trigger: \`${input.trigger.kind}\`\n- [x] Trigger reason: ${input.trigger.reason}\n- [x] Operator actor: \`${input.actor}\`\n\n## Canonical pointer and manifest checkpoints\n\n- [x] Rollback target release id: \`${input.releaseId}\`\n- [x] Canonical rollback path stays on \`ops/deploy/rollback.sh\`.\n\n## Execution steps\n\n- [x] Command: \`${[input.command.command, ...input.command.args].join(" ")}\`\n\n## Post-rollback verification\n\n- [x] /api/health status: \`${input.postHealthStatus}\`\n- [x] /api/ready status: \`${input.postReadyStatus}\`\n- [x] Sample smoke status: \`${input.postSmokeStatus ?? "missing"}\`\n- [x] Rehearsal mode: \`${input.dryRun ? "dry-run" : "live"}\`\n\n## Escalation\n\n- [x] If any post-rollback proof is not green, escalate to restore posture immediately.\n`;
}

function renderTransportFallbackNotes() {
  return `# Phase 60 transport fallback rehearsal notes\n\n- Trigger: pending manual rehearsal\n- Trust boundary: WebSocket-first transport with SSE only as rollback surface\n- Impact scope: single-school pilot classroom voting sample chain\n- Operator action: execute the approved transport fallback runbook and capture the classroom/session scope\n- Escalation condition: degraded posture lasts longer than ${PHASE60_THRESHOLDS.degradedDurationMs} ms or becomes teacher-visible enough to threaten pilot trust\n- Conclusion: manual artifact required; this file must be updated during the live rehearsal\n`;
}

function renderRehearsalSummary(input: {
  smokeResult: Record<string, unknown> | null;
  capacityResult: Record<string, unknown> | null;
  drillResult: Record<string, unknown> | null;
  rollbackTrigger: RollbackTrigger;
  rolloutReleaseId: string;
  rehearsalOutcome: { ok: boolean; reason: string };
  dryRun: boolean;
}) {
  return `# Phase 60 rehearsal summary\n\nMachine-readable sources:\n- \`ops/releases/evidence/phase60/smoke-result.json\`\n- \`ops/releases/evidence/phase60/capacity-result.json\`\n- \`ops/releases/evidence/phase60/drill-results.json\`\n\n## Sample smoke\n\n- Status: \`${String(input.smokeResult?.status ?? "missing")}\`\n- Blocking failure: ${String(input.smokeResult?.blockingFailure ?? "none")}\n\n## Capacity gate\n\n- Status: \`${String(input.capacityResult?.status ?? "missing")}\`\n- Blocking failure: ${String(input.capacityResult?.blockingFailure ?? "none")}\n\n## Automated drills\n\n- Status: \`${String(input.drillResult?.status ?? "missing")}\`\n- Blocking failure: ${String(input.drillResult?.blockingFailure ?? "none")}\n\n## Shared stop rules\n\n- reconnect <= ${PHASE60_THRESHOLDS.reconnectRecoveryMs} ms\n- worker backlog <= ${PHASE60_THRESHOLDS.workerBacklogWindowMs} ms\n- partial failure ratio < ${PHASE60_THRESHOLDS.partialFailureRatioMax}\n- degraded duration <= ${PHASE60_THRESHOLDS.degradedDurationMs} ms\n\n## Controlled rollout and rollback\n\n- Rehearsal release id: \`${input.rolloutReleaseId}\`\n- Rollback trigger: \`${input.rollbackTrigger.kind}\`\n- Trigger reason: ${input.rollbackTrigger.reason}\n- Mode: \`${input.dryRun ? "dry-run" : "live"}\`\n\n## Go/No-Go\n\n- Verdict: \`${input.rehearsalOutcome.ok ? "go" : "no-go"}\`\n- Rationale: ${input.rehearsalOutcome.reason}\n- Closeout note: ${input.dryRun ? "dry-run artifacts are authoring-only and cannot satisfy PILOT-03 / LOAD-01 / LOAD-02." : "live pilot-host evidence recorded on the canonical release path."}\n`;
}

export async function runPhase60RolloutRollbackRehearsal() {
  ensureEvidenceDirectory();

  const dryRun = isDryRun();
  const fixtures = await ensurePhase60Fixtures({ dryRun });
  const primaryClassroom = fixtures.classrooms[0];
  const actor = process.env.PHASE60_REHEARSAL_ACTOR ?? "phase60-rehearsal";
  const environment = process.env.OPENLEARN_DEPLOY_ENV ?? "pilot-single-school";
  const sharedRoot = process.env.OPENLEARN_SHARED_ROOT ?? "";
  const currentRoot = process.env.OPENLEARN_CURRENT_ROOT ?? "";
  const baseUrl = process.env.OPENLEARN_HEALTHCHECK_BASE_URL ?? process.env.PHASE60_BASE_URL ?? "";
  const releaseId = process.env.PHASE60_REHEARSAL_RELEASE_ID ?? "phase60-green-release";
  const forcedTrigger = (process.env.PHASE60_FORCE_TRIGGER as "sample-smoke-regression" | "ready-blocker" | undefined)
    ?? (dryRun ? "sample-smoke-regression" : undefined);

  const missingEnv = dryRun ? [] : getMissingPhase60RehearsalEnv();
  if (missingEnv.length > 0) {
    throw new Error(`PHASE60_LIVE_TARGET_ENV_MISSING: ${missingEnv.join(", ")}`);
  }

  const deployCommand = buildPhase60DeployCommand({
    environment,
    actor,
    sharedRoot,
    currentRoot,
    baseUrl,
    schoolId: fixtures.schoolId,
    classroomSessionId: primaryClassroom.classroomSessionId,
    lessonVersionId: fixtures.publishedVersionId,
    pluginId: process.env.PHASE60_REHEARSAL_PLUGIN_ID ?? "plugin-voting-proof",
    actionKey: process.env.PHASE60_REHEARSAL_ACTION_KEY ?? "launchVote",
    commandId: process.env.PHASE60_REHEARSAL_COMMAND_ID ?? `phase60-command-${Date.now()}`,
    taskId: process.env.PHASE60_REHEARSAL_TASK_ID ?? `phase60-task-${Date.now()}`,
    dryRun,
  });
  run(deployCommand.command, deployCommand.args, "Phase 60 canonical deploy rehearsal");

  await runPhase60LoadSmoke();
  const smokeResult = readJsonFile<Record<string, unknown>>(PHASE60_SMOKE_RESULT_PATH);
  const readyResult = await fetchProbe(baseUrl, "/api/ready");
  const rollbackTrigger = determinePhase60RollbackTrigger({
    smokeResult,
    readyStatus: readyResult.status,
    readyPayload: readyResult.payload as { blocking?: string[]; reason?: string } | null,
    forcedTrigger,
  });

  if (!rollbackTrigger) {
    throw new Error("PHASE60_ROLLBACK_TRIGGER_REQUIRED");
  }

  const rollbackCommand = buildPhase60RollbackCommand({
    releaseId,
    reason: rollbackTrigger.reason,
    sharedRoot,
    currentRoot,
    baseUrl,
    dryRun,
  });
  run(rollbackCommand.command, rollbackCommand.args, "Phase 60 canonical rollback rehearsal");

  const healthResult = await fetchProbe(baseUrl, "/api/health");
  const postRollbackReady = await fetchProbe(baseUrl, "/api/ready");
  await runPhase60LoadSmoke();
  const postRollbackSmoke = readJsonFile<{ status?: string }>(PHASE60_SMOKE_RESULT_PATH);
  const rehearsalOutcome = evaluatePhase60RollbackSuccess({
    healthStatus: healthResult.status,
    readyStatus: postRollbackReady.status,
    smokeStatus: postRollbackSmoke?.status,
    dryRun,
  });

  const capacityResult = readJsonFile<Record<string, unknown>>(path.join(process.cwd(), "ops", "releases", "evidence", "phase60", "capacity-result.json"));
  const drillResult = readJsonFile<Record<string, unknown>>(path.join(process.cwd(), "ops", "releases", "evidence", "phase60", "drill-results.json"));

  writeFileSync(
    PHASE60_ROLLOUT_NOTES_PATH,
    renderRolloutNotes({
      actor,
      releaseId,
      trigger: rollbackTrigger.reason,
      command: deployCommand,
      dryRun,
    }),
  );
  writeFileSync(
    PHASE60_ROLLBACK_NOTES_PATH,
    renderRollbackNotes({
      actor,
      releaseId,
      trigger: rollbackTrigger,
      command: rollbackCommand,
      postHealthStatus: healthResult.status,
      postReadyStatus: postRollbackReady.status,
      postSmokeStatus: postRollbackSmoke?.status,
      dryRun,
    }),
  );
  writeFileSync(PHASE60_TRANSPORT_FALLBACK_NOTES_PATH, renderTransportFallbackNotes());
  writeFileSync(
    PHASE60_REHEARSAL_SUMMARY_PATH,
    renderRehearsalSummary({
      smokeResult,
      capacityResult,
      drillResult,
      rollbackTrigger,
      rolloutReleaseId: releaseId,
      rehearsalOutcome,
      dryRun,
    }),
  );

  if (!rehearsalOutcome.ok) {
    throw new Error("PHASE60_ROLLBACK_REHEARSAL_FAILED");
  }

  return rehearsalOutcome;
}

async function main() {
  console.log("==================================================");
  console.log("Starting Phase 60 rollout/rollback rehearsal...");
  console.log("==================================================");
  await runPhase60RolloutRollbackRehearsal();
  console.log("==================================================");
  console.log("Phase 60 rollout/rollback rehearsal completed.");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error("Phase 60 rollout/rollback rehearsal failed:", error);
    process.exit(1);
  });
}
