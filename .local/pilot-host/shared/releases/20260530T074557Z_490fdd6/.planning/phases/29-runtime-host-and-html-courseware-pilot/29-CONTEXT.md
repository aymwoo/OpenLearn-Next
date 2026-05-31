# Phase 29: Runtime Host and HTML courseware pilot - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定交付第一个可运行的 sandboxed HTML courseware runtime pilot，让
teacher preview、student player 与 classroom-compatible surface 都能在现有主链中
渲染同一个 Runtime Host。

交付范围固定为四件事：

1. 在现有主工程内建立一个共享的 Runtime Host shell，负责 sandboxed iframe、
   bootstrap handshake、height sync 与 host-owned message bridge。
2. 把 runtime-capable step 的渲染接入现有 `/teacher/editor/preview`、
   `/student/player` 与 `/classroom` 路径，而不是新开 runtime 专用主路由。
3. 通过现有 built-in teaching-step template 机制，让教师能在 editor 中添加并发布
   一个内置 HTML runtime step，且 descriptor 继续随 published snapshot 冻结。
4. 证明该 HTML runtime 能完成一个真实互动并通过既有 Phase 28 host action 边界
   提交结构化结果。

本阶段不交付 capability enforcement 深化、plugin lifecycle 状态机、allowed or
denied audit surface、transport gateway、inspector，且不把第三方远程 runtime 或
multiple runtime types 拉入 scope。

</domain>

<decisions>
## Implementation Decisions

### Shared Runtime Host ownership
- **D-01:** Runtime Host 必须是单一共享宿主组件，teacher preview、student player
  与 classroom live stage 都消费同一套 iframe/bootstrap/bridge 逻辑，不允许每个
  surface 各自手写一套 iframe integration。
- **D-02:** Runtime Host 只负责宿主职责：iframe shell、bootstrap 调用、message
  校验、height sync、snapshot push、save/submit/interaction/teacher-control 桥接；
  业务页面只提供 surface-specific props。

### Sandbox and bridge safety
- **D-03:** HTML runtime pilot 继续采用 sandboxed iframe，不允许 runtime 直接调用
  DAL、Server Actions、`db`、SSE 或 parent DOM。
- **D-04:** runtime 与 host 的浏览器通信固定走 typed `postMessage` bridge；host
  侧再调用 Phase 28 已有的 runtime host/server action 边界，不新增 client-side
  truth write shortcut。
- **D-05:** iframe height 由 runtime 通过 typed message 申报，host 决定是否接受、
  节流并应用高度；runtime 不得直接改写父容器布局。

### Surface integration rules
- **D-06:** teacher preview 继续是 draft-only surface；即使 runtime-capable step
  被渲染，也不能读取 student progress、runtime session 恢复态或 classroom live
  snapshot。
- **D-07:** student player 继续保持 `shell + Suspense personal state` 分层；
  Runtime Host consumer 必须落在当前 personal/runtime region 中，而不是把 runtime
  恢复态重新塞回 cached shell。
- **D-08:** `/classroom` 继续是教师 live runtime 主域；runtime host 只能嵌入当前
  classroom surface 的 live stage 或控制区，不新增第二条 teacher runtime 主路径。

### Authoring and publish posture
- **D-09:** 内置 HTML runtime step 必须继续走现有 built-in template 注入路径：
  `listBuiltInTeachingStepTemplates()` -> `LessonAuthoringWorkspace` ->
  `addLessonStepAction()`；不新增独立 runtime step family。
- **D-10:** HTML runtime pilot 的初始 step payload 必须携带 `payload.runtime`
  descriptor，并继续通过当前 `publishLesson()` 冻结进
  `publishedLessonVersions.snapshotJson`。
- **D-11:** 本阶段的第一个 HTML runtime 只能是本地 built-in 资产或本地 route，
  不接受 remote bootstrap URL、第三方 iframe 或 marketplace runtime source。

### Pilot interaction and truth ownership
- **D-12:** 该 pilot 只证明一个最小真实互动闭环：运行、交互、结构化 save/submit、
  teacher/student surface 可见更新；不在本阶段扩成通用 runtime builder。
- **D-13:** 结构化结果继续走 Phase 28 的 `runtime-submit` 语义：save 只是
  recoverable state，submit 才桥回现有 classroom/learning durable truth。
