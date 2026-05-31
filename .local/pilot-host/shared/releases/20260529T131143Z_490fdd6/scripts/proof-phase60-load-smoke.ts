import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runPhase57BrowserProof } from "./proof-phase57-classroom-runtime";
import { ensurePhase60Fixtures } from "./load/phase60-fixtures";

export const PHASE60_SMOKE_RESULT_PATH = path.join(
  process.cwd(),
  "ops",
  "releases",
  "evidence",
  "phase60",
  "smoke-result.json",
);

const PHASE60_SMOKE_REQUIRED_ENV = ["PHASE60_BASE_URL"] as const;

function isDryRunAuthoringMode() {
  return process.env.PHASE60_REHEARSAL_MODE === "dry-run"
    || process.env.PHASE60_K6_MODE === "dry-run"
    || process.env.PHASE60_SMOKE_MODE === "dry-run";
}

function getMissingPhase60SmokeEnv() {
  return PHASE60_SMOKE_REQUIRED_ENV.filter((envName) => !process.env[envName]?.trim());
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
    });

    if (output) {
      process.stdout.write(output);
    }
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 60 smoke failed while running: ${label}`);
    throw error;
  }
}

function writeSmokeResult(payload: Record<string, unknown>) {
  mkdirSync(path.dirname(PHASE60_SMOKE_RESULT_PATH), { recursive: true });
  writeFileSync(PHASE60_SMOKE_RESULT_PATH, JSON.stringify(payload, null, 2));
}

async function runPhase57ProofForPhase60() {
  const phase60BaseUrl = process.env.PHASE60_BASE_URL?.trim();

  if (!phase60BaseUrl) {
    await runPhase57BrowserProof();
    return;
  }

  const previousBaseUrl = process.env.PHASE57_PROOF_BASE_URL;
  process.env.PHASE57_PROOF_BASE_URL = phase60BaseUrl;

  try {
    await runPhase57BrowserProof();
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.PHASE57_PROOF_BASE_URL;
    } else {
      process.env.PHASE57_PROOF_BASE_URL = previousBaseUrl;
    }
  }
}

export async function runPhase60LoadSmoke() {
  const dryRun = isDryRunAuthoringMode();
  const fixtures = await ensurePhase60Fixtures({ dryRun });
  const primarySession = fixtures.classrooms[0]?.classroomSessionId ?? null;

  if (dryRun) {
    const payload = {
      checkedAt: new Date().toISOString(),
      proofScopeId: fixtures.proofScopeId,
      classroomSessionId: primarySession,
      designPublish: {
        status: "dry-run",
        script: "pnpm verify:phase56",
      },
      browserProof: {
        status: "dry-run",
        reusedScript: "runPhase57BrowserProof",
      },
      status: "dry-run",
      blockingFailure: "Authoring mode only: dry-run smoke artifacts cannot satisfy the Phase 60 close gate.",
      nextStep: "Provide PHASE60_BASE_URL on the live target, switch off dry-run mode, then rerun the real Phase 56 + Phase 57 sample-smoke chain.",
    };
    writeSmokeResult(payload);
    return payload;
  }

  const missingEnv = getMissingPhase60SmokeEnv();
  if (missingEnv.length > 0) {
    const payload = {
      checkedAt: new Date().toISOString(),
      proofScopeId: fixtures.proofScopeId,
      classroomSessionId: primarySession,
      designPublish: {
        status: "blocked",
        script: "pnpm verify:phase56",
      },
      browserProof: {
        status: "blocked",
        reusedScript: "runPhase57BrowserProof",
      },
      status: "blocked",
      blockingFailure: `Missing live target env: ${missingEnv.join(", ")}`,
      nextStep: "Set the required live target env on the pilot host before rerunning the Phase 60 smoke gate.",
    };
    writeSmokeResult(payload);
    throw new Error(payload.blockingFailure);
  }

  try {
    run("pnpm", ["verify:phase56"], "Phase 60 design/publish prerequisite");
    await runPhase57ProofForPhase60();

    const payload = {
      checkedAt: new Date().toISOString(),
      proofScopeId: fixtures.proofScopeId,
      classroomSessionId: primarySession,
      designPublish: {
        status: "passed",
        script: "pnpm verify:phase56",
      },
      browserProof: {
        status: "passed",
        reusedScript: "runPhase57BrowserProof",
      },
      status: "passed",
      blockingFailure: null,
      nextStep: "Capacity and drill gates may continue.",
    };
    writeSmokeResult(payload);
    return payload;
  } catch (error) {
    const payload = {
      checkedAt: new Date().toISOString(),
      proofScopeId: fixtures.proofScopeId,
      classroomSessionId: primarySession,
      designPublish: {
        status: "failed",
        script: "pnpm verify:phase56",
      },
      browserProof: {
        status: "failed",
        reusedScript: "runPhase57BrowserProof",
      },
      status: "close-blocker",
      blockingFailure: error instanceof Error ? error.message : "PHASE60_SMOKE_UNKNOWN_FAILURE",
      nextStep: "Fix the real sample chain before continuing the Phase 60 rehearsal gate.",
    };
    writeSmokeResult(payload);
    throw error;
  }
}

async function main() {
  console.log("==================================================");
  console.log("Starting Phase 60 sample-smoke proof...");
  console.log("==================================================");
  await runPhase60LoadSmoke();
  console.log("==================================================");
  console.log("Phase 60 sample-smoke proof completed.");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error("Phase 60 sample-smoke proof failed:", error);
    process.exit(1);
  });
}
