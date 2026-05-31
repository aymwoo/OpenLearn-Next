# Phase 28: Runtime bridge contracts and session persistence - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定在现有 `runtime-platform` contract / server boundary 内，把
runtime-capable step 的 descriptor、TeachingBridge message contract、runtime
session durability、canonical runtime event / outbox 与 cache-safe write
semantics 立住，但不提前交付 iframe Runtime Host、本地 runtime UI、plugin
lifecycle 或 transport cutover。

交付范围固定为三件事：

1. 让现有线性 `lesson step -> published snapshot -> classroom/player` 链路可
   承载 versioned runtime descriptor，而不是再起一套平行 step 模型。
2. 让 host-side server boundary 能创建、恢复并识别 durable runtime
   session，并向 runtime bootstrap 提供最小且安全的会话上下文。
3. 让 `ready / interaction / save / submit / teacher-control` 走 canonical
   durable event path，同时把真正影响现有主链的写入继续桥回当前
   classroom / learning truth，而不是把 transport 或 runtime 自身状态变成新的
   primary truth。

本阶段不交付 sandboxed iframe host shell、本地 HTML runtime 渲染和 authoring
surface，不做 plugin lifecycle / inspector / allowed-denied audit surface，也不把
Redis/Event Bus/WebSocket 变成正式运行前提或 primary write path。

</domain>

<decisions>
## Implementation Decisions

### Descriptor 挂载与发布冻结
- **D-01:** `runtime descriptor` 首发作为现有 `lessonStepPayload` 内的可选
  `runtime` block 挂载，不新增平行 step truth 或独立 runtime metadata 主模型。
- **D-02:** `content`、`task`、`quiz` 三类现有 step 都允许可选携带
  `payload.runtime`；Phase 28 不通过新增专用 step family 来承载 runtime。
- **D-03:** 发布课时后，`publishedLessonVersions.snapshotJson` 必须冻结完整
  runtime descriptor，而不是只存 `runtimeId`/引用再在运行时回查可变 registry。
- **D-04:** planner 应扩展当前 `lessonStepPayload -> editor DTO -> published
  snapshot` 这条现有链路来承载 runtime descriptor，而不是再引入第二条
  side-channel persistence path。

### Runtime session 身份与恢复
- **D-05:** 默认当前 runtime session identity 按
  `classroomSession + stepId + actor + runtime version` 收口，避免不同 runtime
  版本错误复用同一恢复状态。
- **D-06:** 同一 actor 再次进入同一 runtime step 时，默认复用当前最新 runtime
  session，而不是每次进入都新建一条新 session。
- **D-07:** runtime session 历史必须保留，并显式标记 `latest`，而不是就地覆盖旧
  state；后续恢复与审计都以 latest 记录为当前入口。
- **D-08:** 当 descriptor 升版或显式重置时，应开启新的 current session / state
  记录，并把旧记录保留为历史，而不是原地突变旧 session。

### Bootstrap 上下文与 capability 语义
- **D-09:** runtime bootstrap 默认返回最小只读 DTO，只提供当前 step、runtime
  descriptor、lesson/classroom 摘要、actor scope、granted capabilities 和必要
  恢复元信息，不把整课原始 snapshot 全量下发给 runtime。
- **D-10:** bootstrap 明确不能暴露 cookies、secrets、raw database rows，也不应把
  未经筛选的 lesson/classroom 持久化结构直接透传到 runtime。
- **D-11:** bootstrap 中的 capability token / context 语义固定为“会话级授权快照
  + 关联上下文”，后续每次 host action 仍必须由服务端重新做 school scope 与
  permission 校验。
- **D-12:** 若当前 actor 已存在可恢复的 latest runtime session/state，bootstrap
  应直接携带最小恢复摘要，避免把恢复流程拆成额外一跳再去补拉状态。

### Canonical event 与写入语义
- **D-13:** `ready`、`interaction`、`save`、`submit`、`teacher-control` 五类
  runtime 行为都要进入 canonical runtime event log / outbox；差异体现在事件
  语义与 payload 粒度，而不是有的 durable、有的完全不记。
