# Phase 66: Wire AI LessonAgent Draft Loop End-to-End - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

收尾型「接线」phase，源自 `v3.2-MILESTONE-AUDIT.md`（status: gaps_found）。Phase 61–65 已分别交付 LessonAgent 编排入口、typed tool 层、draft 写入、审校 UI、eval/guardrails，但**端到端起草闭环在生产路径上从未打通**：`lesson.draft.run` 成功后从不触发 persist、`draftLessonStep` 无任何生产调用方、accept/discard server action 绕过 Command Bus 直连 DAL、accept/discard 事件 payload 里 `version` 被硬编码为 `0`。

本 phase 只做四件**接线 + 修复**，不改 Phase 61–64 既有契约：
1. **桥接 run→persist（DRAFT-01）：** 编排入口在 `lesson.draft.run` 成功拿到 step 后，顺序派发 `lesson.draft.persist`，让 AI 草稿真正落入 `draftLessonVersions`。
2. **新增教师起草触发面（AGENT-03）：** 在 `/teacher/editor` 工作区加「AI 起草」按钮 + intent 输入，经新 server action 调用 `draftLessonStep`，并强制 `lesson_agent_enabled` flag。
3. **accept/discard 改走 Command Bus：** `applyDraftLessonVersionAction` / `discardDraftLessonVersionAction` 两个 action 由直连 DAL 改为 `dispatchPlatformCommand` 派发既有 `lesson.draft.accept` / `lesson.draft.discard` 命令。
4. **修复 version:0 事件 payload bug** + 校正 `REQUIREMENTS.md` 陈旧的可追溯性标注。

**本 phase 不做：** 多 Agent（Homework/Data/Tutor/Parent，deferred）、RAG 增强起草（deferred）、plugin 触达 AI（deferred）、审校 UI 重做（Phase 64 已交付）、eval/guardrails 重做（Phase 65 已交付）、新的发布真相源（复用 `publishLesson()`）。

</domain>

<decisions>
## Implementation Decisions

### run→persist 桥接机制（DRAFT-01）
- **D-01 编排入口顺序派发两条命令:** `draftLessonStep`（或其上层 server action）在 `dispatchPlatformCommand(lesson.draft.run)` 成功、从 `resultSummary.step` 拿到整包步骤后，**再** `dispatchPlatformCommand(lesson.draft.persist)`。两条命令各自独立留痕、各自 dedupe（run optional / persist required），因果通过共享 `correlationId` / `causationId` 串联。
- **D-01a handler 保持纯执行:** **不**在 `lesson.draft.run` handler 内部嵌套 dispatch persist。延续既有「唯一派发路径在编排入口」「handler 不互相调用」的约束（避免 required-dedupe 语义在 handler 内难以管理、避免 handler 互调）。
- **D-01b persist 入参来源:** persist 命令 payload 的步骤包来自 run 的 `resultSummary.step`；`lessonId`/`stepType`/`schoolId` 透传自原 `DraftLessonStepInput`。`teacherId` 绝不进 payload（由 handler 授权注入，延续 lesson-agent.ts 既有约束）。

### 教师起草触发入口（AGENT-03）
- **D-02 编辑器内「AI 起草」按钮:** 触发面嵌入现有 `/teacher/editor` 工作区（`lesson-authoring-workspace.tsx`），工具栏加按钮，点开后轻量输入 `stepType`（content/task/quiz）+ `intent` 文本，调用新 server action → `draftLessonStep`。与 Phase 64 的 `?mode=review` 同屏形成完整闭环：**起草 → 审校 → 接受 → 发布**。
- **D-02a 起草成功后引导审校:** server action 成功（run + persist 都成功）后，触发草稿落库；UI 复用 Phase 64 已有的「草稿发现提示栏 / 模式切换 badge」自然引导教师切到审校模式。本 phase 不重做审校 UI，只确保 draft 落库后既有提示能点亮。
- **D-02b UI 对齐设计系统:** 新按钮/输入对齐 `DESIGN.md`（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA）与 Stitch `5322129002350954765`，复用 `Button` 三变体与 `teacher-surface-rhythm.ts`。

### feature flag 强制（AGENT-03 安全约束）
- **D-03 在新 server action 中强制 `lesson_agent_enabled`:** 起草 server action 在调用 `draftLessonStep` 前，经 DAL `getAgentRegistryDTO()` 读取 LessonAgent 的 `enabled` + `featureFlag`，未启用则返回 disabled 型 `ActionResult` 错误、**不派发任何命令**。flag 由此从「仅存储列」变为真正生效的运行时开关。
- **D-03a 强制点在授权边界:** flag 检查放在 server action / DAL 授权层，**不**下沉污染 command handler（handler 保持纯执行 + 既有 authorize 语义）。前端可额外按 flag 隐藏入口，但后端校验是真相源（不可被前端绕过）。
- **D-03b registry 当前 `enabled=false`:** 注意 `agentRegistrySeed` 里 LessonAgent `enabled: false`。为让端到端闭环在本 phase 可验证，planner 需决定：通过 DAL 写开关启用，或在测试/验证态注入启用态。**不**在 seed 中默认翻成 `true`（保持显式启用语义）。

