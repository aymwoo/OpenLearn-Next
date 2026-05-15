# Feature Landscape

**Milestone:** v2.0 Runtime Platform Foundations  
**Domain:** AI Native Teaching Runtime Platform  
**Researched:** 2026-05-15  
**Confidence:** HIGH for milestone framing against current project docs; MEDIUM for long-range V2 expansion beyond this milestone

## Feature Categories

v2.0 不应被定义成“再做一轮底层重构”，而应被定义成：**把现有可运行课堂产品，升级为一个已经能真实承载 Runtime、Plugin、Event、Audit 的平台内核**。

本 milestone 的 feature scope 建议按 6 类组织：

| Category | Why it belongs in v2.0 | Milestone test question |
|---------|-------------------------|-------------------------|
| Runtime host foundation | V2 的核心不是页面 CRUD，而是“课件/能力运行在 Runtime 中” | 系统是否真的能托管并运行一个受控课件 runtime？ |
| Runtime-hosted courseware execution | 必须证明课堂步骤不再只渲染本地 JSX，而能承载 sandboxed courseware | 学生是否能在课堂中打开一个 runtime step，并完成真实交互？ |
| Plugin lifecycle + capability foundation | 插件要从“声明式扩展配置”升级为“有生命周期、有能力边界的运行单元” | 插件是否能被安装、启用、挂载、限制、停用并留下审计？ |
| Event-driven application flow foundation | V2 的关键不是把 DB 换掉，而是把关键行为事件化 | 关键课堂行为是否能形成 canonical event stream，而不是 Action 直写后消失？ |
| Realtime transport evolution foundation | 课堂实时能力要从“单点 SSE 功能”演进成“可替换 transport 的 runtime 通道” | 同一类 runtime/classroom 事件能否通过统一 transport boundary 分发？ |
| Observability + auditability foundation | AI-safe execution、plugin safety、runtime debugging 都离不开可观测性与审计 | 我们能否解释“谁在何时以什么能力做了什么，系统如何响应”？ |

## Table Stakes

这些不是“加分项”，而是 **v2.0 如果没有，V2 架构就还只是图纸**。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Runtime session model | Runtime 必须有独立于 lesson step 的运行实体，否则无法承载 sandbox、状态、事件、审计 | Medium | 需要把 `lesson/classroom/session` 与 `runtime instance` 建立显式关联；先支持单 runtime 类型即可。 |
| Sandboxed runtime host for one courseware type | 必须证明“课件运行在 host + sandbox 中”，而不是继续把交互逻辑写死在主应用里 | High | 首发只支持一个 runtime-hosted step variant，推荐 `HTML courseware` + iframe sandbox。 |
| TeachingBridge-style runtime bridge | Runtime 与主系统必须有标准桥接接口，否则每种课件都会自造协议 | Medium | 最小 API 至少包含 `ready`、`event`、`save`、`submit`。 |
| Canonical runtime/event envelope | 关键动作必须被统一建模为事件，否则无法做插件消费、回放、审计、通知 | High | 先定义事件 schema、producer、consumer、持久化；不要求一开始就上复杂分布式总线。 |
| Durable event log for classroom/runtime actions | 没有 durable event log，就没有 V2 的 replay、analytics、audit 起点 | High | 至少覆盖 runtime ready、step opened、student interaction、submission、teacher control、plugin action allowed/denied。 |
| Plugin manifest v2 with capabilities | 插件必须声明自己能做什么，而不是只声明 UI slot/hook | Medium | 在现有 manifest 基础上扩展 lifecycle、runtime type、capabilities、requested permissions。 |
| Plugin lifecycle state machine | “已注册”不等于“可运行插件” | Medium | 最小状态：installed / enabled / mounted / ready / suspended / disabled / failed。 |
| Capability enforcement at runtime boundary | AI-safe / plugin-safe 的底线 | High | 插件或 runtime 发起动作时，系统必须在 action dispatch 前校验 capability。 |
| Transport abstraction for live runtime events | 不能继续把 SSE 当成唯一产品语义；产品语义应独立于 transport | Medium | 首发可保留 SSE adapter，但要抽象成 transport gateway，为后续 WebSocket 留口。 |
| Runtime audit + developer inspector | 新平台没有调试面就不可落地 | Medium | 至少要有 session timeline / event list / denied actions / runtime health view。 |

### Table-stakes MVP recommendation

优先交付以下 5 个 table stakes：

1. **Runtime session model**
2. **Sandboxed HTML courseware runtime host**
3. **TeachingBridge bridge + canonical event envelope**
4. **Plugin manifest v2 + capability enforcement**
5. **Runtime timeline / audit inspector**

如果这 5 个没有一起闭环，v2.0 很容易退化成“改目录结构 + 加几张表”。

## Differentiators

