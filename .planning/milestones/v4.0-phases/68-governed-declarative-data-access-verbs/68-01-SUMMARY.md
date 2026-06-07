---
phase: 68-governed-declarative-data-access-verbs
plan: 01
subsystem: database
tags: [drizzle, drizzle-zod, zod-v4, allowlist, plugin-data-access, compile-time-codegen, input-validation]

# Dependency graph
requires:
  - phase: 67-plugin-owned-data
    provides: declarative quizDataModel + compile-plugin-data-model.ts + generated drizzle tables + zero-runtime-DDL/drift gates
provides:
  - 编译期派生、checked-in、零漂移的访问白名单 const (pluginDataAccessAllowlist)
  - 白名单消费层 allowlist.ts (resolvePluginTable / assertIndexAllowed / assertGroupByAllowed / validateInsertPayload)
  - 10 类具名拒因常量 (PLUGIN_DATA_ACCESS_REASONS) + PluginDataAccessError
  - A1 spike 结论：drizzle-zod 在 zod v4 + SQLite text-enum 下走 IDEAL 路径
affects: [plan-68-02-governance-gate, plugin-data-access-verbs, audit-mapping]

# Tech tracking
tech-stack:
  added: [drizzle-zod@^0.8.3 (首次在仓库使用)]
  patterns:
    - "白名单单一真相源：表/列/索引/groupBy 仅由编译期派生 const 决定，零硬编码、零并行手写常量 (D-06)"
    - "drizzle 表注册表经 getTableName + is(v,Table) 反射构建，消费层不出现任何字面表名/列名字符串"
    - "具名拒因：每条形状/越界判定抛 PluginDataAccessError(reason)，供上层映射 audit/HTTP"

key-files:
  created:
    - src/db/schema/generated/plugin-owned/data-access-allowlist.ts
    - src/features/platform-core/plugin-data-access/allowlist.ts
    - src/features/platform-core/plugin-data-access/allowlist.test.ts
  modified:
    - scripts/compile-plugin-data-model.ts

key-decisions:
  - "A1 spike = IDEAL 路径：createInsertSchema(pluginOwnedQuizResponses) 对 text(col,{enum}) 派生 z.enum，'X' 被拒(code invalid_value)、'A' 通过；validateInsertPayload 直接信任 drizzle-zod enum 派生，无需 degraded 兜底"
  - "createInsertSchema 默认剥离未知字段 → picked schema 施加 .strict() 把多余字段判为 invalid_payload_rejected"
  - "assertIndexAllowed 语义：列不在 columns → unknown_column_rejected；列存在但非任何声明索引最左前缀 → unindexed_column_rejected"
  - "validateInsertPayload 判定顺序：raw_sql → free_where(对象/数组) → cross_school(schoolId 键) → drizzle-zod .pick(insertableColumns).strict()；TENANT_SCOPE_KEY='schoolId' 为策略常量"
  - "10 类拒因：7 形状类(本层抛) + 3 治理类(lifecycle/kill_switch/non_school_actor 此处声明、Plan 02 gate 抛)"

patterns-established:
  - "零硬编码白名单：消费层 import 生成 const + 反射表注册表，grep plugin_owned_quiz 在 allowlist.ts 零命中"
  - "检测式正则的注释用 // 行注释而非块注释，规避 zero-runtime-DDL 闸门对 DDL关键字+反引号 的启发式误判"

requirements-completed: [ACCESS-01, ACCESS-02]

# Metrics
duration: ~35min
completed: 2026-06-02
---

# Phase 68 Plan 01: Governed Data-Access Allowlist & Input Validation Foundation Summary

**编译期派生的零漂移访问白名单 + drizzle-zod(IDEAL 路径) 输入校验消费层，10 类具名拒因把"灵活查询=注入面"从根上变为不可表达**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-06-02
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- **A1 spike 锁定 IDEAL 路径**：首次在仓库引入 drizzle-zod（^0.8.3），探针证明 `createInsertSchema` 在 zod v4 下对 SQLite `text(col,{enum})` 派生出 `z.enum`——`selectedOption:"X"` 被拒（code `invalid_value`）、`"A"` 通过。无需 degraded（enumValues 补 z.enum）兜底。
- **零漂移单一真相源白名单**：扩展 `compile-plugin-data-model.ts`，在生成 drizzle 片段的同时确定性写出 `data-access-allowlist.ts`（`columns / insertableColumns / indexes / groupByColumns / uniques / enumColumns`，按 pluginKey→tableName 索引）。RESERVED_COLUMNS（id/schoolId/pluginId/createdAt/updatedAt）排除出 insertable；连续两次 `pnpm plugin:compile` 后 `git diff --exit-code` 退出 0。
- **白名单消费层 + 10 类具名拒因**：`allowlist.ts`（`import "server-only"` 首行）只读生成 const 与反射构建的 drizzle 表注册表，导出 `resolvePluginTable / assertIndexAllowed / assertGroupByAllowed / validateInsertPayload`，零硬编码表名/列名。
- 28 个测试（spike 3 + 生成 6 + 消费 19）全绿；7 类形状拒因各有覆盖。

## Task Commits

1. **Task 1: A1 drizzle-zod spike** — `524552a` (test)
2. **Task 2: 扩展 compile 脚本派生 checked-in 白名单 const** — `36c24fd` (test/RED) → `63a54b6` (feat/GREEN)
3. **Task 3: 白名单消费层 allowlist.ts** — `732ad27` (test/RED) → `0957bca` (feat/GREEN)