- **D-14:** `runtime.interaction` 第一版只记录业务语义事件，例如答题变更、节点
  切换、阶段完成，不记录 raw clickstream 或每个 DOM 级交互。
- **D-15:** `save` 成功后只更新 runtime session / runtime state 与 canonical
  event，不桥回现有“正式提交”读模型，也不制造学生已提交的假象。
- **D-16:** `submit` 成功后必须桥回现有主链读模型
  （`classroomEvidence` 和/或现有 submission-aligned DTO 路径），并触发相应
  cache invalidation，让教师与学生 surface 看见的是正式提交后的状态。

### the agent's Discretion
- `payload.runtime` 的精确字段命名、descriptor schema 的细节层次、以及 bridge
  request/result envelope 的具体字段名，可由 planner 在“不起第二真相源、完整冻结
  published snapshot、继续使用 Zod contracts”前提下收敛。
- runtime session、runtime state、runtime event / outbox 是拆成单表还是多表，
  可由 planner 结合 SQLite 和当前 schema 风格决定，但必须保留历史并显式提供
  `latest` 恢复入口。
- `submit` 精确桥回 `classroomEvidence`、现有 task/submission-like 读模型，或两者
  的哪一组合，可由 planner 收敛；但必须保持“submit 才代表正式提交，save 不算”的
  已锁定语义。
- runtime 相关写入的精确 cache invalidation matrix 可由 planner 细化，包括是否只
  触发 `cacheTags.classroom(sessionId)`，还是还要同步更新 `progress`、`submission`
  等 tags；但 downstream surfaces 必须保持 read-your-writes。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — 锁定 v2.0 的总体 posture：单体内平台化、保持现有
  课堂主链、runtime/platform 先立 contract 与 persistence 边界，再谈 infra
  cutover。
- `.planning/ROADMAP.md` — Phase 28 的正式 goal、success criteria 与 4 个计划
  槽位；明确本阶段只做 bridge contract、session persistence、event/outbox 和
  cache-safe writes。
- `.planning/REQUIREMENTS.md` — `SAFE-03`、`BRDG-01`~`BRDG-04`、`RTSE-01`~
  `RTSE-04` 的 requirement truth，以及 `RHOST-*`、`GOVR-*`、`TRNS-*` 的后续
  phase boundary。
- `.planning/STATE.md` — 当前 milestone 状态与 carry-forward 决策，尤其是
  `classroom` 仍为 durable truth、SSE 仍为 delivery channel 的前提。
- `OpenLearn-Next-V2-Architecture-Plan.md` — 提供 `TeachingBridge` 动作语义和
  event-bus 长期方向；Phase 28 只吸收其方向，不照单执行 PostgreSQL/Redis 方案。

