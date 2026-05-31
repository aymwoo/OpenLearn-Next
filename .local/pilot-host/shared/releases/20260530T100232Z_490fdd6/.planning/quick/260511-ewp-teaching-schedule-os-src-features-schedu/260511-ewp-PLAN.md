---
phase: quick
plan: 260511-ewp
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(teacher)/teacher/schedule/page.tsx
  - src/app/(teacher)/teacher/schedule/import/page.tsx
  - src/app/(teacher)/teacher/schedule/changes/page.tsx
  - src/app/(teacher)/teacher/schedule/reminders/page.tsx
  - src/app/(teacher)/teacher/schedule/assistant/page.tsx
  - src/features/schedule/index.ts
  - src/features/schedule/runtime/index.ts
  - src/features/schedule/import/index.ts
  - src/features/schedule/operations/index.ts
  - src/features/schedule/reminders/index.ts
  - src/features/schedule/assistant/index.ts
  - src/features/schedule/shared/index.ts
  - src/features/schedule/shared/boundary-map.ts
autonomous: true
requirements:
  - QUICK-schedule-feature-root-first-step
must_haves:
  truths:
    - "先建立 `src/features/schedule/` landing zone，并通过 re-export 收口现有 schedule public API。"
    - "首批改动不移动底层实现，不修改 Phase 18 既有行为。"
    - "教师端 schedule 页面入口优先改为从 feature root 导入。"
  artifacts:
    - path: "src/features/schedule/index.ts"
      provides: "schedule feature public API 根入口"
    - path: "src/features/schedule/shared/boundary-map.ts"
      provides: "当前边界与迁移规则说明"
    - path: "src/app/(teacher)/teacher/schedule/page.tsx"
      provides: "教师端 runtime 页面从 feature root 读取"
  key_links:
    - from: "src/features/schedule/runtime/index.ts"
      to: "src/lib/dal/schedule-runtime.ts"
      via: "re-export"
      pattern: "getTeacherDailyAgendaDTO"
    - from: "src/features/schedule/import/index.ts"
      to: "src/actions/schedule-import-actions.ts"
      via: "re-export"
      pattern: "approveScheduleImportAction"
    - from: "src/features/schedule/shared/boundary-map.ts"
      to: "src/app/(teacher)/teacher/schedule/**/*.tsx"
      via: "entrypoint guidance"
      pattern: "@/features/schedule/*"
---

<objective>
建立 `src/features/schedule/` 最小可用骨架，让 schedule 域从页面入口层开始具备单一 feature root，同时保持现有实现与行为完全不变。

Purpose: 先把 schedule 能力从横向散点 import 收口到 feature public API，降低后续拆 DTO、抽 auth seam、迁移 runtime/import/operations/reminders/assistant 的摩擦。
Output: 一组 schedule feature barrels、一个边界说明文件，以及改为从 feature root 导入的教师端 schedule 页面入口。
</objective>

<context>
@.planning/STATE.md
@.planning/quick/260511-ewp-teaching-schedule-os-src-features-schedu/260511-ewp-RESEARCH.md
@src/app/(teacher)/teacher/schedule/page.tsx
@src/app/(teacher)/teacher/schedule/import/page.tsx
@src/app/(teacher)/teacher/schedule/changes/page.tsx
@src/app/(teacher)/teacher/schedule/reminders/page.tsx
@src/app/(teacher)/teacher/schedule/assistant/page.tsx
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: 创建 schedule feature root 和子域 barrels</name>
  <files>src/features/schedule/index.ts, src/features/schedule/runtime/index.ts, src/features/schedule/import/index.ts, src/features/schedule/operations/index.ts, src/features/schedule/reminders/index.ts, src/features/schedule/assistant/index.ts, src/features/schedule/shared/index.ts, src/features/schedule/shared/boundary-map.ts</files>
  <action>新增 `src/features/schedule/` 目录骨架。每个子域 barrel 只做 re-export，继续指向现有 actions、DAL、surface、DTO；`shared/boundary-map.ts` 明确当前 legacy source、public entrypoints 和迁移规则。不要移动实现文件，不要新增行为代码。</action>
  <done>仓库出现稳定的 schedule feature root，后续页面和模块可优先依赖 `@/features/schedule/*`。</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: 把教师端 schedule 页面入口切到 feature public API</name>
  <files>src/app/(teacher)/teacher/schedule/page.tsx, src/app/(teacher)/teacher/schedule/import/page.tsx, src/app/(teacher)/teacher/schedule/changes/page.tsx, src/app/(teacher)/teacher/schedule/reminders/page.tsx, src/app/(teacher)/teacher/schedule/assistant/page.tsx</files>
  <action>将五个教师端 schedule 入口页面的 imports 改成 `@/features/schedule/*`，不改组件结构、不改数据流、不改 action signatures。</action>
  <done>页面入口不再直接依赖 `@/lib/dal/schedule-*` 或 `@/components/surfaces/*schedule*` 路径。</done>
</task>

</tasks>

<verification>
- `pnpm typecheck`
- `pnpm verify:phase18`
</verification>

<success_criteria>
- [ ] `src/features/schedule/` 存在可消费的 public barrels
- [ ] 教师端 schedule 页面入口通过 feature root 导入
- [ ] 现有行为不变，验证脚本继续通过
</success_criteria>

<output>
After completion, create `.planning/quick/260511-ewp-teaching-schedule-os-src-features-schedu/260511-ewp-SUMMARY.md`
</output>
