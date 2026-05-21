# Project Research Summary

**Project:** OpenLearn Next
**Domain:** AI Native Educational OS 升级（v3.0 第一阶段平台内核）
**Researched:** 2026-05-21
**Confidence:** HIGH

## Executive Summary

v3.0 第一阶段的正确目标不是重建基础设施，而是在现有 Next.js 16 单体、SQLite-first、DAL-only、WebSocket-first、Async Task Platform 已成立的前提下，补齐一个**正式的平台内核**：Command Bus、Dynamic Action Registry、Formal Plugin Lifecycle、Platform Event Bus，以及面向未来 Agent / Skill / Capability / Observability 的 machine-readable contracts。研究结论高度一致：这一步应该是**平台边界收口**，不是引入 Temporal、Kafka、QuickJS、PostgreSQL、DI 容器等重型升级。

推荐路线是：继续复用 Next.js 16 + React 19.2 + Node runtime + Drizzle + SQLite + Zod + BullMQ + WebSocket，仅少量新增 `@opentelemetry/api` 与 `AsyncLocalStorage` 作为 tracing / execution context seam；真正新增的是 `src/features/platform-core/` 下的一组 typed contracts、registries、ledger/outbox 和 lifecycle orchestration。这样既能把插件、后台任务、未来 Agent 的动作统一收口到同一执行边界，又不会破坏现有课堂主链路、DAL 纪律和 SQLite 事实源。

最大风险不是技术做不到，而是 scope 失控与边界失守：把 phase 1 做成平台重写、让新旧 mutation 入口长期双轨并存、混淆 command 与 event、或让 registry/lifecycle 演化成动态代码执行系统。规避方式也很明确：先冻结术语与职责，再先做 command boundary，再做 action registry，再补 lifecycle 和 event outbox，最后才开放 discovery surface 与 AI-native contract。

## Key Findings

### Recommended Stack

本阶段**不需要新的大框架**。技术重点不是换栈，而是把既有栈提升为平台正式原语，并在最少增量上补足 observability/context seam。

**Core technologies:**
- **Next.js 16 + React 19.2 + Node runtime**：继续作为单体承载层——已满足 App Router、Server Actions、显式缓存、Node-side platform orchestration 需求。
- **Drizzle ORM + SQLite + DAL**：继续作为唯一 durable truth——所有 command/event/lifecycle ledger 仍应走 centralized migrations 与 DAL write path。
- **Zod**：作为 command / action / event / capability descriptor 的统一 schema 语言——保证 machine-readable、可校验、可审计。
- **BullMQ**：仅作为 deferred command 的异步执行桥——不是 Command Bus，也不是 Event Bus。
- **WebSocket + optional Redis fanout**：继续承担 runtime delivery——不能升级成新的平台事实源。
- **`@opentelemetry/api` + AsyncLocalStorage**：本阶段新增——用于 `commandId` / `correlationId` / `causationId` / actor context 贯通。

**Critical stack additions:**
- `src/features/platform-core/` feature root
- command ledger tables
- platform event outbox / ledger
- action registry metadata layer
- plugin lifecycle orchestrator
- observability trace/context seam

### Expected Features

第一阶段 must-have scope 很聚焦：把“系统动作如何进入平台、如何被发现、如何被治理、如何产出事实事件”做实，而不是直接把 Agent Runtime、Workflow Engine、Sandbox 一次性做出来。

**Must have (table stakes):**
- **Command Bus v1**：统一 envelope、validate → authorize → execute → emit events → audit/result pipeline。
- **Dynamic Action Registry v1**：typed registration、conflict detection、capability gating、discoverability。
- **Plugin Lifecycle v1**：`register -> resolveDependencies -> activate -> running -> deactivate -> dispose`，并明确 installed / enabled / active 区别。
- **Platform Event Bus v1**：command 成功后产出事实事件，供平台内订阅者、审计、后续 workflow/agent 使用。
- **Platform descriptors v1**：commands / actions / events / capabilities 可列举、可校验、可审计。

**Should have (if small):**
- command idempotency / dedupe key
- plugin kill switch / suspend posture
- actor delegation metadata
- minimal operator-facing command/event explorer

**Explicitly defer:**
- Agent Runtime / Skill Runtime
- Workflow Engine / Temporal
- DI Container
- QuickJS / Extension Host / sandbox isolation
- PostgreSQL / pgvector cutover
- classroom realtime rewrite
- full event sourcing / undo engine / distributed event bus
- Shadow DOM / Lumino / Monaco / Yjs 这类长期 UI/runtime 级升级

