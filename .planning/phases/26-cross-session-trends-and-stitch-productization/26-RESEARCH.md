# Phase 26: Cross-session trends and Stitch productization - Research

**Researched:** 2026-05-14
**Domain:** 跨 session 趋势分析、教师端产品化统一、Stitch-aligned surface system
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 ~ D-04:** trends 必须是独立教师入口；不能吞回 `/classroom` 或 `/teacher/review`，且 `/classroom` 继续保持 live runtime + single-session recap 主域。[VERIFIED: .planning/phases/26-cross-session-trends-and-stitch-productization/26-CONTEXT.md]
- **D-05 ~ D-08:** trends 首屏固定先看 class-first、recent real classroom sessions；student trend 只能是 drill-down，不与首屏抢叙事。[VERIFIED: 26-CONTEXT.md]
- **D-09 ~ D-12:** 点击异常波动后，先在 trends 页内展开 session summary / impacted students / signal explanation；主下一跳优先回 `/classroom?sessionId=...`，`/teacher/review` 仅作次级 follow-up。[VERIFIED: 26-CONTEXT.md]
- **D-13 ~ D-18:** productization 不是只改色彩，而是统一 header rhythm、hero/section hierarchy、CTA grammar、状态卡语言与 tonal surface hierarchy；必须覆盖 `editor -> launch -> classroom -> review -> trends` 主链，并显式覆盖 dashboard、help、settings；优先复用 `teacherSurfaceRhythm`、`surfaceWidths`、route metadata shell contract，禁止另起第二套框架。[VERIFIED: 26-CONTEXT.md]

### the agent's Discretion
- 独立 trends route 的准确路径名可由 planner 定，但必须支持一级导航 + `/classroom` 深链双入口。
- 趋势可视化的具体呈现方式可变，但首屏必须先回答“这个班最近几次课发生了什么变化”。
- lesson-level 汇总若存在，只能是次级 toggle，不得替代 `recent sessions` 默认比较单位。

