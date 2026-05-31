# Phase 60: Load, Degrade & Pilot Rehearsal - Pattern Map

**Mapped:** 2026-05-28  
**Files analyzed:** 9  
**Analogs found:** 7 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/verify-phase60-load-and-rehearsal.ts` | utility | batch | `scripts/verify-phase59-deploy-release.ts` | exact |
| `scripts/verify-phase60-load-and-rehearsal.test.ts` | test | batch | `scripts/verify-phase59-deploy-release.test.ts` | exact |
| `scripts/load/phase60-capacity.k6.js` | test | request-response | _No in-repo k6 analog_ | no-analog |
| `scripts/load/phase60-drills.k6.js` | test | event-driven | _No in-repo k6 analog_ | no-analog |
| `scripts/load/phase60-fixtures.ts` | utility | batch | `scripts/proof-phase57-classroom-runtime.ts` | partial |
| `package.json` | config | batch | `package.json` | role-match |
| `ops/releases/evidence/phase60/rehearsal-summary.md` | config | batch | `.planning/phases/59-deploy-release-recovery-baseline/59-RESTORE-DRILL.md` | partial |
| `ops/releases/evidence/phase60/rollout-notes.md` | config | batch | `ops/releases/checklists/rollout.md` | exact |
| `ops/releases/evidence/phase60/rollback-notes.md` | config | batch | `ops/releases/checklists/rollback.md` | exact |

## Pattern Assignments

### `scripts/verify-phase60-load-and-rehearsal.ts` (utility, batch)

**Primary analog:** `scripts/verify-phase59-deploy-release.ts`

**Imports + helper layout** (`scripts/verify-phase59-deploy-release.ts:1-15`):
```ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};
```

**Focused suite list pattern** (`scripts/verify-phase59-deploy-release.ts:20-47`):
```ts
export function getPhase59RequiredArtifacts() {
  return [
    "ops/deploy/deploy.sh",
    "ops/deploy/rollback.sh",
    "ops/releases/checklists/rollout.md",
    "ops/releases/checklists/rollback.md",
  ] as const;
}

export function getPhase59FocusedSuitePaths() {
  return [
    "src/lib/ops/env.server.test.ts",
    "src/lib/ops/release-status.test.ts",
    "src/app/api/ops-routes.test.ts",
    "scripts/verify-phase59-deploy-release.test.ts",
  ] as const;
}
```

**`runVitest` helper pattern** (`scripts/verify-phase59-deploy-release.ts:71-86`):
```ts
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

  run("pnpm", ["exec", "vitest", "--run", ...paths], label);
}
```

**Close-gate orchestration pattern** (`scripts/verify-phase57-classroom-runtime.ts:101-148`, `scripts/verify-phase59-deploy-release.ts:179-207`):
```ts
const failedChecks = staticChecks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error("  ❌ Static analysis failed with the following gaps:");
  for (const check of failedChecks) {
    console.error(`     - ${check.label}`);
  }
  process.exit(1);
}

runVitest(getPhase59FocusedSuitePaths(), "Phase 59 focused deploy-release suites");
await module.runPhase57BrowserProof();
```

**Copy for Phase 60:** 保留 `read()` / `run()` / `runVitest()` / static checks / numbered steps / `process.exit(1)` blocker 结构；新增步骤按 `static -> Playwright smoke -> k6 capacity -> drills -> rollback rehearsal -> summary artifact` 排列。

---

### `scripts/verify-phase60-load-and-rehearsal.test.ts` (test, batch)

**Analog:** `scripts/verify-phase59-deploy-release.test.ts`

**Import + expectation style** (`scripts/verify-phase59-deploy-release.test.ts:1-8`):
```ts
import { describe, expect, it } from "vitest";

import {
  evaluatePhase59StaticChecks,
  getPhase59FocusedSuitePaths,
  getPhase59RequiredArtifacts,
  verifyPhase59PackageScripts,
} from "./verify-phase59-deploy-release";
```

**Static contract test pattern** (`scripts/verify-phase59-deploy-release.test.ts:23-48`):
```ts
expect(getPhase59RequiredArtifacts()).toEqual([...]);
expect(getPhase59FocusedSuitePaths()).toEqual([...]);
```

**Verifier source lock pattern** (`scripts/verify-phase59-deploy-release.test.ts:50-94`):
```ts
const checks = evaluatePhase59StaticChecks({
  packageSource: JSON.stringify({ scripts: { "verify:phase59": "..." } }),
  verifierSource: `
    export function read(filePath: string) {}
    function run(command: string, args: readonly string[], label: string) {}
    function runVitest(paths: readonly string[], label: string) {}
  `,
  artifactPresence: Object.fromEntries(getPhase59RequiredArtifacts().map((artifact) => [artifact, true])),
});

