# Phase 23: Student in-class activity flow - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段在不改变现有 student player 的 cached shell、Suspense personal
state、SSE lock/unlock 运行语义、task/quiz/progress 提交边界的前提下，
把 `/student/player` 从“可用的课时阅读器”升级为“课堂中明确知道现在该做
什么、要交什么、老师当前要求什么”的课堂活动界面。

交付重点固定为两类能力：

1. 让学生在当前步骤看到清晰的 activity guidance、expected output、
   evidence expectation 与 completion state。
2. 让学生可提交 durable 的课堂 quick response / in-class evidence，且保
   持 append-only、可审计、与现有学习提交链路兼容。

本阶段不扩展到教师监控、正式评价、analytics，不新增第二个 hero，不把学生
端变成 admin/checklist 风格页面，也不做 shadcn 初始化或新的组件体系切换。

</domain>

<decisions>
## Implementation Decisions

### Unified activity card architecture
- **D-01:** 当前活动卡采用强统一结构。`content`、`task`、`quiz` 三类步骤
  都必须先经过统一的“课堂活动壳”，先稳定展示 guidance、expected
  output、evidence expectation 与 completion state，再进入各自的 step-
  specific action area。
- **D-02:** 统一活动壳必须把“当前活动任务”保持为第一视觉层；步骤轨、沉浸
  说明、历史记录都只能作为次级层，不得重新抢主舞台。
- **D-03:** 统一活动壳是对现有 step card 的收口，不是新增第二套平行步骤模
  型，也不是把 `teachingDesign` 原字段名或 teacher-only 文案直接暴露给学
  生。

### Quick response and evidence capture
- **D-04:** quick response 首发形态固定为“轻量任务卡”。它复用现有 task-
  style 提交心智与服务端边界，但视觉更短、更课堂化、更适合快速 check-in。
- **D-05:** quick response 的持久化必须继续走服务端 durable contract，不
  做 client-only toggle、本地草稿即事实、或临时 SSE memory 写入。首发优
  先复用已有 `classroomEvidence` / `classroomTimeline` 写入链路与现有学
  生提交卡的交互模式。
- **D-06:** quick response 必须保持 append-only 历史，不覆盖旧记录；成功
  反馈必须明确说明“已记录”，并让学生知道这是一条新的课堂记录。

### Runtime guidance and teacher recommendation posture
- **D-07:** 老师锁定/推荐的引导力度固定为中提示。保留现有 banner、badge
  与推荐 CTA，但把“现在先做什么、是否还能自由浏览、下一步建议是什么”写
  得更直接。
- **D-08:** 不采用过强压迫式引导。学生端不增加全屏警报式提示，不把推荐步
  骤做成与当前主提交动作同级竞争的主动作。
- **D-09:** locked 模式继续只限制导航，不阻止学生完成当前步骤；recommended
  模式继续允许自由浏览，但推荐入口与说明要更明确地服务课堂节奏，而不是扩
  成老师远程强控面板。

### Submission visibility and history hierarchy
- **D-10:** 最新提交与完整历史都继续保留，但视觉层级明确区分：最新一次尝
  试与当前输入区保持近邻关系，历史记录整体降级为次级 tonal 层。
- **D-11:** task、quiz、quick response 的历史都不能与当前输入区争抢主舞
  台。首发优先保证“当前该交什么”和“最近一次已交什么”清晰，再让学生在次
  级区域回看历史。
- **D-12:** teacher feedback 继续贴近最新记录展示，不拆成独立大面板，也
  不扩写成正式评价视图。

### Existing constraints to preserve
- **D-13:** Phase 23 必须继承 Phase 21：`teachingDesign`、
  `evidenceExpectation` 继续是服务端真相源；学生端只是按需消费，不把它扩
  成正式评价系统。
- **D-14:** Phase 23 必须继承 Phase 22：学生端应消费与 launch/run-sheet
  同一事实来源，但改写成 classroom-friendly 文案，不回退到客户端猜测或新
  建 session-specific 文案系统。
- **D-15:** 继续保留 `/student/player` 的 cached shell + Suspense personal
  state 架构，不把 DB 读写移入 client，不把 shell 与 personal state 重新耦
  合成单次大 DTO 读取。
- **D-16:** 继续保留现有 task、quiz、progress、resume、SSE reconnect、
  locked/unlocked 的兼容性；Phase 23 的实现必须是在现有 runtime 上叠加清
  晰度和新 evidence path，而不是重写 player 协议。
