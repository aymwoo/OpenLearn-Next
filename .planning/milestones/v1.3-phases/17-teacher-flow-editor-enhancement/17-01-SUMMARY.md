---
phase: 17-teacher-flow-editor-enhancement
plan: 01
subsystem: api
tags: [lesson-authoring, zod, dal, server-actions, publish-readiness, built-in-plugins]
requires:
  - phase: 12-theme-plugins-and-layout-orchestration
    provides: built-in teaching-step plugin registry and safe template metadata
provides:
  - built-in lesson step provenance persisted in authoring payloads
  - teacher-owned preview and publish-readiness DTO helpers
  - publish action blocking path that reuses readiness checks
affects: [teacher-editor, lesson-preview, publish-flow, plugin-registry]
tech-stack:
  added: []
  patterns: [teacher-owned readiness DTOs, structured publish blocking, built-in provenance metadata]
key-files:
  created: [.planning/phases/17-teacher-flow-editor-enhancement/17-01-SUMMARY.md]
  modified:
    [src/lib/dto/lesson-authoring.ts, src/lib/dto/resource-ai.ts, src/lib/dal/lesson-authoring.ts, src/lib/dal/lesson-authoring.test.ts, src/actions/lesson-authoring-actions.ts, src/actions/lesson-authoring-actions.test.ts]
key-decisions:
  - "把 builtInSource 持久化到 lesson step payload，后续 preview/readiness 不再依赖 UI 推断插件来源。"
  - "publish readiness 收口在 teacher-owned DAL，并由 editor DTO 与 publish action 共用。"
  - "发布阻断通过 PUBLISH_BLOCKED 结构化返回 issues，而不是只依赖前端提示。"
patterns-established:
  - "Lesson readiness contract: DAL safe-parse raw step payloads and emit stable issue codes."
  - "Built-in plugin validation: persisted provenance is checked against enabled school-scoped registry records."
requirements-completed: [LESSON-03, LESSON-04, LESSON-08, PLUGIN-01, PLUGIN-02]
duration: 3 min
completed: 2026-05-10
---

# Phase 17 Plan 01: Teacher flow editor backend contract summary

**通过 builtInSource 元数据、teacher-owned readiness/preview DTO 和结构化发布阻断，把教师流程编辑器的预览与发布校验合同落到现有 lesson authoring 服务端链路。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-10T16:57:49+08:00
- **Completed:** 2026-05-10T09:01:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 为 `content`、`task`、`quiz` 步骤 payload 增加 `builtInSource`，保留 built-in teaching-step 的插件来源。
- 在 lesson authoring DAL 中新增 preview/readiness DTO，统一输出发布阻断 issue codes 与教师预览数据。
- 让 `publishLessonAction()` 在生成 snapshot 前复用 readiness 检查，并返回 `PUBLISH_BLOCKED` 结构化结果。

## Task Commits

Each task was committed atomically:

1. **Task 1: Define built-in provenance and teacher preview/readiness DTO contracts** - `247b78b` (test), `70e0bad` (feat)
2. **Task 2: Enforce publish readiness through the existing lesson authoring actions** - `d59a8a9` (test), `a0e4ea8` (feat)

## Files Created/Modified

- `src/lib/dto/lesson-authoring.ts` - 增加 built-in provenance、readiness issue、teacher preview DTO 合同。
- `src/lib/dto/resource-ai.ts` - 复用统一的 `BuiltInTeachingStepKeySchema`。
- `src/lib/dal/lesson-authoring.ts` - 新增 `getLessonPublishReadinessDTO()` 与 `getTeacherLessonPreviewDTO()`，并在 editor/publish 路径复用。
- `src/lib/dal/lesson-authoring.test.ts` - 增加 provenance、blocking issues、preview DTO 回归测试。
- `src/actions/lesson-authoring-actions.ts` - 在发布 action 中接入 readiness gate 并返回 `PUBLISH_BLOCKED`。
- `src/actions/lesson-authoring-actions.test.ts` - 增加 blocked publish、cache invalidation 与错误映射测试。

## Decisions Made

- 使用 `builtInSource` 持久化 `pluginId`、`builtInKey`、`pluginName`，避免 built-in step 写入后丢失来源。
- readiness 直接 safe-parse 原始 step payload，并输出 `LESSON_TITLE_REQUIRED`、`LESSON_OBJECTIVE_REQUIRED`、`NO_ACTIVE_STEPS`、`STEP_PAYLOAD_INVALID`、`BUILT_IN_PLUGIN_UNAVAILABLE` 等稳定代码。
- teacher preview 只返回未归档且 payload 有效的步骤，并暴露 `builtInSourceLabel` 给后续 preview UI 使用。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 预览路由与编辑器 UI 可以直接复用新的 teacher preview/readiness DTO。
- 发布面板可以消费结构化 `blockingIssues`，无需再自行推导最小字段校验。

## Self-Check: PASSED

---

*Phase: 17-teacher-flow-editor-enhancement*
*Completed: 2026-05-10*
