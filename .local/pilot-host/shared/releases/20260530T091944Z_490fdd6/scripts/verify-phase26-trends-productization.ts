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
    console.error(`Phase 26 verification failed while running: ${label}`);
    throw error;
  }
}

const requiredFiles = [
  "src/lib/dal/classroom.ts",
  "src/lib/theme-layout/route-surface-registry.ts",
  "src/lib/navigation.ts",
  "src/components/shell/teacher-sidebar-shell.tsx",
  "src/app/(teacher)/teacher/trends/page.tsx",
  "src/components/surfaces/teacher-trends-surface.tsx",
  "src/components/classroom/classroom-session-recap-surface.tsx",
  "src/components/surfaces/lesson-editor-surface.tsx",
  "src/components/surfaces/classroom-launch-surface.tsx",
  "src/components/surfaces/classroom-console-surface.tsx",
  "src/components/learning/teacher-review-surface.tsx",
  "src/components/surfaces/teacher-dashboard-surface.tsx",
  "src/components/surfaces/help-center-overview-surface.tsx",
  "src/components/surfaces/settings-surface.tsx",
  "src/lib/dal/classroom.test.ts",
  "src/lib/theme-layout/shell-surface-resolver.test.ts",
  "src/components/shell/teacher-sidebar-shell.test.tsx",
  "src/app/(teacher)/teacher/trends/page.test.tsx",
  "src/components/surfaces/teacher-trends-surface.test.tsx",
  "src/components/classroom/classroom-session-recap-surface.test.tsx",
  "src/components/surfaces/lesson-editor-surface.test.tsx",
  "src/components/classroom/classroom-launch-panel.test.tsx",
  "src/components/surfaces/classroom-console-surface.test.tsx",
  "src/components/learning/teacher-review-surface.test.ts",
  "src/components/surfaces/teacher-dashboard-surface.test.tsx",
  "src/components/surfaces/help-center-overview-surface.test.tsx",
  "src/components/surfaces/settings-surface.test.tsx",
];

const packageSource = read("package.json");
const dalSource = withoutLineComments(read("src/lib/dal/classroom.ts"));
const registrySource = read("src/lib/theme-layout/route-surface-registry.ts");
const navigationSource = read("src/lib/navigation.ts");
const shellSource = read("src/components/shell/teacher-sidebar-shell.tsx");
const trendsPageSource = read("src/app/(teacher)/teacher/trends/page.tsx");
const trendsSurfaceSource = read("src/components/surfaces/teacher-trends-surface.tsx");
const recapSurfaceSource = read("src/components/classroom/classroom-session-recap-surface.tsx");
const editorSurfaceSource = read("src/components/surfaces/lesson-editor-surface.tsx");
const launchSurfaceSource = read("src/components/surfaces/classroom-launch-surface.tsx");
const classroomSurfaceSource = read("src/components/surfaces/classroom-console-surface.tsx");
const reviewSurfaceSource = read("src/components/learning/teacher-review-surface.tsx");
const dashboardSurfaceSource = read("src/components/surfaces/teacher-dashboard-surface.tsx");
const helpSurfaceSource = read("src/components/surfaces/help-center-overview-surface.tsx");
const settingsSurfaceSource = read("src/components/surfaces/settings-surface.tsx");

const skeletonSources = [
  dashboardSurfaceSource,
  helpSurfaceSource,
  settingsSurfaceSource,
  classroomSurfaceSource,
  reviewSurfaceSource,
  editorSurfaceSource,
  launchSurfaceSource,
];

