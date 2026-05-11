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
    console.error(`Phase 18 verification failed while running: ${label}`);
    throw error;
  }
}

const surfaceSources = [
  read("src/components/surfaces/teacher-schedule-surface.tsx"),
  read("src/components/surfaces/schedule-import-review-surface.tsx"),
  read("src/components/surfaces/schedule-operations-surface.tsx"),
  read("src/components/surfaces/schedule-reminder-surface.tsx"),
  read("src/components/surfaces/schedule-assistant-surface.tsx"),
].map(withoutLineComments);
const runtimeDalSource = read("src/features/schedule/runtime/server.ts");
const assistantDalSource = read("src/features/schedule/assistant/server.ts");
const assistantActionsSource = read("src/features/schedule/assistant/actions.ts");
const pluginRegistrySource = read("src/server/plugins/registry.ts");
const packageSource = read("package.json");
const scheduleSources = [
  runtimeDalSource,
  assistantDalSource,
  pluginRegistrySource,
  ...surfaceSources,
].map(withoutLineComments);

const staticChecks: StaticCheck[] = [
  {
    label: "schedule surfaces do not import db directly",
    passed: !surfaceSources.some((source) => source.includes("@/db") || source.includes("from \"@/db\"")),
  },
  {
    label: "runtime DAL does not expose scheduleImportRow to teacher agenda DTOs",
    passed: !nonCommentIncludes(runtimeDalSource, "scheduleImportRow"),
  },
  {
    label: "assistant actions keep proposal-only gates instead of direct runtime writes",
    passed:
      nonCommentIncludes(assistantActionsSource, 'error: "SCHEDULE_ASSISTANT_APPROVAL_BLOCKED"') &&
      !nonCommentIncludes(assistantDalSource, "scheduleOverride") &&
      !nonCommentIncludes(assistantDalSource, "scheduleRecurringEntry"),
  },
  {
    label: "plugin registry only contains allowlisted schedule proposal actions",
    passed:
      nonCommentIncludes(pluginRegistrySource, "createScheduleOverrideProposal") &&
      nonCommentIncludes(pluginRegistrySource, "createScheduleReminderDraft") &&
      nonCommentIncludes(pluginRegistrySource, "annotateScheduleConflict") &&
      !nonCommentIncludes(pluginRegistrySource, "applyScheduleChange"),
  },
  {
    label: "schedule and plugin path contains no eval or dangerouslySetInnerHTML",
    passed: !scheduleSources.some((source) => source.includes("eval(") || source.includes("dangerouslySetInnerHTML")),
  },
  {
    label: "package.json exposes verify:phase18",
    passed: packageSource.includes('"verify:phase18"') && packageSource.includes("tsx scripts/verify-phase18-schedule.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 18 schedule verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/lib/dal/schedule-import.test.ts",
    "src/lib/dal/schedule-runtime.test.ts",
    "src/lib/dal/schedule-operations.test.ts",
    "src/lib/dal/schedule-reminders.test.ts",
    "src/lib/dal/schedule-assistant.test.ts",
    "src/components/surfaces/schedule-import-review-surface.test.tsx",
    "src/components/surfaces/teacher-schedule-surface.test.tsx",
    "src/components/surfaces/schedule-operations-surface.test.tsx",
    "src/components/surfaces/schedule-reminder-surface.test.tsx",
  ],
  "phase 18 focused regression suite",
);

console.log("Phase 18 schedule verification passed");
