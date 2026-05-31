import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const testFiles = [
  "src/components/theme/theme-injector.test.tsx",
  "src/components/shell/teacher-sidebar-shell.test.tsx",
  "src/components/surfaces/settings-surface.test.tsx",
];

const guardedFiles = [
  "src/components/surfaces/home-surface.tsx",
  "src/components/surfaces/settings-surface.tsx",
  "src/components/surfaces/plugin-marketplace-surface.tsx",
  "src/components/surfaces/students-management-surface.tsx",
  "src/app/(student)/student/page.tsx",
];

const forbiddenWidthPattern = /max-w-\[(?:1280|1360)px\]/;

function run(command: string) {
  execSync(command, { stdio: "inherit" });
}

run(`pnpm vitest run ${testFiles.join(" ")}`);

for (const filePath of guardedFiles) {
  const source = readFileSync(filePath, "utf8");

  if (forbiddenWidthPattern.test(source)) {
    throw new Error(`Found regressed width guard in ${filePath}`);
  }

  if (!source.includes("surfaceWidths.")) {
    throw new Error(`Expected shared surface width contract usage in ${filePath}`);
  }
}

console.log("verify:theme-default-regression passed");