- **D-14:** classroom snapshot 更新继续由现有 durable DTO path 提供，Runtime Host
  只负责把这些 server-owned updates 推进 iframe，不允许 iframe 自行持有一份更权威
  的 classroom live state。

### The agent's Discretion
- 共享 Runtime Host 的精确物理位置可由 planner 收敛，但必须保持单一 host root
  和 public export，不让 preview/player/classroom 各自产生私有 iframe helper。
- typed browser bridge 的精确 message names 可由 planner 收敛，但必须显式区分
  `bootstrap`、`height`、`interaction`、`save`、`submit`、`snapshot-update`
  或等价语义。
- pilot runtime 交互的具体题型或输入形状可由 planner 收敛，但必须保持“一个真实互动 +
  一个结构化 submit payload + 现有 truth bridge”这三个事实。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v2.0 runtime platform foundations 的固定 posture：
  单体内平台化、只做一个 HTML runtime pilot、无 PostgreSQL/Redis/WebSocket
  cutover。
- `.planning/ROADMAP.md` — Phase 29 正式 goal、success criteria 与四个计划槽位。
- `.planning/REQUIREMENTS.md` — `RHOST-01`、`RHOST-02`、`RHOST-03` 的 requirement
  truth，以及 `RHOST-04` 仍留在 Phase 32 的边界。
- `.planning/STATE.md` — 当前 milestone 状态与 carry-forward 决策。

