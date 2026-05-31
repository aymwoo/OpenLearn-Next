---
status: resolved
trigger: "Phase 60.1 local pilot-host substitute: `pnpm verify:phase60` fails with `SQLITE_BUSY` during sample-smoke fixture upsert"
created: 2026-05-29T11:15:00+08:00
updated: 2026-05-29T19:35:00+08:00
---

## Current Focus

hypothesis: 本机替代 pilot-host 的 live proof 链路在共享 SQLite truth 上发生并发写锁冲突，导致 `scripts/load/phase60-fixtures.ts` 在 sample-smoke 阶段执行 fixture upsert 时被 `SQLITE_BUSY` 阻断。
test: 对照 Phase 60 proof 进程拓扑、本地常驻 web/worker、SQLite 连接模式与 `phase60-fixtures` 写入路径，找出是谁持有锁以及为何在本机路径下持续复现。
expecting: 确认这是环境/运行方式导致的锁冲突还是代码级并发缺陷，并给出可验证修复路径。
next_action: use isolated local proof lane or continue to live target closeout

## Symptoms

expected: 在本机替代 pilot-host 环境中，`pnpm verify:phase60` 应通过 sample smoke gate，继续执行 live rehearsal 所需的后续容量、drills 与 rollout/rollback 证明链路。
actual: `pnpm verify:phase60` 在 sample-smoke gate 稳定失败；`scripts/load/phase60-fixtures.ts` 为演练用户做 upsert 时抛出 `SQLITE_BUSY: database is locked`，导致 Phase 60 无法继续进入 live proof。
errors: "DrizzleQueryError: Failed query: select \"id\" from \"user\" where \"user\".\"email\" = ? limit ?" caused by `LibsqlError: SQLITE_BUSY: database is locked` during `upsertUser()` in `scripts/load/phase60-fixtures.ts`.
reproduction: 1. 使用 `.env.local` 中的本机 Phase 60 env。2. 启动 Docker Redis（6379）。3. 启动本地 web 与 worker，并让 `http://127.0.0.1:3000` 可访问。4. 运行 `pnpm verify:phase60`。5. 在 sample-smoke gate 中复现 `SQLITE_BUSY`。
started: 2026-05-29，在继续执行 Phase 60.1、把本机作为 pilot-host 替代环境推进 live rehearsal 时发现；清除早期 env / 服务未启动问题后，该锁冲突仍稳定存在。

## Eliminated

## Evidence

- timestamp: 2026-05-29T11:16:00+08:00
  finding: `src/db/index.ts` uses `createClient({ url: process.env.DB_FILE_NAME || "file:local.db" })` with no connection-level busy timeout / WAL configuration, so all local processes share the same SQLite file posture.

- timestamp: 2026-05-29T11:17:00+08:00
  finding: `.env.local` exposes `DB_FILE_NAME=file:local.db` and `PHASE60_BASE_URL=http://127.0.0.1:3000`, so local Phase 60 smoke and long-lived app processes target the same repo-local SQLite database.

- timestamp: 2026-05-29T11:18:00+08:00
  finding: Running `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/load/phase60-fixtures.ts` standalone still fails with `SQLITE_BUSY` in `upsertUser()`, proving the lock is already held before the broader `verify:phase60` chain continues.

- timestamp: 2026-05-29T11:19:00+08:00
  finding: `lsof local.db` shows multiple long-lived holders on the same file: two `server.ts` node processes and one `src/server/workers/async-task-worker.ts` process. This matches the local pilot-host substitute topology and indicates cross-process contention on one SQLite truth file.

- timestamp: 2026-05-29T11:20:00+08:00
  finding: The reproducing holders include a stale prior `server.ts` process plus the current web and worker processes, so the immediate blocker is environment/runtime contention on `local.db`, not an isolated bug inside fixture upsert ordering.
## Resolution

root_cause:
  repo-local `verify:phase60`、本地 web、worker 和残留 `server.ts` 进程共用 `file:local.db`，导致 sample-smoke fixture seeding 在共享 SQLite truth 上与长驻进程争锁；原始 verifier 也没有阻止这种 localhost + shared-db posture。
fix:
  1. 在 `src/db/index.ts` 对本地 `file:` SQLite 启用一次性 WAL / busy_timeout / synchronous bootstrap。
  2. 在 `scripts/load/phase60-fixtures.ts` 对 `SQLITE_BUSY` 做有限重试，并在耗尽后抛出显式 `PHASE60_LOCAL_SQLITE_BUSY_BLOCKER`。
  3. 新增 `pnpm verify:phase60:local`，通过 `scripts/verify-phase60-local.ts` 把源 SQLite truth 复制到 `/tmp/opencode/phase60-local-proof/local.db`，再在隔离副本上执行 canonical verifier。
  4. 在 `scripts/verify-phase60-load-and-rehearsal.ts` 上增加 fail-closed guard：当 `PHASE60_BASE_URL` 指向 `localhost/127.0.0.1` 且 `DB_FILE_NAME=file:local.db` 时，直接抛出 `PHASE60_LOCAL_DB_SHARED_WITH_APP: rerun pnpm verify:phase60:local`。
verification:
  - `pnpm exec vitest --run src/db/index.test.ts scripts/load/phase60-fixtures.test.ts scripts/verify-phase60-load-and-rehearsal.test.ts`
  - `pnpm exec eslint src/db/index.ts src/db/index.test.ts scripts/load/phase60-fixtures.ts scripts/load/phase60-fixtures.test.ts scripts/verify-phase60-load-and-rehearsal.ts scripts/verify-phase60-load-and-rehearsal.test.ts scripts/verify-phase60-local.ts`
  - `DB_FILE_NAME=file:local.db PHASE60_BASE_URL=http://127.0.0.1:3000 OPENLEARN_SHARED_ROOT=/tmp/shared OPENLEARN_CURRENT_ROOT=/tmp/current OPENLEARN_HEALTHCHECK_BASE_URL=http://127.0.0.1:3000 pnpm verify:phase60` now fails closed with `PHASE60_LOCAL_DB_SHARED_WITH_APP: rerun pnpm verify:phase60:local`.
  - `pnpm verify:phase60:local` now reaches the canonical verifier on an isolated `/tmp/opencode/phase60-local-proof/local.db` copy; the next blocker is the expected live-target env gate instead of shared-DB contention.
files_changed:
  - src/db/index.ts
  - src/db/index.test.ts
  - scripts/load/phase60-fixtures.ts
  - scripts/load/phase60-fixtures.test.ts
  - scripts/verify-phase60-load-and-rehearsal.ts
  - scripts/verify-phase60-load-and-rehearsal.test.ts
  - scripts/verify-phase60-local.ts
  - package.json
