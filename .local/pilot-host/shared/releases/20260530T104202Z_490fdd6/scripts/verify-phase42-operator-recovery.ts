import { execFileSync } from "node:child_process";
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
      (entry.endsWith(".ts") || entry.endsWith(".tsx"))
      && !entry.endsWith(".test.ts")
      && !entry.endsWith(".test.tsx")
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
    console.error(`Phase 42 verification failed while running: ${label}`);
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

const settingsSource = read("src/components/surfaces/settings-surface.tsx");
const overviewPageSource = read("src/app/settings/labs/async-tasks/page.tsx");
const detailPageSource = read("src/app/settings/labs/async-tasks/[taskId]/page.tsx");
const operatorDalSource = read("src/lib/dal/async-task-operator.ts");
const operatorAccessSource = read("src/features/async-tasks/server/operator-access.ts");
const detailSurfaceSource = read("src/components/surfaces/async-task-operator-detail-surface.tsx");
const retrySurfaceSource = read("src/components/surfaces/async-task-operator-retry-action.tsx");
const recoverySource = read("src/features/async-tasks/server/recovery.ts");
const actionSource = read("src/actions/async-task-operator-actions.ts");
const dalBullmqImports = scanForImport("src/lib/dal", "bullmq");
const surfaceDbImports = scanForImport("src/components/surfaces", "@/db");

const staticChecks: StaticCheck[] = [
  {
    label: "settings surface exposes async operator quick link",
    passed: nonCommentIncludes(settingsSource, "/settings/labs/async-tasks"),
  },
  {
    label: "async operator overview and detail routes exist",
    passed: existsSync("src/app/settings/labs/async-tasks/page.tsx") && existsSync("src/app/settings/labs/async-tasks/[taskId]/page.tsx"),
  },
  {
    label: "operator DAL and surfaces do not import bullmq or db directly",
    passed:
      dalBullmqImports.length === 0
      && surfaceDbImports.length === 0
      && !nonCommentIncludes(operatorDalSource, 'from "bullmq"')
      && !nonCommentIncludes(operatorDalSource, 'from "@/db"'),
  },
  {
    label: "operator DAL stays request-fresh",
    passed:
      !nonCommentIncludes(operatorDalSource, '"use cache"')
      && !nonCommentIncludes(operatorDalSource, "cacheLife(")
      && nonCommentIncludes(operatorDalSource, "Request-fresh by design")
      && nonCommentIncludes(operatorDalSource, "canOperatorAccessTask")
      && nonCommentIncludes(operatorAccessSource, 'visibilityScope === "school_operator"'),
  },
  {
    label: "recovery service uses BullMQ retry and recovery audit events",
    passed:
      nonCommentIncludes(recoverySource, "Job.fromId")
      && nonCommentIncludes(recoverySource, "canOperatorAccessTask(task, scope)")
      && nonCommentIncludes(recoverySource, 'eq(asyncTasks.status, "failed")')
      && nonCommentIncludes(recoverySource, "await job.retry()")
      && nonCommentIncludes(recoverySource, "task.operator_recovery_requested")
      && nonCommentIncludes(recoverySource, "task.retry_seeded")
      && nonCommentIncludes(recoverySource, "task.operator_recovery_failed")
      && !nonCommentIncludes(recoverySource, "enqueueAsyncTask("),
  },
  {
    label: "retry wrapper keeps required CTA and confirm copy",
    passed:
      nonCommentIncludes(retrySurfaceSource, "重试此任务")
      && nonCommentIncludes(retrySurfaceSource, "这会在当前任务下追加一次新的 attempt")
      && nonCommentIncludes(retrySurfaceSource, "系统会记录本次 recovery event")
      && nonCommentIncludes(retrySurfaceSource, "已加入恢复流程，正在等待 worker 重新接手。")
      && nonCommentIncludes(retrySurfaceSource, "router.refresh()"),
  },
  {
    label: "detail surface renders retry wrapper and pages stay thin",
    passed:
      nonCommentIncludes(detailSurfaceSource, "AsyncTaskOperatorRetryAction")
      && nonCommentIncludes(overviewPageSource, "getAsyncTaskOperatorOverviewDTO")
      && nonCommentIncludes(detailPageSource, "getAsyncTaskOperatorDetailDTO"),
  },
  {
    label: "operator action invalidates tags and revalidates operator paths",
    passed:
      nonCommentIncludes(actionSource, "updateTag(")
      && nonCommentIncludes(actionSource, "revalidatePath(")
      && nonCommentIncludes(actionSource, "cacheTags.asyncTaskList(result.actorId)"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 42 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runVitest(
  [
    "src/features/async-tasks/server/registry.reliability.test.ts",
    "src/features/async-tasks/worker/bootstrap.test.ts",
    "src/lib/dal/async-task-operator.test.ts",
    "src/components/surfaces/async-task-operator-surface.test.tsx",
    "src/features/async-tasks/server/recovery.test.ts",
    "src/features/async-tasks/infra/queue-events.test.ts",
    "src/actions/async-task-operator-actions.test.ts",
  ],
  "phase 42 focused suites",
);

run("node", ["--import", "tsx", "scripts/verify-phase41-batch-import.ts"], "phase 41 regression");

console.log("Phase 42 operator visibility and recovery verification passed");