_TDD Tasks 2/3 各为 test→feat 两提交；无独立 refactor 提交（实现一次到位）。_

## Files Created/Modified

- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — 编译期派生、AUTO-GENERATED/DO NOT EDIT 头、checked-in 的 `pluginDataAccessAllowlist` const
- `src/features/platform-core/plugin-data-access/allowlist.ts` — 白名单消费层：表/列/索引/groupBy/payload 校验 + 具名拒因 helper（server-only）
- `src/features/platform-core/plugin-data-access/allowlist.test.ts` — spike + 生成断言 + 消费层断言（28 tests）
- `scripts/compile-plugin-data-model.ts` — 扩展：聚合 allowlist 结构并确定性 writeFileSync（绝不执行 SQL/DDL）

## Decisions Made

- **A1 = IDEAL 路径**（最关键的 spike 决策，解锁 Tasks 2/3 白名单形状）：drizzle-zod 原生派生 enum，`validateInsertPayload` 直接信任，degraded 兜底契约确认无需落地。
- **`.strict()` 必需**：createInsertSchema 默认剥离未知字段，必须对 `.pick(insertableColumns)` 后的 schema 施 `.strict()` 才能把多余字段判为 `invalid_payload_rejected`。
- **assertIndexAllowed 区分两类拒因**（比 plan 措辞更精确）：未知列→`unknown_column_rejected`；已知列但非任何声明索引最左前缀→`unindexed_column_rejected`。
- **`TENANT_SCOPE_KEY="schoolId"` 为策略常量**（非表/列白名单），payload 含此键即 `cross_school_rejected`（schoolId 仅由 session 推导，SC2/D-11）；白名单仍只来自生成 const，acceptance grep 仅禁 `plugin_owned_quiz` 字面量。
- **3 类治理拒因前置声明**：`lifecycle_not_executable / kill_switch_rejected / non_school_actor_rejected` 在本层声明，由 Plan 02 治理 gate 实际抛出，保持本层"只做形状/白名单判定"的单一职责。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RAW_SQL_PROBE 注释改用 // 行注释规避 zero-runtime-DDL 闸门误判**
- **Found during:** Task 3 (allowlist.ts GREEN 后跑 `pnpm verify:phase67`)
- **Issue:** 新增 allowlist.ts 的 `RAW_SQL_PROBE` 块注释 (`/** ...CREATE/ALTER/DROP... `;`/`--` ... */`) 同时含 DDL 关键字与反引号，触发 `gate-no-runtime-ddl.ts` 的 `interpolatedDdl`（keyword+backtick）启发式；该闸门只剥离 `//` 行注释、不剥离块注释，导致 Phase 67 收尾闸门 FAIL（阻断本 plan 验证）。检测式正则本身（line 63，无反引号）不触发。
- **Fix:** 将该处块注释改为 `//` 行注释（闸门会剥离），语义/功能不变；正则不动。
- **Files modified:** src/features/platform-core/plugin-data-access/allowlist.ts
- **Verification:** `pnpm verify:phase67` → "Phase 67 closeout PASSED"；28 tests 仍全绿；typecheck/lint clean
- **Committed in:** `0957bca`（Task 3 GREEN 提交内）

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 修复为本 plan 引入的自身问题，必要且无 scope creep；功能与判定逻辑零改动。

## Issues Encountered

- 生成文件 `data-access-allowlist.ts` 在 Task 2 验证期处于 untracked 状态，单纯 `git diff` 无法证明确定性——改用「两次 `pnpm plugin:compile` 后 sha256 一致」证明字节级确定性（已在 commit `63a54b6` 后由 `git diff --exit-code` 二次确认零漂移）。

## User Setup Required

None — 无外部服务配置需求。

## Threat Surface Scan

无计划外安全面新增。本 plan 落地的正是 `<threat_model>` 中 T-68-01..04 的缓解面（注入/信息泄露/跨租户/漂移），均按计划实现。

## Known Stubs

None — 所有导出均有真实实现与测试覆盖；3 类治理拒因为「前置声明常量」（非 stub），按 D-08 由 Plan 02 gate 消费。

## Next Phase Readiness

- Plan 02（治理 gate）可直接 import `allowlist.ts` 的 `resolvePluginTable / assertIndexAllowed / assertGroupByAllowed / validateInsertPayload` 与 `PLUGIN_DATA_ACCESS_REASONS`/`PluginDataAccessError`，在其上叠加 lifecycle/kill-switch/non-school-actor 判定与 audit 落账。
- 白名单 const 为唯一真相源，新增受治理表只需改 `quizDataModel` + `pnpm plugin:compile`，消费层零改动。

## Self-Check: PASSED

- 文件存在：
  - FOUND: src/db/schema/generated/plugin-owned/data-access-allowlist.ts
  - FOUND: src/features/platform-core/plugin-data-access/allowlist.ts
  - FOUND: src/features/platform-core/plugin-data-access/allowlist.test.ts
  - FOUND: scripts/compile-plugin-data-model.ts (modified)
- 提交存在：524552a / 36c24fd / 63a54b6 / 732ad27 / 0957bca 均在 git log

---
*Phase: 68-governed-declarative-data-access-verbs*
*Completed: 2026-06-02*
