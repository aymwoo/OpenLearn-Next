# Phase 67 — Validation Architecture

> 来源：`67-RESEARCH.md` §Validation Architecture（`nyquist_validation: true`）。本文件是 planner / `/gsd-verify-work` 的验证契约单一引用。

## Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest（仓库既有；phase45 经 `runVitest` 直跑 `node_modules/vitest/vitest.mjs`） |
| Config | 仓库既有 vitest 配置（复用，不新建） |
| Quick run | `pnpm exec vitest --run src/lib/dto/plugin-data-model.test.ts` |
| Full gate | `pnpm verify:phase`（别名改指 `verify:phase67` 后：build + 物理断言 + 漂移 + 零-DDL 闸门 + 回归） |

## Requirements → Test Map
| Req | Behavior | Test Type | Command | Status |
|-----|----------|-----------|---------|--------|
| DATA-01 | 合法 quiz 声明通过 + 5 类非法各给特定拒因（raw SQL/DDL、缺 `plugin_owned_` 前缀、FK→core、缺 schoolId scope、json/blob 列） | unit 负样本集 | `vitest --run src/lib/dto/plugin-data-model.test.ts` | ❌ Wave 0 |
| DATA-02 | `plugin:compile` 产生成片段 + drizzle-kit 产 checked-in 迁移；运行时目录无 DDL | static gate | `tsx scripts/gate-no-runtime-ddl.ts` | ❌ Wave 0 |
| DATA-02 | 重新编译无 git diff（声明↔生成同步漂移守卫） | static drift | `pnpm plugin:compile && git diff --exit-code src/db/schema/generated` | ❌ Wave 0 |
| DATA-03 | `plugin_owned_*` 物理表含 schoolId cascade + scope 复合索引 + 去重唯一约束 | integration PRAGMA | `tsx scripts/verify-phase67-plugin-owned-data.ts` | ❌ Wave 0 |
| DATA-04 | 声明↔物理↔迁移三对齐 + 删 school 级联 + `foreign_key_check` 净 | integration | `tsx scripts/verify-phase67-plugin-owned-data.ts` | ❌ Wave 0 |
| DATA-04 | `pluginRegistrations.dataVersion` 列物理存在且默认 1 | integration PRAGMA | 同上 | ❌ Wave 0 |

## Sampling Rate
- **Per task commit:** `vitest --run src/lib/dto/plugin-data-model.test.ts`（负样本快测，秒级）。
- **Per wave merge:** `tsx scripts/verify-phase67-plugin-owned-data.ts`（物理 materialize + PRAGMA 断言 + foreign_key_check）。
- **Phase gate:** `pnpm verify:phase`（须先把别名改指 `verify:phase67`）全绿后才进 `/gsd-verify-work`。

## Negative-Sample Fixture Set (DATA-01 核心)
1 合法声明 + 5 非法声明，每条断言**特定拒因字符串**（不只断言 throw）：
1. 含 raw SQL / DDL 字符串字段 → 拒。
2. 表名缺 `plugin_owned_` 前缀 → 拒。
3. 声明对 core table 的 FK（schoolId→schools 之外）→ 拒。
4. 缺 schoolId scope 字段 → 拒。
5. 含 json/blob 列类型 → 拒。

## Wave 0 Gaps（验证基建，须最先建立）
- [ ] `src/lib/dto/plugin-data-model.test.ts` — 1 合法 + 5 非法负样本（覆盖 DATA-01 五拒因）。
- [ ] `scripts/gate-no-runtime-ddl.ts` — 零-DDL 静态闸门（DATA-02）；白名单 `drizzle/**` + `src/db/schema/generated/**`。
- [ ] `scripts/verify-phase67-plugin-owned-data.ts` — 物理断言 + 漂移 + foreign_key_check（DATA-03/04，克隆 `verify-phase45-plugin-schema.ts` 风格）。
- [ ] `package.json` 新增 `db:generate`（`drizzle-kit generate`）/ `plugin:compile` 脚本 + `verify:phase` 改指 `verify:phase67`。
- [ ] 依赖安装：`pnpm add semver@^7.8.1 drizzle-zod@^0.8.3` + `pnpm add -D @types/semver`。
