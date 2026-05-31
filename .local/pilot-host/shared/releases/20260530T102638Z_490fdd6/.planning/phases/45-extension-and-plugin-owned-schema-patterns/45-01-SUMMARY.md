---
phase: 45-extension-and-plugin-owned-schema-patterns
plan: 01
subsystem: database
tags: [sqlite, drizzle, plugin, dal, vitest]
requires:
  - phase: 44-plugin-identity-and-namespace-contract
    provides: plugin identity, pluginKey/dbNamespace, plugin registration base schema
provides:
  - SQLite plugin extension tables for lesson, lesson step, and resource entities
  - Plugin-owned business data table with school/plugin scoping
  - Teacher-scoped DAL seam with multi-tenant school-boundary assertions
  - Phase 45 close gate verification script and vitest regression coverage
affects: [phase46, phase47, plugin uninstall governance, plugin data migrations]
tech-stack:
  added: []
  patterns:
    - dedicated plugin extension tables instead of core-table field pollution
    - school/plugin/entity scoped uniqueness with cascade delete at the physical layer
    - DAL-only plugin data access with teacher-scope and cross-school ownership assertions
key-files:
  created:
    - src/lib/dal/plugin-data.ts
    - src/lib/dal/plugin-data.test.ts
    - scripts/verify-phase45-plugin-schema.ts
  modified:
    - src/db/schema.ts
key-decisions:
  - "Use dedicated physical extension tables for lesson, lesson step, and resource plugin data."
  - "Require teacher scope plus entity-school ownership checks before every plugin data read or write."
  - "Treat verify:phase45 plus DAL vitest coverage as the authoritative close gate for this schema pattern."
patterns-established:
  - "Plugin extension pattern: schoolId + pluginId + entityId uniqueness backed by cascade foreign keys."
  - "Plugin-owned pattern: plugin-owned rows stay downward-cascading to plugin registration without upward core-table damage."
requirements-completed: []
duration: 2 min
completed: 2026-05-24
---

# Phase 45 Plan 01: Extension & Plugin-Owned Schema Patterns Summary

**SQLite 插件扩展表、plugin-owned business data 物理表，以及带教师权限与跨校隔离断言的统一 DAL seam 已完成并通过 close gate 回归。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-24T01:52:33Z
- **Completed:** 2026-05-24T01:54:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- 确认 `plugin_ext_lesson`、`plugin_ext_lesson_step`、`plugin_ext_resource`、`plugin_owned_business_data` 四张物理表已落地，并具备 cascade FK 与联合索引。
- 确认 `upsert/getPluginExtension` 与 `upsert/getPluginOwnedBusinessData` 四个 DAL 接口已实现教师权限、插件归属和实体 school 归属校验。
- 运行 `drizzle-kit generate`、`vitest`、`verify:phase45` 与 Phase 44 级联回归，结果全部通过。

## Task Commits

本次执行发现生产代码已在历史提交中落地，因此本轮主要完成验证与 close-out：

1. **历史实现：Schema + DAL + tests + verification** - `04dc4ad` (historical implementation)
2. **Plan metadata:** 本次 docs close-out 提交见当前执行结果

## Files Created/Modified

- `src/db/schema.ts` - 定义插件扩展表与 plugin-owned business data 物理结构。
- `src/lib/dal/plugin-data.ts` - 提供统一 DAL 接口、权限断言、多租户校验与缓存失效。
- `src/lib/dal/plugin-data.test.ts` - 覆盖 schema 静态校验、DAL 幂等、权限边界与隔离测试。
- `scripts/verify-phase45-plugin-schema.ts` - 提供 Phase 45 close gate 验证脚本。
- `.planning/phases/45-extension-and-plugin-owned-schema-patterns/45-01-SUMMARY.md` - 记录本次 close-out 结果。

## GitNexus impact analysis

- `upsertPluginExtension` → **LOW**，0 direct callers，0 affected processes。
- `getPluginExtension` → **LOW**，0 direct callers，0 affected processes。
- `upsertPluginOwnedBusinessData` → **LOW**，0 direct callers，0 affected processes。
- `getPluginOwnedBusinessData` → **LOW**，0 direct callers，0 affected processes。
- `assertTeacherManagerScope` → **LOW**，4 个直接内部调用者，仅限 `src/lib/dal/plugin-data.ts`。
- `assertEntityBelongsToSchool` → **LOW**，2 个直接内部调用者，仅限 `src/lib/dal/plugin-data.ts`。

## Decisions Made

- 沿用仓库中已实现的物理表拆分方案，不重复制造第二套 schema/migration。
- 本次不提交 `drizzle-kit generate` 生成的临时迁移文件，因为其内容对应的是其他历史 schema 漏迁移，不属于 45-01 的最小正确 close-out。
- 本次仅补齐 Summary/close-out，避免对已验证通过的历史实现做无意义重复修改。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 绕过 `pnpm exec` 的环境自修复安装失败**
- **Found during:** Verification
- **Issue:** `pnpm exec vitest` / `pnpm exec drizzle-kit generate` 触发依赖自修复，`sharp` postinstall 因缺少 `node-gyp` 失败。
- **Fix:** 改为直接调用本地二进制与模块入口：`node node_modules/vitest/vitest.mjs`、`./node_modules/.bin/drizzle-kit`、`node --import tsx scripts/verify-phase45-plugin-schema.ts`。
- **Files modified:** None
- **Verification:** 相关命令均成功执行，`vitest` 与 `verify:phase45` 绿牌通过。
- **Committed in:** n/a（执行期环境绕过，无代码改动）

---

**Total deviations:** 1 auto-handled (1 blocking)
**Impact on plan:** 无代码 scope 变化，仅为保证验证可执行的环境级绕过。

## Issues Encountered

- 发现 Phase 45 的生产代码已在历史提交 `04dc4ad` 中落地，但没有对应的 `45-01-SUMMARY.md`。本次执行按 close-out rescue 处理，避免重复改动已通过验证的业务代码。

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 45 的物理 schema pattern、DAL seam 与验证脚本已齐备，可直接作为后续 plugin migration / lifecycle / uninstall 治理的基线。
- 当前无功能 blocker；若后续要补历史 migration，应独立规划，避免把 unrelated schema drift 混入本 plan。

## Self-Check: PASSED

- FOUND: `src/db/schema.ts`
- FOUND: `src/lib/dal/plugin-data.ts`
- FOUND: `src/lib/dal/plugin-data.test.ts`
- FOUND: `scripts/verify-phase45-plugin-schema.ts`
- FOUND: historical implementation commit `04dc4ad`

---
*Phase: 45-extension-and-plugin-owned-schema-patterns*
*Completed: 2026-05-24*