- **D-17:** 页面视觉继续遵守 `23-UI-SPEC.md` 与 `DESIGN.md`：单主舞台、
  无第二 hero、无 1px divider、Lexend、简体中文、tonal layering、Primary
  Blue 仅用于主焦点与 selected emphasis。

### Claude's Discretion
- 统一活动壳内部 4-6 个信息块的具体命名、顺序和组件拆分方式，可由 planner
  在不违背强统一决策的前提下收敛。
- quick response 轻量任务卡最终落在 `content` 承载还是新 UI 分支承载，可由
  planner/researcher 基于现有 payload 与 durable write path 收敛，但必须保
  持视觉更轻、提交更快、历史仍 append-only。
- 历史记录默认展开、局部折叠还是“显示最近 N 条 + 更多”这类具体交互，可由
  planner 决定，但必须保持历史次级化，不抢输入区焦点。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.3 课堂实施闭环的项目级边界，以及不把本期
  扩成教师监控、评价、分析整套产品面的约束。
- `.planning/ROADMAP.md` — Phase 23 的正式 goal、success criteria 与 3
  个计划槽位；明确本期只覆盖 `ACT-01` 与 `ACT-02`。
- `.planning/REQUIREMENTS.md` — `ACT-01` / `ACT-02` 的正式需求来源，以
  及与 `ACT-03`、`EVAL-*`、`ANALYTICS-*` 的边界关系。
- `.planning/STATE.md` — 已锁定的 student/player 沉浸主舞台、中文文案、
  SSE 课堂语义与前序阶段 carry-forward 决策。

### Phase-specific design and upstream decisions
- `.planning/phases/23-student-in-class-activity-flow/23-UI-SPEC.md` —
  Phase 23 的学生课堂活动流 UI 合同，定义信息架构、copywriting、视觉约束、
  quick-response 合同与 runtime posture。
- `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-CONTEXT.md`
  — `teachingDesign` / `evidenceExpectation` / durable classroom
  evidence 的服务端合同与 fallback 边界。
- `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-CONTEXT.md`
  — launch/run-sheet 已确定的事实来源与 cue 分层，学生端必须消费同一真相源并
  改写成 classroom-friendly 文案。

### Existing player and runtime implementation
- `src/app/(student)/student/player/page.tsx` — 当前 player 路由把 shell 与
  personal state 分离，并通过 Suspense 流式加载 personal state。
- `src/components/surfaces/player-surface.tsx` — 当前学生端主舞台、沉浸式
  shell 与 fallback 骨架的直接实现。
- `src/components/learning/classroom-runtime-client.tsx` — 当前步骤轨、推荐/
  锁定状态、reconnect banner 与当前步骤渲染的核心客户端实现。
- `src/components/learning/task-step-card.tsx` — 现有 task 提交卡、append-
  only 历史与最近一次尝试展示模式。
- `src/components/learning/quiz-step-card.tsx` — 现有 quiz 作答卡、retry 与
  latest/history 呈现模式。

### DTO, DAL, action, and cache boundaries
- `src/lib/dto/learning.ts` — `StudentPlayerShellDTO` /
  `StudentPlayerPersonalDTO` / task / quiz / runtime DTO 的真实 contract。
- `src/lib/dal/learning.ts` — 当前 student player shell/personal 读取、
  progress、task、quiz 写入与 resume/runtime 聚合链路。
- `src/lib/dto/classroom.ts` — `student-quick-response` evidence source、
  `RecordClassroomEvidenceInputSchema` 与 classroom snapshot contract。
- `src/lib/dal/classroom.ts` — `recordClassroomEvidence()`、classroom
  evidence / timeline durable 写入与 session-owned 事实源实现。
- `src/actions/learning-actions.ts` — task / quiz / progress 的 Server
  Actions 与 tag invalidation 路径。
- `src/actions/classroom-actions.ts` — classroom evidence / presence /
  reconnect 相关 Server Actions 与 `cacheTags.classroom(sessionId)` 失效路径。
- `src/lib/cache-policy.ts` — `/student/player` 的显式 cache boundary，规
  定 shell、personal state 与 classroom live state 的拆分方式。

### Existing regression surfaces
- `src/components/learning/student-step-cards.test.ts` — 当前 task / quiz 与
  player wiring 的回归基线。
