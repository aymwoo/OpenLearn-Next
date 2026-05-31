---
phase: 62-lessonagent-typed-tool-layer
plan: 03
subsystem: api
tags: [command-bus, lesson-agent, typed-tool, domain-events, zod, drizzle]

# Dependency graph
requires:
  - phase: 62-01
    provides: "lesson.draft.requested / lesson.tool.invoked / lesson.draft.produced 三事件 schema（summary-only 守卫，拒 *Json 键）"
  - phase: 62-02
    provides: "createDraftLessonStepTool（deps {teacherId}，返回 LessonStepPayload）"
provides:
  - "lesson.draft.run command 类型（复用既有 {schoolId, pluginId} scope + sentinel pluginId=core.lesson-agent，零改 scope schema / bus 失败路径）"
  - "lessonDraftCommandHandlers：只读授权 → 确定性调用 typed tool → 成功落账三 AI 域事件 / 失败抛 PlatformCommandExecutionError"
  - "platformCommandRegistry 注册 lesson.draft.run（dedupe optional）"
affects: [63-lesson-draft-persistence, lesson-agent, command-bus]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "命令执行轨道嵌入 typed-tool 生成：handler.execute 内确定性调用 createDraftLessonStepTool，三成功事件经 handler 自有 emittedEvents 落账（D-53-07）"
    - "失败语义：handler 抛 PlatformCommandExecutionError，由 bus 落账唯一 generic platform.command.failed，不发任何 domain 事件（D-53-08 superRefine）"
    - "teacherId 从授权 actor（assertActiveTeacher().userId）闭包注入工具，绝不取自 LLM / payload"
    - "summary-only：步骤包仅经 command resultSummary 回传（D-01 唯一持久副作用），事件 payload 只带摘要"

key-files:
  created:
    - src/features/platform-core/commands/handlers/lesson-draft.ts
    - src/features/platform-core/commands/handlers/lesson-draft.events.test.ts
  modified:
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/platform-core/commands/handlers/plugins.ts
    - src/features/platform-core/commands/handlers/plugins.test.ts

key-decisions:
  - "handler 严格只发 3 事件（不发 succeeded），emittedEvents.length === 3"
  - "task/quiz step 无 title 字段 → deriveStepTitle 派生（task=prompt, quiz=question, content=title）"
  - "失败 attribution：scope=operator, pluginId=core.lesson-agent, reasonCode=draft_generation_failed, recovery=retry；失败事件 aggregateType=plugin"
  - "测试用已导出的 Lesson*EventSchema（带 summaryOnly 守卫）校验 summary-only，避免改 events/contracts.ts"

patterns-established:
  - "枚举扩展穷尽性收窄：plugins 的 handler-map satisfies 从 Record<PlatformCommandType> 收窄为 Record<governance command types>，使新增 command 类型不被迫塞进 plugin handler map"

requirements-completed: [AGENT-03, AGENT-04]

# Metrics
duration: ~45min
completed: 2026-05-31
---

# Phase 62 Plan 03: lesson.draft.run Typed-Tool Command Handler Summary

**新增 `lesson.draft.run` 命令类型，handler 经只读授权后确定性调用 `createDraftLessonStepTool` 生成步骤，成功落账三条 AI 域事件、失败仅走 bus 唯一 generic 失败事件，步骤包经 resultSummary 回传（不写 lesson/draft version）**

## Performance

- **Duration:** ~45 min
- **Tasks:** 1 逻辑特性（TDD：测试 → 契约 → handler → 注册 → 修复编译/回归）
- **Files modified:** 6（2 created, 4 modified）

## Accomplishments
- `contracts.ts` 新增 `LessonDraftCommandTypes` + `lesson.draft.run` payload schema，并入 `PlatformCommandTypeSchema` enum / `PlatformCommandPayloadSchemas` 映射 / `PlatformCommandSchema` 联合
- `handlers/lesson-draft.ts`：`authorize` 校验 `schoolId ∈ assertActiveTeacher().schoolIds`；`execute` 闭包注入 `teacherId` 调工具，成功 emit requested/tool.invoked/produced 三事件，失败 `throwDraftFailure` 抛 `PlatformCommandExecutionError`
- `registry.ts` 注册 `lesson.draft.run`（dedupe optional）
- handler 事件单测 6 用例全绿（3 事件 eventType、summary-only payload、resultSummary、teacherId 闭包注入、失败抛错、aggregate=lesson/lessonId）