### accept/discard 改走 Command Bus
- **D-04 两个 action 全改为 `dispatchPlatformCommand`:** `applyDraftLessonVersionAction` 改派 `lesson.draft.accept`、`discardDraftLessonVersionAction` 改派 `lesson.draft.discard`。两命令的 handler（已注册、已发 `lesson.draft.accepted` / `lesson.draft.discarded` 事件、已走 `applyDraftToLiveLesson` / `discardDraftLessonVersion` DAL）成为唯一写入路径，彻底消除「action 直连 DAL」这条第二真相源。
- **D-04a 缓存失效归位:** 失效 tag 由 handler 的 `invalidation.tags` 统一声明（handler 已含 `draftLesson`/`lesson`/`steps`）。action 层若仍需 `revalidateTag`/`updateTag`（如 `invalidateLessonAuthoringTags` 涉及 courseId 维度），planner 对齐既有 publish/apply action 的失效习惯，避免重复或遗漏。
- **D-04b 入参/授权:** action 仍走 `assertActiveTeacher` + Zod 校验后，把 payload 装进命令 envelope；handler 内 `authorizeLessonDraftCommand` 复用既有授权。

### version:0 事件 payload 修复
- **D-05 DAL 返回真实 version、handler 透传:** 根因——`applyDraftToLiveLesson` / `discardDraftLessonVersion` 读了 `draftLessonVersions` 行（含 `version` 列）但返回 DTO（`ApplyDraftResultDTOSchema` 等）未带 `version`，导致 handler 只能 `version: 0` 硬编码。修复 = DAL 结果 DTO 补 `version` 字段，handler 在 `lesson.draft.accepted` / `lesson.draft.discarded` payload 用 `result.version` 替换硬编码 `0`。
- **D-05a 事件契约一致性:** 修复后核对 `lesson.draft.persisted`（已正确带 version）与 accepted/discarded 的 version 语义一致；事件保持 summary-only（不含 `*Json` 快照）。

### REQUIREMENTS 可追溯性校正
- **D-06 校正陈旧标注:** 按 `v3.2-MILESTONE-AUDIT.md` 结论（requirements 10/18 satisfied、flows 0/1 端到端可达），更新 `REQUIREMENTS.md` 中 DRAFT-01 / AGENT-03 等被错误标记为已满足的条目，使其反映本 phase 闭环后的真实状态。

### Claude's Discretion
- run→persist 顺序派发的封装位置（直接在 `draftLessonStep` 内追加第二次 dispatch，还是在上层 server action 编排两步）——planner 依「编排入口唯一派发」原则与可测试性定。
- 起草 server action 的命名与文件落点（归入 `lesson-authoring-actions.ts` 还是新建 `lesson-agent-actions.ts`）——planner 对齐既有 actions 风格。
- `getAgentRegistryDTO()` 是否需要新增按 `agentKey` 单查的 DAL 便捷方法，还是复用现有全量读后 filter——planner 定。
- intent 输入的 UI 形态（inline 输入框 / 轻量 popover / 侧面板）与 stepType 选择控件——planner 对齐 Phase 64 审校面交互节奏。
- version 补入 DAL DTO 时的 schema 调整范围（仅 apply/discard 结果，还是顺带统一 draft 结果 DTO）——planner 依 `ApplyDraftResultDTOSchema` 现状定。
- 端到端验证用例（启用 flag → 编辑器触发 → run+persist → 审校 → accept 经命令 → publish）的测试落点（单测/集成/E2E）——planner 依 `TESTING.md` 定。

### Folded Todos
无 —— `todo.match-phase 66` 零匹配（todo_count: 0）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 里程碑审计与需求（本 phase 的权威范围来源）
- `.planning/v3.2-MILESTONE-AUDIT.md` —— **本 phase 范围/缺口的权威来源**（status: gaps_found）：定义四个闭环项、close_gate 警告（`pnpm verify:phase` 通过但不断言生产 producer 存在、不断言 accept/discard 走 Command Bus）、评分（requirements 10/18、flows 0/1）。
- `.planning/REQUIREMENTS.md` §DRAFT-01 / AGENT-03 原文 + 覆盖矩阵 —— D-06 需校正其陈旧标注；DRAFT-01「run→persist 落库」、AGENT-03「教师可触发起草」是本 phase 主要闭环目标。
- `.planning/ROADMAP.md` §Phase 66（line 143–151）—— phase 标题即四项任务清单；Goal 待 planner 落定。

