# Phase 21: Teaching design contracts and evidence foundation - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段在不替换现有线性 `lesson step` 模型的前提下，为课堂编排链路补上两类基础合同：

1. 教学设计合同：让现有步骤具备结构化教学语义，能支撑教师编辑、预览和开课准备。
2. 课堂证据合同：让课堂中的 `presence`、`evidence`、`intervention` 变成可持久化、可审计、可被后续 recap / evaluation / analytics 复用的服务端真相源。

本阶段不交付完整开课 readiness 工作流、不重做学生课堂活动 UI、不实现正式评价面板，也不直接进入统计分析页。这些属于后续 `Phase 22-26`。

</domain>

<decisions>
## Implementation Decisions

### Teaching-design metadata contract
- **D-01:** 继续沿用现有线性 `lesson step` 模型，不引入 branching graph、独立流程图结构或平行教学设计实体。
- **D-02:** 每个 step 首发必须具备四类结构化教学元数据：`activityIntent`、`estimatedMinutes`、`activityMode`、`evidenceExpectation`。
- **D-03:** `estimatedMinutes` 首发用单个整数分钟数表达，不使用区间时长，也不继续只靠 step-type 规则推断。
- **D-04:** `activityMode` 首发使用受限枚举，而不是自由文本；具体枚举项可由 planner 在不违背课堂语义的前提下收敛。
- **D-05:** 元数据深度不应停留在四个裸字段；合同需要预留更丰富教学语义的扩展空间，但 Phase 21 首发只要求把核心合同做稳，不提前扩成独立教学设计系统。
- **D-06:** Phase 21 首发先让这些元数据进入教师侧 `editor`、教师预览和开课预览；不要求本期就完整进入学生 runtime 或 live classroom 操作面。

### Evidence expectation modeling
- **D-07:** `evidenceExpectation` 首发采用轻量结构化合同，而不是一句自然语言说明，也不是 rubric 级重结构。
- **D-08:** 该合同首发围绕“证据类型 + 提示语”建模，可附带轻量 checklist、标签或等价的辅助字段，但不进入完整评分维度体系。
- **D-09:** `evidenceExpectation` 首发主要服务教师的教学设计、开课准备和后续证据记录，不把它优先设计成学生端主叙事结构。
- **D-10:** 证据期待默认教师侧可见；学生端是否公开应是按需控制，而不是默认全部公开。

### Durable classroom evidence and timeline
- **D-11:** Phase 21 必须把三类课堂事实系统化持久化：`presence` 变化、`evidence` capture、`teacher intervention`。
- **D-12:** 这些记录必须严格以 `classroom session` 为主边界（session-owned），可按需要关联 `studentId` 与 `stepId`，但不能只挂在 lesson 级别上混淆单次课堂事实。
- **D-13:** `presence` 首发要保留状态变化时间线，而不只是 `classroomParticipant` 上的最新状态；`currentStepId` 可作为每次变化的上下文字段一起记录。
- **D-14:** `teacher intervention` 首发是课堂过程记录，不是正式评价草稿；记录格式采用“短标题 + 正文”，默认仅教师内部可见。
- **D-15:** `teacher intervention` 首发既要支持针对单个学生，也要支持针对全班范围的课堂观察或干预记录。
- **D-16:** `evidence`、`presence`、`intervention` 的新增持久化合同必须继续走 `DAL + Server Actions + explicit cache invalidation`，不能把事实状态停留在 SSE memory、client state 或 UI 推断里。

### Backward compatibility and fallback
- **D-17:** 已有 `lesson` 与 `published snapshot` 缺少新教学元数据时，Phase 21 首发采用“静默默认化 + 后续提醒”策略，不在本期直接阻断现有课堂链路。
- **D-18:** 对既有 `published snapshot` 的兼容首发通过服务端读取时 fallback 完成，而不是先做破坏性历史回填或要求教师重新发布所有旧课时。
- **D-19:** 教师最早应在编辑器和开课预览中看到“当前值来自默认推断”的提示，而不是先去打扰学生端或 live classroom。
- **D-20:** 如果默认推断出的教学元数据明显不够用，Phase 21 仍允许继续，但要明确标记为“待完善”；是否升级为 readiness 阻断留给后续 Phase 22 处理。

