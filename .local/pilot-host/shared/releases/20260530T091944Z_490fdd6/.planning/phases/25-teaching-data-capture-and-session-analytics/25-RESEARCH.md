# Phase 25: Teaching data capture and session analytics - Research

**Researched:** 2026-05-14
**Domain:** 单次课堂 session recap、deterministic analytics、teacher workload bridging
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Phase 25 的 recap 继续留在 `/classroom` 这个 session 主域内，不新开独立 analytics 主路径，也不把 `/teacher/review` 升级成 session recap 主入口。
- **D-02:** 当课堂 `session` 状态变为 `ended` 后，`/classroom` 主舞台直接从 live runtime 切换为 recap 版面，而不是只在原运行台旁边补一个次级区块。
- **D-03:** 历史 session recap 的回看入口固定在 `/classroom` 内部的课堂记录列表中，保持“live session / ended session / history reopen”都在同一 classroom domain 下完成。
- **D-04:** `/teacher/review` 继续保持 lesson-level task / quiz feedback 路径；Phase 25 可以复用其反馈统计语义，但不能让它与 session recap 形成双主流程竞争。
- **D-05:** recap 的 completion headline metric 以 `session` 结束时的最终状态为准，不把中途掉线、回连、短时掉队等过程波动直接写进主完成率口径。
- **D-06:** 中途过程波动仍需保留在 raw evidence / teacher timeline / grouped drill-down 中，用于解释指标，而不是抹平过程事实。
- **D-07:** recap 的 participation 主指标固定优先使用 Phase 24 已锁定的教师三档过程评价：`积极参与 / 正常参与 / 需要关注`。
- **D-08:** 未被教师留下三档过程评价的学生，必须在 recap 中明确标记为“未评价”或等价状态；不能自动推断参与度，也不能默认归为“正常参与”。
- **D-09:** 教师工作量在 recap 中固定拆成两类：`待反馈提交` 与 `待跟进课堂信号`。首发不把两者压成单一混合数字。
- **D-10:** `待反馈提交` 只统计 task / quiz 的 latest attempt 是否已有 `attemptFeedback`，统计单位以最新提交条数为主，不回退到历史尝试总数。
- **D-11:** `待跟进课堂信号` 只纳入强确定性 classroom-domain 信号，不扩成泛化“所有事件都算工作量”。首发优先包含：`需要关注` 档学生、课堂中掉队或未提交关键证据的学生、以及已有课堂回应/证据但尚未被老师留下 formative evaluation 的学生。
- **D-12:** 对 quick response / classroom evidence 这类 classroom-domain 信号，只要老师已经在该 `session + student` 上留下 formative evaluation，就视为该课堂信号已被处理；Phase 25 不要求另起独立 handled 字段或把它们硬塞回 `attemptFeedback` 模型。
- **D-13:** recap 的第一层 drill-down 固定按学生展开，而不是先按步骤或先按统一时间线展开。
- **D-14:** 进入单个学生后，默认先展示该学生在本次 session 的摘要，再展开原始证据与评价明细；不直接把老师丢进未经整理的原始记录流。
- **D-15:** supporting raw evidence 在 recap 中按分组展开，至少保持 completion / submissions / evaluation / timeline 这类可解释分层；不把所有问题都路由到一条统一时间线，也不拆回多个旧页面跳转。
- **D-16:** 在 student-first 主视角之外，Phase 25 需要保留一个次级步骤视角，让教师能按某个课堂环节查看完成、提交和掉队情况，但该视角只能是 recap 的辅助诊断面，不能取代 student-first 主路径。

### the agent's Discretion
- recap 在 `/classroom` 下的精确路由形式可由 planning 收敛为 query-param、nested segment 或等价结构，但必须保持 ended session 自动切 recap、历史回看仍在 classroom domain 内。
- 单个学生 session 摘要卡的字段顺序、命名和视觉层级可由 planning 结合现有 `teacherSurfaceRhythm` 与 Stitch 语言收敛，但必须坚持“先摘要、再证据”。
- `掉队或未提交关键证据` 的精确判定公式可由 researcher / planner 基于既有 `monitoringSummary`、participant progress label 与 current evidence contracts 收敛，但必须保持 deterministic、session-scoped，且不能依赖 AI 推断。

