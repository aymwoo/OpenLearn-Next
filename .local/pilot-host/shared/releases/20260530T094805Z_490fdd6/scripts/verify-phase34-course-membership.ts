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
    console.error(`Phase 34 verification failed while running: ${label}`);
    throw error;
  }
}

const dtoSource = read("src/lib/dto/course-authoring.ts");
const dalSource = read("src/lib/dal/course-authoring.ts");
const actionSource = read("src/actions/course-authoring-actions.ts");
const formSource = read("src/components/courses/course-detail-form.tsx");
const surfaceSource = read("src/components/surfaces/teacher-course-detail-surface.tsx");
const pageSource = read("src/app/(teacher)/teacher/courses/[courseId]/page.tsx");
const packageSource = read("package.json");
const touchedSources = [formSource, surfaceSource, pageSource, actionSource].map(withoutLineComments);

const staticChecks: StaticCheck[] = [
  {
    label: "course detail DTO keeps membership slices",
    passed:
      nonCommentIncludes(dtoSource, "TeacherCourseMemberDTOSchema") &&
      nonCommentIncludes(dtoSource, "TeacherCourseEligibleStudentDTOSchema") &&
      nonCommentIncludes(dtoSource, "members: z.array(TeacherCourseMemberDTOSchema)") &&
      nonCommentIncludes(dtoSource, "eligibleStudents: z.array(TeacherCourseEligibleStudentDTOSchema)"),
  },
  {
    label: "course enrollment actions still parse courseId and studentId with Zod",
    passed:
      nonCommentIncludes(actionSource, "CourseEnrollmentInputSchema") &&
      nonCommentIncludes(actionSource, "addCourseEnrollmentAction") &&
      nonCommentIncludes(actionSource, "removeCourseEnrollmentAction") &&
      nonCommentIncludes(actionSource, "studentId"),
  },
  {
    label: "membership reads still derive eligibility from linked classes",
    passed:
      nonCommentIncludes(dalSource, "courseClasses") &&
      nonCommentIncludes(dalSource, "classMembers") &&
      nonCommentIncludes(dalSource, "getLinkedClassEligibleStudentIds") &&
      !nonCommentIncludes(dalSource, "memberships.findMany"),
  },
  {
    label: "archived courses still expose read-only membership posture",
    passed:
      nonCommentIncludes(formSource, "归档课程仅支持查看成员") &&
      nonCommentIncludes(dalSource, 'throw new Error("COURSE_MEMBERSHIP_READ_ONLY")'),
  },
  {
    label: "detail form still contains locked membership copy",
    passed:
      nonCommentIncludes(formSource, "课程成员管理") &&
      nonCommentIncludes(formSource, "加入课程") &&
      nonCommentIncludes(formSource, "移出课程"),
  },
  {
    label: "workflow stays on teacher course detail route",
    passed:
      nonCommentIncludes(pageSource, "TeacherCourseDetailSurface") &&
      !packageSource.includes("/teacher/courses/[courseId]/members") &&
      !read("src/app/(teacher)/teacher/courses/[courseId]/members/page.tsx"),
  },
  {
    label: "touched surfaces contain no unsafe shortcuts",
    passed: !touchedSources.some(
      (source) =>
        source.includes("eval(") ||
        source.includes("dangerouslySetInnerHTML") ||
        source.includes("from '@/db'") ||
        source.includes('from "@/db"'),
    ),
  },
  {
    label: "package.json exposes verify:phase34",
    passed:
      packageSource.includes('"verify:phase34"') &&
      packageSource.includes("tsx scripts/verify-phase34-course-membership.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 34 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(["test", "--run", "src/lib/dal/course-authoring.test.ts"], "phase 34 DAL regressions");
runPnpm(["test", "--run", "src/actions/course-authoring-actions.test.ts"], "phase 34 action regressions");
runPnpm(["test", "--run", "src/components/courses/course-detail-form.test.tsx"], "phase 34 component regressions");

console.log("Phase 34 verification passed");
