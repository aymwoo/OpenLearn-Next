# Phase 25: Teaching data capture and session analytics - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定围绕单次 `classroom session` 的课后 recap，目标是把 Phase 21-24 已经沉淀下来的 durable classroom evidence、timeline、submission 与 feedback 事实，整理成教师一结束课堂就能信任的 deterministic 指标与 drill-down 视图。

交付范围固定为四件事：

1. 教师在课堂结束后可立即看到该 session 的 recap 主版面，而不是只停留在 live runtime 控制台。
2. recap 指标必须来自现有 session-first 真相源，并且能追溯到 supporting raw evidence。
3. recap 明确区分“待反馈提交”和“待跟进课堂信号”两类教师工作量，不把不同性质的后续工作混成一个数字。
4. recap 的主钻取路径固定为单次 session 下的 student-first 复盘，并保留次级步骤视角辅助诊断。

本阶段不扩展到跨 session / 跨 lesson 趋势分析、不引入 AI narrative summary、不重做正式 gradebook，也不把 `/teacher/review` 与 classroom recap 提前合并成统一评价系统。

</domain>

<decisions>
## Implementation Decisions

### Recap entry and route posture
- **D-01:** Phase 25 的 recap 继续留在 `/classroom` 这个 session 主域内，不新开独立 analytics 主路径，也不把 `/teacher/review` 升级成 session recap 主入口。
- **D-02:** 当课堂 `session` 状态变为 `ended` 后，`/classroom` 主舞台直接从 live runtime 切换为 recap 版面，而不是只在原运行台旁边补一个次级区块。
- **D-03:** 历史 session recap 的回看入口固定在 `/classroom` 内部的课堂记录列表中，保持“live session / ended session / history reopen”都在同一 classroom domain 下完成。
- **D-04:** `/teacher/review` 继续保持 lesson-level task / quiz feedback 路径；Phase 25 可以复用其反馈统计语义，但不能让它与 session recap 形成双主流程竞争。

### Completion and participation metrics
- **D-05:** recap 的 completion headline metric 以 `session` 结束时的最终状态为准，不把中途掉线、回连、短时掉队等过程波动直接写进主完成率口径。
- **D-06:** 中途过程波动仍需保留在 raw evidence / teacher timeline / grouped drill-down 中，用于解释指标，而不是抹平过程事实。
- **D-07:** recap 的 participation 主指标固定优先使用 Phase 24 已锁定的教师三档过程评价：`积极参与 / 正常参与 / 需要关注`。
- **D-08:** 未被教师留下三档过程评价的学生，必须在 recap 中明确标记为“未评价”或等价状态；不能自动推断参与度，也不能默认归为“正常参与”。

### Submission and workload summary
- **D-09:** 教师工作量在 recap 中固定拆成两类：`待反馈提交` 与 `待跟进课堂信号`。首发不把两者压成单一混合数字。
- **D-10:** `待反馈提交` 只统计 task / quiz 的 latest attempt 是否已有 `attemptFeedback`，统计单位以最新提交条数为主，不回退到历史尝试总数。
- **D-11:** `待跟进课堂信号` 只纳入强确定性 classroom-domain 信号，不扩成泛化“所有事件都算工作量”。首发优先包含：`需要关注` 档学生、课堂中掉队或未提交关键证据的学生、以及已有课堂回应/证据但尚未被老师留下 formative evaluation 的学生。
- **D-12:** 对 quick response / classroom evidence 这类 classroom-domain 信号，只要老师已经在该 `session + student` 上留下 formative evaluation，就视为该课堂信号已被处理；Phase 25 不要求另起独立 handled 字段或把它们硬塞回 `attemptFeedback` 模型。

### Drill-down structure
- **D-13:** recap 的第一层 drill-down 固定按学生展开，而不是先按步骤或先按统一时间线展开。
- **D-14:** 进入单个学生后，默认先展示该学生在本次 session 的摘要，再展开原始证据与评价明细；不直接把老师丢进未经整理的原始记录流。
- **D-15:** supporting raw evidence 在 recap 中按分组展开，至少保持 completion / submissions / evaluation / timeline 这类可解释分层；不把所有问题都路由到一条统一时间线，也不拆回多个旧页面跳转。
- **D-16:** 在 student-first 主视角之外，Phase 25 需要保留一个次级步骤视角，让教师能按某个课堂环节查看完成、提交和掉队情况，但该视角只能是 recap 的辅助诊断面，不能取代 student-first 主路径。

