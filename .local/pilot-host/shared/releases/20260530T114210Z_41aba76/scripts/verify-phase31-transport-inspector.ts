import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function fail(
  label: "transport drift" | "scope drift" | "health drift" | "route drift",
  message: string,
) {
  console.error(`Phase 31 ${label}: ${message}`);
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
    console.error(`Phase 31 verifier failed while running: ${label}`);
    throw error;
  }
}

const packageSource = read("package.json");
const runtimeHostSource = read("src/features/runtime-platform/host-actions/runtime-host.ts");
const classroomDalSource = read("src/lib/dal/classroom.ts");
const gatewaySource = read("src/features/runtime-platform/seams/transport/gateway.ts");
const routeSource = read("src/app/api/classroom/[sessionId]/events/route.ts");
const inspectorDalSource = read("src/lib/dal/runtime-inspector.ts");
const inspectorPageSource = read("src/app/settings/labs/runtime-inspector/page.tsx");
const inspectorSurfaceSource = read("src/components/surfaces/runtime-inspector-surface.tsx");

const checks = [
  {
    label: "transport drift" as const,
    passed:
      packageSource.includes('"verify:phase31"') &&
      gatewaySource.includes("publishTransportEvent") &&
      runtimeHostSource.includes("publishTransportEvent") &&
      classroomDalSource.includes("publishClassroomTransportEvent") &&
      !runtimeHostSource.includes("sseRuntimeTransportAdapter.deliver(") &&
      !classroomDalSource.includes("sseRuntimeTransportAdapter.deliver("),
    message: "runtime/classroom producers drifted away from the single transport gateway or direct adapter calls returned",
  },
  {
    label: "scope drift" as const,
    passed:
      inspectorDalSource.includes('role: "teacher" as const') &&
      inspectorDalSource.includes('role: "admin" as const') &&
      inspectorDalSource.includes('role: "developer" as const') &&
      inspectorDalSource.includes("canInspectRuntimeSession") &&
      inspectorDalSource.includes("schoolIds.includes(session.schoolId)"),
    message: "runtime inspector no longer enforces explicit teacher/admin/developer scope boundaries",
  },
  {
    label: "health drift" as const,
    passed:
      inspectorDalSource.includes("runtimeLifecycleTransitions") &&
      inspectorDalSource.includes("governanceAudits") &&
      inspectorDalSource.includes("transportDeliveryAttempts") &&
      inspectorDalSource.includes("transportConsumerTraces") &&
      !inspectorDalSource.includes("threshold") &&
      !inspectorDalSource.includes("anomaly") &&
      !inspectorDalSource.includes("prediction") &&
      !inspectorDalSource.includes("alert"),
    message: "runtime inspector health drifted away from deterministic persisted facts",
  },
  {
    label: "route drift" as const,
    passed:
      routeSource.includes('"Content-Type": "text/event-stream; charset=utf-8"') &&
      routeSource.includes("recordTransportConsumerTrace") &&
      inspectorPageSource.includes("RuntimeInspectorSurface") &&
      inspectorPageSource.includes("getRuntimeInspectorDTO") &&
      inspectorSurfaceSource.includes("Unified timeline") &&
      inspectorSurfaceSource.includes("不分 tabs") &&
      !inspectorPageSource.includes("/classroom"),
    message: "SSE posture or independent runtime inspector route drifted away from the phase 31 contract",
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
    "src/features/runtime-platform/seams/transport/gateway.test.ts",
    "src/lib/dal/classroom.test.ts",
    "src/lib/dal/runtime-inspector.test.ts",
    "src/components/surfaces/runtime-inspector-surface.test.tsx",
  ],
  "phase 31 focused suites",
);

console.log("Phase 31 transport boundary and runtime inspector verification passed");