## Task Commits

1. **lesson.draft.run command type + typed-tool draft handler** - `dfd392f` (feat)

_单 commit：TDD 测试先行（RED 已确认），实现后一次性落账。_

## Files Created/Modified
- `src/features/platform-core/commands/contracts.ts` - lesson.draft.run 命令类型 / payload schema / enum & union & map 并入
- `src/features/platform-core/commands/handlers/lesson-draft.ts` - lessonDraftCommandHandlers（authorize + execute），deriveStepTitle
- `src/features/platform-core/commands/registry.ts` - platformCommandRegistry 注册 lesson.draft.run
- `src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` - handler 事件单测（6 用例）
- `src/features/platform-core/commands/handlers/plugins.ts` - handler-map satisfies 收窄为 governance command types（枚举扩展副作用）
- `src/features/platform-core/commands/handlers/plugins.test.ts` - registry 穷尽性断言追加 lesson.draft.run

## Decisions Made
- handler 不发 `platform.command.succeeded`，`emittedEvents.length === 3`，严格符合计划与 D-53-07
- 失败路径不发任何 domain 事件，仅由 bus 落账唯一 generic `platform.command.failed`（D-53-08）
- teacherId 仅来自授权 actor 闭包，杜绝 LLM/payload 注入
- task/quiz step 无 title → deriveStepTitle 派生标题用于摘要

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] plugins.ts handler-map 穷尽性收窄**
- **Found during:** 契约扩枚举后编译
- **Issue:** `PlatformCommandTypeSchema` 新增 `lesson.draft.run` 后，`plugins.ts:960` 的 `satisfies Record<PlatformCommandType, ...>` 穷尽映射缺 key 导致 `tsc` 失败；该 map 属于 plugin governance 域，不应承载 lesson 命令
- **Fix:** 收窄为 `satisfies Record<(typeof PlatformPluginGovernanceCommandTypes)[number], ...>`，并 import 该值
- **Files modified:** src/features/platform-core/commands/handlers/plugins.ts
- **Verification:** `tsc --noEmit` 零错误
- **Committed in:** dfd392f

**2. [Rule 3 - Blocking] plugins.test.ts registry 穷尽断言更新**
- **Found during:** 全量命令测试回归
- **Issue:** `plugins.test.ts:571` 用精确数组相等断言 registry keys == 10 governance 命令；注册 lesson.draft.run（计划核心交付物）必然使其失败
- **Fix:** 期望数组末尾追加 `"lesson.draft.run"`，保留穷尽守卫意图
- **Files modified:** src/features/platform-core/commands/handlers/plugins.test.ts
- **Verification:** 命令域全量测试 37/37 通过
- **Committed in:** dfd392f

---

**Total deviations:** 2 auto-fixed（均 Rule 3 阻塞）
**Impact on plan:** 两项均为扩枚举 + 注册新命令的直接编译/测试副产物，未引入新行为或 scope creep。`src/db/schema.ts`、`commands/bus.ts` 及其失败路径零改动。

## Issues Encountered
- 预判的 `registry.ts:85`（穷尽 Record 缺 key）与 `bus.ts:129`（索引隐式 any）在 registry 追加 `lesson.draft.run` 条目后自动消解，`bus.ts` 本身零改动 — 符合执行前爆炸半径排查结论。

## User Setup Required
None - 无外部服务配置。

## Next Phase Readiness
- AGENT-03 / AGENT-04 command 子系统就绪：起草关键节点已嵌入命令执行轨道，三成功事件 + generic 失败事件落账语义验证完毕
- Phase 63 续接 lesson/draft version 持久化（本 phase 仅经 resultSummary 回传，未写 version）

---
*Phase: 62-lessonagent-typed-tool-layer*
*Completed: 2026-05-31*

## Self-Check: PASSED
- src/features/platform-core/commands/handlers/lesson-draft.ts — FOUND
- src/features/platform-core/commands/handlers/lesson-draft.events.test.ts — FOUND
- .planning/phases/62-lessonagent-typed-tool-layer/62-03-SUMMARY.md — FOUND
- commit dfd392f — FOUND
