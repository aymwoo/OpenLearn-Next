import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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
    console.error(`Phase 17 verification failed while running: ${label}`);
    throw error;
  }
}

const editorPageSource = read("src/app/(teacher)/teacher/editor/page.tsx");
const previewPageSource = read("src/app/(teacher)/teacher/editor/preview/page.tsx");
const workspaceSource = read("src/components/authoring/lesson-authoring-workspace.tsx");
const statusPanelSource = read("src/components/authoring/authoring-status-panel.tsx");
const lessonEditorSurfaceSource = read("src/components/surfaces/lesson-editor-surface.tsx");
const lessonActionsSource = read("src/actions/lesson-authoring-actions.ts");
const packageSource = read("package.json");

const unsafePatterns = ["eval(", "dangerouslySetInnerHTML", "from '@/lib/db'", 'from "@/lib/db"'];
const editorScopedSources = [workspaceSource, statusPanelSource, lessonEditorSurfaceSource, previewPageSource].map(withoutLineComments);

const staticChecks: StaticCheck[] = [
  {
    label: "/teacher/editor keeps explicit courseId and lessonId scoping",
    passed:
      nonCommentIncludes(editorPageSource, "courseId") &&
      nonCommentIncludes(editorPageSource, "lessonId") &&
      nonCommentIncludes(editorPageSource, "CourseAwareEditorGuidance"),
  },
  {
    label: "teacher preview route exists and uses getTeacherLessonPreviewDTO",
    passed:
      nonCommentIncludes(previewPageSource, "getTeacherLessonPreviewDTO") &&
      nonCommentIncludes(previewPageSource, "courseId") &&
      nonCommentIncludes(previewPageSource, "lessonId") &&
      !nonCommentIncludes(previewPageSource, "getStudentPlayerPersonalDTO"),
  },
  {
    label: "publish action still enforces readiness and returns PUBLISH_BLOCKED",
    passed:
      nonCommentIncludes(lessonActionsSource, "getLessonPublishReadinessDTO") &&
      nonCommentIncludes(lessonActionsSource, 'error: "PUBLISH_BLOCKED"') &&
      nonCommentIncludes(lessonActionsSource, "blockingIssues"),
  },
  {
    label: "workspace still mutates through Server Actions instead of direct DB access",
    passed:
      nonCommentIncludes(workspaceSource, "addLessonStepAction") &&
      nonCommentIncludes(workspaceSource, "reorderLessonStepAction") &&
      nonCommentIncludes(workspaceSource, "archiveLessonStepAction") &&
      nonCommentIncludes(workspaceSource, "duplicateLessonStepAction") &&
      !editorScopedSources.some((source) => unsafePatterns.some((pattern) => source.includes(pattern))),
  },
  {
    label: "status panel renders structured readiness lists",
    passed:
      nonCommentIncludes(statusPanelSource, "blockingIssues") &&
      nonCommentIncludes(statusPanelSource, "warnings") &&
      nonCommentIncludes(statusPanelSource, "BUILT_IN_PLUGIN_UNAVAILABLE") &&
      nonCommentIncludes(statusPanelSource, "STEP_PAYLOAD_INVALID"),
  },
  {
    label: "package.json exposes verify:phase17",
    passed: packageSource.includes('"verify:phase17"') && packageSource.includes("tsx scripts/verify-phase17-editor.ts"),
  },
  {
    label: "editor shell links to the real preview route",
    passed: nonCommentIncludes(lessonEditorSurfaceSource, "/teacher/editor/preview") && nonCommentIncludes(lessonEditorSurfaceSource, "预览课堂"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 17 editor verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(["test", "--run", "src/components/authoring/authoring-status-panel.test.tsx", "src/components/authoring/lesson-authoring-workspace.test.tsx", "src/components/authoring/lesson-step-editor.test.tsx", "src/app/(teacher)/teacher/editor/preview/page.test.tsx"], "phase 17 focused regression suite");

console.log("Phase 17 editor verification passed");
