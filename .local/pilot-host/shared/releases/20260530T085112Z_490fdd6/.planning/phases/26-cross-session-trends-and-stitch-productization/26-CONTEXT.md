# Phase 26: Cross-session trends and Stitch productization - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定承接 Phase 25 已落地的单次 `classroom session recap`，把教师的课后判断再往上抬一层，并把关键教师工作链收束成同一套产品语言。

交付范围固定为三件事：

1. 提供教师可日常使用的跨 session 趋势视图，让老师先看“一个班最近几次课发生了什么变化”，再钻取到单个学生与具体课堂。
2. 让趋势分析建立在现有 `session-first + durable evidence + latest feedback` 的事实源之上，服务后续判断与处理，而不是重建第二套 analytics 真相源。
3. 把 `editor -> launch -> classroom -> review -> trends` 主链，以及 `teacher dashboard`、`help`、`settings` 这些次级教师页面，统一到同一套 Stitch-aligned 产品骨架里，不再让每个页面各自像独立产品。

本阶段不把 `/classroom` 的单次 recap 主入口挪走，不把 `/teacher/review` 改造成趋势主入口，不合并 classroom recap 与 review 成新 mega workflow，不引入 AI narrative analytics，不扩成正式 gradebook，也不顺手重做 public / student / admin 全量页面。

</domain>

<decisions>
## Implementation Decisions

### Trends entry and route posture
- **D-01:** Phase 26 的 trends 必须是独立的教师入口，不能继续塞进 `/classroom` 或 `/teacher/review` 内部当附属分区。
- **D-02:** 这个独立 trends 入口采用双入口姿态：一方面作为教师主导航中的一级入口存在，另一方面允许从单次 `/classroom` recap 深链进入同一 trends 页面。
- **D-03:** `/classroom` 继续保持 live runtime 与单次 session recap 的主域；trends 只是其上的跨 session 比较层，不能反过来替代单次复盘主路径。
- **D-04:** `/teacher/review` 继续保持 lesson-level feedback 工作台；Phase 26 可以把 trends 的后续动作导向 review，但不能把 review 与 trends 收成新的双主流程。

### Comparison baseline
- **D-05:** trends 首屏默认先看班级趋势，而不是先看单个学生趋势。
- **D-06:** 班级趋势的首发默认比较单位固定为“最近几次真实 classroom session”，不是 lesson-first 聚合，也不是先做并列双视角。
- **D-07:** student-level trend 作为 class-first 趋势的 drill-down 或重点名单展开，而不是和班级趋势抢首屏叙事。
- **D-08:** 若后续需要补 lesson-level 汇总，也只能作为次级切换或辅助视角，不能取代 session-first 的默认 analytic posture。

### Drill-down and next-action flow
- **D-09:** 教师在 trends 中点开异常波动时，第一步固定先在 trends 页面内展开，不直接强跳到其他路由。
- **D-10:** trends 内展开必须先给出与该波动对应的 session 摘要、受影响学生和关键信号，先帮助老师理解“发生了什么”，再决定下一步去哪里处理。
- **D-11:** 从 trends 展开态进入后续处理时，主下一跳优先回到对应的 `/classroom?sessionId=...` 单次 recap，而不是优先跳去 `/teacher/review`。
- **D-12:** `/teacher/review` 只作为次级 follow-up 入口存在，主要用于老师确认完 session 语境后再做 task / quiz feedback，不作为 trends 的默认第一跳。

### Productization skeleton and coverage scope
- **D-13:** Phase 26 的产品化统一不是“只统一颜色和圆角”，而是强统一骨架：共享一致的 header 节奏、hero/section 层级、CTA 语法、状态卡语言与 tonal surface hierarchy。
- **D-14:** 这套强统一骨架必须先覆盖教师主链页面：`/teacher/editor`、`/teacher/launch`、`/classroom`、`/teacher/review`、新增 trends 页面。
- **D-15:** 同一轮产品化还要显式覆盖 `teacher dashboard`，让它成为这条教师工作链的总入口，而不是停留在与主链脱节的独立首页语言。
- **D-16:** `help`、`settings` 这类次级教师页面也纳入本轮统一范围，不能继续以“次级页”为理由长期脱离同一产品骨架。
- **D-17:** 强统一骨架不等于所有页面长得一样；各页面仍可保留自己的主工作区结构，但页面姿态、层级和动作语言必须明显属于同一产品系统。
- **D-18:** 本轮统一必须优先复用现有 `teacherSurfaceRhythm`、`surfaceWidths`、route metadata shell contract 与现有 teacher surfaces，而不是另起第二套页面框架或新导航体系。