### the agent's Discretion
- recap 在 `/classroom` 下的精确路由形式可由 planning 收敛为 query-param、nested segment 或等价结构，但必须保持 ended session 自动切 recap、历史回看仍在 classroom domain 内。
- 单个学生 session 摘要卡的字段顺序、命名和视觉层级可由 planning 结合现有 `teacherSurfaceRhythm` 与 Stitch 语言收敛，但必须坚持“先摘要、再证据”。
- `掉队或未提交关键证据` 的精确判定公式可由 researcher / planner 基于既有 `monitoringSummary`、participant progress label 与 current evidence contracts 收敛，但必须保持 deterministic、session-scoped，且不能依赖 AI 推断。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.3 里程碑对 deterministic analytics、课堂实施闭环与 Stitch 视觉约束的项目级边界。
- `.planning/ROADMAP.md` — Phase 25 的正式 goal、success criteria 与 3 个 plan slots；明确 recap 必须 drill down 到 raw evidence。
- `.planning/REQUIREMENTS.md` — `ANALYTICS-01` 的正式需求来源，以及它与 `ANALYTICS-02` / `UI-05` 的 phase boundary。
- `.planning/STATE.md` — 已锁定的 session-first evidence 原则、课堂运行主路径和前序 phase carry-forward 决策。

### Upstream phase decisions
- `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-CONTEXT.md` — durable classroom evidence / timeline contract、session-first 边界与 analytics 必须复用的真相源。
- `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-CONTEXT.md` — `/teacher/launch` 与 `/classroom` 的职责分界，避免 recap 误回到 launch 或 utilitarian admin flow。
- `.planning/phases/23-student-in-class-activity-flow/23-CONTEXT.md` — quick response / in-class evidence 的 durable write path、student-facing guidance 与 analytics 延后边界。
- `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-CONTEXT.md` — Phase 24 已锁定的 monitoring、single-student detail、3 档 participation model 与 same-route classroom detail workflow。

### Existing classroom runtime and recap-adjacent contracts
- `src/app/(classroom)/classroom/page.tsx` — `/classroom` 当前如何按 `sessionId` 装配 live session snapshot 与 student detail，是 recap 延续主域的入口基线。
- `src/components/surfaces/classroom-console-surface.tsx` — 当前 `/classroom` 主舞台与 ended/no-session fallback 语言，决定 recap 如何在同一 surface 内接管主版面。
- `src/components/classroom/classroom-control-panel.tsx` — 现有 live runtime 主控区、右侧 secondary panels 与 `endClassroomSessionAction` 的接点，是 ended-state recap 切换的最近邻实现。
- `src/components/classroom/classroom-student-detail-panel.tsx` — 当前按学生查看课堂证据与过程评价的详情面板，是 Phase 25 student-first drill-down 的直接参考。

### Data contracts and truth sources
- `src/lib/dto/classroom.ts` — 当前 classroom snapshot、student detail、participation levels、formative evaluation payload 与 future recap DTO 的直接类型入口。
- `src/lib/dal/classroom.ts` — 当前 `getClassroomSnapshotDTO()`、`getClassroomStudentDetailDTO()`、`recordStudentFormativeEvaluation()` 与 session-first evidence reads/writes 的权威实现。
- `src/db/schema.ts` — `attemptFeedback`、`classroomSessions`、`classroomEvidence`、`classroomTimeline` 的持久化表结构和索引，是 Phase 25 统计口径的真实数据边界。

