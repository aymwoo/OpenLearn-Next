# Architecture Research — OpenLearn Next v3.1

**主题：** 单校试点生产可用，插件能力先行，课堂互动插件 + 教师设计到学生课堂完成作为真实样板  
**Researched:** 2026-05-24  
**Confidence:** HIGH

## Existing Architecture Baseline

v3.1 不应重写架构，而应建立在已经完成的 v2.0 / v2.2 / v2.3 / v3.0 基线之上继续加层。当前已经成立的骨架如下：

### 1. 已成立的系统主骨架

- **Next.js 16 App Router 单体** 仍是唯一应用承载体。
- **React 19.2 + Server Actions + DAL** 已经形成正式写路径。
- **SQLite + Drizzle + centralized migrations** 是唯一 durable truth 存储。
- **WebSocket-first classroom transport** 已经承接课堂实时交付；SSE 仅保留 rollback surface。
- **Redis / ioredis fanout** 已是 optional delivery substrate，不持有业务真相。
- **BullMQ + dedicated worker + SQLite task ledger** 已是 async orchestration substrate，不持有业务真相。
- **v3.0 Command Bus / action registry / plugin lifecycle governance / platform event ledger** 已经提供平台内核基础，不需要另起第二套平台。

### 2. 现有 authoritative write path

v3.1 必须延续现有权威写路径，而不是引入旁路：

```text
UI / teacher action / student submit / plugin command / operator action
  -> Server Action / Node entrypoint
  -> Command Bus or domain application service
  -> DAL
  -> SQLite
  -> audit / ledger / outbox
  -> delivery substrate (WebSocket / Redis / BullMQ) 负责分发或编排
```

这里最重要的结论是：

- **课堂状态真相** 在 SQLite，不在 WebSocket channel。
- **任务执行真相** 在 SQLite task ledger，不在 BullMQ queue。
- **插件治理真相** 在 SQLite governance / lifecycle / command / event ledger，不在内存 registry。
- **缓存只是一层投影**，不是事实源。

### 3. v3.1 的正确定位

v3.1 的目标不是“平台升级第二次重构”，而是把已有平台能力接到**单校试点可生产运行**所需的系统层：

1. 让真实课堂互动插件可以走完整链路。
2. 让 operator 可以部署、观测、恢复、降级，而不是只看开发者日志。
3. 让单校试点环境具备 backup / recovery / load test / degraded honesty。
4. 让“教师设计 -> 发布 -> 开课 -> 学生参与 -> 课堂证据 -> 插件产物”成为真实样板链，而不是 demo-only proof。

---

## Integration Points

v3.1 应优先通过“接入点”推进，而不是新增大块平行系统。

### 1. 平台内核接入点

#### A. Command Bus 继续作为统一系统动作入口

新 milestone 的新增系统动作都应复用 v3.0 command path：

- plugin install / enable / disable / reconcile
- classroom interaction plugin trigger
- operator retry / replay / degrade / resume
- post-class async projection
- backup / recovery operator commands

**建议：** v3.1 新增能力不要直接挂在独立 service helper 或 route handler 内，应统一通过 command producer 接入。

#### B. Dynamic Action Registry 作为 discoverability 与装配面

v3.1 不需要新建第二套 plugin runtime。应让课堂互动插件继续使用：

- 现有 action descriptor contract
- capability gating
- lifecycle-aware registry projection
- command-backed execution

**正确方向：** 动态的是“可发现元数据”和“可用性状态”，静态的是“仓库内受控实现”。

#### C. Platform Event / Runtime Transport / Async Queue 三层分离

v3.1 要明确三条线不能混：

| 层 | 作用 | 是否 durable truth |
|---|---|---|
| Platform Event Ledger | 平台事实事件、审计、插件治理、operator 时间线 | 否，但其事实来自 SQLite authoritative write |
| WebSocket / Redis fanout | 课堂实时交付、teacher/student 同步 | 否 |
| BullMQ worker | 长任务编排、重试、异步投影 | 否 |

### 2. 产品主链路接入点

v3.1 应围绕一个真实样板链来接：

```text
教师设计 lesson
  -> lesson publish
  -> classroom launch
  -> student runtime follow / interact / submit
  -> classroom interaction plugin consume event / command
  -> plugin 写回受控产物或证据
  -> operator / teacher 可见结果
```

建议把这条链作为 v3.1 的 architecture anchor。所有新增系统层都必须回答：

- 它接在这条链的哪一段？
- 它是否绕过了 SQLite + DAL？
- 它失败时谁可见？
- 它降级时课堂主链能否继续？

### 3. 现有 feature root 的推荐挂接位置

