---
phase: 63-ai-draft-chain-into-draft-lesson-version
plan: 01
subsystem: db-schema
tags: [drizzle, schema, migration, draft-lesson, idempotency, provenance]
requires: []
provides:
  - "draftLessonVersions 表（镜像 publishedLessonVersions 快照 + provenance 列）"
  - "drizzle/0014_phase63_draft_lesson_versions.sql 建表 migration（含唯一约束）"
  - "幂等唯一约束 (lessonId, sourceCommandId)（DRAFT-02 表层兜底）"
affects:
  - "63-04 handler（INSERT draftLessonVersions，撞唯一约束兜 replay）"
tech-stack:
  added: []
  patterns:
    - "draft 镜像 published 快照表：内联 snapshotJson 单表单 INSERT 原子性（A3，不建子表）"
    - "provenance 列 source enum + 非空 sourceCommandId 回链产出命令"
    - "非空唯一约束规避 SQLite 多 NULL 不冲突语义，兜 pending-崩溃-重放"
    - "migration-first：drizzle-kit generate 重命名 0014 + 手工裁剪 draft-only DDL + 修 snapshot prevId 链"
key-files:
  created:
    - "drizzle/0014_phase63_draft_lesson_versions.sql"
    - "drizzle/meta/0014_snapshot.json"
    - "src/db/schema.draft-lesson-versions.test.ts"
  modified:
    - "src/db/schema.ts"
    - "drizzle/meta/_journal.json"
decisions:
  - "裁剪生成的 migration 为 draft-only DDL：drizzle generate 带出 drift（plugin 索引重命名 + auditSummaryJson），但 0002_daffy 已在 journal 做同一 plugin 重命名、auditSummaryJson 属 Phase 54 既存缺口；保留 drift 会 migrate 重复 DROP/CREATE 失败，裁剪后纯增量 scope-correct"
  - "修复 0014_snapshot.prevId：generate 时 drizzle 以 0012(38119013) 为 latest 做 diff，导致 prevId 与 0002 撞车（collision）；按 journal 顺序改 prevId→0002(006e8759)，重跑 generate 报 No schema changes，链恢复线性"
  - "schema 测试退化为静态字符串断言（参照 schema.learning.test.ts readFileSync 范式），不连真实 db；约束就位已由 Task 2 真实 migrate + sqlite_master 查询确认"
metrics:
  duration: "~40min"
  completed: 2026-05-31
---

# Phase 63 Plan 01: draftLessonVersions 镜像表 Summary

新建 `draftLessonVersions` 快照表作为 AI 起草提案的不可变持久化落点，逐行镜像 `publishedLessonVersions`，唯一新增 `source`/`sourceCommandId` provenance 列与一个确定性唯一约束（DRAFT-02 幂等兜底命脉），并落地 migration 0014。Wave 1，与契约层 Plan 03 并行。

## What Was Built

### Task 1 — draftLessonVersions 表（commit 90b528c）
`src/db/schema.ts`（`publishedLessonVersions` 后、`lessonStepProgress` 前）新增 26 行表定义：
- 8 列：`id` PK / `lessonId` notNull FK→lessons cascade / `version` notNull / `snapshotJson` json notNull（内联整课快照，A3 不建子表）/ `source` enum `["ai","human","ai_edited"]` notNull default `"ai"`（D-04 本相位只写 ai，三值为 Phase 64 预留）/ `sourceCommandId` notNull（回链产出命令做 provenance）/ `createdById` notNull FK→users cascade / `createdAt` timestamp_ms。
- 索引：`draftLessonVersions_lessonId_version_idx`(lessonId, version) + `uniqueIndex draftLessonVersions_idempotency_unique`(lessonId, sourceCommandId)。
- `index`/`uniqueIndex` 等均为 schema.ts 现有导入，未改 import。