### Existing constraints to preserve
- **D-21:** 所有新增 schema、DTO、DAL 和 action 继续严格遵守 `SQLite + Drizzle + Zod + DAL + Server Actions + explicit cache tags` 基线。
- **D-22:** 现有 `/teacher/launch` 仍是唯一课堂准备入口；教学元数据和 fallback 提示要兼容已发布快照预览链路，不回退到读取 draft 或客户端拼装。
- **D-23:** 本阶段不把 intervention / observation 直接扩写成完整 formative evaluation 工作流，也不把 evidence contract 提前扩成 analytics page 或 student behavior analysis 页面。

### the agent's Discretion
- “四字段之外”的 richer teaching semantics 具体保留哪些扩展子字段，可由 planner 在不扩大本期范围的前提下收敛。
- `activityMode`、`evidenceType`、`timeline entryType` 的精确枚举名和值可由 researcher / planner 收敛，但必须保持稳定、typed、可统计。
- `evidenceExpectation` 是否包含 checklist、teacher note、student-visible hint 的具体 shape，可由 planner 收敛。
- “全班范围 intervention” 在持久化层的 target 表达方式（如 `scope = class` 或 `studentId = null + targetScope`）可由 planner 决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.3 里程碑目标、教学实施闭环边界，以及“不把 Phase 21 扩成评价/统计整套产品面”的项目级约束。
- `.planning/ROADMAP.md` — Phase 21 的正式 goal、success criteria 和 3 个计划槽位。
- `.planning/REQUIREMENTS.md` — `ORCH-01` 与 `EVAL-03` 的正式需求来源，以及与后续 `ACT-*`、`EVAL-*`、`ANALYTICS-*` 的边界关系。
- `.planning/STATE.md` — 已锁定的 teacher shell、launch 入口、lesson editor、schedule proposal-only、中文界面与设计约束。

### Prior phase decisions that carry forward
- `.planning/phases/17-teacher-flow-editor-enhancement/17-CONTEXT.md` — 现有 editor / preview / publish-readiness 边界，说明 Phase 21 必须复用 teacher-owned lesson flow 和发布快照链路。
- `.planning/phases/18-teaching-schedule-os/18-CONTEXT.md` — 继续沿用 `DAL + Server Actions + explicit cache invalidation + proposal-safe extensions` 的强边界模式。
- `.planning/phases/19-teacher-shell-route-metadata-system/19-CONTEXT.md` — teacher-facing shell 与 route metadata 已集中化，Phase 21 的 teacher surfaces 不能另起壳层路径。

### Existing lesson authoring and preview contracts
- `src/lib/dto/lesson-authoring.ts` — 当前 `lessonStepPayloadSchema`、`LessonStepDTO`、preview DTO 与 step payload contract 的真实来源。
- `src/lib/dal/lesson-authoring.ts` — 现有 lesson step 读写、发布与 teacher-owned scope 的实现基线。
- `src/actions/lesson-authoring-actions.ts` — 当前 authoring Server Actions、Zod 校验和 `updateTag()` 写后失效模式。
- `src/components/authoring/lesson-authoring-workspace.tsx` — 现有 editor 首消费面，可直接承接 teaching metadata 的第一轮 teacher-facing 展示。
- `docs/teacher-classroom-flow-review.md` — 当前 teacher editor / player / classroom runtime 的链路复盘，帮助判断新合同应接在哪一层。

### Existing classroom runtime and durability contracts
- `src/lib/dto/classroom.ts` — 当前 launch preview、snapshot、participant、event 和 presence action input 的 typed contract。
- `src/lib/dal/classroom.ts` — 当前 classroom session、participant、event、launch preview 和 runtime snapshot 的事实来源与扩展入口。
- `src/actions/classroom-actions.ts` — 当前 classroom write path、presence touch action 与 `cacheTags.classroom(sessionId)` 的失效路径。
- `src/lib/dal/learning.ts` — 当前 student player 读取课堂 runtime、active step 与 lock mode 的兼容链路；Phase 21 不能破坏它。
- `src/components/learning/classroom-runtime-client.tsx` — 当前学生端 presence touch 和 runtime follow behavior 的直接消费点。