| 系统层 | 推荐落点 | 说明 |
|---|---|---|
| 课堂编排与发布 | 继续留在 lesson / editor / publish 现有 feature roots | 不重写 authoring 主体 |
| 课堂运行与 transport | 继续留在 runtime-platform / classroom transport | 不重开 WebSocket blast radius |
| 插件治理与样板插件 | platform-core + plugin feature root | 通过 action/command/lifecycle 接线 |
| 异步投影 / summary / post-processing | async-tasks | 只做 orchestration，不持有真相 |
| operator surfaces | settings / operator / diagnostics surfaces | 面向部署与运行，不污染教师主产品心智 |
| observability / backup / recovery | platform ops layer + worker / transport adapters | 属于生产层，不属于教学领域对象本身 |

---

## New Production Layers

v3.1 真正新增的不是新的业务核心，而是“生产可用层”。建议按以下层次补齐。

### 1. Deployment Layer

目标：支撑**单校试点生产可用**，但仍保持单体内平台化。

#### 推荐部署拓扑

```text
[Next.js app / Node runtime]
  - App Router
  - Server Actions
  - Command Bus producers
  - WebSocket transport host

[SQLite authoritative database]
  - app truth
  - command/event/governance/task ledger

[Worker process]
  - BullMQ processors
  - post-class projections
  - backup jobs / maintenance jobs

[Redis optional]
  - WebSocket fanout
  - BullMQ queue transport
  - degraded if unavailable, but system truth remains intact
```

#### 部署原则

- **单校试点优先单区、低复杂度部署**，不要引入多 region、多主数据库、分布式 event bus。
- **应用节点、worker 节点可分离**，但都只通过 DAL / command contracts 接 SQLite truth。
- **Redis 是加速与编排组件**，不可成为“必须才能读到课堂状态”的真相源。
- **备份、恢复、迁移、灰度开关** 必须有 operator 可操作入口，而不是只靠 shell 手工执行。

### 2. Operator Surfaces

v3.1 必须把生产操作面当成正式系统层，而不是零散后台页面。

#### 应该落在 operator surface 的内容

| operator surface | 系统层 | 应展示内容 |
|---|---|---|
| Transport health | runtime transport layer | WebSocket online ratio、Redis fanout posture、SSE fallback status |
| Task health | async-tasks layer | queue backlog、attempt history、dead-letter、safe retry |
| Plugin governance | platform-core layer | installation、lifecycle、dependency failure、reconcile、kill switch |
| Command / event timeline | platform-core ledger layer | commandId、actor、scope、result、causation |
| Backup / recovery console | ops layer | last backup time、restore readiness、snapshot validity |
| Load / degradation dashboard | ops + delivery layer | queue lag、broadcast lag、DB write latency、degraded mode flags |

#### 关键判断

operator surface 必须**消费正式 read models**，不能重新本地拼装 raw DTO 推断状态。否则生产时看到的状态会和真实执行不一致。

### 3. Plugin Sample Chain

v3.1 必须优先做“真实样板插件链”，因为这是插件先行路线的最佳证明。

#### 推荐样板：课堂互动插件链

建议选择一个不会破坏主课堂模型、但能证明插件价值的链路，例如：

1. 教师在 lesson editor 配置互动步骤或互动插件参数。
2. lesson publish 时生成正式 plugin-bound runtime config。
3. classroom launch 时 plugin activation snapshot 进入当前 session。
4. 学生在课堂中完成互动输入、投票、简答、快速反馈或小任务提交。
5. runtime authoritative write path 先写 SQLite。
6. plugin 通过 command/event contract 消费事实并生成派生产物：
   - 课堂互动统计
   - 教师即时提示
   - 课后 summary artifact
   - 学生参与证据聚合
7. teacher / operator 在正式 read model 中可见。

#### 样板链的边界要求

- plugin **不能直接写 DB**。
- plugin **不能直接操作 transport channel** 作为事实提交。
- plugin **不能把 Redis / WebSocket message 当事实源**。
- plugin 只能通过：
  - action descriptor
  - command bus
  - governed core API
  - post-commit platform events

#### 为什么先做这条链

因为它同时覆盖：

- teacher design
- plugin configuration
- classroom runtime
- student interaction
- evidence capture
- async projection
- operator observability

这比单独做 marketplace、plugin install UI 或纯 demo action 更能检验架构是否成立。

### 4. Observability Layer

v3.1 的 observability 应明确分层，不要只堆 logs。

#### 最低要求

| 观测对象 | 应落层 | 观测键 |
|---|---|---|
| command execution | platform-core | commandId / correlationId / actor / scope / result |
| plugin lifecycle | governance layer | pluginId / installation / lifecycle state / failure reason |
| classroom transport | transport layer | sessionId / connection count / fanout lag / fallback posture |
| async jobs | worker layer | taskId / queue / attempts / duration / failure class |
| DB truth writes | DAL / SQLite layer | entity id / write latency / error class / migration version |

