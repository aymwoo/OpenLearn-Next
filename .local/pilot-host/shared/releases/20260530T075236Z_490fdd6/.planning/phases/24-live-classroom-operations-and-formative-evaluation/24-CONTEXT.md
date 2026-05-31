# Phase 24: Live classroom operations and formative evaluation - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定在现有 `/classroom` 教师运行页内，围绕当前 live classroom
runtime 补齐实时监控、过程观察与形成性评价闭环，而不是再开一个独立评语
系统或通用 gradebook。

交付范围固定为三件事：

1. 教师可在课堂运行时看到名册级实时状态，包括 presence、progress、submission
   summary 与需要优先关注的学生。
2. 教师可在课堂中或课后，为单个学生记录轻量过程评价，模型固定为“参与度档位 +
   标签 + 观察记录”。
3. 教师可从现有 `/classroom` 名册进入单个学生详情面板，在同一工作流里查看
   evidence 与 evaluation，不再强制切到独立 review 页面完成单个学生判断。

本阶段不扩展到正式成绩册、复杂 rubric、跨课堂 analytics、班级汇总趋势，也不把
评价工作流挪出当前课堂运行页主路径。

</domain>

<decisions>
## Implementation Decisions

### Process evaluation model
- **D-01:** 过程评价模型固定为三元结构：`参与度档位 + 标签 + 观察记录`。不引入分数制、百分比、权重计算或 rubric grid。
- **D-02:** 观察记录继续服务课堂过程判断，定位为轻量 teacher-only formative evaluation，不提前扩成正式成绩或学期评定实体。

### Participation tiers
- **D-03:** 参与度档位固定为 3 档：`积极参与`、`正常参与`、`需要关注`。
- **D-04:** 首发只允许这 3 档作为结构化 participation level；不增加 5 分制、颜色梯度、可配置学校字典或自定义等级。

### Workflow placement
- **D-05:** Phase 24 的核心工作流固定留在现有 `/classroom` 教师运行页，不新增独立 formative evaluation 主页面。
- **D-06:** 教师从运行页名册进入单个学生详情面板；该面板同时承载该学生的 evidence 与 evaluation 详情，形成 runtime-to-review 的单路径操作。
- **D-07:** `/teacher/review` 现有 lesson review 能力不作为 Phase 24 的主入口；若继续保留，也只能作为次级补充视图，不能与 `/classroom` 形成双主流程竞争。

### Existing constraints to preserve
- **D-08:** 所有评价写入继续保持 teacher-scoped、durable、auditable，并沿用 `DAL + Server Actions + cache tag invalidation` 边界。
- **D-09:** 过程评价必须绑定当前 classroom session 与 student context；evidence 仍以 session 为主边界，不回退到 lesson 级模糊聚合。
- **D-10:** 现有 `/classroom` 渐变主舞台继续只承载课堂关键运行状态；学生详情、观察记录与评价编辑都落在次级 tonal panel / detail panel 中，不新增第二个 hero。

### Claude's Discretion
- 参与度标签的首发来源是固定 allowlist 还是 lesson/session 派生推荐，可由 planning 基于现有 DTO 与 schema 收敛，但必须服从 `档位 + 标签 + 观察记录` 总模型。
- 单个学生 detail panel 采用 drawer、side panel 还是 inline expandable detail，可由 planning 按现有 `/classroom` surface 结构收敛，但必须保持教师留在同一 `/classroom` 页面上下文中完成查看与记录。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.3 教学编排与课堂智能的项目边界；明确不把首发做成完整教育 SaaS 或独立 gradebook。
- `.planning/ROADMAP.md` — Phase 24 的正式 goal、success criteria 与 4 个计划槽位。
- `.planning/REQUIREMENTS.md` — `ACT-03`、`EVAL-01`、`EVAL-02` 的正式需求来源与边界。
- `.planning/STATE.md` — 已锁定的 `/classroom` 运行页定位、session-first evidence 原则与前序阶段 carry-forward 决策。

### Upstream phase decisions
- `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-CONTEXT.md` — evidence 与 teacher intervention 的 durable contract、session-first 边界与 teacher-only 约束。
- `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-CONTEXT.md` — `/classroom` 保持为教师运行台、而非新开课堂准备页的入口定位。
- `.planning/phases/23-student-in-class-activity-flow/23-CONTEXT.md` — student quick response 与 classroom evidence 已固定走 append-only durable write path，Phase 24 必须复用同一事实源做教师侧 review。

