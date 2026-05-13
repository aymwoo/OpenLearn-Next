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
    console.error(`Phase 24 verification failed while running: ${label}`);
    throw error;
  }
}

const classroomPageSource = read("src/app/(classroom)/classroom/page.tsx");
const rosterPanelSource = read("src/components/classroom/classroom-roster-panel.tsx");
const evaluationFormSource = read("src/components/classroom/classroom-student-evaluation-form.tsx");
const detailPanelSource = read("src/components/classroom/classroom-student-detail-panel.tsx");
const classroomActionSource = read("src/actions/classroom-actions.ts");
const classroomDalSource = read("src/lib/dal/classroom.ts");

const staticChecks: StaticCheck[] = [
  {
    label: "classroom page keeps same-route student detail workflow",
    passed:
      nonCommentIncludes(classroomPageSource, "studentId") &&
      nonCommentIncludes(classroomPageSource, "detailTab") &&
      nonCommentIncludes(classroomPageSource, "getClassroomStudentDetailDTO"),
  },
  {
    label: "roster panel keeps monitoring copy and detail CTA",
    passed:
      nonCommentIncludes(rosterPanelSource, "查看证据与评价") &&
      nonCommentIncludes(rosterPanelSource, "需要关注") &&
      nonCommentIncludes(rosterPanelSource, "已提交"),
  },
  {
    label: "evaluation form keeps fixed three-tier labels",
    passed:
      nonCommentIncludes(evaluationFormSource, "积极参与") &&
      nonCommentIncludes(evaluationFormSource, "正常参与") &&
      nonCommentIncludes(evaluationFormSource, "需要关注"),
  },
  {
    label: "detail panel keeps evidence and evaluation tabs together",
    passed:
      nonCommentIncludes(detailPanelSource, "课堂证据") &&
      nonCommentIncludes(detailPanelSource, "过程评价"),
  },
  {
    label: "classroom action keeps teacher-only formative evaluation write path",
    passed:
      nonCommentIncludes(classroomActionSource, "recordStudentFormativeEvaluationAction") &&
      nonCommentIncludes(classroomActionSource, "updateTag(cacheTags.classroom(parsed.data.sessionId))"),
  },
  {
    label: "classroom dal keeps formative evaluation payload marker",
    passed: nonCommentIncludes(classroomDalSource, 'kind: "formative-evaluation"'),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 24 classroom evaluation verification failed");
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
    "src/actions/classroom-actions.test.ts",
    "src/components/classroom/classroom-roster-panel.test.tsx",
    "src/components/classroom/classroom-student-evaluation-form.test.tsx",
    "src/components/classroom/classroom-student-detail-panel.test.tsx",
  ],
  "phase 24 focused regression suite",
);

console.log("Phase 24 classroom evaluation verification passed");
