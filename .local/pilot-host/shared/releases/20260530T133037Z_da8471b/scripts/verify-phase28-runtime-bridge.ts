import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function fail(label: "contract drift" | "durability drift" | "cache drift", message: string) {
  console.error(`Phase 28 ${label}: ${message}`);
}

function run(args: readonly string[], label: string) {
  const localBin = (name: string) => path.join(process.cwd(), "node_modules", ".bin", name);

  try {
    if (args[0] === "exec" && args[1] === "vitest") {
      execFileSync(localBin("vitest"), [...args.slice(2)], { stdio: "inherit" });
      return;
    }

    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 28 verifier failed while running: ${label}`);
    throw error;
  }
}

const packageSource = read("package.json");
const lessonAuthoringSource = read("src/lib/dto/lesson-authoring.ts");
const schemaSource = read("src/db/schema.ts");
const runtimeHostSource = read("src/features/runtime-platform/host-actions/runtime-host.ts");
const hostGuardSource = read("src/features/runtime-platform/host-actions/guards.ts");
const runtimeSessionSource = read("src/features/runtime-platform/classroom/runtime-session.ts");
const classroomActionSource = read("src/actions/classroom-actions.ts");

const checks = [
  {
    label: "contract drift" as const,
    passed:
      packageSource.includes('"verify:phase28"') &&
      lessonAuthoringSource.includes("runtime: RuntimeDescriptorSchema.optional()") &&
      schemaSource.includes("runtimeStepSessions") &&
      schemaSource.includes("runtimeStepStates") &&
      schemaSource.includes("runtimeEventOutbox"),
    message: "runtime descriptor or durability schema contract is missing",
  },
  {
    label: "durability drift" as const,
    passed:
      runtimeHostSource.includes("createGuardedHostAction") &&
      hostGuardSource.includes("await resolveActor()") &&
      runtimeSessionSource.includes("export async function saveRuntimeState") &&
      runtimeSessionSource.includes("export async function submitRuntimeState") &&
      !runtimeSessionSource.slice(
        runtimeSessionSource.indexOf("export async function saveRuntimeState"),
        runtimeSessionSource.indexOf("export async function submitRuntimeState"),
      ).includes("recordRuntimeTaskSubmission") &&
      !runtimeSessionSource.slice(
        runtimeSessionSource.indexOf("export async function saveRuntimeState"),
        runtimeSessionSource.indexOf("export async function submitRuntimeState"),
      ).includes("recordRuntimeQuizAttempt"),
    message: "save/submit durability semantics drifted away from host-side guarded path",
  },
  {
    label: "cache drift" as const,
    passed:
      classroomActionSource.includes("updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId))") &&
      classroomActionSource.includes("updateTag(cacheTags.progress(result.lessonId, result.actorId))") &&
      classroomActionSource.includes("updateTag(cacheTags.submission(result.lessonId, result.actorId))") &&
      classroomActionSource.includes("updateTag(cacheTags.teacherReview(result.lessonId))"),
    message: "runtime submit invalidation matrix is incomplete",
  },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  for (const check of failed) {
    fail(check.label, check.message);
  }
  process.exit(1);
}

run(
  [
    "exec",
    "vitest",
    "--run",
    "src/features/runtime-platform/classroom/runtime-session.test.ts",
    "src/lib/dal/learning.test.ts",
    "src/lib/dal/classroom.test.ts",
    "src/features/runtime-platform/host-actions/guards.test.ts",
    "src/actions/classroom-actions.test.ts",
  ],
  "phase 28 focused runtime suites",
);

console.log("Phase 28 runtime bridge verification passed");
