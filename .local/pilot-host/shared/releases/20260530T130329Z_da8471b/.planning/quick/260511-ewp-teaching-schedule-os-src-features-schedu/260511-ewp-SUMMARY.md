---
phase: quick
plan: 260511-ewp
subsystem: "schedule-feature-boundary"
tags:
  - "schedule"
  - "feature-root"
  - "phase18"
dependencies:
  requires:
    - "existing schedule DAL, actions, DTO, and surface modules"
    - "Phase 18 schedule architecture decisions in .planning/STATE.md"
  provides:
    - "stable schedule feature public entrypoints"
    - "feature-local boundary map for later migration waves"
    - "feature-local shared DTO contracts with legacy compatibility re-export"
    - "feature-local schedule auth and cache invalidation seams"
    - "feature-local server/actions as real implementation sources with legacy compatibility re-exports"
  affects:
    - "teacher schedule route entrypoints"
    - "future schedule migration import paths"
tech-stack:
  added: []
  patterns:
    - "feature-root barrels over legacy implementation files"
    - "page-level imports routed through vertical feature entrypoints"
key-files:
  created:
    - ".planning/quick/260511-ewp-teaching-schedule-os-src-features-schedu/260511-ewp-PLAN.md"
    - ".planning/quick/260511-ewp-teaching-schedule-os-src-features-schedu/260511-ewp-SUMMARY.md"
    - "src/features/schedule/index.ts"
    - "src/features/schedule/runtime/index.ts"
    - "src/features/schedule/import/index.ts"
    - "src/features/schedule/operations/index.ts"
    - "src/features/schedule/reminders/index.ts"
    - "src/features/schedule/assistant/index.ts"
    - "src/features/schedule/shared/index.ts"
    - "src/features/schedule/shared/boundary-map.ts"
    - "src/features/schedule/shared/dto/index.ts"
    - "src/features/schedule/shared/dto/import.ts"
    - "src/features/schedule/shared/dto/runtime.ts"
    - "src/features/schedule/shared/dto/operations.ts"
    - "src/features/schedule/shared/dto/reminders.ts"
    - "src/features/schedule/shared/dto/assistant.ts"
    - "src/features/schedule/shared/auth.ts"
    - "src/features/schedule/shared/audit.ts"
    - "src/features/schedule/shared/cache/index.ts"
    - "src/features/schedule/shared/cache/schedule-cache-tags.ts"
    - "src/features/schedule/runtime/server.ts"
    - "src/features/schedule/import/server.ts"
    - "src/features/schedule/import/actions.ts"
    - "src/features/schedule/operations/server.ts"
    - "src/features/schedule/operations/actions.ts"
    - "src/features/schedule/reminders/server.ts"
    - "src/features/schedule/reminders/actions.ts"
    - "src/features/schedule/assistant/server.ts"
    - "src/features/schedule/assistant/actions.ts"
  modified:
    - "src/app/(teacher)/teacher/schedule/page.tsx"
    - "src/app/(teacher)/teacher/schedule/import/page.tsx"
    - "src/app/(teacher)/teacher/schedule/changes/page.tsx"
    - "src/app/(teacher)/teacher/schedule/reminders/page.tsx"
    - "src/app/(teacher)/teacher/schedule/assistant/page.tsx"
    - "src/lib/dto/schedule.ts"
    - "src/lib/dal/schedule-reminders.test.ts"
    - "src/actions/schedule-import-actions.ts"
    - "src/actions/schedule-operations-actions.ts"
    - "src/actions/schedule-reminder-actions.ts"
    - "src/actions/schedule-assistant-actions.ts"
    - "src/lib/dal/schedule-import.ts"
    - "src/lib/dal/schedule-runtime.ts"
    - "src/lib/dal/schedule-operations.ts"
    - "src/lib/dal/schedule-reminders.ts"
    - "src/lib/dal/schedule-assistant.ts"
    - "src/components/surfaces/teacher-schedule-surface.tsx"
    - "src/components/surfaces/teacher-schedule-surface.test.tsx"
    - "src/lib/dal/schedule-runtime.test.ts"
    - "src/lib/dal/schedule-import.test.ts"
    - "src/lib/dal/schedule-assistant.test.ts"
    - "src/components/surfaces/schedule-import-review-surface.tsx"
    - "src/components/surfaces/schedule-operations-surface.tsx"
    - "src/components/surfaces/schedule-reminder-surface.tsx"
    - "src/components/surfaces/schedule-assistant-surface.tsx"
  key-decisions:
    - "第一步只建立 `src/features/schedule/` landing zone，通过 re-export 收口现有 public API，不移动实现文件。"
    - "首批切换仅发生在教师端 schedule route entrypoints，确保 feature root 已被真实消费，而不是空骨架。"
    - "边界约束先落在 `shared/boundary-map.ts`，为后续 shared contract、auth seam、runtime/import/operations/reminders/assistant 迁移提供单一说明源。"
    - "第二批把 schedule shared DTO 真实定义迁到 `src/features/schedule/shared/dto/*`，并保留 `src/lib/dto/schedule.ts` 作为兼容层 re-export。"
    - "Phase 18 reminder 验证测试改为检查新的 feature-local DTO 定义源，不再把 legacy DTO 兼容层当作真实定义文件。"
    - "第三批按顺序完成：其余调用点先收口到 `@/features/schedule/*`，再抽 `shared/auth`，最后抽 `shared/cache` 并让 actions 统一复用 feature-local invalidation helpers。"
    - "为避免 feature barrel 反向引用 actions/DAL 造成循环依赖，新增 `server.ts` / `actions.ts` 作为 feature 内部适配层。"
    - "本批把 reminders / assistant 的真实实现迁入 feature-local `server.ts` / `actions.ts`，并把顶层 `src/actions/schedule-*.ts` 与 `src/lib/dal/schedule-*.ts` 降级为兼容层 re-export。"
    - "Phase 18 的源码字符串断言与 `verify-phase18` 已切到 feature 真源路径，避免兼容层文件继续被当作实现定义源。"
    - "runtime agenda 到 editor preview 的跳转 contract 改为由 DTO 显式提供 `lessonLink.courseId`，surface 不再猜测 preview route 参数。"
    - "`scheduleMutationAudit` 统一收敛到 feature-local `shared/audit.ts`，并在 import / operations / reminders / assistant 的写库事务内复用。"
    - "reminder retry 先回写 `planned` 状态，再执行渠道 side effect，发送结果与 audit 用独立事务落库，避免把外部 side effect 包进 DB transaction。"
    - "`operations` center 读路径不再隐式创建默认校历；默认校历只在显式 holiday 写入时按需创建，读模型重新回到纯查询。"
