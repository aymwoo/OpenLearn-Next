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
    console.error(`Phase 41 verification failed while running: ${label}`);
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

const packageSource = read("package.json");
const actionSource = read("src/actions/course-import-actions.ts");
const dalSource = read("src/lib/dal/course-import.ts");
const reviewSurfaceSource = read("src/components/surfaces/course-import-review-surface.tsx");
const courseCenterSurfaceSource = read("src/components/surfaces/teacher-course-center-surface.tsx");
const actionBullmqImports = scanForImport("src/actions", "bullmq");
const dalBullmqImports = scanForImport("src/lib/dal", "bullmq");
const surfaceBullmqImports = scanForImport("src/components/surfaces", "bullmq");

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes exact verify:phase41 script",
    passed:
      packageSource.includes('"verify:phase41": "node --import tsx scripts/verify-phase41-batch-import.ts"'),
  },
  {
    label: "applyCourseImportAction triggers async prepare path instead of direct sync apply loop",
    passed:
      nonCommentIncludes(actionSource, "prepareCourseImportApplyTask") &&
      !nonCommentIncludes(actionSource, "applyCourseImport(") &&
      !nonCommentIncludes(actionSource, "executeCourseImportApplyTask("),
  },
  {
    label: "actions DAL and surfaces do not import bullmq directly",
    passed:
      actionBullmqImports.length === 0 &&
      dalBullmqImports.length === 0 &&
      surfaceBullmqImports.length === 0,
  },
  {
    label: "DAL keeps async entity lookup and partial success task mapping",
    passed:
      nonCommentIncludes(dalSource, 'getEntityAsyncTaskListDTO({') &&
      nonCommentIncludes(dalSource, 'outcome: summary.failed > 0 ? "partially_completed" : "completed"') &&
      nonCommentIncludes(dalSource, 'const nextStatus = summary.failed > 0 ? "partially_applied" : "applied"'),
  },
  {
    label: "review surface keeps dispatch failed branch and exact partial success copy",
    passed:
      nonCommentIncludes(reviewSurfaceSource, 'dispatchFailed = asyncSummary?.status === "dispatch_failed"') &&
      nonCommentIncludes(reviewSurfaceSource, '已完成，但有失败项') &&
      nonCommentIncludes(reviewSurfaceSource, '应用本批导入') &&
      nonCommentIncludes(reviewSurfaceSource, '逐行“更新 / 跳过”决定已切换为只读'),
  },
  {
    label: "course center surface keeps recent import task card and batch detail return link",
    passed:
      nonCommentIncludes(courseCenterSurfaceSource, '最近导入任务') &&
      nonCommentIncludes(courseCenterSurfaceSource, '返回批次详情') &&
      nonCommentIncludes(courseCenterSurfaceSource, 'recentImportSummary'),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 41 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

if (actionBullmqImports.length > 0 || dalBullmqImports.length > 0 || surfaceBullmqImports.length > 0) {
  console.error("Phase 41 verification failed");
  for (const filePath of [...actionBullmqImports, ...dalBullmqImports, ...surfaceBullmqImports]) {
    console.error(`- direct bullmq import drift: ${filePath}`);
  }
  process.exit(1);
}

runVitest(
  [
    "src/actions/course-import-actions.test.ts",
    "src/lib/dal/course-import.test.ts",
    "src/features/async-tasks/worker/processors/course-import.test.ts",
  ],
  "phase 41 backend focused suites",
);

runVitest(
  [
    "src/components/surfaces/course-import-review-surface.test.tsx",
    "src/components/surfaces/teacher-course-center-surface.test.tsx",
  ],
  "phase 41 ui focused suites",
);

console.log("Phase 41 batch import verification passed");
console.log("- Active-task reuse, partial-success summaries, honest UI copy, and recent-task re-entry posture remain locked.");
