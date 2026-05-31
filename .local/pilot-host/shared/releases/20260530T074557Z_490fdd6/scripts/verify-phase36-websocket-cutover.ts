import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
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

function run(command: string, args: readonly string[], label: string) {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 36 verification failed while running: ${label}`);
    throw error;
  }
}

function runPnpm(args: readonly string[], label: string) {
  run("pnpm", args, label);
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, "--run", ...paths], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, ["--run", ...paths], label);
    return;
  }

  runPnpm(["exec", "vitest", "--run", ...paths], label);
}

const packageSource = read("package.json");
const routeSource = read("src/app/api/ws/classroom/[sessionId]/route.ts");
const controlPanelSource = read("src/components/classroom/classroom-control-panel.tsx");
const runtimeClientSource = read("src/components/learning/classroom-runtime-client.tsx");
const liveRefreshSource = read("src/components/classroom/classroom-live-snapshot-refresh.tsx");
const contractSource = read("src/features/runtime-platform/seams/transport/contract.ts");
const wsAuthSource = read("src/features/runtime-platform/seams/transport/ws-auth.ts");
const wsServerSource = read("src/features/runtime-platform/seams/transport/ws-server.ts");
const gatewaySource = read("src/features/runtime-platform/seams/transport/gateway.ts");

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes verify:phase36",
    passed:
      packageSource.includes('"verify:phase36"') &&
      packageSource.includes("tsx scripts/verify-phase36-websocket-cutover.ts"),
  },
  {
    label: "websocket route keeps 426 rollback surface documentation",
    passed:
      nonCommentIncludes(routeSource, "status: 426") &&
      nonCommentIncludes(routeSource, "rollbackSurface: `/api/classroom/${sessionId}/events`") &&
      nonCommentIncludes(routeSource, "server.ts -> ws-server.ts"),
  },
  {
    label: "teacher panel keeps websocket producers and canonical runtime fallback",
    passed:
      nonCommentIncludes(controlPanelSource, "teacher.control") &&
      nonCommentIncludes(controlPanelSource, "runtime.command") &&
      nonCommentIncludes(controlPanelSource, "recordRuntimeTeacherControlAction") &&
      nonCommentIncludes(controlPanelSource, "onTransportError()"),
  },
  {
    label: "student runtime client keeps durable snapshot fallback posture",
    passed:
      nonCommentIncludes(runtimeClientSource, "touchClassroomPresenceAction") &&
      nonCommentIncludes(runtimeClientSource, "snapshot_fallback") &&
      nonCommentIncludes(runtimeClientSource, "`/api/classroom/${sid}/snapshot`"),
  },
  {
    label: "teacher live refresh keeps websocket-first with SSE fallback",
    passed:
      nonCommentIncludes(liveRefreshSource, "subscribeClassroomSocket") &&
      nonCommentIncludes(liveRefreshSource, "onFallbackSnapshot") &&
      nonCommentIncludes(liveRefreshSource, "actorScope: 'teacher'"),
  },
  {
    label: "handshake auth no longer depends on pseudo schema fields",
    passed:
      !nonCommentIncludes(wsAuthSource, "classMembers.studentId") &&
      !nonCommentIncludes(wsAuthSource, "classMembers.status") &&
      !nonCommentIncludes(wsAuthSource, "classroomSessions.schoolId"),
  },
  {
    label: "websocket server keeps canonical message kinds and rejects protocol drift",
    passed:
      nonCommentIncludes(wsServerSource, "transport.keepalive") &&
      nonCommentIncludes(wsServerSource, "applyWebSocketTeacherControlForActor") &&
      nonCommentIncludes(wsServerSource, "recordTeacherControlEvent") &&
      !nonCommentIncludes(wsServerSource, "transport.ping") &&
      !nonCommentIncludes(wsServerSource, "presence.update") &&
      !nonCommentIncludes(wsServerSource, "classroom.keepalive"),
  },
  {
    label: "gateway keeps websocket supplemental failure trace visible",
    passed:
      nonCommentIncludes(gatewaySource, 'traceType: "stream_failed"') &&
      nonCommentIncludes(contractSource, '"runtime_event"'),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 36 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

const focusedSuites = [
  "src/features/runtime-platform/seams/transport/ws-auth.test.ts",
  "src/features/runtime-platform/seams/transport/ws-envelope.test.ts",
  "src/features/runtime-platform/seams/transport/ws-adapter.test.ts",
  "src/features/runtime-platform/seams/transport/ws-server.test.ts",
  "src/features/runtime-platform/seams/transport/gateway.test.ts",
  "src/components/classroom/classroom-control-panel.test.tsx",
  "src/components/classroom/classroom-live-snapshot-refresh.test.tsx",
  "src/components/learning/classroom-runtime-client.test.tsx",
] as const;

runVitest(focusedSuites, "phase 36 focused suites");
runPnpm(["typecheck"], "pnpm typecheck");

console.log("Phase 36 websocket cutover verification passed");
console.log("- SSE rollback surface remains available via /api/classroom/:sessionId/events");
console.log("- Redis fanout is out of scope for Phase 36 and remains a future-phase concern");
