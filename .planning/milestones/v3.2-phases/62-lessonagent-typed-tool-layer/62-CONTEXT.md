# Phase 62: LessonAgent Typed Tool Layer - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 `server/ai/tools` LessonAgent 工具层：一组 Zod 校验的 typed tools，输入输出在边界处被校验；工具只能经 DAL（读）/ Command Bus（受控写）/ Phase 61 provider facade（生成）访问系统，**不可直连 DB、不可读 provider key、不可执行任意代码**。教师能针对一节目标课时触发 LessonAgent 起草，Agent 产出符合 `content`/`task`/`quiz` 原子步骤 schema 的**步骤包**；起草过程关键节点（开始 / 工具调用 / 完成 / 失败）作为 typed platform events 写入 v3.0 event bus。covers AGENT-01~04。

**本 phase 只做"生成 + 校验 + 可追溯"，不做实际写库。** 步骤包产物经 Zod 校验后返回，**不落库**；经 Command Bus 写入 draft lesson version 的链路属 Phase 63（DRAFT-01~03）。N=1 单 LessonAgent 单链路先跑通；多 Agent 编排、RAG/向量检索、MCP、插件触达 AI 均 deferred。

</domain>

<decisions>
## Implementation Decisions

### 产物边界（62 / 63 职责切分）
- **D-01 纯生成不落库:** LessonAgent 工具产出**经 Zod 校验的步骤包 DTO**（复用 `lessonStepPayloadSchema` 的 `content`/`task`/`quiz` discriminated union），在内存中返回给调用方，**本 phase 不调 Command Bus 写库、不创建 draft lesson version**。Phase 62 只验证 `generate → validate → typed-event` 链路闭环。实际写入（幂等 / replay-safe / 标注 AI 来源 / 不自动发布）全部归 Phase 63。
  - 推论：本 phase Command Bus 只可能用于**读侧或不产生持久副作用的路径**；不在本 phase 新增"写 draft"command 定义（那是 Phase 63）。

### 工具暴露形态
- **D-02 AI SDK tool() + Zod:** typed tool 用 Phase 61 锁定的 AI SDK（`ai` 包）`tool({ inputSchema: <zod>, execute })` 形态暴露给 LessonAgent。`inputSchema` 即 AGENT-01 的边界校验关口（非法 payload 在此被拒）；`execute` 内部**只允许**调用 Phase 61 facade（`aiGenerateText` / `aiGenerateObject`）、DAL 只读方法、以及（如需要）Command Bus —— 不导入任何 DB client、不读 env 密钥、不做动态执行。
  - prompt 内容（D-11@Phase 61 移交本 phase）在此层定义：教学起草 prompt / 系统前置 / 安全约束。
  - 输出结构化由 `aiGenerateObject(schema)` 保证（Phase 61 D-10）；本层只负责传入 `content`/`task`/`quiz` 领域 schema，不重复造结构化机制。

### event bus 写入（AGENT-04）
- **D-03 三节点 typed events:** 在三个关键节点各写一条 typed platform event，经 `appendPlatformEvents` 落 ledger（订阅者只消费已持久化事件）：
  1. `draft.requested` —— 教师触发起草（开始）
  2. `tool.invoked` —— 每次工具调用
  3. `draft.produced` —— 步骤包成功产出（完成）
  外加**失败**节点事件（`draft.failed` 或在上述事件上带失败 discriminant，由 planner 定）。
  - 事件须遵循现有 `platform-core/events/contracts.ts` 模式：**strict、summary-only**（payload 字段名不得以 `Json` 结尾、不得内嵌对象快照），新增 AI 域事件变体并入 discriminated 事件集合。
  - operator 可追溯（Success Criteria 4）：correlationId / causationId 串联一次起草的三/四条事件。

### DAL 读取范围
- **D-04 课程/课时元信息 + 已有步骤:** 工具起草时经现有 lesson-authoring DAL **只读**目标课时的元信息（课程 subject/grade、课时 objective/status）与已有步骤列表，作为生成上下文，提升步骤包贴合度。**不引入新的写 DAL 方法**；如现有只读方法不足，只补只读 helper。教师入参（目标 lessonId、起草意图）由已鉴权的 Server Action 传入。

### the agent's Discretion
- tool 集合的具体切分（单个"draft 步骤包"工具 vs `draftContent`/`draftTask`/`draftQuiz` 多工具）、prompt 具体措辞与 few-shot、AI SDK Agent/工具循环的编排细节 —— 由 planner/executor 定。
- 失败节点用独立 `draft.failed` 事件 vs 在产出事件上带 status discriminant —— planner 按 events/contracts.ts 既有风格定。
- correlationId / causationId 生成与串联方式、event 的 reasonCode 取值表 —— executor 落地。
- 工具层的 server-side 结构化日志（沿用 `server-only` + `console`）与 event 的关系 —— event 是可追溯真相，log 仅辅助。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与里程碑
- `.planning/REQUIREMENTS.md` §AGENT-01~04 原文 —— typed tools 边界校验、只走 DAL/Command Bus 不直连/不触 key/不执行任意代码、教师触发产出步骤包、关键节点写 typed events。
- `.planning/ROADMAP.md` §Phase 62 —— Goal + 4 条 Success Criteria（非法 payload 被拒 / 无法直连 DB·读 key·执行任意代码 / 教师触发得步骤包 / 关键节点写 v3.0 event bus 可追溯）。

### 上游 phase（必读，避免重复决策）
- `.planning/phases/61-ai-provider-abstraction-layer/61-CONTEXT.md` + `61-04-SUMMARY.md` —— Phase 61 已锁：facade 公共入口 `import { aiGenerateText, aiGenerateObject } from "@/server/ai/providers"`，已限流·已归一错误·已证零泄漏；调用方按 `ProviderError.kind` / `instanceof` 决策；prompt 内容（D-11）下放本 phase。