### 上游 phase（必读，避免重做已交付层）
- `.planning/phases/63-ai-draft-chain-into-draft-lesson-version/63-CONTEXT.md` + `63-04-SUMMARY.md` —— `draftLessonVersions` 表、`lesson.draft.persist`（dedupe:required）、`persistDraftLessonVersion` DAL。**本 phase 复用，不重做写入层。**
- `.planning/phases/64-teacher-review-accept-publish-surface/64-CONTEXT.md` —— 审校面（`?mode=review`、草稿发现提示栏、accept/discard 命令意向、`applyDraftToLiveLesson` DAL）。**本 phase 把 64 已建的 accept/discard 命令真正接到 action，并点亮草稿发现提示。**
- `.planning/phases/65-*/65-CONTEXT.md` —— eval/guardrails/verify gate；本 phase 闭环后受其端到端验证约束。
- `.planning/phases/62-lessonagent-typed-tool-layer/62-CONTEXT.md` —— steps payload schema（content/task/quiz discriminated union）来源。

### 架构与约束（项目根 AGENTS.md 内联）
- `AGENTS.md` §Technology Stack Non-Negotiable Constraints —— **Data Access: UI 禁直连 DB**（起草触发组件只走 server action → DAL）；**Caching: 写入后显式失效 tag**；**Security: provider key 仅 Node server，绝不进 plugin manifest / Edge**；**summary-only 事件**。
- `AGENTS.md` §Safe Plugin + Theme System —— 本 phase 的 AI 触发是**内置系统 agent**路径（`LESSON_AGENT_SYSTEM_ACTOR` / `LESSON_AGENT_PLUGIN_ID` sentinel），**非** plugin 触达 AI（后者 deferred）。

### 设计系统（必读，新触发面 UI 对齐基线）
- `DESIGN.md`（repo root）—— Lexend、无 1px 分隔线、surface 层级、glass/gradient CTA、按钮变体。
- Stitch 项目 `5322129002350954765` —— 教育产品视觉语言。
- `src/app/globals.css` —— Tailwind v4 设计令牌。

### 代码地图
- `.planning/codebase/ARCHITECTURE.md` §分层数据访问 + §写型 command/event 落账。
- `.planning/codebase/CONVENTIONS.md` —— Drizzle schema、Zod 边界、`server-only` 隔离。
- `.planning/codebase/TESTING.md` —— 端到端验证用例落点参考。

### 代码参照（写 CONTEXT 时已完成 scout）
- `src/server/ai/agents/lesson-agent.ts` line 178 —— `draftLessonStep` 编排入口：仅派 `lesson.draft.run`、从 `resultSummary.step` 取步骤包回传；**当前从不派 persist**（D-01 接线点）。
- `src/server/ai/agents/registry.ts` line 5–14 —— LessonAgent seed：`featureFlag: "lesson_agent_enabled"`、`enabled: false`（D-03b）。
- `src/lib/dal/ai-rag.ts` line 33 —— `getAgentRegistryDTO()`：flag 强制检查的读取来源（D-03）。
- `src/features/platform-core/commands/handlers/lesson-draft.ts` —— run/persist/accept/discard handler；line 283 / 321 的 `version: 0` 硬编码（D-05 修复点）；accept 走 `applyDraftToLiveLesson`、discard 走 `discardDraftLessonVersion`。
- `src/features/platform-core/commands/registry.ts` line 86–97 —— `lesson.draft.*` 四命令注册（accept/discard 已注册，待 action 接入）。
- `src/actions/lesson-authoring-actions.ts` —— `applyDraftLessonVersionAction`（line ~435）、`discardDraftLessonVersionAction`、`publishLessonAction`（line 406）：当前直连 DAL，D-04 改派命令。
- `src/lib/dal/lesson-authoring.ts` —— `applyDraftToLiveLesson`（line 1620, 返回 `ApplyDraftResultDTOSchema`，缺 `version`）、`discardDraftLessonVersion`（line 1738）、`persistDraftLessonVersion`（line 1781）。D-05 DAL 补 version。
- `src/components/authoring/lesson-authoring-workspace.tsx` —— 教师编辑器工作区，D-02 起草按钮嵌入点。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`draftLessonStep`**（lesson-agent.ts:178）：已封装 `lesson.draft.run` 的唯一派发逻辑（envelope 构造 + `dispatchPlatformCommand` + 从 `resultSummary` 取步骤）。D-01 在其成功分支后追加 persist 派发，复用同一 `correlationId` 串联因果。
- **`lesson.draft.accept` / `lesson.draft.discard` handler**：Phase 64 已建并注册，含授权、DAL 调用、`lesson.draft.accepted`/`discarded` 事件、`invalidation.tags`。D-04 仅需让 action 派这两条命令——**handler 零改动**（除 D-05 的 version 透传）。
- **`getAgentRegistryDTO()`**（ai-rag.ts:33）：直接复用做 flag 强制读取。
- **`Button` 三变体 + `teacher-surface-rhythm.ts` + glass 模式**：D-02 起草触发面 UI 复用，对齐既有教师面视觉节奏。
- **草稿发现提示栏 / `?mode=review` 模式切换**（Phase 64）：起草落库后自动点亮，无需新建引导 UI。
- **`publishLesson()` DAL**：接受后发布链路复用，**不**建新发布真相源。

