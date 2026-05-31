---
phase: 21-teaching-design-contracts-and-evidence-foundation
plan: 01
subsystem: api
tags: [lesson-authoring, classroom-launch, teaching-design, zod, dal]
requires:
  - phase: 17-teacher-flow-editor-enhancement
    provides: teacher-owned preview/readiness DTOs and published snapshot lesson flow
  - phase: 18-teaching-schedule-os
    provides: DAL + Server Actions + explicit cache invalidation discipline
provides:
  - structured teaching-design contract on lesson step payloads
  - backward-safe inferred defaults and refinement markers for teacher preview/editor DTOs
  - launch preview step contract enriched with teaching-design metadata and fallback status
affects: [teacher-editor, teacher-launch, published-snapshot-preview, classroom-runtime]
tech-stack:
  added: []
  patterns: [typed teaching-design fallback resolution, published-snapshot launch preview contract]
key-files:
  created: [.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-01-SUMMARY.md]
  modified: [src/lib/dto/lesson-authoring.ts, src/lib/dal/lesson-authoring.ts, src/lib/dal/lesson-authoring.test.ts, src/lib/dto/classroom.ts, src/lib/dal/classroom.ts, src/lib/dal/classroom.test.ts]
key-decisions:
  - "teachingDesign 继续内嵌在现有 content/task/quiz payload 上，而不是新增独立 step 模型。"
  - "历史 lesson 缺失 teachingDesign 时由服务端统一默认化，并输出 inferred/refinement 标记给 teacher surfaces 消费。"
  - "launch preview 继续只读 published snapshot，并在该链路内优先消费结构化 teachingDesign。"
patterns-established:
  - "Teaching design hydration: DAL reads raw step payloads, injects stable defaults, and emits explicit/inferred refinement markers."
  - "Launch preview contract: published snapshot steps map to classroom preview DTOs with structured teaching intent and evidence summaries."
requirements-completed: [ORCH-01]
duration: 10 min
completed: 2026-05-12
---

# Phase 21 Plan 01: Teaching design contract foundation summary

**现有 lesson step 已具备结构化 teaching-design 元数据、历史课时 fallback 标记，以及可直接供 `/teacher/launch` 消费的 launch preview 合同。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-12T14:19:31Z
- **Completed:** 2026-05-12T14:29:03Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 为 `content`、`task`、`quiz` 三类 step payload 增加统一的 `teachingDesign` 合同。
- 在 lesson authoring DAL 中补齐历史 payload 的默认推断逻辑，并输出 `teachingDesignStatus`、`needsTeachingDesignRefinement`、`teachingDesignFallbackReason`。
- 扩展 classroom launch preview step DTO，使其基于 published snapshot 输出结构化教学意图、活动模式、证据摘要与 fallback 状态。

## Task Commits

Each task was committed atomically:

1. **Task 1: 为 lesson step payload 定义 teaching-design contract 与向后兼容默认值** - `ce73804` (feat)
2. **Task 2: 让课堂 launch preview 使用结构化 teaching-design contract** - `e41d406` (feat)

## Files Created/Modified

- `src/lib/dto/lesson-authoring.ts` - 新增 teaching-design schema、status/fallback marker DTO 字段。
- `src/lib/dal/lesson-authoring.ts` - 统一历史 step 的 teaching-design 默认化与 preview/editor DTO 输出。
- `src/lib/dal/lesson-authoring.test.ts` - 增加 legacy fallback、explicit marker、built-in 共存回归测试。
- `src/lib/dto/classroom.ts` - 扩展 launch preview step contract，暴露 activity/evidence/fallback 字段。
- `src/lib/dal/classroom.ts` - launch preview 优先消费 published snapshot 里的 teaching-design，缺失时走默认推断。
- `src/lib/dal/classroom.test.ts` - 增加 structured launch preview、fallback、安全边界回归测试。

## Decisions Made

- `activityIntent`、`activityMode`、`evidenceExpectation` 全部收敛为 typed enum/object，而不是自由文本。
- 历史 payload 不做破坏性迁移，统一在 DAL 读取时补齐默认值，避免 authoring/publish/launch 链路断流。
- launch preview 的 `family`、`estimatedMinutes`、`evidenceSummary` 由结构化 teaching-design 驱动；缺失时显式标记 inferred，而不是静默继续旧 heuristics。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 执行前目标文件已存在未提交改动。为保证本计划的原子提交边界，先临时 stash 目标文件，再在计划完成后恢复并手动合并冲突。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/teacher/editor` 与 `/teacher/launch` 已可直接消费 teaching-design fallback markers，进入后续 orchestration/readiness surface 开发。
- published snapshot launch contract 已稳定，后续课堂 runtime 与 evidence persistence 可沿用同一套 teaching-design 语义。

## Self-Check: PASSED

- Verified `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-01-SUMMARY.md` exists.
- Verified commits `ce73804` and `e41d406` exist in git history.

---

*Phase: 21-teaching-design-contracts-and-evidence-foundation*
*Completed: 2026-05-12*
