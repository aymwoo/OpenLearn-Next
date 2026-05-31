# Phase 58: Operator Recovery & Production Surfaces - Research

**Researched:** 2026-05-25
**Domain:** classroom-anchored operator diagnostics, recovery surfaces, and authoritative correlation read models
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

_Copied verbatim from `.planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md`. [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]_

### Locked Decisions
- **D-58-01:** Phase 58 不做单一 mega dashboard；继续保留 `runtime inspector`、`async operator`、`plugin governance` 三类独立 operator surface。
- **D-58-02:** Phase 58 必须新增以 `classroom/session` 为起点的 operator entry，把课堂 incident 作为默认入口，再通过显式关联跳转进入 runtime / plugin / command / task 详情。
- **D-58-03:** teacher 当前 classroom shell 中的最小 recovery 和课堂内告警继续保留；Phase 58 只补 operator/support production surfaces，不把课堂内诊断整体迁走。
- **D-58-16:** `Settings Labs` 在 Phase 58 中保留为 operator tooling 的汇总索引入口，但它的职责是承接跨课堂排障与 recent incidents，不取代 `classroom/session` 作为默认 incident 入口。
- **D-58-17:** classroom 页中的 operator 入口必须稳定存在，但默认保持低干扰；一旦出现 degraded / failed / blocked posture，它应升格为更显眼的 incident CTA。
- **D-58-18:** 当 operator 从 `Settings Labs` 进入且手里没有现成 classroom deep link 时，第一屏优先看到“课堂 incident 列表”，而不是先选工具页或先输入大量对象元数据检索。
- **D-58-04:** operator 默认排查锚点固定为 `classroom/session`，不是 `command/task` 或 `plugin/action`；support 应先回答“这堂课现在发生了什么”，再下钻平台执行细节。
- **D-58-05:** authoritative operator read model 必须围绕单个 classroom/session 投影出 school、lesson version、runtime session、plugin、action、command、task 的关联状态，而不是让 operator 手工拼多页信息。
- **D-58-06:** support/operator 视图与研发视图必须共享同一 truth source；差异只能体现在信息深度与可见字段，不允许维护两套彼此漂移的 read model。
- **D-58-07:** `command`、`task`、`plugin` 仍保留各自专门 surface 或 detail view，但它们在 Phase 58 中属于 classroom incident 的下钻节点，不升级为首页主导航锚点。
- **D-58-19:** `classroom/session` operator 首屏采用“摘要优先”组织：先给 classroom/session 当前状态、degraded posture 与关联对象摘要，不把首屏做成 timeline-first 或 giant detail page。
- **D-58-20:** `classroom/session` 首屏上的关联信息优先按“当前问题 / incident cards”组织，而不是按 Runtime / Plugin / Command / Task 四大对象分区平铺；对象类型视图属于进一步下钻。
- **D-58-21:** `latest command`、`problem tasks`、`plugin posture` 等关联对象在首屏只停留在“状态 + 原因/影响 + 下一跳”粒度；attempt history、full timeline、raw diagnostics 留在 detail surfaces。
- **D-58-08:** degraded posture 一律采用“强提示 + trust boundary”表达：明确写出当前不能信任什么、仍可信什么、下一步去哪里，不能退化成 badge-only 或 reason-code-only。
- **D-58-09:** Redis degraded、worker lag、transport fallback、plugin disabled / incompatible 等 posture 必须在 operator surface 上显式给出影响范围，至少区分“当前课堂受影响”与“平台级或多课堂受影响”。
- **D-58-10:** 当系统进入 fallback / degraded posture 时，surface 必须优先暴露 canonical truth 是否仍可读、当前只保证哪一层 correctness、以及 operator 是否需要立即介入；不能只说“有问题”而不说边界。
- **D-58-11:** degraded honesty 口径要跨 classroom、runtime inspector、async operator、plugin governance 保持一致；planner 不得让某一页用强告警、另一页只剩弱提示，造成 operator 认知分裂。
- **D-58-22:** 所有 degraded / fallback posture 都必须遵循固定三段模板：`仍可信什么 / 已不可信什么 -> 影响范围 -> 推荐下一步`；不同页面只能替换内容，不能改写顺序或省掉其中一段。
- **D-58-12:** Phase 58 的 operator surface 必须提供可执行恢复动作，而不是只给日志和跳转；标准恢复路径的目标是“不改库即可恢复”。
- **D-58-13:** 恢复动作采用分级确认：`retry` / `reconcile` 走轻确认；`resume` / `suspend` / `fallback` 这类会改变运行姿态或影响课堂行为的动作必须给更明确的二次确认和影响提示。
- **D-58-14:** 恢复动作 availability 必须是 reason-gated 的。若当前上下文不安全或不适用，surface 必须明确说明为什么不能执行，并给出正确的下一个入口，而不是假装总能点。
- **D-58-15:** 所有 operator recovery action 都必须继续走 server-owned seams（Server Actions / command bus / DAL / audited recovery services），并留下 command / recovery audit / task history；禁止 DB surgery、浏览器本地改状态或旁路写入。
- **D-58-23:** Phase 58 的轻确认动作只限 `retry` 与 `reconcile`；`resume` 不得留在 quick path，它和 `suspend`、`fallback` 一样视为会改变运行姿态的高风险动作。
- **D-58-24:** `resume` / `suspend` / `fallback` 这类高风险动作必须在相关 detail view 中完成确认，而不是在 classroom/session 首屏直接执行；确认层必须强制显示影响范围、姿态变化和将写入的审计记录。
- **D-58-25:** 当某个恢复动作当前不可执行时，surface 必须保留该动作的可见性，但以 disabled + reason 的方式明确解释为什么现在不能做，并提供正确的下一步入口；不能直接隐藏，也不能等点击后才报错。