### the agent's Discretion
- 独立 trends 入口的精确 route path（如 `/teacher/trends`、`/teacher/analytics` 或等价命名）可由 planner 决定，但必须同时支持主导航入口与从 `/classroom` recap 深链进入。
- trends 首发使用何种具体比较模块与图形表达（例如 chart、small multiple、metric rail、session cards）可由 planner 收敛，但必须先回答“这个班最近几次课发生了什么变化”。
- lesson-level 汇总是否在首发就作为次级 toggle 暴露，可由 planner 判断，但不能改变 `recent sessions` 作为默认比较单位。
- 次级页面如何继承强统一骨架中的 hero / section 变体、以及移动端如何简化信息密度，可由 planner 与 researcher 收敛，但必须保持统一 posture，而不是每页各做一套 responsive 逻辑。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.3 里程碑对 teaching orchestration、classroom intelligence、Stitch 对齐和教师产品面的项目级边界。
- `.planning/ROADMAP.md` — Phase 26 的正式 goal、success criteria 与 4 个计划槽位；明确同时包含 `ANALYTICS-02` 与 `UI-05`。
- `.planning/REQUIREMENTS.md` — `ANALYTICS-02` 与 `UI-05` 的正式需求来源，以及它们与 `ANALYTICS-01`、`EVAL-*` 的边界关系。
- `.planning/STATE.md` — 已锁定的 carry-forward 决策，尤其是 session-first recap、split workload、显式 `未评价` 与下一阶段目标提示。

### Upstream phase decisions
- `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-CONTEXT.md` — durable evidence、timeline 与 session-first analytics 真相源的基础约束。
- `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-CONTEXT.md` — `/teacher/editor` 与 `/teacher/launch` 的职责边界、launch posture 与 orchestration workspace 原则。
- `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-CONTEXT.md` — `/classroom` 作为运行与评价主域、single-student detail 与 teacher-side evaluation posture 的锁定决定。
- `.planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md` — single-session recap 保持在 `/classroom`、student-first recap、split workload、显式 `未评价` 等必须沿用的 Phase 25 合同。

### Existing recap, trend-adjacent, and follow-up contracts
- `src/app/(classroom)/classroom/page.tsx` — `/classroom` 当前如何同时承接 live session、ended session recap 与 `sessionId`-driven deep links。
- `src/lib/dto/classroom.ts` — `ClassroomSessionRecapDTO`、student/step recap summary 等 typed contracts，是 cross-session trend read model 的最近邻事实接口。
- `src/lib/dal/classroom.ts` — `getClassroomSessionRecapDTO()` 与 session-level recap 聚合 helper；Phase 26 必须复用同一 evidence truth source。
- `src/components/surfaces/classroom-console-surface.tsx` — live runtime 与 single-session recap 共处同一 classroom shell 的当前产品姿态。
- `src/components/classroom/classroom-session-recap-surface.tsx` — 现有 recap hero、student-first drill-down、split workload 与次级 step diagnostics 的直接 UI 合同。
- `scripts/verify-phase25-session-analytics.ts` — Phase 25 verifier，明确守住“recap 留在 `/classroom`、不新增第二真相源、无独立 analytics 主路由”的 guardrails。
- `src/app/(teacher)/teacher/review/page.tsx` — `/teacher/review` 当前仍是 lesson-level review 入口，说明 trends 不能把它误当 single-session recap 替代品。
- `src/components/learning/teacher-review-surface.tsx` — 现有 review surface 的 feedback queue、latest attempt 与 history posture，可作为 trends 后续 follow-up 的次级去向参考。

