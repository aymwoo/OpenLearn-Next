import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function fail(label: "host drift" | "surface drift" | "submit-path drift", message: string) {
  console.error(`Phase 29 ${label}: ${message}`);
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
    console.error(`Phase 29 verifier failed while running: ${label}`);
    throw error;
  }
}

const packageSource = read("package.json");
const hostClientSource = read("src/features/runtime-platform/host/runtime-host-client.tsx");
const hostBridgeSource = read("src/features/runtime-platform/host/runtime-host-bridge.ts");
const previewSource = read("src/components/surfaces/teacher-lesson-preview-surface.tsx");
const playerSource = read("src/components/learning/classroom-runtime-client.tsx");
const classroomSource = read("src/components/classroom/classroom-control-panel.tsx");
const pilotSource = read("src/app/runtime/html-courseware/pilot/page.tsx");
const actionSource = read("src/actions/classroom-actions.ts");
const builtInSource = read("src/lib/dto/resource-ai.ts");

const checks = [
  {
    label: "host drift" as const,
    passed:
      packageSource.includes('"verify:phase29"') &&
      hostClientSource.includes("RuntimeHostFrame") &&
      hostClientSource.includes("recordRuntimeReadyAction") &&
      hostBridgeSource.includes("RUNTIME_HOST_BRIDGE_CHANNEL") &&
      pilotSource.includes("window.parent.postMessage") &&
      builtInSource.includes('bootstrap: "/runtime/html-courseware/pilot"') &&
      !pilotSource.includes("@/lib/dal") &&
      !pilotSource.includes("db.") &&
      !pilotSource.includes("fetch('/api/") &&
      !pilotSource.includes('fetch("/api/'),
    message: "shared runtime host or local html pilot entry drifted away from the guarded browser bridge path",
  },
  {
    label: "surface drift" as const,
    passed:
      previewSource.includes("RuntimeHostClient") &&
      previewSource.includes('surface="teacher-preview"') &&
      playerSource.includes("RuntimeHostClient") &&
      playerSource.includes('surface="student-player"') &&
      classroomSource.includes("RuntimeHostClient") &&
      classroomSource.includes('surface="classroom-stage"'),
    message: "preview/player/classroom no longer share the same Runtime Host surface wiring",
  },
  {
    label: "submit-path drift" as const,
    passed:
      actionSource.includes("recordRuntimeReadyAction") &&
      actionSource.includes("recordRuntimeInteractionAction") &&
      actionSource.includes("saveRuntimeStateAction") &&
      actionSource.includes("submitRuntimeStateAction") &&
      actionSource.includes("updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId))") &&
      actionSource.includes("updateTag(cacheTags.progress(result.lessonId, result.actorId))") &&
      actionSource.includes("updateTag(cacheTags.submission(result.lessonId, result.actorId))"),
    message: "runtime ready/save/submit no longer point at the trusted host action boundary",
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
    "src/features/runtime-platform/host/runtime-host.test.tsx",
    "src/components/surfaces/student-player-surfaces.test.ts",
    "src/components/surfaces/classroom-console-surface.test.tsx",
    "src/actions/classroom-actions.test.ts",
  ],
  "phase 29 focused runtime host suites",
);

console.log("Phase 29 runtime host verification passed");
