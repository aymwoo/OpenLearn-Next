---
phase: 63-ai-draft-chain-into-draft-lesson-version
plan: 03
subsystem: platform-core-contracts
tags: [contracts, command-bus, events, cache-policy, summary-only]
requires: []
provides:
  - "lesson.draft.persist 命令契约（PlatformCommandType + payload + union）"
  - "lesson.draft.persisted summary-only 事件契约（三处 union）"
  - "cacheTags.draftLesson('draft:${lessonId}')"
affects:
  - "63-04 handler/registry（消费命令 payload 类型 + 发 persisted 事件 + 返回 draftLesson tag）"
tech-stack:
  added: []
  patterns:
    - "写型命令四处平行登记（type 数组 / payload schema .strict() / 注册表 / discriminatedUnion 变体）"
    - "事件三处 union 登记（PlatformEventSchema / PlatformDomainEventSchema / 自动经 PlatformSuccessOrDomainEventSchema）"
    - "summary-only 守卫：payload .strict() 拒绝 *Json 快照泄漏"
    - "teacherId/source 绝不入 payload（authorize 闭包注入归 handler）"
key-files:
  created:
    - "src/features/platform-core/events/lesson-draft-persisted.contract.test.ts"
  modified:
    - "src/features/platform-core/commands/contracts.ts"
    - "src/features/platform-core/events/contracts.ts"
    - "src/lib/cache-policy.ts"
decisions:
  - "事件 payload 用 z.object({...}).strict()（plan 模板）而非 summaryOnlyStrictPayload helper：.strict() 已拒绝含 snapshotJson 的任意额外键，满足 T-63-04 且与 plan <action> 一致"
  - "命令/事件命名严格对齐 63-04（lesson.draft.persist / lesson.draft.persisted / PlatformCommandPayloadSchemas[\"lesson.draft.persist\"]），plan-checker 已核一致，未改名"
metrics:
  duration: "~25min"
  completed: 2026-05-31
---

# Phase 63 Plan 03: lesson.draft.persist 契约层 Summary

为 `lesson.draft.persist` 写型命令铺设纯 schema/config 契约层：命令契约 + summary-only 事件契约 + draft cache tag。不含任何 DB/handler 逻辑（Wave 1，与 Plan 01 并行）。

## What Was Built

### Task 1 — lesson.draft.persist 命令契约（commit 7ee6ed4）
`src/features/platform-core/commands/contracts.ts` 四处平行登记：
1. `LessonDraftCommandTypes` 数组扩入 `"lesson.draft.persist"`（自动纳入 `PlatformCommandType` union）。
2. 新增 `LessonDraftPersistPayloadSchema`：`.strict()`，字段 `lessonId` + `steps: z.array(lessonStepPayloadSchema).min(1)`（复用既有 step schema，不造第二套），**无 teacherId/source**；idempotencyKey 经 envelope `dedupeKey` 注入，payload 不携带。
3. `PlatformCommandPayloadSchemas` 注册表追加。
4. `PlatformCommandSchema` discriminatedUnion 追加 persist 变体。
- 新增 `import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring"`。

### Task 2 — lesson.draft.persisted 事件 + draftLesson tag（commits cc84a54 RED → 601b075 GREEN，TDD）
- `src/features/platform-core/events/contracts.ts`：
  - `LessonDraftPersistedPayloadSchema`：`.strict()` 仅 `draftVersionId/version/stepCount/source:'ai'`，拒绝任意额外键（含 `snapshotJson`），沿用 Phase 62 summary-only 守卫意图。
  - `LessonDraftPersistedEventSchema` 并入三处 union（`PlatformEventSchema` discriminatedUnion / `PlatformDomainEventSchema` union / 经 `PlatformSuccessOrDomainEventSchema` 自动含 domain）。
  - 导出 `LessonDraftPersistedEvent` / `LessonDraftPersistedPayload` 类型。
- `src/lib/cache-policy.ts`：`cacheTags.draftLesson = (lessonId) => 'draft:${lessonId}'`。
- 测试 `lesson-draft-persisted.contract.test.ts`：5 用例（合法解析 / snapshotJson+任意*Json 拒绝 / 非 ai source 拒绝 / domain union 含该事件 / cache tag 字面值），全绿。

## Verification Results

| Verify | 结果 |
|--------|------|
| `pnpm vitest run lesson-draft-persisted.contract.test.ts` | ✅ 5/5 passed |
| 契约回归（events/contracts.test.ts + commands/） | ✅ 45/45 passed（6 files） |
| `pnpm lint` | ✅ 0 errors（64 warnings 全在无关 pre-existing 文件，本 plan 改动文件零问题） |
| `pnpm typecheck` | ⚠️ 仅余 2 个已知跨 plan 错误（见 Deviations），本 plan 改动文件零类型错误 |

## Deviations from Plan

### 已知跨 plan typecheck 缺口（非本 plan 缺陷，由 63-04 闭合）

**[Rule 3 边界 - 跨 plan 依赖] registry.ts:93 / bus.ts:129 typecheck 错误**
- **现象**：`lesson.draft.persist` 纳入 `PlatformCommandType` union 后，`registry.ts` 的 `satisfies Record<PlatformCommandType, PlatformCommandDefinition>` 完整性检查报「Property 'lesson.draft.persist' is missing」；`bus.ts:129` 读取 registry 同因报错。
- **根因**：本 plan scope 明确要求「把 `lesson.draft.persist` 纳入 `PlatformCommandType`」，而 registry/handler 登记明确归 **63-04**，本 plan **严禁触碰** registry/handler。两处错误纯由 63-04 尚未登记 handler 导致，**非本 plan 改动文件的类型缺陷**。
- **plan 已预期**：Task 1 `<action>` 原文「下游 `satisfies Record<PlatformCommandType, ...>`（registry，Plan 04）将强制登记完整性」。
- **处置**：未触碰 registry/handler（遵守 scope + 避免与 63-04 并行工作冲突）。整相位 typecheck 将在 63-04 登记 handler 后归零。

> 说明：plan `<verify>` 的「typecheck 零错误」是面向整合后相位的目标；对本 Wave-1 纯契约 plan 而言，跨 plan 完整性缺口在隔离执行时不可避免。本 plan 改动的三个源文件 + 测试自身均类型正确。

其余无偏差——命令/事件命名、payload 索引键、union 登记位置均与 plan 模板及 63-04 一致。

## Known Stubs

无。本 plan 为契约/config 层，无桩数据、无 UI、无未接数据源。

## Self-Check: PASSED

- 四个目标文件均存在 ✅
- 三个 commit（7ee6ed4 / cc84a54 / 601b075）均在 git log ✅
- 无运行时文件（local.db-*、pilot-host）入暂存 ✅