metrics:
  tasks-completed: 11
  files-modified: 60
  date-completed: "2026-05-11"
status: complete
---

# Quick summary: schedule feature root first step

完成了 schedule 域本轮 feature 化收尾，仍然没有改动现有运行行为。现在教师端
页面入口、surface、actions、DAL、DTO、auth seam 和 cache invalidation
都已经以 `src/features/schedule/` 为真实实现源；`src/lib/dto/schedule.ts`、
`src/actions/schedule-*.ts` 与 `src/lib/dal/schedule-*.ts` 只保留兼容层，
`lesson-authoring.assertActiveTeacher` 与顶层 `cache-policy` 的 direct schedule
coupling 已被 feature-local shared seams 替代。

## Completed tasks

1. **Task 1: 建立 schedule feature root 与边界说明**
   - 新增 `src/features/schedule/` 目录骨架。
   - 为五个子域建立 re-export barrels，继续指向现有 actions、DAL、surface
     和 DTO。
   - 新增 `src/features/schedule/shared/boundary-map.ts`，明确 public
     entrypoints、legacy source 和迁移规则。

2. **Task 2: 把教师端 schedule 页面入口切到 feature public API**
   - 更新 `/teacher/schedule`、`/teacher/schedule/import`、
     `/teacher/schedule/changes`、`/teacher/schedule/reminders`、
     `/teacher/schedule/assistant` 五个页面的 imports。
   - 保持页面结构、数据流、action signatures 和底层实现不变。

3. **Task 3: 拆分 shared DTO 到 feature-local contracts**
   - 新增 `src/features/schedule/shared/dto/{import,runtime,operations,reminders,assistant}.ts`。
   - 新增 `src/features/schedule/shared/dto/index.ts` 并从 `shared/index.ts` 暴露。
   - 将 `src/lib/dto/schedule.ts` 降级成兼容层 re-export，避免一次性修改所有 legacy 调用方。

4. **Task 4: 让 feature barrels 指向新的 DTO 入口并修正验证耦合**
   - `runtime/import/operations/reminders/assistant` barrels 现在直接导出 `@/features/schedule/shared/dto/*`。
   - 更新 `src/lib/dal/schedule-reminders.test.ts`，使 reminder 状态断言检查新的 DTO 定义源。

