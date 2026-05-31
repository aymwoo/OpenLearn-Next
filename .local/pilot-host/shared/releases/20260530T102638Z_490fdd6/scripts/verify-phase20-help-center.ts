import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function runPnpm(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 20 verification failed while running: ${label}`);
    throw error;
  }
}

const registrySource = read("src/lib/theme-layout/route-surface-registry.ts");
const layoutSource = read("src/app/help/layout.tsx");
const overviewSource = read("src/components/surfaces/help-center-overview-surface.tsx");
const contentSource = read("src/lib/help/help-center-content.ts");
const packageSource = read("package.json");

const detailPages = [
  "src/app/help/plugins/page.tsx",
  "src/app/help/themes/page.tsx",
  "src/app/help/actions-interfaces/page.tsx",
];

const staticChecks: StaticCheck[] = [
  {
    label: "help route metadata keeps all four allowlisted help routes",
    passed:
      registrySource.includes('"/help"') &&
      registrySource.includes('"/help/plugins"') &&
      registrySource.includes('"/help/themes"') &&
      registrySource.includes('"/help/actions-interfaces"'),
  },
  {
    label: "help route family still renders inside TeacherSidebarShell",
    passed: layoutSource.includes("TeacherSidebarShell") && layoutSource.includes('activePath="/help"'),
  },
  {
    label: "three developer detail pages exist",
    passed: detailPages.every((path) => existsSync(path)),
  },
  {
    label: "overview keeps teacher and developer split",
    passed: overviewSource.includes("我是教师") && overviewSource.includes("我是开发者"),
  },
  {
    label: "developer guides keep current and boundary labels",
    passed: contentSource.includes("当前可用") && contentSource.includes("使用边界"),
  },
  {
    label: "actions guide keeps proposal-only wording",
    passed:
      contentSource.includes('"/help/actions-interfaces"') &&
      contentSource.includes("proposal-only") &&
      contentSource.includes("schedule.assistant"),
  },
  {
    label: "package.json exposes verify:phase20",
    passed:
      packageSource.includes('"verify:phase20"') &&
      packageSource.includes("tsx scripts/verify-phase20-help-center.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 20 help center verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/app/help/layout.test.tsx",
    "src/components/surfaces/help-center-overview-surface.test.tsx",
    "src/components/surfaces/help-guide-detail-surface.test.tsx",
  ],
  "phase 20 help surface regression suite",
);

console.log("Phase 20 help center verification passed");