### Deferred Ideas (OUT OF SCOPE)
- 跨 session / 跨 lesson 趋势分析、班级与学生长期对比视图 — 属于 Phase 26 `ANALYTICS-02`。
- AI 自动总结、自然语言洞察、narrative recap — 不属于本阶段 deterministic analytics 范围。
- 把 `/teacher/review` 和 classroom recap 合并为统一的评价与反馈系统 — 超出 Phase 25，留待后续产品化阶段再判断。
- 更宽泛的 handled state / workflow state machine（例如为每条 classroom evidence 单独加 handled 字段）— 本阶段先用 formative evaluation 作为处理闭环，不额外扩 schema。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANALYTICS-01 | Teacher can view lesson or session summary metrics for completion, participation, submissions, and feedback workload. | 采用 `session-first` recap read model，主聚合落在 `src/lib/dal/classroom.ts`；participation 与课堂信号基于 `classroomEvidence` / `classroomTimeline`；`待反馈提交` 通过 latest `taskSubmissions` / `quizAttempts` 与 `attemptFeedback` 只读桥接；ended-state 主舞台留在 `/classroom`；通过 focused DAL/UI/action tests + `verify:phase25` 证明正确性。[VERIFIED: codebase read][CITED: https://nextjs.org/docs/app/getting-started/caching] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发；本阶段不能借机引入新的 analytics stack 或独立服务。[VERIFIED: AGENTS.md]
- UI 组件禁止直连数据库；session recap 的所有读模型与 drill-down 都必须经过 DAL 与 Server Actions / Server Components 边界输出 DTO。[VERIFIED: AGENTS.md]
- 运行时仍以 Node.js 为主；Phase 25 不应把数据库聚合或鉴权逻辑放到 Edge Runtime。[VERIFIED: AGENTS.md]
- Next.js 16 缓存必须显式处理；若 recap 选择缓存读模型，必须明确 `cacheTag()` / `updateTag()` 或 `revalidateTag()` 语义；若保持 request-fresh，也必须在设计中明确说明。[VERIFIED: AGENTS.md][CITED: https://nextjs.org/docs/app/getting-started/caching][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
- 数据库仍以 SQLite 为唯一首发目标；任何新增关联或 helper 都必须遵守现有 cascade / scoped-query 基线。[VERIFIED: AGENTS.md][VERIFIED: src/db/schema.ts]
- `/classroom` 继续是课堂主域；Phase 25 不能把 recap 迁出为新的主导航 analytics 页面。[VERIFIED: AGENTS.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
- 设计必须延续 Stitch 项目 `5322129002350954765` 与 `DESIGN.md` 的 teacher-facing 语言；ended recap 应复用当前单主舞台 + tonal secondary panels 体系，不做 admin dashboard 风格跳变。[VERIFIED: AGENTS.md][VERIFIED: src/components/surfaces/classroom-console-surface.tsx]

## Summary

Phase 25 最安全的实现方式不是“新增 analytics 系统”，而是把已经存在的 `classroomSessions`、`classroomParticipants`、`classroomEvidence`、`classroomTimeline`、`taskSubmissions`、`quizAttempts`、`attemptFeedback` 组织成一个 `session-first` recap read model，并继续放在 `/classroom` 域内消费。[VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/app/(classroom)/classroom/page.tsx]

现有代码已经直接支持几类 deterministic 指标：`session + student` 维度的 formative evaluation 档位、未评价人数、quick response / classroom evidence 明细、teacher intervention timeline、同路由 student-first detail panel，以及 `/classroom` ended 状态切换所需的 session status 基础字段。[VERIFIED: src/lib/dto/classroom.ts][VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/components/classroom/classroom-student-detail-panel.tsx] 但它也暴露出两个不能被 planner 忽略的空洞：第一，`taskSubmissions` / `quizAttempts` / `attemptFeedback` 全是 lesson-level truth，不是 session-owned truth；第二，schema 里虽然有 `student-submission` evidence source，但当前 task/quiz 提交写路径并不会向 `classroomEvidence` 镜像写入该类型，因此“严格 session-scoped 的任务/测验提交计数”并不是现成可读的课堂域事实。[VERIFIED: src/db/schema.ts][VERIFIED: src/actions/learning-actions.ts][VERIFIED: src/lib/dal/classroom.ts][VERIFIED: grep]

因此，planner 应把本阶段理解为“读模型桥接 + 同域产品化”，而不是“补一张统计表”。主 recommendation 是：在 `src/lib/dal/classroom.ts` 中新增 `getClassroomSessionRecapDTO()` 及其聚合 helper，ended session 时由 `/classroom` 主舞台接管显示；其中 participation 与 classroom signals 只读使用 classroom truth，`待反馈提交` 只读桥接 latest attempt + `attemptFeedback`，绝不反向复制到 classroom domain 形成第二真相源。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

**Primary recommendation:** 用 `classroom.ts` 内的 session-first recap DTO 接管 ended-state `/classroom` 主舞台，并把 lesson-level attempt feedback 作为只读桥接输入，而不是另建 analytics 存储或新主路由。[VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session recap metric aggregation | API / Backend | Database / Storage | 指标需要 teacher-scoped 查询、跨表聚合与 deterministic 口径收敛，最自然的 owner 是 `src/lib/dal/classroom.ts`，而不是 client 拼装。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts] |
| Ended-session route selection inside `/classroom` | Frontend Server (SSR/RSC) | API / Backend | 当前 `page.tsx` 已基于 `searchParams` 和 session DTO 选择数据源；recap/live 分支应继续在服务端决定，避免 client 先加载 live 再切 recap。[VERIFIED: src/app/(classroom)/classroom/page.tsx] |
| Recap hero、student-first drill-down、step diagnostics UI | Browser / Client | Frontend Server (SSR/RSC) | 现有 `ClassroomConsoleSurface`、`ClassroomControlPanel`、`ClassroomStudentDetailPanel` 都是 client surface，适合继续承接同路由交互态，但数据必须先由服务端 DTO 预整形。[VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: src/components/classroom/classroom-control-panel.tsx][VERIFIED: src/components/classroom/classroom-student-detail-panel.tsx] |
| Teacher workload bridge (`待反馈提交` / `待跟进课堂信号`) | API / Backend | Database / Storage | 这两类工作量分别来自 lesson-domain attempts/feedback 与 classroom-domain evidence/evaluation，必须在一个明确 DAL helper 内桥接，防止双口径漂移。[VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/lib/dal/classroom.ts] |
| Ended/history session list in `/classroom` | API / Backend | Frontend Server (SSR/RSC) | 当前 `getClassroomConsoleDTO()` 只返回 `liveSessions`；要支持历史 recap，必须先扩展 server read model，再由页面/side panel 选择入口。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/components/surfaces/classroom-console-surface.tsx] |

## Deterministic Metrics Support Matrix

| Metric / View | Existing truth source direct? | Current source(s) | Planner guidance |
|---------------|-------------------------------|-------------------|------------------|
| 参与度档位分布（积极/正常/需要关注/未评价） | Yes | `classroomEvidence` 中 `kind: "formative-evaluation"` 的 `participationLevel` + `classroomParticipants` roster。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dto/classroom.ts] | 直接 support；未评价必须显式作为独立 bucket，不允许默认归入“正常参与”。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| 单学生课堂证据 / 评价明细 | Yes | `getClassroomStudentDetailDTO()` 已按 `session + student` 输出 `evidenceEntries`、`evaluationEntries`、`latestParticipationLevel`。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dto/classroom.ts] | 直接复用为 recap 的 student-first 主钻取基础，不要新建第二套 detail backend。[VERIFIED: src/components/classroom/classroom-student-detail-panel.tsx] |
| Quick response / classroom evidence 数量 | Yes | `classroomEvidence` 中 `student-quick-response` / teacher observation rows。[VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dal/classroom.ts] | 直接 support；适合进入 `待跟进课堂信号` 与 raw evidence 分组。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Teacher intervention 时间线 | Yes | `classroomTimeline.entryType = intervention_noted`。[VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dal/classroom.ts] | 直接 support；作为解释指标的 supporting raw evidence，而不是 headline metric。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| `待反馈提交` | Bridged, not direct classroom truth | latest `taskSubmissions` / `quizAttempts` + `attemptFeedback` unique target rows。[VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/db/schema.ts] | 允许做 recap 指标，但必须标注其桥接自 lesson-domain truth；不要复制到 classroomEvidence。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Task / quiz 的严格 session-scoped 提交数 | No | schema 有 `student-submission`，但当前 task/quiz 提交 action 不写 `classroomEvidence`；现成 write path 只更新 progress/submission/teacherReview tags。[VERIFIED: src/db/schema.ts][VERIFIED: src/actions/learning-actions.ts][VERIFIED: grep] | 这是本阶段最大合同缺口；planner 要么用 attempt bridge + 明确口径，要么拆一个小合同补 `student-submission` mirror write。[VERIFIED: grep][VERIFIED: src/lib/dal/classroom.ts] |
| Completion headline metric（历史回看仍稳定） | Partial only | `classroomParticipants.currentStepId` 是 session-owned；`lessonStepProgress` 是 lesson-owned，不是 session-owned。[VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dal/classroom.ts] | 必须先锁定公式：若要“session end immutable”，现有 truth 不够；若接受“按结束后当下 lesson progress 读取”，必须诚实标注语义。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Step diagnostic view | Partial only | published snapshot steps + participant positions + classroomEvidence；task/quiz submission caveat 仍存在。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/app/(classroom)/classroom/page.tsx] | 适合作为次级诊断面；不要让 step-first 视角取代 student-first 主路径。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.x`（repo `16.2.4`; npm latest `16.2.6`, published 2026-05-07）[VERIFIED: package.json][VERIFIED: npm registry] | `/classroom` ended/live 同路由选择、App Router search params、显式缓存语义 | 本阶段主路由与缓存语义都依赖 Next.js 16 的 App Router、`use cache` / `<Suspense>` / `updateTag()` 模型；项目已锁定该基线。[VERIFIED: AGENTS.md][CITED: https://nextjs.org/docs/app/getting-started/caching][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |
| React / react-dom | `19.2.x`（repo `19.2.5`; npm latest `19.2.6`, published 2026-04-08）[VERIFIED: package.json][VERIFIED: npm registry] | recap surface 的 client-side 切换、detail drill-down、same-route panel state | 当前 `/classroom` 主 surface 已是 React client components；Phase 25 应继续沿现有 component boundary 演进。[VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: src/components/classroom/classroom-control-panel.tsx] |
| Drizzle ORM | `0.45.2`（repo = npm latest, published 2026-03-27）[VERIFIED: package.json][VERIFIED: npm registry] | session recap 聚合查询、teacher-scoped joins | 现有 classroom / learning DAL 全部基于 Drizzle；planner 不需要引入新的 analytics ORM/SQL layer。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts] |
| Zod | `4.4.3`（repo = npm latest, published 2026-05-04）[VERIFIED: package.json][VERIFIED: npm registry] | recap DTO、filter、drill-down input 契约 | 当前 classroom DTO 与 action input 全部以 Zod 为边界；Phase 25 最自然的延续点也是 `src/lib/dto/classroom.ts`。[VERIFIED: src/lib/dto/classroom.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `4.1.x`（repo `4.1.5`; npm latest `4.1.6`, published 2026-05-11）[VERIFIED: package.json][VERIFIED: npm registry] | recap 聚合、surface 切换、verifier-focused regression | 用于 Phase 25 的 DAL fixture tests、same-route UI regression、`verify:phase25` focused suite。[VERIFIED: package.json][VERIFIED: glob] |
| lucide-react | `1.14.0`（repo）[VERIFIED: package.json] | recap metric cards、历史列表与 drill-down iconography | 仅在复用当前 classroom/teacher surfaces 的视觉语言时使用，不需要新 UI kit。[VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: src/components/learning/teacher-review-surface.tsx] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `classroom.ts` recap read model | 新建 analytics snapshot table | 会立即制造第二真相源，并让 Phase 25 偏离“复用 Phase 21-24 durable truths”的锁定边界。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md][VERIFIED: src/db/schema.ts] |
| `/classroom` ended-state recap | `/teacher/review` 作为主入口 | 会打破用户已锁定的 session 主域，并与 lesson-level feedback workflow 形成双主流程竞争。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| 动态 request-fresh recap read | 大范围 `use cache` + tag invalidation | 如果没有连带补齐 feedback / attempt 相关 invalidation，bridged workload 指标容易 stale；本阶段更适合先让 outer recap read 保持 request-fresh，只在稳定子读模型上局部缓存。[VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/learning-actions.ts][CITED: https://nextjs.org/docs/app/getting-started/caching] |

**Installation:**
```bash
# Phase 25 无需新增依赖；继续使用仓库现有 Next.js / React / Drizzle / Zod / Vitest 基线
```

**Version verification:**
- `next@16.2.6` published `2026-05-07T19:01:54.751Z`; repo currently uses `16.2.4`。[VERIFIED: npm registry][VERIFIED: package.json]
- `react@19.2.6` published `2026-04-08T18:39:24.455Z`; repo currently uses `19.2.5`。[VERIFIED: npm registry][VERIFIED: package.json]
- `drizzle-orm@0.45.2` published `2026-03-27T17:06:27.140Z`; repo already uses `0.45.2`。[VERIFIED: npm registry][VERIFIED: package.json]
- `zod@4.4.3` published `2026-05-04T07:06:40.819Z`; repo already uses `4.4.3`。[VERIFIED: npm registry][VERIFIED: package.json]
- `vitest@4.1.6` published `2026-05-11T14:37:46.246Z`; repo currently uses `4.1.5`。[VERIFIED: npm registry][VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Teacher opens /classroom?sessionId=...
        |
        v
app/(classroom)/classroom/page.tsx
        |
        +--> getClassroomConsoleDTO()
        |        |
        |        +--> live sessions
        |        +--> ended/history sessions   (Phase 25 add)
        |
        +--> session status branch
                 |
                 +--> live   -> getClassroomSnapshotDTO()
                 |
                 +--> ended  -> getClassroomSessionRecapDTO()   (Phase 25 add)
                                   |
                                   +--> classroomSessions / classroomParticipants
                                   +--> classroomEvidence / classroomTimeline
                                   +--> published snapshot step metadata
                                   +--> latest taskSubmissions / quizAttempts / attemptFeedback (bridge only)
                                   |
                                   +--> summary metrics
                                   +--> student-first summaries
                                   +--> grouped raw evidence
                                   +--> step diagnostic summaries
        |
        v
ClassroomConsoleSurface
        |
        +--> live   -> ClassroomControlPanel
        |
        +--> ended  -> ClassroomRecapPanel / student recap panel / step diagnostics
```

