---
phase: 68-governed-declarative-data-access-verbs
plan: 03
subsystem: api
tags: [plugin-data-access, command-bus, write-verbs, append-only, audit, drizzle, replay-safe]

# Dependency graph
requires:
  - phase: 68-01
    provides: pluginDataAccessAllowlist + validateInsertPayload/resolvePluginTable + PluginDataAccessError named-rejection vocabulary
  - phase: 68-02
    provides: assertActionExecutable governance gate + writePluginDataAccessAudit (tx-aware) + verb contract
  - phase: 62/66
    provides: platform Command Bus (dispatchPlatformCommand) + createPlatformCommandDefinition + in-process event adapter + producer pattern (plugin-governance)
provides:
  - PluginDataCommandTypes —— 两写动词命令类型 plugin.data.insert / plugin.data.upsert（D-02：写动词唯二新增命令类型）
  - pluginDataInsertHandler / pluginDataUpsertHandler —— authorize(双派生)+execute(事务内 append-only/isLatest + allowed/denied 审计)
  - producePluginDataInsert / producePluginDataUpsert —— 经 dispatchPlatformCommand 的写动词入口（Plan 04 写分支将复用）
affects: [68-04 read-verbs, plugin-data-access dispatch facade (Plan 04)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "verb→command-type 一一映射：写动词唯二新增命令类型，读动词(Plan04)零新增命令类型 (D-02)"
    - "handler 双派生：authorize 先行派生+只写 denied 审计；execute 重派生+事务内写业务行与 allowed 审计同提交 (D-04)"
    - "append-only：insert 直接追加(attemptNo=max+1, isLatest=true)；upsert 先撤销旧 isLatest 再追加(保留历史)"
    - "producer 镜像 plugin-governance：自带 platformCommandStore + 注入 in-process publicationPort，无第二真相源"
    - "schoolId 唯一权威：scope 携带、payload 仅 {pluginKey,table,values}，payload 越校由白名单层具名拒绝"

key-files:
  created:
    - src/features/platform-core/commands/handlers/plugin-data.ts
    - src/features/platform-core/commands/handlers/plugin-data.test.ts
    - src/features/platform-core/commands/producers/plugin-data.ts
    - src/features/platform-core/commands/producers/plugin-data.test.ts
  modified:
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/platform-core/commands/handlers/plugins.test.ts

key-decisions:
  - "insert=纯追加(不撤销既有 isLatest)；upsert=按声明 uniques 撤销旧 isLatest 后追加；动词差异在命令类型级 (D-02)"
  - "handler authorize 仅对白名单层 PluginDataAccessError 写恰一条 denied 审计后 rethrow；治理门拒因由门自身落审计，避免双写"
  - "attemptNo 由 select max(attemptNo)+1 在同事务内派生；真实 unique(逻辑键,attemptNo) 索引使漏自增即冲突暴露"
  - "successResult 不发事件(emittedEvents=[])：实时投递交 Plan 04；命令记录+自有表是唯一 durable 真相 (SC3)"
  - "producer e2e 改为 producers/plugin-data.test.ts 独立单元测试(mock bus)，镜像 plugin-governance.test.ts —— 真实 bus e2e 经 registry 传递引入 next-auth 在 vitest 下 ESM 解析失败 (next/server)"

patterns-established:
  - "Pattern: 写动词 handler successResult 形状 {resultSummary, invalidation:{tags:[]}, emittedEvents:[], failureEvent:null, failureAttribution:null}"
  - "Pattern: producer 复制 store inline 而非从 plugin-governance 导出，保持改动文件聚焦"

requirements-completed: [ACCESS-03]

# Metrics
duration: ~55min
completed: 2026-06-03
---

# Phase 68 Plan 03: Plugin Data Write Verbs (insert / upsert) Summary

**两写动词 `plugin.data.insert` / `plugin.data.upsert` 经 Command Bus → DAL → SQLite 落库为唯一权威：append-only + isLatest 事务、按声明 uniques replay-safe、schoolId 仅由鉴权闭包派生、成功与失败都写 governance audit，全程零第二真相源。**

## Performance

- **Duration:** ~55 min (multi-session, resumed)
- **Completed:** 2026-06-03
- **Tasks:** 3/3
- **Tests:** 9 new (5 handler real-DB + 4 producer wiring), full commands suite 58/58 green, `tsc --noEmit` clean

## What Was Built

### Task 1 — Declare & register write command types (`54f54b6`)
- `contracts.ts`: `PluginDataCommandTypes`（`plugin.data.insert` / `plugin.data.upsert`）+ 严格 insert/upsert payload schemas + 并入命令类型 map/union。
- `registry.ts`: 导入并注册两 handler，`dedupe: "required"`，镜像 `lesson.draft.persist` 注册形态。

### Task 2 — Write verb handlers (`d3c9a25`)
- `handlers/plugin-data.ts`：`pluginDataInsertHandler` / `pluginDataUpsertHandler`。
  - `authorize`：`assertActionExecutable`（门自审计其拒因）→ `resolvePluginTable` + `validateInsertPayload`（真实白名单）；仅对白名单层 `PluginDataAccessError` try/catch 写恰一条 denied 审计后 rethrow。
  - `execute`：重派生 → `db.transaction`：`select max(attemptNo)+1` →（upsert）撤销旧 `isLatest` →（insert/upsert）追加 `returning` → 同事务写一条 allowed 审计。
- `handlers/plugin-data.test.ts`（真实 `@/db` via `DB_FILE_NAME` + `vi.resetModules()`，仅 mock 治理门，保留真实白名单/审计）：insert 纯追加、upsert 撤销+保留历史、schoolId 取自门非 payload、allowed 同事务、越校 denied 审计 + rethrow。

### Task 3 — Write verb producers (`3e168b8`)
- `producers/plugin-data.ts`：`producePluginDataInsert/Upsert` 经 `dispatchPlatformCommand`，自带 `platformCommandStore`、注入 `defaultInProcessPlatformEventAdapter`，`schoolId` 仅在 scope。
- `producers/plugin-data.test.ts`：镜像 `plugin-governance.test.ts`，mock bus/db/adapter，断言命令入参形状、依赖注入、结果归一化、dedupeKey 透传、schoolId 唯一权威。

## Deviations from Plan

### 1. [Rule 3 - Blocking] Producer 测试改为独立文件（+1 文件，超 files_modified 计划）
- **Found during:** Task 3（原计划把 producer e2e 测试写入 `handlers/plugin-data.test.ts`）。
- **Issue:** 真实 bus e2e 经 `registry` 传递加载全部已注册 handler，其依赖链在 vitest 下触发 `next-auth/lib/env.js` 导入 `next/server` 的 ESM 解析失败；且与同文件“真实 `@/db`”的 handler 测试需要互斥的 mock 策略（producer 需 mock bus）。
- **Fix:** 新建 `src/features/platform-core/commands/producers/plugin-data.test.ts`，严格镜像既有 `producers/plugin-governance.test.ts` 单元测试模式（mock `dispatchPlatformCommand`/`@/db`/in-process 适配器），验证 producer 接线而非重复 handler 落库行为（后者已被 Task 2 真实库测试覆盖）。
- **Files modified:** `producers/plugin-data.test.ts` (new)。
- **Commit:** `3e168b8`。

### 2. [Rule 1 - Bug] 修正 registry-keys 精确匹配断言
- **Found during:** Task 3 后跑全 commands 套件。
- **Issue:** `plugins.test.ts:571` 对 `Object.keys(platformCommandRegistry)` 做全量快照断言；Task 1 注册两新命令类型后该断言失败（正确的注册导致快照过期）。
- **Fix:** 在快照尾部补 `plugin.data.insert` / `plugin.data.upsert`。
- **Files modified:** `handlers/plugins.test.ts`。
- **Commit:** `eaa7dc2`。

## Authentication Gates

None.

## Known Stubs

None —— 写路径真实落库；`emittedEvents=[]` 为刻意设计（实时投递归 Plan 04），命令记录 + 自有表已是唯一 durable 真相，非占位。

## Self-Check: PASSED

- FOUND: src/features/platform-core/commands/handlers/plugin-data.ts
- FOUND: src/features/platform-core/commands/handlers/plugin-data.test.ts
- FOUND: src/features/platform-core/commands/producers/plugin-data.ts
- FOUND: src/features/platform-core/commands/producers/plugin-data.test.ts
- FOUND commit: 54f54b6 (Task 1)
- FOUND commit: d3c9a25 (Task 2)
- FOUND commit: 3e168b8 (Task 3)
- FOUND commit: eaa7dc2 (Rule 1 fix)
- VERIFIED: `pnpm vitest run src/features/platform-core/commands` → 58/58 pass
- VERIFIED: `pnpm typecheck` (tsc --noEmit) → clean