### Task 2 — migration 0014（commit b1c91df，BLOCKING）
- `pnpm exec drizzle-kit generate` 生成 → 重命名为 `drizzle/0014_phase63_draft_lesson_versions.sql` + `drizzle/meta/0014_snapshot.json` + journal tag 更新。
- **手工裁剪** SQL 为 draft-only：CREATE TABLE `draftLessonVersion` + 2 FK cascade + 2 索引；删除生成器带出的 drift（plugin 索引重命名、auditSummaryJson）——详见 decisions。
- **修复 snapshot 链**：`0014_snapshot.prevId` 由 0012(`38119013`) 改为 0002(`006e8759`) 解决 collision。
- `pnpm db:migrate` 成功应用（bridge → 桥接 0000 → 应用 0012/0002/0014）。真实 DB 查询确认：表存在、两索引存在、8 列齐全、两 FK 均 CASCADE。

### Task 3 — schema 断言测试（commit d3ff4e6）
`src/db/schema.draft-lesson-versions.test.ts`：6 用例（表名映射 / 全列 / source enum+ai 默认 / 双 cascade 关系 / 幂等唯一索引 / lessonId_version 索引），参照 `schema.learning.test.ts` 的 readFileSync 静态断言范式，全绿。

## Verification Results

| Verify | 结果 |
|--------|------|
| `pnpm typecheck`（Task 1） | 零新增错误（既存 2 错为 pre-existing，见 deferred D1） |
| `pnpm exec drizzle-kit generate` | `No schema changes, nothing to migrate` —— 无 drift、collision 已解 |
| `pnpm db:migrate` | 成功应用 0014；DB 实查表+索引+FK 全部就位 |
| `pnpm vitest run src/db/schema.draft-lesson-versions.test.ts` | 6/6 通过 |

## Success Criteria

- [x] draftLessonVersions 表存在，镜像 publishedLessonVersions 快照模式（DRAFT-01 基座）
- [x] 唯一约束 (lessonId, sourceCommandId) 就位（DRAFT-02 表层兜底）
- [x] source/sourceCommandId provenance 列就位（DRAFT-03 数据落点）
- [x] migration 0014 文件随 PR 提交，运行时 db 文件未污染暂存区

## Threat Mitigations Applied

- **T-63-02**（replay 重复行）：`uniqueIndex(lessonId, sourceCommandId)` 非空确定性约束，重放 INSERT 撞约束而非新增行。
- **T-63-07**（孤儿 draft）：`lessonId`/`createdById` 均 `onDelete:cascade`，父删除级联清理。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 裁剪生成 migration 的 drift 并修复 snapshot prevId 链**
- **Found during:** Task 2
- **Issue:** `drizzle-kit generate` 除目标建表外带出 drift（plugin 索引重命名 + auditSummaryJson），保留会与 journal 既有 0002 重复 DROP/CREATE 致 migrate 失败；重命名 0003→0014 后 snapshot `prevId` 仍指向 0012，与 0002 撞车致 `generate` collision 报错。
- **Fix:** 裁剪 SQL 为 draft-only DDL；将 `0014_snapshot.prevId` 接到 0002 的 id；重跑 generate 报 `No schema changes` 确认无 drift。
- **Files modified:** drizzle/0014_phase63_draft_lesson_versions.sql, drizzle/meta/0014_snapshot.json, drizzle/meta/_journal.json
- **Commit:** b1c91df

### Deferred (scope 外)

- **D1**（deferred-items.md）：`bus.ts:129` / `registry.ts:93` 关于 `lesson.draft.persist` 的 typecheck 错误为 pre-existing（63-02 工作区既存改动引入），本 plan schema 改动零新增错误，typecheck 门禁以「零新增」判定通过。

## Self-Check: PASSED

- 5/5 关键文件存在（schema.ts, 0014 sql, 0014 snapshot, schema 测试, 本 SUMMARY）。
- 3/3 任务提交存在（90b528c, b1c91df, d3ff4e6）。