#### 观测原则

- **command 是系统动作主索引**。
- **sessionId 是课堂运行主索引**。
- **taskId 是异步执行主索引**。
- **pluginInstallationId / pluginId 是插件治理主索引**。

建议在 v3.1 统一这些 trace keys，并让 operator UI 可跨层跳转，而不是每个子系统各有一套无法关联的 ID。

### 5. Backup / Recovery Layer

这部分是单校试点生产可用的硬门槛，且必须落在 durable truth 边界之上。

#### 应落在哪一层

- **SQLite snapshot / backup**：durable truth layer
- **command / event / task / governance ledger backup**：同属 durable truth layer
- **Redis state**：不做 authoritative backup；允许 cold rebuild
- **BullMQ queue transient state**：不做 authoritative backup；由 SQLite ledger + retry/reconcile 恢复
- **WebSocket connection state**：不做 backup；由 reconnect + session snapshot 恢复

#### 恢复原则

1. 先恢复 SQLite authoritative state。
2. 再由 ledger / snapshot / reconcile 重建 delivery/orchestration 层。
3. 再开放 operator resume / retry / replay。

**结论：** 恢复策略必须是“truth-first, substrate-rebuild-later”，不能相反。

### 6. Load Test Layer

v3.1 必须把 load test 放在系统层而不是页面层思考。

#### 应覆盖的层

| 测试面 | 主要层 | 关注指标 |
|---|---|---|
| 教师设计与发布 | app + DAL + SQLite | publish latency、cache invalidation correctness |
| 课堂进入与同步 | transport + runtime | join latency、fanout lag、fallback correctness |
| 学生互动提交 | runtime write path + DAL + SQLite | write latency、duplicate protection、truth consistency |
| 插件后处理 | command/event/worker | backlog、projection delay、retry correctness |
| operator diagnostics | read model layer | freshness、cross-system consistency |

#### 负载测试结论

对 v3.1 来说，最应该测的不是极限并发，而是：

- 单校真实班级规模下，是否仍然保持一致性与可观测性。
- Redis 不稳定时，课堂主链是否还能 honest degrade。
- worker 积压时，课堂实时主链是否仍不被拖垮。
- backup / restore 后，是否能重建 operator truth view。

---

## Durable Truth Boundaries

这一节是 v3.1 最关键的架构原则，必须写死。

### 1. Authoritative durable truth

以下内容只能由 **SQLite + DAL + canonical write path** 持有：

- users / memberships / auth-related persistent state
- courses / lessons / published versions / step configuration
- classroom sessions / participants / classroom evidence / progress / submissions
- plugin installations / lifecycle transitions / governance audits
- platform command ledger / platform event ledger
- async task ledger / retry state / result summary
- operator-visible recovery / backup metadata

### 2. Delivery / orchestration substrate only

以下组件只能做 delivery 或 orchestration substrate：

| 组件 | 允许角色 | 禁止角色 |
|---|---|---|
| Redis | fanout、queue transport、ephemeral coordination | 业务真相、插件状态真相、课堂状态真相 |
| WebSocket | 实时消息交付、连接会话 | durable classroom truth、submission truth |
| BullMQ | 异步执行编排、retry/backoff、worker dispatch | task truth source、业务事实源 |
| in-memory registry/cache | 加速读取、运行时装配 | authoritative lifecycle / capability truth |

### 3. Command / event / task 的真相关系

- **Command**：系统请求动作，authoritative record 应写入 SQLite ledger。
- **Event**：command 或 domain write 之后的事实投影，authoritative record 也应进入 SQLite ledger/outbox。
- **Task**：异步执行载体，其 durable progress 仍应回写 SQLite task ledger。

即使实际执行时经过 Redis/BullMQ/WebSocket，它们也只是“运输层”。

### 4. v3.1 明确禁止的错误方向

- 让 plugin runtime state 只存在 Redis/in-memory。
- 让 WebSocket ack 成为学生提交成功的唯一依据。
- 让 BullMQ job status 成为 operator 唯一可信状态。
- 为了方便而让 plugin sample chain 直接写某张 plugin-owned 表绕过 DAL。
- 在生产层引入第二套 truth database 或 event sourcing rewrite。

---

## Suggested Build Order

v3.1 的 build order 应是“先接真实样板链，再补生产层支撑”，而不是先搭一个大而空的 ops shell。

### Phase 1 — Freeze v3.1 integration contract

**目标：** 把 v3.1 作为“接入现有架构”的 milestone 明确写死。  
**应完成：**

