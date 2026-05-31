# Phase 18 Research — Teaching schedule OS

**Date:** 2026-05-11
**Mode:** standard research
**Goal:** 回答“为了把 Phase 18 计划对，需要先知道什么？”

## Executive summary

- Phase 18 适合沿用现有 `Drizzle + SQLite + DAL + Server Actions + DTO + explicit cache tags`
  基线，不需要新增 ORM、状态机或任务队列依赖。
- 最稳妥的实现边界是把课表域拆成三层：
  1. `Import Layer`：`scheduleImportBatch` / `scheduleImportRow` 保存原始导入、行级校验、映射与审批状态。
  2. `Normalized Schedule Model`：`scheduleTerm`、`scheduleWeekPattern`、`scheduleBellSlot`、`scheduleTeachingAssignment`、`scheduleRecurringEntry`、`scheduleOverride`、`scheduleHolidayCalendar`、`scheduleHolidayDate`、`scheduleReminderRule`、`scheduleMutationAudit`、`scheduleAssistantProposal`。
  3. `Runtime Daily Agenda Engine`：只读取 normalized tables + holiday + override，生成 teacher/class 日程 DTO；禁止直接消费 raw import rows。
- Next.js 16 文档确认：读模型应继续通过 `"use cache" + cacheTag()` 建立缓存边界；写操作必须在 Server Actions 中使用 `updateTag()` 做 read-your-writes。
- Drizzle/SQLite 文档确认：本阶段需要显式 `index()` / `uniqueIndex()` 与 cascade 外键；单次 override 与导入 lineage 更适合通过单独表建模，而不是把 recurring rows 原地改写。

## Locked decisions translated into implementation rules

| Decision | Planning consequence |
|---|---|
| D-01 / D-02 / D-03 | 导入必须先写 staging，行级显示 `校验/映射/冲突/审批`，批准后才事务性写入 normalized model。 |
| D-04 / D-05 / D-06 | 首个 runtime surface 固定为教师个人日程；卡片第一信息层固定展示 `时间 / 班级 / 地点 / 状态`。 |
| D-07 / D-08 / D-09 | override 只做 single-instance；动作范围固定为 `代课 / 停课 / 换时间或教室`；必须保留原始 lineage 与生效日期。 |
| D-10 / D-11 | AI 助手只产出 suggestion / proposal，不直接改表；所有 schedule-affecting write 继续人工确认。 |
| D-12 | reminder 首发只做 `开课前提醒`、`调课变更提醒`。 |
| D-13 / D-14 | 所有课表读写继续只走 DAL + Server Actions，并对 teacher/class/day/import batch 等 cache tags 显式失效。 |
| D-15 | plugin 扩展只加 allowlisted schedule hooks/actions，不新增任意脚本执行或 DB 直连。 |
| D-16 | UI 继续沿用 Stitch / DESIGN 规则：中文、Lexend、tonal surface、单一 hero、无 1px divider。 |

## Recommended domain model

### Import layer

- `scheduleImportBatch`
  - `id`, `schoolId`, `sourceType`, `sourceLabel`, `uploadedById`, `connectorKey`, `status`, `rowCount`, `approvedRowCount`, `rejectedRowCount`, `createdAt`, `updatedAt`
- `scheduleImportRow`
  - `id`, `batchId`, `sourceRowKey`, `rawPayloadJson`, `normalizedDraftJson`, `validationIssuesJson`, `mappingSummaryJson`, `conflictSummaryJson`, `status`, `approvalNote`, `reviewedById`, `reviewedAt`, `createdAt`, `updatedAt`
- Recommended row statuses:
  - `pending_review`
  - `validation_failed`
  - `mapping_review`
  - `conflict_review`
  - `ready_to_apply`
  - `approved`
  - `rejected`

### Normalized schedule model

- `scheduleTerm` — 学期与生效区间
- `scheduleWeekPattern` — 周循环/单双周/轮换周定义
- `scheduleBellSlot` — 节次、开始/结束时间、排序
- `scheduleTeachingAssignment` — `schoolId + classId + courseId + teacherId` 的授课关系
- `scheduleRecurringEntry` — recurring 排课主记录，引用 assignment / term / weekPattern / bellSlot
- `scheduleOverride` — single-instance override，记录 actionType、effectiveDate、replacement fields、original snapshot
- `scheduleHolidayCalendar` / `scheduleHolidayDate` — holiday / non-teaching / make-up day
- `scheduleReminderRule` — pre-class / schedule-change rule、channel、offsetMinutes、recipientScope
- `scheduleMutationAudit` — import apply、override、holiday、reminder、assistant approval 审计
- `scheduleAssistantProposal` — AI / plugin 建议草案、理由、影响范围、审批状态

### Runtime agenda engine

- 输入：`schoolId + date + actor scope`，读取 term、week pattern、bell slots、recurring entries、holiday dates、override
- 优先级建议：
  1. holiday / non-teaching day 阻断 base recurring entry
  2. make-up day / single-instance override 覆盖 base recurring entry
  3. 无覆盖时回落 recurring entry
- 输出 DTO 至少包括：
  - teacher agenda card: `timeLabel`, `classLabel`, `locationLabel`, `status`, `courseTitle`, `overrideSummary`, `lessonLink`
  - class agenda card: `timeLabel`, `teacherLabel`, `locationLabel`, `status`

## Cache and runtime guidance

根据 Next.js 16.2.2 文档：