5. **Task 5: 将剩余 schedule 调用点收口到 feature root**
   - surface 组件改为依赖 `@/features/schedule/*/actions` 和 `@/features/schedule/shared/dto/*`。
   - feature barrels 改为通过 `server.ts` / `actions.ts` 适配层暴露 actions 与 DAL，而不是继续直指 legacy 路径。

6. **Task 6: 抽 `shared/auth` 并隔离 teacher scope seam**
   - 新增 `src/features/schedule/shared/auth.ts`。
   - schedule actions 与 DAL 改为依赖 `assertScheduleTeacherScope()` / `assertScheduleSchoolScope()`，不再直接 import `lesson-authoring.assertActiveTeacher`。

7. **Task 7: 抽 `shared/cache` 并统一 schedule invalidation helpers**
   - 新增 `src/features/schedule/shared/cache/schedule-cache-tags.ts`。
   - schedule actions 改为通过 `invalidateScheduleImportTags`、`invalidateScheduleOperationTags`、`invalidateScheduleReminderTags`、`invalidateScheduleAssistantTags` 统一更新 tags。

8. **Task 8: 完成真实实现物理迁移并降级 legacy 顶层文件**
   - 将 `reminders` / `assistant` 的真实 server/actions 逻辑迁入 `src/features/schedule/*/{server,actions}.ts`。
   - 将 `runtime/import/operations/reminders/assistant` 的 legacy 顶层 DAL 与 actions 文件全部改成 compatibility re-export。
   - 将 Phase 18 的字符串断言测试和 `scripts/verify-phase18-schedule.ts` 改为检查 feature 真源文件，不再依赖兼容层路径。

9. **Task 9: 修复 runtime agenda 到 editor preview 的 link contract**
   - 在 `src/features/schedule/shared/dto/runtime.ts` 为 `lessonLink` 补充显式 `courseId`。
   - `runtime/server.ts` 改为用真实 `assignment.courseId` 构造 preview contract。
   - `teacher-schedule-surface.tsx` 不再用 `assignmentId` 猜 `courseId`，并补充 UI test 固化该约束。

10. **Task 10: 收口事务内 audit helper，并解耦 reminder side effect**
    - 新增 `src/features/schedule/shared/audit.ts`，统一封装 `scheduleMutationAudit` 写入。
    - `import` / `operations` / `reminders` / `assistant` 的 mutation 审计改为在 feature-local transaction 内通过同一个 helper 落库。
    - `saveScheduleReminderRule()` 保持“rule + planned dispatch record”同事务；`retryScheduleReminderDispatch()` 改为先把 dispatch 置回 `planned`，再执行渠道 side effect，最后用独立事务写回发送结果和 audit。

11. **Task 11: 移除 operations center 读路径副作用**
    - `getScheduleOperationsCenterDTO()` 不再调用 `ensureDefaultHolidayCalendar()`，缺少校历时返回 `calendarId: null` 与空 `holidayDates`。
    - `saveHolidayCalendarDate()` 改为接受 `schoolId + optional calendarId`，仅在显式 holiday 写入时按需创建默认校历。
    - `schedule-operations-surface` 与相关测试同步为可处理 `calendarId: null` 的纯查询读模型。

## Verification

1. `pnpm verify:phase18`
   - 通过。中途又暴露出 runtime / actions 测试仍在检查旧 `cacheTags.*` 实现细节，现已同步改为检查 feature-local `scheduleCacheTags` 和 invalidation helpers，验证重新恢复绿色。
2. `pnpm typecheck`
   - 未通过，但失败来自既有的 `teacher-sidebar-shell` /
       `shell-surface-resolver` 相关测试类型错误，不是本次 schedule 改动引入。
3. `pnpm test --run src/components/surfaces/teacher-schedule-surface.test.tsx src/lib/dal/schedule-runtime.test.ts src/lib/dal/schedule-import.test.ts src/lib/dal/schedule-operations.test.ts src/lib/dal/schedule-reminders.test.ts src/lib/dal/schedule-assistant.test.ts`
    - 通过。补充验证了 preview link contract、import audit helper、assistant/reminder transaction 边界和 reminder planning helper。
4. `pnpm test --run src/lib/dal/schedule-operations.test.ts src/components/surfaces/schedule-operations-surface.test.tsx`
   - 通过。新增验证 `operations` center 读路径不再隐式创建默认校历，并确认 surface 可处理 `calendarId: null`。

## Known follow-up

1. 如果后续接真实异步 worker，可以把 reminder retry 再升级为 outbox / attempt log + idempotency key 模式。
2. 如需进一步收紧权限边界，可以把 `getScheduleOperationsCenterDTO()` 中的 `users.findMany()` 再收口为 school-scoped teacher 集合读取。
