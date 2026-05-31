---
phase: 62-lessonagent-typed-tool-layer
plan: 04
subsystem: api
tags: [lesson-agent, command-bus, server-only, orchestration, domain-events, integration-test]

# Dependency graph
requires:
  - phase: 62-01
    provides: "lesson.draft.requested / lesson.tool.invoked / lesson.draft.produced 三事件 schema（summary-only 守卫）"
  - phase: 62-02
    provides: "createDraftLessonStepTool（deps {teacherId}，返回 LessonStepPayload）"
  - phase: 62-03
    provides: "lesson.draft.run command 类型 + lessonDraftCommandHandlers，已注册于 platformCommandRegistry"
provides:
  - "draftLessonStep(...)：lesson-agent 唯一 server-only 公共编排入口，构造合法 envelope 后经 dispatchPlatformCommand 派发，绝不绕过 Command Bus 直接落事件"
  - "从 PlatformCommandDispatchResult.resultSummary.step 取回生成步骤包回传调用方；失败语义透传（不静默吞错）"
  - "生产 platformCommandStore（db-backed）装配，封装于 facade 内"
affects: [63-lesson-draft-persistence, lesson-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "server-only facade 编排：draftLessonStep 仅构造 command envelope + dispatchPlatformCommand，生成/落账副作用全部委派 62-03 handler（无直接事件写入）"
    - "envelope 构造：system actor core.lesson-agent / actorScope=system，scope.pluginId=core.lesson-agent sentinel，correlation 三字段共享，payload 仅 {lessonId, stepType, intent}（无 teacherId）"
    - "依赖注入测试边界：dispatchPlatformCommand 第二参注入 persistPlatformEvents 捕获 emittedEvents，保留真实 bus + 真实 registry + 真实 lesson-draft handler"

key-files:
  created:
    - src/server/ai/agents/lesson-agent.ts
    - src/server/ai/agents/lesson-agent.test.ts
  modified: []

key-decisions:
  - "失败语义：不 catch dispatchPlatformCommand 的抛错，直接透传（Test5 用 rejects.toThrow），最忠实于『不静默吞错』"
  - "测试 mock @/db（stub {}，因注入 store+persistPlatformEvents，db 方法永不被调用）"
  - "测试 mock plugins handler-map（Proxy stub）：真实 registry 引用 plugin handlers → @/lib/dal/auth → next-auth → next/server，vitest 无法解析；此 mock 仅替换 plugin handlers，保留真实 bus + registry + lesson-draft handler"
  - "JSDoc 不含字面 token generateObject/eval(/process.env，以满足 server-only 边界 acceptance grep（注释亦不豁免）"

patterns-established:
  - "AI agent 层对外只暴露 server-only 编排 facade，底层全部经 Command Bus 间接触达——agent 文件零 DB/env/LLM 直接依赖"

requirements-completed: [AGENT-03, AGENT-04]

# Metrics
duration: ~40min
completed: 2026-05-31
---

# Phase 62 Plan 04: draftLessonStep Server-Only Orchestration Summary

**lesson-agent 暴露唯一 server-only 公共入口 `draftLessonStep(...)`，构造合法 command envelope（correlation 三字段 + sentinel pluginId + system actor）后经 `dispatchPlatformCommand` 派发 `lesson.draft.run`，从 `resultSummary.step` 取回生成步骤包回传，失败透传 bus 失败语义；端到端集成测试用真实 bus+registry+handler、注入 persistPlatformEvents 断言三事件落账与 summary-only 信息隔离**

## Performance

- **Duration:** ~40 min
- **Tasks completed:** 实现 + 测试一体（plan 单切片）

## What Was Built

1. **`draftLessonStep(input)` server-only facade**（`src/server/ai/agents/lesson-agent.ts`，~217 行，首行 `import "server-only"`）
   - 构造 PlatformCommandEnvelope：`type=lesson.draft.run`、system actor `core.lesson-agent`（actorScope=`system`）、`scope.pluginId=core.lesson-agent` sentinel、correlation 三字段（correlationId / causationId / requestId）共享、payload 仅 `{lessonId, stepType, intent}`（绝不带 teacherId）。
   - 经 `dispatchPlatformCommand`（不传 definitions → 默认解析自 `platformCommandRegistry`）唯一派发路径。
   - 从 `PlatformCommandDispatchResult.resultSummary.step` 取回步骤包回传；失败抛错透传（不 catch）。
   - 生产装配 db-backed `platformCommandStore`，封装于 facade 内。

2. **端到端集成测试**（`src/server/ai/agents/lesson-agent.test.ts`，5 用例）
   - Test1：三 AI 域事件经真实 bus→handler 落账，共享同一 correlationId。
   - Test2：`resultSummary.step` 回传形状正确。
   - Test3：事件 payload summary-only（整包 step 仅在 resultSummary）。
   - Test4：envelope 合法（sentinel pluginId、correlation 三字段、无 teacherId）。
   - Test5：失败透传（rejects.toThrow），且无任何 `lesson.*` domain 事件落账。

## Deviations from Plan

None — plan executed as written。两处实现细节属测试基础设施约束下的必要 mock（@/db stub、plugins handler-map Proxy stub），不改变被测真实路径（bus + registry + lesson-draft handler 均为真实）。

## Verification

- `lesson-agent.test.ts`：5/5 passed。
- 回归：events/contracts.test.ts + server/ai/tools + lesson-draft.events.test.ts = 4 files / 22 passed。
- `tsc --noEmit`：clean（0 error）。
- `eslint` 两文件：clean（exit 0）。
- Acceptance grep：`dispatchPlatformCommand`≥1、`persistPlatformEvents`≥1、`server-only` 首行、forbidden（generateObject/eval(/process.env，去注释后）count=0、三事件类型断言行≥3。

## Self-Check: PASSED

- FOUND: src/server/ai/agents/lesson-agent.ts
- FOUND: src/server/ai/agents/lesson-agent.test.ts
- FOUND commit: 0d8c3f8 (feat 62-04)
