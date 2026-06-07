# Phase 66: Wire AI LessonAgent Draft Loop End-to-End - Research

**Researched:** 2026-06-01
**Domain:** Integration / wiring phase — connecting existing Phase 61–65 seams into a production-reachable draft loop (trigger → run → persist → review → accept → publish) + fixing the `version:0` event payload bug
**Confidence:** HIGH (all claims verified against this-session reads of the actual source files)

## Summary

这是一个**接线 + 修复** phase，不是绿地开发。Phase 61–65 已分别交付编排入口、typed tool 层、draft 写入、审校 UI、eval/guardrails，但端到端起草闭环在生产路径上从未连通。本 phase 的全部产物是把已存在的组件接起来，并修一个被显式标注的 bug —— **不新增任何依赖、不改 Phase 61–64 的契约形状**。

四条接线已逐一在源码层验证可行：(1) `draftLessonStep` 当前只派 `lesson.draft.run`、零生产调用方，需在成功分支追加 `lesson.draft.persist` 派发；(2) 需新增教师起草 server action + 编辑器按钮，并在授权边界强制 `lesson_agent_enabled` flag；(3) `applyDraftLessonVersionAction` / `discardDraftLessonVersionAction` 当前直连 DAL（`src/actions/lesson-authoring-actions.ts:441,456`），需**替换**为 `dispatchPlatformCommand`；(4) `version:0` bug 根因已定位 —— DAL 读了含 `version` 列的 draft 行却没把它放进结果 DTO，handler 因此硬编码 `version: 0`（`handlers/lesson-draft.ts:289,327`，源码里有显式 TODO 注释）。

**关键发现（计划必读）：** accept handler 的 `resultSummary` 当前丢弃了 `courseId`（`handlers/lesson-draft.ts:270-273`），但 accept action 的缓存失效 `invalidateLessonAuthoringTags(actorId, courseId, lessonId)` 需要 courseId（`lesson-authoring-actions.ts:442`）。D-04 改派命令后，action 不再能从 DAL 直接拿 `result.courseId`，**因此 accept handler 的 resultSummary 必须补回 `courseId`（连同 `version`）**，否则 course 维度缓存失效会断。这是本 phase 最容易被遗漏的隐藏依赖。

**Primary recommendation:** 新建 `producers/lesson-draft.ts`（镜像 `producers/plugin-governance.ts` 的 typed-envelope-builder 模式），让 server action 经它派发 accept/discard/persist；version 修复走「DAL DTO 补 `version: draft.version` → handler 用 `result.version`」最小路径；E2E 启用走「测试直写 DB row enabled=true」，**不翻 seed**、不改生产门禁。

## User Constraints (from CONTEXT.md)

### Locked Decisions

**run→persist 桥接（DRAFT-01）**
- **D-01:** 编排入口顺序派发两条命令：`dispatchPlatformCommand(lesson.draft.run)` 成功、从 `resultSummary.step` 拿到整包步骤后，**再** `dispatchPlatformCommand(lesson.draft.persist)`。两条命令各自留痕、各自 dedupe（run optional / persist required），因果通过共享 `correlationId` / `causationId` 串联。
- **D-01a:** handler 保持纯执行 —— **不**在 `lesson.draft.run` handler 内部嵌套 dispatch persist。延续「唯一派发路径在编排入口」「handler 不互相调用」。
- **D-01b:** persist payload 步骤包来自 run 的 `resultSummary.step`；`lessonId`/`stepType`/`schoolId` 透传自原 `DraftLessonStepInput`；`teacherId` 绝不进 payload（handler 授权注入）。

**教师起草触发入口（AGENT-03）**
- **D-02:** 触发面嵌入现有 `/teacher/editor` 工作区（`lesson-authoring-workspace.tsx`），工具栏加按钮，输入 `stepType`（content/task/quiz）+ `intent` 文本，调用新 server action → `draftLessonStep`。与 Phase 64 `?mode=review` 同屏闭环。
- **D-02a:** server action 成功后触发草稿落库；UI 复用 Phase 64 草稿发现提示栏 / 模式切换 badge 引导审校。本 phase 不重做审校 UI。
- **D-02b:** 新按钮/输入对齐 `DESIGN.md`（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA）与 Stitch `5322129002350954765`，复用 `Button` 三变体与 `teacher-surface-rhythm.ts`。

**feature flag 强制（AGENT-03 安全约束）**
- **D-03:** 新 server action 在调用 `draftLessonStep` 前，经 `getAgentRegistryDTO()` 读取 LessonAgent 的 `enabled` + `featureFlag`，未启用则返回 disabled 型 `ActionResult` 错误、**不派发任何命令**。
- **D-03a:** flag 检查放在 server action / DAL 授权层，**不**下沉污染 command handler。前端可额外按 flag 隐藏入口，但后端校验是真相源。
- **D-03b:** registry seed 中 LessonAgent `enabled: false`。为让端到端闭环可验证，planner 决定启用方式（DAL 写开关 / 测试态注入），**不**在 seed 默认翻 `true`。