### Teacher product surface and shell contracts
- `src/components/surfaces/lesson-editor-surface.tsx` — 当前 planning surface 的 header metrics、workspace posture 与 teacher-facing shell language。
- `src/components/surfaces/classroom-launch-surface.tsx` — 当前 launch surface 的 hero、主次区关系与“新课堂主动作 + live classroom 次级恢复区”表达方式。
- `src/components/surfaces/teacher-dashboard-surface.tsx` — teacher dashboard 的 current rhythm、hero posture、co-primary module 与 live stage language，是主入口产品化的基线。
- `src/components/surfaces/settings-surface.tsx` — 次级教师页面如何使用 `teacherSurfaceRhythm`、`surfaceWidths` 与 tonal sections 的基线实现。
- `src/components/surfaces/help-center-overview-surface.tsx` — 次级帮助页面如何沿用 teacher-facing product language，而不是退回 utilitarian 文档页的参考实现。
- `src/components/surfaces/teacher-surface-rhythm.ts` — 当前 teacher surfaces 共享的 rhythm tokens、hero/section/cardInset 约定，是产品化统一的直接 contract。
- `src/components/surfaces/surface-widths.ts` — workspace 与 hero 文案宽度的共享版心 contract。
- `src/lib/theme-layout/route-surface-registry.ts` — teacher route metadata、shell mode、radius、width 与 chrome 的 route-level contract；新增 trends route 必须接入这里。
- `src/lib/theme-layout/shell-surface-resolver.ts` — 当前 route metadata 到 teacher shell UI state 的统一解析逻辑；Phase 26 不能绕开它做页面级 one-off shell 分支。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/surfaces/teacher-surface-rhythm.ts`：已经定义教师页面统一的 `hero`、`section`、`sectionCompact`、`cardInset`、`gradientHeroContent` 节奏，是本轮 productization 的第一复用点。
- `src/components/surfaces/surface-widths.ts`：已经定义 workspace 和 hero 文案版心，适合把 dashboard、help、settings 和新增 trends 页继续拉回统一宽度语法。
- `src/lib/theme-layout/route-surface-registry.ts` + `src/lib/theme-layout/shell-surface-resolver.ts`：teacher shell 已经是 route-metadata-driven；新增 trends route 和次级页 productization 都应在现有 contract 内完成，而不是再写 route string 分支。
- `src/lib/dal/classroom.ts` + `src/lib/dto/classroom.ts`：已有 session recap 读模型和 typed DTO，Phase 26 可直接在其上做 cross-session aggregation，而不必新建 analytics snapshot persistence。
- `src/components/classroom/classroom-session-recap-surface.tsx`：已经提供 `student-first recap + split workload + step diagnostics` 的成熟结构，是 trends drill-down 应回落的具体目标 surface。
- `src/components/learning/teacher-review-surface.tsx`：已经承载 lesson-level feedback queue，可作为 trends 的次级 follow-up 目的地，而无需重造批改工作台。
- `src/components/surfaces/lesson-editor-surface.tsx`、`src/components/surfaces/classroom-launch-surface.tsx`、`src/components/surfaces/classroom-console-surface.tsx`、`src/components/surfaces/teacher-dashboard-surface.tsx`、`src/components/surfaces/settings-surface.tsx`、`src/components/surfaces/help-center-overview-surface.tsx`：共同构成当前教师主链与次级页的产品语言样本，可作为统一骨架的直接对照集。

### Established Patterns
- classroom analytics 已经锁定为 `session-first`：single-session recap 留在 `/classroom`，历史回看也在 classroom domain 内完成；Phase 26 只能在其上加“跨 session 比较层”。
- `/classroom` 与 `/teacher/review` 当前是两个不同真相源与工作姿态：前者偏 session + classroom evidence，后者偏 lesson + attempts/feedback；Phase 26 应通过 drill-down 和 CTA 串联，而不是强行收成一套混合 DTO。
- 教师页面当前广泛使用“渐变主舞台 + tonal sections + cardInset + rounded shell”的信息层级；productization 应统一这套姿态，而不是重新发明各页自己的 hero / rail / action posture。
- teacher shell 的壳层行为已经 route-metadata 化，说明 trends、新 CTA 和次级页统一都应优先走 registry / resolver，而不是在 JSX 内写页面特判。

### Integration Points
- 新增独立 trends route 时，需要同时接入教师主导航和从 `/classroom` recap 出发的 deep-link 路径。
- Phase 26 的 cross-session trends read model 最可能落在现有 classroom DTO / DAL 附近，复用 session recap aggregation 的口径与 evidence contracts。
- `ClassroomSessionRecapSurface` 和 `teacher dashboard` 中的 CTA，是把单次 recap 与 trends 连起来的最自然入口。
- `route-surface-registry`、`shell-surface-resolver`、`teacherSurfaceRhythm`、`surfaceWidths` 是本轮 productization pass 需要显式复用和扩展的共享 contract。
- `editor / launch / classroom / review / trends / dashboard / help / settings` 这组页面是本轮统一的明确 integration set；不要只改主链而把次级页留在旧语言里。

</code_context>

<specifics>
## Specific Ideas

- trends 首屏应该先回答“这个班最近几次课发生了什么变化”，而不是一上来就散成很多学生或很多 lesson 过滤器。
- 单次 `/classroom` recap 继续是老师理解某一节课语境的核心落点；trends 负责把老师带到“值得回看的那几节课”。
- trends 内点击异常点后，先在当前页解释该波动，再由主 CTA 回到对应 single-session recap；review 是后续处理的次级去向，而不是第一跳。
- 强统一骨架必须贯穿 `editor / launch / classroom / review / trends / dashboard / help / settings`，让主链和次级页都明显属于同一套教师产品，而不是只有个别页面“看起来更新了”。
- 没有锁定具体 chart library 或单一可视化形式；只锁定了默认比较逻辑、路线关系与产品姿态。

</specifics>

<deferred>
## Deferred Ideas

- AI narrative summary、自动洞察结论、智能推荐话术 — 留给后续 analytics / AI phase，不在本阶段 deterministic trends 范围内。
- 把 `/classroom` single-session recap 挪出 classroom domain，或把 trends / review / recap 合并成一个超级工作台 — 留待未来更大范围的信息架构调整再判断。
- 正式 gradebook、评分体系、学校级或跨学校运营报表 — 超出本阶段 teacher daily workflow 与趋势分析范围。
- public / student / admin 全量页面的统一重构 — 本阶段优先教师主链和明确选中的次级教师页面。

</deferred>

---

*Phase: 26-cross-session-trends-and-stitch-productization*
*Context gathered: 2026-05-14*
