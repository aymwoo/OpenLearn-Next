# Phase 59: Deploy, Release & Recovery Baseline - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 20
**Analogs found:** 17 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch | `package.json` | exact |
| `.env.example` | config | transform | — | none |
| `src/lib/ops/env.server.ts` | config | transform | `src/lib/dto/system-transport-settings.ts` | role-match |
| `src/lib/ops/env.server.test.ts` | test | transform | `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | role-match |
| `src/lib/ops/release-status.ts` | helper | aggregate | `src/lib/dal/runtime-inspector.ts` | flow-match |
| `src/lib/ops/release-status.test.ts` | test | aggregate | `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | role-match |
| `src/app/api/health/route.ts` | route | request-response | `src/app/api/classroom/[sessionId]/snapshot/route.ts` | role-match |
| `src/app/api/ready/route.ts` | route | request-response | `src/lib/dal/runtime-inspector.ts` | flow-match |
| `src/app/api/release/route.ts` | route | request-response | `src/app/api/ws/classroom/[sessionId]/route.ts` | role-match |
| `src/app/api/ops-routes.test.ts` | test | request-response | `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | role-match |
| `scripts/verify-phase59-deploy-release.ts` | test | batch | `scripts/verify-phase58-operator-recovery-and-surfaces.ts` | exact |
| `scripts/verify-phase59-deploy-release.test.ts` | test | transform | `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | exact |
| `.github/workflows/pilot-release.yml` | config | batch | — | none |
| `ops/deploy/deploy.sh` | utility | batch | `scripts/verify-phase58-operator-recovery-and-surfaces.ts` | flow-match |
| `ops/deploy/rollback.sh` | utility | batch | `scripts/verify-phase58-operator-recovery-and-surfaces.ts` | flow-match |
| `ops/deploy/backup.sh` | utility | file-I/O | `scripts/prepare-dev-db.ts` | flow-match |
| `ops/deploy/restore.sh` | utility | file-I/O | `scripts/prepare-dev-db.ts` | flow-match |
| `ops/deploy/verify-restore.sh` | utility | batch | `scripts/prepare-dev-db.ts` | flow-match |
| `ops/systemd/openlearn-web.service` | config | process-supervision | — | none |
| `ops/systemd/openlearn-worker.service` | config | process-supervision | — | none |

## Pattern Assignments

### `package.json` (config, batch)

**Analog:** `package.json`

**Script registration pattern** (`package.json:5-12`, `57-66`):
```json
"scripts": {
  "build": "next build --turbopack",
  "start": "NODE_ENV=production node --require ./scripts/server-only-node-shim.cjs --import next/dist/server/node-environment.js --import tsx server.ts",
  "worker:start": "NODE_ENV=production node --require ./scripts/server-only-node-shim.cjs --import next/dist/server/node-environment.js --import tsx src/server/workers/async-task-worker.ts",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "db:migrate": "tsx --import ./scripts/node-shim.js scripts/prepare-dev-db.ts",
  "test": "vitest"
}
```

**What to copy:** Phase 59 scripts should extend this existing verb style: `verify:phase59`, maybe `proof:phase59` only if planner chooses, and reuse `start` / `worker:start` / `db:migrate` instead of inventing new runtime commands.

---

### `src/lib/ops/env.server.ts` (config, transform)

**Primary analog:** `src/lib/dto/system-transport-settings.ts`

**Zod schema shape pattern** (`src/lib/dto/system-transport-settings.ts:1-18`, `23-52`):
```ts
import { z } from "zod";

export const SystemTransportConnectionStateSchema = z.enum([
  "disabled",
  "idle",
  "connecting",
  "ready",
  "degraded",
]);

export const SystemTransportSettingsDTOSchema = z.object({
  classroomTransportMode: ClassroomTransportModeSchema,
  effectiveMode: ClassroomTransportModeSchema,
  deployStatus: SystemTransportDeployStatusSchema,
  canManage: z.boolean(),
  deployAllowsRedis: z.boolean(),
  redisConfigured: z.boolean(),
  redisReachable: z.boolean(),
  degraded: z.boolean(),
  degradedReason: z.string().nullable(),
});
```