### Upstream runtime and classroom decisions
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-CONTEXT.md`
  — 锁定 `runtime-platform` 单根边界、纯 contracts root、seams 只做 default-only
  posture，以及 durable truth 仍在现有 classroom/session write path。
- `.planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md`
  — 锁定 `/classroom` recap 与 analytics 继续复用 session-first durable truth，
  禁止另起第二真相源。
- `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-CONTEXT.md`
  — 锁定 `/classroom` 仍是教师运行与单学生细节主域，过程性 evidence / evaluation
  已落在 classroom domain durable path。
- `.planning/phases/23-student-in-class-activity-flow/23-CONTEXT.md` — 锁定学生端
  personal runtime/progress split、quick-response durable path 与 player 中的
  classroom-aware personal state 读取方式。

### Current runtime-platform contract boundary
- `src/features/runtime-platform/contracts/bridge.ts` — 当前 versioned
  `TeachingBridge` message/request/result envelope contract 基线。
- `src/features/runtime-platform/contracts/descriptors.ts` — 当前 runtime descriptor、
  manifest v2 placeholder 与 lifecycle ownership contract 基线。
- `src/features/runtime-platform/contracts/events.ts` — 当前 canonical runtime event
  envelope、actor scope 与 delivery metadata contract 基线。
- `src/features/runtime-platform/contracts/permissions.ts` — 当前 runtime capability、
  host permission、school-scoped actor constraint contract。
- `src/features/runtime-platform/host-actions/guards.ts` — 当前 guarded host action
  授权 posture；Phase 28 的 runtime save/submit/bootstrap handler 应复用同一 guard
  思路。
- `src/features/runtime-platform/host-actions/runtime-host.ts` — 当前 runtime host
  action 占位入口，展示 host-side action 仍走 server boundary 与 seams。
- `src/features/runtime-platform/shared/boundary-map.ts` — route consumers 当前必须经
  `@/features/runtime-platform/*` public API，而不是回退到 ad hoc deep import。
- `src/features/runtime-platform/seams/database/contract.ts` — 当前 DB seam contract，
  明确 `classroom-session-write-path` 仍是 source of truth。
- `src/features/runtime-platform/seams/event-bus/contract.ts` — 当前 event bus seam
  contract，明确 default-only posture 与 future delivery adapter 边界。
- `src/features/runtime-platform/seams/transport/contract.ts` — 当前 transport seam
  contract，明确 transport 只是 delivery concern，不变成 truth path。

### Existing publish, session, and cache truth
- `src/lib/dto/lesson-authoring.ts` — 当前 `lessonStepPayloadSchema`、`builtInSource`
  与 `teachingDesign` contract 先例；`payload.runtime` 应沿用同类扩展方式。
- `src/lib/dal/lesson-authoring.ts` — 当前 draft authoring 与 `publishLesson()` 如何
  冻结 `steps/materials` 进 `publishedLessonVersions.snapshotJson`。
- `src/db/schema.ts` — 当前 `publishedLessonVersions`、`classroomSessions`、
  `classroomEvents`、`classroomEvidence`、`taskSubmissions` 等 durable schema 与
  append-only / indexed patterns。
- `src/lib/dto/classroom.ts` — 当前 classroom snapshot、recap、trend、evaluation
  和 live runtime typed contract，Phase 28 的 runtime submit/read bridge 不能破坏它。
- `src/lib/dal/classroom.ts` — 当前 classroom session、event、evidence、timeline 的
  durable read/write path 与 published snapshot 读取方式。
- `src/actions/classroom-actions.ts` — 当前 classroom Server Actions 和
  `updateTag(cacheTags.classroom(sessionId))` 失效路径；runtime write 需要遵循同类
  server-side invalidation discipline。
- `src/lib/dal/learning.ts` — 当前 student player 的 cached shell / personal DTO split
  与 live classroom runtime summary 入口，是 runtime session resume 接入学生端的
  最近邻位置。
- `src/lib/cache-policy.ts` — 当前 lesson / steps / progress / submission /
  classroom cache tags 与 route cache boundary 约束。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/runtime-platform/contracts/*`：Phase 27 已把 bridge、descriptor、
  event、permission 纯 contract 边界立起来，Phase 28 应直接在这里补强，不要另起
  一套 runtime schema。
- `src/features/runtime-platform/host-actions/guards.ts`：已经提供 school-scoped
  actor constraint 和 guarded host action 包装器，可直接复用到 bootstrap、save、
  submit、teacher-control 的 host-side handler。
- `src/lib/dal/lesson-authoring.ts`：`publishLesson()` 已经一次性冻结
  `editor.lesson / course / steps / materials` 到 `publishedLessonVersions`，这让
  “完整 descriptor 随 published snapshot 冻结”成为最自然的延伸路径。
- `src/lib/dal/classroom.ts` + `src/lib/dto/classroom.ts`：当前 session、event、
  evidence、timeline 都是 durable 且 typed 的，可作为 runtime submit /
  teacher-control bridge 的直接落点。
- `src/lib/dal/learning.ts`：已有 student player shell/personal split 和 live
  classroom runtime summary 读取逻辑，是 runtime session 恢复态接入学生端的现成
  integration point。
- `src/lib/cache-policy.ts` + `src/actions/classroom-actions.ts`：当前已形成明确的
  `updateTag` discipline，可作为 runtime write 后 freshness 行为的直接基线。
- `src/db/schema.ts`：`taskSubmissions` / `quizAttempts` 的 append-only + `isLatest`
  机制，为 runtime session history + latest 恢复模型提供了现成先例。
- `src/features/runtime-platform/seams/*/contract.ts`：当前 database/event-bus/
  transport seam 已明确 default-only posture，说明 Phase 28 只需接入 durable path，
  不应引入 provider toggle。

### Established Patterns
- 现有 lesson/published 读取是 snapshot-first：学生端、课堂端和 recap 都从
  `publishedLessonVersions.snapshotJson` 恢复 step payload，而不是运行时回查可变元数据。
- 当前 classroom truth 是 session-first 且 durable in SQLite；SSE 和 future seams
  都只是 delivery concerns，不能反客为主变成 state owner。
- 所有用户可见写入都走 `DAL + Server Actions + cache invalidation`，runtime 发起的
  write 也必须留在同一 server boundary 内。
- 仓库已经存在 append-only + latest 的状态管理范式，因此 runtime session 更适合
  采用“保留历史 + 显式 latest”而不是覆盖旧行。
- 学生播放器已经固定“cached shell + streamed personal/runtime state”的 split
  posture；runtime bootstrap / recovery 不能把个人态重新塞回 cached shell。

### Integration Points
- `src/lib/dto/lesson-authoring.ts`、`src/lib/dal/lesson-authoring.ts` 和
  `publishLesson()` 是把 `payload.runtime` 从 draft 带到 published snapshot 的主入口。
- `src/db/schema.ts` 与 `src/lib/dal/classroom.ts` 是 runtime session/state/event
  durability 最自然的接点，因为现有 classroom durability 已在那里落地。
- `src/actions/classroom-actions.ts` 和 future runtime host-side handlers 需要沿用
  当前 server-side mutation + `updateTag()` discipline，而不是让 runtime 直接写 DB。
- `src/lib/dal/learning.ts` 的 `getStudentPlayerPersonalDTO()` 与现有 classroom-aware
  personal runtime summary，是 runtime session latest 恢复态接入学生端的直接入口。
- `src/features/runtime-platform/seams/event-bus/*` 与 `seams/transport/*` 只应该接收
  durable runtime state 产生后的 delivery/event fan-out，不应该持有 runtime truth。

</code_context>

<specifics>
## Specific Ideas

- `payload.runtime` 的定位被明确锁成当前 step payload 的一个可选能力块，更像今天的
  `teachingDesign` / `builtInSource`，而不是一个需要独立读取的 side model。
- `publishedLessonVersions.snapshotJson` 继续是 runtime 行为的冻结点，因此发布后的
  runtime descriptor 不应再随着 registry 或 manifest 外部变化而漂移。
- runtime session 恢复模型应更接近 `taskSubmissions.isLatest`：保留历史，但对当前
  actor 暴露单一可恢复 latest 记录。
- `TeachingBridge` 的方向性动词仍固定是 `ready`、`event`、`save`、`submit`；但 Phase 28
  下游应以 `runtime-platform/contracts/*` 的 typed Zod contract 为准，而不是直接照搬架构草图。
- `submit` 是正式写入，`save` 只是 runtime 内状态暂存，这个语义差异已经锁定，后续测试和
  planner 不应把两者混成同一种“已完成/已提交”状态。

</specifics>

<deferred>
## Deferred Ideas

- iframe Runtime Host shell、sandbox bootstrap UI、height sync 和 HTML courseware
  实际渲染链路 — 留给 Phase 29。
- 内置 HTML runtime 的 authoring surface、teacher preview / student player /
  classroom 中的真实 runtime rendering — 留给 Phase 29 / Phase 32。
- capability enforcement 细节、plugin manifest v2 runtime declaration、lifecycle
  state machine、allowed/denied audit inspector — 留给 Phase 30 / Phase 31。
- raw clickstream、超高频遥测或比“语义 interaction event”更细的行为日志 — 留给后续
  analytics / inspector phase。
- Redis/Event Bus/WebSocket 的真实 cutover、distributed worker fan-out 或 transport
  provider switch — 留给后续 runtime platform expansion。
- 独立的 runtime descriptor registry / metadata truth path — 当前已否决，若未来确有需要，
  另开 phase 讨论。

</deferred>

---

*Phase: 28-runtime-bridge-contracts-and-session-persistence*
*Context gathered: 2026-05-16*