### 架构与约束（项目根 AGENTS.md 内联）
- `AGENTS.md` §Technology Stack —— Non-Negotiable Constraints（Data Access: UI 禁直连 DB，全走 DAL + Server Actions；Plugin: 禁 `eval`/远程动态执行/直连 DB/触 provider key —— 同样约束 AI 工具层）；§Safe Plugin（`Event → Hook → Action → Core API` 受限动作模型，工具层副作用应类比此受控）。
- `DESIGN.md` —— 本 phase 无 UI（教师触发入口的 UI 在 Phase 64 审校阶段），仅备查。

### 代码地图
- `.planning/codebase/ARCHITECTURE.md` §分层数据访问 + §Runtime Platform seams —— UI→Server Actions→DAL→Drizzle；工具层属服务端模块。
- `.planning/codebase/CONCERNS.md` / `CONVENTIONS.md` —— Zod 边界校验、`server-only` 隔离既有标准。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/server/ai/providers`（Phase 61 已交付）**：`aiGenerateText` / `aiGenerateObject(schema)` facade —— 工具 `execute` 内做结构化生成的唯一入口（D-02）。
- **`src/lib/dto/lesson-authoring.ts` `lessonStepPayloadSchema`**：`content`/`task`/`quiz` discriminated union + `LessonStepDTOSchema` —— 步骤包产物直接复用，**不另造 schema**（D-01）。
- **`src/lib/dto/resource-ai.ts` `BuiltInTeachingStepTemplatePayload` / `BUILT_IN_TEACHING_STEP_DEFINITIONS`**：已有的"步骤模板 + initialPayload"先例，是步骤包形状与默认值的最近参照。
- **`src/features/platform-core/events/`（`contracts.ts` / `ledger.ts` / `bus.ts`）**：typed platform event 契约 + `appendPlatformEvents` 落库 + summary-only 守卫 —— AGENT-04 新增 AI 域事件须并入此体系（D-03）。
- **`src/features/platform-core/commands/bus.ts` + `registry.ts`**：v3.0 Command Bus（typed dispatch + dedupe + persistPlatformEvents）—— 受控写的既有内核，本 phase 复用其约束模型；写 draft 的新 command 留给 Phase 63。
- **`src/features/platform-core/ai-contracts/registry.ts`**：AI 可见 command/action descriptor（delegation/approval posture）—— 若工具需对接受控动作，参照此 descriptor 风格。
- **`src/server/ai/agents/registry.ts`**：LessonAgent 等 seed（当前 `enabled=false`）—— 本 phase 让 LessonAgent 链路实际可跑。

### Established Patterns
- **严格分层**：UI → Server Actions → DAL → Drizzle；AI 工具层属服务端模块，调用方为已鉴权 Server Action，**绝不暴露给 client/Edge/插件**。
- **事件 summary-only**：`events/contracts.ts` 强制 payload 不含 `*Json` 快照/对象快照；AI 域事件须同样精简。
- **Zod 边界校验**：项目既有标准，tool `inputSchema` 即 AGENT-01 关口。
- **Node runtime 强约束**：provider/DB/Agent 一律 Node；Edge 仅 classroom SSE。

### Integration Points
- 新目录 `src/server/ai/tools`（当前不存在），是 v3.2 `server/ai/*` 体系（providers→**tools**→agents→rag）的第二块，上承 Phase 61 facade、下接 Phase 63 写入链路。
- 教师触发入口：已鉴权 Server Action → LessonAgent → tools；teacherId 传入 facade 作限流维度（Phase 61 已留）。
- 下游：Phase 63 消费本 phase 产出的步骤包 DTO，经 Command Bus 写 draft lesson version。

</code_context>

<specifics>
## Specific Ideas

- 事件命名意向：`draft.requested` / `tool.invoked` / `draft.produced`（+ 失败），最终类型名与 discriminant 由 planner 对齐 `events/contracts.ts` 既有命名风格。
- 工具 `execute` 三类允许的依赖：Phase 61 facade（生成）、DAL 只读（上下文）、Command Bus（如本 phase 确需受控读/无副作用路径）。禁止项：DB client、env 密钥、`eval`/动态 import。
- 强调「N=1 强样板优先」：单 LessonAgent 单链路跑通，工具集合与编排不为多 Agent 提前过度设计。
- 步骤包产物形状对齐 `lessonStepPayloadSchema` + `BUILT_IN_TEACHING_STEP_DEFINITIONS` 的 initialPayload 先例，避免造第二套步骤模型。

</specifics>

<deferred>
## Deferred Ideas

- **经 Command Bus 写 draft lesson version**：属 Phase 63（DRAFT-01）；本 phase 步骤包**只生成不落库**。
- **写入幂等 / replay-safe / AI 来源标注 / 不自动发布**：Phase 63（DRAFT-02/03）。
- **多 Agent 编排（Homework/Data/Tutor/Parent）**：本 phase 仅 LessonAgent；v3.2 后续/未来里程碑。
- **RAG / 向量检索增强起草上下文**：deferred（REQUIREMENTS Future）；本 phase 上下文仅来自 DAL 只读元信息 + 已有步骤。
- **MCP 工具接入、插件触达 AI**：v3.2 明确推迟。
- **教师触发起草的 UI、AI 草稿审校界面**：Phase 64。
- **教学 prompt 模板库、多语言/多学科 prompt 体系**：本 phase 先落单链路 prompt，体系化归后续。

None deferred-from-todos —— 无匹配 todo。

</deferred>

---

*Phase: 62-LessonAgent Typed Tool Layer*
*Context gathered: 2026-05-31*
