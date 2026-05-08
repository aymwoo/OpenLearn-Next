---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 03
subsystem: plugin
tags: [plugin, built-in, registry, labs, seed]
requires:
  - phase: 12-classroom-launch-and-built-in-teaching-steps
    provides: dedicated teacher launch surface and inline published-lesson preview
provides:
  - built-in plugin metadata contract for first-party teaching steps
  - dev bootstrap seed records for five default-enabled built-in plugins
  - labs management cards that label system-provided plugins and suppress deletion affordances
affects: [plugin-management, lesson-authoring, bootstrap-dev-db, safe-plugin-registry]
tech-stack:
  added: []
  patterns: [manifest-backed built-in metadata, non-deletable built-in plugin guard, bootstrap upsert for first-party plugins]
key-files:
  created: []
  modified:
    - scripts/bootstrap-dev-db.ts
    - src/lib/dto/resource-ai.ts
    - src/lib/dal/plugins.ts
    - src/actions/plugin-actions.ts
    - src/components/surfaces/settings-surface.tsx
key-decisions:
  - "内置教学环节元数据直接并入 PluginManifestSchema 与 PluginRegistrationDTO，避免 UI 通过名称猜测系统插件身份。"
  - "内置插件继续走现有 registry/DAL 启停链路，但删除路径在 DAL 层统一返回 `PLUGIN_BUILT_IN_NOT_DELETABLE`。"
  - "开发环境通过 bootstrap upsert 五个内置教学环节插件，并默认启用，保证 authoring 与管理界面共享同一真实数据源。"
patterns-established:
  - "Built-in plugin contract: builtIn/defaultEnabled/nonDeletable from manifest -> DAL -> Server Action -> labs UI"
  - "Built-in plugin safety: allow disable and re-enable, never expose normal delete path for system-provided entries"
requirements-completed: [PLUGIN-04, PLUGIN-05]
duration: 2 min
completed: 2026-05-08
---

# Phase 12 Plan 03: Built-in teaching-step plugin registry Summary

**系统现在会以真实 registry 记录预置五个内置教学环节插件，并在实验室插件管理界面明确标注 `系统内置`、`默认开启` 且禁止删除。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T15:42:26Z
- **Completed:** 2026-05-08T15:44:35Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- 扩展插件 DTO 与 DAL，让 built-in / default-enabled / non-deletable 成为 typed registry contract，而不是 UI 常量。
- 在开发数据库 bootstrap 中 upsert 五个内置教学环节插件：`教师讲授`、`问卷调查`、`学生探究`、`课堂测验`、`评价`，并默认启用。
- 更新 labs 插件管理卡片，把内置插件展示为系统提供的可运行时启停项，不再呈现普通删除语义。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schema and DAL support for built-in plugin metadata and delete guard** - `cf63cdb` (feat)
2. **Task 2: Seed the five built-in teaching-step plugins as default-enabled records** - `3f753c6` (feat)
3. **Task 3: Label built-in plugins clearly in labs or marketplace management surfaces** - `ed20f79` (feat)

## Files Created/Modified

- `src/lib/dto/resource-ai.ts` - 为插件 manifest 与 registration DTO 增加 built-in、defaultEnabled、nonDeletable 元数据。
- `src/lib/dal/plugins.ts` - 透传内置插件元数据、注册时尊重默认启用状态，并在删除路径阻止内置插件被移除。
- `src/actions/plugin-actions.ts` - 统一透传 DAL 返回的稳定错误码，包括内置插件不可删除错误。
- `scripts/bootstrap-dev-db.ts` - 以 schema-valid declarative manifest upsert 五个内置教学环节插件并默认启用。
- `src/components/surfaces/settings-surface.tsx` - 在 labs 插件卡片上优先展示 `系统内置`、`默认开启`，并把主按钮改为 `停用环节` / `重新启用`。

## Decisions Made

- 将内置插件元数据放进 manifest schema，而不是额外维护 UI-only 配置，确保 threat model 要求的 typed registry truth 成立。
- 删除保护放在 DAL，而不是界面层条件判断，避免任何调用方绕过 labs UI 直接删除系统插件。
- 保持内置插件仍可启停，符合 Phase 12 对“默认开启但允许停用”的产品要求。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-04 现在可以直接基于真实 seeded built-in plugin records 扩展 authoring/runtime 集成，而不必再硬编码系统教学环节列表。
- 插件管理界面已经具备区分系统内置与普通扩展的基础文案与行为约束，后续 marketplace 或 authoring 暴露可复用同一元数据链路。

## Self-Check: PASSED

- Found file: `scripts/bootstrap-dev-db.ts`
- Found file: `src/lib/dto/resource-ai.ts`
- Found file: `src/lib/dal/plugins.ts`
- Found file: `src/actions/plugin-actions.ts`
- Found file: `src/components/surfaces/settings-surface.tsx`
- Found commit: `cf63cdb`
- Found commit: `3f753c6`
- Found commit: `ed20f79`