### Architecture Approach

架构研究的核心建议是：**在现有仓库内新增 `platform-core` 层，而不是拆包、拆仓或重建 runtime**。所有入口（Server Actions、plugin host、async task、future agent）最终都应汇入 `Command Bus`；`Action Registry` 负责发现与授权，不负责任意代码执行；`Platform Event Bus` 负责 after-fact facts，不负责主业务写入；runtime transport bus 与 async queue 保持独立分层。

**Major components:**
1. **Command Bus** — 统一系统级 mutation 入口，持有 validation/authz/audit/result contract。
2. **Dynamic Action Registry** — 提供 action metadata、enabled-state gating、capability checks、discoverability。
3. **Plugin Lifecycle Orchestrator** — 负责 dependency ordering、activation/deactivation、failure attribution。
4. **Platform Event Bus + Outbox** — 记录并发布已发生事实，支撑审计、订阅、后续 workflow/agent。
5. **Execution Context / Observability seam** — 贯通 `commandId`、`correlationId`、`causationId`、actor、school、plugin。

### Critical Pitfalls

1. **把第一阶段做成平台重写** — 明确只交付 command/action/lifecycle/event 核心 contract；重型升级全部 defer。
2. **新旧 mutation 入口长期双轨并存** — 所有平台动作最终必须落到 Command Bus；旧入口只能做 adapter。
3. **混淆 Command 与 Event** — Command 是请求动作，Event 是已发生事实；event handler 不能直接成为 durable truth 写入口。
4. **复制 durable truth** — SQLite + DAL 继续是 canonical truth；Redis/BullMQ/WebSocket 只是 delivery/orchestration。
5. **把 registry / lifecycle 演化成动态代码执行系统** — 只允许动态发现、授权、装配；不允许 `eval()`、远程 JS、插件直连 DB/API。

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Boundary Freeze & Platform Vocabulary
**Rationale:** 先冻结术语、职责、命名和 out-of-scope，避免后续把 command、event、task、runtime transport 混在一起。
**Delivers:** command / event / action / lifecycle / capability 的正式词汇表、命名约定、数据角色定义、defer 清单。
**Addresses:** command/event separation、平台 contract 稳定性。
**Avoids:** scope 膨胀、语义混乱、事实源重复。

### Phase 2: Command Bus Foundation
**Rationale:** 这是其他平台能力的依赖前提；必须先形成唯一执行边界。
**Delivers:** `PlatformCommand` contract、handler registry、execution ledger、validation/authz/result/audit pipeline；首批覆盖 `plugin.install|enable|disable|transition`。
**Uses:** Zod、Drizzle、SQLite、DAL、AsyncLocalStorage。
**Avoids:** “第二套 service layer”、旧新双轨 mutation、handler 绕过 DAL。

### Phase 3: Dynamic Action Registry
**Rationale:** 在 command boundary 成立后，才能安全开放 discoverability 和可注册 action metadata。
**Delivers:** action descriptor schema、conflict detection、enabled-state gating、built-in 与 plugin action 同模型、`listActions()` 基础。
**Implements:** registry projection，不引入动态代码执行。
**Avoids:** magic string jungle、built-in 特权通道、安全漏洞目录。

### Phase 4: Formal Plugin Lifecycle
**Rationale:** registry 之后再做 lifecycle，才能把依赖排序、激活状态与 action/subscription 装配连接起来。
**Delivers:** install / enable / disable / uninstall semantics，activation orchestration，dependency graph，failure isolation，kill switch posture。
**Addresses:** plugin governance、startup failure attribution、disable ≠ uninstall。
**Avoids:** 半安装状态、依赖污染全局、不可逆数据清理。

### Phase 5: Platform Event Bus & Observability Hooks
**Rationale:** 等 command write path 稳定后，再补 after-fact event outbox，风险最低。
**Delivers:** platform event envelope、outbox/ledger、in-process subscribers、统一 correlation/causation/audit keys、cache invalidation intent mapping。
**Uses:** SQLite ledger、optional delivery adapters、OTel API seam。
**Avoids:** event-driven hidden main flow、queue 反客为主、审计链路断裂。

