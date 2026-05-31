---
phase: 62-lessonagent-typed-tool-layer
plan: 01
subsystem: platform-core/events
tags: [contracts, events, zod, ai-domain, summary-only]
requires: []
provides:
  - "LessonDraftRequestedEventSchema / LessonToolInvokedEventSchema / LessonDraftProducedEventSchema"
  - "三事件并入 PlatformEventSchema / PlatformDomainEventSchema 联合"
  - "导出 LessonDraft* 推断 type 供 Plan 62-03 handler 引用"
affects:
  - src/features/platform-core/events/contracts.ts
tech-stack:
  added: []
  patterns:
    - "discriminatedUnion 追加成员（interface-first 契约扩展）"
    - "summary-only 守卫：字段名禁以 json 结尾 + strict 拒绝未声明字段"
key-files:
  created: []
  modified:
    - src/features/platform-core/events/contracts.ts
    - src/features/platform-core/events/contracts.test.ts
decisions:
  - "payload 守卫用 passthrough+superRefine helper 替代裸 .strict()，以在剥离前命中 *Json 字段名并复用既有快照拒绝消息"
metrics:
  duration: ~15m
  completed: 2026-05-31
---

# Phase 62 Plan 01: AI 域 lesson draft typed events 契约层 Summary

为 AGENT-04 在 `platform-core/events/contracts.ts` 落地三条 AI 域 typed events（`lesson.draft.requested` / `lesson.tool.invoked` / `lesson.draft.produced`），summary-only + strict 受测保障，可被下游 handler 的 `emittedEvents` 承载。

## What Was Built

- 三个 payload schema（`LessonDraftRequestedPayloadSchema` / `LessonToolInvokedPayloadSchema` / `LessonDraftProducedPayloadSchema`），字段均为摘要字段（commandType/stepType/intentSummary/toolName/attempt/title/succeeded/tokenUsage），无整包步骤快照。
- 三个事件 schema，照抄 `PluginInstalledEventSchema` 结构：`category:"domain"`、`aggregateType:"lesson"`、`aggregateId` min(1)、`audit` 默认值、整体 `.strict()`。
- 并入 `PlatformEventSchema`（discriminatedUnion）与 `PlatformDomainEventSchema`（union）两个联合 → 可经 `PlatformSuccessOrDomainEventSchema` 被 `PlatformCommandExecutionResult.emittedEvents` 承载。
- 导出三事件 schema + 对应 `z.infer` type，供 Plan 62-03 handler/测试引用。
- 契约单测 4 例：合法解析（三 eventType）/ summary-only 拒绝 `*Json`（命中 "must not include object snapshots"）/ domain+SuccessOrDomain 联合承载 / strict 拒绝未声明字段。

## Verification

- `pnpm vitest run src/features/platform-core/events/contracts.test.ts` → 8 passed（4 既有 + 4 新增）。
- 回归：`events/ledger.test.ts` + `commands/handlers/plugins.events.test.ts` → 9 passed，既有 plugin 契约无回归。
- `pnpm tsc --noEmit` → 全清，无类型错误。
- AC greps：`aggregateType: z.literal("lesson")` == 3；schema 名引用 == 12（≥6）；测试 eventType 提及 == 12（≥3）。

## Deviations from Plan

### 实现层调整（非架构）

**1. [Rule 1 - 契约语义对齐] payload 守卫用 helper 替代裸 `.strict()`**
- **Found during:** Task 2
- **Issue:** 计划要求 payload 同时满足 Test 2（`*Json` 字段被拒且 issue 消息含 "must not include object snapshots"）与 Test 4（strict 拒绝未声明字段）。裸 `z.object().strict()` 对未声明的 `stepPayloadJson` 只产出 "Unrecognized keys" 消息，无法命中快照消息。
- **Fix:** 新增 `summaryOnlyStrictPayload()` helper（`passthrough()` + `superRefine`），在字段剥离前先按字段名 `json` 结尾命中快照拒绝消息（复用既有 `SummaryRecordSchema` 文案），再对未声明字段以 `unrecognized_keys` 施加 strict 等价拒绝；同时保留一层嵌套 `*Json` 检查。
- **语义等价性：** 事件 schema 外壳仍为 `.strict()`；payload 在功能上仍 summary-only + 拒绝未知字段，满足 must_have truth ".strict()" 的语义意图与 threat T-62-01/T-62-02 缓解。
- **Files modified:** src/features/platform-core/events/contracts.ts
- **Commit:** 38146a3

未改动 `src/db/schema.ts`、`ledger.ts`、`PlatformSuccessEventSchema` / `PlatformFailureEventSchema`，未放宽既有 `plugin` 字面量。

## Self-Check: PASSED
- src/features/platform-core/events/contracts.ts — FOUND（三事件 schema + 联合 + 导出 type）
- src/features/platform-core/events/contracts.test.ts — FOUND（4 新断言块）
- commit e5294d5 (test RED) — FOUND
- commit 38146a3 (feat GREEN) — FOUND
