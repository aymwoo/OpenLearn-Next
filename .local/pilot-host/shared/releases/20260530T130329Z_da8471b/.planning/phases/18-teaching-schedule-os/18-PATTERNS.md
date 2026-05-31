# Phase 18 Pattern map — Teaching schedule OS

## 1. DTO and schema declaration patterns

### Analog: `src/lib/dto/course-authoring.ts`

- 模式：`z.object(...).strict()` 定义输入，`z.object(...)` 定义 DTO，最后统一导出 `type`。
- 适用于：`src/lib/dto/schedule.ts` 中的 import row、agenda card、override form、reminder rule、assistant proposal。

### Analog: `src/lib/dto/classroom.ts`

- 模式：复杂 runtime DTO 先拆小 schema（step、preview、participant），再组合成大 DTO。
- 适用于：teacher/class agenda、row review card、proposal detail card。

## 2. DAL cached read patterns

### Analog: `src/lib/dal/course-authoring.ts`

- 模式：
  - `import "server-only"`
  - `"use cache"`
  - `cacheLife("minutes")`
  - `cacheTag(cacheTags.xxx(...))`
  - 先查 scoped rows，再组装 DTO
- 适用于：
  - `getTeacherDailyAgendaDTO()`
  - `getClassDailyAgendaDTO()`
  - `getScheduleImportBatchDTO()`

## 3. Runtime layering patterns

### Analog: `src/lib/dal/classroom.ts`

- 模式：
  - 已发布/基础模型与运行时状态分层
  - runtime DTO 最终由一处函数统一拼装
  - optimistic/conflict handling 使用结构化 result DTO
- 适用于：
  - recurring schedule vs single-instance override
  - normalized model vs runtime agenda materialization

## 4. Server Action invalidation patterns

### Analog: `src/actions/course-authoring-actions.ts`

- 模式：
  - action 内做 `safeParse(normalizeInput(input))`
  - `assertActiveTeacher()`
  - DAL mutate
  - `updateTag(cacheTags...)`
  - 返回 `{ ok: true | false, error, message }`
- 适用于所有 schedule actions，尤其是 import approve、override save、holiday save、reminder save、assistant approve。

### Analog: `src/actions/lesson-authoring-actions.ts`

- 模式：
  - 结构化错误码，如 `PUBLISH_BLOCKED`
  - 读取 readiness DTO 再决定是否允许写入
- 适用于：
  - `APPROVE_IMPORT_BLOCKED`
  - `SCHEDULE_OVERRIDE_BLOCKED`
  - `SCHEDULE_ASSISTANT_APPROVAL_BLOCKED`

## 5. Surface and route patterns

### Analog: `src/app/(teacher)/teacher/page.tsx`

- 模式：route page 保持极薄，只拉 DAL scope / DTO，然后交给 surface。
- 适用于：`/teacher/schedule`、`/teacher/schedule/import`、`/teacher/schedule/changes`、`/teacher/schedule/reminders`、`/teacher/schedule/assistant`。

### Analog: `src/components/surfaces/teacher-dashboard-surface.tsx`

- 模式：单一 hero + tonal cards + secondary support region；中文 copy；无 1px divider。
- 适用于：teacher daily agenda 首屏、reminder summary、assistant suggestion panel。

## 6. Verification script patterns

### Analog: `scripts/verify-phase17-editor.ts`

- 模式：
  - `readFileSync()` + `existsSync()`
  - `withoutLineComments()` 防止注释误判
  - 先做静态 invariant checks
  - 再跑 targeted `pnpm test --run ...`
- 适用于：`scripts/verify-phase18-schedule.ts`。

## 7. Plugin-safe extension patterns

### Analog: `src/server/plugins/registry.ts`

- 模式：hook anchor 与 action allowlist 全部静态枚举，dispatch 只返回 typed proposal payload。
- 适用于 schedule extension：
  - 新 anchor 仍应固定枚举
  - 新 action 只能是 proposal / draft creation，不可直接 mutate schedule tables

### Analog: `src/lib/dal/plugins.ts`

- 模式：
  - school scope + membership 校验
  - plugin 未启用 / kill-switch / permission denied 时返回 denied path
  - built-in action 最终通过 `dispatchPluginAction()` 返回 typed result
- 适用于 schedule plugin hook resolution。

## 8. Notification boundary patterns

### Analog: `src/server/mcp/registry.ts` + `src/lib/dal/mcp.ts`

- 模式：provider/capability 是 allowlisted seed，action input 显式拒绝 secret material，审计落表。
- 适用于 reminder dispatch：
  - channel 只能选 allowlisted provider/capability
  - dispatch 结果必须有 `planned/sent/failed/retry_required`

## 9. Phase 18 implementation rules derived from patterns

1. `src/lib/dto/schedule.ts` 先一次性把共享 contract 写全，避免后续 plans 反复争抢同一文件。
2. runtime agenda engine 只能出现在 `src/lib/dal/schedule-runtime.ts` 一处，teacher/class surface 共享同一 truth source。
3. 所有 schedule mutation action 都必须显式 `updateTag()` 影响的 import/agenda/calendar/reminder/proposal tags。
4. assistant 与 plugin extension 只能落 `proposal` / `draft`，不能跳过审批直接写 `scheduleOverride` / `scheduleHolidayDate`。
5. 验证脚本必须检查“raw import row 未暴露给 surface”这条边界。