### Recommended Project Structure
```text
src/
├── app/(classroom)/classroom/page.tsx            # live vs recap server-side selection
├── components/surfaces/                          # classroom-console-surface + recap main stage
├── components/classroom/                         # recap summary, student recap, step diagnostics, history list
├── lib/dto/classroom.ts                          # recap DTOs and drill-down contracts
├── lib/dal/classroom.ts                          # session-first recap aggregation helpers
├── actions/classroom-actions.ts                  # classroom-domain writes + cache invalidation
└── lib/dal/learning.ts                           # lesson-level feedback bridge only
```

### Pattern 1: Session-first recap read model
**What:** recap 读模型继续挂在 `src/lib/dal/classroom.ts`，以 `sessionId` 为主键聚合 classroom-domain truth，并只读桥接 lesson-domain attempt feedback。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts]

**When to use:** 当指标必须回答“这一次课堂结束后老师现在需要看什么”时使用；不要把跨 session 趋势、班级长期比较、AI summary 混入本阶段。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

**Example:**
```typescript
// Source: recommended extension of src/app/(classroom)/classroom/page.tsx and src/lib/dal/classroom.ts [VERIFIED: codebase read]
const selectedSession = resolveRequestedSession(consoleData, searchParams.sessionId);

const model = selectedSession?.status === "ended"
  ? await getClassroomSessionRecapDTO({
      sessionId: selectedSession.id,
      studentId: searchParams.studentId,
      detailTab: searchParams.detailTab,
    })
  : await getClassroomSnapshotDTO({ sessionId: selectedSession.id });
```

