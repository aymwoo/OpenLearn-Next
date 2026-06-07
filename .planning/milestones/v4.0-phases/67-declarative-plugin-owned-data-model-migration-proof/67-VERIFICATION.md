---
phase: 67-declarative-plugin-owned-data-model-migration-proof
verified: 2026-06-02T17:30:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
---

# Phase 67：声明式插件自有数据模型 + 迁移证明 验证报告

**Phase Goal:** 插件能在源码内以声明式 `dataModel`（表/字段/类型/约束）声明结构化自有表，声明经 Zod meta-schema 校验、编译为独立生成片段 + checked-in Drizzle 迁移并经 `db:migrate` 应用；运行时绝不执行 DDL；`verify:phase` migration-proof 闸门扩展覆盖新增插件自有表。

**Verified:** 2026-06-02T17:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

本验证以「目标倒推」方式进行：不信任 SUMMARY.md 的叙述，而是逐项读取实际源码、运行实际闸门。三条 ROADMAP Success Criteria 全部在代码与运行结果中被证实。

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | 合法 `dataModel` 声明能通过 Zod meta-schema | ✓ VERIFIED | `src/lib/dto/plugin-data-model.ts:136` `PluginDataModelSchema = z.strictObject(...)`；test `plugin-data-model.test.ts:44` happy-path parse 不抛错；`pnpm exec vitest --run` → **9/9 passed** |
| 2 | 夹带原始 SQL/DDL 在边界被拒（RAW_SQL_FORBIDDEN） | ✓ VERIFIED | `plugin-data-model.ts:105` `DDL_KEYWORDS.test(JSON.stringify(table))`；test #1 注入 `default:"DROP TABLE users"` 断言 `RAW_SQL_FORBIDDEN` |
| 3 | 缺命名空间前缀被拒（MISSING_OWNED_PREFIX） | ✓ VERIFIED | `plugin-data-model.ts:86` `startsWith(OWNED_TABLE_PREFIX)`；test #2 断言命中 |
| 4 | 向 core 表加 FK 被拒（strict unrecognized_keys） | ✓ VERIFIED | 顶层与每层 `z.strictObject`；test #3 注入 `foreignKeys` 键断言 `issue.code === "unrecognized_keys"` |
| 5 | 缺 schoolId scope 被拒（MISSING_SCHOOL_SCOPE） | ✓ VERIFIED | `plugin-data-model.ts:95-102` 强制 `schoolId` 且 notNull；test #4 断言命中 |
| 6 | json/blob 列类型被拒（INVALID_COLUMN_TYPE） | ✓ VERIFIED | `plugin-data-model.ts:23` `COLUMN_TYPES` 白名单 5 标量；`:55` `z.enum(...,{error:()=>"INVALID_COLUMN_TYPE"})`；test #5 注入 `type:"json"` 断言 path 末端为 `type` |
| 7 | 编译器把声明转成**独立生成片段文件**，不注入手写 schema.ts | ✓ VERIFIED | `compile-plugin-data-model.ts:194-201` `parse` 后 `writeFileSync` 至 `src/db/schema/generated/plugin-owned/quiz.ts` + barrel；手写 `schema.ts` 仅 1 行 `:1908 export * from "./schema/generated"` + 1 列 `:1259 dataVersion` |
| 8 | checked-in 迁移存在且 `db:migrate` 应用；迁移外无运行时 DDL | ✓ VERIFIED | `drizzle/0005_lean_sage.sql` 含两表 + D-12 索引/唯一 + `ALTER pluginRegistration ADD dataVersion`；`gate-no-runtime-ddl.ts` 扫 472 文件 **PASS**；verifier 把迁移实体化进临时 SQLite 成功 |
| 9 | migration-proof 闸门覆盖新增插件自有表，`verify:phase` 通过 | ✓ VERIFIED | `pnpm verify:phase`（→`verify:phase67`）**全绿**：物理 PRAGMA 不变量 + schoolId 级联归零 + `foreign_key_check` 净 + 漂移守卫 + 零-DDL 闸门 |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/dto/plugin-data-model.ts` | 纯 DTO meta-schema + 拒因常量 + 类型 | ✓ VERIFIED | 143 行，纯 Zod（无 server-only），`z.strictObject` 全层；被 test 与 compiler 双向 import（WIRED） |
| `src/lib/dto/plugin-data-model.test.ts` | 1 合法 + 5 非法各特定拒因 | ✓ VERIFIED | 103 行；9 测试全绿；import 合法 quiz 样板作 happy-path |
| `plugins/quiz-sample/data-model.ts` | 合法 quiz 声明（question+response） | ✓ VERIFIED | 两表均 `plugin_owned_` 前缀 + schoolId scope + enum values + D-12 复合索引/唯一；被 test 与 compiler 消费（WIRED） |
| `scripts/compile-plugin-data-model.ts` | 声明→确定性 Drizzle 片段（compile, don't execute） | ✓ VERIFIED | `:194 PluginDataModelSchema.parse` 二次校验；`:109-111` 固定注入 id/schoolId/pluginId cascade FK；无 `client.execute`/`.run(sql`/`createClient` |
| `src/db/schema/generated/plugin-owned/quiz.ts` | 两 `plugin_owned_quiz_*` 表 + cascade FK + D-12 | ✓ VERIFIED | 42 行 AUTO-GENERATED；schoolId/pluginId `onDelete:"cascade"`；responses 复合 index + uniqueIndex 列序正确 |
| `src/db/schema/generated/index.ts` | barrel re-export | ✓ VERIFIED | `export * from "./plugin-owned/quiz"`；被 schema.ts re-export（WIRED → drizzle-kit 可见） |
| `src/db/schema.ts` | dataVersion 列 + 生成 barrel re-export | ✓ VERIFIED | `:1259 dataVersion integer notNull default(1)`；`:1908 export * from "./schema/generated"` |
| `drizzle/0005_lean_sage.sql` | checked-in 迁移 | ✓ VERIFIED | CREATE 两表 + 索引/唯一 + ADD dataVersion；DDL 仅居 `drizzle/`（白名单内） |
| `scripts/gate-no-runtime-ddl.ts` | 零-运行时-DDL 静态闸门 | ✓ VERIFIED | 146 行；白名单 `drizzle/**`+`generated/**`；执行通道感知 + 插值守卫；运行 PASS（472 文件） |
| `scripts/verify-phase67-plugin-owned-data.ts` | 物理 PRAGMA 证明 + 级联 + 漂移 + 闸门编排 | ✓ VERIFIED | 230 行；复用 `sqlite-migration-proof`；`foreign_key_check`、`index_info` 列序、级联删校均断言；运行 PASS |
| `package.json` | verify:phase67 + verify:phase 重指 | ✓ VERIFIED | `verify:phase = pnpm verify:phase67`；`verify:phase67` 存在；`db:generate`/`plugin:compile` 就位；semver/drizzle-zod/@types/semver 已装 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `plugin-data-model.test.ts` | `plugins/quiz-sample/data-model.ts` | import 合法样板做 happy-path | ✓ WIRED | `:10 import { quizDataModel }`，parse 断言 |
| `compile-plugin-data-model.ts` | `plugins/quiz-sample/data-model.ts` + schema | `parse` 二次校验后 emit | ✓ WIRED | `:21,:194` import + parse + writeFileSync |
| `src/db/schema.ts` | `src/db/schema/generated` | barrel re-export 让 drizzle-kit 可见 | ✓ WIRED | `:1908 export *` → 0005 迁移成功 diff 出两表 |
| `drizzle/0005_lean_sage.sql` | `generated/plugin-owned/quiz.ts` | drizzle-kit generate 把生成表 diff 进迁移 | ✓ WIRED | 迁移含 `plugin_owned_quiz_*` 与声明一致 |
| `package.json verify:phase` | `verify:phase67` | 别名重指封口 phase gate | ✓ WIRED | `verify:phase === "pnpm verify:phase67"` |
| `gate-no-runtime-ddl.ts` | `drizzle/` + `generated/` | 白名单排除唯二合法 DDL 归宿 | ✓ WIRED | `WHITELIST_PREFIXES` 两项；PASS |

### Data-Flow Trace (Level 4)

声明 → 编译器 `parse` → 确定性生成片段 → drizzle-kit 迁移 → 物理 SQLite。verifier 通过 `materializeDrizzleMigrations` 把 checked-in 迁移实体化进**全新临时 SQLite**，seed → PRAGMA 断言 → `DELETE FROM school` 级联归零 → `foreign_key_check` 净。这证明数据沿声明↔生成↔迁移↔物理表四向真实贯通，非源码假设。

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| meta-schema 1 合法 + 5 非法拒因 | `pnpm exec vitest --run src/lib/dto/plugin-data-model.test.ts` | 9/9 passed | ✓ PASS |
| 编译器幂等（零漂移） | `pnpm plugin:compile && git diff --exit-code src/db/schema/generated` | clean（verifier [3/4]） | ✓ PASS |
| 零-运行时-DDL 静态闸门 | `tsx scripts/gate-no-runtime-ddl.ts` | PASS（472 files） | ✓ PASS |
| 物理迁移证明（fresh DB materialize） | `pnpm verify:phase` | 🎉 Phase 67 closeout PASSED | ✓ PASS |
| 类型检查 | `pnpm typecheck` | exit 0，无错误 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| DATA-01 | 67-01 | dataModel 由 Zod meta-schema 校验，非法边界拒、禁裸 SQL/DDL | ✓ SATISFIED | Truths 1-6；9/9 测试绿 |
| DATA-02 | 67-02, 67-03 | 编译为受治理 Drizzle 定义 + checked-in 迁移（独立片段不注入手写 schema）；运行时零 DDL | ✓ SATISFIED | Truths 7-8；生成片段 + 0005 迁移 + 零-DDL 闸门 PASS |
| DATA-03 | 67-02, 67-03 | 自有表命名空间隔离 + 每行可归属 school/session 防跨域泄漏 | ✓ SATISFIED | `plugin_owned_` 前缀 + schoolId/pluginId cascade FK；verifier 级联归零证明 |
| DATA-04 | 67-03 | `verify:phase` migration-proof 闸门覆盖新表，证明声明↔物理↔迁移一致、无漂移、无运行时 DDL | ✓ SATISFIED | Truth 9；`pnpm verify:phase` 全绿（PRAGMA + foreign_key_check + 漂移守卫 + 闸门编排） |

无孤儿需求：REQUIREMENTS.md 将 DATA-01..04 全部映射至 Phase 67，且每个 ID 均在某 plan 的 `requirements` frontmatter 中被声明。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | 无 stub / TODO / 空实现 / 假数据 | ℹ️ Info | 生成片段为 drizzle-kit DSL（非裸 DDL）；编译器仅 writeFileSync；无运行时 DDL 执行通道 |

### Human Verification Required

无。所有 Success Criteria 均可程序化验证（DTO 校验、代码生成、迁移实体化、PRAGMA 物理断言），无视觉/实时/外部服务依赖项需人工确认。

### 已知非阻断信号（Info — 已被用户接受）

- **schema-drift 闸门将 `src/db/schema.ts` 报为 drift**：该闸门期望 `drizzle-kit push`，而本项目按 AGENTS.md 为 **migration-first（禁用 push）**。这是已被用户显式接受的已知误报。本验证未据此判负——`scripts/verify-phase67-plugin-owned-data.ts` 已把 `0005_lean_sage.sql` 实体化进**全新临时 SQLite** 并 0 错误应用，证明迁移在 fresh DB 上干净生效。
- **`deferred-items.md`**：`scripts/prepare-dev-db.ts` 的 `detectExistingSchemaTag()` 对 legacy `local.db` 桥接检测不全（仅识别到 `0002_daffy_xavin`）。属先存缺陷、与 Phase 67 无关；fresh-db 验证为权威且不受影响。不构成本 phase gap。

### Gaps Summary

无 gap。Phase 67 目标已在实际代码与运行结果中完整达成：

1. 声明式 `dataModel` 经纯 DTO Zod meta-schema 在边界校验，5 类非法（裸 SQL/DDL、缺前缀、向 core 加 FK、缺 schoolId、json/blob）各以特定拒因被拒，合法 quiz 样板通过。
2. 编译器 `parse` 二次校验后确定性生成**独立片段**（`src/db/schema/generated/`），固定注入 id/schoolId/pluginId cascade FK，手写 `schema.ts` 仅一行 re-export + 一列 dataVersion；drizzle-kit 产出 checked-in 迁移 `0005_lean_sage.sql`。
3. 零-运行时-DDL 静态闸门证明白名单外无 DDL；物理 verifier 把迁移实体化进真实 SQLite，断言 D-12 不变量、schoolId 级联、`foreign_key_check` 净、dataVersion=1、零漂移；`verify:phase` 重指 67 并全绿。

辅证：`pnpm typecheck` exit 0；meta-schema 9/9 测试绿；编译器零 DDL 执行通道。

---

_Verified: 2026-06-02T17:30:00Z_
_Verifier: gsd-verifier（目标倒推 / FORCE 对抗立场）_
