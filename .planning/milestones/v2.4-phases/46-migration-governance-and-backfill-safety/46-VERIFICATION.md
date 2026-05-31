---
phase: 46-migration-governance-and-backfill-safety
verified: 2026-05-24T07:11:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 6/6
  gaps_closed:
    - "lesson / step migration now respects owner-aware authoring boundaries"
    - "verify:phase46 now checks exact governed table columns and unique indexes"
    - "runtime DDL prevention now has executable install/reconcile proof"
  gaps_remaining: []
  regressions: []
---

# Phase 46: Migration Governance & Backfill Safety Verification Report

**Phase Goal:** 确立 Drizzle schema 权威、保证 install/reconcile 运行时 DML-only、交付 backfill/verify/cutover 三阶段安全割接、建立命名治理与 `verify:phase46` close gate。  
**Verified:** 2026-05-24T07:11:00Z  
**Status:** passed  
**Re-verification:** Yes — after review closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 插件 install/reconcile 运行时只做 DML，不执行运行时 DDL | ✓ VERIFIED | `scripts/verify-phase46-migration-governance.ts:174-275, 414-421` 在临时 proof DB 上执行真实 `installOrReconcilePluginWithTx(..., actorScope: "system")`，验证 `sqlite_master` 前后完全一致、`plugin_ext_*` / `plugin_owned_business_data` 行数不变，同时 `pluginRegistration` 与 `pluginLifecycleTransition` 正常落库；`src/lib/dal/plugin-migration.test.ts:767-797` 对同一 invariant 做 focused regression。 |
| 2 | 代码中存在 backfill / verify / cutover 三阶段迁移服务，且 cutover 会在事务内再次核对后再擦除 legacy JSON | ✓ VERIFIED | `src/lib/dal/plugin-migration.ts:107-252, 257-370, 376-562` 明确导出三阶段 API；`cutoverPluginJsonToSchema()` 在 `db.transaction(...)` 内重新读取物理扩展表并调用 `physicalPayloadMatches()`，之后才删除 legacy plugin key。 |
| 3 | Backfill 对 lesson/step/resource 三类实体是幂等且并发安全的，同时 lesson/step 不会越过 owner 边界 | ✓ VERIFIED | `src/lib/dal/plugin-migration.ts:145-164, 185-204, 223-241` 三条写路径均为 `insert(...).onConflictDoUpdate(...)` 原子 upsert；`113-178, 257-315, 408-472` 对 lesson / step 查询统一加上 `ownedCourseScope(scope, schoolId)`；`src/lib/dal/plugin-migration.test.ts:344-371, 373-410, 456-501, 729-764` 覆盖并发幂等与同校非 owner 隔离。 |
| 4 | 命名治理能够自动覆盖所有受治理的 plugin 数据表与索引，并精确校验实体契约 | ✓ VERIFIED | `scripts/verify-phase46-migration-governance.ts:87-172` 基于 schema symbol 推导 4 张 governed plugin data tables 的 expected columns / index name / unique columns；`311-355` 用 `PRAGMA table_info/index_list/index_info` 校验真实 SQLite 迁移产物。 |
| 5 | `verify:phase46` 是基于真实 Drizzle 迁移产物的可信 close gate | ✓ VERIFIED | `scripts/verify-phase46-migration-governance.ts:298-406` 使用 `materializeDrizzleMigrations()` 建临时 proof DB；`scripts/lib/sqlite-migration-proof.ts:25-57` 读取 `drizzle/meta/_journal.json` 并逐条执行真实 `drizzle/*.sql` 语句。 |
| 6 | 自动化测试真实证明了割接原子性、回滚语义、租户隔离与 owner-aware 迁移范围 | ✓ VERIFIED | `src/lib/dal/plugin-migration.test.ts:251-807` 全部用真实 SQLite proof DB；`583-673` 证明 cutover mismatch fail fast 与事务内漂移回滚；`373-410, 456-501, 729-764` 证明 lesson / step owner boundary；`676-727` 证明 step/resource cutover 正常保留非插件字段。 |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/db/schema.ts` | Drizzle schema 权威定义 plugin 扩展/自有表与唯一索引 | ✓ VERIFIED | `1779-1871` 定义 4 张 governed plugin data tables 与精确唯一索引。 |
| `drizzle/*.sql` + `drizzle/meta/_journal.json` | 真实迁移产物作为物理真相源 | ✓ VERIFIED | `scripts/lib/sqlite-migration-proof.ts` 直接消费 journal + migration SQL，而非手写影子 schema。 |
| `src/lib/dal/plugin-migration.ts` | 提供 backfill / verify / cutover 实现，并与现有 authoring 边界一致 | ✓ VERIFIED | 三阶段实现齐全；lesson / step 已按 `courses.ownerId` 收紧作用域；cutover 仍具备事务内二次核对。 |
| `src/lib/dal/plugin-migration.test.ts` | 证明原子性、回滚、租户隔离、owner-aware 范围与 DML-only proof | ✓ VERIFIED | 测试已覆盖并发幂等、同校非 owner 隔离、cutover 回滚、真实 install/reconcile 不改 schema。 |
| `scripts/verify-phase46-migration-governance.ts` | 提供可信 close gate | ✓ VERIFIED | gate 会物化真实迁移、精确校验物理契约、执行 runtime DML-only proof、跑 focused vitest，并级联 phase45。 |
| `package.json` | 暴露 `verify:phase46` 入口 | ✓ VERIFIED | `package.json:48` 指向当前验证脚本。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `scripts/verify-phase46-migration-governance.ts` | `verify:phase46` script | ✓ WIRED | `package.json:48` 直接绑定。 |
| `scripts/verify-phase46-migration-governance.ts` | `drizzle/meta/_journal.json` + `drizzle/*.sql` | `materializeDrizzleMigrations()` | ✓ WIRED | `304, 414` 调用 materializer；materializer `25-57` 真正读取并执行迁移。 |
| `scripts/verify-phase46-migration-governance.ts` | `src/db/schema.ts` | `getGovernedPluginTableDefinitions(schemaSource)` | ✓ WIRED | `302-303` 读取 schema，`87-172` 动态解析 governed plugin data contract。 |
| `scripts/verify-phase46-migration-governance.ts` | runtime install/reconcile proof | `assertInstallReconcileUsesDmlOnly(runtimeDatabaseUrl)` | ✓ WIRED | `174-275, 421` 显式执行真实 install/reconcile DML-only proof。 |
| `scripts/verify-phase46-migration-governance.ts` | `src/lib/dal/plugin-migration.test.ts` | `runVitest(["src/lib/dal/plugin-migration.test.ts"])` | ✓ WIRED | `460-463` 显式执行。 |
| `scripts/verify-phase46-migration-governance.ts` | `verify:phase45` | `node ... scripts/verify-phase45-plugin-schema.ts` | ✓ WIRED | `466-472` 级联回归。 |
| legacy JSON | `plugin_ext_*` physical tables | `backfillPluginJsonToSchema()` atomic upsert | ✓ WIRED | `src/lib/dal/plugin-migration.ts:131-249` 把 lesson/step/resource legacy payload 写入物理扩展表。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/lib/dal/plugin-migration.ts` | `payload[pluginKey]` | `publishedLessonVersions.snapshotJson` / `lessonSteps.payloadJson` / `resources.content` | Yes | ✓ FLOWING |
| `src/lib/dal/plugin-migration.ts` | lesson / step query scope | `courses.ownerId` + `assertActiveTeacher()` result | Yes | ✓ FLOWING |
| `scripts/verify-phase46-migration-governance.ts` | governed plugin table contract | `src/db/schema.ts` 动态解析结果 | Yes | ✓ FLOWING |
| `scripts/verify-phase46-migration-governance.ts` | physical proof DB | `drizzle/meta/_journal.json` + `drizzle/*.sql` | Yes | ✓ FLOWING |
| `scripts/verify-phase46-migration-governance.ts` | runtime DML-only proof | 临时 SQLite fixture → real install/reconcile → `sqlite_master` / row-count assert | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 46 migration tests 可运行 | `pnpm exec vitest --run src/lib/dal/plugin-migration.test.ts` | 1 file, 18 tests passed | ✓ PASS |
| Phase 46 close gate 可运行 | `pnpm run verify:phase46` | 返回 0；phase46/45/44 级联全部通过 | ✓ PASS |

### Requirements Coverage

> 当前根级 `.planning/REQUIREMENTS.md` 不存在；Phase 46 的 requirement contract 以 `SPEC.md` 中列出的 GOV-01~04 为准。

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| GOV-01 | `SPEC.md` | 通过主仓库 Drizzle migration 流程演进插件 schema，而不是运行时动态建表 | ✓ SATISFIED | phase46 verifier 直接 materialize 真实 migration journal + SQL；runtime install/reconcile proof 证明 schema 无 drift。 |
| GOV-02 | `SPEC.md` | 强制插件表、索引和唯一约束遵循统一前缀命名规则 | ✓ SATISFIED | governed tables 从 schema 动态发现，全部 explicit unique indexes 都要求固定前缀、固定索引名与固定列顺序。 |
| GOV-03 | `SPEC.md` | 提供可审查的 JSON → 结构化插件数据 backfill/cutover 流程 | ✓ SATISFIED | 三阶段 DAL + 真实 SQLite 测试证明 backfill、verify、cutover、rollback，并补齐 lesson / step owner-aware 迁移边界。 |
| GOV-04 | `SPEC.md` | 插件启用、停用或安装流程不会在运行时执行未审查 DDL 或任意 SQL migration | ✓ SATISFIED | runtime proof DB 上真实执行 install/reconcile 后，`sqlite_master` 不变、governed plugin data rows 不变，但 registration / lifecycle 审计行会正常出现。 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | 未发现阻断本阶段目标的 live anti-pattern | — | — |

### Gaps Summary

这次 re-verification 关闭了当前 Phase 46 review 中最后一轮问题：

1. lesson / step migration 已从“同校全部扫描”收紧到 owner-aware authoring 边界；
2. `verify:phase46` 已从宽松存在性检查升级为精确物理契约检查；
3. runtime DDL 防护已从主要依赖源码字符串扫描升级为真实 install/reconcile 执行 proof。

结论：**当前 live codebase 与 focused verification 已一致收敛，Phase 46 保持 `passed`，且 review 也已进入 clean 状态。**

---

_Verified: 2026-05-24T07:11:00Z_  
_Verifier: the agent (Phase 46 re-verification)_
