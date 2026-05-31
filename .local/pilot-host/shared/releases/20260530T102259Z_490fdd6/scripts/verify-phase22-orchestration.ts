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
    console.error(`Phase 22 verification failed while running: ${label}`);
    throw error;
  }
}

const editorPageSource = read("src/app/(teacher)/teacher/editor/page.tsx");
const headerActionsSource = read("src/components/authoring/lesson-editor-header-actions.tsx");
const statusPanelSource = read("src/components/authoring/authoring-status-panel.tsx");
const launchPanelSource = read("src/components/classroom/classroom-launch-panel.tsx");
const launchPreviewSource = read("src/components/classroom/classroom-launch-preview.tsx");
const packageSource = read("package.json");

const readinessLabels = ["阻断项", "需关注", "建议完善"];
const forbiddenLaunchControls = ["排除学生", "子集启动", "多班联合启动", "分组启动", "排除名单"];

const staticChecks: StaticCheck[] = [
  {
    label: "/teacher/editor keeps explicit courseId + lessonId gating",
    passed:
      nonCommentIncludes(editorPageSource, "courseId") &&
      nonCommentIncludes(editorPageSource, "lessonId") &&
      nonCommentIncludes(editorPageSource, "CourseAwareEditorGuidance"),
  },
  {
    label: "editor header still links to launch preparation without mutating launch state",
    passed:
      nonCommentIncludes(headerActionsSource, "launchHref") &&
      nonCommentIncludes(headerActionsSource, "开课准备") &&
      nonCommentIncludes(headerActionsSource, "整班启动摘要与课堂节奏"),
  },
  {
    label: "launch form still submits publishedVersionId from published lesson options",
    passed:
      nonCommentIncludes(launchPanelSource, "new FormData()") &&
      nonCommentIncludes(launchPanelSource, "formData.append('publishedVersionId', selectedLesson!.publishedVersionId)") &&
      nonCommentIncludes(launchPanelSource, "launchClassroomSessionAction(formData)"),
  },
  {
    label: "editor and launch surfaces keep graded readiness labels",
    passed:
      readinessLabels.every((label) => nonCommentIncludes(statusPanelSource, label)) &&
      readinessLabels.every((label) => nonCommentIncludes(launchPanelSource, label)),
  },
  {
    label: "launch preview keeps published-snapshot wording instead of draft-launch semantics",
    passed:
      nonCommentIncludes(launchPreviewSource, "课堂仍会按已发布快照启动，本期不会因为默认推断而阻断开课。") &&
      !nonCommentIncludes(launchPreviewSource, "草稿") &&
      !nonCommentIncludes(launchPreviewSource, "draft lesson"),
  },
  {
    label: "launch UI stays whole-class only without subgroup or exclusion controls",
    passed:
      nonCommentIncludes(launchPanelSource, "当前只支持整班启动") &&
      forbiddenLaunchControls.every((token) => !nonCommentIncludes(launchPanelSource, token)),
  },
  {
    label: "package.json exposes verify:phase22",
    passed:
      packageSource.includes('"verify:phase22"') &&
      packageSource.includes("tsx scripts/verify-phase22-orchestration.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 22 orchestration verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/components/authoring/authoring-status-panel.test.tsx",
    "src/components/authoring/lesson-editor-header-actions.test.tsx",
    "src/components/classroom/classroom-launch-panel.test.tsx",
  ],
  "phase 22 focused regression suite",
);

console.log("Phase 22 orchestration verification passed");