**accept/discard 改走 Command Bus**
- **D-04:** `applyDraftLessonVersionAction` 改派 `lesson.draft.accept`、`discardDraftLessonVersionAction` 改派 `lesson.draft.discard`。两命令 handler 成为唯一写入路径，彻底消除「action 直连 DAL」第二真相源。
- **D-04a:** 失效 tag 由 handler `invalidation.tags` 声明；action 层若仍需 `revalidateTag`/`updateTag`（如 `invalidateLessonAuthoringTags` 涉及 courseId 维度），对齐既有 publish/apply action 失效习惯，避免重复或遗漏。
- **D-04b:** action 仍走 `assertActiveTeacher` + Zod 校验后把 payload 装进命令 envelope；handler 内 `authorizeLessonDraftCommand` 复用既有授权。

**version:0 事件 payload 修复**
- **D-05:** DAL 结果 DTO 补 `version` 字段，handler 在 `lesson.draft.accepted` / `lesson.draft.discarded` payload 用 `result.version` 替换硬编码 `0`。
- **D-05a:** 修复后核对 `lesson.draft.persisted`（已正确带 version）与 accepted/discarded 的 version 语义一致；事件保持 summary-only（不含 `*Json` 快照）。

**REQUIREMENTS 可追溯性校正**
- **D-06:** 按 `v3.2-MILESTONE-AUDIT.md` 结论（requirements 10/18、flows 0/1 端到端可达），更新 `REQUIREMENTS.md` 中 DRAFT-01 / AGENT-03 等被错误标记为已满足的条目。

### Claude's Discretion (Planner decides)
- run→persist 顺序派发的封装位置（`draftLessonStep` 内追加第二 dispatch vs 上层 server action 编排两步）—— 依「编排入口唯一派发」与可测试性。
- 起草 server action 命名与文件落点（`lesson-authoring-actions.ts` vs 新建 `lesson-agent-actions.ts`）。
- `getAgentRegistryDTO()` 是否新增按 `agentKey` 单查便捷方法 vs 复用全量读后 filter。
- intent 输入 UI 形态（inline 输入框 / popover / 侧面板）与 stepType 选择控件。
- version 补入 DAL DTO 的 schema 调整范围（仅 apply/discard 结果 vs 顺带统一 draft 结果 DTO）。
- 端到端验证用例的测试落点（单测 / 集成 / E2E）—— 依 `TESTING.md`。

### Deferred Ideas (OUT OF SCOPE)
- 多 Agent（Homework/Data/Tutor/Parent）各自起草触发与 draft 实体。
- RAG 增强起草上下文（intent → 检索教材/资源）。
- plugin 触达 AI（本 phase 是内置系统 agent 路径，非 plugin）。
- 起草历史 / 多 draft 版本对比。
- 起草触发的速率限制 / 配额（rate limit、token 预算）。
- 审校 UI 移动端适配。
- 新的发布真相源（复用 `publishLesson()`）。

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-01 | AI run→persist 落库（草稿真正进 `draftLessonVersions`） | D-01 桥接点验证：`draftLessonStep` (`lesson-agent.ts:178`) 仅派 run；persist handler + `persistDraftLessonVersion` DAL (`lesson-authoring.ts:1781`) 已就绪。需 run 单 step → persist `steps:[step]` 封装（见 Pitfall 1）。 |
| AGENT-03 | 教师可触发起草 | D-02/D-03：编辑器按钮 + 新 server action + `getAgentRegistryDTO()` flag 强制。`draftLessonStep` 当前零生产调用方（仅 `lesson-agent.test.ts`）。 |
| DRAFT-02 | persist 幂等 | persist 命令 `dedupe:required`；`persistDraftLessonVersion` 走 `(lessonId, sourceCommandId)` 唯一约束，DAL 不静默 try/catch（`lesson-authoring.ts:1774-1779`）。 |
| DRAFT-03 / REVIEW-01 / REVIEW-03 | accept/discard 经命令、事件 version 正确 | D-04 改派命令 + D-05 version 修复。审计判这些为 Pending / 未生产可达。 |

> **D-06 校正：** `REQUIREMENTS.md` 中 AGENT-03 / DRAFT-01 / DRAFT-02 被标 `[x]`/Complete，但 `v3.2-MILESTONE-AUDIT.md` 判定端到端在生产路径不可达（flows 0/1）。本 phase 闭环后才应标记满足。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 起草触发面（按钮 + intent 输入） | Frontend (Client Component) | — | 仅 UI 交互 + 调 server action；绝不 import DAL（AGENTS.md Data Access 约束）。 |
| 起草编排（run→persist 顺序派发） | Server Action / 编排入口 | Command Bus | D-01：唯一派发路径在编排入口，非 handler 内嵌套。 |
| flag 强制（`lesson_agent_enabled`） | Server Action / DAL 授权边界 | — | D-03a：真相源在后端，不下沉 handler。 |
| accept/discard 写入 | Command Bus → Handler → DAL | — | D-04：handler 是唯一写入路径，消除 action 直连 DAL。 |
| draft 落库 / live lesson 更新 | DAL（事务） | DB (SQLite) | `applyDraftToLiveLesson` / `persistDraftLessonVersion` 已存在，复用。 |
| 缓存失效 | Server Action（`updateTag`）+ Handler（声明 tags） | — | D-04a：两层协作，action 用 resultSummary 数据补 course 维度。 |
| 事件留痕（summary-only） | Handler → Event Ledger | — | D-05a：payload 仅摘要，version 必须为正整数。 |