const staticChecks: StaticCheck[] = [
  {
    label: "all required phase 26 files exist",
    passed: requiredFiles.every((file) => existsSync(file)),
  },
  {
    label: "package.json exposes verify:phase26",
    passed:
      packageSource.includes('"verify:phase26"') &&
      packageSource.includes("tsx scripts/verify-phase26-trends-productization.ts"),
  },
  {
    label: "teacher trends route is registered in route metadata",
    passed:
      nonCommentIncludes(registrySource, '"/teacher/trends":') &&
      nonCommentIncludes(registrySource, "trend-overview") &&
      nonCommentIncludes(registrySource, 'pathname.startsWith("/teacher/trends")'),
  },
  {
    label: "teacher navigation points to /teacher/trends instead of reports",
    passed:
      nonCommentIncludes(navigationSource, "href: '/teacher/trends'") &&
      nonCommentIncludes(shellSource, 'href: "/teacher/trends"') &&
      !nonCommentIncludes(shellSource, 'href: "/teacher/reports"') &&
      !nonCommentIncludes(navigationSource, "href: '/teacher/reports'"),
  },
  {
    label: "trends route remains class-first and defaults to session view",
    passed:
      nonCommentIncludes(trendsPageSource, "getTeacherRecentSessionTrendDTO") &&
      nonCommentIncludes(
        trendsPageSource,
        "ClassroomTrendViewSchema.safeParse(resolvedSearchParams.view).data ?? 'sessions'",
      ) && nonCommentIncludes(trendsPageSource, "resolveDefaultClassId"),
  },
  {
    label: "trends surface keeps classroom recap as the primary detail CTA",
    passed:
      nonCommentIncludes(trendsSurfaceSource, "primaryRecapHref") &&
      nonCommentIncludes(trendsSurfaceSource, "回到课堂复盘") &&
      nonCommentIncludes(trendsSurfaceSource, "secondaryReviewHref") &&
      nonCommentIncludes(trendsSurfaceSource, "进入反馈跟进"),
  },
  {
    label: "recap surface still exposes trends as a secondary deep-link",
    passed:
      nonCommentIncludes(recapSurfaceSource, "/teacher/trends?classId=") &&
      nonCommentIncludes(recapSurfaceSource, "lessonId=") &&
      nonCommentIncludes(recapSurfaceSource, "sessionId=") &&
      nonCommentIncludes(recapSurfaceSource, "查看班级趋势"),
  },
  {
    label: "analytics does not introduce a new persistence path",
    passed:
      !dalSource.includes("analyticsSnapshot") &&
      !dalSource.includes("materialized") &&
      !dalSource.includes("insert(classroomAnalytics") &&
      !dalSource.includes("update(classroomAnalytics") &&
      !dalSource.includes("insert(teacherTrends") &&
      !dalSource.includes("update(teacherTrends"),
  },
  {
    label: "trends surface keeps required desktop split and avoids horizontal scroll wrappers",
    passed:
      nonCommentIncludes(
        trendsSurfaceSource,
        "xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.4fr)]",
      ) && !nonCommentIncludes(trendsSurfaceSource, "overflow-x-auto"),
  },
  {
    label: "major teacher surfaces still reuse shared width and rhythm contracts",
    passed: skeletonSources.every(
      (source) =>
        nonCommentIncludes(source, "teacherSurfaceRhythm") &&
        nonCommentIncludes(source, "surfaceWidths"),
    ),
  },
  {
    label: "review remains lesson-level and does not become the primary trends jump",
    passed:
      nonCommentIncludes(reviewSurfaceSource, "/teacher/review?lessonId=") &&
      !nonCommentIncludes(reviewSurfaceSource, "/teacher/trends"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 26 trends productization verification failed");
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
    "src/lib/theme-layout/shell-surface-resolver.test.ts",
    "src/components/shell/teacher-sidebar-shell.test.tsx",
    "src/app/(teacher)/teacher/trends/page.test.tsx",
    "src/components/surfaces/teacher-trends-surface.test.tsx",
    "src/components/classroom/classroom-session-recap-surface.test.tsx",
    "src/components/surfaces/lesson-editor-surface.test.tsx",
    "src/components/classroom/classroom-launch-panel.test.tsx",
    "src/components/surfaces/classroom-console-surface.test.tsx",
    "src/components/learning/teacher-review-surface.test.ts",
    "src/components/surfaces/teacher-dashboard-surface.test.tsx",
    "src/components/surfaces/help-center-overview-surface.test.tsx",
    "src/components/surfaces/settings-surface.test.tsx",
  ],
  "phase 26 focused regression suite",
);

console.log("Phase 26 trends productization verification passed");