### Deferred Ideas (OUT OF SCOPE)
- AI narrative analytics、自动洞察文案、推荐结论。
- 把 recap / review / trends 合并成新的 mega workflow。
- 正式 gradebook、学校级运营报表。
- public / student / admin 全量页面重构。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANALYTICS-02 | Teacher can inspect class-level and student-level trends across recent teaching sessions with drill-down to raw evidence. | 基于 `getClassroomSessionRecapDTO()` 已有 session-first 聚合，在 `src/lib/dal/classroom.ts` / `src/lib/dto/classroom.ts` 扩展 recent sessions aggregation、class trend summaries、student trend summaries、session drill-down pointers，避免新建 analytics truth store。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dto/classroom.ts] |
| UI-05 | System provides high-quality Stitch-aligned planning, runtime, evaluation, and analytics surfaces with responsive, product-level interaction polish. | 复用 `teacherSurfaceRhythm`、`surfaceWidths`、`route-surface-registry` 与现有 teacher surfaces，在 trends、dashboard、editor、launch、classroom、review、help、settings 统一 hero/section/card/CTA grammar，而不是页面各写各的 layout recipe。[VERIFIED: src/components/surfaces/teacher-surface-rhythm.ts][VERIFIED: src/components/surfaces/surface-widths.ts][VERIFIED: src/lib/theme-layout/route-surface-registry.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 继续使用 Next.js 16 App Router、React 19、Drizzle、SQLite；Phase 26 不应引入独立 analytics service、chart platform 或第二套 UI framework。[VERIFIED: AGENTS.md]
- UI 组件禁止直连数据库；趋势与 productization read model 必须经由 DAL / DTO / Server Components / Server Actions 暴露。[VERIFIED: AGENTS.md]
- teacher shell 必须继续通过 route metadata / resolver 工作，不能回退为 JSX route string branching。[VERIFIED: AGENTS.md][VERIFIED: src/lib/theme-layout/route-surface-registry.ts]
- 设计必须遵循 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`，保持中文、tonal surfaces、渐变主舞台与无 1px divider lines 的产品语言。[VERIFIED: AGENTS.md]

## Summary

Phase 26 最稳妥的实现方式是：

1. **在现有 classroom session truth 上增加 cross-session read model**，而不是建立独立 analytics snapshot。当前 `getClassroomSessionRecapDTO()` 已经把单次 session recap 组织成 `summary + workload + student-first drill-down + step diagnostics`，这是 recent-session trends 的直接上游事实层。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dto/classroom.ts]
2. **把 trends 做成独立 teacher route**，并接入 `TEACHER_THEME_ROUTE_KEYS` / `TEACHER_THEME_ROUTE_SURFACES`，这样主导航入口、shell posture、width/radius/chrome contract 能保持与现有 teacher surfaces 一致。[VERIFIED: src/lib/theme-layout/route-surface-registry.ts]
3. **趋势 drill-down 先在 trends 页内解释，再跳回 `/classroom` recap**。这和已锁定的 session-first product posture 完全一致，也避免 `/teacher/review` 被误升级为 trends 主流程。[VERIFIED: 26-CONTEXT.md][VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/components/learning/teacher-review-surface.tsx]
4. **productization 应该是 shared surface contract 的统一，而不是每页局部 beautify**。当前 dashboard、launch、help、settings 已经都部分使用 `teacherSurfaceRhythm`，但 header、hero、metric rail、CTA posture 仍不完全统一；Phase 26 应把这种统一收口成可验证的 route set。[VERIFIED: src/components/surfaces/teacher-dashboard-surface.tsx][VERIFIED: src/components/surfaces/classroom-launch-surface.tsx][VERIFIED: src/components/surfaces/help-center-overview-surface.tsx][VERIFIED: src/components/surfaces/settings-surface.tsx][VERIFIED: src/components/surfaces/lesson-editor-surface.tsx]

**Primary recommendation:** 用 `classroom.ts` / `classroom DTO` 扩出 recent-session trend aggregation，再新增独立 trends route，并以 shared teacher surface contracts 完成主链 + 次级页 productization 收口。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cross-session trend aggregation | API / Backend | Database / Storage | recent sessions、class trend、student trend、raw signal explanation 都需要 teacher-scoped 聚合，最自然的 owner 是 `src/lib/dal/classroom.ts`。[VERIFIED: src/lib/dal/classroom.ts] |
| Trend DTO contracts | API / Backend | Frontend Server | class trend cards、student trend drill-down、session pointers、filter/query contract 应统一在 `src/lib/dto/classroom.ts` 或同域 DTO 中 typed 化。[VERIFIED: src/lib/dto/classroom.ts] |
| Trends route entry + shell registration | Frontend Server | Browser / Client | 独立 route 需要进入 registry/resolver，保证 shell mode / width / chrome 一致，并可从主导航直达。[VERIFIED: src/lib/theme-layout/route-surface-registry.ts] |
| In-page trend expansion + deep-link CTA | Browser / Client | Frontend Server | 展开异常点、选学生、切 session 对比属于 UI 交互，但必须消费服务端已整形 DTO，不能 client 侧重算口径。[VERIFIED: src/app/(classroom)/classroom/page.tsx] |
| Productization pass across teacher routes | Browser / Client | Shared surface contract | 统一应以 `teacherSurfaceRhythm` / `surfaceWidths` / route surface metadata 为基础，而不是每个页面单写样式补丁。[VERIFIED: src/components/surfaces/teacher-surface-rhythm.ts][VERIFIED: src/components/surfaces/surface-widths.ts] |

## Recommended Project Structure

```text
src/
├── app/(teacher)/teacher/<trends-route>/page.tsx          # 独立 trends teacher route
├── components/surfaces/<teacher-trends-surface>.tsx       # trends 主 surface
├── components/classroom/                                  # 复用 session recap / drill-down components
├── lib/dto/classroom.ts                                   # cross-session trend DTO contracts
├── lib/dal/classroom.ts                                   # recent-session trend aggregation helpers
├── lib/theme-layout/route-surface-registry.ts             # 注册 trends route shell metadata
└── components/surfaces/*                                  # dashboard/editor/launch/classroom/review/help/settings productization pass
```

## Architecture Patterns

### Pattern 1: Extend session-first recap into recent-session trends
**What:** 趋势分析不新建第二真相源，而是围绕最近 ended sessions 复用 `getClassroomSessionRecapDTO()` 的聚合口径，派生出 class-level 与 student-level summaries。

**Use when:** 需要回答“最近几次课发生了什么变化”“哪些学生持续需要关注”“哪一节课值得回看”。

**Implementation hint:**
- 先做 `getTeacherRecentSessionTrendDTO({ lessonId?, classId?, limit? })`
- 内部按 teacher-scoped ended sessions 拉取 recap 邻近字段
- 输出 `recentSessions[]`、`classTrendSummary`、`studentTrendSummaries[]`、`selectedSessionDetail`

### Pattern 2: Trends owns comparison context, classroom owns single-session context
**What:** trends 页只负责跨 session 比较与解释；真正的单次复盘仍回 `/classroom?sessionId=...`。

**Use when:** 用户点击异常点、学生波动、提交回落等趋势信号时。

**Implementation hint:**
- trends 页内先展开 session summary / impacted students / signal reasons
- 主 CTA：`/classroom?sessionId={id}&recapTab=students`
- 次级 CTA：`/teacher/review?...` 仅在需要 lesson feedback follow-up 时显示

### Pattern 3: Register trends as a first-class teacher route
**What:** 新 route 必须进入 `TEACHER_THEME_ROUTE_KEYS` / `TEACHER_THEME_ROUTE_SURFACES`，而不是只在某个导航组件里硬编码。

**Use when:** 新增 `/teacher/trends`、`/teacher/analytics` 或等价路径时。

**Implementation hint:**
- 给 trends route 声明 label / defaultSplit / allowedModules / shell contract
- 复用现有 `left-nav` / `rounded` / `default` shell posture，除非研究后有明确理由调整

### Pattern 4: Productization = shared hero/section/CTA grammar across route set
**What:** 用相同的 hero rhythm、metric cards、section density、secondary tonal rails 和 CTA hierarchy 把 editor / launch / classroom / review / trends / dashboard / help / settings 拉回同一产品系统。

**Use when:** 做 UI-05 产品统一时。

**Implementation hint:**
- 优先统一 `teacherSurfaceRhythm.hero|section|cardInset`
- 统一 `surfaceWidths.workspace|heroTitle|heroBody`
- 统一主 CTA / 次级 CTA 语法与状态卡文案节奏
- 不改变页面核心工作区结构，只统一 posture 和 hierarchy

## Anti-Patterns to Avoid

- **新建 analytics 持久化表或 snapshot 层：** 会立即制造第二真相源，违背 D-03 / D-06 / D-18 的延续原则。
- **把 `/teacher/review` 做成 trends 首跳：** 会破坏 `/classroom` single-session recap 主域定位。[VERIFIED: 26-CONTEXT.md]
- **在页面里各写一套 productization class recipe：** 这样无法形成可持续 shared contract，也很难被 verifier 稳定检查。
- **绕开 route metadata 新增 trends shell 分支：** 会回流到 Phase 19 已消灭的 route string branching。[VERIFIED: src/lib/theme-layout/route-surface-registry.ts]
- **student trend 与 class trend 并列抢首屏：** 会直接违背 D-05 ~ D-07 的 class-first posture。

## Common Pitfalls

### Pitfall 1: 用 lesson-level 汇总替代 recent sessions 默认视角
**What goes wrong:** 首屏变成“某课时总体趋势”，而不是“这个班最近几次课发生了什么变化”。

**How to avoid:** 默认数据源固定 recent ended classroom sessions；lesson-level 仅作为次级 toggle 或 filter。

### Pitfall 2: drill-down 直接强跳走，丢失趋势解释层
**What goes wrong:** 用户点击异常点后立刻跳去 `/classroom` 或 `/teacher/review`，无法先理解“发生了什么”。

**How to avoid:** trends 页内先展开 session summary、students、signals，再给下一跳 CTA。

### Pitfall 3: productization 只改局部 UI，不改 shared grammar
**What goes wrong:** 页面 individually prettier，但仍像多个独立产品。

**How to avoid:** 以 route set 为单位统一 hero / section / CTA / tonal hierarchy，并在 verifier 中按路由集合锁定。

### Pitfall 4: trends route 没接入 teacher shell registry
**What goes wrong:** 新页面能访问，但 shell / width / navigation posture 与其他 teacher pages 脱节。

**How to avoid:** trends route 进入 `route-surface-registry.ts`，并走已有 resolver path。

## Verification Strategy

- **Trend aggregation tests:** 在 `src/lib/dal/classroom.test.ts` 增加 recent-session trend fixtures，覆盖 class-first summary、student trend ranking、selected session expansion、raw evidence drill-down pointer。
- **Route contract tests:** 增加 trends route 在 `route-surface-registry.ts` 的注册与 shell metadata regression，防止新页面绕开 teacher shell contract。
- **Surface tests:** 针对 trends 主 surface、dashboard、classroom recap、review、launch、editor、help、settings 的 productization 关键断言做 focused tests，而不是 snapshot 全量比对。
- **Phase verifier:** 增加 `verify:phase26`，同时检查：独立 trends route、class-first default、`/classroom` deep-link CTA、shared surface contract usage、禁止第二真相源 / route string branching / UI-only analytics math。

## Planning Hints

- **Plan 26-01:** 先定义 cross-session trend DTO / DAL contracts，锁定 recent-session aggregation 口径。
- **Plan 26-02:** 落独立 trends route、teacher nav entry、in-page expansion、`/classroom` 深链。
- **Plan 26-03:** 对 `editor / launch / classroom / review / trends / dashboard / help / settings` 做 shared productization pass。
- **Plan 26-04:** 用 focused regression + `verify:phase26` 收口 analytics safety 和 UI quality bar。

## Open Questions

1. **独立 trends route 的最终命名是什么？**
   - 可由 planner 决定，但要兼顾教师心智与主导航可读性。

2. **recent sessions 的默认窗口是多少节？**
   - 建议先锁为“最近 3-5 次 ended sessions”，避免首发就做无限滚动 analytics index。

3. **student trend 排序口径是什么？**
   - 建议优先按 `需要关注` 次数、未评价/未提交持续出现、课堂信号累积排序，保持 deterministic。

## Sources

### Primary (HIGH confidence)
- `.planning/phases/26-cross-session-trends-and-stitch-productization/26-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `src/lib/dal/classroom.ts`
- `src/lib/dto/classroom.ts`
- `src/app/(classroom)/classroom/page.tsx`
- `src/components/surfaces/teacher-dashboard-surface.tsx`
- `src/components/surfaces/classroom-launch-surface.tsx`
- `src/components/surfaces/lesson-editor-surface.tsx`
- `src/components/learning/teacher-review-surface.tsx`
- `src/components/surfaces/help-center-overview-surface.tsx`
- `src/components/surfaces/settings-surface.tsx`
- `src/components/surfaces/teacher-surface-rhythm.ts`
- `src/components/surfaces/surface-widths.ts`
- `src/lib/theme-layout/route-surface-registry.ts`

### Secondary (MEDIUM confidence)
- `.planning/phases/25-teaching-data-capture-and-session-analytics/25-RESEARCH.md`
- `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-CONTEXT.md`
- `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-CONTEXT.md`
- `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-CONTEXT.md`

## Metadata

**Confidence breakdown:**
- Analytics architecture: HIGH — 当前 session recap contract 已存在，可直接向 recent-session trends 扩展。
- Productization path: MEDIUM — shared tokens/contracts 明确存在，但各 route 的统一范围与断言粒度仍需 planner 精确定义。
- Risks/pitfalls: HIGH — 主要风险都来自已存在的 route/domain boundaries，而非未知外部依赖。

**Research date:** 2026-05-14
**Valid until:** 2026-06-13
