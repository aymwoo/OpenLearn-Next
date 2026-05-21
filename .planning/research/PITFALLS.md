# Domain Pitfalls — v3.0 AI Native Educational OS Upgrade

**Domain:** 在现有 Next.js 16 + SQLite-first + DAL-only 单体内，为既有产品增量引入 Command Bus、Dynamic Action Registry、Formal Plugin Lifecycle、Event Bus、AI-native platform contracts  
**Researched:** 2026-05-21  
**Confidence:** HIGH

## Recommended roadmap phases referenced below

| Phase | Focus |
|------|-------|
| Phase 1 | Platform boundary & vocabulary freeze |
| Phase 2 | Command Bus + Dynamic Action Registry |
| Phase 3 | Formal Plugin Lifecycle + install/enable/disable/uninstall semantics |
| Phase 4 | Event Bus + audit/observability integration |
| Phase 5 | AI-native contracts + capability delegation |

## Critical Pitfalls

| Pitfall | Why dangerous here | Prevention / mitigation | Address in phase |
|---|---|---|---|
| Turning phase 1 into a platform rewrite | 当前系统已经有课堂闭环、WebSocket、async tasks、plugin skeleton。若把 Command/Event/AI contract 一次性与 DI、QuickJS、Extension Host、Postgres、Workflow engine 绑在一起，会直接失控并重开多个 blast radius。 | 明确 v3.0 第一阶段只做 command/action/lifecycle/event 核心 contract；把 QuickJS、Extension Host、Postgres、full agent runtime 继续标记 deferred。每个 phase 都写“不做什么”。 | Phase 1 |
| Command Bus 变成“第二套 service layer” | 若旧 action/service path 继续保留，插件、Agent、后台任务会同时走旧入口和新入口，导致审计、权限、回放、缓存失效各做一半。 | 定义唯一执行边界：所有平台动作最终都要落到 Command Bus；旧入口只能作为 adapter 转发，不允许长期并存双写逻辑。 | Phase 2 |
| Command 与 Event 语义混淆 | Command 是“请求动作”，Event 是“已发生事实”。一旦混用，就会把 event bus 当 RPC，用 event 直接改真相，最后无法追责、无法重放、也无法保证顺序。 | 先冻结术语：Command 可拒绝、可鉴权；Event 只记录已发生事实、不可承担主写入责任。禁止 “event handler 直接成为主业务写入入口”。 | Phase 1 |
| 新平台层复制 durable truth | 现有项目已明确 SQLite + DAL 才是 durable truth。若把 command log、event log、task ledger、WebSocket session state、plugin runtime state 都做成“各自真相源”，会出现 truth duplication 和恢复歧义。 | 明确每类数据角色：SQLite core tables 为 canonical truth；command/event/audit 为派生记录；Redis/WebSocket/worker state 仅为 delivery 或 orchestration state。 | Phase 1 |
| Dynamic Action Registry 只是“字符串到函数映射” | 如果 registry 没有 namespace、owner、version、capability、input/output schema、deprecation policy，后续插件/Agent 调用会变成不可治理的 magic string jungle。 | 为 action 定义正式 contract：`actionId`、namespace、owner plugin、schema、required capability、side-effect class、idempotency、deprecation metadata。 | Phase 2 |
| 插件 lifecycle 只有 hook，没有 durable state machine | 在既有系统上新增 lifecycle 时，如果只写 `activate()` / `dispose()` 而没有 install/enable/disable/uninstall 的持久状态、失败恢复与幂等策略，插件会卡在半安装、半启用状态。 | 先建 lifecycle state model，再实现 hooks。install/enable/disable/uninstall 必须有持久状态、失败可重试、重复调用安全。 | Phase 3 |
| 把 disable 当 uninstall | 学校或教师可能只想暂时停用插件。如果 disable 触发数据删除、action 注销、事件订阅清理过深，会造成不可逆数据损失。 | 严格区分语义：disable 停止执行；uninstall 才进入 cleanup/retention 流程。所有 destructive cleanup 必须显式确认并可审计。 | Phase 3 |
| Plugin / Agent / internal module 继续绕过 DAL | 项目明确要求 DAL-only。若新 command handler、event subscriber、plugin lifecycle manager 直接碰 DB，就会把 authz、DTO、cache tag、audit 分散回各处。 | 规定 Command Handler 只能调 DAL/Core API，不可直连 DB。为平台层加 lint / code review rule，避免“临时特例”常态化。 | Phase 2 |
| 权限校验只在注册时做，不在执行时做 | registry 阶段检查 manifest 不等于运行时 actor 有权执行。尤其是 Agent delegation、plugin action forwarding、background replay 时，最容易出现 capability escalation。 | 执行时双重校验：actor capability + action capability + resource scope。注册合法不代表每次执行都合法。 | Phase 5 |
| Event Bus 被拿来做同步主流程 | 在现有单体里，如果关键写链路依赖异步 event subscriber 才完成，就会制造顺序不确定、局部成功、回滚困难，尤其对 SQLite-first 和课堂状态一致性很危险。 | 主业务写入仍走 command → handler → DAL transaction；event bus 只承接通知、投影、analytics、workflow trigger、非关键 side effects。 | Phase 4 |
| 为“未来 AI Native”过早抽象成万能 contract | 如果现在就设计覆盖 Agent、Skill、Workflow、Plugin、Extension Host 的超级抽象，极易产出空泛接口，落不了地，且会反向绑死现有产品。 | 第一阶段只定义最小可执行 contract：discoverable action metadata、typed command envelope、typed event envelope、capability claims、audit correlation。 | Phase 5 |

