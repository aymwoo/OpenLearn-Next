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

function nonCommentMatches(source: string, pattern: RegExp) {
  return pattern.test(withoutLineComments(source));
}

function anySetCallContainsToken(source: string, token: string) {
  const sanitized = withoutLineComments(source);
  let searchFrom = 0;

  while (true) {
    const setIndex = sanitized.indexOf(".set(", searchFrom);
    if (setIndex === -1) {
      return false;
    }

    const endCandidates = [
      sanitized.indexOf(".where(", setIndex),
      sanitized.indexOf(".returning(", setIndex),
      sanitized.indexOf(");", setIndex),
    ].filter((value) => value !== -1);

    const endIndex = endCandidates.length > 0 ? Math.min(...endCandidates) : sanitized.length;
    const setCallSource = sanitized.slice(setIndex, endIndex);

    if (setCallSource.includes(token)) {
      return true;
    }

    searchFrom = setIndex + 5;
  }
}

function run(command: string, args: readonly string[], label: string) {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 37 verification failed while running: ${label}`);
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
const gatewaySource = read("src/features/runtime-platform/seams/transport/gateway.ts");
const contractSource = read("src/features/runtime-platform/seams/transport/contract.ts");
const classroomSource = read("src/lib/dal/classroom.ts");
const settingsSource = read("src/components/surfaces/settings-surface.tsx");
const studentSurfaceSource = read("src/components/learning/classroom-runtime-client.tsx");
const systemTransportDalSource = read("src/lib/dal/system-transport-settings.ts");
const recoveryTestSource = read("src/features/runtime-platform/seams/transport/redis-fanout-recovery.test.ts");

const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes verify:phase37",
    passed:
      packageSource.includes('"verify:phase37"') &&
      packageSource.includes("verify-phase37-redis-fanout.ts"),
  },
  {
    label: "gateway remains the only canonical publish entry",
    passed:
      nonCommentIncludes(classroomSource, "publishTransportEvent") &&
      nonCommentIncludes(gatewaySource, "export async function publishTransportEvent") &&
      !nonCommentIncludes(classroomSource, "redis.publish("),
  },
  {
    label: "outer transport mode does not add redis as a third mode",
    passed:
      nonCommentIncludes(contractSource, 'z.enum(["sse", "websocket"])') &&
      !nonCommentIncludes(contractSource, '"redis"'),
  },
  {
    label: "new classroom sessions persist transportModeSnapshot",
    passed: nonCommentIncludes(classroomSource, "transportModeSnapshot: transportSettings.effectiveMode"),
  },
  {
    label: "system transport mutation is developer or super_admin only",
    passed:
      nonCommentIncludes(systemTransportDalSource, 'activeRoles.includes("developer") || activeRoles.includes("super_admin")') &&
      nonCommentIncludes(systemTransportDalSource, "SYSTEM_TRANSPORT_SETTINGS_UNAUTHORIZED"),
  },
  {
    label: "student-facing surfaces do not mention redis degraded copy",
    passed:
      !nonCommentIncludes(studentSurfaceSource, "Redis degraded") &&
      !nonCommentIncludes(studentSurfaceSource, "multi-instance") &&
      !nonCommentIncludes(studentSurfaceSource, "redis_fanout"),
  },
  {
    label: "settings surface distinguishes deploy authority and product toggle",
    passed:
      nonCommentIncludes(settingsSource, "deployStatus") &&
      nonCommentIncludes(settingsSource, "effective mode") &&
      nonCommentIncludes(settingsSource, "启用 redis_fanout"),
  },
  {
    label: "dedicated recovery proof covers reconnect and local_only posture",
    passed:
      nonCommentIncludes(recoveryTestSource, "restores desired subscriptions after subscriber ready") &&
      nonCommentIncludes(recoveryTestSource, "does not start redis recovery path for local_only sessions"),
  },
  {
    label: "source does not implement hot switching existing sessions",
    passed: !anySetCallContainsToken(classroomSource, "transportModeSnapshot"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 37 verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

const focusedSuites = [
  "src/lib/dal/system-transport-settings.test.ts",
  "src/lib/dal/classroom.test.ts",
  "src/features/runtime-platform/seams/transport/ws-adapter.test.ts",
  "src/features/runtime-platform/seams/transport/gateway.test.ts",
  "src/features/runtime-platform/seams/transport/ws-server.test.ts",
  "src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts",
  "src/features/runtime-platform/seams/transport/redis-fanout-recovery.test.ts",
  "src/lib/dal/runtime-inspector.test.ts",
  "src/components/surfaces/settings-surface.test.tsx",
  "src/components/surfaces/runtime-inspector-surface.test.tsx",
  "src/components/classroom/classroom-control-panel.test.tsx",
] as const;

runVitest(focusedSuites, "phase 37 focused suites");
runPnpm(["typecheck"], "pnpm typecheck");

const redisRequested =
  process.env.REDIS_FANOUT_ENABLED === "true" && Boolean(process.env.REDIS_URL?.trim());

if (redisRequested) {
  runVitest(
    [
      "src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts",
      "src/features/runtime-platform/seams/transport/redis-fanout-recovery.test.ts",
    ],
    "phase 37 redis smoke",
  );
  console.log("- Redis smoke passed: reconnect/resubscribe proof and degraded fallback suites ran under explicit Redis capability.");
} else {
  console.log("- Redis smoke skipped because deploy capability not provided (set REDIS_FANOUT_ENABLED=true and REDIS_URL to enable)." );
}

console.log("Phase 37 redis fanout verification passed");
console.log("- Redis fanout remains optional and only affects new classroom sessions when deploy authority allows it.");
console.log("- Default local development posture remains local_only without requiring Redis.");