### Locked upstream runtime decisions
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-CONTEXT.md`
  — 锁定 `payload.runtime`、bootstrap 最小 DTO、append-only runtime truth、save vs
  submit 语义。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-RESEARCH.md`
  — Phase 28 对 bootstrap、host action、cache invalidation matrix 的研究结论。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-01-SUMMARY.md`
  — runtime descriptor 和 TeachingBridge contracts 已落地。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-02-SUMMARY.md`
  — runtime session/state/outbox durability schema 与 bootstrap contracts 已落地。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-03-SUMMARY.md`
  — guarded runtime host actions、save/submit truth bridge 已落地。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-04-SUMMARY.md`
  — runtime recovery summary、cache freshness 和 `verify:phase28` 已落地。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-VERIFICATION.md`
  — Phase 28 正式 close 证明。

### Existing route and surface anchors
- `src/app/(teacher)/teacher/editor/page.tsx` — current editor entry and built-in
  template injection root.
- `src/app/(teacher)/teacher/editor/preview/page.tsx` — current teacher preview route
  posture and strict `courseId + lessonId` guard.
- `src/app/(student)/student/player/page.tsx` — current player shell/personal split.
- `src/app/(classroom)/classroom/page.tsx` — current classroom route that hosts live
  snapshot and recap without a second teacher runtime path.
- `src/components/surfaces/teacher-lesson-preview-surface.tsx` — current draft preview
  surface language.
- `src/components/learning/classroom-runtime-client.tsx` — current student runtime stage,
  current-step rendering, and SSE snapshot handling.
- `src/components/surfaces/player-surface.tsx` — current immersive player shell.
- `src/components/surfaces/classroom-console-surface.tsx` — current classroom teacher
  live-stage shell.

### Existing runtime contracts and server boundary
- `src/features/runtime-platform/contracts/descriptors.ts` — current
  `html-courseware` descriptor kind, `submitTarget`, bootstrap metadata, and
  iframe sandbox descriptor contract.
- `src/features/runtime-platform/contracts/bridge.ts` — current runtime bootstrap,
  interaction, save, submit, and teacher-control request/result envelopes.
- `src/features/runtime-platform/contracts/permissions.ts` — current granted runtime
  capabilities and host permissions.
- `src/features/runtime-platform/classroom/runtime-session-contracts.ts` — current
  runtime bootstrap DTO shape.
- `src/features/runtime-platform/classroom/runtime-session.ts` — current server-owned
  create/resume/save/submit behavior.
- `src/features/runtime-platform/host-actions/runtime-host.ts` — current runtime host
  action gateway.
- `src/actions/classroom-actions.ts` — current server action entrypoints and cache
  invalidation discipline.

### Existing authoring and built-in template chain
- `src/lib/dto/lesson-authoring.ts` — existing step payload contract carrying
  `payload.runtime` and `builtInSource`.
- `src/lib/dto/resource-ai.ts` — existing built-in teaching-step key definitions,
  template payload schema, and built-in registry constants.
- `src/lib/dal/plugins.ts` — existing `listBuiltInTeachingStepTemplates()` flow.
- `src/server/plugins/registry.ts` — existing built-in teaching-step template dispatch.
- `src/components/authoring/lesson-authoring-workspace.tsx` — current left-rail built-in
  template injection and flow composition UI.
- `src/lib/dal/lesson-authoring.ts` — current publish freeze path.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `classroom-runtime-client.tsx` 已经是最接近 runtime host consumer 的地方：它拥有
  current step selection、SSE snapshot fallback、manual refresh 与 step card 插槽。
- `teacher-lesson-preview-surface.tsx` 已经有完整的 step-by-step preview shell，适合
  在 step card 内接入 read-only runtime host，而不改 route posture。
- `classroom-console-surface.tsx` 已经固定保留单一 live stage + tonal side panels，适合
  在 live snapshot 情况下嵌入 teacher-facing runtime host pane。
- `lesson-authoring-workspace.tsx` 已经支持 built-in templates 从左侧资源库直接注入到
  lesson flow，是内置 HTML runtime step 的自然 authoring 入口。
- `descriptors.ts` 已经存在 `kind: "html-courseware"` 与 `entry.sandbox = "iframe"`
  的 contract，这意味着本阶段不需要重新发明 descriptor 语义。

### Established Patterns
- preview、player、classroom 都是 route-level server compose + surface render 的结构，
  说明 Runtime Host 更适合做 shared component 被 surfaces 消费，而不是新路由层系统。
- built-in teaching steps 首发始终沿用 plugin/template allowlist 机制，而不是前端
  硬编码私有按钮；Phase 29 也要沿用同一条路。
- student player 的 personal runtime state 已明确只能放在 streamed personal DTO，
  任何 runtime host 接入都不能打破这一 split。
- runtime submit/save/teacher-control 已经有 host-side trusted server boundary，
  所以 Phase 29 的浏览器 bridge 只需要调用现有 action，不该重造写路径。

### Integration Points
- teacher preview: `getTeacherLessonPreviewDTO()` ->
  `TeacherLessonPreviewSurface` -> runtime-capable step card。
- student player: `getStudentPlayerShellDTO()` + `getStudentPlayerPersonalDTO()` ->
  `PlayerSurface` -> `ClassroomRuntimeClient` -> current step renderer。
- classroom: `getClassroomSnapshotDTO()` -> `ClassroomConsoleSurface` -> teacher live
  stage / control surface。
- authoring: `listBuiltInTeachingStepTemplates()` -> `LessonAuthoringWorkspace` ->
  `addLessonStepAction()` -> `publishLesson()`。

</code_context>

<specifics>
## Specific Ideas

- 第一个 built-in HTML runtime 可以作为一个本地 asset-backed step，继续借用现有
  content-type shell，但真实交互由 `payload.runtime` descriptor 驱动。
- runtime host 需要一个统一的 browser bridge，把 iframe request 规范化后再转到
  `bootstrapRuntimeSessionAction`、`saveRuntimeStateAction`、`submitRuntimeStateAction`
  等现有 server action。
- teacher preview 与 classroom teacher stage 都可以用 teacher actor scope 渲染同一个
  runtime host，但 preview 固定是 draft-only、classroom 固定是 live snapshot-aware。
- player 侧的 runtime host 首发必须嵌入 `ClassroomRuntimeClient` 的 current step
  主舞台，而不是绕开现有 activity shell 再开一套播放器。

</specifics>

<deferred>
## Deferred Ideas

- capability-checked runtime host actions、allowed/denied audit 语义与 lifecycle
  governance — 留给 Phase 30。
- transport gateway、WebSocket-compatible delivery 与 runtime inspector — 留给
  Phase 31。
- 远程 runtime 包、multiple runtime types、第三方 plugin runtime 执行 — 留给未来
  runtime platform expansion。
- HTML runtime pilot 的最终硬ening与 milestone proof close — 留给 Phase 32。

</deferred>

---

*Phase: 29-runtime-host-and-html-courseware-pilot*
*Context gathered: 2026-05-16*
