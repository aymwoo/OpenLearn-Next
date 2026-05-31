import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type RouteBoundaryCheck = {
  label: string;
  source: string;
  requiredImport: string;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function runPnpm(args: readonly string[], label: string) {
  const localBin = (name: string) => path.join(process.cwd(), "node_modules", ".bin", name);

  try {
    if (args[0]?.startsWith("verify:phase")) {
      const script = JSON.parse(packageSource).scripts?.[args[0]] as string | undefined;
      if (script?.startsWith("tsx ")) {
        execFileSync(localBin("tsx"), script.slice(4).split(" "), { stdio: "inherit" });
        return;
      }
    }

    if (args[0] === "exec" && args[1] === "vitest") {
      execFileSync(localBin("vitest"), [...args.slice(2)], { stdio: "inherit" });
      return;
    }

    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 27 compatibility gate failed while running: ${label}`);
    throw error;
  }
}

function failPhase27Boundary(label: string) {
  console.error(`Phase 27 boundary guard failed: ${label}`);
}

function failPhase27Baseline(label: string) {
  console.error(`Phase 27 baseline guard failed: ${label}`);
}

const packageSource = read("package.json");
const editorPage = read("src/app/(teacher)/teacher/editor/page.tsx");
const launchPage = read("src/app/(teacher)/teacher/launch/page.tsx");
const classroomPage = read("src/app/(classroom)/classroom/page.tsx");
const playerPage = read("src/app/(student)/student/player/page.tsx");
const contractsIndex = read("src/features/runtime-platform/contracts/index.ts");
const contractsBridge = read("src/features/runtime-platform/contracts/bridge.ts");
const contractsEvents = read("src/features/runtime-platform/contracts/events.ts");
const contractsPermissions = read("src/features/runtime-platform/contracts/permissions.ts");
const contractsDescriptors = read("src/features/runtime-platform/contracts/descriptors.ts");
const seamsIndex = read("src/features/runtime-platform/seams/index.ts");
const seamsDatabase = read("src/features/runtime-platform/seams/database/sqlite-adapter.ts");
const seamsEventBus = read("src/features/runtime-platform/seams/event-bus/default-adapter.ts");
const seamsTransport = read("src/features/runtime-platform/seams/transport/sse-adapter.ts");
const hostGuards = read("src/features/runtime-platform/host-actions/guards.ts");
const runtimeHost = read("src/features/runtime-platform/host-actions/runtime-host.ts");
const pluginHost = read("src/features/runtime-platform/host-actions/plugin-host.ts");

const legacyRouteImportPatterns = ["@/lib/dal/", "@/actions/"];

const routeBoundaryChecks: RouteBoundaryCheck[] = [
  {
    label: "editor route imports runtime-platform authoring boundary only",
    source: editorPage,
    requiredImport: "@/features/runtime-platform/authoring",
  },
  {
    label: "launch route imports runtime-platform launch boundary only",
    source: launchPage,
    requiredImport: "@/features/runtime-platform/launch",
  },
  {
    label: "classroom route imports runtime-platform classroom boundary only",
    source: classroomPage,
    requiredImport: "@/features/runtime-platform/classroom",
  },
  {
    label: "player route imports runtime-platform player boundary only",
    source: playerPage,
    requiredImport: "@/features/runtime-platform/player",
  },
];

const staticChecks: StaticCheck[] = [
  {
    label: "package exposes canonical verify:phase27 entry",
    passed:
      packageSource.includes('"verify:phase27"') &&
      packageSource.includes("tsx scripts/verify-phase27-runtime-platform.ts"),
  },
  {
    label: "route consumers import runtime-platform public barrels",
    passed: routeBoundaryChecks.every((check) => check.source.includes(check.requiredImport)),
  },
  {
    label: "route consumers do not retain legacy deep imports",
    passed: routeBoundaryChecks.every(
      (check) => !legacyRouteImportPatterns.some((pattern) => check.source.includes(pattern)),
    ),
  },
  {
    label: "editor retains courseId and lessonId guardrails",
    passed:
      editorPage.includes("if (!courseId || !scopedCourse)") &&
      editorPage.includes("if (!lessonId)") &&
      editorPage.includes("courseId + lessonId") === false,
  },
  {
    label: "launch stays on published snapshot console DTO boundary",
    passed:
      launchPage.includes("getClassroomConsoleDTO") &&
      !launchPage.includes("runtime-host") &&
      !launchPage.includes("invokeRuntimeHostAction"),
  },
  {
    label: "classroom remains sessionId-driven for live, recap, and detail branches",
    passed:
      classroomPage.includes("const requestedSessionId = resolvedSearchParams?.sessionId") &&
      classroomPage.includes("activeSession?.status === 'live'") &&
      classroomPage.includes("activeSession?.status === 'ended'") &&
      classroomPage.includes("getClassroomStudentDetailDTO"),
  },
  {
    label: "player preserves shell-personal split and suspense posture",
    passed:
      playerPage.includes("Suspense") &&
      playerPage.includes("getStudentPlayerShellDTO") &&
      playerPage.includes("getStudentPlayerPersonalDTO") &&
      !playerPage.includes("getStudentPlayerDTO(") &&
      playerPage.includes('error.message === INACCESSIBLE_LESSON_MESSAGE') &&
      !playerPage.includes("} catch {"),
  },
  {
    label: "contracts root stays pure and versioned",
    passed:
      contractsIndex.includes('export * from "./bridge"') &&
      contractsBridge.includes("TeachingBridgeMessageEnvelopeSchema") &&
      contractsEvents.includes("RuntimeEventEnvelopeSchema") &&
      contractsPermissions.includes("SchoolScopedActorConstraintSchema") &&
      contractsDescriptors.includes("RuntimeManifestV2Schema") &&
      ![contractsIndex, contractsBridge, contractsEvents, contractsPermissions, contractsDescriptors].some((source) =>
        source.includes('"use server"') || source.includes("server-only") || source.includes("@/lib/dal")
      ),
  },
  {
    label: "seams stay centralized and default-only",
    passed:
      seamsIndex.includes("sqliteRuntimeDatabaseAdapter") &&
      seamsIndex.includes("defaultRuntimeEventBusAdapter") &&
      seamsIndex.includes("sseRuntimeTransportAdapter") &&
      seamsDatabase.includes('posture: "default-only"') &&
      seamsEventBus.includes('posture: "default-only"') &&
      seamsTransport.includes('posture: "default-only"') &&
      ![seamsIndex, seamsDatabase, seamsEventBus, seamsTransport].some((source) =>
        source.includes("ENABLE_REDIS") || source.includes("USE_POSTGRES") || source.includes("WEBSOCKET")
      ),
  },
  {
    label: "host actions remain guarded by actor scope, school scope, and DTO parsing",
    passed:
      hostGuards.includes("resolveActor: () => Promise<SchoolScopedActorConstraint>") &&
      hostGuards.includes("await resolveActor()") &&
      hostGuards.includes("inputSchema.parse") &&
      !hostGuards.includes("envelope.actor") &&
      !hostGuards.includes("trustedContext:") &&
      hostGuards.includes("HOST_ACTION_SCHOOL_SCOPE_REQUIRED") &&
      runtimeHost.includes("createGuardedHostAction") &&
      runtimeHost.includes('throw new Error("HOST_ACTION_UNSUPPORTED")') &&
      pluginHost.includes("createGuardedHostAction") &&
      pluginHost.includes('throw new Error("HOST_ACTION_UNSUPPORTED")'),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  for (const check of failedChecks) {
    if (check.label.includes("contracts") || check.label.includes("seams") || check.label.includes("host actions") || check.label.includes("route consumers")) {
      failPhase27Boundary(check.label);
    } else {
      failPhase27Baseline(check.label);
    }
  }
  process.exit(1);
}

runPnpm(["verify:phase3"], "legacy authoring verifier");
runPnpm(["verify:phase4"], "legacy learning verifier");
runPnpm(["verify:phase5"], "legacy classroom verifier");
runPnpm(
  [
    "exec",
    "vitest",
    "--run",
    "src/features/runtime-platform/contracts/contracts.test.ts",
    "src/features/runtime-platform/seams/seams.test.ts",
    "src/features/runtime-platform/host-actions/guards.test.ts",
    "src/app/(teacher)/teacher/editor/page.test.tsx",
    "src/app/(teacher)/teacher/launch/page.test.tsx",
    "src/app/(classroom)/classroom/page.test.tsx",
    "src/app/(student)/student/player/page.test.tsx",
  ],
  "phase 27 focused boundary and route regressions",
);

console.log("Phase 27 compatibility verification passed");