- 明确单校试点 deployment topology
- 明确 durable truth boundary 文档与 code ownership
- 明确 plugin sample chain 的 authoritative flow
- 明确 operator surfaces 分层

**Integration points:** PROJECT / roadmap / operator read model contracts / deployment runbook。

### Phase 2 — Plugin sample chain first

**目标：** 先做“教师设计 -> 学生课堂完成 -> plugin 产物”真实链路。  
**应完成：**

- lesson editor 的 plugin-bound config contract
- publish 到 classroom launch 的 activation wiring
- student interaction -> authoritative write -> plugin post-commit consumption
- teacher / operator 可见结果

**为什么先做：** 没有真实样板链，后续 observability / load test / backup 都会失焦。

### Phase 3 — Production operator surfaces

**目标：** 让部署与运行可见。  
**应完成：**

- transport health
- plugin governance diagnostics
- task backlog / retry surfaces
- command / event timeline viewer
- degraded posture honesty

**Integration points:** settings / operator / labs / diagnostics 现有正式 read models。

### Phase 4 — Observability unification

**目标：** 打通 command、plugin、session、task 四类 trace。  
**应完成：**

- commandId / correlationId / sessionId / taskId 映射
- cross-surface drill-down
- structured logs + metrics + operator-facing summaries
- plugin failure attribution

**Integration points:** platform-core ledger、transport metrics、worker metrics、DAL instrumentation。

### Phase 5 — Backup / recovery hardening

**目标：** 让单校试点具备恢复能力。  
**应完成：**

- SQLite snapshot/backups
- restore runbook 与 operator visibility
- queue / transport rebuild strategy
- reconcile / replay / retry tools

**Integration points:** SQLite truth layer、task ledger、plugin reconcile command、runtime snapshot recovery。

### Phase 6 — Load / degrade verification

**目标：** 证明可生产运行，而不是只在 happy path 下运行。  
**应完成：**

- classroom join / submit / broadcast load tests
- Redis degraded posture tests
- worker backlog tests
- backup/restore 验证
- end-to-end sample chain verification

**Integration points:** verify gates、demo runbook、ops dashboard、closeout artifact。

---

## Phase Sequencing Hints

### 建议顺序原则

1. **先样板链，后平台补强。**
2. **先 authoritative flow，后 operator projection。**
3. **先 SQLite truth recovery，后 Redis/BullMQ rebuild。**
4. **先 honest degradation，后性能优化。**
5. **先复用现有 command / lifecycle / event seams，后考虑扩展新 runtime。**

### 不建议的顺序

- 先做 marketplace 或华丽插件 UI，再补真实课堂链路。
- 先做复杂 observability stack，再没有 sample chain 可观测。
- 先做 Redis/BullMQ 高可用，再没有 SQLite backup/recovery。
- 先做“多校 / 多租户平台化”扩展，忽略单校试点 production hardening。

---

## Integration Points by System Layer

| 主题 | 应接入的系统层 | 不应接入 |
|---|---|---|
| 单校试点部署 | app runtime + SQLite + worker + optional Redis | 新增第二主数据库、分布式事件平台 |
| operator surfaces | formal read models / diagnostics / settings | raw logs-only、local state 推断 |
| plugin sample chain | command bus + action registry + runtime authoritative write path | plugin direct DB writes、transport direct writes |
| observability | platform-core + transport + worker + DAL | 每层各自孤立日志 |
| backup/recovery | SQLite truth layer first，substrate rebuild second | 直接备份 Redis 当业务真相 |
| load test | end-to-end chain + delivery degradation + worker backlog | 只压页面渲染，不测 truth consistency |

---

## Final Recommendation

v3.1 的正确架构路线是：**保持现有单体内平台化骨架不变，以 SQLite + DAL 继续持有唯一 durable truth，把 Redis / WebSocket / BullMQ 明确限制为 delivery/orchestration substrate；然后围绕“课堂互动插件真实样板链”补齐 deployment、operator surfaces、observability、backup/recovery、load verification 这几层生产能力。**

这条路线的优点是：

- 不重写现有架构；
- 不破坏 v2.2 / v2.3 / v3.0 已收口的边界；
- 能以最小 blast radius 证明插件能力先行是成立的；
- 能让 v3.1 真正成为“单校试点生产可用”，而不是另一个 platform-only milestone。

## Sources

- `/home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md` — 当前系统基线、durable truth posture、约束与下一 milestone 目标。Confidence: HIGH.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/MILESTONES.md` — v2.2、v2.3、v3.0 已归档能力与 authoritative handoff。Confidence: HIGH.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md`（旧版）— v3.0 platform-core 接入策略与 build order。Confidence: HIGH.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md` — 现有平台内核研究总结、phase ordering 原则与边界约束。Confidence: HIGH.
