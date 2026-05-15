import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

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
    console.error(`Phase 15 verification failed while running: ${label}`);
    throw error;
  }
}

const schemaSource = read("src/db/schema.ts");
const dalSource = read("src/lib/dal/course-import.ts");
const actionSource = read("src/actions/course-import-actions.ts");
const reviewSurfaceSource = withoutLineComments(read("src/components/surfaces/course-import-review-surface.tsx"));
const centerSurfaceSource = withoutLineComments(read("src/components/surfaces/teacher-course-center-surface.tsx"));
const templateSource = read("src/lib/course-import-template.ts");
const packageSource = read("package.json");

const checks = [
  {
    label: "fixed CSV headers remain 标题,学科,年级,课程状态",
    passed: templateSource.includes('"标题", "学科", "年级", "课程状态"'),
  },
  {
    label: "staging tables courseImportBatch and courseImportRow exist",
    passed: schemaSource.includes("courseImportBatch") && schemaSource.includes("courseImportRow"),
  },
  {
    label: "match detection still uses title + subject + grade",
    passed: dalSource.includes('join("::")') && dalSource.includes("title") && dalSource.includes("subject") && dalSource.includes("grade"),
  },
  {
    label: "new rows still force draft on create",
    passed: dalSource.includes('status: "draft"'),
  },
  {
    label: "matched rows only expose update or skip decisions",
    passed: reviewSurfaceSource.includes("更新") && reviewSurfaceSource.includes("跳过") && !reviewSurfaceSource.includes("修改标题"),
  },
  {
    label: "result UI still contains four outcome categories and return CTA",
    passed:
      reviewSurfaceSource.includes("created") &&
      reviewSurfaceSource.includes("updated") &&
      reviewSurfaceSource.includes("skipped") &&
      reviewSurfaceSource.includes("failed") &&
      reviewSurfaceSource.includes("返回课程中心"),
  },
  {
    label: "import UI remains free of eval, dangerouslySetInnerHTML, and direct db imports",
    passed:
      !reviewSurfaceSource.includes("eval(") &&
      !reviewSurfaceSource.includes("dangerouslySetInnerHTML") &&
      !reviewSurfaceSource.includes("@/db") &&
      !centerSurfaceSource.includes("@/db") &&
      !actionSource.includes("@/db"),
  },
  {
    label: "package.json exposes verify:phase15",
    passed: packageSource.includes('"verify:phase15"') && packageSource.includes("tsx scripts/verify-phase15-course-import.ts"),
  },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  console.error("Phase 15 course import verification failed");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/lib/course-import-template.test.ts",
    "src/lib/dal/course-import.test.ts",
    "src/actions/course-import-actions.test.ts",
    "src/app/(teacher)/teacher/courses/import/template/route.test.ts",
    "src/components/surfaces/teacher-course-center-surface.test.tsx",
    "src/components/surfaces/course-import-review-surface.test.tsx",
  ],
  "phase 15 focused regression suite",
);

console.log("Phase 15 course import verification passed");