**Tier 风险点：** 起草触发组件若是 `"use client"`，**绝不能** import `draftLessonStep`（它是 `server-only`）；必须经 server action 边界。`schoolId` 由 server action 经 scoped DAL 读 lesson 解析，**不信任客户端传入**（客户端只传 `lessonId` + `stepType` + `intent`）。

## Project Constraints (from AGENTS.md)

| 约束 | 本 phase 适用点 |
|------|----------------|
| **Data Access: UI 禁直连 DB** | 起草触发组件只走 server action → DAL；新组件不 import 任何 `@/lib/dal/*` 或 db client。 |
| **Caching: 写后显式失效 tag** | accept/discard/persist 后 `updateTag`/`invalidateLessonAuthoringTags`；D-04a 避免重复或遗漏。 |
| **Security: provider key 仅 Node server** | `aiGenerateObject` 在 `@/server/ai/providers`（`server-only`）；起草链全在 Node runtime，绝不进 Edge / plugin manifest。 |
| **Runtime: DB/Auth 在 Node** | 所有 DAL / command handler 在 Node runtime；Edge 仅 SSE（与本 phase 无关）。 |
| **summary-only 事件** | accepted/discarded/persisted payload 不含 `*Json` 快照。 |
| **DAL-only + Zod 边界** | 新 action 入参经 Zod、调用前 `assertActiveTeacher`。 |
| **Plugin 安全** | 本 phase 是**内置系统 agent**路径（`LESSON_AGENT_PLUGIN_ID="core.lesson-agent"` sentinel），非 plugin 触达 AI（deferred）。 |

## Standard Stack

**无新依赖。** 本 phase 全部复用既有运行时与库。下列为接线所触及的既有模块（非新增）：

| 模块 | 位置 | 用途 | 复用方式 |
|------|------|------|---------|
| `dispatchPlatformCommand` | `src/features/platform-core/commands/bus.ts:241` | 命令派发 | 签名 `(commandInput, dependencies)`；D-01/D-04 调用入口。 |
| `PlatformCommandStore` + `defaultInProcessPlatformEventAdapter` | `bus.ts` / `events/adapters/in-process.ts` | 命令存储 + 事件适配 | 经 producer 注入 dependencies。 |
| `getAgentRegistryDTO()` | `src/lib/dal/ai-rag.ts:33` | 读 agent registry（含 `enabled`+`featureFlag`） | D-03 flag 强制。 |
| `draftLessonStep` | `src/server/ai/agents/lesson-agent.ts:178` | 起草编排入口 | D-01 追加 persist 派发；D-02 新 action 调用方。 |
| `applyDraftToLiveLesson` / `discardDraftLessonVersion` / `persistDraftLessonVersion` | `src/lib/dal/lesson-authoring.ts:1620/1738/1781` | draft DAL | D-05 补 `version`；D-04 经 handler 调用。 |
| `aiGenerateObject` | `src/server/ai/providers` | LLM 结构化输出 | 测试 `vi.mock` → 确定性，无网络/provider key。 |
| `Button` 三变体 + `teacher-surface-rhythm.ts` | `src/components/ui` / authoring | UI | D-02 触发面对齐设计系统。 |

### Canonical Producer Pattern（强烈推荐）

`src/features/platform-core/commands/producers/plugin-governance.ts` 是项目里**唯一两个生产派发站点之一**（另一个是 `lesson-agent.ts`），它封装了：typed envelope builder + 共享 `PlatformCommandStore` + `defaultInProcessPlatformEventAdapter` + correlation/dedupe-hash。

**Installation:** 无 —— `npm install` 零变更。

**Version verification:** 不适用（无新包）。所有版本沿用 `AGENTS.md` §Technology Stack 已锁定的栈（Next.js 16.2.x / React 19.2.x / Drizzle 0.45.x / Zod 4.4.x）。

## Architecture Patterns

### System Architecture Diagram