### the agent's Discretion
- classroom-anchored operator entry 的精确 route 名称、放在 `/settings/labs` 下还是以 classroom deep link 进入后再跳转，可由 planner 在现有 IA 下做最小正确收敛，但必须保持“从 classroom incident 出发”的默认心智模型。
- classroom/session 关联 read model 的 DTO 字段名、join strategy、以及 command/task correlation key 命名，可由 planner 结合现有 `runtimeSessionId` / `classroomSessionId` / `correlationId` / `commandId` / `taskId` 结构收敛。
- degraded posture 的具体阈值、risk label 和色阶文案可由 researcher / planner 依据当前 runtime / worker / transport truth 做最小正确设定，但必须满足 D-58-08 至 D-58-11 的 honesty posture。
- 分级确认的最终 UI 形态可由 planner 选择 inline confirm、modal、popover 或 detail-page confirm，只要风险层级和影响提示保持一致。
- `Settings Labs` 汇总入口里的 incident list 默认排序、过滤项、以及 classroom metadata 展示密度，可由 planner 结合现有 route / DTO 约束收敛，但它必须服务于“先找到出问题的课堂”这一目标，而不是退化成工具目录页。

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-01 | operator 必须能按 school / classroom / lesson version / plugin / action / command / task 关联定位问题。 [VERIFIED: .planning/REQUIREMENTS.md] | 新增 classroom/session authoritative read model，首屏投影 school、lesson version、runtime session、plugin posture、latest command、problem tasks，并 deep-link 到现有 runtime / plugin / async / command detail seams。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: src/lib/dal/runtime-inspector.ts][VERIFIED: src/features/platform-core/observability/operator-read-model.ts][VERIFIED: src/lib/dal/async-task-operator.ts] |
| OPS-02 | Redis degraded、worker lag、transport fallback、plugin disabled 等降级姿态必须诚实暴露在 operator surface。 [VERIFIED: .planning/REQUIREMENTS.md] | 沿用 runtime inspector 的 degraded health、async operator 的 `trustedFacts/caution/nextStep`、plugin governance 的 reason-gated diagnostics，并统一成固定三段 honesty 模板。 [VERIFIED: src/lib/dal/runtime-inspector.ts][VERIFIED: src/lib/dto/runtime-inspector.ts][VERIFIED: src/lib/dal/async-task-operator.ts][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] |
| OPS-03 | operator 与 support 必须能在不改库的前提下执行恢复动作，并有最小 runbook。 [VERIFIED: .planning/REQUIREMENTS.md] | 继续通过 Server Actions -> DAL / command bus / audited recovery service 执行 `retry`、`reconcile`、`resume`、`suspend`、`fallback`；proof 需补 support-facing runbook excerpt。 [VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/async-task-operator-actions.ts][VERIFIED: src/features/async-tasks/server/recovery.ts][VERIFIED: src/actions/plugin-actions.ts][VERIFIED: .planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md] |
| PLUG-03 | 插件失败必须有明确 taxonomy，并为 operator 暴露可执行的 retry / reconcile / suspend / fallback 等恢复动作。 [VERIFIED: .planning/REQUIREMENTS.md] | 复用 plugin lifecycle governance 的 `recommendedRecoveryAction` / blocked diagnostics，课堂首屏只暴露轻确认；高风险 posture 下钻到 plugin 或 command detail。 [VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx][VERIFIED: src/actions/plugin-actions.ts][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] |
| SAFE-02 | 样板链路中的关键写操作必须具备强校验、幂等/去重、补偿或 replay-safe 语义。 [VERIFIED: .planning/REQUIREMENTS.md] | 恢复动作必须追加 attempt / command / audit trail，不能覆盖 truth；缓存失效要与 mutation 同步，保持 read-your-own-writes。 [VERIFIED: src/features/async-tasks/server/recovery.ts][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/async-task-operator-actions.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 [VERIFIED: AGENTS.md]
- UI 组件禁止直连数据库；所有读写必须通过 DAL 和 Server Actions。 [VERIFIED: AGENTS.md]
- Node.js 20.9+ 为主；Edge Runtime 仅用于 SSE 实时同步。 [VERIFIED: AGENTS.md]
- Next.js 16 必须显式缓存；写入后必须 `updateTag()` 或等价失效 tag。 [VERIFIED: AGENTS.md][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
- 首发只针对 SQLite；关联必须 `cascade delete`。 [VERIFIED: AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。 [VERIFIED: AGENTS.md]
- 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`，避免通用 admin dashboard 风格。 [VERIFIED: AGENTS.md]

## Summary

Phase 58 不需要新造一套 operator 平台；仓库里已经有三块可复用基线：`RuntimeInspectorSurface` 的 runtime/transport truth、`AsyncTaskOperatorSurface` 的 summary-first backlog 与 problem-task 节奏、以及 `PluginLifecycleOperatorSurface` 的 reason-gated recovery catalog。真正缺的是一个以 `classroom/session` 为锚点的 authoritative correlation read model，把课堂 incident 与 runtime session、plugin posture、latest command、problem task 串成同一张摘要页。 [VERIFIED: src/components/surfaces/runtime-inspector-surface.tsx][VERIFIED: src/lib/dal/async-task-operator.ts][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]

最稳妥的落点是：保留现有 `/settings/labs/runtime-inspector`、`/settings/labs/async-tasks`、plugin governance 三类 detail surface，不做 mega dashboard；新增 `/settings/labs/incidents` 作为“没有 deep link 时的课堂 incident 列表”，以及 `/settings/labs/incidents/[sessionId]` 作为正式的 classroom/session operator surface。课堂壳继续保留最小恢复入口，但 degraded / failed / blocked posture 时把 CTA 升级为跳向该 incident surface。 [VERIFIED: src/app/settings/labs/runtime-inspector/page.tsx][VERIFIED: src/app/settings/labs/async-tasks/page.tsx][VERIFIED: src/components/classroom/classroom-control-panel.tsx][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]

恢复动作的最佳放置策略已经在仓库里有明确先例：`retry` / `reconcile` 允许在摘要面轻确认，`resume` / `suspend` / `fallback` 必须下沉到 detail view，并通过 disabled + reason 保持可见但不可误触。这样既满足 `OPS-03` / `PLUG-03`，也不会破坏 `SAFE-02` 对审计、幂等和 replay-safe 的要求。 [VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx][VERIFIED: src/features/async-tasks/server/recovery.ts][VERIFIED: src/actions/classroom-actions.ts][VERIFIED: .planning/REQUIREMENTS.md]

**Primary recommendation:** 新增 classroom/session authoritative incident read model 与 incident routes，复用现有 runtime / plugin / async / command detail surfaces，统一 honesty 文案和 recovery 分级，而不是重做 dashboard。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: codebase read]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Classroom incident list (`/settings/labs/incidents`) | Frontend Server (SSR) | API / Backend | 列表页负责按 operator scope 拉取 request-fresh DTO；真正的关联拼装仍由 DAL/read model 完成。 [VERIFIED: src/app/settings/labs/page.tsx][VERIFIED: src/lib/dal/async-task-operator.ts] |
| Classroom/session incident summary (`/settings/labs/incidents/[sessionId]`) | API / Backend | Frontend Server (SSR) | authoritative truth 必须在 server-owned read model 中组装，页面只消费 DTO。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: AGENTS.md] |
| Runtime / transport drill-down | API / Backend | Frontend Server (SSR) | 现有 runtime inspector 已从 runtime、governance、transport、consumer 表统一汇总 timeline。 [VERIFIED: src/lib/dal/runtime-inspector.ts] |
| Async task drill-down | API / Backend | Frontend Server (SSR) | 现有 async operator detail 由 DAL 汇总 task、events、retry eligibility、attempt groups。 [VERIFIED: src/lib/dal/async-task-operator.ts] |
| Plugin lifecycle governance drill-down | API / Backend | Frontend Server (SSR) | 治理动作与 diagnostics 来自 command bus / registry read model，不应在客户端本地推断。 [VERIFIED: src/actions/plugin-actions.ts][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |
| Recovery mutations | API / Backend | Database / Storage | 恢复动作必须走 Server Actions / DAL / recovery service，并写入 command / task / audit history。 [VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/async-task-operator-actions.ts][VERIFIED: src/features/async-tasks/server/recovery.ts][VERIFIED: src/actions/plugin-actions.ts] |
| Cache invalidation after recovery | Frontend Server (Server Actions) | API / Backend | `updateTag()` 只能在 Server Actions 内使用；因此 mutation entrypoint 必须承担 read-your-own-writes 失效。 [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/async-task-operator-actions.ts] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.4` in repo; `16.2.6` latest npm on 2026-05-07 [VERIFIED: package.json][VERIFIED: npm registry] | App Router pages, Server Actions, cache invalidation | Phase 58 需要继续用 thin route + DAL DTO + `updateTag()` 模式，现有 classroom / async / settings surfaces 已全部建立在 Next App Router 上。 [VERIFIED: src/app/settings/labs/runtime-inspector/page.tsx][CITED: https://nextjs.org/docs/app/getting-started/caching][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |
| React / React DOM | `19.2.5` in repo; `19.2.6` latest npm on 2026-05-06 [VERIFIED: package.json][VERIFIED: npm registry] | Client surfaces for confirmation flows and progressive disclosure | 现有 classroom、plugin governance、async detail 全依赖 client-side confirmation / refresh pattern；Phase 58 无需引入别的 UI runtime。 [VERIFIED: src/components/classroom/classroom-control-panel.tsx][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |
| Zod | `4.4.3` [VERIFIED: package.json][VERIFIED: npm registry] | DTO / action input validation | 现有 classroom、runtime inspector、async operator 全部通过 Zod schema 固化 contract；新 incident DTO/action seam 应沿用。 [VERIFIED: src/lib/dto/classroom.ts][VERIFIED: src/lib/dto/runtime-inspector.ts][VERIFIED: src/lib/dto/async-task-operator.ts] |
| Drizzle ORM + SQLite | `drizzle-orm@0.45.2` + SQLite-first baseline [VERIFIED: package.json][VERIFIED: AGENTS.md] | Authoritative truth source | `OPS-01` / `SAFE-02` 要求关联定位和恢复动作都围绕 durable truth，而不是 transport/BullMQ substrate。 [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: AGENTS.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BullMQ | `5.76.10` in repo; `5.77.3` latest npm on 2026-05-25 [VERIFIED: package.json][VERIFIED: npm registry] | Async task retry / attempt seeding | 只在 async task recovery service 与 operator detail 中消费；不要为 classroom incident 新造队列抽象。 [VERIFIED: src/features/async-tasks/server/recovery.ts] |
| Vitest | `4.1.5` in repo; `4.1.7` latest npm on 2026-05-20 [VERIFIED: package.json][VERIFIED: npm registry] | Focused contract, surface, and verifier tests | 当前 phase verifier、surface source assertions、action tests 全部基于 Vitest。 [VERIFIED: vitest.config.mts][VERIFIED: scripts/verify-phase42-operator-recovery.ts][VERIFIED: scripts/verify-phase52-action-registry-and-lifecycle.ts] |
| Playwright | `1.59.1` in repo; `1.60.0` latest npm on 2026-05-11 [VERIFIED: package.json][VERIFIED: npm registry] | Browser/UAT proof scripts | 适合补 Phase 58 的 operator walkthrough proof，但不应成为唯一 automated gate。 [VERIFIED: package.json][VERIFIED: scripts/proof-phase57-classroom-runtime.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Classroom/session incident hub | Single mega dashboard | 违背 D-58-01，且会把 runtime / plugin / async 的既有节奏全部打散。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] |
| Existing command/task/plugin detail seams | New unified raw-log page | 会绕开现有 reason-gated actions、attempt grouping、command timeline 语义，信息更全但可执行性更差。 [VERIFIED: src/components/surfaces/async-task-operator-detail-surface.tsx][VERIFIED: src/features/platform-core/observability/operator-read-model.ts][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |
| Server Actions + `updateTag()` | Client-side local mutation / optimistic-only recovery | 不满足 read-your-own-writes 与审计要求，也直接违反 DAL + Server Actions only。 [VERIFIED: AGENTS.md][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |

**Installation:**
```bash
# No new package is required for the recommended Phase 58 baseline.
# Reuse existing next/react/zod/drizzle/bullmq/vitest/playwright dependencies.
```

**Version verification:**
- `next` latest npm: `16.2.6`, published `2026-05-07T19:01:54.751Z`. [VERIFIED: npm registry]
- `react` latest npm: `19.2.6`, published `2026-05-06T16:16:47.653Z`. [VERIFIED: npm registry]
- `zod` latest npm: `4.4.3`, published `2026-05-04T07:06:40.819Z`. [VERIFIED: npm registry]
- `bullmq` latest npm: `5.77.3`, published `2026-05-25T06:46:12.320Z`. [VERIFIED: npm registry]
- `vitest` latest npm: `4.1.7`, published `2026-05-20T07:19:42.142Z`. [VERIFIED: npm registry]
- `playwright` latest npm: `1.60.0`, published `2026-05-11T19:09:33.114Z`. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

Recommended incident flow for Phase 58. [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: codebase read]

```text
Classroom shell degraded CTA / Settings Labs incident list
                |
                v
  /settings/labs/incidents/[sessionId]  (summary-first operator surface)
                |
                v
getClassroomIncidentOperatorDTO({ classroomSessionId })
                |
                +--> classroom session truth (status, lesson version, voting recovery affordances)
                |
                +--> runtime correlation (runtimeSessionId -> Runtime Inspector)
                |
                +--> platform command correlation (latest command / failureAttribution / timeline)
                |
                +--> async task correlation (problem tasks / retry eligibility / detail hrefs)
                |
                +--> plugin posture correlation (reasonCode / recommendedRecoveryAction / diagnostics)
                |
                v
     summary cards + trust boundary + next-hop detail links
                |
                +--> lightweight actions: retry / reconcile
                |
                +--> high-risk actions routed to detail views: resume / suspend / fallback
                |
                v
 Server Actions -> DAL / command bus / recovery services -> audit / task / command history + updateTag()
```

### Recommended Project Structure
```text
src/
├── app/settings/labs/incidents/                   # operator incident entry + list/detail routes
│   ├── page.tsx                                   # recent classroom incidents
│   └── [sessionId]/page.tsx                       # classroom/session incident surface
├── components/surfaces/
│   ├── classroom-incident-operator-surface.tsx    # summary-first incident UI
│   └── platform-command-operator-detail-surface.tsx # optional command drill-down extraction
├── lib/dal/
│   ├── classroom-incident-operator.ts             # authoritative correlation read model
│   └── classroom-incident-list.ts                 # recent incidents for Settings Labs entry
├── lib/dto/
│   ├── classroom-incident-operator.ts             # DTOs for summary cards, honesty, action availability
│   └── classroom-incident-list.ts                 # list row/filter DTOs
└── actions/
    └── operator-classroom-recovery-actions.ts     # optional thin wrappers if classroom action signatures must diverge
```

### Pattern 1: Summary-first classroom incident hub
**What:** 新首页只回答“这堂课当前是否健康、哪里不可信、下一步该去哪”，不要在首屏铺 full timeline。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**When to use:** 所有从 classroom CTA 或 incident list 进入的 operator/support 排障入口。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Example:**
```typescript
// Source: src/components/classroom/classroom-control-panel.tsx [VERIFIED: codebase read]
{currentSnapshot.transportStatus.degraded ? (
  <Card>
    <h3>当前仅保证本实例课堂同步</h3>
    <p>
      当前 classroom session 目标模式为 {currentSnapshot.transportStatus.fanoutMode}。
      {currentSnapshot.transportStatus.degradedReason
        ? ` Redis fanout 失效原因：${currentSnapshot.transportStatus.degradedReason}`
        : ' 跨实例 fanout 暂不可用，请优先按本实例继续控课。'}
    </p>
  </Card>
) : null}
```

### Pattern 2: Authoritative correlation read model
**What:** 用单一 server-owned seam 把 `classroomSessionId` 映射到 runtime session、plugin posture、platform command、async tasks，而不是让页面自己发 4 次请求拼接。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: AGENTS.md]
**When to use:** 新 incident detail route；Settings Labs recent incidents 下钻；未来 support runbook links。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Example:**
```typescript
// Source: src/features/platform-core/observability/operator-read-model.ts [VERIFIED: codebase read]
export async function getPlatformCommandWithTimeline(input: {
  commandId: string;
  schoolIds: string[];
}) {
  const command = await db.query.platformCommands.findFirst({ /* ... */ })
  const [events, dispatches] = await Promise.all([/* ... */])
  return {
    command: toPlatformCommandOperatorSummaryDTO(command),
    timeline: events.map((event) =>
      toPlatformCommandOperatorTimelineEventDTO({
        event,
        dispatches: dispatchesByEventId.get(event.id) ?? [],
      }),
    ),
  }
}
```

### Pattern 3: Risk-tiered recovery placement
**What:** `retry` / `reconcile` 允许轻确认；`resume` / `suspend` / `fallback` 只能在 detail view 执行。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**When to use:** 所有 classroom/plugin/task/operator recovery flows。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Example:**
```typescript
// Source: src/components/surfaces/plugin-lifecycle-operator-surface.tsx [VERIFIED: codebase read]
{plugin.recommendedRecoveryAction
  ? submitRecoveryAction(plugin)
  : submitToggle(plugin)}

// destructive / posture-changing confirmation is moved into dialog
<dialog>
  <p>retain 为默认姿态；cleanup 需要显式 opt-in 与确认。</p>
  <p>我已确认 cleanup 会删除以上分类数据，并且这是显式的破坏性操作。</p>
</dialog>
```

### Pattern 4: Mutation entrypoints own cache freshness
**What:** 所有恢复动作都从 Server Action 入口失效相关 tag/path，保证 operator 回到页面看到的是 fresh truth。 [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][VERIFIED: src/actions/async-task-operator-actions.ts][VERIFIED: src/actions/classroom-actions.ts]
**When to use:** classroom recovery、async retry、plugin governance recovery、未来 command detail recovery。 [VERIFIED: codebase read]
**Example:**
```typescript
// Source: src/actions/async-task-operator-actions.ts [VERIFIED: codebase read]
const result = await retryAsyncTaskForOperator(parsed.data)
updateTag(cacheTags.asyncTask(result.taskId))
updateTag(cacheTags.asyncTaskEntity(result.entityType, result.entityId))
updateTag(cacheTags.asyncTaskList(result.actorId))
revalidatePath('/settings/labs/async-tasks')
revalidatePath(`/settings/labs/async-tasks/${result.taskId}`)
```

### Anti-Patterns to Avoid
- **把 classroom 页继续膨胀成 operator console：** 与 D-58-03 冲突；课堂壳只保留最小恢复入口和跳转。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
- **客户端拼 correlation：** 会造成 cross-page drift，也违反 DAL + Server Actions only。 [VERIFIED: AGENTS.md]
- **在 summary 卡直接执行 `resume` / `suspend` / `fallback`：** 与 D-58-23 / D-58-24 冲突。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
- **把 degraded posture 简化成 badge 或 reasonCode：** 不满足 trust-boundary honesty。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
- **恢复动作旁路写库：** 违反 `OPS-03` 与 `SAFE-02`。 [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: AGENTS.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Classroom incident correlation | 客户端多请求 + local state stitching | `getClassroomIncidentOperatorDTO()` 风格的单一 DAL read model | cross-object 关联必须来自同一 truth source，避免 support/operator 视图漂移。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] |
| Task retry protocol | 新建“manual rerun”写库脚本 | `retryAsyncTaskForOperator()` + `retryAsyncTaskForOperatorAction()` | 现有实现会 seed new attempt、写 recovery events、并调用 BullMQ `job.retry()`。 [VERIFIED: src/features/async-tasks/server/recovery.ts][VERIFIED: src/actions/async-task-operator-actions.ts] |
| Plugin recovery gating | 前端 if/else 自己猜是否能恢复 | `recommendedRecoveryAction` + `blockedActionDiagnostics` | reason-gated availability 已经落在 governance bundle 里。 [VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx][VERIFIED: src/features/platform-core/actions/registry.ts] |
| Command/event timeline | 自定义日志拼接页 | `getPlatformCommandWithTimeline()` | 现有 seam 已含 `correlationId`、`failureAttribution`、dispatch timeline。 [VERIFIED: src/features/platform-core/observability/operator-read-model.ts][VERIFIED: src/features/platform-core/observability/dto.ts] |
| Cache freshness after recovery | `router.refresh()` alone | `updateTag()` / `revalidatePath()` at Server Action entrypoint | Next.js 16 明确把 read-your-own-writes invalidation 放在 Server Actions。 [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |

**Key insight:** Phase 58 的增量价值不是新技术，而是把现有 runtime / plugin / task / command truths 组织成 classroom-first operator product surface。 [VERIFIED: codebase read][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: 把 incident 首页做成 giant detail page
**What goes wrong:** 首屏直接展示 full timeline、attempt history、raw diagnostics，导致 support 无法先判断课堂是否还可继续。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Why it happens:** 开发者直接复用现有 detail surface 内容，而不是新建 summary layer。 [VERIFIED: codebase read]
**How to avoid:** 首页只放 problem-first incident cards；full timeline 和 raw diagnostics 继续留在 runtime / async / command / plugin detail。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Warning signs:** PR 中出现 4 个对象分区大面板、长表格、或一屏内同时出现 command timeline 与 task attempt groups。 [VERIFIED: codebase read]

### Pitfall 2: degraded honesty 在不同页面口径不一致
**What goes wrong:** classroom 页说“仅保证本实例课堂同步”，async 页只给 backlog 等级，plugin 页只给 reasonCode，operator 认知被切碎。 [VERIFIED: src/components/classroom/classroom-control-panel.tsx][VERIFIED: src/lib/dal/async-task-operator.ts][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx]
**Why it happens:** 每个 surface 自己发明 copy，而不是共享固定三段模板。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**How to avoid:** 所有 degraded cards 统一输出 `仍可信什么 / 已不可信什么 -> 影响范围 -> 推荐下一步`。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Warning signs:** 某个卡片只有 badge、只有 `reasonCode`、或没有 next step link。 [VERIFIED: codebase read]

### Pitfall 3: 在 summary 面误放高风险动作
**What goes wrong:** operator 在 incident 首页一键 `resume` / `fallback`，但看不到影响范围、姿态变化或审计写入。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Why it happens:** 试图复用 `Button` 直接绑 action，而没有 detail confirmation layer。 [VERIFIED: codebase read]
**How to avoid:** summary 面只留 `retry` / `reconcile`；高风险动作在 detail view 强确认。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
**Warning signs:** classroom incident 首屏出现 `resume`、`suspend`、`fallback` 可点主按钮。 [VERIFIED: codebase read]

### Pitfall 4: correlation key 只展示不收口
**What goes wrong:** 页面展示了 `runtimeSessionId` / `correlationId` / `taskId`，但 operator 仍需手工复制到别页。 [VERIFIED: src/components/surfaces/runtime-inspector-surface.tsx][VERIFIED: src/components/surfaces/settings-surface.tsx]
**Why it happens:** 现有 command detail 还停留在 search param 选中态，尚未成为正式下钻节点。 [VERIFIED: src/app/settings/labs/page.tsx][VERIFIED: src/components/surfaces/settings-surface.tsx]
**How to avoid:** 在 incident DTO 中直接输出 href / relation cards，而不是只输出 IDs。 [VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/lib/dal/async-task-operator.ts]
**Warning signs:** 新 DTO 只有 raw IDs，没有 `detailHref` / `inspectorHref` / `nextStepHref`。 [VERIFIED: codebase read]

### Pitfall 5: recovery 后缓存没有全失效
**What goes wrong:** 操作成功但 operator 仍看到旧状态，误以为恢复失败。 [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
**Why it happens:** 只 `router.refresh()`，没有 `updateTag()` / `revalidatePath()`。 [VERIFIED: src/actions/async-task-operator-actions.ts]
**How to avoid:** 每个 mutation action 明确失效 summary/detail 路径和相关 entity tag。 [VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/async-task-operator-actions.ts][VERIFIED: src/actions/plugin-actions.ts]
**Warning signs:** action test 没有断言 `updateTag()`，或 verifier 没有静态检查 invalidation。 [VERIFIED: src/actions/classroom-actions.test.ts][VERIFIED: scripts/verify-phase42-operator-recovery.ts]

## Code Examples

Verified patterns from official sources and repo seams:

### Classroom recovery stays on the classroom action chain
```typescript
// Source: src/actions/classroom-actions.ts [VERIFIED: codebase read]
export async function runCurrentVotingRecoveryAction(input: {
  sessionId: string
  stepId: string
  recoveryAction: 'retry' | 'reconcile' | 'suspend' | 'fallback'
}) {
  const result = await recordRuntimeTeacherControl({
    kind: 'runtime-teacher-control',
    payload: {
      classroomSessionId: input.sessionId,
      stepId: input.stepId,
      command: input.recoveryAction === 'reconcile' ? 'reset-session' : 'broadcast-preset',
      payload: { source: 'classroom-voting-recovery', recoveryAction: input.recoveryAction },
    },
  })

  updateTag(cacheTags.classroom(input.sessionId))
  return { ok: true, data: result }
}
```

### Async operator retry appends a new attempt instead of rewriting task truth
```typescript
// Source: src/features/async-tasks/server/recovery.ts [VERIFIED: codebase read]
await tx.update(asyncTasks).set({
  status: 'retrying',
  latestAttemptNumber: nextAttemptNumber,
  latestRecoveryJson: {
    posture: 'retry_requested',
    previousAttemptNumber,
    seededAttemptNumber: nextAttemptNumber,
  },
})

await tx.insert(asyncTaskEvents).values([
  { eventType: 'task.operator_recovery_requested', attemptNumber: previousAttemptNumber },
  { eventType: 'task.retry_seeded', attemptNumber: nextAttemptNumber },
])

await job.retry()
```

### Next.js read-your-own-writes invalidation belongs in Server Actions
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/updateTag [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
'use server'

import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  await db.post.create({ data: { title: formData.get('title') } })
  updateTag('posts')
}
```

## Implementation Cut Lines

These are planning hints, not a PLAN. [VERIFIED: codebase read][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]

1. **Incident read-model layer:** 新增 `classroom-incident-list` + `classroom-incident-operator` DTO/DAL seam，先把 classroom/session 摘要与 relation hrefs 做出来。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
2. **Route/surface layer:** 新增 `/settings/labs/incidents` 与 `/settings/labs/incidents/[sessionId]`，把 Settings Labs 从工具目录扩展为 incident-first 入口。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
3. **Classroom CTA layer:** 在 `ClassroomControlPanel` 中把 degraded / failed / blocked posture 升级成正式 incident deep link，但保留当前最小恢复按钮。 [VERIFIED: src/components/classroom/classroom-control-panel.tsx][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]
4. **Command detail formalization:** 把当前 `SettingsSurface` 中 search-param 形式的 command detail 提炼成正式 detail surface/route，作为 incident 下钻节点。 [VERIFIED: src/components/surfaces/settings-surface.tsx]
5. **Proof/verifier layer:** 增加 Phase 58 focused tests + `scripts/verify-phase58-operator-recovery-and-surfaces.ts` + support-facing runbook/proof artifact。 [VERIFIED: .planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md][VERIFIED: scripts/verify-phase57-classroom-runtime.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool-first navigation from Settings Labs quick links only [VERIFIED: src/components/surfaces/settings-surface.tsx] | Classroom/session-first incident hub with Settings Labs incident list as fallback index [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] | Locked in Phase 58 context on 2026-05-25 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] | support 先定位课堂，再下钻平台对象。 [VERIFIED: .planning/ROADMAP.md] |
| Degraded hints split across classroom/runtime/async/plugin pages [VERIFIED: codebase read] | Fixed trust-boundary honesty template reused across surfaces [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] | Locked in Phase 58 context on 2026-05-25 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] | 降低 operator 认知分裂。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] |
| Search-param command detail inside `SettingsSurface` [VERIFIED: src/app/settings/labs/page.tsx][VERIFIED: src/components/surfaces/settings-surface.tsx] | Formal drill-down node hanging off classroom incident relation cards [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] | Recommended for Phase 58 planning [VERIFIED: codebase read] | command 不再是孤立工具视角，而是 incident lineage 一部分。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md] |

**Deprecated/outdated:**
- 让 operator 手工复制 `runtimeSessionId` / `taskId` / `commandId` 跨页排查的做法，已不满足 `OPS-01`。 [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: codebase read]
- 用“隐藏不可执行动作”代替 disabled + reason 的做法，已与 D-58-25 冲突。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]

## Assumptions Log

All substantive claims below were verified against code, planning docs, npm registry, or official Next.js docs during this session. No user confirmation is required for the core recommendations in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None | — | — |

## Open Questions (RESOLVED)

1. **(RESOLVED) command detail 应从 `SettingsSurface` 内联状态抽成正式 route。**
   - Resolution: Phase 58 采用 `/settings/labs/commands/[commandId]` 作为稳定下钻节点，让 incident relation cards 直接输出可复用 href，而不是依赖 `?commandId=` 局部状态。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-02-PLAN.md]

2. **(RESOLVED) support/operator 继续复用现有 `admin/developer` scope，不在本 phase 扩角色模型。**
   - Resolution: Phase 58 共享同一 truth source 与 school-scoped operator seam；若未来需要独立 `support` membership role，另开 auth/role phase。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-01-PLAN.md]

3. **(RESOLVED) classroom incident list 首版保持最小过滤器。**
   - Resolution: 首版只保留 `posture`、`classroom`、`updatedAt` 排序/过滤，把第一屏保持为 incident-first 入口，而不是重型工具页。 [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-03-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app routes, Server Actions, verifier scripts | ✓ [VERIFIED: local shell] | `v24.1.0` [VERIFIED: local shell] | — |
| pnpm | running focused tests / repo scripts | ✓ [VERIFIED: local shell] | `10.33.0` [VERIFIED: local shell] | `npm exec` for some commands, but repo scripts are pnpm-oriented. [VERIFIED: package.json] |
| sqlite3 CLI | inspecting SQLite-first truth locally | ✓ [VERIFIED: local shell] | `3.53.1` [VERIFIED: local shell] | Drizzle Studio / tests if direct CLI inspection is unnecessary. [VERIFIED: AGENTS.md] |
| Docker | optional local infra rehearsal | ✓ [VERIFIED: local shell] | `29.5.1` [VERIFIED: local shell] | Skip containerized rehearsal for this phase; not blocking research/planning. [VERIFIED: local shell] |
| Redis CLI / local Redis inspection | deeper worker/transport diagnosis | ✗ command not found in shell output [VERIFIED: local shell] | — | rely on existing degraded posture read models and repo-local tests; do not make Phase 58 execution depend on local Redis CLI. [VERIFIED: src/lib/dal/runtime-inspector.ts][VERIFIED: src/lib/dal/async-task-operator.ts] |

**Missing dependencies with no fallback:**
- None identified for planning or implementation. [VERIFIED: local shell]

**Missing dependencies with fallback:**
- Redis CLI is absent locally; planner should prefer read-model-backed diagnostics and test doubles instead of shelling into Redis. [VERIFIED: local shell][VERIFIED: src/lib/dal/runtime-inspector.ts]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest@4.1.5` in repo (`4.1.7` latest npm) [VERIFIED: package.json][VERIFIED: npm registry] |
| Config file | `vitest.config.mts` [VERIFIED: vitest.config.mts] |
| Quick run command | `pnpm exec vitest --run src/components/classroom/classroom-control-panel.test.tsx src/actions/classroom-actions.test.ts src/components/surfaces/runtime-inspector-surface.test.tsx src/components/surfaces/async-task-operator-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` [VERIFIED: package.json][VERIFIED: existing test files] |
| Full suite command | `pnpm verify:phase58` (to be added in Wave 0, mirroring `verify:phase57`) [VERIFIED: scripts/verify-phase57-classroom-runtime.ts][VERIFIED: package.json] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-01 | classroom/session read model correlates school / classroom / lesson version / plugin / command / task | unit + integration | `pnpm exec vitest --run src/lib/dal/classroom-incident-operator.test.ts src/components/surfaces/classroom-incident-operator-surface.test.tsx` | ❌ Wave 0 |
| OPS-02 | degraded honesty rendered as fixed trust-boundary template on incident surface | component + static source assertion | `pnpm exec vitest --run src/components/surfaces/classroom-incident-operator-surface.test.tsx scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | ❌ Wave 0 |
| OPS-03 | recovery action availability is reason-gated and high-risk actions leave summary surface | action + component | `pnpm exec vitest --run src/actions/operator-classroom-recovery-actions.test.ts src/components/surfaces/classroom-incident-operator-surface.test.tsx` | ❌ Wave 0 |
| PLUG-03 | plugin failures remain recoverable through existing governance actions from incident lineage | regression | `pnpm exec vitest --run src/actions/plugin-actions.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | ✅ |
| SAFE-02 | retry/recovery paths remain audit-safe and replay-safe | regression | `pnpm exec vitest --run src/actions/classroom-actions.test.ts src/features/async-tasks/server/recovery.test.ts src/actions/async-task-operator-actions.test.ts` | ✅ / partial Wave 0 for new incident actions |

### Sampling Rate
- **Per task commit:** quick focused Vitest slice for touched seam. [VERIFIED: existing verifier pattern]
- **Per wave merge:** `pnpm verify:phase58` once added, mirroring phase-specific verifier structure. [VERIFIED: scripts/verify-phase57-classroom-runtime.ts][VERIFIED: scripts/verify-phase52-action-registry-and-lifecycle.ts]
- **Phase gate:** `pnpm verify:phase58` + operator walkthrough proof artifact + support runbook excerpt before `/gsd-verify-work`. [VERIFIED: .planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md]

### Wave 0 Gaps
- [ ] `src/lib/dal/classroom-incident-operator.test.ts` — covers OPS-01 correlation read model.
- [ ] `src/components/surfaces/classroom-incident-operator-surface.test.tsx` — covers summary-first IA, honesty template, and action visibility.
- [ ] `src/app/settings/labs/incidents/page.tsx` + route source assertions — covers incident-list-first entry.
- [ ] `src/app/settings/labs/incidents/[sessionId]/page.tsx` + route source assertions — covers classroom anchored incident detail.
- [ ] `scripts/verify-phase58-operator-recovery-and-surfaces.ts` — static checks + focused suite orchestration, matching phase42/52/57 verifier style. [VERIFIED: scripts/verify-phase42-operator-recovery.ts][VERIFIED: scripts/verify-phase52-action-registry-and-lifecycle.ts][VERIFIED: scripts/verify-phase57-classroom-runtime.ts]
- [ ] `package.json` script entry `verify:phase58` — phase gate entrypoint. [VERIFIED: package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Operator routes and actions already require authenticated user scope via `getCurrentUserDTO()` / membership checks. [VERIFIED: src/lib/dal/runtime-inspector.ts][VERIFIED: src/lib/dal/async-task-operator.ts][VERIFIED: src/actions/plugin-actions.ts] |
| V3 Session Management | no (phase-local) | Inherited from existing Auth.js/session baseline; Phase 58 does not introduce new session mechanics. [VERIFIED: AGENTS.md] |
| V4 Access Control | yes | school-scoped operator access, teacher/admin/developer role checks, and reason-gated action availability. [VERIFIED: src/lib/dal/runtime-inspector.ts][VERIFIED: src/features/async-tasks/server/operator-access.ts][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |
| V5 Input Validation | yes | Zod DTO/input schemas on classroom/runtime/async/operator actions. [VERIFIED: src/lib/dto/classroom.ts][VERIFIED: src/lib/dto/runtime-inspector.ts][VERIFIED: src/lib/dto/async-task-operator.ts] |
| V6 Cryptography | no | No new cryptographic primitive is required; do not hand-roll tokens or signatures for recovery flows. [VERIFIED: codebase read] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-school incident leakage | Information Disclosure | keep incident read model school-scoped exactly like runtime inspector / async operator / command read models. [VERIFIED: src/lib/dal/runtime-inspector.ts][VERIFIED: src/lib/dal/async-task-operator.ts][VERIFIED: src/features/platform-core/observability/operator-read-model.ts] |
| Unauthorized recovery action from client UI | Elevation of Privilege | all recovery mutations stay behind Server Actions + DAL/command bus authz; never expose direct DB writes. [VERIFIED: AGENTS.md][VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/actions/plugin-actions.ts] |
| Stale summary after mutation causing wrong operator decision | Tampering | `updateTag()` / `revalidatePath()` at mutation boundary. [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][VERIFIED: src/actions/async-task-operator-actions.ts] |
| Replay-unsafe task recovery overwriting durable truth | Tampering | append new attempt/event rows instead of mutating history in place. [VERIFIED: src/features/async-tasks/server/recovery.ts] |
| Hidden inapplicable actions leading to trial-and-error recovery | Repudiation / Misuse | disabled + reason visibility for inapplicable actions; audit trail for executed actions. [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md` - locked IA, honesty, and recovery-boundary decisions.
- `.planning/REQUIREMENTS.md` - `OPS-01`, `OPS-02`, `OPS-03`, `PLUG-03`, `SAFE-02` requirement truth.
- `.planning/ROADMAP.md` - Phase 58 goal and success criteria.
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md` - official failure taxonomy and operator recovery ownership.
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md` - required Phase 58 proof artifacts and gates.
- `src/components/classroom/classroom-control-panel.tsx` / `src/actions/classroom-actions.ts` / `src/lib/dal/classroom.ts` - classroom incident anchor, degraded CTA, runtime proof link, and current voting recovery seam.
- `src/lib/dal/runtime-inspector.ts` / `src/lib/dto/runtime-inspector.ts` / `src/components/surfaces/runtime-inspector-surface.tsx` - runtime health/timeline/degraded baseline.
- `src/lib/dal/async-task-operator.ts` / `src/lib/dto/async-task-operator.ts` / `src/features/async-tasks/server/recovery.ts` - async backlog honesty and retry-safe recovery baseline.
- `src/features/platform-core/observability/operator-read-model.ts` / `src/features/platform-core/observability/dto.ts` - platform command correlation and timeline baseline.
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` / `src/actions/plugin-actions.ts` - reason-gated action catalog and risk-tiered confirmation baseline.
- `https://nextjs.org/docs/app/getting-started/caching` - Next.js 16 Cache Components and explicit caching guidance.
- `https://nextjs.org/docs/app/api-reference/functions/updateTag` - Server Action invalidation semantics.
- npm registry (`npm view`) - current package versions and publish dates for `next`, `react`, `zod`, `bullmq`, `vitest`, `playwright`.

### Secondary (MEDIUM confidence)
- `scripts/verify-phase42-operator-recovery.ts` - verifier structure for operator-focused phases.
- `scripts/verify-phase52-action-registry-and-lifecycle.ts` - static-check pattern for reason-aware recovery UI.
- `scripts/verify-phase57-classroom-runtime.ts` - phase-scoped verifier + proof orchestration pattern.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all stack decisions are already locked by AGENTS/project baseline and verified against repo + npm registry. [VERIFIED: AGENTS.md][VERIFIED: package.json][VERIFIED: npm registry]
- Architecture: MEDIUM - the recommended seam split is strongly supported by existing code and Phase 58 context, but exact route/detail extraction still has planner discretion. [VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md][VERIFIED: codebase read]
- Pitfalls: HIGH - each pitfall is directly evidenced by current repo seams or locked phase decisions. [VERIFIED: codebase read][VERIFIED: .planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md]

**Research date:** 2026-05-25
**Valid until:** 2026-06-24