### Schema and persistence boundaries
- `src/db/schema.ts` — 当前 `classroomSessions`、`classroomParticipants`、`classroomEvents`、`attemptFeedback` 等表结构，是新增 evidence/timeline persistence 的直接集成点。
- `src/lib/cache-policy.ts` — classroom / lesson / step 相关 cache tag 约束，新增 durable writes 必须对齐这里。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/dto/lesson-authoring.ts`：已经用 `zod` discriminated union 定义 `content` / `task` / `quiz` payload，适合在现有 step payload 上继续扩 teaching-design metadata，而不是另起一层编辑模型。
- `src/lib/dal/classroom.ts`：已经有 `buildLaunchPreview()` 和 snapshot parsing 逻辑，当前 `estimatedMinutes` 与 summary 主要靠规则推断，Phase 21 可以把它升级为优先读显式元数据、再 fallback。
- `src/lib/dto/classroom.ts`：已经定义 launch preview、snapshot、participant、event 和 presence input DTO，适合继续扩 evidence / intervention / timeline 的 typed contract。
- `src/actions/classroom-actions.ts`：已经有 presence touch 和 classroom mutation 的 Server Action 风格，可直接复用到 evidence/intervention 写入口。
- `src/components/authoring/lesson-authoring-workspace.tsx`：是教学元数据首发最合适的 teacher-facing 展示入口，不需要先新增独立 orchestration 页面。

### Established Patterns
- 现有 lesson authoring 和 classroom runtime 都以 `DTO -> DAL -> Server Action -> updateTag()` 为明确边界，Phase 21 必须继续沿用，而不是在 client 里拼装新事实状态。
- 课堂 launch / preview 继续以已发布 snapshot 为事实来源，不直接读取 draft lesson；这决定了 teaching metadata 也必须能安全进入 published snapshot 或等价读取链路。
- 当前 classroom runtime 已同时维护 `classroomParticipants` 的最新状态和 `classroomEvents` 的事件流，说明 durable timeline 更适合作为新增 session-owned truth source 叠加，而不是替换现有 live snapshot 模型。
- 当前学生端 `player` 和 classroom runtime 已依赖 `activeStepId + locked + version`，所以 Phase 21 的 teaching metadata 不应改变现有 runtime control 协议。

### Integration Points
- `src/db/schema.ts`：新增 teaching metadata persistence、classroom evidence、classroom timeline 的直接 schema 扩展点。
- `src/lib/dto/lesson-authoring.ts` 与 `src/lib/dto/classroom.ts`：新增 teaching-design、evidenceExpectation、timeline DTO 的主入口。
- `src/lib/dal/lesson-authoring.ts` 与 `src/lib/dal/classroom.ts`：承接 fallback、published snapshot mapping、evidence/intervention write path 和 timeline reads。
- `src/actions/lesson-authoring-actions.ts` 与 `src/actions/classroom-actions.ts`：承接 teacher/student write entry 与 cache invalidation。
- `src/components/authoring/lesson-authoring-workspace.tsx`、教师预览、开课预览相关 surface：承接 fallback 提示与元数据第一轮消费。

</code_context>

<specifics>
## Specific Ideas

- 教学元数据首发不是只补四个孤立字段，而是在不换模型的前提下，把 step 提升为“可表达教学意图、课堂方式和证据期待”的真实教学环节。
- `evidenceExpectation` 首发更像教师设计和证据采集提示，而不是 student-facing rubric；默认教师侧使用，学生端按需公开。
- `presence`、`evidence`、`intervention` 三类事实都要形成 durable timeline，其中 intervention 虽是富文本记录，但仍属于课堂过程记录，不在本期直接升级为正式评价系统。
- 旧 lesson / snapshot 的兼容首发优先“不断流”，通过服务端 fallback 继续运行，再在编辑器和开课预览提醒教师哪些值是默认推断出来的。

</specifics>

<deferred>
## Deferred Ideas

- 课程编排细节的更深层 orchestration 设计 — 更适合 `Phase 22`。
- 上课流程控制与课堂运行面更复杂的交互策略 — 更适合 `Phase 22-24`。
- 学生评价实现与统一 formative evaluation 工作流 — 更适合 `Phase 24`。
- 统计数据汇总与 session recap 指标面板 — 更适合 `Phase 25`。
- 分析学生学习行为与跨课堂趋势分析 — 更适合 `Phase 25-26`。

</deferred>

---

*Phase: 21-teaching-design-contracts-and-evidence-foundation*
*Context gathered: 2026-05-12*