- `src/components/surfaces/student-player-surfaces.test.ts` — 当前 player
  shell、Suspense boundary、DTO wiring 的回归基线。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/surfaces/player-surface.tsx`：已经提供单主舞台的学生端
  shell、fallback skeleton 和沉浸式 hero，可直接承接 Phase 23 的新活动流，
  无需再起第二 hero。
- `src/components/learning/classroom-runtime-client.tsx`：已经集中管理步骤
  轨、老师推荐步骤 CTA、locked/unlocked 与 reconnect banner，是统一活动壳
  最直接的接入点。
- `src/components/learning/task-step-card.tsx`：已经有“输入区 + 主按钮 +
  最近一次 + 全历史”的成熟交互，可作为 quick response 轻量任务卡的最近邻。
- `src/components/learning/quiz-step-card.tsx`：已经有课堂作答型交互与 latest /
  history 分层，适合迁入统一活动壳之下。
- `src/lib/dal/classroom.ts` + `src/actions/classroom-actions.ts`：已经具备
  durable `recordClassroomEvidence()` 写入入口，可直接服务 quick response
  的 session-owned evidence capture。

### Established Patterns
- player 路由当前采用 `shell -> Suspense -> personal state` 的双 DTO 结
  构；Phase 23 不能回退到一次性大对象读取或把 personal data 提前塞回 shell。
- learning 与 classroom 写路径都遵守 `DAL + Server Actions + updateTag()`
  模式；新的 quick response 也必须沿用这一边界。
- 现有历史尝试全部是 append-only 模型，`latest` 与 `history` 已经在 DTO 中
  区分；Phase 23 应复用而不是发明覆盖式最新值模型。
- 课堂运行控制仍以 `activeStepId`、`locked`、`teacherRecommendedStepId`
  和 SSE snapshot 为核心协议；Phase 23 只能增强学生端表达，不改 runtime
  control contract。

### Integration Points
- `src/lib/dto/learning.ts` / `src/lib/dal/learning.ts`：最可能新增统一活动
  壳所需的 student-facing guidance、expected output、completion copy 等聚合字
  段。
- `src/components/learning/classroom-runtime-client.tsx`：Phase 23 主要 UI
  重构与推荐/锁定文案增强集中区。
- `src/components/learning/task-step-card.tsx` /
  `src/components/learning/quiz-step-card.tsx`：需要适配到统一活动壳下，只保留
  step-specific action area 与历史次级层。
- `src/actions/classroom-actions.ts` 与 `src/lib/dal/classroom.ts`：quick
  response durable evidence path 的主入口。
- `src/components/learning/student-step-cards.test.ts` 与
  `src/components/surfaces/student-player-surfaces.test.ts`：现有 player UX、
  wiring、Suspense boundary 的回归基线，需要在本期扩充覆盖。

</code_context>

<specifics>
## Specific Ideas

- 学生端当前活动卡固定采用“先统一课堂活动壳，再进入各 step 的动作区”这一
  信息架构，而不是继续让 `content`、`task`、`quiz` 三张卡各写各的顶层叙
  事。
- quick response 首发刻意做得比 task 更短、更快，但其 durable、append-
  only、可审计语义必须与现有提交系统对齐。
- 老师推荐/锁定提示保持中等力度：文案更直接，但不做过强控制感，不让学生端
  产生“被系统命令式驱赶”的体验。
- 最新记录继续靠近当前输入区；完整历史继续保留，但显式降到次级 tonal cards，
  避免课堂现场被历史内容分散注意力。
- 继续沿用 `23-UI-SPEC.md` 的 copy contract：学生端所有提示都要直接回答
  “现在做什么、交什么、下一步怎么办”。

</specifics>

<deferred>
## Deferred Ideas

- 教师 live classroom 监控、干预面板、名册运营视图 — 属于 Phase 24，不并
  入本期学生端活动流。
- 正式 formative evaluation 工作流、参与度打点、评价标签聚合 — 属于
  Phase 24。
- lesson/session analytics、趋势钻取、反馈工作量统计 — 属于 Phase 25-26。
- 第二 hero、多标签舞台、学生端复杂 quick tools（如课堂笔记/同伴列表产品
  化）— 超出 Phase 23 主范围，保持占位或次级。
- shadcn 初始化或新的组件库迁移 — 不属于本阶段。

</deferred>

---

*Phase: 23-student-in-class-activity-flow*
*Context gathered: 2026-05-13*
