import { execFileSync } from "node:child_process";
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
    console.error(`Phase 43 verification failed while running: ${label}`);
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
const registrySource = read("src/features/async-tasks/server/registry.ts");
const reliabilitySource = read("src/features/async-tasks/server/registry.reliability.test.ts");
const reminderSource = read("src/features/schedule/reminders/server.ts");
const classroomSource = read("src/lib/dal/classroom.ts");
const ragSource = read("src/lib/dal/ai-rag.ts");
const operatorDalSource = read("src/lib/dal/async-task-operator.ts");
const operatorDalTestSource = read("src/lib/dal/async-task-operator.test.ts");
const operatorSurfaceTestSource = read("src/components/surfaces/async-task-operator-surface.test.tsx");
const operatorActionTestSource = read("src/actions/async-task-operator-actions.test.ts");
const reminderSurfaceSource = read("src/components/surfaces/schedule-reminder-surface.tsx");
const librarySurfaceSource = read("src/components/surfaces/library-surface.tsx");

const phase43TaskFamilies = [
  {
    taskType: "schedule.reminder_delivery",
    queueName: 'queueName: "schedule-reminders"',
    attempts: "attempts: 3",
    backoff: 'delay: 2_000',
    idempotency: 'strategy: "task_id"',
    operatorRecovery: "operatorRecovery",
  },
  {
    taskType: "classroom.session_summary",
    queueName: 'queueName: "classroom-summary"',
    attempts: "attempts: 3",
    backoff: 'delay: 2_000',
    idempotency: 'strategy: "task_id"',
    operatorRecovery: "operatorRecovery",
  },
  {
    taskType: "resource.knowledge_source_ingest",
    queueName: 'queueName: "resource-processing"',
    attempts: "attempts: 3",
    backoff: 'delay: 2_000',
    idempotency: 'strategy: "task_id"',
    operatorRecovery: "operatorRecovery",
  },
] as const;

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes exact verify:phase43 script",
    passed: packageSource.includes(
      '"verify:phase43": "node --import tsx scripts/verify-phase43-validation-workloads.ts"',
    ),
  },
  {
    label: "registry includes all five task families including the phase43 workloads",
    passed:
      nonCommentIncludes(registrySource, 'taskType: "platform.healthcheck"') &&
      nonCommentIncludes(registrySource, 'taskType: "course_import.apply_batch"') &&
      nonCommentIncludes(registrySource, 'taskType: "schedule.reminder_delivery"') &&
      nonCommentIncludes(registrySource, 'taskType: "classroom.session_summary"') &&
      nonCommentIncludes(registrySource, 'taskType: "resource.knowledge_source_ingest"'),
  },
  {
    label: "phase43 workload families declare explicit reliability and operator recovery posture",
    passed: phase43TaskFamilies.every((family) =>
      nonCommentIncludes(registrySource, family.taskType) &&
      nonCommentIncludes(registrySource, family.queueName) &&
      nonCommentIncludes(registrySource, family.attempts) &&
      nonCommentIncludes(registrySource, family.backoff) &&
      nonCommentIncludes(registrySource, family.idempotency) &&
      nonCommentIncludes(registrySource, family.operatorRecovery),
    ),
  },
  {
    label: "reminder workload enqueues only from due-sweep claim/binding seam instead of save-time direct dispatch",
    passed:
      nonCommentIncludes(reminderSource, "claimScheduleReminderDispatch") &&
      nonCommentIncludes(reminderSource, 'dispatchClaimedBy: "due-sweep"') &&
      nonCommentIncludes(reminderSource, "deliveryTaskId") &&
      nonCommentIncludes(reminderSource, 'taskType: "schedule.reminder_delivery"') &&
      nonCommentIncludes(reminderSource, "SCHEDULE_REMINDER_OPERATOR_RECOVERY_ONLY"),
  },
  {
    label: "classroom workload enqueues from canonical event seam but avoids rewriting canonical truth inside derived processor path",
    passed:
      nonCommentIncludes(classroomSource, 'taskType: "classroom.session_summary"') &&
      nonCommentIncludes(classroomSource, "eventType: \"active_step_changed\"") &&
      nonCommentIncludes(classroomSource, "eventType: \"ended\"") &&
      nonCommentIncludes(classroomSource, "persistClassroomSessionSummaryArtifact") &&
      nonCommentIncludes(classroomSource, "markClassroomSessionSummaryFailure"),
  },
  {
    label: "resource workload uses knowledgeSource as business identity and keeps teacher surface business-entity-first",
    passed:
      nonCommentIncludes(ragSource, "knowledgeSourceId") &&
      nonCommentIncludes(ragSource, 'taskType: "resource.knowledge_source_ingest"') &&
      nonCommentIncludes(ragSource, 'entityType: "knowledge_source"') &&
      nonCommentIncludes(ragSource, "RESOURCE_NOT_RAG_ELIGIBLE") &&
      nonCommentIncludes(librarySurfaceSource, "知识源状态") &&
      nonCommentIncludes(librarySurfaceSource, "教师页展示业务状态，恢复动作统一收口到 operator 面。"),
  },
  {
    label: "teacher-facing surfaces stay business-first and do not drift into task-center UI",
    passed:
      nonCommentIncludes(reminderSurfaceSource, "规则") || nonCommentIncludes(reminderSurfaceSource, "开课前提醒") &&
      nonCommentIncludes(reminderSurfaceSource, "教师页仅展示最近状态，不提供本地恢复入口") &&
      !nonCommentIncludes(reminderSurfaceSource, "taskId") &&
      !nonCommentIncludes(librarySurfaceSource, "queueJobId") &&
      !nonCommentIncludes(librarySurfaceSource, "task center"),
  },
  {
    label: "operator-facing regression slices assert label summary and retry eligibility for the three new workloads",
    passed:
      nonCommentIncludes(operatorDalTestSource, "schedule.reminder_delivery") &&
      nonCommentIncludes(operatorDalTestSource, "classroom.session_summary") &&
      nonCommentIncludes(operatorDalTestSource, "resource.knowledge_source_ingest") &&
      nonCommentIncludes(operatorDalTestSource, "labelKey") &&
      nonCommentIncludes(operatorDalTestSource, "summaryKey") &&
      nonCommentIncludes(operatorDalSource, "retryEligibility") &&
      nonCommentIncludes(operatorSurfaceTestSource, "Retry Eligibility") &&
      nonCommentIncludes(operatorActionTestSource, "same_task_new_attempt"),
  },
  {
    label: "operator DAL remains generic and uses registry metadata instead of workload-specific assumptions",
    passed:
      nonCommentIncludes(operatorDalSource, "buildRetryEligibility") &&
      nonCommentIncludes(operatorDalSource, "readTaskDefinition") &&
      nonCommentIncludes(operatorDalSource, "resolveAsyncTaskDisplayStatus") &&
      nonCommentIncludes(operatorDalSource, "getAsyncTaskWithEvents"),
  },
  {
    label: "registry reliability tests explicitly cover reminder classroom and resource workloads",
    passed:
      nonCommentIncludes(reliabilitySource, "scheduleReminderDeliveryTaskDefinition") &&
      nonCommentIncludes(reliabilitySource, "classroomSessionSummaryTaskDefinition") &&
      nonCommentIncludes(reliabilitySource, "resourceKnowledgeSourceIngestTaskDefinition"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 43 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runVitest(
  [
    "src/features/async-tasks/server/registry.reliability.test.ts",
    "src/features/async-tasks/worker/processors/schedule-reminder.test.ts",
    "src/features/async-tasks/worker/processors/classroom-session-summary.test.ts",
    "src/features/async-tasks/worker/processors/resource-knowledge-source.test.ts",
  ],
  "phase 43 backend workload suites",
);

runVitest(
  [
    "src/lib/dal/async-task-operator.test.ts",
    "src/components/surfaces/async-task-operator-surface.test.tsx",
    "src/actions/async-task-operator-actions.test.ts",
    "src/lib/dal/ai-rag.test.ts",
    "src/features/schedule/reminders/server.test.ts",
  ],
  "phase 43 operator-facing regression slices",
);

run("node", ["--import", "tsx", "scripts/verify-phase42-operator-recovery.ts"], "phase 42 regression");
run("node", ["--import", "tsx", "scripts/verify-phase41-batch-import.ts"], "phase 41 regression");

console.log("Phase 43 validation workload verification passed");
console.log("- Manual, scheduled, and derived workload families now share registry, enqueue, worker, durable truth, operator visibility, and recovery/result semantics.");