### Pattern 2: Bridge `attemptFeedback` by derivation, not duplication
**What:** `待反馈提交` 继续使用 latest attempt + `attemptFeedback` 的现有 lesson-domain 语义，只在 recap 聚合层做桥接，不回写 classroomEvidence。[VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/db/schema.ts]

**When to use:** 当 session recap 需要显示 task/quiz 的 feedback debt 时使用；不要新增 `handled` 字段，也不要把 feedback 复制成 classroom 观察记录。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

**Example:**
```typescript
// Source: src/lib/dal/learning.ts [VERIFIED: codebase read]
const latestAttempts = [
  ...latestTasks.map((row) => row.id),
  ...latestQuizzes.map((row) => row.id),
];

const needsFeedback = latestAttempts.some(
  (id) => !feedbackRows.some((feedback) => feedback.targetId === id),
);
```

### Pattern 3: Ended-state main-stage takeover inside `/classroom`
**What:** ended session 不再显示 live control hero + controls，而是由同一 `/classroom` route 的主舞台切换为 recap hero、workload summary、student-first drill-down、step diagnostics。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md][VERIFIED: src/components/surfaces/classroom-console-surface.tsx]

**When to use:** 任何 `session.status === "ended"` 的当前会话与历史回看入口都使用同一产品面；不要把 recap 挂成 secondary widget。[VERIFIED: src/db/schema.ts][VERIFIED: .planning/ROADMAP.md]

**Example:**
```tsx
// Source: recommended extension of src/components/surfaces/classroom-console-surface.tsx [VERIFIED: codebase read]
if (recap) {
  return <ClassroomRecapSurface recap={recap} />;
}

return <ClassroomControlPanel initialSnapshot={initialSnapshot} />;
```

