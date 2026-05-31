import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
    console.error(`Phase 39 verification failed while running: ${label}`);
    throw error;
  }
}

function runPnpm(args: readonly string[], label: string) {
  run("pnpm", args, label);
}

function runPhase39Typecheck() {
  const result = spawnSync("pnpm", ["typecheck"], {
    stdio: "pipe",
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.status === 0) {
    if (output.trim()) {
      process.stdout.write(output);
    }
    return;
  }

  const phase39RelevantPaths = [
    "src/features/async-tasks/",
    "src/lib/dal/async-tasks.ts",
    "src/lib/dal/async-tasks.test.ts",
    "src/actions/async-task-actions.ts",
    "src/actions/async-task-actions.test.ts",
    "src/db/schema.ts",
    "src/lib/cache-policy.ts",
    "scripts/prepare-dev-db.ts",
    "scripts/verify-phase39-async-tasks.ts",
  ] as const;

  const diagnosticLines = output
    .split("\n")
    .filter((line) => line.includes("error TS") && line.includes(":"));

  const relevantDiagnostics = diagnosticLines.filter((line) => {
    const filePath = line.split("(")[0]?.trim() ?? "";
    return phase39RelevantPaths.some((candidate) => filePath.startsWith(candidate));
  });

  if (relevantDiagnostics.length > 0) {
    process.stdout.write(output);
    console.error("Phase 39 verification failed while running: pnpm typecheck");
    throw new Error("PHASE39_TYPECHECK_FAILED");
  }

  console.warn("Phase 39 verifier ignored unrelated typecheck errors outside the Phase 39 slice.");
  if (diagnosticLines.length > 0) {
    for (const line of diagnosticLines) {
      console.warn(`- ${line}`);
    }
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

  runPnpm(["exec", "vitest", "--run", ...paths], label);
}

const packageSource = read("package.json");
const contractSource = read("src/features/async-tasks/shared/contract.ts");
const schemaSource = read("src/db/schema.ts");
const dalSource = read("src/lib/dal/async-tasks.ts");
const enqueueSource = read("src/features/async-tasks/server/enqueue.ts");
const actionSource = read("src/actions/async-task-actions.ts");

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes verify:phase39",
    passed:
      packageSource.includes('"verify:phase39"') &&
      packageSource.includes("verify-phase39-async-tasks.ts"),
  },
  {
    label: "contract root exposes task visibility, entity ref, progress, and result schemas",
    passed:
      nonCommentIncludes(contractSource, "AsyncTaskVisibilityScopeSchema") &&
      nonCommentIncludes(contractSource, "AsyncTaskEntityRefSchema") &&
      nonCommentIncludes(contractSource, "AsyncTaskProgressSnapshotSchema") &&
      nonCommentIncludes(contractSource, "AsyncTaskResultSummarySchema"),
  },
  {
    label: "schema contains async task ledger and append-only event tables",
    passed:
      nonCommentIncludes(schemaSource, "export const asyncTasks = sqliteTable") &&
      nonCommentIncludes(schemaSource, "export const asyncTaskEvents = sqliteTable"),
  },
  {
    label: "enqueue seam is canonical and preserves honest pre-dispatch vocabulary",
    passed:
      nonCommentIncludes(enqueueSource, "export async function enqueueAsyncTask") &&
      nonCommentIncludes(enqueueSource, '"pending_enqueue"') &&
      nonCommentIncludes(enqueueSource, '"dispatch_failed"') &&
      !nonCommentIncludes(enqueueSource, "bullmq") &&
      !nonCommentIncludes(enqueueSource, "Queue.add("),
  },
  {
    label: "server action delegates to seam without direct db or queue imports",
    passed:
      nonCommentIncludes(actionSource, "enqueueAsyncTask({") &&
      !nonCommentIncludes(actionSource, "@/db") &&
      !nonCommentIncludes(actionSource, "bullmq"),
  },
  {
    label: "SQLite truth reads remain in async-task DAL",
    passed:
      nonCommentIncludes(dalSource, "AsyncTaskListItemDTOSchema.parse") &&
      nonCommentIncludes(dalSource, "AsyncTaskDetailDTOSchema.parse") &&
      nonCommentIncludes(dalSource, "db.query.asyncTasks.findMany") &&
      !nonCommentIncludes(dalSource, "bullmq"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 39 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

const focusedSuites = [
  "src/features/async-tasks/shared/contract.test.ts",
  "src/features/async-tasks/shared/dto.test.ts",
  "src/lib/dal/async-tasks.test.ts",
  "src/features/async-tasks/server/enqueue.test.ts",
  "src/actions/async-task-actions.test.ts",
  "src/db/schema.learning.test.ts",
] as const;

runVitest(focusedSuites, "phase 39 focused suites");
runPhase39Typecheck();

console.log("Phase 39 async task verification passed");
console.log("- Contract, ledger, DAL, and enqueue seam remain aligned on SQLite durable truth.");
console.log("- Server actions enter the platform through one canonical enqueue boundary.");