### Established Patterns
- **唯一派发路径在编排入口：** 现有 dispatch 站点仅 `plugin-governance.ts` 与 `lesson-agent.ts`。D-01 延续此约束——persist 在编排入口派发，不在 handler 内嵌套。
- **handler 纯执行 + authorize 分离：** D-01a / D-03a 保持 handler 不互调、不内联 flag 检查。
- **server-only + 严格分层：** D-02 触发组件经 server action 取/写，绝不 import DAL。
- **事件 summary-only：** accepted/discarded/persisted 事件 payload 不含 `*Json` 快照（D-05a）。
- **显式缓存失效：** 写后失效 `draftLesson`/`lesson`/`steps` tag（handler 已声明，action 层避免重复）。
- **Zod 边界 + `assertActiveTeacher`：** 所有新/改 server action 入参经 Zod、调用前断言活跃教师。
- **teacherId 绝不进 payload：** 由 handler 授权注入（lesson-agent.ts 既有约束，D-01b 延续）。

### Integration Points
- **上游：** Phase 63 写入层（`draftLessonVersions` + persist 命令）、Phase 64 审校面 + accept/discard 命令。
- **本 phase 接线：** ①`draftLessonStep` 追加 persist 派发；②新起草 server action + 编辑器按钮 + flag 强制；③两个 accept/discard action 改派命令；④DAL 补 version + handler 透传；⑤REQUIREMENTS 校正。
- **下游：** Phase 65 eval/guardrails 对完整闭环（触发→run→persist→审校→accept→publish）端到端验证。

</code_context>

<specifics>
## Specific Ideas

- **run→persist 因果链：** persist 命令的 `correlation.causationId` 指向 run 命令 id，`correlationId` 共享，便于事件溯源里把「同一次起草」的 requested/produced/persisted 串成一条链。
- **起草按钮意向：** 编辑器工具栏一枚 primary（渐变）「AI 起草」按钮；点开轻量输入区，stepType 用分段控件（content/task/quiz）、intent 用单行/多行文本，提交后 loading 态，成功后 toast「AI 草稿已生成，去审校 →」并点亮模式切换 badge。
- **flag 未启用文案：** server action 返回 `AGENT_DISABLED` 型错误；前端若入口已隐藏则此为兜底保护。
- **version:0 修复最小化：** 优先只给 apply/discard 结果 DTO 补 `version` 字段，避免顺手改动无关 draft 结果 schema（除非 planner 判定统一更清晰）。
- **REQUIREMENTS 校正定位：** 重点核对被审计判为「未在生产可达」的 DRAFT-01 / AGENT-03，以及 flows 0/1 端到端项。

</specifics>

<deferred>
## Deferred Ideas

- **多 Agent（Homework/Data/Tutor/Parent）各自起草触发与 draft 实体：** 本 phase 仅打通 LessonAgent。registry 里其余四个 agent `enabled:false`，deferred to future milestone。
- **RAG 增强起草上下文：** intent → 检索教材/资源喂给 agent，future milestone。
- **plugin 触达 AI：** 插件经声明式权限请求 AI 起草，deferred（本 phase 是内置系统 agent 路径，非 plugin）。
- **起草历史/多 draft 版本对比：** 当前仅最新 draft vs live（Phase 64），多版本对比 deferred。
- **起草触发的速率限制 / 配额：** provider 调用成本控制（rate limit、token 预算）属 observability/治理 phase，deferred。
- **审校 UI 移动端适配：** 延续 Phase 64 桌面端优先，deferred。

### Reviewed Todos (not folded)
无 —— `todo.match-phase 66` 零匹配。

</deferred>

---

*Phase: 66-Wire AI LessonAgent Draft Loop End-to-End*
*Context gathered: 2026-06-01*