## Moderate Pitfalls

| Pitfall | Why dangerous here | Prevention / mitigation | Address in phase |
|---|---|---|---|
| Action、Command、Event、Task 四套 ID 与审计链路断裂 | 当前已有 async tasks、WebSocket transport、plugin audit。若没有统一 correlation ID，后续很难回答“是谁通过什么命令触发了哪个插件、产生了哪些事件、排了哪些任务”。 | 统一 correlation / causation model，所有 command、event、task、audit、transport message 都带 trace identifiers。 | Phase 4 |
| Cache invalidation 没有进入平台 contract | Next.js 16 显式缓存下，若 command handler 完成写入却没更新 tag，teacher/student/plugin 页面会读到旧 DTO，表现成“系统随机失败”。 | 在 action metadata 或 command handler contract 中声明影响的 cache tags；写入后统一 `updateTag` / `revalidateTag`。 | Phase 2 |
| Registry 中 built-in 与 plugin action 双标 | 如果 built-in action 继续保留特权路径，而第三方插件必须走 registry，新平台只会形成“两套世界”，后续治理永远不收口。 | 让 built-in 也注册为正式 action/provider；平台规则先约束自己，再开放给插件/Agent。 | Phase 2 |
| 生命周期缺少 dependency ordering 与 failure isolation | 插件互相依赖时，如果 activation 顺序不明确，单个插件失败会污染全局 registry、event subscription 和 UI 能力暴露。 | 建依赖图、循环检测、partial failure posture；单插件失败不应拖垮整个平台。 | Phase 3 |
| 事件命名与 action 命名不稳定 | 一旦命名随实现细节漂移，Agent discovery、workflow trigger、审计查询都会脆弱；重命名成本会持续上升。 | 早期冻结 naming convention：过去式 event、祈使/动作式 command、命名带 namespace，不暴露临时实现词汇。 | Phase 1 |
| 把 replay / undo 当第一阶段必做 | Command Bus 设计会诱惑团队顺手做 event sourcing、undo、full replay，但这会迅速放大存储、一致性和产品语义复杂度。 | 第一阶段只保证 commands 可审计、可幂等、关键动作可人工重试；undo/replay 仅为 contract 预留，不承诺全量实现。 | Phase 2 |

## Minor but recurring pitfalls

| Pitfall | Why dangerous here | Prevention / mitigation | Address in phase |
|---|---|---|---|
| 过度暴露平台术语到教师产品面 | 当前项目已强调 business-entity-first。若 UI 直接暴露 command/event/task/platform wording，会破坏教育产品体验。 | 平台术语留在 operator/dev surfaces；教师端继续用 lesson/classroom/resource/product language。 | Phase 4 |
| 把 observability 留到最后才补 | 没有 metrics/tracing 时，新增 platform core 会变成黑盒，出了问题只能猜。 | 第一阶段至少预埋审计与 trace 字段；第二轮再补完整 metrics/tracing UI。 | Phase 4 |
| 把 AI contract 设计成默认高权限 | “Agent-callable” 很容易滑向“Agent 默认可执行全部动作”，这与学校场景和 capability security 正面冲突。 | 默认 deny；高风险 action 必须走 delegation / approval flow；Agent 只拿最小 capability。 | Phase 5 |

## Phase-specific warnings

| Phase topic | Likely failure mode | Mitigation |
|---|---|---|
| Phase 1 boundary freeze | 讨论过多、术语不稳、scope 不断膨胀 | 先出 vocabulary + responsibilities + out-of-scope doc，未经显式决策不得扩 scope |
| Phase 2 command/action rollout | 旧入口与新入口长期并存 | 采用 adapter migration，逐步切换，但规定最终唯一入口 |
| Phase 3 lifecycle formalization | 半安装状态、disable/uninstall 语义混乱 | 先做 state machine，再接 hooks 和 cleanup |
| Phase 4 event integration | 事件驱动变成隐藏主流程 | 限定 event bus 只做 after-fact propagation，不承担主 truth mutation |
| Phase 5 AI-native contracts | 为未来假想能力过度设计 | 只定义现在能被 plugin/agent 实际调用与审计的最小 contract |

## Sources

- `.planning/PROJECT.md` — 当前 milestone 目标、现有系统约束、durable truth 原则、out-of-scope 边界。Confidence: HIGH.
- `openlearn_next_upgrade_plan.md` — v3.x 升级蓝图、目标能力、优先级排序、Command/Event/Lifecycle/AI-native 方向。Confidence: HIGH.
