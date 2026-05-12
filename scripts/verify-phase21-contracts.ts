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
    console.error(`Phase 21 verification failed while running: ${label}`);
    throw error;
  }
}

const lessonAuthoringDtoSource = read("src/lib/dto/lesson-authoring.ts");
const workspaceSource = read("src/components/authoring/lesson-authoring-workspace.tsx");
const teacherPreviewSource = read("src/components/surfaces/teacher-lesson-preview-surface.tsx");
const launchPreviewSource = read("src/components/classroom/classroom-launch-preview.tsx");
const schemaSource = read("src/db/schema.ts");
const classroomActionSource = read("src/actions/classroom-actions.ts");
const packageSource = read("package.json");

const teacherFacingSources = [workspaceSource, teacherPreviewSource, launchPreviewSource].map(withoutLineComments);
const classroomWriteSources = [classroomActionSource].map(withoutLineComments);

const staticChecks: StaticCheck[] = [
  {
    label: "lesson step payload schema keeps teachingDesign contract",
    passed:
      nonCommentIncludes(lessonAuthoringDtoSource, "lessonStepPayloadSchema") &&
      nonCommentIncludes(lessonAuthoringDtoSource, "teachingDesign: TeachingDesignSchema.optional()"),
  },
  {
    label: "editor surface consumes teachingDesignStatus and refinement markers",
    passed:
      nonCommentIncludes(workspaceSource, "teachingDesignStatus") &&
      nonCommentIncludes(workspaceSource, "needsTeachingDesignRefinement") &&
      nonCommentIncludes(workspaceSource, "默认推断") &&
      nonCommentIncludes(workspaceSource, "待完善"),
  },
  {
    label: "teacher preview surface keeps teacher-only fallback wording",
    passed:
      nonCommentIncludes(teacherPreviewSource, "teachingDesignStatus") &&
      nonCommentIncludes(teacherPreviewSource, "needsTeachingDesignRefinement") &&
      nonCommentIncludes(teacherPreviewSource, "默认推断") &&
      nonCommentIncludes(teacherPreviewSource, "系统按旧版环节补齐教学设计") &&
      !nonCommentIncludes(teacherPreviewSource, "student runtime"),
  },
  {
    label: "launch preview keeps non-blocking inferred cue and published snapshot wording",
    passed:
      nonCommentIncludes(launchPreviewSource, "默认推断") &&
      nonCommentIncludes(launchPreviewSource, "待完善") &&
      nonCommentIncludes(launchPreviewSource, "课堂仍会按已发布快照启动，本期不会因为默认推断而阻断开课。"),
  },
  {
    label: "schema still includes classroomEvidence table",
    passed: nonCommentIncludes(schemaSource, '"classroomEvidence"'),
  },
  {
    label: "schema still includes classroomTimeline table",
    passed: nonCommentIncludes(schemaSource, '"classroomTimeline"'),
  },
  {
    label: "classroom actions expose evidence and intervention writes",
    passed:
      nonCommentIncludes(classroomActionSource, "export async function recordClassroomEvidenceAction") &&
      nonCommentIncludes(classroomActionSource, "export async function recordClassroomInterventionAction"),
  },
  {
    label: "classroom writes still invalidate classroom cache tags",
    passed: nonCommentIncludes(classroomActionSource, "updateTag(cacheTags.classroom(parsed.data.sessionId))"),
  },
  {
    label: "classroom write path contains no unsafe shortcuts",
    passed: !classroomWriteSources.some(
      (source) =>
        source.includes("eval(") ||
        source.includes("dangerouslySetInnerHTML") ||
        source.includes("from '@/lib/db'") ||
        source.includes('from "@/lib/db"'),
    ),
  },
  {
    label: "package.json exposes verify:phase21",
    passed:
      packageSource.includes('"verify:phase21"') &&
      packageSource.includes("tsx scripts/verify-phase21-contracts.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 21 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/components/authoring/lesson-authoring-workspace.test.tsx",
    "src/components/classroom/classroom-launch-panel.test.tsx",
    "src/lib/dal/classroom.test.ts",
    "src/actions/classroom-actions.test.ts",
  ],
  "phase 21 focused regression suite",
);

console.log("Phase 21 verification passed");