### Phase 6: AI-Native Contract Exposure
**Rationale:** 只有在 command/action/event/lifecycle 已稳定后，machine-readable discovery 才有长期价值。
**Delivers:** `listCommands()` / `listActions()` / `listCapabilities()`、delegated actor metadata、future agent-callable contract。
**Addresses:** 为 Agent / Skill / Workflow 留演进位，但不实现完整 runtime。
**Avoids:** 为未来假想能力过度设计。

### Phase Ordering Rationale

- **先边界，后执行，后发现，后生命周期，后事件，最后 AI 暴露面**：这是依赖链最清晰、blast radius 最小的顺序。
- **先统一主写入边界，再开放更多调用者**：否则 discovery surface 只会暴露混乱系统。
- **事件总线后置**：避免 team 把 event bus 误用成主业务流程。
- **AI-native 合同最后开放**：本阶段成功标准不是“AI 能跑起来”，而是“未来 AI 不需要重写平台内核”。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4（Formal Plugin Lifecycle）**：需要结合当前 `pluginRegistrations` / `pluginLifecycleTransitions` 现状，细化状态机、依赖排序与 uninstall retention 策略。
- **Phase 5（Platform Event Bus & Observability Hooks）**：需要细化 outbox schema、delivery adapter 边界、cache invalidation intent 映射、与现有 runtimeEventOutbox 的分层关系。
- **Phase 6（AI-Native Contract Exposure）**：需要补 capability delegation、descriptor discoverability、approval posture 的详细 planning，但仍应限制为 contract 级别。

Phases with standard patterns (can likely skip research-phase):
- **Phase 1（Boundary Freeze）**：主要是决策收口与术语冻结，不依赖新技术研究。
- **Phase 2（Command Bus Foundation）**：模式已被 4 份研究文件高度收敛，首批只包插件生命周期命令即可。
- **Phase 3（Dynamic Action Registry）**：首版目标明确，重点在 schema/metadata 与迁移策略，不需要额外外部技术探索。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 与 PROJECT 约束完全一致，且新增项极少、边界清晰。 |
| Features | HIGH | 四类平台核心能力范围收敛明确，must-have / defer 分界清楚。 |
| Architecture | HIGH | 接入点、模块划分、build order、与现有代码关系都已给出具体建议。 |
| Pitfalls | HIGH | 风险集中在边界与迁移治理，且预防策略高度一致、可操作。 |

**Overall confidence:** HIGH

### Gaps to Address

- **首批 command 覆盖名单**：建议 requirements 阶段明确哪些现有 plugin actions 立即迁移，哪些继续通过 adapter 转发，避免“双轨状态”无限期存在。
- **Lifecycle 持久状态与现有枚举映射**：需在规划阶段确定是扩展现有 plugin state 还是引入 activation snapshot/projection 层，避免直接改现有状态枚举造成 blast radius。
- **Outbox / ledger schema 命名**：研究里出现 `platformCommands` / `platformCommandExecutions`、`platformEvents` / `platformEventOutbox` 等候选名；规划阶段应统一命名。
- **Cache invalidation contract**：需明确 command handler 返回哪些 invalidation intents，以及入口层如何统一 `updateTag()` / `revalidateTag()`。
- **AI 合同边界**：只应交付 descriptor 与 delegation seam，不应在 roadmap 中偷渡 Agent Runtime / Skill Runtime 实现项。

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — 当前 milestone 目标、约束、已落地基础设施、active/out-of-scope 边界。
- `openlearn_next_upgrade_plan.md` — v3.x 长期蓝图与优先级输入；本总结已按第一阶段低 blast radius 原则做收敛。
- `.planning/research/STACK.md` — 第一阶段 stack 决策、明确禁入技术、platform primitive 建议。
- `.planning/research/FEATURES.md` — must-have / defer 范围、MVP 门槛、平台 contract 优先级。
- `.planning/research/ARCHITECTURE.md` — 模块落点、现有代码接入方式、推荐 build order。
- `.planning/research/PITFALLS.md` — phase warning、critical pitfalls、治理优先级。

### Secondary (HIGH confidence external references via research)
- VS Code extension command / activation docs — command 作为 discoverable execution surface。
- JupyterLab extension architecture docs — plugin/service/token、activation ordering。
- Backstage backend architecture docs — plugin/module boundary、extension points、module-before-plugin initialization。
- OpenTelemetry JS API docs — tracing/context seam 设计依据。

---
*Research completed: 2026-05-21*
*Ready for roadmap: yes*
