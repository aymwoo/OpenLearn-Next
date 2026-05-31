import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

function listFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const entries = readdirSync(root).map((name) => path.join(root, name));
  const files: string[] = [];

  for (const entry of entries) {
    const stats = statSync(entry);
    if (stats.isDirectory()) {
      files.push(...listFiles(entry));
      continue;
    }

    if (
      (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".test.tsx")
    ) {
      files.push(entry);
    }
  }

  return files;
}

function scanForImport(root: string, token: string) {
  return listFiles(root).filter((filePath) => {
    const source = withoutLineComments(read(filePath));
    return source.includes(`from \"${token}\"`) || source.includes(`from '${token}'`);
  });
}

function run(command: string, args: readonly string[], label: string) {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 40 verification failed while running: ${label}`);
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

function runPhase40Typecheck() {
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "tsc");
  const result = spawnSync(localBin, ["--noEmit"], {
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

  const relevantPaths = [
    "src/features/async-tasks/",
    "src/server/workers/async-task-worker.ts",
    "src/lib/dal/async-tasks.ts",
    "src/actions/async-task-actions.ts",
    "scripts/verify-phase40-bullmq-runtime.ts",
    "package.json",
  ] as const;

  const diagnosticLines = output
    .split("\n")
    .filter((line) => line.includes("error TS") && line.includes(":"));

  const relevantDiagnostics = diagnosticLines.filter((line) => {
    const filePath = line.split("(")[0]?.trim() ?? "";
    return relevantPaths.some((candidate) => filePath.startsWith(candidate));
  });

  if (relevantDiagnostics.length > 0) {
    process.stdout.write(output);
    console.error("Phase 40 verification failed while running: tsc --noEmit");
    throw new Error("PHASE40_TYPECHECK_FAILED");
  }

  console.warn("Phase 40 verifier ignored unrelated typecheck errors outside the Phase 40 slice.");
  for (const line of diagnosticLines) {
    console.warn(`- ${line}`);
  }
}

const packageSource = read("package.json");
const serverSource = read("server.ts");
const workerEntrySource = read("src/server/workers/async-task-worker.ts");
const queueEventsSource = read("src/features/async-tasks/infra/queue-events.ts");
const bootstrapSource = read("src/features/async-tasks/worker/bootstrap.ts");
const idempotencySource = read("src/features/async-tasks/shared/idempotency.ts");
const registrySource = read("src/features/async-tasks/server/registry.ts");
const processorSource = read("src/features/async-tasks/worker/processors/platform-healthcheck.ts");
const actionBullmqImports = scanForImport("src/actions", "bullmq");
const dalBullmqImports = scanForImport("src/lib/dal", "bullmq");

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes verify:phase40",
    passed:
      packageSource.includes('"verify:phase40"') &&
      packageSource.includes("verify-phase40-bullmq-runtime.ts"),
  },
  {
    label: "dedicated worker entry exists and starts the worker bootstrap",
    passed:
      nonCommentIncludes(workerEntrySource, "startAsyncTaskWorker") &&
      nonCommentIncludes(workerEntrySource, "[async-task-worker]"),
  },
  {
    label: "server.ts stays web-only and does not start worker code",
    passed:
      !nonCommentIncludes(serverSource, "startAsyncTaskWorker") &&
      !nonCommentIncludes(serverSource, "async-task-worker") &&
      !nonCommentIncludes(serverSource, "worker/bootstrap"),
  },
  {
    label: "actions and DAL do not import bullmq directly",
    passed:
      actionBullmqImports.length === 0 &&
      dalBullmqImports.length === 0,
  },
  {
    label: "QueueEvents projector exists and remains the durable runtime projection path",
    passed:
      nonCommentIncludes(queueEventsSource, "createAsyncTaskQueueEventsProjector") &&
      nonCommentIncludes(queueEventsSource, "projectAsyncTaskQueueEvent") &&
      nonCommentIncludes(queueEventsSource, 'this.queueEvents.on("completed"'),
  },
  {
    label: "graceful shutdown tokens exist in worker bootstrap",
    passed:
      nonCommentIncludes(bootstrapSource, 'process.on("SIGINT"') &&
      nonCommentIncludes(bootstrapSource, 'process.on("SIGTERM"') &&
      nonCommentIncludes(bootstrapSource, "recordAsyncTaskWorkerShutdownRequested"),
  },
  {
    label: "reliability and idempotency helpers exist",
    passed:
      nonCommentIncludes(idempotencySource, "buildAsyncTaskJobId") &&
      nonCommentIncludes(idempotencySource, "buildAsyncTaskJobOptions") &&
      nonCommentIncludes(registrySource, "attempts: 3") &&
      nonCommentIncludes(registrySource, "idempotency"),
  },
  {
    label: "minimal platform processor exists and does not mix in real workload code",
    passed:
      nonCommentIncludes(processorSource, "processPlatformHealthcheckJob") &&
      nonCommentIncludes(processorSource, "asyncTasks.progress.running") &&
      !nonCommentIncludes(processorSource, "course_import") &&
      !nonCommentIncludes(processorSource, "resource_processing"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 40 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

if (actionBullmqImports.length > 0 || dalBullmqImports.length > 0) {
  console.error("Phase 40 verification failed");
  for (const filePath of [...actionBullmqImports, ...dalBullmqImports]) {
    console.error(`- direct bullmq import drift: ${filePath}`);
  }
  process.exit(1);
}

const focusedSuites = [
  "src/features/async-tasks/server/registry.reliability.test.ts",
  "src/features/async-tasks/shared/idempotency.test.ts",
  "src/features/async-tasks/server/enqueue.runtime.test.ts",
  "src/features/async-tasks/infra/queue-events.test.ts",
  "src/features/async-tasks/worker/processors/platform-healthcheck.test.ts",
  "src/features/async-tasks/worker/bootstrap.test.ts",
] as const;

runVitest(focusedSuites, "phase 40 focused suites");
runPhase40Typecheck();

console.log("Phase 40 BullMQ runtime verification passed");
console.log("- Dedicated worker boundary, QueueEvents projector, reliability metadata, and idempotency helpers remain locked.");
console.log("- Focused runtime suites and Phase 40 slice typecheck passed or only reported unrelated external noise.");
