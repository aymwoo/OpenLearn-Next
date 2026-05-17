import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type GuardLabel =
  | "editor/publish drift"
  | "proof seed drift"
  | "launch affordance drift"
  | "terminal posture drift"
  | "recovery drift"
  | "classroom proof drift"
  | "inspector review drift"
  | "demo handoff drift";

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function fail(label: GuardLabel, message: string) {
  console.error(`Phase 32 ${label}: ${message}`);
}

function run(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 32 verifier failed while running: ${label}`);
    throw error;
  }
}

const packageSource = read("package.json");
const bootstrapSource = read("scripts/bootstrap-dev-db.ts");
const builtInDefinitionsSource = read("src/lib/dto/resource-ai.ts");
const lessonAuthoringSource = read("src/lib/dal/lesson-authoring.ts");
const launchSurfaceSource = read("src/components/surfaces/classroom-launch-surface.tsx");
const hostClientSource = read("src/features/runtime-platform/host/runtime-host-client.tsx");
const pilotSource = read("src/app/runtime/html-courseware/pilot/page.tsx");
const runtimeSurfaceSource = read("src/components/learning/classroom-runtime-client.tsx");
const classroomDalSource = read("src/lib/dal/classroom.ts");
const classroomControlPanelSource = read("src/components/classroom/classroom-control-panel.tsx");
const inspectorDalSource = read("src/lib/dal/runtime-inspector.ts");
const inspectorPageSource = read("src/app/settings/labs/runtime-inspector/page.tsx");
const inspectorSurfaceSource = read("src/components/surfaces/runtime-inspector-surface.tsx");
const demoHandoffSource = read(
  ".planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md",
);

const checks: Array<{ label: GuardLabel; passed: boolean; message: string }> = [
  {
    label: "editor/publish drift",
    passed:
      packageSource.includes('"verify:phase32"') &&
      lessonAuthoringSource.includes("publishedLessonVersions") &&
      lessonAuthoringSource.includes("snapshotJson") &&
      bootstrapSource.includes("getCanonicalRuntimeProofSnapshotStep") &&
      bootstrapSource.includes("互动证明：HTML 课件实验"),
    message:
      "canonical runtime proof step no longer looks frozen through the authoring-publish snapshot chain",
  },
  {
    label: "proof seed drift",
    passed:
      bootstrapSource.includes("getCanonicalRuntimeProofStepDefinition") &&
      bootstrapSource.includes('builtInKey === "htmlCourseware"') &&
      builtInDefinitionsSource.includes('bootstrap: "/runtime/html-courseware/pilot"') &&
      bootstrapSource.includes("成功完成互动输入并提交观察摘要"),
    message:
      "canonical proof seed no longer points at the local html courseware pilot with the expected success posture",
  },
  {
    label: "launch affordance drift",
    passed:
      launchSurfaceSource.includes("seeded proof 演示") &&
      launchSurfaceSource.includes("互动证明：HTML 课件实验") &&
      launchSurfaceSource.includes("开启新课堂") &&
      launchSurfaceSource.includes("editor/publish → launch/classroom →"),
    message:
      "launch surface no longer keeps the canonical proof discoverability as a secondary affordance",
  },
  {
    label: "terminal posture drift",
    passed:
      hostClientSource.includes('setStatus("submit-success")') &&
      pilotSource.includes("已提交本次互动结果") &&
      pilotSource.includes("本次提交摘要") &&
      pilotSource.includes("disabled={isTerminalSubmitState}"),
    message:
      "runtime submit success is no longer locked into a visible terminal summary posture",
  },
  {
    label: "recovery drift",
    passed:
      hostClientSource.includes("本次互动结果暂未提交成功，请重试当前提交") &&
      runtimeSurfaceSource.includes("重试刚才的操作") &&
      runtimeSurfaceSource.includes("已保留当前学习上下文，请直接在当前 runtime 中重试刚才的操作。") &&
      !runtimeSurfaceSource.includes("inspector auto-jump"),
    message:
      "save or submit failures no longer stay on the same player surface with retry-current-action recovery",
  },
  {
    label: "classroom proof drift",
    passed:
      classroomDalSource.includes("runtimeSessionId") &&
      classroomDalSource.includes("proofSummary") &&
      classroomControlPanelSource.includes("proof first-feedback") &&
      classroomControlPanelSource.includes("查看运行轨迹"),
    message:
      "classroom-first proof feedback or proof summary threading drifted away from the durable classroom truth path",
  },
  {
    label: "inspector review drift",
    passed:
      inspectorDalSource.includes("selectedRuntimeSessionId") &&
      inspectorDalSource.includes("timeline.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))") &&
      inspectorPageSource.includes("runtimeSessionId: resolvedSearchParams.runtimeSessionId") &&
      inspectorSurfaceSource.includes("Unified timeline") &&
      inspectorSurfaceSource.includes("当前 proof 会话"),
    message:
      "inspector no longer defaults to runtimeSessionId review focus or the unified proof timeline posture",
  },
  {
    label: "demo handoff drift",
    passed:
      demoHandoffSource.includes("teacher@example.com") &&
      demoHandoffSource.includes("student@example.com") &&
      demoHandoffSource.includes("pnpm db:bootstrap:dev") &&
      demoHandoffSource.includes("runtimeSessionId") &&
      demoHandoffSource.includes("Out of scope"),
    message:
      "demo handoff no longer documents the seeded actors, bootstrap command, runtimeSessionId drill-down, and out-of-scope posture",
  },
];

console.log("Phase 32 milestone prerequisites: verify compatibility baseline and proof foundations");
run(["verify:phase27"], "phase 27 milestone prerequisite");
run(["verify:phase28"], "phase 28 milestone prerequisite");
run(["verify:phase29"], "phase 29 milestone prerequisite");
run(["verify:phase30"], "phase 30 milestone prerequisite");
run(["verify:phase31"], "phase 31 milestone prerequisite");

console.log("Phase 32 proof contracts: verify phase-specific drift guards");
const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  for (const check of failed) {
    fail(check.label, check.message);
  }
  process.exit(1);
}

console.log("Phase 32 proof contracts passed: editor/publish, launch, submit, recovery, classroom, inspector, and handoff stay intact");

run(
  [
    "exec",
    "vitest",
    "--run",
    "src/lib/dal/lesson-authoring.test.ts",
    "src/components/classroom/classroom-launch-panel.test.tsx",
    "src/features/runtime-platform/host/runtime-host.test.tsx",
    "src/components/surfaces/student-player-surfaces.test.ts",
    "src/lib/dal/classroom.test.ts",
    "src/lib/dal/runtime-inspector.test.ts",
    "src/components/surfaces/runtime-inspector-surface.test.tsx",
    "src/components/surfaces/classroom-console-surface.test.tsx",
  ],
  "phase 32 focused proof suites",
);

console.log(
  "Phase 32 verification passed: milestone prerequisites and phase-specific proof contracts both remain green",
);
