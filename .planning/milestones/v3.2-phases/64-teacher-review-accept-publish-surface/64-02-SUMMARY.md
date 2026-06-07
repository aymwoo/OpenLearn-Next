---
phase: 64-teacher-review-accept-publish-surface
plan: 02
subsystem: dal
tags: [drizzle, zod, sqlite, draft-review, diff, tdd]

# Dependency graph
requires:
  - phase: 64-01
    provides: "draft lifecycle schema (status/archivedAt), lesson backlink columns (aiDraftAppliedAt/latestDraftVersionId), LessonDraftReviewDTOSchema, buildLessonDraftDiffRows"
provides:
  - "getLessonDraftReviewDTO: read DAL returning indexed diff rows for UI review panel"
  - "applyDraftToLiveLesson: transactional write archiving/replacing active steps, marking draft applied, backlinking lesson"
  - "discardDraftLessonVersion: safe draft dismissal with zero lessonSteps/lessons writes"
  - "ApplyDraftResultDTOSchema + DiscardDraftResultDTOSchema: validated result contracts"
affects: [64-03-editor-ui, 64-04-server-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD (RED-GREEN) cycle per DAL function: test first, then minimal implementation"
    - "deriveDraftStepTitle: payload-driven step title derivation (content→title, task→prompt, quiz→question)"
    - "Transaction-gated apply: archive→insert→update lessons→update draft in single Drizzle transaction"
    - "Zero-write discard: only draftLessonVersions row mutation, no lessonSteps/lessons side effects"
    - "DTO parse before return: every function validates output through Zod .parse()"

key-files:
  created:
    - src/lib/dal/lesson-authoring.draft-review.test.ts
  modified:
    - src/lib/dal/lesson-authoring.ts
    - src/lib/dto/lesson-authoring.ts

key-decisions:
  - "Draft step DTO title derived from payload type (deriveDraftStepTitle), not a fixed column — content uses payload.title, task uses payload.prompt, quiz uses payload.question"
  - "applyDraftToLiveLesson uses db.transaction for atomic archiving+insert+update sequence per D-04/D-07"
  - "discardDraftLessonVersion confirmed zero-write to lessonSteps/lessons via source assertion test per D-08"
  - "No separate command registration in this plan — DAL methods are called directly by Server Actions in Plan 04"

patterns-established:
  - "Pattern 1: draft-review DAL tests use db.query mock facade with findFirst/findMany per-table mocks, plus db.update/insert/transaction mocks"
  - "Pattern 2: DTO parse is the final gate before return — ApplyDraftResultDTOSchema and DiscardDraftResultDTOSchema enforce output shape"
  - "Pattern 3: deriveDraftStepTitle centralizes content/task/quiz title derivation for draft steps that lack a step-row title field"

requirements-completed: [REVIEW-02, REVIEW-03]

# Metrics
duration: 15min
completed: 2026-05-31
---

# Phase 64 Plan 02: Draft Review DAL Read/Write Functions 总结

**实现草稿审校 DAL：getLessonDraftReviewDTO 读取索引对齐 diff，applyDraftToLiveLesson 事务性写入替换步骤并回链 lesson，discardDraftLessonVersion 安全丢弃零副作用。**

## 性能

- **耗时:** 15 分钟
- **开始时间:** 2026-05-31T13:24:00Z
- **结束时间:** 2026-05-31T13:39:00Z
- **任务数:** 3
- **修改文件数:** 3

## 成果
- `getLessonDraftReviewDTO` 读取最新 pending 草稿与活跃步骤，通过 Plan 01 的 `buildLessonDraftDiffRows` 生成索引对齐 diff 行（new/modified/deleted/unchanged），返回完整 `LessonDraftReviewDTO` 供 UI 直接使用
- `applyDraftToLiveLesson` 在单一 Drizzle transaction 中原子化完成：归档活跃步骤 → 插入替代步骤（LexoRank 排序）→ 更新 lessons 回链（aiDraftAppliedAt/latestDraftVersionId）→ 标记草稿为 applied
- `discardDraftLessonVersion` 仅更新 draftLessonVersions 行（status='discarded', archivedAt），零写入 lessonSteps/lessons，符合 D-08 安全合约
- 所有三个函数均通过 `assertActiveTeacher()` + `getScopedLesson()` 授权，接受非 pending 草稿时抛出 `DRAFT_NOT_PENDING`
- 新增 `ApplyDraftResultDTOSchema` 和 `DiscardDraftResultDTOSchema` 到 DTO 模块，所有返回值经过 Zod 验证

## 任务提交

每个任务按 TDD 原子化提交：

1. **任务 1: getLessonDraftReviewDTO 读取 DAL** — `ae1108e` (test) + `5a22d88` (feat)
2. **任务 2: applyDraftToLiveLesson 写入 DAL** — `efbb20f` (test) + `f6a398c` (feat)
3. **任务 3: discardDraftLessonVersion 写入 DAL** — `d6b22ba` (test) + `8eeaffb` (feat)

## 创建/修改的文件
- `src/lib/dal/lesson-authoring.ts` — 新增 3 个导出函数：`getLessonDraftReviewDTO`（约 120 行）、`applyDraftToLiveLesson`（约 110 行）、`discardDraftLessonVersion`（约 40 行）+ `deriveDraftStepTitle` 辅助函数（约 15 行）—— 总计约 314 行新增
- `src/lib/dal/lesson-authoring.draft-review.test.ts` — 新文件，586 行，包含 25 个测试 + source 断言—— 覆盖三个函数的全部行为和边界情况
- `src/lib/dto/lesson-authoring.ts` — 新增 `ApplyDraftResultDTOSchema`（lessonId/courseId/draftVersionId/appliedStepCount）+ `DiscardDraftResultDTOSchema`（lessonId/draftVersionId/discardedAt）—— 共约 20 行

## 决策记录
- draftStep DTO 的 title 通过 `deriveDraftStepTitle` 从 payload 类型派生（content→title, task→prompt, quiz→question），因为 task/quiz 的 payload 中没有独立的 `title` 字段
- `applyDraftToLiveLesson` 使用 `db.transaction` 保证归档+插入+更新+标记的四步原子性
- `discardDraftLessonVersion` 通过源码断言测试（source assertion）证明函数体中不包含 `update(lessons)` 调用，确保零副作用
- 本计划不在 Command Bus 注册 accept/discard 命令——DAL 方法由 Plan 04 的 Server Actions 直接调用

## 与计划的偏差

无——严格按照计划执行。

## 遇到的问题

无。

## 需要用户配合的部分

无——本计划无需外部服务配置。

## 已知存根

无——所有三个函数均已完整实现并经过 TDD 测试覆盖。

## 威胁标志

无——所有 STRIDE 缓解措施已实现（S64-02/S64-03/S64-06/S64-07 通过 assertActiveTeacher + getScopedLesson 授权 + discard 零副作用源码断言覆盖）。

## 下一阶段准备状态
- DAL 读取（getLessonDraftReviewDTO）和写入（applyDraftToLiveLesson、discardDraftLessonVersion）均已就绪——供 Plan 03（编辑器 UI 集成）和 Plan 04（Server Actions）直接消费
- 所有函数经过 25 个测试覆盖，包括授权边界、错误路径和事务行为
- `LessonDraftReviewDTO` 包含 UI 所需的所有字段：lesson、liveSteps、draftSteps、draftMeta、diffRows、hasPendingDraft

---
*阶段: 64-teacher-review-accept-publish-surface*
*完成时间: 2026-05-31*