### Pattern 4: Dynamic outer read, optionally cached stable sub-read
**What:** teacher-scoped recap outer DTO 优先保持 request-fresh；若需要缓存，只缓存稳定的 published snapshot step metadata 或 pure step summaries，不缓存整份 teacher-specific workload bridge。[CITED: https://nextjs.org/docs/app/getting-started/caching][VERIFIED: src/lib/dal/learning.ts]

**When to use:** 当指标依赖 `searchParams`、teacher scope、latest feedback/evaluation 状态时，不要盲目把整个 recap 用 `use cache` 包住。[CITED: https://nextjs.org/docs/app/getting-started/caching]

**Example:**
```typescript
// Source: src/lib/dal/learning.ts cached-shell pattern [VERIFIED: codebase read]
export async function getPublishedStudentPlayerShellDTO(input: { lessonId: string }) {
  'use cache';
  cacheLife('hours');
  cacheTag(cacheTags.lesson(input.lessonId));
  cacheTag(cacheTags.steps(input.lessonId));
}
```

### Recommended DTO / DAL Boundary

| Layer | Recommended shape | Why |
|------|-------------------|-----|
| Top-level recap read | `getClassroomSessionRecapDTO({ sessionId, studentId?, stepId?, detailTab? })` in `src/lib/dal/classroom.ts`。[VERIFIED: codebase pattern] | `/classroom` 现有 page 已按 `sessionId` 组装主 DTO；继续单入口最稳。[VERIFIED: src/app/(classroom)/classroom/page.tsx] |
| Summary DTO | `summary`, `workload`, `participationBuckets`, `completionSummary`。[VERIFIED: requirement mapping] | planner 需要先回答 headline metrics，再进入 drill-down。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Student drill-down DTO | `studentSummaries[]` + `selectedStudent` with grouped `completion/submissions/evaluation/timeline` evidence。[VERIFIED: context decisions] | 符合 D-13 / D-14 / D-15 的“先摘要、再证据”。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Step diagnostic DTO | `stepSummaries[]` as secondary diagnostic view only。[VERIFIED: context decisions] | 满足 D-16，但不篡位主路径。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Bridge helpers | `buildFeedbackWorkloadFromAttempts()`, `buildClassroomSignalWorkload()`, `buildParticipationBuckets()`。[VERIFIED: codebase/read model need] | 把口径固定在 helper 内，避免 UI 重算或多个 DAL 分散复制。[VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/lib/dal/classroom.ts] |

### Anti-Patterns to Avoid
- **新建 analytics snapshot / materialized table：** 这会让 Phase 25 立即出现第二真相源，并违背“基于现有 durable facts 计算”的项目决策。[VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
- **把未评价学生默认归为“正常参与”：** 当前 participation truth 来自显式 formative evaluation，未评价必须诚实暴露为未评价。[VERIFIED: src/lib/dto/classroom.ts][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
- **用历史 attempts 总数计算待反馈：** 当前 lesson review 明确以 latest attempts + unique `attemptFeedback` 为反馈债口径，历史尝试总数会放大教师工作量。[VERIFIED: src/lib/dal/learning.ts]
- **在 client 侧拼 metric：** `/classroom` 当前所有可信状态都来自服务端 DTO；client 拼装会复制鉴权与口径逻辑。[VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/lib/dal/classroom.ts]
- **把 recap 变成 `/teacher/review` 的替代主页：** `/teacher/review` 仍然是 lesson-level feedback flow；Phase 25 只能借语义，不能迁主域。[VERIFIED: src/app/(teacher)/teacher/review/page.tsx][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session recap persistence | 新的 analytics 表、snapshot cron、并行导出层 | `classroom.ts` 中的 session-first read model。[VERIFIED: src/lib/dal/classroom.ts] | Phase 25 的价值是“即时可信”，不是先持久化一份新统计副本。[VERIFIED: .planning/ROADMAP.md] |
| Classroom signal handled state | 为每条 evidence 增加独立 `handled` 字段 | 以 `session + student` 上是否已有 formative evaluation 作为 classroom signal 已处理判定。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] | 用户已明确锁定不扩 schema state machine。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Feedback debt duplication | 把 `attemptFeedback` 复制进 classroomEvidence | latest attempts + `attemptFeedback` 只读桥接。[VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/db/schema.ts] | 否则 lesson review 与 session recap 会出现两份反馈状态。[VERIFIED: src/app/(teacher)/teacher/review/page.tsx] |
| New analytics route tree | `/teacher/analytics` 或新的一级导航 | `/classroom` ended-state + history list。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] | 保持教师“下课后仍留在同一课堂上下文”的产品心智。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| Client metric formulas | React state 里自行累加 participation/submission/workload | 服务端 DAL helper + typed DTO。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dto/classroom.ts] | 公式一旦散落到 UI，后续 Phase 26 趋势分析会很难收敛成统一口径。[VERIFIED: .planning/ROADMAP.md] |

**Key insight:** Phase 25 是“真相源桥接与产品收束”问题，不是“再造 analytics 子系统”问题。[VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: codebase read]

## Common Pitfalls

### Pitfall 1: 把 lesson-level truth 误当成 immutable session truth
**What goes wrong:** 历史 recap 重新打开时，completion / submission / feedback 指标随着课后补做或补反馈继续变化，老师看到的“那节课结果”不再稳定。[VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dal/learning.ts]
**Why it happens:** `lessonStepProgress`、`taskSubmissions`、`quizAttempts`、`attemptFeedback` 都不带 `sessionId`，而 Phase 25 又要求 session recap。[VERIFIED: src/db/schema.ts]
**How to avoid:** planner 必须先锁定每个 metric 是“session-owned immutable”还是“lesson-bridge current-state”；若选择 bridge current-state，UI 文案必须诚实标注。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
**Warning signs:** ended session recap 在老师补反馈或学生课后继续完成时发生数字漂移。[VERIFIED: schema + DAL model]

### Pitfall 2: 假设 `student-submission` 已经覆盖 task / quiz 写路径
**What goes wrong:** planner 以为 classroomEvidence 已包含任务/测验提交，因此直接按 `sourceType = student-submission` 做 recap 统计，结果读到的几乎全是 0。[VERIFIED: grep][VERIFIED: src/actions/learning-actions.ts]
**Why it happens:** schema 与 monitoring filter 都存在 `student-submission`，但当前 `submitTaskAttemptAction()` / `submitQuizAttemptAction()` 只写 lesson-domain attempts，不写 `classroomEvidence`。[VERIFIED: src/db/schema.ts][VERIFIED: src/actions/learning-actions.ts]
**How to avoid:** 对 Phase 25 明确写成 bridge 策略，或拆一个 scoped subtask 补 mirror write contract，再决定 session submission 指标口径。[VERIFIED: codebase read]
**Warning signs:** `/teacher/review` 已有 latest attempts，但 `/classroom` recap 提交数仍为 0。[VERIFIED: src/lib/dal/learning.ts][VERIFIED: src/lib/dal/classroom.ts]

### Pitfall 3: 把“未评价”悄悄并入“正常参与”
**What goes wrong:** participation chart 看起来更完整，但实际上掩盖了老师尚未评价的课堂空白。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
**Why it happens:** 当前 `latestParticipationLevel` 只在有 formative evaluation 时存在，空值很容易被 UI 自动兜底成默认档。[VERIFIED: src/lib/dto/classroom.ts][VERIFIED: src/lib/dal/classroom.ts]
**How to avoid:** summary 层固定输出 `unratedCount` / `未评价` bucket，并在 student list 中显式显示。[VERIFIED: context decision D-08]
**Warning signs:** participation 三档总人数刚好等于全班人数，但学生明细里没有任何评价记录。[VERIFIED: logical inconsistency from current contracts]

### Pitfall 4: 历史 recap 入口没落地，只实现 ended-state takeover
**What goes wrong:** 当前 session 结束后能看 recap，但之后无法从 `/classroom` 回看历史 session，违反 D-03。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
**Why it happens:** `getClassroomConsoleDTO()` 当前只返回 `liveSessions`，`page.tsx` 也只在这些 live sessions 中查找 `requestedSessionId`。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/app/(classroom)/classroom/page.tsx]
**How to avoid:** Phase 25 第一波就扩展 console DTO / route selection，保证 live + ended/history 同时存在同域入口。[VERIFIED: codebase read]
**Warning signs:** ended session 一旦离开页面就再也找不到 recap。[VERIFIED: current code behavior]

### Pitfall 5: 继续沿用 `updateTag(classroom)`，但 recap 读模型没有真实消费该 tag
**What goes wrong:** planner 以为 recap 已经有显式缓存失效，实际 reads 仍全是 request-time dynamic，tag invalidation 只是“看起来很安全”。[VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/lib/dal/classroom.ts]
**Why it happens:** 当前 classroom read paths 没有 `use cache` / `cacheTag(cacheTags.classroom(...))`；只有 action 侧在调用 `updateTag()`。[VERIFIED: src/actions/classroom-actions.ts][VERIFIED: grep]
**How to avoid:** Phase 25 要么保持 recap outer read 明确 dynamic，要么补齐真正的 cached read + invalidation matrix，包括 feedback 写路径对 recap 的失效策略。[VERIFIED: codebase read][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
**Warning signs:** 设计文档写了 explicit cache behavior，但代码里只看得到 action invalidation，看不到 tagged read。[VERIFIED: codebase read]

## Code Examples

Verified patterns from official sources and the current repo:

### Classroom mutation uses `updateTag()` for read-your-own-writes
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/updateTag [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
// Repo usage: src/actions/classroom-actions.ts [VERIFIED: codebase read]
"use server";

import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";

updateTag(cacheTags.classroom(parsed.data.sessionId));
```

### Stable shell data can be cached separately from request-fresh personal/session data
```typescript
// Source: src/lib/dal/learning.ts [VERIFIED: codebase read]
export async function getPublishedStudentPlayerShellDTO(input: { lessonId: string }) {
  'use cache';
  cacheLife('hours');
  cacheTag(cacheTags.lesson(input.lessonId));
  cacheTag(cacheTags.steps(input.lessonId));
  // fetch stable shell data only
}
```

### Latest-attempt feedback debt is already expressed as a deterministic helper
```typescript
// Source: src/lib/dal/learning.ts [VERIFIED: codebase read]
const latestAttempts = [
  ...latestTasks.map((row) => row.id),
  ...latestQuizzes.map((row) => row.id),
];

const needsFeedback = latestAttempts.some(
  (id) => !feedbackRows.some((feedback) => feedback.targetId === id),
);
```

### Runtime / request-specific data should stay outside `use cache` and behind Suspense
```tsx
// Source: https://nextjs.org/docs/app/getting-started/caching [CITED: https://nextjs.org/docs/app/getting-started/caching]
import { Suspense } from 'react'

async function LatestPosts() {
  const data = await fetch('https://api.example.com/posts')
  const posts = await data.json()
  return <ul>{posts.map((post) => <li key={post.id}>{post.title}</li>)}</ul>
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading posts...</p>}>
      <LatestPosts />
    </Suspense>
  )
}
```

## Verification Strategy

- **Primary strategy:** 沿用仓库既有 phase verifier 模式，新增 `verify:phase25`，由静态 guard + focused Vitest suites 共同证明 recap contract，而不是依赖人工点击检查。[VERIFIED: package.json][VERIFIED: .planning/phases/24-live-classroom-operations-and-formative-evaluation/24-04-SUMMARY.md]
- **Metric correctness tests:** 在 `src/lib/dal/classroom.test.ts` 中固定 fixture，至少覆盖：participation buckets、未评价 bucket、`待反馈提交` latest-only 逻辑、`待跟进课堂信号` 逻辑、step diagnostics 计数、history reopen 稳定性或明确语义。[VERIFIED: glob][VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts]
- **Surface tests:** 新增或扩展 `/classroom` surface tests，覆盖 ended session 主舞台 takeover、student-first 默认视角、step diagnostics 仅为次级视角、无数据空态与 history list 行为。[VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: src/components/classroom/classroom-student-detail-panel.tsx]
- **Action/cache guards:** verifier 应静态检查 `page.tsx` 中的 ended/live 分支、`ClassroomConsoleSurface` 的 recap branch、`classroom.ts` 中的 recap helper、以及没有新建 `/teacher/analytics` 主路径；若 recap 采用 cached helper，还要显式检查 read tags 与 write invalidation 是否成对存在。[VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/learning-actions.ts]
- **Recommended quick command:** `pnpm test --run src/lib/dal/classroom.test.ts src/lib/dal/learning.test.ts src/actions/classroom-actions.test.ts src/components/classroom/classroom-student-detail-panel.test.tsx`，再由 `pnpm verify:phase25` 收口静态 guard。[VERIFIED: glob][VERIFIED: package.json]

## Planning Hints

- **Wave 1:** 扩 `getClassroomConsoleDTO()` / `page.tsx` 的 ended/history session 选择能力 + recap DTO skeleton。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/app/(classroom)/classroom/page.tsx]
- **Wave 2:** 完成 `classroom.ts` 聚合 helper：summary、workload bridge、student summaries、step diagnostics、grouped raw evidence。[VERIFIED: codebase read]
- **Wave 3:** 用新的 recap surface 替换 ended-state live controls，并把 student-first / step diagnostics / empty states 接到同一路由 UI。[VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: src/components/classroom/classroom-control-panel.tsx]
- **Wave 4:** 补 focused regression + `verify:phase25`，锁定 metric semantics 和 route boundary。[VERIFIED: package.json][VERIFIED: .planning/phases/24-live-classroom-operations-and-formative-evaluation/24-04-SUMMARY.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| lesson-level review page 承担全部“反馈/复盘”心智 | lesson-level review 保持 task/quiz feedback，session recap 回到 `/classroom` ended-state 主域。[VERIFIED: src/app/(teacher)/teacher/review/page.tsx][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] | Phase 25 boundary, defined 2026-05-14。[VERIFIED: 25-CONTEXT.md] | 避免双主路径竞争，让老师下课后仍留在同一课堂上下文。[VERIFIED: 25-CONTEXT.md] |
| 只看 live monitoring summary | ended 后立即读取 deterministic recap，并 drill down 到 raw evidence。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] | Phase 25 target in roadmap。[VERIFIED: ROADMAP.md] | 把课堂运行数据转成可立即行动的课后复盘面。[VERIFIED: ROADMAP.md] |
| 隐式或模糊缓存判断 | Next.js 16 显式 `use cache` / `<Suspense>` / `updateTag()` 策略。[CITED: https://nextjs.org/docs/app/getting-started/caching][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] | Next.js 16.2.6 docs last updated 2026-05-13。[CITED: https://nextjs.org/docs/app/getting-started/caching] | recap 需要明确说明哪些读模型缓存、哪些 request-fresh。[CITED: https://nextjs.org/docs/app/getting-started/caching] |

**Deprecated/outdated:**
- 把 `/teacher/review` 升级为 session recap 主入口：已被 Phase 25 context 否决。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
- 依赖 AI narrative summary 作为首发 recap：已被项目与 phase context 明确排除。[VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]
- 为每条 classroom evidence 增加 handled state machine：当前已明确 deferred。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

## Assumptions Log

None — 本研究中的实现判断均基于本次会话内的代码读取、npm registry 校验或 Next.js 官方文档，没有保留 `[ASSUMED]` 结论。[VERIFIED: codebase read][VERIFIED: npm registry][CITED: https://nextjs.org/docs/app/getting-started/caching]

## Open Questions

1. **completion headline metric 到底代表“课堂结束时到达位置”还是“课后当前完成状态”？**
   - What we know: `classroomParticipants.currentStepId` 是 session-owned；`lessonStepProgress` 是 lesson-owned。[VERIFIED: src/db/schema.ts]
   - What's unclear: 历史 recap 是否必须在学生课后继续补做后仍保持原数字不变。[VERIFIED: phase requirement tension]
   - Recommendation: planner 必须在 Plan 25-01 明确锁定一种语义；若选后者，文案应标明“当前完成状态”；若选前者，则要新增 end-of-session snapshot 逻辑或等价冻结策略。[VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md]

2. **task / quiz attempts 如何归属到某一次 session？**
   - What we know: attempts 没有 `sessionId`；当前也没有 mirror `student-submission` evidence write path。[VERIFIED: src/db/schema.ts][VERIFIED: src/actions/learning-actions.ts]
   - What's unclear: 是否可以安全地用 `createdAt` 落在 `session.createdAt..endedAt` 窗口内来判定本次课堂提交。[VERIFIED: codebase read]
   - Recommendation: 若 planner 不愿在本阶段补 mirror write，至少要把该时间窗口策略写成显式公式并补 fixture tests，避免隐式统计漂移。[VERIFIED: codebase read]

3. **history list 的最小交付是什么？**
   - What we know: context 要求历史回看仍在 `/classroom` 域内；当前 console DTO 没有 ended/history sessions。[VERIFIED: 25-CONTEXT.md][VERIFIED: src/lib/dal/classroom.ts]
   - What's unclear: 是否需要分页、筛选、最近 N 条，还是只要最近若干节课堂即可。[VERIFIED: codebase gap]
   - Recommendation: Phase 25 先做“同 teacher scope 下最近 ended sessions 列表 + query-param reopen”，不要提前做 analytics index 页。[VERIFIED: 25-CONTEXT.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | 继续依赖 Auth.js 会话与当前 teacher auth boundary；`/classroom` recap 不能绕开已登录教师校验。[VERIFIED: AGENTS.md][VERIFIED: src/lib/dal/auth.ts? not read][VERIFIED: src/lib/dal/classroom.ts] |
| V3 Session Management | yes | recap 与 live classroom 共用当前教师会话，不新增 analytics token 或公开分享链接。[VERIFIED: AGENTS.md][VERIFIED: .planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md] |
| V4 Access Control | yes | `assertActiveTeacher()`、`getTeacherSessionScope()`、`session.teacherId === scope.userId` 仍应作为 recap read/write 的第一道门。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts] |
| V5 Input Validation | yes | 继续用 Zod 校验 `sessionId`、`studentId`、`detailTab`、future recap filters；不能信任 query params 直接驱动 cross-student reads。[VERIFIED: src/lib/dto/classroom.ts][VERIFIED: src/app/(classroom)/classroom/page.tsx] |
| V6 Cryptography | no | 本阶段不引入新的密码学需求；延续现有 Auth.js / session 基线即可，禁止 hand-roll crypto。[VERIFIED: AGENTS.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 同校但非当前教师读取他人 session recap | Information Disclosure / Elevation | recap read helper 继续复用 `getTeacherSessionScope()`，并在 session lookup 后强校验 `teacherId`。[VERIFIED: src/lib/dal/classroom.ts] |
| 通过 query params 篡改 studentId / detailTab 越权读取 | Tampering | 只允许在 teacher-scoped session 内读取 student detail，并对 `detailTab` 走 Zod parse。[VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/lib/dto/classroom.ts] |
| bridged feedback metrics stale 或错算 | Integrity | 若 recap 缓存，必须补齐 attempt feedback 对应 invalidation；否则保持 dynamic outer read。[VERIFIED: src/actions/learning-actions.ts][VERIFIED: src/actions/classroom-actions.ts][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |
| 把 teacher-only intervention / evaluation 泄漏到非教师 consumer | Information Disclosure | 继续沿用 classroom domain 的 teacher-only detail model，不在 student/player DTO 中暴露 recap fields。[VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/learning.ts] |

## Sources

### Primary (HIGH confidence)
- `src/lib/dto/classroom.ts` — 当前 classroom DTO、participation level、student detail、formative evaluation 合同。[VERIFIED: codebase read]
- `src/lib/dal/classroom.ts` — 当前 session-first classroom reads/writes、monitoring summary、student detail、end session behavior。[VERIFIED: codebase read]
- `src/lib/dal/learning.ts` — latest attempt、`attemptFeedback`、teacher review workload 语义与 cached shell pattern。[VERIFIED: codebase read]
- `src/db/schema.ts` — `classroomSessions`、`classroomParticipants`、`classroomEvidence`、`classroomTimeline`、`taskSubmissions`、`quizAttempts`、`attemptFeedback` 表结构与索引。[VERIFIED: codebase read]
- `src/app/(classroom)/classroom/page.tsx` — 当前 `/classroom` 的 sessionId / studentId / detailTab 组装方式。[VERIFIED: codebase read]
- `src/components/surfaces/classroom-console-surface.tsx` — 当前 `/classroom` 主舞台与 no-session/live surface 结构。[VERIFIED: codebase read]
- `src/components/classroom/classroom-control-panel.tsx` — live runtime 主控区、结束课堂动作、secondary panels 排布。[VERIFIED: codebase read]
- `src/components/classroom/classroom-student-detail-panel.tsx` — student-first detail panel 现有模式。[VERIFIED: codebase read]
- `src/app/(teacher)/teacher/review/page.tsx` 与 `src/components/learning/teacher-review-surface.tsx` — lesson-level feedback 主路径与待反馈统计语义。[VERIFIED: codebase read]
- `.planning/PROJECT.md` / `.planning/ROADMAP.md` / `.planning/REQUIREMENTS.md` / `.planning/STATE.md` / `25-CONTEXT.md` / `24-CONTEXT.md` / `21-CONTEXT.md` — Phase 25 的项目边界、success criteria 与前序锁定决策。[VERIFIED: planning docs read]
- npm registry — `next@16.2.6`, `react@19.2.6`, `drizzle-orm@0.45.2`, `zod@4.4.3`, `vitest@4.1.6` 当前版本与发布时间。[VERIFIED: npm registry]
- Next.js docs `https://nextjs.org/docs/app/getting-started/caching` — Cache Components、`use cache`、`<Suspense>`、request-fresh 数据边界；version 16.2.6, last updated 2026-05-13。[CITED: https://nextjs.org/docs/app/getting-started/caching]
- Next.js docs `https://nextjs.org/docs/app/api-reference/functions/updateTag` — `updateTag()` 仅用于 Server Actions、read-your-own-writes invalidation；version 16.2.6, last updated 2026-05-13。[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]

### Secondary (MEDIUM confidence)
- `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-RESEARCH.md` — 复用同域 route takeover、verifier pattern 的近期研究先例。[VERIFIED: planning doc read]
- `.planning/phases/23-student-in-class-activity-flow/23-RESEARCH.md` — cached shell / dynamic personal state / classroom evidence write path 的近期研究先例。[VERIFIED: planning doc read]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 由 `package.json`、npm registry 和 Next.js 官方文档共同验证。[VERIFIED: package.json][VERIFIED: npm registry][CITED: https://nextjs.org/docs/app/getting-started/caching]
- Architecture: MEDIUM - 主边界与 route/UI pattern 已被代码和 context 锁定，但 completion / session-attribution 公式仍需 planner 明确收口。[VERIFIED: codebase read][VERIFIED: 25-CONTEXT.md]
- Pitfalls: HIGH - 关键风险均来自当前 schema、action、DAL 的实际缺口，而非推测。[VERIFIED: src/db/schema.ts][VERIFIED: src/actions/learning-actions.ts][VERIFIED: src/lib/dal/classroom.ts]

**Research date:** 2026-05-14
**Valid until:** 2026-06-13