expect(checks.every((check) => check.passed)).toBe(true);
```

**Copy for Phase 60:** 测 `verify:phase60` script 字符串、artifact list、focused suite list、k6 file presence、summary artifact path、以及 verifier 是否继续使用 helper-based implementation 而不是临时 shell 拼接。

---

### `scripts/load/phase60-fixtures.ts` (utility, batch)

**Analog:** `scripts/proof-phase57-classroom-runtime.ts`

**DB imports + fixture typing** (`scripts/proof-phase57-classroom-runtime.ts:1-42`):
```ts
import { and, eq, inArray } from "drizzle-orm";
import { encode } from "next-auth/jwt";
import { chromium, type Browser, type Page } from "playwright";

import { db } from "@/db";
import {
  classMembers,
  classes,
  classroomEvidence,
  classroomEvents,
  classroomParticipants,
  classroomSessions,
  ...
} from "@/db/schema";
```

**Fixture upsert pattern** (`scripts/proof-phase57-classroom-runtime.ts:136-175`):
```ts
const [existingUser] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, input.email))
  .limit(1);

if (existingUser) {
  await db.update(users).set({...}).where(eq(users.id, existingUser.id));
  return existingUser.id;
}

const [insertedUser] = await db.insert(users).values({...}).returning({ id: users.id });
```

**Session/classroom seed pattern** (`scripts/proof-phase57-classroom-runtime.ts:433-551`):
```ts
await db.insert(classroomSessions).values({
  id: sessionId,
  lessonId: lesson.lessonId,
  publishedVersionId: lesson.publishedVersionId,
  classId: base.classId,
  teacherId: base.teacherId,
  activeStepId: lesson.stepId,
  locked: false,
  transportModeSnapshot: "local_only",
  status: "live",
});
```

**Auth/session helper pattern** (`scripts/proof-phase57-classroom-runtime.ts:633-683`):
```ts
const sessionToken = await encode({
  secret,
  salt: cookieName,
  token: {
    sub: input.actor.id,
    id: input.actor.id,
    name: input.actor.name,
    email: input.actor.email,
    roles: input.actor.roles,
    workspaceRole: input.actor.workspaceRole,
  },
  maxAge: 60 * 60,
});
```

**Copy for Phase 60:** Phase 60 fixtures 应继续走真实 DB seed + class/session affinity + teacher/student identity helpers，不要为 k6 新造绕鉴权的内部捷径。

---

### `package.json` (config, batch)

**Analog:** `package.json`

**Script entry pattern** (`package.json:57-68`):
```json
"verify:phase57": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase57-classroom-runtime.ts",
"proof:phase57": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/proof-phase57-classroom-runtime.ts",
"verify:phase58": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase58-operator-recovery-and-surfaces.ts",
"verify:phase59": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase59-deploy-release.ts",
"test": "vitest"
```

**Copy for Phase 60:** 新 script 名称和命令格式应继续对齐 `verify:phase57/58/59`，即 `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase60-load-and-rehearsal.ts`；不要切回裸 `tsx` 或 shell wrapper。

---

### `ops/releases/evidence/phase60/rehearsal-summary.md` (config, batch)

**Primary analog:** `.planning/phases/59-deploy-release-recovery-baseline/59-RESTORE-DRILL.md`

**Evidence record shape** (`59-RESTORE-DRILL.md:1-15`):
```md
# Phase 59 Restore Drill Record

- Backup ID: `...`
- Source release: `...`
- Restored target: `...`
- Health result: `200 OK` — `{...}`
- Ready result: `200 OK` — `{...}`
- Sample-chain smoke: `passed`
- Release blocker: `no`
- Operator notes: ...
```

**Copy for Phase 60:** summary artifact 也应是单文件、结构化、可审计的 bullet record，至少收口 `Playwright smoke`、`k6 capacity`、`drills`、`rollback rehearsal`、`health/ready`、`go/no-go`、`blocker/rollback trigger`、`operator notes`。

---

### `ops/releases/evidence/phase60/rollout-notes.md` (config, batch)

**Analog:** `ops/releases/checklists/rollout.md`

**Checklist structure** (`ops/releases/checklists/rollout.md:1-46`):
```md
# Pilot rollout checklist

## Rollout block trigger alignment
- [ ] Confirm no `pilot rollout block trigger` is active before deploy...

## Canonical release truth
- [ ] Immutable manifest path: `ops/releases/manifests/<releaseId>.json`
- [ ] Canonical active pointer: `${OPENLEARN_RELEASE_MANIFESTS_DIR}/current.json`
- [ ] Canonical previous green pointer: `${OPENLEARN_RELEASE_MANIFESTS_DIR}/green.json`

## Execution steps
- [ ] Run `bash ops/deploy/deploy.sh ...`