这些特性不是所有课堂系统都会立刻具备，但它们最能证明 OpenLearn Next 的 V2 方向是对的，而且是 **本 milestone 值得做的差异化证明点**。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Runtime-hosted interactive courseware step | 证明课堂步骤已经从“内建页面组件”升级为“平台托管执行单元” | High | 最好让教师能在 lesson 中插入一种 `runtime` 步骤并发布运行。 |
| Session timeline with cross-actor event trace | 教师/开发者能看见 teacher、student、runtime、plugin 的统一时间线 | Medium | 这是“事件驱动真的存在”的最直观证据。 |
| Plugin capability denial with visible audit trail | 不是只说“安全”，而是把拒绝过程产品化可见 | Medium | 例如插件试图发送未授权 action，被拒绝并记录 reason。 |
| Unified safe-execution contract for runtime + plugin + AI-ready actions | 为后续 AI runtime 铺路，而不在 v2.0 过早做完整 AI agent runtime | High | 先统一 action/capability/audit 边界，后续 AI 只是在同一安全面内落位。 |
| Transport-agnostic classroom/runtime event channel | 教室控制、runtime 事件、插件响应逐步走向同一实时模型 | Medium | 本 milestone 不必完整迁移到 WebSocket，但必须把 transport boundary 建出来。 |

### Most valuable differentiators for v2.0

- **Differentiator 1: Runtime-hosted interactive courseware step**  
  这是最强的用户可见证明：教师和学生都能感知“平台真的变了”。

- **Differentiator 2: Cross-actor audit timeline**  
  这是最强的开发者/平台证明：团队能调试、解释、约束 runtime/plugin 行为。

## Anti-Features

这些功能很诱人，但如果放进 v2.0，会把 milestone 从“基础平台落地”拖成“无限架构试验场”。

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full multi-runtime support from day one | 一次支持 HTML、Reveal.js、Blockly、Three.js、WASM 会把接口和调试面全部打散 | 先只落地一个 runtime type，推荐 HTML courseware。 |
| Plugin marketplace | 市场、分发、版本兼容、信任链、审核流程都不是基础平台验证的必要条件 | 先做本地/内置 sample plugin 安装与启停。 |
| Arbitrary remote plugin code execution | 直接破坏 K-12 安全边界和 capability 模型 | 只支持受控内置或受信任打包插件，仍通过 manifest + capability + sandbox。 |
| Full AI agent runtime in this milestone | AI runtime 会引入 tool orchestration、memory、provider policy、成本与评测复杂度 | 先把 action/capability/audit/runtime isolation 打好，AI 作为下一 milestone 落地。 |
| CRDT collaborative editing / whiteboard | 协作编辑会吞掉 realtime、presence、conflict、storage 全部预算 | 本 milestone 只做 runtime event transport foundation。 |
| Full WebSocket migration everywhere | 会把课堂现有稳定 SSE 路径一起拖入大迁移风险 | 保留 SSE 业务能力，但在其上抽出 transport adapter/gateway。 |
| Full infrastructure migration as proof of success | 把 milestone 成败绑到 PostgreSQL/Redis/MinIO 全量迁移，会模糊产品目标 | 优先证明 runtime/event/plugin/audit 边界；存储与总线实现保留可替换接口。 |
| Full replay media system | 视频录屏、白板回放、富媒体重演是单独产品线 | 先做 event timeline replay foundation，而非媒体级 replay。 |
| General third-party step SDK ecosystem | 过早开放 step SDK 会让 contract 不稳定时就对外承诺 | 先用内置 sample runtime plugin 验证 contract。 |
| Autonomous AI classroom control | 与教师主控原则冲突，且风险过高 | 所有 runtime/plugin/AI actions 都必须 approval- or capability-gated。 |

## Smallest Demo Slices

这里的目标不是“最小代码量”，而是 **最小可证明架构成立的切片**。

### Demo Slice A — Runtime-hosted courseware proof

**Audience:** 教师、学生、开发者  
**Why this slice matters:** 它一次性证明 runtime host、sandbox、bridge、event、audit 都不是空壳。

**Flow:**
1. 教师在 lesson editor 中添加一个新的 `runtime courseware` 步骤。
2. 该步骤绑定一个受控的 `HTML courseware` runtime asset。
3. 学生进入课堂后，主应用不是直接渲染业务 JSX，而是通过 runtime host 加载 iframe sandbox。
4. 课件通过 TeachingBridge 发送 `ready` 事件。
5. 学生在课件里完成一次交互，并触发 `event` / `save` / `submit`。
6. 系统将行为写入 canonical event log，并落地一份结构化 submission/result。
7. 教师或开发者可以在 runtime inspector 中看到：runtime ready、interaction event、submit success、actor、timestamp。

