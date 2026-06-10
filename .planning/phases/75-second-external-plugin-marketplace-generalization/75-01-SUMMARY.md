---
phase: 75-second-external-plugin-marketplace-generalization
plan: 01
subsystem: plugin-data-model
tags: [homework, drizzle, sqlite, zod, allowlist, external-catalog]

requires:
  - phase: 67
    provides: "声明式 dataModel 编译链（compile-plugin-data-model.ts + PluginDataModelSchema）"
  - phase: 68
    provides: "受治理数据访问白名单消费层（allowlist.ts + dispatchPluginDataAccess）"
provides:
  - "homework 三表 data-model 声明（assignments/submissions/grades）"
  - "编译生成的 Drizzle schema + data-access-allowlist"
  - "Drizzle 迁移（0017_phase75_homework_tables.sql）"
  - "external-catalog homework 条目（1.0.0）"
  - "homework DTO schemas（assignment/submission/grade）"
  - "PLUGIN_DATA_ACCESS_ALIASES homework 映射"
affects: [75-02, 75-03, 75-04]

tech-stack:
  added: []
  patterns:
    - "声明式 dataModel → compile-plugin-data-model.ts 确定性编译 → Drizzle schema + allowlist"
    - "append-only 写入路径：uniques 声明触发 attemptNo/isLatest 固定注入"
    - "v4.0 strict DTO pattern：z.strictObject() 拒额外字段"

key-files:
  created:
    - "plugins/homework/data-model.ts — homework 三表声明（单一真相源）"
    - "src/db/schema/generated/plugin-owned/homework.ts — 编译生成 Drizzle schema"
    - "drizzle/0017_phase75_homework_tables.sql — 三表 Drizzle 迁移"
  modified:
    - "scripts/compile-plugin-data-model.ts — MODELS 追加 homeworkDataModel"
    - "src/db/schema/generated/plugin-owned/data-access-allowlist.ts — 自动追加 homework allowlist"
    - "src/db/schema/generated/index.ts — barrel export 追加 homework"
    - "src/lib/plugins/external-catalog.ts — 新增 homework 1.0.0 条目"
    - "src/lib/dto/plugin-data-model.ts — 新增 homework DTO schemas"
    - "src/features/platform-core/plugin-data-access/allowlist.ts — 新增 homework alias 映射"

key-decisions:
  - "data-model 文件放在 repo root plugins/ 而非 src/plugins/（编译器 tsx 裸跑需要，无 server-only 边界）"
  - "homework 三表与 quiz 双表走完全相同的编译链路（PluginDataModelSchema 二次校验 + 固定注入 reserved 列）"
  - "submissions 和 grades 均声明 uniques → append-only 注入 attemptNo/isLatest"
  - "DTO schemas 放在 plugin-data-model.ts 中与 meta-schema 同文件（集中管理 plugin 相关 DTO）"

requirements-completed: [MKT-EXT-03]

duration: 0min
completed: 2026-06-10
---

# Phase 75 Plan 01: homework Data-Model + 编译链 + Catalog 注册 Summary

**homework 三表（assignments/submissions/grades）通过声明式 dataModel → 编译器确定性生成 Drizzle schema + allowlist，已在 external-catalog 注册，DTO 层完备。**

## Performance

- **Duration:** <10 min（增量提交）
- **Started:** 2026-06-10T06:28:00Z（commit a5e5c83）
- **Completed:** 2026-06-10T06:35:01Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- homework data-model 三表声明（plugins/homework/data-model.ts），走与 quiz 相同的 PluginDataModelSchema 二次校验
- compile-plugin-data-model.ts 确定性编译产出 homework.ts Drizzle schema + data-access-allowlist.ts（零硬编码）
- 0017_phase75_homework_tables.sql 三表迁移落地，external-catalog 注册 homework 1.0.0 条目
- homework DTO schemas（HomeworkAssignment/Submission/Grade）全部 z.strictObject()，v4.0 strict pattern
- PLUGIN_DATA_ACCESS_ALIASES 新增 builtin-teaching-step-homework → homework 映射

## Task Commits

1. **Task 1: data-model.ts 三表声明 + 编译链接入** - `a5e5c83` (feat(75): homework data-model + 编译链 + catalog 注册)
2. **Task 2: Drizzle 迁移 + 落库 + external-catalog 注册** - 合并在 `a5e5c83`
3. **Task 3: homework DTO + allowlist DTO 层定义** - `a788407` (feat(75-01): add homework DTO schemas + allowlist alias)

## Files Created/Modified
- `plugins/homework/data-model.ts` - homework 三表声明（63 行，pluginKey="homework"）
- `src/db/schema/generated/plugin-owned/homework.ts` - 编译生成 Drizzle schema（三表完整列 + 索引/唯一约束）
- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` - 自动派生 homework allowlist（三表 + 完整 insertable/indexes/groupBy/uniques）
- `drizzle/0017_phase75_homework_tables.sql` - 三表 CREATE TABLE + 索引/唯一约束迁移
- `scripts/compile-plugin-data-model.ts` - MODELS 数组追加 homeworkDataModel
- `src/db/schema/generated/index.ts` - barrel export 追加 `export * from "./plugin-owned/homework"`
- `src/lib/plugins/external-catalog.ts` - 新增 homework 1.0.0 条目（manifest + dataModel）
- `src/lib/dto/plugin-data-model.ts` - 新增 HomeworkAssignmentDTOSchema / HomeworkSubmissionDTOSchema / HomeworkGradeDTOSchema
- `src/features/platform-core/plugin-data-access/allowlist.ts` - 新增 builtin-teaching-step-homework alias

## Decisions Made
- data-model 源文件放在 repo root `plugins/` 而非 `src/plugins/`：编译器 tsx 裸跑无 server-only 边界，且 `scripts/` 通过相对路径 `../plugins/` 引用
- Task 1+2 合并在单个 commit a5e5c83 中：迁移生成依赖编译产物，且 catalog 注册依赖 dataModel import，原子性更安全

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `pnpm typecheck` 存在预存类型错误（`quiz-data-access.test.ts` 中 15 个 TS7053/TS2322），经 git bisect 确认在 commit a5e5c83 之前已存在，非本 plan 引入。不影响 homework 编译链和 DTO 层。
- `src/lib/dto/plugin-data-access-allowlist.ts` 不存在（plan 假设存在），但 allowlist 由编译器派生为 `src/db/schema/generated/plugin-owned/data-access-allowlist.ts`，且消费层 `src/features/platform-core/plugin-data-access/allowlist.ts` 已正确引用生成产物，无需额外 DTO 文件。

## Next Phase Readiness
- homework data-model + 编译链 + catalog 基础层完备
- 三表已物理落库，allowlist 已生成，alias 已映射
- 就绪 Plan 02：authoring 层 + student runtime + DAL

---
*Phase: 75-second-external-plugin-marketplace-generalization*
*Plan: 01*
*Completed: 2026-06-10*