## Post-deploy verification
- [ ] `/api/health` returns success.
- [ ] `/api/ready` returns success.
```

**Copy for Phase 60:** `rollout-notes.md` 应直接复用该 section 顺序，补充本次 rehearsal 的 actor、timestamp、releaseId、触发原因、样板 smoke 结果，不要另写新发布术语。

---

### `ops/releases/evidence/phase60/rollback-notes.md` (config, batch)

**Analog:** `ops/releases/checklists/rollback.md`

**Checklist structure** (`ops/releases/checklists/rollback.md:1-46`):
```md
# Pilot rollback checklist

## Pilot rollback trigger alignment
- [ ] Confirm a `pilot rollback trigger` exists: sample-chain regression, health/ready failure...

## Execution steps
- [ ] Run `bash ops/deploy/rollback.sh --release-id <previous-green-release-id> --reason <reason> ...`

## Post-rollback verification
- [ ] `/api/health` returns success after rollback.
- [ ] `/api/ready` returns success after rollback.
- [ ] `current.json` points to the rollback target release.
```

**Copy for Phase 60:** rollback notes 必须保留 trigger -> command -> post-rollback verification -> escalation 四段式，并把 `sample smoke 恢复通过` 追加到 post-rollback verification。

---

## Shared Patterns

### Phase verifier helper pattern
**Sources:** `scripts/verify-phase57-classroom-runtime.ts:31-69`, `scripts/verify-phase59-deploy-release.ts:49-86`  
**Apply to:** `scripts/verify-phase60-load-and-rehearsal.ts`
```ts
export function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], { stdio: "pipe", encoding: "utf8" });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    ...
    console.error(`Phase 59 verification failed while running: ${label}`);
    throw error;
  }
}
```

### Browser smoke reuse
**Source:** `scripts/verify-phase57-classroom-runtime.ts:96-99`, `scripts/proof-phase57-classroom-runtime.ts:771-803`  
**Apply to:** `scripts/verify-phase60-load-and-rehearsal.ts`, rehearsal close step
```ts
const module = await import("./proof-phase57-classroom-runtime");
await module.runPhase57BrowserProof();
```

### Blocking vs non-blocking degraded truth
**Source:** `src/lib/ops/release-status.ts:299-370`  
**Apply to:** Phase 60 drills, stop rules, summary wording
```ts
worker: {
  ...
  blocking: true,
},
fanout: {
  ...
  blocking: false,
  nextStep: fanoutOk
    ? "No operator action required."
    : "Treat fanout as optional degraded posture and inspect transport settings if classroom sync issues appear.",
}

const ok =
  components.db.posture === "green"
  && components.web.posture === "green"
  && components.worker.posture === "green";
```

### Rollout/rollback trigger pattern
**Sources:** `ops/deploy/deploy.sh:158-169`, `ops/deploy/deploy.sh:371-401`, `ops/deploy/deploy.sh:407-439`, `ops/deploy/rollback.sh:200-238`  
**Apply to:** Phase 60 rehearsal orchestration and notes
```sh
declare -A GATE_STATUSES=(
  [verifyPhase57]="pending"
  [verifyPhase58]="pending"
  [verifyPhase59]="pending"
  [health]="pending"
  [ready]="pending"
)

run_step verifyPhase57 bash -lc "cd \"$RELEASE_DIR\" && pnpm verify:phase57" || trigger_failure_rollback
run_step verifyPhase58 bash -lc "cd \"$RELEASE_DIR\" && pnpm verify:phase58" || trigger_failure_rollback
run_step verifyPhase59 bash -lc "cd \"$RELEASE_DIR\" && pnpm verify:phase59" || trigger_failure_rollback
run_step health "$CURL_BIN" -fsS "$BASE_URL/api/health" >/dev/null || trigger_failure_rollback
run_step ready "$CURL_BIN" -fsS "$BASE_URL/api/ready" >/dev/null || trigger_failure_rollback
```

### Checklist-first evidence structure
**Sources:** `ops/releases/checklists/rollout.md:5-46`, `ops/releases/checklists/rollback.md:5-46`  
**Apply to:** `rollout-notes.md`, `rollback-notes.md`, `rehearsal-summary.md`
```md
## Trigger alignment
## Canonical pointer and manifest checkpoints
## Execution steps
## Post-rollback verification
## Escalation
```

## No Analog Found

Files with no close in-repo analog; planner should use `60-RESEARCH.md` + official k6 references as implementation baseline.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/load/phase60-capacity.k6.js` | test | request-response | Repo has no existing `k6` assets or load-test runners. |
| `scripts/load/phase60-drills.k6.js` | test | event-driven | Repo has no existing protocol drill scripts; drills must be composed from Phase 58/59 truth seams. |

## Metadata

**Analog search scope:** `scripts/`, `scripts/load/`, `src/lib/ops/`, `ops/deploy/`, `ops/releases/checklists/`, `.planning/phases/59-deploy-release-recovery-baseline/`  
**Files scanned/read:** 10 primary analog files + phase context/research inputs  
**Pattern extraction date:** 2026-05-28
