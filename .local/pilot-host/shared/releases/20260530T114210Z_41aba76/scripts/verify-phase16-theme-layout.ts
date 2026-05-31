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
    console.error(`Phase 16 verification failed while running: ${label}`);
    throw error;
  }
}

const dtoSource = read("src/lib/dto/resource-ai.ts");
const tokensSource = read("src/server/themes/tokens.ts");
const themesDalSource = read("src/lib/dal/themes.ts");
const injectorSource = read("src/components/theme/theme-injector.tsx");
const teacherLayoutSource = read("src/app/(teacher)/teacher/layout.tsx");
const teacherShellSource = read("src/components/shell/teacher-sidebar-shell.tsx");
const settingsSurfaceSource = read("src/components/surfaces/settings-surface.tsx");
const packageSource = read("package.json");
const unsafeThemeContractPatterns = [/\bclassName\b/, /\bscript\b/, /\bstyle\s*:/];

const staticChecks: StaticCheck[] = [
  {
    label: "manifest.theme continues through the single runtime path",
    passed:
      nonCommentIncludes(themesDalSource, "getActiveThemeRuntimeForCurrentActor") &&
      nonCommentIncludes(themesDalSource, "compileThemeLayoutRuntime") &&
      nonCommentIncludes(injectorSource, "getActiveThemeRuntimeForCurrentActor"),
  },
  {
    label: "ThemeInjector exposes theme-layout-runtime",
    passed: nonCommentIncludes(injectorSource, "theme-layout-runtime") && nonCommentIncludes(injectorSource, "data-theme-layout-runtime"),
  },
  {
    label: "teacher shell recognizes left-nav, top-nav, and top-nav-secondary-rail",
    passed:
      nonCommentIncludes(teacherShellSource, "left-nav") &&
      nonCommentIncludes(teacherShellSource, "top-nav") &&
      nonCommentIncludes(teacherShellSource, "top-nav-secondary-rail"),
  },
  {
    label: "settings UI shows 结构摘要",
    passed: nonCommentIncludes(settingsSurfaceSource, "结构摘要"),
  },
  {
    label: "theme contract rejects freeform manifest fields",
    passed: unsafeThemeContractPatterns.every((pattern) => !pattern.test(withoutLineComments(dtoSource))),
  },
  {
    label: "package.json exposes verify:phase16",
    passed: packageSource.includes('"verify:phase16"') && packageSource.includes("tsx scripts/verify-phase16-theme-layout.ts"),
  },
  {
    label: "teacher layout stays on the runtime-driven shell path",
    passed:
      nonCommentIncludes(teacherLayoutSource, "resolveTeacherThemeRouteSurface") &&
      nonCommentIncludes(teacherLayoutSource, "TeacherSidebarShell"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 16 theme layout verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(["test", "--run", "src/server/themes/tokens.test.ts", "src/components/shell/teacher-sidebar-shell.test.tsx", "src/components/surfaces/settings-surface.test.tsx"], "phase 16 regression suite");

console.log("Phase 16 theme layout verification passed");