```
[教师编辑器 /teacher/editor]  (Client Component, "use client")
   │  点击「AI 起草」→ 输入 stepType + intent
   │  (仅传 lessonId / stepType / intent —— 不传 schoolId/teacherId)
   ▼
[新 server action: draftLessonStepAction]  (Node, server-only)
   │  1. assertActiveTeacher() ──► 授权
   │  2. Zod 校验入参
   │  3. getAgentRegistryDTO() ──► filter LessonAgent.enabled?  ──否──► return AGENT_DISABLED (不派命令)
   │  4. scoped DAL 读 lesson ──► 解析可信 schoolId/courseId
   ▼ 是
[draftLessonStep 编排入口]  (lesson-agent.ts)
   │  ┌─ dispatchPlatformCommand(lesson.draft.run)   dedupe:optional
   │  │     └─► run handler ──► createDraftLessonStepTool ──► aiGenerateObject(provider, Node-only)
   │  │     └─► resultSummary.step  (单个 LessonStepPayload)
   │  │
   │  └─ dispatchPlatformCommand(lesson.draft.persist)   dedupe:required
   │        correlationId 共享 / causationId = run.id
   │        payload = { lessonId, steps: [step] }   ◄── 单 step 必须包成数组（min 1）
   │        └─► persist handler ──► persistDraftLessonVersion DAL
   │              └─► INSERT draftLessonVersions (version = max+1)
   │              └─► emit lesson.draft.persisted { draftVersionId, version, stepCount }
   ▼
[草稿落库] ──► Phase 64 草稿发现提示栏点亮 ──► 教师切 ?mode=review
   ▼
[审校面 LessonDraftReviewWorkspace]  (Phase 64, 复用)
   │  接受 / 丢弃
   ▼
[applyDraftLessonVersionAction / discardDraftLessonVersionAction]  (D-04 改派)
   │  assertActiveTeacher + Zod → dispatchPlatformCommand(lesson.draft.accept / .discard)
   │     dedupe:required, dedupeKey = e.g. "lesson.draft.accept:${draftVersionId}"
   │     └─► accept/discard handler ──► applyDraftToLiveLesson / discardDraftLessonVersion DAL
   │           └─► emit lesson.draft.accepted/discarded { draftVersionId, version(真实), ... }
   │     ◄── resultSummary { draftVersionId, version, courseId(accept需补) }
   │  action 用 resultSummary 数据 invalidateLessonAuthoringTags(actorId, courseId, lessonId)
   ▼
[publishLesson() DAL]  (复用，不建新真相源)
```

### Pattern 1: Sequential Two-Command Orchestration（D-01）
**What:** 编排入口先 `await dispatch(run)`，从 `resultSummary.step` 取结果，**再** `await dispatch(persist)`，两命令共享 `correlationId`、persist 的 `causationId` 指向 run.id。
**When to use:** 两个写命令有因果先后、各自需独立留痕 + dedupe。
**Why not handler-internal chaining:** D-01a —— handler 内嵌套 dispatch 会让 required-dedupe 语义难管理、破坏「handler 不互调」约束。
```typescript
// Source: 推断自 lesson-agent.ts:178-217 现有 run 派发 + plugin-governance.ts producer 模式
const runResult = await dispatchPlatformCommand(runEnvelope, deps);
const step = (runResult.resultSummary as { step: LessonStepPayload }).step;
const persistEnvelope = buildLessonDraftCommand({
  type: "lesson.draft.persist",
  payload: { lessonId, steps: [step] },          // ◄ 单 step 包成数组
  correlation: { correlationId: runEnvelope.correlationId, causationId: runEnvelope.id },
});
await dispatchPlatformCommand(persistEnvelope, deps);
```

### Pattern 2: Action → Command Bus Rewire（D-04）
**What:** server action 从直连 DAL 改为派命令；handler 成唯一写入路径。
**关键:** 必须**替换**直连 DAL 调用，不是并存（否则双写 = 双事件）。
```typescript
// 现状 (lesson-authoring-actions.ts:441) —— 直连 DAL，待替换：
const result = await applyDraftToLiveLesson(parsed.data);
invalidateLessonAuthoringTags(actor.userId, result.courseId, result.lessonId);

// 目标 —— 改派命令，从 resultSummary 取 courseId 做失效：
const dispatchResult = await dispatchLessonDraftCommand({
  type: "lesson.draft.accept",
  payload: { lessonId, draftVersionId, editedSteps },
});
const { courseId } = dispatchResult.resultSummary;   // ◄ handler 必须补 courseId 进 resultSummary
invalidateLessonAuthoringTags(actor.userId, courseId, lessonId);
```

### Pattern 3: Flag Enforcement at Authorize Boundary（D-03）
```typescript
const registry = await getAgentRegistryDTO();        // ai-rag.ts:33, 含 assertActiveTeacher + auto-seed
const lessonAgent = registry.find((a) => a.agentKey === "LessonAgent");
if (!lessonAgent?.enabled) {
  return { ok: false, error: "AGENT_DISABLED", message: "AI 起草功能未启用。" };  // 不派任何命令
}
```

