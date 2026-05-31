# Quick research: Teaching Schedule OS feature boundary governance

**Researched:** 2026-05-11  
**Scope:** `schedule` 代码边界、事务边界、AI coupling、迁移计划  
**Confidence:** HIGH（现状判断） / MEDIUM（目标结构建议）

## Summary

当前 `schedule` 能力在“导入 / 运行时 agenda / 单次调课 / reminders /
assistant proposal”这五个子域上，领域意图已经存在，但物理位置仍分散在
`src/actions/*`、`src/lib/dal/*`、`src/components/surfaces/*`、
`src/lib/dto/schedule.ts` 四个顶层区域，导致 feature public API、共享事务
helper、AI contract、editor integration 都没有收口到单一 feature root。
[VERIFIED: src/actions/schedule-*.ts, src/lib/dal/schedule-*.ts,
src/components/surfaces/*schedule*.tsx, src/lib/dto/schedule.ts]

好消息是，Phase 18 约束里要求的
`Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine`
主边界基本被代码遵守：`schedule-runtime.ts` 不读取 `scheduleImportRow`，
`schedule-import.ts` 也确实先写 staging batch/rows，再在事务里批准写入
`scheduleTerm / scheduleWeekPattern / scheduleBellSlot /
scheduleTeachingAssignment / scheduleRecurringEntry`。
[VERIFIED: .planning/STATE.md, src/lib/dal/schedule-runtime.ts,
src/lib/dal/schedule-import.ts, src/lib/dal/schedule-runtime.test.ts]

主要治理风险不在“有没有分层”，而在“跨子域的边界还不够硬”：
`scheduleMutationAudit` 不是事务内统一附属写入、reminder dispatch 把外部副作
用和状态落库耦在一起、AI proposal vocabulary 在 schedule assistant 与 plugin
registry 之间不一致、schedule save/undo 只有 audit 没有可回滚快照契约。
[VERIFIED: src/lib/dal/schedule-operations.ts,
src/lib/dal/schedule-reminders.ts, src/lib/dal/schedule-assistant.ts,
src/lib/dto/resource-ai.ts, src/server/plugins/registry.ts,
src/db/schema.ts]

**Primary recommendation:** 先做一个“不改行为”的原子 first step：创建
`src/features/schedule/` 目标骨架与 feature public barrels，把现有模块通过
re-export 收口到 feature root；随后第一批只迁移 shared contracts 与 runtime
query seam，再分批迁移 import / operations / reminders / assistant。
[ASSUMED]

## Project constraints (from AGENTS.md)

- UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。
  [VERIFIED: AGENTS.md]
- Runtime 以 Node.js 20.9+ 为主，Edge Runtime 仅用于 SSE；复杂 DB/Auth 逻辑不
  应放到 Edge。 [VERIFIED: AGENTS.md]
- Next.js 16 必须显式缓存，写入后必须更新或失效 tag。 [VERIFIED: AGENTS.md]
- SQLite 首发，关联需 `cascade delete`。 [VERIFIED: AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。
  [VERIFIED: AGENTS.md]
- Phase 18 已锁定：课表系统必须采用
  `Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine`
  三层架构；AI assistant 与插件扩展必须保持 proposal-only，approval 最多创建
  draft，不得直接改 runtime schedule。 [VERIFIED: .planning/STATE.md]

## Architectural responsibility map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Schedule import staging/review | API / Backend | Database | 导入校验、映射、冲突分类和批准入库都在 DAL/Server Action 完成，UI 只做 review。 [VERIFIED: src/actions/schedule-import-actions.ts, src/lib/dal/schedule-import.ts, src/components/surfaces/schedule-import-review-surface.tsx] |
| Normalized daily agenda runtime | API / Backend | Database | 运行时 agenda 由服务端聚合 recurring entry、override、holiday 后输出 DTO。 [VERIFIED: src/lib/dal/schedule-runtime.ts] |
| Single-instance override / holiday ops | API / Backend | Database | 调课与校历写路径都在 Server Action -> DAL，且要求审计与缓存失效。 [VERIFIED: src/actions/schedule-operations-actions.ts, src/lib/dal/schedule-operations.ts] |
| Reminder rule + dispatch state | API / Backend | External channel infra | rule 与 dispatch 状态在数据库，实际发送经 `server/schedule/reminder-dispatch.ts`。 [VERIFIED: src/lib/dal/schedule-reminders.ts, src/server/schedule/reminder-dispatch.ts] |
| AI schedule proposal moderation | API / Backend | Browser / Client | proposal 创建、审批、拒绝都在服务端；客户端 surface 只做审批交互。 [VERIFIED: src/actions/schedule-assistant-actions.ts, src/lib/dal/schedule-assistant.ts, src/components/surfaces/schedule-assistant-surface.tsx] |
| Editor preview jump from schedule runtime | Browser / Client | API / Backend | 当前从 agenda card 直接拼 preview URL，客户端握有 route contract。 [VERIFIED: src/components/surfaces/teacher-schedule-surface.tsx, src/app/(teacher)/teacher/editor/preview/page.tsx] |

## Current schedule feature boundary map

### Current physical layout

| Subdomain | Read / write entrypoints | UI entrypoint | Shared dependencies | Boundary assessment |
|---|---|---|---|---|
| Runtime agenda | `src/lib/dal/schedule-runtime.ts` | `teacher-schedule-surface.tsx` + `/teacher/schedule/page.tsx` | `db/schema`, `cacheTags`, `assertActiveTeacher`, `dto/schedule.ts` | 领域清晰，但未进入 feature root；page 直接 import DAL。 [VERIFIED: src/lib/dal/schedule-runtime.ts, src/components/surfaces/teacher-schedule-surface.tsx, src/app/(teacher)/teacher/schedule/page.tsx] |
| Import review/apply | `src/actions/schedule-import-actions.ts` + `src/lib/dal/schedule-import.ts` | `schedule-import-review-surface.tsx` | `dto/schedule.ts`, `cacheTags`, `assertActiveTeacher` | 分层最完整，但仍散落在顶层 actions/dal/surfaces。 [VERIFIED: src/actions/schedule-import-actions.ts, src/lib/dal/schedule-import.ts, src/components/surfaces/schedule-import-review-surface.tsx] |
| Operations (override + holiday) | `src/actions/schedule-operations-actions.ts` + `src/lib/dal/schedule-operations.ts` | `schedule-operations-surface.tsx` | `scheduleMutationAudit`, `cacheTags`, `assertActiveTeacher` | 写路径清晰，但 audit/默认校历创建没有统一 command service。 [VERIFIED: src/actions/schedule-operations-actions.ts, src/lib/dal/schedule-operations.ts] |
| Reminders | `src/actions/schedule-reminder-actions.ts` + `src/lib/dal/schedule-reminders.ts` | `schedule-reminder-surface.tsx` | `scheduleMutationAudit`, `scheduleReminderDispatch`, `server/schedule/reminder-dispatch.ts` | rule persistence 与 dispatch orchestration 耦合在同一 DAL。 [VERIFIED: src/actions/schedule-reminder-actions.ts, src/lib/dal/schedule-reminders.ts, src/server/schedule/reminder-dispatch.ts] |
| Assistant proposals | `src/actions/schedule-assistant-actions.ts` + `src/lib/dal/schedule-assistant.ts` | `schedule-assistant-surface.tsx` | `scheduleAssistantProposal`, `scheduleMutationAudit`, plugin proposal vocab | proposal-only 边界是对的，但 AI contracts 未独立成 provider/prompt/tool layers。 [VERIFIED: src/actions/schedule-assistant-actions.ts, src/lib/dal/schedule-assistant.ts, src/lib/dto/resource-ai.ts] |
| Shared contracts | `src/lib/dto/schedule.ts` | 全部 schedule surfaces | 所有子域共用 | 单文件承载 import/runtime/reminder/assistant/operations 全部 DTO，后续会放大变更面。 [VERIFIED: src/lib/dto/schedule.ts] |
| Export | 未发现 dedicated export action / DAL / surface | 无 | 无 | 当前 codebase 中没有独立 schedule export 模块，应预留边界，避免以后塞回 import DAL。 [VERIFIED: grep `export.*schedule|schedule.*export|Export` over `src/**/*.{ts,tsx}`] |

### Boundary ownership summary

- `schedule-import.ts` 拥有“raw/staging -> normalized apply”的主要边界。
  [VERIFIED: src/lib/dal/schedule-import.ts]
- `schedule-runtime.ts` 拥有“normalized model -> daily agenda DTO”的读取边界。
  [VERIFIED: src/lib/dal/schedule-runtime.ts]
- `schedule-operations.ts` 拥有“single-instance override / holiday calendar”写边界。
  [VERIFIED: src/lib/dal/schedule-operations.ts]
- `schedule-reminders.ts` 同时拥有“rule persistence + dispatch record + retry send”
  三种职责，边界过宽。 [VERIFIED: src/lib/dal/schedule-reminders.ts]
- `schedule-assistant.ts` 拥有 proposal persistence，但不拥有真正的 AI provider /
  prompt / tool orchestration。 [VERIFIED: src/lib/dal/schedule-assistant.ts]

## Dependency and coupling hotspots

| Hotspot | Evidence | Why it is risky |
|---|---|---|
| Schedule 全域依赖 `lesson-authoring.assertActiveTeacher` | `schedule-import-actions.ts`、`schedule-operations-actions.ts`、所有 schedule DAL 都从 `@/lib/dal/lesson-authoring` 取 auth helper。 [VERIFIED: src/actions/schedule-import-actions.ts, src/actions/schedule-operations-actions.ts, src/lib/dal/schedule-operations.ts, src/lib/dal/schedule-runtime.ts, src/lib/dal/schedule-assistant.ts, src/lib/dal/schedule-reminders.ts] | schedule feature 没有自有 auth/scope seam，未来 lesson-authoring 改动会横向影响 schedule。 |
| `dto/schedule.ts` 是 mega-contract file | import/runtime/operations/reminders/assistant 全部 schema 都在一个文件里。 [VERIFIED: src/lib/dto/schedule.ts] | 任一子域改动都会扩大 merge 冲突、测试影响面和 feature ownership 模糊度。 |
| Reminder DAL 同时做 persistence 与 side effects | `saveScheduleReminderRule()` 既 upsert rule，又 insert dispatch；`retryScheduleReminderDispatch()` 直接调用 `dispatchScheduleReminder()`。 [VERIFIED: src/lib/dal/schedule-reminders.ts] | 事务与重试策略没法独立设计，未来真实渠道接入时会把基础写模型拖进副作用复杂度。 |
| Assistant proposal vocabulary 双轨制 | schedule assistant 用 `import_mapping/conflict_explanation/override_suggestion`；plugin registry 用 `scheduleOverrideProposal/scheduleReminderDraft/scheduleConflictAnnotation`。 [VERIFIED: src/lib/dal/schedule-assistant.ts, src/lib/dto/resource-ai.ts, src/server/plugins/registry.ts] | AI/plugin 输出需要双向映射，审批语义容易漂移。 |
| Runtime agenda 到 editor preview 的 URL contract 错配 | `teacher-schedule-surface.tsx` 用 `assignmentId` 填 `courseId` query；preview page 会校验 `preview.course.id === courseId`。 [VERIFIED: src/components/surfaces/teacher-schedule-surface.tsx, src/app/(teacher)/teacher/editor/preview/page.tsx] | 这是现成的边界泄漏：schedule runtime DTO 没提供 `courseId`，UI 被迫猜路由参数，且当前猜错。 |
| Operations read path 有写副作用 | `getScheduleOperationsCenterDTO()` 内部会 `ensureDefaultHolidayCalendar()`。 [VERIFIED: src/lib/dal/schedule-operations.ts] | 读模型请求会创建数据，后续缓存、审计、测试和幂等分析都更复杂。 |
| Operations center 读取全量 `users` | `getScheduleOperationsCenterDTO()` 直接 `db.query.users.findMany()`。 [VERIFIED: src/lib/dal/schedule-operations.ts] | school-scoped view 却走全表用户读取，边界和最小权限都不够收敛。 |
| Cache invalidation 策略散在 actions | 各 action 自己拼 `updateTag()` 组合。 [VERIFIED: src/actions/schedule-*.ts, src/lib/cache-policy.ts] | feature 迁移后容易漏 tag，建议 feature 内部集中定义 invalidation policy。 |

## Transaction boundary risks

### Risk matrix

| Flow | Current boundary | Risk | Recommendation |
|---|---|---|---|
| Override create/update/revoke | 先写 `scheduleOverride`，再单独写 `scheduleMutationAudit`。 [VERIFIED: src/lib/dal/schedule-operations.ts] | 业务写入成功但 audit 失败时，会留下不可审计状态。 [VERIFIED: src/lib/dal/schedule-operations.ts] | 抽 `withScheduleAuditTx()`，让 domain row 与 audit row 同事务提交。 [ASSUMED] |
| Holiday date save/remove | upsert/delete `scheduleHolidayDate` 与 audit 分离；默认 calendar 还可能在 read path 被创建。 [VERIFIED: src/lib/dal/schedule-operations.ts] | 审计不原子，且“读取即建表头数据”会让 save flow 更难推理。 [VERIFIED: src/lib/dal/schedule-operations.ts] | 把 default calendar bootstrap 移到显式 command 或 seed path；holiday write 与 audit 合并到单事务。 [ASSUMED] |
| Reminder rule creation | upsert `scheduleReminderRule`、insert `scheduleReminderDispatch`、append audit 是三个分离写步骤。 [VERIFIED: src/lib/dal/schedule-reminders.ts] | rule 保存后如果 dispatch/audit 失败，UI 会看到规则更新，但没有 planned delivery 或审计线索。 [VERIFIED: src/lib/dal/schedule-reminders.ts] | 拆成 `saveRuleTx()` 与 `planDispatchTx()`，同事务内完成 DB 落库；实际发送留到异步 dispatcher。 [ASSUMED] |
| Reminder retry dispatch | 先调用外部 `dispatchScheduleReminder()`，再 update dispatch，再 append audit。 [VERIFIED: src/lib/dal/schedule-reminders.ts, src/server/schedule/reminder-dispatch.ts] | 外部发送成功但 DB update 失败时，真实世界与系统状态会分叉；也缺少幂等键。 [VERIFIED: src/lib/dal/schedule-reminders.ts] | 引入 outbox / attempt record / idempotency key；retry command 只入队，不直接发送。 [ASSUMED] |
| Assistant proposal create/approve/reject | proposal row 与 audit row 分离。 [VERIFIED: src/lib/dal/schedule-assistant.ts] | proposal 状态可能变更成功但没有审计。 [VERIFIED: src/lib/dal/schedule-assistant.ts] | assistant 也走统一 schedule audit tx helper。 [ASSUMED] |
| Import apply | `approveScheduleImport()` 使用 `db.transaction()` 包住 batch/row/normalized writes。 [VERIFIED: src/lib/dal/schedule-import.ts] | 这是当前最健康的事务边界，但没有配套 mutation audit。 [VERIFIED: src/lib/dal/schedule-import.ts] | 保持 apply 事务；补 import approval audit，并把 post-commit cache invalidation 保持在 action 层。 [ASSUMED] |

### Undo / save flow assessment

- 当前 schedule 没有专用的 undo history、snapshot table、或 reversible command
  log。已发现的 schedule 侧历史能力只有 `scheduleMutationAudit`。
  [VERIFIED: src/db/schema.ts, src/lib/dal/schedule-assistant.ts,
  src/lib/dal/schedule-operations.ts, src/lib/dal/schedule-reminders.ts]
- `scheduleMutationAudit` 只记录 `payloadJson` 和通用 `reason`，并未形成统一的
  `before/after` 快照契约。比如 `updateScheduleOverride()` audit 只写新 payload；
  `removeHolidayCalendarDate()` audit 只写删除输入，不写完整删除前记录。
  [VERIFIED: src/lib/dal/schedule-operations.ts]
- 因此现状更像“审计日志”，不是“可撤销历史”。如果要支持 undo/save flow，
  需要把 command input、pre-image、post-image、undoability 与 actor/reason 明确化。
  [ASSUMED]

## AI coupling risks

| Risk | Evidence | Why it matters |
|---|---|---|
| 只有 proposal persistence，没有 provider / prompt / tool 分层 | reviewed schedule 代码里只有 `schedule-assistant.ts` proposal CRUD 和 surface moderation；未见 schedule 专属 providers/prompts/tools 目录。 [VERIFIED: src/lib/dal/schedule-assistant.ts, src/actions/schedule-assistant-actions.ts, src/components/surfaces/schedule-assistant-surface.tsx] | AI 逻辑一旦增长，UI、proposal store、prompt 演进会互相缠绕。 |
| Proposal schema 缺少 model/provider/prompt/tool/version metadata | `scheduleAssistantProposal` 只有 `proposalType/targetType/targetId/title/reason/impactScope/fieldsRequiringConfirmation/draftPayload`。 [VERIFIED: src/db/schema.ts] | 无法重放、评估、审计 prompt 变更，也无法建立 provider portability。 |
| Assistant 与 plugin schedule proposal contract 不统一 | 两侧 proposal type 枚举不同。 [VERIFIED: src/lib/dal/schedule-assistant.ts, src/lib/dto/resource-ai.ts] | 同一个“调课建议”在 assistant、plugin、future tools 之间没有 canonical command schema。 |
| `draftPayload` 过于宽泛 | action 与 DAL 都接受 `z.record(..., unknown)` / `Record<string, unknown>`。 [VERIFIED: src/actions/schedule-assistant-actions.ts, src/lib/dal/schedule-assistant.ts] | 审批与执行边界缺乏强类型，后续容易把未验证 payload 带进 domain write path。 |
| UI 直接耦合 proposal status 文案与审批动作 | `ScheduleAssistantSurface` 直接根据 action result 设置 success/error feedback，并直接触发 approve/reject。 [VERIFIED: src/components/surfaces/schedule-assistant-surface.tsx] | 如果以后引入 draft preview、diff review、tool trace，UI 会被迫知道太多状态细节。 |

### Recommended AI split

以下为建议目标，不是现状。 [ASSUMED]

```text
src/features/schedule/assistant/
├── domain/
│   ├── proposal-contract.ts
│   ├── proposal-status.ts
│   └── proposal-audit.ts
├── application/
│   ├── create-proposal.ts
│   ├── approve-proposal.ts
│   ├── reject-proposal.ts
│   └── get-assistant-center.ts
├── ai/
│   ├── providers/
│   ├── prompts/
│   ├── tools/
│   └── proposal-mappers/
└── ui/
    └── schedule-assistant-surface.tsx
```

**Key rule:** provider/prompt/tool 只产出 canonical proposal command；只有
application layer 才能把 canonical proposal 写入 proposal store；approval 只创建
draft / pending command，不能直接改 runtime tables。 [ASSUMED]

## Recommended target structure (`src/features/schedule/`)

以下目录为建议目标结构，不代表当前文件位置。 [ASSUMED]

```text
src/features/schedule/
├── shared/
│   ├── dto/
│   │   ├── import.ts
│   │   ├── runtime.ts
│   │   ├── operations.ts
│   │   ├── reminders.ts
│   │   └── assistant.ts
│   ├── auth/
│   │   └── assert-schedule-scope.ts
│   ├── cache/
│   │   └── schedule-cache-tags.ts
│   ├── audit/
│   │   └── with-schedule-audit-tx.ts
│   └── links/
│       └── build-schedule-preview-href.ts
├── runtime/
│   ├── queries/
│   │   ├── get-teacher-daily-agenda.ts
│   │   └── get-class-daily-agenda.ts
│   └── ui/
│       └── teacher-schedule-surface.tsx
├── import/
│   ├── commands/
│   │   ├── draft-import.ts
│   │   └── approve-import.ts
│   ├── queries/
│   │   └── get-latest-import-batch.ts
│   ├── domain/
│   │   ├── classify-draft-row.ts
│   │   ├── ensure-normalized-records.ts
│   │   └── import-audit.ts
│   └── ui/
│       └── schedule-import-review-surface.tsx
├── operations/
│   ├── commands/
│   │   ├── create-override.ts
│   │   ├── update-override.ts
│   │   ├── revoke-override.ts
│   │   ├── save-holiday-date.ts
│   │   └── remove-holiday-date.ts
│   ├── queries/
│   │   └── get-operations-center.ts
│   └── ui/
│       └── schedule-operations-surface.tsx
├── reminders/
│   ├── commands/
│   │   ├── save-rule.ts
│   │   ├── plan-dispatch.ts
│   │   └── retry-dispatch.ts
│   ├── queries/
│   │   └── get-reminder-center.ts
│   ├── infrastructure/
│   │   └── reminder-dispatch.ts
│   └── ui/
│       └── schedule-reminder-surface.tsx
├── assistant/
│   ├── application/
│   ├── ai/
│   └── ui/
├── interop/
│   ├── import/
│   └── export/
└── index.ts
```

### Why this structure

- `shared/dto` 拆子域文件，避免一个 DTO 文件承载所有 schedule concerns。
  [ASSUMED]
- `shared/auth` 把 schedule scope 从 `lesson-authoring` 解耦出来。
  [ASSUMED]
- `shared/audit` 统一 command + audit 事务模板，先解决现在最明显的 write risk。
  [ASSUMED]
- `interop/export/` 现在先占位，避免未来把 export 逻辑塞回 import DAL。
  [ASSUMED]
- `runtime` 只保留 query/read-model，不接收 import raw rows，也不直接接 AI。
  [ASSUMED]

## Phased migration plan

### First step (smallest atomic commit)

**目标：只建立 feature root，不改现有运行行为。** [ASSUMED]

1. 创建 `src/features/schedule/` 目录骨架与 `index.ts`。 [ASSUMED]
2. 为 `runtime / import / operations / reminders / assistant / shared` 创建空的
   barrel 或 re-export adapter，先指向现有文件，不移动实现。 [ASSUMED]
3. 新增 `src/features/schedule/shared/boundary-map.ts` 或 `README.md`，把 public
   imports、禁止跨层依赖、子域 owner 写清楚。 [ASSUMED]
4. 不修改页面行为、不移动 DB schema、不改 action signatures。这样可以单独提
   交，并立刻给后续迁移建立稳定 landing zone。 [ASSUMED]

**Why first:** 这是最低风险的“治理先行”步骤；它能立刻让后续改动从“横向散点
迁移”变成“向 feature root 收口”，且不会和行为修复、事务重写混在一起。
[ASSUMED]

### Phase 1: shared contract extraction

1. 先把 `dto/schedule.ts` 按子域拆到 `shared/dto/*`，保留旧文件 re-export。
   [ASSUMED]
2. 抽 `assertScheduleScope()`，替代对 `lesson-authoring.assertActiveTeacher`
   的直接依赖。 [ASSUMED]
3. 抽 `schedule-cache-tags.ts` 与 feature-local invalidation helpers。
   [ASSUMED]
4. 同批修复 agenda -> editor preview link contract：把 `courseId` 放进
   `TeacherDailyAgendaCardDTO.lessonLink`，或统一改为 `previewHref` builder。
   这是一个真实现存耦合 bug，适合在 shared contract phase 一起修。 [ASSUMED]

### Phase 2: runtime and operations hardening

1. 迁移 `schedule-runtime.ts` 到 `features/schedule/runtime/queries/`；保持只读。
   [ASSUMED]
2. 把 `getScheduleOperationsCenterDTO()` 的 `ensureDefaultHolidayCalendar()`
   从 read path 移出。 [ASSUMED]
3. 为 override / holiday commands 引入统一事务 + audit helper。 [ASSUMED]
4. 收紧 operations center 的 teacher lookup，不再全表读取 `users`。
   [ASSUMED]

### Phase 3: import / export interop split

1. 迁移现有 import staging/apply 到 `features/schedule/import/`。 [ASSUMED]
2. 增补 import approval audit，形成和其它 command 一致的 mutation ledger。
   [ASSUMED]
3. 建立 `interop/export/` 空接口与 DTO，即使先只返回 `NOT_IMPLEMENTED`，也要把
   import/export 边界预先占好。 [ASSUMED]

### Phase 4: reminders side-effect split

1. 把 rule persistence、dispatch planning、dispatch execution 三段拆开。
   [ASSUMED]
2. `save-rule` 只负责 rule + planned dispatch record；真正发送改成 background /
   outbox 风格。 [ASSUMED]
3. 为 retry 建 attempt log 与幂等键，避免“渠道已发出但 DB 未更新”。
   [ASSUMED]

### Phase 5: AI boundary hardening

1. 建 canonical schedule proposal command schema，统一 assistant 与 plugin
   registry vocab。 [ASSUMED]
2. 建 `assistant/ai/providers|prompts|tools|proposal-mappers`，让 AI 只产出
   canonical proposal。 [ASSUMED]
3. proposal schema 增加 provider/model/prompt/tool/version metadata。 [ASSUMED]
4. 审批仍保持 proposal-only / draft-only，不直写 runtime schedule。
   [VERIFIED: .planning/STATE.md] [ASSUMED: 迁移后继续保持]

## Recommended feature boundary rules

- `runtime/*` 只能读 normalized schedule tables，不能读 `scheduleImportRow`。
  现状已经满足，应固化成规则。 [VERIFIED: src/lib/dal/schedule-runtime.ts,
  src/lib/dal/schedule-runtime.test.ts] [ASSUMED: 作为未来规则继续执行]
- `assistant/*` 不能 import `scheduleOverride`、`scheduleRecurringEntry` 的直接写命令。
  现状 approval path 已避免直写 runtime。 [VERIFIED: src/lib/dal/schedule-assistant.ts,
  src/lib/dal/schedule-assistant.test.ts] [ASSUMED: 作为未来规则继续执行]
- `reminders/infrastructure/*` 不得被 UI 直接 import。 [ASSUMED]
- `actions/*` 最终只作为 route adapter，真实业务 command/query 都归到
  `src/features/schedule/*`。 [ASSUMED]
- `scheduleMutationAudit` 只能通过 feature-local audit helper 写入。
  [ASSUMED]

## Assumptions log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `src/features/schedule/` 采用 vertical subdomain + shared + interop 结构最适合当前仓库。 | Recommended target structure | 可能与团队未来通用 feature layout 不一致，导致二次迁移。 |
| A2 | First step 先做 skeleton + re-export 比直接搬文件更适合原子提交。 | Phased migration plan | 如果团队更偏好一次性移动，可能觉得收益过小。 |
| A3 | Reminder 应拆成 persistence / planning / execution 三层。 | Transaction boundary risks / migration plan | 如果产品明确只做模拟发送，分层可能显得过早。 |
| A4 | 需要为 undo/save flow 增加 pre-image / post-image 契约。 | Undo / save flow assessment | 如果产品最终只要求审计不要求撤销，这部分可能是过度设计。 |
| A5 | 应统一 assistant 与 plugin proposal vocab。 | AI coupling risks / migration plan | 如果两套 vocab 被故意设计为不同抽象层，强行统一可能降低灵活性。 |

## Open questions

1. 当前产品是否真的要在 schedule 域支持“undo”，还是只要求“可审计”？
   [VERIFIED: reviewed schedule code lacks undo-specific store]
2. Reminder 未来是否会接入真实异步 worker / queue；如果不会，最小分层可以只做到
   `rule tx + planned dispatch tx`。 [ASSUMED]
3. Schedule export 的首发形态是“normalized agenda export”还是“import batch export”?
   当前代码里还没有边界。 [VERIFIED: grep `export.*schedule|schedule.*export|Export` over `src/**/*.{ts,tsx}`]

## Sources

### Primary

- `AGENTS.md` — 项目硬约束。 [VERIFIED: AGENTS.md]
- `.planning/PROJECT.md` — 项目目标与数据访问基线。 [VERIFIED: .planning/PROJECT.md]
- `.planning/STATE.md` — Phase 18 已锁定 schedule architecture decisions。
  [VERIFIED: .planning/STATE.md]
- `src/actions/schedule-assistant-actions.ts` [VERIFIED]
- `src/actions/schedule-operations-actions.ts` [VERIFIED]
- `src/actions/schedule-reminder-actions.ts` [VERIFIED]
- `src/actions/schedule-import-actions.ts` [VERIFIED]
- `src/lib/dal/schedule-assistant.ts` [VERIFIED]
- `src/lib/dal/schedule-operations.ts` [VERIFIED]
- `src/lib/dal/schedule-reminders.ts` [VERIFIED]
- `src/lib/dal/schedule-runtime.ts` [VERIFIED]
- `src/lib/dal/schedule-import.ts` [VERIFIED]
- `src/lib/dto/schedule.ts` [VERIFIED]
- `src/lib/dto/resource-ai.ts` [VERIFIED]
- `src/server/plugins/registry.ts` [VERIFIED]
- `src/server/schedule/reminder-dispatch.ts` [VERIFIED]
- `src/db/schema.ts` [VERIFIED]
- `src/lib/cache-policy.ts` [VERIFIED]

### Supporting checks

- `src/lib/dal/schedule-*.test.ts` — 当前边界意图与验证侧重点。 [VERIFIED]
- grep: `export.*schedule|schedule.*export|Export` over `src/**/*.{ts,tsx}` —
  schedule export 未发现实现。 [VERIFIED]
- grep: `undo|history|snapshot|rollback` over `src/**/*.{ts,tsx}` — schedule 未发现
  专用 undo store，仅有其它域 snapshot/history。 [VERIFIED]

## Metadata

**Confidence breakdown:**

- Current boundary map: HIGH — 直接来自代码阅读与 grep。 [VERIFIED]
- Transaction risks: HIGH — 直接来自 write sequencing 与 schema。 [VERIFIED]
- AI coupling risks: HIGH — 直接来自 proposal schemas 与 registry contracts。
  [VERIFIED]
- Target structure / migration plan: MEDIUM — 基于当前仓库结构做的治理建议。
  [ASSUMED]
