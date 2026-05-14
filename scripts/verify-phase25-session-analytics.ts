import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function runPnpm(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 25 verification failed while running: ${label}`);
    throw error;
  }
}

const requiredFiles = [
  "src/lib/dal/classroom.ts",
  "src/lib/dto/classroom.ts",
  "src/app/(classroom)/classroom/page.tsx",
  "src/components/surfaces/classroom-console-surface.tsx",
  "src/components/classroom/classroom-session-history-panel.tsx",
  "src/components/classroom/classroom-session-recap-surface.tsx",
  "src/lib/dal/classroom.test.ts",
  "src/lib/dal/learning.test.ts",
  "src/components/surfaces/classroom-console-surface.test.tsx",
  "src/components/classroom/classroom-session-history-panel.test.tsx",
  "src/components/classroom/classroom-session-recap-surface.test.tsx",
  "src/app/(classroom)/classroom/page.test.tsx",
];

const packageSource = read("package.json");
const dtoSource = withoutLineComments(read("src/lib/dto/classroom.ts"));
const classroomDalSource = withoutLineComments(read("src/lib/dal/classroom.ts"));
const classroomPageSource = withoutLineComments(read("src/app/(classroom)/classroom/page.tsx"));
const classroomSurfaceSource = withoutLineComments(read("src/components/surfaces/classroom-console-surface.tsx"));
const recapSurfaceSource = withoutLineComments(read("src/components/classroom/classroom-session-recap-surface.tsx"));

const staticChecks: StaticCheck[] = [
  {
    label: "all required phase 25 files exist",
    passed: requiredFiles.every((file) => existsSync(file)),
  },
  {
    label: "package.json exposes verify:phase25",
    passed: packageSource.includes('"verify:phase25"') && packageSource.includes("tsx scripts/verify-phase25-session-analytics.ts"),
  },
  {
    label: "recap stays inside /classroom and avoids new analytics primary routes",
    passed:
      classroomPageSource.includes("getClassroomSessionRecapDTO") &&
      !classroomPageSource.includes("/teacher/analytics") &&
      !classroomPageSource.includes("/teacher/session-recap"),
  },
  {
    label: "teacher review does not take over the recap primary entry",
    passed: !classroomPageSource.includes("/teacher/review") && !classroomSurfaceSource.includes("/teacher/review"),
  },
  {
    label: "no second analytics source of truth is introduced",
    passed:
      !classroomDalSource.includes("analyticsSnapshot") &&
      !classroomDalSource.includes("materialized") &&
      !classroomDalSource.includes("insert(classroomAnalytics") &&
      !classroomDalSource.includes("update(classroomAnalytics"),
  },
  {
    label: "explicit 未评价 semantics remain in dto and recap UI",
    passed: dtoSource.includes("未评价") && recapSurfaceSource.includes("未评价"),
  },
  {
    label: "workload stays split into classroom signals and pending feedback",
    passed:
      dtoSource.includes("followUpSignalsCount") &&
      dtoSource.includes("pendingFeedbackCount") &&
      recapSurfaceSource.includes("待跟进课堂信号") &&
      recapSurfaceSource.includes("待反馈提交"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 25 session analytics verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/lib/dal/classroom.test.ts",
    "src/lib/dal/learning.test.ts",
    "src/app/(classroom)/classroom/page.test.tsx",
    "src/components/surfaces/classroom-console-surface.test.tsx",
    "src/components/classroom/classroom-session-history-panel.test.tsx",
    "src/components/classroom/classroom-session-recap-surface.test.tsx",
    "src/components/classroom/classroom-student-detail-panel.test.tsx",
  ],
  "phase 25 focused regression suite",
);

console.log("Phase 25 session analytics verification passed");
