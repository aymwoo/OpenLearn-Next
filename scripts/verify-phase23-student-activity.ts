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

function nonCommentIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token);
}

function runPnpm(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 23 verification failed while running: ${label}`);
    throw error;
  }
}

const playerRouteSource = read("src/app/(student)/student/player/page.tsx");
const runtimeSource = read("src/components/learning/classroom-runtime-client.tsx");
const quickResponseSource = read("src/components/learning/quick-response-step-card.tsx");
const classroomActionSource = read("src/actions/classroom-actions.ts");
const classroomDalSource = read("src/lib/dal/classroom.ts");
const packageSource = read("package.json");

const staticChecks: StaticCheck[] = [
  {
    label: "player route keeps shell plus Suspense personal split",
    passed:
      nonCommentIncludes(playerRouteSource, "Suspense") &&
      nonCommentIncludes(playerRouteSource, "getStudentPlayerShellDTO") &&
      nonCommentIncludes(playerRouteSource, "getStudentPlayerPersonalDTO") &&
      nonCommentIncludes(playerRouteSource, "PlayerPersonalRegion"),
  },
  {
    label: "runtime keeps unified activity shell with task quiz and quick-response rendering",
    passed:
      nonCommentIncludes(runtimeSource, "StepActivityShell") &&
      nonCommentIncludes(runtimeSource, "TaskStepCard") &&
      nonCommentIncludes(runtimeSource, "QuizStepCard") &&
      nonCommentIncludes(runtimeSource, "QuickResponseStepCard") &&
      nonCommentIncludes(runtimeSource, "activity.activityGuidance") &&
      nonCommentIncludes(runtimeSource, "student-quick-response"),
  },
  {
    label: "quick-response card keeps classroom CTA and append-only history copy",
    passed:
      nonCommentIncludes(quickResponseSource, "提交课堂回应") &&
      nonCommentIncludes(quickResponseSource, "每次提交都会追加到回应历史，不会覆盖之前的记录。") &&
      nonCommentIncludes(quickResponseSource, "回应历史"),
  },
  {
    label: "classroom action keeps quick-response action and evidence invalidation",
    passed:
      nonCommentIncludes(classroomActionSource, "submitStudentQuickResponseAction") &&
      nonCommentIncludes(classroomActionSource, "recordStudentQuickResponse") &&
      nonCommentIncludes(classroomActionSource, "updateTag(cacheTags.classroom(parsed.data.sessionId))"),
  },
  {
    label: "quick-response write path still depends on recordClassroomEvidence",
    passed:
      nonCommentIncludes(classroomDalSource, "export async function recordStudentQuickResponse") &&
      nonCommentIncludes(classroomDalSource, "recordClassroomEvidence({") &&
      nonCommentIncludes(classroomDalSource, 'sourceType: payload.sourceType') &&
      nonCommentIncludes(classroomDalSource, 'evidenceType: payload.evidenceType'),
  },
  {
    label: "package.json exposes verify:phase23",
    passed:
      packageSource.includes('"verify:phase23"') &&
      packageSource.includes("tsx scripts/verify-phase23-student-activity.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 23 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/components/learning/student-step-cards.test.ts",
    "src/components/surfaces/student-player-surfaces.test.ts",
    "src/lib/dal/learning.test.ts",
    "src/actions/classroom-actions.test.ts",
  ],
  "phase 23 focused regression suite",
);

console.log("Phase 23 verification passed");
