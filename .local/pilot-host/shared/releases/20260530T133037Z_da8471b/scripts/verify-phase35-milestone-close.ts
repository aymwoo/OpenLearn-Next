import { execFileSync } from "node:child_process";
import path from "node:path";

const milestoneScopeFiles = [
  "scripts/verify-phase33-auth-data-durability.ts",
  "scripts/verify-phase34-course-membership.ts",
  "src/actions/auth-actions.test.ts",
  "src/actions/auth-actions.ts",
  "src/actions/course-authoring-actions.test.ts",
  "src/actions/course-authoring-actions.ts",
  "src/components/courses/course-detail-form.test.tsx",
  "src/components/courses/course-detail-form.tsx",
  "src/components/surfaces/teacher-course-detail-surface.tsx",
  "src/db/schema.ts",
  "src/lib/auth/auth.config.test.ts",
  "src/lib/auth/auth.config.ts",
  "src/lib/auth/auth.test.ts",
  "src/lib/auth/auth.ts",
  "src/lib/dal/auth.ts",
  "src/lib/dal/classroom.ts",
  "src/lib/dal/course-authoring.test.ts",
  "src/lib/dal/course-authoring.ts",
  "src/lib/dal/learning.test.ts",
  "src/lib/dal/learning.ts",
  "src/lib/dto/classroom.ts",
  "src/lib/dto/course-authoring.ts",
  "src/lib/dto/learning.ts",
  "src/lib/dto/membership.ts",
  "src/lib/dto/user.ts",
  "src/proxy.ts",
  "src/types/next-auth.d.ts",
  "src/app/(teacher)/teacher/courses/[courseId]/page.tsx",
  "src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx",
  "src/app/(teacher)/teacher/courses/import/[batchId]/page.tsx",
] as const;

function runPnpm(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 35 verifier failed while running: ${label}`);
    throw error;
  }
}

function runEslint(files: readonly string[], label: string) {
  const eslintBin = path.join(process.cwd(), "node_modules", ".bin", "eslint");

  try {
    execFileSync(eslintBin, [...files], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 35 verifier failed while running: ${label}`);
    throw error;
  }
}

function capturePnpm(args: readonly string[]) {
  try {
    const stdout = execFileSync("pnpm", [...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return { ok: true as const, output: stdout };
  } catch (error) {
    const output = [
      typeof (error as { stdout?: string }).stdout === "string" ? (error as { stdout?: string }).stdout : "",
      typeof (error as { stderr?: string }).stderr === "string" ? (error as { stderr?: string }).stderr : "",
    ]
      .filter(Boolean)
      .join("\n");

    return { ok: false as const, output };
  }
}

function parseLintErrors(output: string) {
  const lines = output.split("\n");
  const errors: Array<{ filePath: string; line: string }> = [];
  let currentFile: string | null = null;

  for (const line of lines) {
    if (line.startsWith("/")) {
      currentFile = path.relative(process.cwd(), line.trim());
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.includes(" error ")) {
      errors.push({ filePath: currentFile, line: line.trim() });
    }
  }

  return errors;
}

console.log("Phase 35 milestone prerequisites: verify safety closure and course membership gates remain green");
runPnpm(["verify:phase33"], "phase 33 prerequisite");
runPnpm(["verify:phase34"], "phase 34 prerequisite");

console.log("Phase 35 active-scope baseline: verify milestone-scoped lint surfaces are clean");
runEslint(milestoneScopeFiles, "milestone-scoped eslint gate");

console.log("Phase 35 active-scope baseline: verify full typecheck is green");
runPnpm(["typecheck"], "full typecheck");

console.log("Phase 35 repo-health partition: classify remaining full lint errors");
const lintResult = capturePnpm(["lint"]);
const lintErrors = parseLintErrors(lintResult.output);
const scopeErrorSet = new Set(milestoneScopeFiles);
const milestoneErrors = lintErrors.filter((entry) => scopeErrorSet.has(entry.filePath as (typeof milestoneScopeFiles)[number]));
const backlogErrors = lintErrors.filter((entry) => !scopeErrorSet.has(entry.filePath as (typeof milestoneScopeFiles)[number]));

if (milestoneErrors.length > 0) {
  console.error("Phase 35 milestone-scoped lint blockers remain:");
  for (const entry of milestoneErrors) {
    console.error(`- ${entry.filePath}: ${entry.line}`);
  }
  process.exit(1);
}

console.log("Phase 35 milestone-scoped lint gate passed: no active-scope lint errors remain.");
console.log("Phase 35 typecheck gate passed: full repository typecheck is green.");

if (backlogErrors.length > 0) {
  console.log("Phase 35 out-of-scope lint backlog (repo-wide, not part of the shipped milestone scope):");
  for (const entry of backlogErrors) {
    console.log(`- ${entry.filePath}: ${entry.line}`);
  }
} else {
  console.log("Phase 35 repo-wide lint note: no remaining lint errors were reported.");
}

console.log(
  "Phase 35 close posture: v2.1 closes safety closure, classroom durability, and course membership scope; runtime or platform expansion remains deferred until further repo-health debt is reduced.",
);