### Anti-Patterns to Avoid
- **handler 内嵌套 dispatch persist:** 违反 D-01a；run handler 必须保持纯执行。
- **action 直连 DAL 与派命令并存:** 双写路径 = 双事件，违反 D-04 单真相源；必须替换。
- **flag 检查下沉 handler:** 违反 D-03a；handler 保持纯执行 + 既有 authorize。
- **客户端传 schoolId/teacherId:** 信任边界破坏；server 端经 scoped DAL 解析。
- **persist payload 传单 step 对象:** schema 要求 `steps: []`（min 1），传对象会 Zod 失败。

## Don't Hand-Roll

| 问题 | 别自建 | 用既有 | 原因 |
|------|--------|--------|------|
| 命令 envelope 构造 + 派发 | 手写 store/adapter/correlation | 镜像 `producers/plugin-governance.ts` | dedupe-hash、correlation、store 注入已封装；lesson-agent.ts 已重复一份 store，不要再抄第三份。 |
| draft 落库 | 新写 insert 逻辑 | `persistDraftLessonVersion` (`lesson-authoring.ts:1781`) | version max+1、唯一约束、source="ai" 已实现。 |
| live lesson 更新 | 新事务 | `applyDraftToLiveLesson` (`:1620`) | 归档旧 step + LexoRank 插入 + revision++ 已在单事务内。 |
| flag 读取 | 直查 DB | `getAgentRegistryDTO()` (`ai-rag.ts:33`) | 含授权 + auto-seed + DTO 清洗。 |
| 发布 | 新发布路径 | `publishLesson()` | D-04/CONTEXT 明确复用，不建第二真相源。 |
| 审校引导 UI | 新提示组件 | Phase 64 草稿发现提示栏 / `?mode=review` badge | 落库后自动点亮。 |

**Key insight:** 本 phase 的价值在于**接线而非新建**。任何「新写一个 X」的冲动几乎都对应一个已交付的 Phase 61–64 组件。唯一允许新建的是：(a) 起草 server action，(b) `producers/lesson-draft.ts`，(c) 编辑器触发 UI，(d) DTO 加 `version` 字段。

## Runtime State Inventory

> 本 phase 含一处「契约修复」（version:0），需检查是否有运行时遗留状态。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **既存 `draftLessonVersions` 行的 `version` 列本身是正确的**（`persistDraftLessonVersion` 一直写 max+1）。bug 仅在 accept/discard **事件 payload** 硬编码 0，不污染表数据。 | 无数据迁移 —— 纯代码修复。 |
| Live service config | 无外部服务配置含被改字符串。 | None — 验证：本 phase 无 OS/外服注册。 |
| OS-registered state | 无。 | None。 |
| Secrets/env vars | provider key（`@/server/ai/providers` 读）—— 名称/值不变，本 phase 不碰。 | None。 |
| Build artifacts | 无包重命名 / egg-info 类产物。 | None。 |
| **历史事件 ledger** | 若生产环境已有历史 `lesson.draft.accepted`/`discarded` 事件携带 `version:0`，它们已落账且不可变。 | **不回填**（事件不可变）；修复仅对修复后新事件生效。planner 在 VALIDATION 注明此边界。 |

**Ledger 校验风险（重要）:** `appendPlatformEvents` 很可能**不**在写入时做 Zod 校验（历史 version:0 才能落库），但 `events/contracts.ts:256,276` 的 schema 要求 `version: z.number().int().positive()`。一旦 D-04 把 accept/discard 路由经总线，下游任何对事件做 schema 解析的消费者会因 version:0 失败 —— 这正是 bug「成为 live」的触发点。修复后必须验证新事件 version ≥ 1。

## Common Pitfalls

### Pitfall 1: persist payload 形状不匹配（单 step vs steps 数组）
**What goes wrong:** run 的 `resultSummary.step` 是**单个** `LessonStepPayload`；但 `LessonDraftPersistPayloadSchema` = `{ lessonId, steps: LessonStepPayload[] }`（min 1）。直接透传单 step 会 Zod 校验失败。
**Why it happens:** run 与 persist 命令是 Phase 62/63 分别设计的，形状未对齐。
**How to avoid:** D-01 桥接处包成 `steps: [step]`。
**Warning signs:** persist 命令派发即报 `ZodError` / `invalid_type` on `steps`。

### Pitfall 2: accept handler resultSummary 丢失 courseId
**What goes wrong:** accept handler `resultSummary` 当前只有 `{ draftVersionId, appliedStepCount }`（`handlers/lesson-draft.ts:270-273`），丢了 `courseId`。但 accept action 缓存失效需 `invalidateLessonAuthoringTags(actorId, courseId, lessonId)`（`lesson-authoring-actions.ts:442`）。D-04 改派后 action 拿不到 courseId → course 维度缓存失效断裂（教师课程列表显示陈旧）。
**Why it happens:** 原 action 直连 DAL 能拿 `result.courseId`（DAL 返回 `ApplyDraftResultDTO` 含 courseId, `dto:464`）；改派命令后只能从 resultSummary 取。
**How to avoid:** accept handler resultSummary 补 `courseId: result.courseId`（连同 `version`）。discard action 只需 lesson/draft tag（不涉 courseId），无此问题。
**Warning signs:** 接受草稿后教师课程列表/课程页缓存不刷新。

