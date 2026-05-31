---
phase: 64-teacher-review-accept-publish-surface
plan: 01
subsystem: schema, dto
tags: [drizzle, zod, sqlite, diff, draft-review]

# Dependency graph
requires:
  - phase: 63-ai-draft-chain-into-draft-lesson-version
    provides: "draftLessonVersions table with snapshotJson, source, sourceCommandId"
provides:
  - draft lifecycle schema columns (status, archivedAt)
  - lesson AI draft backlink columns (aiDraftAppliedAt, latestDraftVersionId)
  - review DTO schemas (EditableDraftStep, LessonDraftReviewDTO)
  - pure index-aligned diff classification helper (buildLessonDraftDiffRows)
affects: [64-02-dal-actions, 64-03-editor-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD (RED-GREEN) for schema source assertions and DTO tests"
    - "Nullable text backlink (latestDraftVersionId) avoids unsafe reverse-cascade FK"
    - "Zod .strict() to reject unknown fields on EditableDraftStepSchema"
    - "Step content fingerprint via discriminated payload type switch"

key-files:
  created:
    - drizzle/0015_phase64_draft_review_lifecycle.sql
    - drizzle/meta/0015_snapshot.json
    - src/lib/dto/lesson-authoring.test.ts
  modified:
    - src/db/schema.ts
    - src/db/schema.draft-lesson-versions.test.ts
    - src/lib/dto/lesson-authoring.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "latestDraftVersionId uses plain text (no FK) to avoid unsafe cascade-delete of lessons when a draft row is removed"
  - "EditableDraftStepSchema uses .strict() to reject type/pluginConfig/executableConfig/builtInSource — covers REVIEW-02 without an explicit blocklist"

patterns-established:
  - "Pattern 1: 在 schema source assertion 测试中，通过正确切片隔离不同表定义（lessonStepsStart → lessonMaterials 切片），避免跨表误判"
  - "Pattern 2: stepContentFingerprint 通过 switch(payload.type) 进行 discriminated union 窄化，统一 content/task/quiz 的比较基准"

requirements-completed: [REVIEW-01, REVIEW-02, REVIEW-03]

# Metrics
duration: 13min
completed: 2026-05-31
---

# Phase 64 Plan 01: Draft Review Schema & DTO Foundation 总结

**为后续 DAL/Server Action/UI 工作准备好数据契约：Drizzle 生命周期/回链字段、已应用的迁移、经过验证的 diff DTO 和纯 diff 分类工具。**

## 性能

- **耗时:** 13 分钟
- **开始时间:** 2026-05-31T13:02:36Z
- **结束时间:** 2026-05-31T13:15:22Z
- **任务数:** 3
- **修改文件数:** 7

## 成果
- `draftLessonVersions` 新增 `status`（pending/applied/discarded）和 `archivedAt` 字段 —— 为后续生命周期管理做准备
- `lessons` 新增 `aiDraftAppliedAt` 和 `latestDraftVersionId`（纯文本回链）—— 记录教师接受草稿的来源
- 生成并应用了 Drizzle 迁移 `0015_phase64_draft_review_lifecycle.sql`（4 条 ALTER TABLE 语句）
- 新增 `EditableDraftStepSchema`（仅放行 title/description/content，严格模式）—— 覆盖 REVIEW-02
- 新增 `buildLessonDraftDiffRows` 纯函数 —— 按索引对齐进行四状态差异分类（new/modified/deleted/unchanged）—— 覆盖 REVIEW-01
- 新增 `LessonDraftReviewDTOSchema` —— 包含 diffRows，为 UI 提供完整审阅上下文

## 任务提交

每个任务已按 TDD 原子化提交：

1. **任务 1: 添加 schema 字段与 source 断言** — `ed387a1`（test）+ `778b7d7`（feat）
2. **任务 2: 生成并应用 Drizzle 迁移** — `119102f`（chore）
3. **任务 3: 添加审阅 DTO 与纯 diff 分类工具** — `b6d2155`（feat）

**方案元数据:** _(待最后提交)_

## 创建/修改的文件
- `src/db/schema.ts` — 在 draftLessonVersions 中新增 status/archivedAt，在 lessons 中新增 aiDraftAppliedAt/latestDraftVersionId（共新增 6 行）
- `src/db/schema.draft-lesson-versions.test.ts` — 新增 Phase 64 source 断言：状态、时间戳、回链、lessonSteps 不包含 source 列（新增 31 行）
- `drizzle/0015_phase64_draft_review_lifecycle.sql` — 4 条 ALTER TABLE 的 SQLite 迁移
- `drizzle/meta/0015_snapshot.json` — Drizzle meta 快照
- `drizzle/meta/_journal.json` — 新增 idx=4 migration 条目
- `src/lib/dto/lesson-authoring.ts` — 新增 6 个 schema + `buildLessonDraftDiffRows` 辅助函数（新增约 105 行）
- `src/lib/dto/lesson-authoring.test.ts` — 18 个测试，覆盖 schema 和 diff 行为（新文件，新增 265 行）

## 决策记录
- `latestDraftVersionId` 使用纯文本（无 FK），避免在删除草稿行时反向级联删除 lesson——遵循 D-05/AGENTS.md 关于 cascade 安全性的指导
- `EditableDraftStepSchema` 使用 `.strict()` 拒绝 `type`、`pluginConfig`、`executableConfig`、`builtInSource` 字段——无需显式黑名单即可覆盖 REVIEW-02
- `stepContentFingerprint` 通过 `switch(payload.type)` 进行鉴别联合类型窄化，跨 content/task/quiz 类型统一比较基准

## 与计划的偏差

无——严格按计划执行。

## 遇到的问题

无。

## 需要用户配合的部分

无——本计划无需外部服务配置。

## 下一阶段准备状态
- Schema 与 DTO 契约已就绪，可供方案 02（DAL read/apply/discard）和方案 03（编辑器 UI 集成）直接消费
- 迁移已应用——下游 DAL 方法可以立即开始读写新的 lifecycle/backlink 列
- 差异分类逻辑已通过 18 个 DTO 测试充分验证，涵盖全部四种状态 + 边界情况

---
*阶段: 64-teacher-review-accept-publish-surface*
*完成时间: 2026-05-31*
