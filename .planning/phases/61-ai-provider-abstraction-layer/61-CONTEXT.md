# Phase 61: AI Provider Abstraction Layer - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 `server/ai/providers` 统一抽象层：调用方通过单一接口完成一次 LLM 文本/结构化生成；provider 密钥只在服务端 Node runtime 读取（客户端/Edge/插件/浏览器响应均不可见）；调用受限流/配额保护，超限返回明确可读错误；调用失败返回 typed 错误并区分可重试/不可重试。covers PROV-01~04。

**只做机制层，不做内容。** 教学 prompt、LessonAgent 工具、起草写入链路均属后续 phase（62/63）。本 phase 是一个 content-agnostic 的、可被任意 server-side Agent 复用的 provider 抽象。

</domain>

<decisions>
## Implementation Decisions

### 抽象形态与 provider 选型
- **D-01 底层引擎:** 底层用 Vercel AI SDK（`ai` 包）。**研究阶段必须先锁定版本** —— 项目 STACK 推荐 AI SDK 6，但标注 v7 暴露 Agent API；planner 须在本 phase 钉死一个具体版本并验证 openai-compatible adapter 可用。
- **D-02 调用表面:** 包裹为 OpenLearn facade —— `server/ai/providers` 导出 `aiGenerateText()` 与 `aiGenerateObject(schema)`，调用方（Phase 62 工具层）只依赖此 facade，**拿不到 AI SDK 原生句柄**。密钥读取、限流、错误映射全部统一归口在这一层，是 PROV-02/03/04 的唯一关口。
- **D-03 配置形态:** 现在就建 **provider registry**（多 provider 注册 + 运行时选择，结构上可扩展），但实际 N=1 —— 只跑一个默认 provider。多模型路由 / 成本优化 / A-B 仍在 deferred。
- **D-04 首接 provider:** v1 首接**国内 OpenAI 兼容端点**（DeepSeek / 通义 / 智谱 等），走 openai-compatible adapter + 自定义 `baseURL`。env 需要：`baseURL` + API key + 默认 model name（命名由 planner 定，遵循现有 `.env.local` + `server-only` 模式）。

### 限流 / 配额
- **D-05 计数后端:** 复用现有 **Redis（ioredis）做共享计数**，跨进程一致（server.ts 主进程 + BullMQ worker 共享同一额度）。不用进程内内存计数。
- **D-06 粒度:** **按教师限流（防单人刷爆）+ 全局安全上限（保护 provider 成本/配额）** 双层。不按学校（v3.2 单校场景，多租户 deferred）。
- **D-07 超限行为:** 超限返回 typed `RateLimitError`，**含 `retryAfter` 秒数 + 可读中文消息**；限额值走 env/config 可调。与 D-09 错误模型衔接，教师端可提示「稍后重试」。

### 错误模型与重试
- **D-08 错误建模:** **discriminated union typed errors**（如 `TimeoutError` / `UpstreamError` / `ParseError` / `RateLimitError`），每类带 `retryable` 标记；调用链用 instanceof / discriminant 精确分支。
- **D-09 重试归属:** **混合策略** —— provider 层自动重试瞬时错误（超时 / 5xx 上游错误）带指数退避 + 重试上限；`RateLimitError` 不自动重试、直接上抛（带 retryAfter）；`ParseError` 上抛给调用方。注意与 DRAFT-02（幂等/replay-safe 写入）协同：本层自动重试只针对**只读 generation**，不触发副作用写入。

### 结构化输出边界（61 / 62 职责切分）
- **D-10 结构化保证层:** **provider 层保证结构化** —— facade 提供 `aiGenerateObject(schema)`，底层用 AI SDK `generateObject` 保证返回符合传入 Zod schema；解析/校验失败归一为 `ParseError`。Phase 62 只负责传入 `content`/`task`/`quiz` 领域 schema，不重复造结构化机制。
- **D-11 prompt 归属:** provider 层 **content-agnostic**，不内置任何教学 prompt / 模板 / 安全前置；所有 prompt 归 Phase 62 LessonAgent。保证 provider 可被未来其他 Agent（Homework/Data/Tutor/Parent）复用。