**Env-source anchors to normalize**:
- `server.ts:7-9`
```ts
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
```
- `src/db/index.ts:1-7`
```ts
const client = createClient({
  url: process.env.DB_FILE_NAME || "file:local.db",
});
```
- `src/features/async-tasks/infra/connection.ts:178-188`
```ts
const redisUrl = process.env.BULLMQ_REDIS_URL?.trim() || null;
const asyncTasksEnabled = process.env.ASYNC_TASKS_ENABLED === "true" && Boolean(redisUrl);
const prefix = process.env.BULLMQ_PREFIX?.trim() || DEFAULT_BULLMQ_PREFIX;
```
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts:93-102`
```ts
const redisUrl = process.env.REDIS_URL?.trim() || null;
const deployAllowsRedis =
  process.env.REDIS_FANOUT_ENABLED === "true" && Boolean(redisUrl);
```
- `src/features/runtime-platform/seams/transport/ws-auth.ts:90-94`
```ts
const token = await getToken({
  req: toTokenRequest(request),
  secret: process.env.AUTH_SECRET,
});
```

**What to copy:** centralized `zod` schema + explicit booleans/enums; Phase 59 env module should become the single server-owned parser for all of the above variables.

---

### `src/app/api/health/route.ts` (route, request-response)

**Analog:** `src/app/api/classroom/[sessionId]/snapshot/route.ts`

**Minimal route shape** (`src/app/api/classroom/[sessionId]/snapshot/route.ts:1-14`):
```ts
import { getClassroomSnapshotDTO } from "@/lib/dal/classroom";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const snapshot = await getClassroomSnapshotDTO({ sessionId });
    return Response.json(snapshot, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
```

**Error-to-response mapping pattern** (`src/app/api/classroom/[sessionId]/snapshot/route.ts:15-45`):
```ts
  } catch (error) {
    if (error instanceof Error) {
      return Response.json(
        { error: message, message: userMessage },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      { error: "INTERNAL_SERVER_ERROR", message: "服务器内部错误" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

**What to copy:** keep route handlers tiny, always set `Cache-Control: no-store`, and translate internal failures into explicit JSON rather than raw thrown errors.

---

### `src/app/api/ready/route.ts` (route, request-response)

**Primary analog:** `src/lib/dal/runtime-inspector.ts`

**Aggregation pattern** (`src/lib/dal/runtime-inspector.ts:145-170`, `301-337`):
```ts
const [lifecycleRows, governanceRows, transportRows, consumerRows, classroomRows, pluginAuditRows] =
  await Promise.all([ ... ]);

return RuntimeInspectorDTOSchema.parse({
  scopeRole: scope.role,
  selectedRuntimeSessionId: selectedSession.id,
  health: {
    lifecycleState: latestLifecycle?.toState ?? "unknown",
    governanceDecision: latestGovernance?.decision ?? "unknown",
    transportAttemptStatus: latestTransport?.attemptStatus ?? "unknown",
    consumerTraceStatus: latestConsumer?.status ?? "unknown",
    transportTopology: ...,
    degraded: ...,
    degradedReason: ...,
    lastHealthyAt: fanoutHealth.lastHealthyAt,
  },
  timeline,
  emptyState: null,
});
```

**Worker readiness source** (`src/lib/dal/async-task-operator.ts:279-352`):
```ts
const [connectionHealth, workerHeartbeats, taskRows] = await Promise.all([
  Promise.resolve(getBullmqConnectionHealthSnapshot()),
  listAsyncWorkerHeartbeats(),
  listOperatorVisibleAsyncTasks({ schoolIds: scope.schoolIds, limit: 100 }),
]);

return AsyncTaskOperatorOverviewDTOSchema.parse({
  platformHealth: {
    asyncTasksEnabled: connectionHealth.asyncTasksEnabled,
    redisConfigured: connectionHealth.redisConfigured,
    redisReachable: connectionHealth.redisReachable,
    workerState: connectionHealth.connectionStates.worker,
    lastError: connectionHealth.lastError,
    lastHealthyAt: connectionHealth.lastHealthyAt,
    workerHeartbeats: workerHeartbeats.map((heartbeat) => ({
      instanceId: heartbeat.instanceId,
      status: heartbeat.status,
      lastSeenAt: toIso(heartbeat.lastSeenAt),
    })),
  },
});
```

**Fanout degraded / non-blocking vocabulary** (`src/lib/dal/system-transport-settings.ts:73-118`):
```ts
await probeRedisFanoutHealth();
const fanoutHealth = classroomRedisFanoutManager.getSnapshot();

return SystemTransportSettingsDTOSchema.parse({
  deployAllowsRedis: fanoutHealth.deployAllowsRedis,
  redisConfigured: fanoutHealth.redisConfigured,
  redisReachable: fanoutHealth.redisReachable,
  degraded: fanoutHealth.degraded,
  degradedReason: fanoutHealth.degradedReason,
  health: {
    connectionState: fanoutHealth.connectionState,
    lastError: fanoutHealth.lastError,
    lastHealthyAt: fanoutHealth.lastHealthyAt,
    instanceId: fanoutHealth.instanceId,
  },
});
```

**What to copy:** `ready` should be an aggregate DTO-style probe built from Promise.all + `.parse(...)`, with worker posture blocking and fanout posture exposed as degraded-but-non-blocking detail.

---

### `src/app/api/release/route.ts` (route, request-response)

**Analog:** `src/app/api/ws/classroom/[sessionId]/route.ts`

**Informational surface pattern** (`src/app/api/ws/classroom/[sessionId]/route.ts:1-27`):
```ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);

  return Response.json(
    {
      sessionId,
      transport: "websocket",
      upgradeRequired: true,
      rollbackSurface: `/api/classroom/${sessionId}/events`,
      message: "...普通 HTTP GET 仅返回说明信息。",
    },
    {
      status: 426,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
```

**What to copy:** if planner keeps `/api/release`, make it an informational JSON surface with explicit `no-store` headers and operator-facing metadata, not a page or HTML document.

---

### `scripts/verify-phase59-deploy-release.ts` (test, batch)

**Analog:** `scripts/verify-phase58-operator-recovery-and-surfaces.ts`

**Helper layout** (`scripts/verify-phase58-operator-recovery-and-surfaces.ts:59-96`):
```ts
export function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    ...
    console.error(`Phase 58 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  ...
}
```

**Main phase gate structure** (`scripts/verify-phase58-operator-recovery-and-surfaces.ts:269-340`):
```ts
export async function runPhase58Verification() {
  console.log("Starting Phase 58 operator recovery verification...");

  const staticChecks = evaluatePhase58StaticChecks({ ... });
  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    ...
    process.exit(1);
  }

  console.log("  ✓ Static close-gate checks passed.");
  runVitest(getPhase58VerificationSuitePaths(), "Phase 58 focused operator recovery suites");
  run(process.execPath, [...], "Phase 58 operator walkthrough proof");
}
```

**What to copy:** Phase 59 verifier should follow the same shape: static checks first, focused suite list second, then shell/probe proof steps for deploy/ready/restore.

---

### `scripts/verify-phase59-deploy-release.test.ts` (test, transform)

**Analog:** `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts`

**Static-contract test pattern** (`scripts/verify-phase58-operator-recovery-and-surfaces.test.ts:1-18`, `24-43`, `45-160`):
```ts
import { describe, expect, it } from "vitest";

import {
  evaluatePhase58StaticChecks,
  getPhase58ProofHardGateScenarios,
  getPhase58VerificationSuitePaths,
  verifyPhase58PackageScripts,
} from "./verify-phase58-operator-recovery-and-surfaces";

describe("verify-phase58 operator recovery gate", () => {
  it("expects the dedicated verify:phase58 and proof:phase58 package scripts", () => {
    ...
  });

  it("locks the focused suite list and proof hard-gate scenario ids", () => {
    ...
  });

  it("keeps static close-gate checks focused on ...", () => {
    const checks = evaluatePhase58StaticChecks({ ... });
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
```

**What to copy:** use snapshot-like static expectations over file content and suite lists; Phase 59 test should lock script names, required artifacts, and restore verification scenarios.

---

### `ops/deploy/deploy.sh` / `ops/deploy/rollback.sh` (utility, batch)

**Primary analog:** `scripts/verify-phase57-classroom-runtime.ts`

**Sequenced gate pattern** (`scripts/verify-phase57-classroom-runtime.ts:120-146`):
```ts
console.log("\n[1/5] launch readiness gate...");
runVitest(["src/actions/classroom-actions.test.ts"], "Phase 57 launch readiness gate");

console.log("\n[2/5] teacher round control gate...");
runVitest(["src/components/classroom/classroom-control-panel.test.tsx"], "Phase 57 teacher round control gate");

...

console.log("\n[5/5] browser/UAT proof gate...");
await runBrowserProof();
```

**Command truth to call** (`package.json:8-12`, `57-66`):
```json
"build": "next build --turbopack",
"start": "NODE_ENV=production node ... server.ts",
"worker:start": "NODE_ENV=production node ... async-task-worker.ts",
"typecheck": "tsc --noEmit",
"lint": "eslint .",
"db:migrate": "tsx --import ./scripts/node-shim.js scripts/prepare-dev-db.ts"
```

**What to copy:** shell scripts should preserve the same strict ordered gate style: lint → typecheck → test/verifier → build → migrate → restart → `/api/health` → `/api/ready`; rollback should mirror deploy but use previous green release manifest as input.

---

### `ops/deploy/backup.sh` / `ops/deploy/restore.sh` / `ops/deploy/verify-restore.sh` (utility, file-I/O)

**Primary analog:** `scripts/prepare-dev-db.ts`

**SQLite probe / existence helpers** (`scripts/prepare-dev-db.ts:22-35`, `61-65`):
```ts
async function tableExists(tableName: string) {
  const result = await db.values(
    sql`select name from sqlite_master where type = 'table' and name = ${tableName} limit 1`,
  );

  return result.length > 0;
}

async function indexExists(indexName: string) {
  const result = await db.values(
    sql`select name from sqlite_master where type = 'index' and name = ${indexName} limit 1`,
  );
```

**Migration/restore guard pattern** (`scripts/prepare-dev-db.ts:202-272`):
```ts
async function readRecordedMigrationTag() {
  const hasMigrationTable = await tableExists(MIGRATION_TABLE);
  if (!hasMigrationTable) {
    return null;
  }
  ...
}

async function bridgeExistingSchemaIfNeeded() {
  const schemaTag = await detectExistingSchemaTag();
  ...
  await syncMigrationMetadataToTag(schemaTag);
}

export async function prepareDevDb() {
  await bridgeExistingSchemaIfNeeded();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
```

**What to copy:** backup/restore scripts should stay SQLite-first and verification-first: inspect durable DB state explicitly, then run integrity/foreign-key/app-level checks before marking success.

---

### `src/app/api/ops-routes.test.ts` (test, request-response)

**Primary analogs:** `scripts/verify-phase57-classroom-runtime.test.ts`, `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts`

**Compact expectation style** (`scripts/verify-phase57-classroom-runtime.test.ts:11-49`):
```ts
describe("verify-phase57 classroom runtime gate", () => {
  it("expects the dedicated verify:phase57 and proof:phase57 package scripts", () => {
    ...
  });

  it("only keeps irreducible static checks ...", () => {
    const checks = evaluatePhase57StaticChecks({ ... });
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
```

**What to copy:** keep tests narrow and contract-focused. For route tests, assert status code, JSON shape, `Cache-Control: no-store`, worker/fanout posture semantics, and canonical pointer/operator-correlation fields rather than UI concerns.

---

## Shared Patterns

### Zod-first contract definition
**Source:** `src/lib/dto/system-transport-settings.ts:1-18`, `23-52`
**Apply to:** `ops/deploy/env.server.ts`, any Phase 59 DTO/helper file
```ts
import { z } from "zod";

export const SystemTransportSettingsDTOSchema = z.object({
  deployAllowsRedis: z.boolean(),
  redisConfigured: z.boolean(),
  redisReachable: z.boolean(),
  degraded: z.boolean(),
  degradedReason: z.string().nullable(),
  health: SystemTransportHealthDTOSchema,
});
```

### Honest degraded / next-step vocabulary
**Source:** `src/lib/dto/operator-honesty.ts:25-53`
**Apply to:** `/api/ready`, release/restore diagnostics, verifier outputs
```ts
return OperatorHonestyCardSchema.parse({
  title: input.title,
  tone: input.tone ?? "degraded",
  sections: [
    { id: "trustBoundary", label: "仍可信什么 / 已不可信什么", content: ... },
    { id: "impactScope", label: "影响范围", content: input.impactScope },
    { id: "nextStep", label: "推荐下一步", content: input.nextStep },
  ],
});
```

### Worker readiness is capability + heartbeat, not just process boot
**Source:** `src/features/async-tasks/worker/bootstrap.ts:146-186`, `src/features/async-tasks/infra/connection.ts:120-165`, `src/lib/dal/async-task-operator.ts:279-352`
**Apply to:** `/api/ready`, deploy gate, restore verification
```ts
const capability = getBullmqEnvironmentCapability();
if (!capability.asyncTasksEnabled) {
  return this.getSnapshot();
}

const [connectionHealth, workerHeartbeats] = await Promise.all([
  Promise.resolve(getBullmqConnectionHealthSnapshot()),
  listAsyncWorkerHeartbeats(),
]);
```

### Fanout is visible degraded state, not a hard blocker
**Source:** `src/lib/dal/system-transport-settings.ts:81-118`, `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts:176-201`
**Apply to:** `/api/ready`, release payload, restore output
```ts
await probeRedisFanoutHealth();
const fanoutHealth = classroomRedisFanoutManager.getSnapshot();

return SystemTransportSettingsDTOSchema.parse({
  degraded: fanoutHealth.degraded,
  degradedReason: fanoutHealth.degradedReason,
  health: {
    connectionState: fanoutHealth.connectionState,
    lastError: fanoutHealth.lastError,
  },
});
```

### Verification scripts use repo-local helpers + focused suites
**Source:** `scripts/verify-phase57-classroom-runtime.ts:31-69`, `scripts/verify-phase58-operator-recovery-and-surfaces.ts:59-96`
**Apply to:** `scripts/verify-phase59-deploy-release.ts`, shell wrappers
```ts
function read(filePath: string) { ... }
function run(command: string, args: readonly string[], label: string) { ... }
function runVitest(paths: readonly string[], label: string) { ... }
```

### DB truth is always anchored to `DB_FILE_NAME`
**Source:** `src/db/index.ts:1-9`, `drizzle.config.ts:1-10`
**Apply to:** env schema, deploy scripts, backup/restore scripts
```ts
const client = createClient({
  url: process.env.DB_FILE_NAME || "file:local.db",
});

export default defineConfig({
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME || "file:local.db",
  },
});
```

## No Analog Found

Files with no close in-repo analog; planner should lean on `59-RESEARCH.md` examples:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `.env.example` | config | transform | Repo only has `.env.local`, and it contains a real secret; there is no safe checked-in template pattern yet. |
| `.github/workflows/pilot-release.yml` | config | batch | No existing GitHub Actions workflow exists in the repo. |
| `ops/systemd/openlearn-web.service` | config | process-supervision | No existing `systemd` unit files exist in the repo. |
| `ops/systemd/openlearn-worker.service` | config | process-supervision | No existing `systemd` unit files exist in the repo. |

## Metadata

**Analog search scope:** `package.json`, `server.ts`, `drizzle.config.ts`, `src/app/api/**`, `src/lib/dal/**`, `src/lib/dto/**`, `src/features/async-tasks/**`, `src/features/runtime-platform/**`, `scripts/**`

**Files scanned:** 19

**Pattern extraction date:** 2026-05-26
