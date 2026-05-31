import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
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
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 38 verification failed while running: ${label}`);
    throw error;
  }
}

function runPnpm(args: readonly string[], label: string) {
  run("pnpm", args, label);
}

const packageSource = read("package.json");
const phase38VerificationSource = read(
  ".planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-VERIFICATION.md",
);
const fallbackMatrixSource = read(
  ".planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-FALLBACK-MATRIX.md",
);
const demoRunbookSource = read(
  ".planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-DEMO-RUNBOOK.md",
);
const closeoutSource = read(
  ".planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-CLOSEOUT.md",
);

runPnpm(["verify:phase36"], "pnpm verify:phase36");
runPnpm(["verify:phase37"], "pnpm verify:phase37");

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes verify:phase38",
    passed:
      packageSource.includes('"verify:phase38"') &&
      packageSource.includes("verify-phase38-cutover-closeout.ts"),
  },
  {
    label: "phase 38 verification report exists and keeps route-by-route parity scope",
    passed:
      nonCommentIncludes(phase38VerificationSource, "teacher.control") &&
      nonCommentIncludes(phase38VerificationSource, "runtime.command") &&
      nonCommentIncludes(phase38VerificationSource, "classroom.snapshot") &&
      nonCommentIncludes(phase38VerificationSource, "runtime.event") &&
      nonCommentIncludes(phase38VerificationSource, "settings / runtime inspector / teacher classroom") &&
      nonCommentIncludes(phase38VerificationSource, "ws + ioredis"),
  },
  {
    label: "fallback matrix documents websocket, Redis, and rollback posture honestly",
    passed:
      nonCommentIncludes(fallbackMatrixSource, "ws cutover success") &&
      nonCommentIncludes(fallbackMatrixSource, "Redis optional disabled") &&
      nonCommentIncludes(fallbackMatrixSource, "Redis enabled and healthy") &&
      nonCommentIncludes(fallbackMatrixSource, "Redis degraded local-only") &&
      nonCommentIncludes(fallbackMatrixSource, "snapshot/SSE rollback posture"),
  },
  {
    label: "demo runbook documents local_only default and explicit Redis prerequisites",
    passed:
      nonCommentIncludes(demoRunbookSource, "local_only") &&
      nonCommentIncludes(demoRunbookSource, "REDIS_FANOUT_ENABLED=true") &&
      nonCommentIncludes(demoRunbookSource, "REDIS_URL") &&
      nonCommentIncludes(demoRunbookSource, "/settings/labs/runtime-inspector") &&
      nonCommentIncludes(demoRunbookSource, "/classroom"),
  },
  {
    label: "closeout document keeps milestone proof chain and explicit exclusions",
    passed:
      nonCommentIncludes(closeoutSource, "verify:phase36") &&
      nonCommentIncludes(closeoutSource, "verify:phase37") &&
      nonCommentIncludes(closeoutSource, "verify:phase38") &&
      nonCommentIncludes(closeoutSource, "PostgreSQL") &&
      nonCommentIncludes(closeoutSource, "BullMQ") &&
      nonCommentIncludes(closeoutSource, "第二 runtime"),
  },
  {
    label: "closeout wording preserves SSE rollback and optional Redis posture",
    passed:
      nonCommentIncludes(phase38VerificationSource, "SSE rollback surface") &&
      nonCommentIncludes(phase38VerificationSource, "Redis fanout remains optional") &&
      nonCommentIncludes(closeoutSource, "Redis 只是 delivery layer") &&
      !nonCommentIncludes(closeoutSource, "BullMQ-backed fanout is shipped"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 38 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("Phase 38 cutover closeout verification passed");
console.log("- Phase 36 websocket cutover proof remains the prerequisite baseline.");
console.log("- Phase 37 Redis fanout proof remains optional-capability evidence, not a default baseline.");
console.log("- SSE rollback surface remains documented, and Redis fanout remains optional for new classroom sessions only.");