### Pitfall 3: version:0 修复不完整（只改一处）
**What goes wrong:** version 修复涉及**三层**：(1) DAL 返回 `version`，(2) DTO schema 加字段，(3) handler 用 `result.version`。漏任一层，要么类型错，要么仍是 0。
**Source 验证:** `applyDraftToLiveLesson` 在 `:1629` 已 `findFirst` draft 行（含 `draft.version` 列）；返回 DTO（`:1721`）未带 version。`discardDraftLessonVersion` 同理（`:1746` 加载 / `:1764` 返回）。两处都**有 version 在作用域内**，补字段即可，无需额外查询。
**How to avoid:** 三层同改 + 测试断言 accepted/discarded 事件 `version === draft.version`。

### Pitfall 4: 双写路径（D-04 替换不彻底）
**What goes wrong:** 若保留直连 DAL 调用 + 新增派命令，accept 会执行两次 / 发两个事件。
**How to avoid:** D-04 是**替换**不是叠加；删除 `await applyDraftToLiveLesson(...)` 直连调用。accept/discard 命令 `dedupe:required` + DAL `DRAFT_NOT_PENDING` guard（`:1635,1752`）保证幂等 —— **前提是单一事件路径**。
**Warning signs:** 一次接受产生两条 `lesson.draft.accepted` 事件 / `DRAFT_NOT_PENDING` 异常。

### Pitfall 5: 起草触发组件越界 import DAL
**What goes wrong:** Client Component 直接 import `draftLessonStep` 或 DAL → `server-only` 报错 / 泄露 provider key 到 bundle。
**How to avoid:** 触发组件只调 server action；server action 在 Node 边界 import `draftLessonStep`。

## Code Examples

### version 修复（DAL 层，D-05）
```typescript
// Source: src/lib/dal/lesson-authoring.ts:1721 (applyDraftToLiveLesson 返回)
// draft 行已在 :1629 加载，draft.version 在作用域内可用
return ApplyDraftResultDTOSchema.parse({
  lessonId: lesson.id,
  courseId: course.id,
  draftVersionId: input.draftVersionId,
  appliedStepCount: draftStepsPayload.length,
  version: draft.version,            // ◄ 新增
});

// Source: src/lib/dto/lesson-authoring.ts:462 (schema 加字段)
export const ApplyDraftResultDTOSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  draftVersionId: z.string(),
  appliedStepCount: z.number().int().nonnegative(),
  version: z.number().int().positive(),   // ◄ 新增, 与 event 契约一致
});
```

### version 修复（handler 层，D-05）
```typescript
// Source: src/features/platform-core/commands/handlers/lesson-draft.ts:269-294 (accept)
return successResult({
  resultSummary: {
    draftVersionId: result.draftVersionId,
    appliedStepCount: result.appliedStepCount,
    courseId: result.courseId,        // ◄ 新增 (Pitfall 2: action 缓存失效需要)
    version: result.version,          // ◄ 新增
  },
  invalidation: { tags: [/* draftLesson, lesson, steps 已有 */] },
  emittedEvents: [
    withAudit({
      eventType: "lesson.draft.accepted",
      // ...
      payload: {
        draftVersionId: result.draftVersionId,
        version: result.version,      // ◄ 替换硬编码 version: 0
        appliedStepCount: result.appliedStepCount,
        source: "ai",
      },
    }, command.audit),
  ],
});
```

### Provider mock（测试，确定性）
```typescript
// Source: 既有 lesson-draft.test.ts / lesson-agent.test.ts 模式
vi.mock("@/server/ai/providers");   // aiGenerateObject 返回确定性结构，无网络 / 无 provider key
// in-memory store DI: dispatchPlatformCommand(envelope, { store, persistPlatformEvents })
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| accept/discard action 直连 DAL | 经 Command Bus 派命令 | 本 phase D-04 | 单写入真相源，事件留痕一致。 |
| 事件 version 硬编码 0 | DAL 透传真实 version | 本 phase D-05 | 事件契约（positive int）满足，下游消费者不再断。 |
| `draftLessonStep` 仅 run、无生产调用方 | run→persist 桥接 + 编辑器触发 | 本 phase D-01/D-02 | 端到端闭环首次生产可达。 |

**Deprecated/outdated:**
- `handlers/lesson-draft.ts:289,327` 的 `version: 0` 硬编码（含 TODO 注释「version is not available from the DAL result」）—— 本 phase 移除。

## Validation Architecture

> `nyquist_validation: true`（config.json 已确认），本节为 VALIDATION.md 门禁来源。

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest（co-located `*.test.ts`） |
| Config file | `vitest.config.mts`（仓库根） |
| Quick run command | `npx vitest run <file>` |
| Full suite command | `pnpm test run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-01 | run→persist 桥接：成功 run 后草稿入 `draftLessonVersions` | integration | `npx vitest run src/server/ai/agents/lesson-agent.test.ts` | ✅ 扩展现有（当前仅断言 run；加 persist 断言） |
| AGENT-03 | 起草 server action：flag 启用→落库；flag 禁用→AGENT_DISABLED 不派命令 | integration | `npx vitest run <new lesson-agent-actions.test.ts>` | ❌ Wave 0 |
| DRAFT-02 | persist 幂等（同 sourceCommandId 重派不双写） | integration | `npx vitest run src/.../lesson-draft.persist.test.ts` | ✅ 扩展现有 |
| DRAFT-03/REVIEW-01 | accept/discard 经命令、单事件路径 | integration | `npx vitest run src/actions/lesson-authoring-actions.test.ts` | ✅ 扩展（改派后断言派命令而非直连 DAL） |
| REVIEW-03 (version 修复) | accepted/discarded 事件 `version === draft.version`（≥1） | unit/integration | `npx vitest run src/.../lesson-draft.events.test.ts` | ✅ 扩展（加 version 正确性断言） |
| 端到端闭环 | 启用 flag→触发→run+persist→审校→accept 经命令→publish | integration | planner 定落点（建议扩 `lesson-agent.test.ts` 或新 e2e-loop spec） | ❌ Wave 0（核心交付断言） |