**What it proves:**
- Runtime host exists
- Sandbox exists
- Bridge contract exists
- Event-driven flow exists
- Auditability exists

**Success criteria:**
- 有一个真实 lesson step 能通过 runtime host 执行
- 交互和提交不是黑箱，能在 timeline 中看到
- 学生提交结果仍然走受控 server boundary，而不是 runtime 直写 DB

### Demo Slice B — Capability-safe plugin proof

**Audience:** 开发者、平台维护者、学校管理员  
**Why this slice matters:** 它证明插件不只是“配置项”，而是真正受控的运行单元。

**Flow:**
1. 系统安装一个 sample runtime/plugin package。
2. 管理员启用插件，系统记录 lifecycle transition：installed → enabled → mounted → ready。
3. 插件订阅某类课堂/runtime 事件，例如 `runtime.submission.received`。
4. 插件尝试调用一个 allowlisted action，例如 `createNotification`，成功并留下 audit。
5. 插件再尝试调用一个未授权 action，例如越权写课堂控制动作，被 capability layer 拒绝。
6. inspector 中可见 allowed / denied 两条记录与拒绝原因。

**What it proves:**
- Plugin lifecycle exists
- Capability system exists
- Event consumer model exists
- Denial and audit trail exist

**Success criteria:**
- 插件有可见状态流转
- 插件成功消费事件并触发一次安全动作
- 插件越权请求会被明确拒绝并可调试

### Demo Slice C — Realtime transport evolution proof

**Audience:** 教师、学生、开发者  
**Why this slice matters:** 它证明系统不再把“实时”写死成 SSE 页面技巧，而是平台能力。

**Flow:**
1. 教师在课堂中推进到 runtime step。
2. runtime host 与 classroom control 都通过统一 transport gateway 发布 canonical runtime/classroom events。
3. 学生端通过当前 transport adapter 接收事件并更新状态。
4. inspector 能显示 event 从 producer 到 transport 到 consumer 的链路状态。

**What it proves:**
- 实时产品语义已从 transport 解耦
- 未来 WebSocket 迁移有边界，而不是大改所有页面

**Note:**
这个切片可以放在 Demo A/B 之后；它是 foundation proof，不一定要成为 milestone 最炫的用户功能。

## Dependency Notes

### Build order

```text
1. Runtime/event domain contracts
   ↓
2. Runtime session persistence + canonical event log
   ↓
3. Runtime host + TeachingBridge + HTML courseware slice
   ↓
4. Plugin manifest v2 + lifecycle + capability enforcement
   ↓
5. Transport abstraction / gateway
   ↓
6. Inspector, audit timeline, and operator tooling
```

### Dependency rationale

1. **先定义 contracts，再做 UI**  
   如果没有统一的 runtime session、event envelope、action result、capability verdict，后面的 host、plugin、audit 都会各写各的。

2. **先做一个 runtime type，不要先做 runtime framework 大而全**  
   HTML courseware 是最小可验证切口；它比 Reveal/Blockly/WASM 更适合作为第一条证明链。

3. **插件系统依赖事件模型，不应先于事件模型开工**  
   插件最有价值的地方不是“渲染一个块”，而是“消费事件并通过安全动作影响系统”。

4. **transport 演进依赖 canonical event，而不是反过来**  
   先有统一事件，再决定走 SSE adapter 还是 WebSocket adapter，才不会把产品语义绑死在传输技术上。

5. **observability 不是最后补日志，而是平台 feature**  
   对 v2.0 来说，inspector/timeline/audit 本身就是用户可见的开发者产品能力，应该与 runtime/plugin 同步建设。

### Feature dependencies

```text
Canonical event envelope → durable event log
Durable event log → runtime inspector
Runtime session model → sandboxed runtime host
Sandboxed runtime host → runtime-hosted courseware step
Canonical event envelope → plugin event consumers
Plugin manifest v2 → lifecycle state machine → capability enforcement
Canonical event envelope → transport abstraction
Capability enforcement + event log → auditability / AI-safe execution foundation
```

### Recommended milestone cut line

**Must ship in v2.0:**
- one runtime-hosted courseware type
- runtime session + event log
- plugin lifecycle + capability enforcement
- transport abstraction boundary
- audit timeline / inspector

**Can wait until v2.1+:**
- second runtime type
- plugin marketplace
- full AI runtime
- CRDT collaboration
- broad WebSocket migration
- media-grade replay

### Best end-to-end demo flows for milestone review

1. **Teacher launches a lesson with a runtime-hosted HTML courseware step; student interacts and submits; teacher/dev sees the full runtime timeline.**  
   这是最好的“架构变成产品”的证明。

2. **Admin enables a sample plugin that consumes runtime events, performs one allowed action, one denied action, and exposes both results in the audit inspector.**  
   这是最好的“平台能力真的受控可运营”的证明。