### Existing classroom runtime implementation
- `src/app/(classroom)/classroom/page.tsx` — 当前 `/classroom` 路由入口，已通过 `sessionId` 读取 live session snapshot。
- `src/components/surfaces/classroom-console-surface.tsx` — 当前教师课堂运行主 surface，已固定“单主舞台 + 次级 tonal panels”的布局约束。
- `src/components/classroom/classroom-roster-panel.tsx` — 当前名册状态面板，是 Phase 24 roster monitoring 与 student detail 入口的直接落点。
- `src/components/classroom/classroom-timeline-panel.tsx` — 当前 teacher-only timeline panel，可作为 observation / intervention 相邻信息区参考。

### DTO, DAL, and action boundaries
- `src/lib/dto/classroom.ts` — 现有 classroom snapshot、participant、timeline、evidence 与 intervention 的 typed contracts。
- `src/lib/dal/classroom.ts` — 现有 snapshot 聚合、teacher timeline、record evidence、record intervention 等 teacher-scoped durable path。
- `src/actions/classroom-actions.ts` — 现有 classroom writes 的 Server Action 与 `cacheTags.classroom(sessionId)` 失效路径。
- `src/app/(teacher)/teacher/review/page.tsx` — 现有 teacher review page，可作为“非主入口、次级补充视图”参考，而非本阶段中心路径。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/surfaces/classroom-console-surface.tsx`：已经把 `/classroom` 固定成 live runtime 主舞台，适合作为 Phase 24 monitoring 与 detail workflow 的唯一 product surface。
- `src/components/classroom/classroom-roster-panel.tsx`：已具备 roster 列表与在线状态展示，可直接扩成 progress/submission/attention summary 与单学生详情入口。
- `src/components/classroom/classroom-timeline-panel.tsx`：已具备 teacher-only 过程记录展示，可与 observation notes / evaluation 历史形成相邻阅读关系。
- `src/lib/dal/classroom.ts`：已经存在 `recordClassroomEvidence()` 与 `recordClassroomIntervention()` durable 路径，说明评价写链路应继续落在 classroom domain，而不是另起并行 review backend。

### Established Patterns
- `/classroom` 当前通过 `getClassroomConsoleDTO()` + `getClassroomSnapshotDTO()` 驱动，说明 Phase 24 应优先扩展 snapshot/read model，而不是拼接多个跨页 client fetch。
- classroom 域已固定 `teacher-scoped + session-scoped + auditable timeline/evidence` 模式；评价写入必须沿用同一边界。
- teacher runtime UI 已固定“主舞台展示关键课堂状态，次级 tonal panels 承载操作与细节”的设计语法；学生详情与评价编辑不能破坏该层级。

### Integration Points
- `src/lib/dto/classroom.ts`：需要新增单学生 formative evaluation 与 aggregated evidence/evaluation detail 所需 DTO。
- `src/lib/dal/classroom.ts`：需要新增 roster monitoring summary、single-student detail read model 与 participation/evaluation write path。
- `src/actions/classroom-actions.ts`：需要新增评价写入与详情刷新相关 Server Actions，同时保持 `cacheTags.classroom(sessionId)` 明确失效。
- `src/components/classroom/classroom-roster-panel.tsx` 与 `src/components/surfaces/classroom-console-surface.tsx`：是 student detail panel 与 unified evidence/evaluation workflow 的主要 UI 接点。

</code_context>

<specifics>
## Specific Ideas

- 用户已明确锁定：过程评价首发不是打分系统，而是“参与度档位 + 标签 + 观察记录”的轻量结构化记录。
- 用户已明确锁定：参与度只保留 3 档，即 `积极参与 / 正常参与 / 需要关注`。
- 用户已明确锁定：教师仍留在现有 `/classroom` 教师运行页工作，从学生名册进入单个学生的 evidence / evaluation 详情面板完成查看与记录。

</specifics>

<deferred>
## Deferred Ideas

- 正式 gradebook、rubric、分数换算、权重统计 — 超出 Phase 24，属于后续独立评价系统能力。
- 跨 session / 跨 lesson 趋势分析与班级统计 — 属于 Phase 25-26 analytics 范围。
- 把 formative evaluation 抽成独立教师主页面或新的导航入口 — 当前已被否决，留在 `/classroom` 单路径工作流内。

</deferred>

---

*Phase: 24-live-classroom-operations-and-formative-evaluation*
*Context gathered: 2026-05-13*
