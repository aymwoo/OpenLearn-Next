---
phase: 24-live-classroom-operations-and-formative-evaluation
plan: 01
subsystem: ui
tags: [classroom, roster-monitoring, dto, dal, vitest]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: durable classroom evidence and snapshot contracts
  - phase: 23-student-in-class-activity-flow
    provides: student quick-response evidence source and classroom runtime signals
provides:
  - session-scoped classroom roster monitoring summary in snapshot DTO
  - attention-first participant signals for live classroom roster rows
  - `/classroom` runtime monitoring UI without leaving the existing classroom surface
affects: [24-02, 24-03, classroom-runtime, formative-evaluation]
tech-stack:
  added: []
  patterns: [session-scoped monitoring summary via ClassroomSnapshotDTO, attention-first roster monitoring inside `/classroom`]
key-files:
  created: [src/components/classroom/classroom-roster-panel.test.tsx]
  modified: [src/lib/dto/classroom.ts, src/lib/dal/classroom.ts, src/lib/dal/classroom.test.ts, src/components/classroom/classroom-roster-panel.tsx, src/components/classroom/classroom-control-panel.tsx]
key-decisions:
  - "课堂名册监控继续通过 getClassroomSnapshotDTO 提供单一 session-scoped read model，不把统计拆到 client 侧拼接。"
  - "当前环节的提交监控只统计 `student-quick-response` 与 `student-submission` evidence，并在 task/quiz 环节将未提交学生标记为需要关注。"
  - "`/classroom` 控制台继续保留原主路径，只把 roster panel 升级为进度与干预优先的运营面板。"
patterns-established:
  - "Classroom snapshot monitoring: DAL 聚合 monitoringSummary + participant attention fields，UI 直接消费稳定 DTO。"
  - "Roster triage UI: 名册卡片先展示关注对象和提交情况，再展示单学生进度与 attention reasons。"
requirements-completed: [ACT-03]
duration: 5 min
completed: 2026-05-13
---

# Phase 24 Plan 01: Live classroom monitoring summary Summary

**课堂 snapshot 现已直接输出名册监控汇总、学生进度标签、提交计数与 attention reasons，并在 `/classroom` 将名册区升级为可干预的 runtime monitoring 面板。**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-13T15:43:22Z
- **Completed:** 2026-05-13T15:48:07Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- 让 classroom snapshot 成为名册监控唯一事实源，直接输出 monitoringSummary 和参与者 attention fields。
- 基于当前 session evidence 计算 progressLabel、submissionCount 与 needsAttention，不新增独立 gradebook 表。
- 将 `/classroom` 名册区改造成 attention-first 运营面板，并让控制台摘要文案转向 intervention triage。

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend classroom snapshot DTOs and DAL aggregation for runtime monitoring** - `1a41d2e` (feat)
2. **Task 2: Upgrade `/classroom` roster UI to show attention-first monitoring cards and student row signals** - `bf3f786` (feat)

## Files Created/Modified
- `src/lib/dto/classroom.ts` - 新增 roster monitoring summary 与 participant monitoring DTO contract。
- `src/lib/dal/classroom.ts` - 在 `getClassroomSnapshotDTO` 内聚合 session-scoped monitoringSummary、progressLabel、submissionCount 与 attentionReasons。
- `src/lib/dal/classroom.test.ts` - 为 monitoring snapshot 派生规则补充 RED/GREEN 回归覆盖。
- `src/components/classroom/classroom-roster-panel.tsx` - 展示已连接/重连中/需要关注/已提交四类指标与 attention-first 学生行。
- `src/components/classroom/classroom-control-panel.tsx` - 将第三个 hero metric 改为名册监控与 intervention priority 文案。
- `src/components/classroom/classroom-roster-panel.test.tsx` - 覆盖 roster panel 与 control panel 的新监控 UI 合同。

## Decisions Made
- 课堂名册监控继续走 `ClassroomSnapshotDTO`，避免 client 侧再按 participants/evidence 手工重算。
- 当前环节提交统计只认 `student-quick-response` 与 `student-submission` evidence，保证与 Phase 23 durable evidence contract 对齐。
- 学生 attention reasons 直接在 roster 行内显式渲染，不把关键干预信号隐藏为单一通用 badge。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 补齐缺失的 roster panel UI 回归测试文件**
- **Found during:** Task 2
- **Issue:** 计划的验证命令要求运行 `src/components/classroom/classroom-roster-panel.test.tsx`，但仓库中该测试文件不存在，导致任务无法按计划验证。
- **Fix:** 新建 jsdom UI 测试文件，覆盖 roster monitoring 卡片、attention row signals 与 control panel triage copy。
- **Files modified:** `src/components/classroom/classroom-roster-panel.test.tsx`
- **Verification:** `pnpm test --run src/lib/dal/classroom.test.ts src/components/classroom/classroom-roster-panel.test.tsx`
- **Committed in:** `bf3f786`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 该修复仅补足计划既定验证面，未扩大功能范围。

## Issues Encountered
- 新增的 React Testing Library 测试默认运行在非 jsdom 环境，已通过 `@vitest-environment jsdom` 与基础断言方式修正。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 运行态名册监控已经稳定落在 snapshot contract 上，可被 24-02 的 observation / participation 写入直接复用。
- 单学生 detail 与统一 formative evaluation surface 可以继续围绕 attention-first roster 入口展开，无需新建独立 dashboard。

## Self-Check: PASSED

- FOUND: `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-01-SUMMARY.md`
- FOUND: `1a41d2e`
- FOUND: `bf3f786`