### Existing teacher feedback workflow
- `src/app/(teacher)/teacher/review/page.tsx` — 现有 lesson-level feedback 路由，说明 recap 不能简单复用为 session 主入口。
- `src/components/learning/teacher-review-surface.tsx` — 现有 task / quiz feedback workload 呈现语言，可复用其“待反馈”语义，但要避免与 classroom recap 混域。
- `src/lib/dal/learning.ts` — `getTeacherLessonReviewDTO()` 与 `attemptFeedback` latest-attempt 统计逻辑，是 Phase 25 `待反馈提交` 口径的最近邻实现。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/dal/classroom.ts`：已经有 `getClassroomSnapshotDTO()`、`getClassroomStudentDetailDTO()` 和 `recordStudentFormativeEvaluation()`，说明 Phase 25 应继续扩展 classroom read model，而不是新造 analytics 存储层。
- `src/lib/dto/classroom.ts`：已经把 `ClassroomSnapshotDTO`、`ClassroomStudentDetailDTO`、participation level、evaluation tags 和 evidence contracts 类型化，是 recap DTO 的最佳挂点。
- `src/components/classroom/classroom-student-detail-panel.tsx`：已经是 student-first detail pattern，可演进成 session recap 下的单学生摘要与 grouped drill-down。
- `src/lib/dal/learning.ts` + `src/components/learning/teacher-review-surface.tsx`：已经存在基于 latest attempt + `attemptFeedback` 的 lesson-level workload 语义，适合借用到 `待反馈提交` 指标定义。
- `src/db/schema.ts`：`attemptFeedback`、`classroomEvidence`、`classroomTimeline` 已经同时存在，Phase 25 可以直接基于现有 durable tables 汇总，无需补 UI-only 采集链路。

### Established Patterns
- classroom 域已经固定 `session-first + durable evidence + typed DTO + DAL + Server Actions` 模式；Phase 25 不能把 recap 退回 lesson-level 或 client-side 拼装统计。
- `/classroom` 当前固定是单主舞台 + 次级 tonal panels 的信息层级；ended session recap 应接管主舞台，而不是和 live controls 并列混排。
- task / quiz feedback 当前仍以 `attemptFeedback` 为单独真相源，quick response / formative evaluation 则留在 classroom domain；Phase 25 必须桥接两者，而不是强行合并 schema。
- 当前 student detail 和 monitoring 已经以单学生为主钻取入口，说明 Phase 25 的 student-first recap 有明确演进路径，不必从 step-first 重开一个 analytics 面。

### Integration Points
- `src/app/(classroom)/classroom/page.tsx`：需要承接 ended session 的 recap 进入逻辑、session history reopen 逻辑，仍以 `sessionId` 为主键。
- `src/lib/dto/classroom.ts`：需要新增 session recap summary、student recap summary、step recap summary 与 grouped drill-down DTO。
- `src/lib/dal/classroom.ts`：需要新增 deterministic aggregation helpers，把 classroom evidence、timeline、participants、latest participation/evaluation 和 lesson step context 聚合成 recap read model。
- `src/components/surfaces/classroom-console-surface.tsx` / `src/components/classroom/classroom-control-panel.tsx`：需要在 `ended` 状态下从 live runtime 切换到 recap surface。
- `src/lib/dal/learning.ts`：可以复用 latest attempt + `attemptFeedback` 的待反馈统计方式，但不应成为 recap 的主事实源。

</code_context>

<specifics>
## Specific Ideas

- recap 的产品感应当是“这节课刚结束，老师留在同一 `/classroom` 上下文中立刻复盘”，而不是跳走到一个抽象 analytics 大盘。
- 教师工作量必须明确拆成两类：`待反馈提交` 与 `待跟进课堂信号`，避免把 task/quiz 的反馈债和课堂观察后的跟进债混成一个数字。
- drill-down 的主叙事是 student-first：先回答“谁需要看、谁需要跟进”，然后再补充步骤视角帮助老师判断“哪一环出了问题”。
- participation 指标必须诚实地区分“已评价”和“未评价”，不能因为要好看就自动脑补未评价学生的参与状态。

</specifics>

<deferred>
## Deferred Ideas

- 跨 session / 跨 lesson 趋势分析、班级与学生长期对比视图 — 属于 Phase 26 `ANALYTICS-02`。
- AI 自动总结、自然语言洞察、narrative recap — 不属于本阶段 deterministic analytics 范围。
- 把 `/teacher/review` 和 classroom recap 合并为统一的评价与反馈系统 — 超出 Phase 25，留待后续产品化阶段再判断。
- 更宽泛的 handled state / workflow state machine（例如为每条 classroom evidence 单独加 handled 字段）— 本阶段先用 formative evaluation 作为处理闭环，不额外扩 schema。

</deferred>

---

*Phase: 25-teaching-data-capture-and-session-analytics*
*Context gathered: 2026-05-14*