### Sampling Rate
- **Per task commit:** `npx vitest run <改动文件对应 spec>`
- **Per wave merge:** `pnpm test run`（全量）
- **Phase gate:** 全量 green + `pnpm verify:phase` 通过后才进 `/gsd-verify-work`。

### Wave 0 Gaps
- [ ] `src/actions/lesson-agent-actions.test.ts`（或归入既有 actions test）—— 覆盖 AGENT-03 flag 强制 + 起草 action 编排两命令。
- [ ] 端到端闭环 integration 用例 —— 覆盖 flows 0/1（审计核心缺口）；含「flag 启用态注入」fixture（直写 `agentRegistry` row enabled=true，见 Open Q1）。
- [ ] 扩展 `lesson-agent.test.ts`：断言 run 成功后**确实派发** persist（当前缺）。
- [ ] 扩展 `lesson-draft.events.test.ts`：断言 accepted/discarded version 为真实正整数（当前不覆盖 version 值）。
- 框架安装：无需 —— Vitest 既有。

## Security Domain

> `security_enforcement` 未显式 false → 默认启用。本 phase 触及 AI provider 调用 + 教师授权边界。

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `assertActiveTeacher`（既有 DAL 授权断言）；所有新/改 action 入口调用。 |
| V4 Access Control | yes | scoped DAL（`getScopedLesson`）解析 schoolId/courseId，**不信任客户端**；`authorizeLessonDraftCommand` handler 复用。flag `lesson_agent_enabled` 是功能门，非授权门 —— 两者都查。 |
| V5 Input Validation | yes | Zod `.strict()` 命令 payload schema（`contracts.ts`）+ action 入参 Zod；intent 文本作为 LLM 输入需基本长度/类型约束。 |
| V6 Cryptography | no | 本 phase 不碰密钥派生 / 加密；provider key 仅服务端读取，不进 bundle/Edge/plugin。 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 客户端伪造 schoolId/teacherId 越权起草 | Spoofing / Elevation | server 端经 scoped DAL 解析可信 schoolId；teacherId 由 handler 授权注入，绝不进 payload（D-01b）。 |
| provider key 泄露到客户端 bundle | Information Disclosure | `server-only` 模块边界 + 触发组件不 import providers/DAL。 |
| 绕过 flag 直接派命令 | Elevation | flag 检查在 server action 授权边界（D-03a），后端真相源，前端隐藏仅兜底。 |
| 重复提交导致双写 | Tampering | accept/discard `dedupe:required` + DAL `DRAFT_NOT_PENDING` guard + 单事件路径（D-04）。 |
| intent prompt injection | Tampering | 本 phase 起草输出经 typed tool（Phase 62 discriminated-union schema）约束；深度 guardrails 属 Phase 65（已交付，不重做）。 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `appendPlatformEvents` 写入时不做 Zod 校验（历史 version:0 才能落库） | Runtime State Inventory | 若实际校验，历史事件本不该存在 → bug 范围比预期小；不影响修复方向，仅影响「为何 bug 此前未爆」的解释。planner 可快速验证 ledger append 源码。 |
| A2 | accept/discard 改派命令后，bus **不**自动 revalidate Next cache（仍需 action 手动 `updateTag`） | Architecture Pattern 2 / D-04a | 若 bus 已自动失效，action 重复 `updateTag` 是无害冗余；若误删 action 失效逻辑则缓存断。建议 planner 在 plan-check 确认 handler `invalidation.tags` 是否被 bus 实际 apply 到 Next。 |
| A3 | run 的 `resultSummary.step` 字段名为 `step`（单数，单 payload） | Pitfall 1 / Pattern 1 | 若字段名/结构不同，桥接封装需调整；已由 lesson-agent.ts:178-217 + persist schema 交叉印证，风险低。 |
| A4 | 端到端测试可通过直写 `agentRegistry` DB row `enabled=true` 注入启用态 | Open Q1 / Validation | 若无直接 DB 写测试夹具路径，需经 DAL；但既有测试已用 in-memory store DI，DB 夹具应可行。 |

