---
phase: 45-extension-and-plugin-owned-schema-patterns
verified: 2026-05-24T02:28:59Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Phase 45 的 close gate 与回归测试真实证明了物理 cascade delete 行为，而不只是静态检查表结构。"
  gaps_remaining: []
  regressions: []
---

# Phase 45: Extension & Plugin-Owned Schema Patterns Verification Report

**Phase Goal:** 建立插件 extension / plugin-owned 物理 schema pattern、带教师权限与跨校隔离的 DAL seam，并提供可重复执行的 close gate 验证。
**Verified:** 2026-05-24T02:28:59Z
**Status:** passed
**Re-verification:** Yes — after gap closure

## Goal Achievement

本次按 re-verification 执行，先回看旧 `45-VERIFICATION.md` 的唯一 blocker，
再对已通过项做回归检查。结论：之前失败的“真实 SQLite cascade
delete proof”现已被可执行测试与 close gate 双重证明覆盖，且未发现回归。

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 插件 extension schema pattern 已真实落地到代码与 SQLite：`lesson` / `lessonStep` / `resource` 三张扩展表具备 school/plugin/entity 约束。 | ✓ VERIFIED | `src/db/schema.ts:1779-1849` 仍定义 `plugin_ext_lesson`、`plugin_ext_lesson_step`、`plugin_ext_resource`；`scripts/verify-phase45-plugin-schema.ts:301-333` 运行时再次验证 `local.db` 中表与索引存在。 |
| 2 | plugin-owned schema pattern 已落地到独立物理表，并保持 school/plugin 作用域。 | ✓ VERIFIED | `src/db/schema.ts:1851-1870` 仍定义 `plugin_owned_business_data`；`scripts/verify-phase45-plugin-schema.ts:294-333` 对该表列和索引做运行时校验。 |
| 3 | DAL seam 已存在，并在读写时执行教师权限、插件 school 归属、实体 school 归属校验。 | ✓ VERIFIED | `src/lib/dal/plugin-data.ts:37-142` 保留 `assertTeacherManagerScope`、`assertEntityBelongsToSchool`、`assertPluginBelongsToSchool*`；公开 DAL 接口仍在 `172-585`。 |
| 4 | `verify:phase45` close gate 已注册、已连线、可重复运行。 | ✓ VERIFIED | `package.json:47` 仍将 `verify:phase45` 指向 `scripts/verify-phase45-plugin-schema.ts`；本次实际执行脚本通过，且脚本在 `70-85` 保留 `runVitest()` 连线。 |
| 5 | Phase 45 的 close gate 与回归测试真实证明了物理 cascade delete 行为，而不只是静态检查表结构。 | ✓ VERIFIED | `src/lib/dal/plugin-data.test.ts:209-269` 新增真实 SQLite delete/assert 回归，覆盖删除 `pluginRegistration`、`lesson`、`lessonStep`、`resource`；`scripts/verify-phase45-plugin-schema.ts:215-255` 新增行为优先 proof，并在 `247-250` 执行 `PRAGMA foreign_key_check`；两条命令本次均实际跑通。 |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/db/schema.ts` | 四张插件物理表、cascade FK、唯一/查询索引 | ✓ VERIFIED | Phase 45 四张表定义仍完整，未回退。 |
| `src/lib/dal/plugin-data.ts` | 统一 DAL seam 与隔离断言 | ✓ VERIFIED | 教师权限、跨校隔离、manifest 权限与审计写入仍在。 |
| `src/lib/dal/plugin-data.test.ts` | 真实 SQLite cascade 回归 + 原有 mocked DAL guardrail 覆盖 | ✓ VERIFIED | 文件 635 行；`209-269` 为真实 SQLite proof，`272-635` 保留 mocked DAL 安全边界测试。 |
| `scripts/verify-phase45-plugin-schema.ts` | behavior-first close gate with real delete/assert proof | ✓ VERIFIED | 文件 441 行；`215-255` 为临时 SQLite 行为证明，`257-435` 串联 metadata 检查、focused Vitest 与 Phase 44 regression。 |
| `package.json` | `verify:phase45` npm entry | ✓ VERIFIED | 脚本入口仍正确。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `scripts/verify-phase45-plugin-schema.ts` | `verify:phase45` script | ✓ WIRED | `package.json:47` 直接注册。 |
| `scripts/verify-phase45-plugin-schema.ts` | `src/lib/dal/plugin-data.test.ts` | `runVitest(["src/lib/dal/plugin-data.test.ts"], ...)` | ✓ WIRED | `scripts/verify-phase45-plugin-schema.ts:415-418`。 |
| `scripts/verify-phase45-plugin-schema.ts` | temporary SQLite proof database | `createClient` + delete/assert + `PRAGMA foreign_key_check` | ✓ WIRED | `scripts/verify-phase45-plugin-schema.ts:215-255`。 |
| `src/lib/dal/plugin-data.test.ts` | 真实 SQLite cascade 行为 | `createClient` + delete/assert + FK check | ✓ WIRED | `src/lib/dal/plugin-data.test.ts:214-269`。 |
| `src/lib/dal/plugin-data.ts` | `src/db/schema.ts` | 直接导入插件表与核心实体表 | ✓ WIRED | `src/lib/dal/plugin-data.ts:6-19`。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/lib/dal/plugin-data.test.ts` | 行数断言 / 剩余 ID | 临时 SQLite fixture → `DELETE` → `SELECT COUNT(*)` / `SELECT id` | Yes | ✓ FLOWING |
| `scripts/verify-phase45-plugin-schema.ts` | close gate cascade proof | 临时 SQLite fixture → `DELETE` → `assertRowCount()` → `PRAGMA foreign_key_check` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Focused DAL regression proves real cascade behavior | `node ./node_modules/vitest/vitest.mjs --run src/lib/dal/plugin-data.test.ts` | 1 file / 20 tests passed | ✓ PASS |
| `verify:phase45` fails closed unless behavior proof + focused Vitest + Phase 44 regression all pass | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase45-plugin-schema.ts` | behavior proof、metadata check、focused Vitest、Phase 44 regression 全部通过 | ✓ PASS |

### Requirements Coverage

仓库当前无活跃 `REQUIREMENTS.md` 映射；以下仍按 `SPEC.md` 的 Phase 45
规约逐项核验。

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| EXT-01 | `SPEC.md` | lesson extension 物理表 | ✓ SATISFIED | `plugin_ext_lesson` 仍在 `src/db/schema.ts:1779-1801`。 |
| EXT-02 | `SPEC.md` | lessonStep extension 物理表 | ✓ SATISFIED | `plugin_ext_lesson_step` 仍在 `src/db/schema.ts:1803-1825`。 |
| EXT-03 | `SPEC.md` | resource extension 物理表 | ✓ SATISFIED | `plugin_ext_resource` 仍在 `src/db/schema.ts:1827-1849`。 |
| EXT-04 | `45-02-PLAN.md`, `SPEC.md` | school/plugin/entity + cascade + uniqueness | ✓ SATISFIED | schema 定义存在；测试与 verifier 都执行真实 delete cascade proof。 |
| OWN-01 | `SPEC.md` | 独立 plugin-owned 业务表 | ✓ SATISFIED | `plugin_owned_business_data` 仍在 `src/db/schema.ts:1851-1870`。 |
| OWN-02 | `SPEC.md` | plugin-owned 表具备 school/plugin 物理隔离 | ✓ SATISFIED | 表结构仍包含 `schoolId`、`pluginId`。 |
| OWN-03 | `45-02-PLAN.md`, `SPEC.md` | plugin-owned 数据不会被核心实体删除误伤，只在 plugin delete 时清理 | ✓ SATISFIED | `src/lib/dal/plugin-data.test.ts:241-268` 与 `scripts/verify-phase45-plugin-schema.ts:228-245` 都断言 core entity delete 后 owned 数据保留，plugin delete 后清零。 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/lib/dal/plugin-data.test.ts` | 209-269 | 旧的 metadata-only proof 已被真实 SQLite proof 取代 | ℹ️ Info | 先前 blocker 已关闭。 |
| `scripts/verify-phase45-plugin-schema.ts` | 215-255 | close gate 现在以 behavior-first proof 起步，而非仅靠表结构扫描 | ℹ️ Info | 先前“proof hollow”风险已消除。 |

### Human Verification Required

无。该 phase 的目标是 schema、DAL 与 close gate proof，已可通过代码与命令
直接验证。

### Gaps Summary

之前唯一 blocker 已关闭：Phase 45 现在不再只靠 schema 文本、`sqlite_master`
或索引存在性来“推断” cascade，而是通过临时 SQLite 数据库执行真实的
insert/delete/assert 流程，并在 verifier 中追加 `PRAGMA foreign_key_check`
作为硬门槛。

本次 re-verification 未发现剩余 gap，也未发现旧能力回退，因此结论为
`passed`。

---

_Verified: 2026-05-24T02:28:59Z_
_Verifier: the agent (gsd-verifier)_