### the agent's Discretion
- 限流算法/窗口（固定窗口 vs 滑动窗口）、重试退避具体参数（次数/基数/上限）、超时默认值 —— 纯实现细节，planner/executor 决定。
- provider 层失败的 server-side 结构化日志（沿用现有 `server-only` + `console` 模式）由 executor 落地；**event bus 事件发射属 Phase 62（AGENT-04），本 phase 不做。**
- registry 的注册/解析 API 具体形状（参考 v3.0 `runtime-platform/seams/` 抽象层先例）由 planner 定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与里程碑
- `.planning/REQUIREMENTS.md` §AI Provider 抽象层 (PROV) — PROV-01~04 原文与 Out of Scope（密钥不泄漏、Edge 禁跑 provider、禁绕过 DAL/Command Bus）。
- `.planning/ROADMAP.md` §Phase 61 — Goal + 4 条 Success Criteria（可替换、密钥不泄漏、超限可读错误、typed 可重试错误）。

### 架构与约束（项目根 AGENTS.md 内联）
- `AGENTS.md` §Technology Stack — Non-Negotiable Constraints（Runtime: Node 主、Edge 仅 SSE；provider key 仅服务端；AI SDK 版本锁定警示：npm latest v6、v7 需验证）；§"Safe Plugin"（插件禁触 provider key）。
- `DESIGN.md` — 本 phase 无 UI，仅备查（审校 UI 在 Phase 64）。

### 代码地图
- `.planning/codebase/ARCHITECTURE.md` §Auth Split Pattern + §Runtime Platform（`seams/` database/event-bus/transport 抽象层先例，registry 可参照其分层）。
- `.planning/codebase/STACK.md` — 现有依赖（zod 4.4.3、ioredis 5.10.1、bullmq、libSQL）；**当前未安装任何 LLM SDK，本 phase 需新增。**
- `.planning/codebase/INTEGRATIONS.md` §Data Storage / Task Queue — Redis(ioredis)+BullMQ 现状（限流后端复用依据）；§Environment Configuration（`.env.local` 密钥位置）。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Redis / ioredis（`ioredis 5.10.1`）**：已为 BullMQ 部署，直接复用为限流共享计数后端（D-05）。
- **`server-only` + `.env.local` 密钥模式**：现有 Auth.js `AUTH_SECRET` / `DB_FILE_NAME` 走此模式，provider key 沿用（D-02 密钥归口）。
- **Zod 4.4.3**：边界校验既有标准，`aiGenerateObject(schema)` 直接用（D-10）。
- **`src/features/runtime-platform/seams/`**（database/event-bus/transport 抽象层）：registry/adapter 分层的现成先例，provider registry 可对齐其风格（D-03）。

### Established Patterns
- **严格分层**：UI → Server Actions → DAL → Drizzle；provider facade 属服务端模块，调用方为 server-side（Phase 62 工具层），**绝不暴露给 client/Edge**。
- **Edge 仅用于 classroom SSE**；provider/DB/Agent 逻辑一律 Node runtime（D-04 强约束）。
- **Auth Split**：`auth.config.ts`(无 DB，Edge 安全) vs `auth.ts`(含 adapter)；provider 模块须确保不被 Edge/proxy 路径导入，类比此隔离。

### Integration Points
- 新目录 `server/ai/providers`（当前不存在），是 v3.2 `server/ai/*` 体系（providers→tools→agents→rag）的第一块。
- 下游：Phase 62 工具层 import facade；不接触 UI。

</code_context>

<specifics>
## Specific Ideas

- facade 双接口命名意向：`aiGenerateText()` / `aiGenerateObject(schema)`（最终命名由 planner 定，但语义须为「文本」与「结构化对象」两条）。
- 错误类型意向命名：`TimeoutError` / `UpstreamError` / `ParseError` / `RateLimitError`，均带 `retryable` + （RateLimitError 额外带 `retryAfter`）。
- 强调「N=1 强样板优先」：registry 结构可扩展但只跑一个默认 provider，不要为多模型路由提前过度设计。

</specifics>

<deferred>
## Deferred Ideas

- **多模型路由 / 成本优化 / A-B**：registry 结构预留，但路由逻辑不在本 phase（REQUIREMENTS Future）。
- **provider 调用的 event bus 事件发射**：属 Phase 62 AGENT-04，本 phase 只做 server-side 结构化日志。
- **按学校 / 多租户限流**：v3.2 单校，多租户 deferred。
- **教学 prompt 模板库、多语言/多学科 prompt 体系**：归 Phase 62+，REQUIREMENTS Future 已列。
- **AI SDK v7 Agent API**：若研究阶段确认 v7 稳定可用，Agent 编排在后续里程碑评估；本 phase 仅锁定可用版本跑通 provider 抽象。

None deferred-from-todos —— 无匹配 todo。

</deferred>

---

*Phase: 61-AI Provider Abstraction Layer*
*Context gathered: 2026-05-31*