## Open Questions

1. **E2E 如何启用 flag 而不翻 seed？（D-03b / 规划必答）**
   - What we know: registry seed `enabled=false`（`registry.ts`）；`getAgentRegistryDTO()` 首读 auto-seed 为 false；**不存在**「set agent enabled」DAL/action。
   - What's unclear: 生产如何启用（运营开关 deferred）。
   - **Recommendation:** 测试态直写 `agentRegistry` row `enabled=true`（fixture）；手动 E2E 经一次性 DAL 写 / Drizzle Studio。**不翻 seed、不加生产开关 UI**（超范围）。生产保持 gated。

2. **端到端验证落点（单测/集成/E2E）？（Claude's Discretion）**
   - **Recommendation:** 主闭环用 Vitest **integration**（real bus → handler → DAL，provider mock），扩 `lesson-agent.test.ts` 或新建 e2e-loop spec。不引入 Playwright（审校 UI 已 Phase 64 覆盖；本 phase 重在服务端接线可达性）。

3. **version 补入 DTO 的范围（仅 apply/discard vs 统一 draft 结果 DTO）？（Claude's Discretion）**
   - What we know: `persistDraftLessonVersion` 已返回 `version`（`:1786`）；仅 `ApplyDraftResultDTO`/`DiscardDraftResultDTO` 缺。
   - **Recommendation:** 最小化 —— 仅补这两个 DTO（CONTEXT specifics 倾向）。两处 DAL 的 `draft.version` 都在作用域内，零额外查询。

4. **双重派发风险（accept/discard 幂等）？**
   - What we know: 两命令 `dedupe:required`；`buildPlatformCommandDedupeKey` + DAL `DRAFT_NOT_PENDING` guard。
   - **Recommendation:** 用稳定 `dedupeKey`（如 `lesson.draft.accept:${draftVersionId}`）；**前提是删除直连 DAL 调用**（单事件路径）。dedupe + guard 双保险 ⇒ 幂等、不重复发事件。

## Sources

### Primary (HIGH confidence — 本 session 直接读取的源码)
- `src/lib/dto/lesson-authoring.ts:462-477` — Apply/Discard 结果 DTO（缺 version 已证实）。
- `src/features/platform-core/commands/handlers/lesson-draft.ts:147-332` — run/persist/accept/discard handler；version:0 硬编码（:289,327 含 TODO 注释）；accept resultSummary 丢 courseId（:270-273）。
- `src/features/platform-core/events/contracts.ts:140,256,276` — 事件 version `positive int` 要求。
- `src/lib/dal/lesson-authoring.ts:1620-1810` — apply/discard/persist DAL；draft 行加载点 + 返回点（version 在作用域内）。
- `src/actions/lesson-authoring-actions.ts:140-463` — `invalidateLessonAuthoringTags`（需 courseId）+ apply/discard action 现状（直连 DAL :441,456）。
- `src/features/platform-core/commands/bus.ts:106-254` — `dispatchPlatformCommand(command, dependencies)` 签名 + dedupe 解析。
- `src/features/platform-core/commands/producers/plugin-governance.ts:9-36` — canonical producer 模式。
- `.planning/phases/66-.../66-CONTEXT.md` — D-01..D-06 权威决策。
- `.planning/config.json` — `nyquist_validation: true`, `commit_docs: true`。
- `AGENTS.md` §Technology Stack — 非协商约束（DAL-only、显式缓存、provider Node-only、summary-only）。

### Secondary (MEDIUM confidence)
- `.planning/v3.2-MILESTONE-AUDIT.md` — 缺口来源（requirements 10/18、flows 0/1）。
- `.planning/REQUIREMENTS.md` — D-06 校正目标行。
- `.planning/codebase/TESTING.md` — Vitest 模式 / 落点参考。

## Metadata

**Confidence breakdown:**
- 接线点定位（D-01..D-05 改动文件/行）: HIGH — 全部 session 内直接读源码确认。
- version 修复路径: HIGH — DAL/DTO/handler 三层 + draft.version 作用域均已验证。
- 隐藏依赖（accept resultSummary 缺 courseId）: HIGH — action 失效逻辑 + handler resultSummary 交叉确认。
- E2E 启用策略: MEDIUM — seed=false 已证实；测试夹具直写 DB 为推荐（A4）。
- bus 是否自动 revalidate Next cache: MEDIUM — 标记 A2，建议 plan-check 确认。
- 历史事件 ledger 校验行为: LOW — 标记 A1，建议 planner 速查 `appendPlatformEvents`。

**Research date:** 2026-06-01
**Valid until:** 2026-06-30（稳定内部代码；若 Phase 61–65 文件被改动则需重核行号）