- schedule 读模型继续放在 server-only DAL 中，并在 cached read 中打 `cacheTag()`。
- schedule 写操作必须在 Server Actions 内调用 `updateTag()`；这是 read-your-writes 的推荐路径。
- 推荐新增 tags：
  - `scheduleImportBatch(batchId)`
  - `scheduleImportSchool(schoolId)`
  - `teacherScheduleAgenda(actorId,dateKey)`
  - `classScheduleAgenda(classId,dateKey)`
  - `scheduleCalendar(schoolId)`
  - `scheduleReminder(schoolId)`
  - `scheduleAssistantProposal(proposalId)`

## Security and safety boundaries

- UI components 不得导入 `db` 或读取 raw import row JSON。
- import apply、override、holiday、reminder、assistant approval 都应复用 teacher/admin school scope 校验。
- assistant / plugin 只创建 `proposal` 或 `draft`，不能直接写 `scheduleRecurringEntry`、`scheduleOverride`、`scheduleHolidayDate`。
- reminder dispatch 通过现有 notification boundary 走 allowlisted provider/capability，不直接塞 secret 到 DTO 或 action input。

## Recommended file layout

- `src/lib/dto/schedule.ts` — 统一 schedule schemas / DTO / inputs
- `src/lib/dal/schedule-import.ts` — import staging + approval write path
- `src/lib/dal/schedule-runtime.ts` — daily agenda engine + reads
- `src/lib/dal/schedule-operations.ts` — override / holiday mutations
- `src/lib/dal/schedule-reminders.ts` — reminder rule + dispatch state
- `src/lib/dal/schedule-assistant.ts` — AI / plugin suggestion proposal read-write
- `src/actions/schedule-import-actions.ts`
- `src/actions/schedule-runtime-actions.ts`（如果 surface 需要 server action style refresh / draft actions）
- `src/actions/schedule-operations-actions.ts`
- `src/actions/schedule-reminder-actions.ts`
- `src/actions/schedule-assistant-actions.ts`
- `src/components/surfaces/teacher-schedule-surface.tsx`
- `src/components/surfaces/schedule-import-review-surface.tsx`
- `src/components/surfaces/schedule-operations-surface.tsx`
- `src/components/surfaces/schedule-reminder-surface.tsx`
- `src/components/surfaces/schedule-assistant-surface.tsx`
- `src/app/(teacher)/teacher/schedule/**`
- `scripts/verify-phase18-schedule.ts`

## Existing pattern reuse

- DTO pattern: `src/lib/dto/course-authoring.ts`, `src/lib/dto/classroom.ts`
- DAL cached read pattern: `src/lib/dal/course-authoring.ts`
- runtime state layering pattern: `src/lib/dal/classroom.ts`
- Server Action + `updateTag()` pattern: `src/actions/course-authoring-actions.ts`, `src/actions/lesson-authoring-actions.ts`
- phase verifier pattern: `scripts/verify-phase16-theme-layout.ts`, `scripts/verify-phase17-editor.ts`
- plugin allowlist pattern: `src/server/plugins/registry.ts`, `src/lib/dal/plugins.ts`
- notification capability boundary: `src/server/mcp/registry.ts`, `src/lib/dal/mcp.ts`

## Don’t hand-roll / don’t do this

- 不要把 raw import rows 直接当 UI DTO 或 agenda source。
- 不要把 single-instance override 回写成新的 recurring schedule。
- 不要让 holiday 只是 UI 注释；它必须进入 runtime engine。
- 不要让 AI / plugin 直接调用 schedule write DAL。
- 不要为 schedule page 新建平行主题系统、平行 auth 路径或客户端 state source of truth。

## Common pitfalls

1. **导入与运行时耦合**：如果 surface 直接看 `scheduleImportRow.rawPayloadJson`，D-03 会立刻失效。
2. **override 覆盖基础排课**：这会丢失 lineage，违反 D-09。
3. **agenda 非确定性**：如果不同 surface 各自拼接 holiday/override，teacher/class 视图会漂移。
4. **只做 toast 成功反馈**：UI-SPEC 明确要求 surface 内 success region 与 read-your-writes summary。
5. **提醒外扩到家长/学生**：这是 deferred idea，不应出现在首发计划中。
6. **把学校级调度总览做成主 hero**：违反 D-04 与 deferred 约束。

## Testing strategy

- `src/lib/dal/schedule-import.test.ts`：row validation、conflict detection、approval transaction
- `src/lib/dal/schedule-runtime.test.ts`：holiday / override precedence、teacher/class deterministic agenda
- `src/lib/dal/schedule-operations.test.ts`：single-instance override lineage、holiday mutation
- `src/lib/dal/schedule-reminders.test.ts`：eligible reminder selection、status transition
- `src/lib/dal/schedule-assistant.test.ts`：proposal-only assistant behavior、approval gate
- surface tests：review surface、teacher schedule surface、operations surface、reminder surface、assistant surface
- `pnpm verify:phase18`：静态边界检查 + focused regression

## Dependency caution

- ROADMAP 标记 Phase 18 依赖 Phase 14/15，但本阶段计划应只依赖已经存在的 `school / class / course / lesson / plugin / theme` 基线，避免要求先完成 course lifecycle 或 batch course import UI 才能落地课表系统。
- 若实现中需要课程归档/批量导入的额外约束，可在 action 层复用现有 teacher-owned scope，而不是等待未完成 phase 补齐。

## Research conclusion

Phase 18 可以在当前代码库内被拆成 6 个可执行 plans：

1. schema + DTO + cache foundation
2. import review workflow
3. runtime daily agenda engine + teacher surface
4. single-instance override + holiday management
5. reminder orchestration
6. AI assistant + plugin-safe extension + phase verifier

不需要先引入新框架；关键是把三层边界、审批门槛、cache invalidation 和 allowlisted extension 一次性锁准。
