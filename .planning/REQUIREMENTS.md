# Requirements: OpenLearn Next

**Defined:** 2026-05-21
**Milestone:** v3.0 AI Native Educational OS Upgrade
**Core Value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## v3.0 Requirements

### Platform Boundary & Vocabulary

- [x] **BOUND-01**: 平台维护者可以在文档与代码中用统一 vocabulary 区分 `command`、`action`、`event`、`task`、`runtime transport`。
- [x] **BOUND-02**: 平台维护者可以在 `platform-core` 层找到命令执行、action 注册、lifecycle orchestration、event outbox 的 authoritative ownership，而不是继续散落在 ad-hoc 文件中。
- [x] **BOUND-03**: 系统继续把 SQLite + DAL 作为 canonical truth，并显式限制 Redis、BullMQ、WebSocket 只承担 delivery / orchestration。
- [x] **BOUND-04**: 平台维护者可以依赖正式的 deferred 清单，防止 QuickJS、Extension Host、PostgreSQL、Workflow Engine 等高风险能力被偷偷纳入 `v3.0` committed scope。

### Command Bus Foundation

- [ ] **CMD-01**: 平台调用方可以提交带有 `id`、`type`、`actor`、`scope`、`payload`、`correlation metadata` 的 `PlatformCommand`。
- [ ] **CMD-02**: 系统会对每个 command 统一执行 `validate -> authorize -> execute -> record result` 的 pipeline。
- [ ] **CMD-03**: 插件生命周期核心动作通过 Command Bus v1 执行，而不是继续直连旧 plugin action / service seam。
- [ ] **CMD-04**: Command Bus 会把每次执行写入 durable command ledger，并保留 success / failure summary。
- [ ] **CMD-05**: `install`、`enable`、`disable`、`retry` 等重复敏感命令支持 idempotency / dedupe key。

### Dynamic Action Registry

- [x] **ACTN-01**: 平台维护者可以为 built-in 与 plugin action 统一注册 typed descriptor，包括 owner、schema、capability、side-effect metadata。
- [x] **ACTN-02**: 系统会拒绝冲突或重复 action key 注册，而不是静默覆盖。
- [x] **ACTN-03**: 系统只在 plugin install / enabled / lifecycle 条件满足时暴露 action。
- [x] **ACTN-04**: 平台调用方可以用 machine-readable 方式列出当前可用 action catalog。
- [x] **ACTN-05**: Action registry 只解析主仓库受控实现，不执行远程脚本或插件自带代码。

### Formal Plugin Lifecycle

- [x] **LIFE-01**: 学校操作员可以区分 `installed`、`enabled`、`active`、`suspended`、`uninstalled` 语义。
- [x] **LIFE-02**: 系统会按依赖顺序激活插件，并在缺依赖或循环依赖时阻止半启动状态。
- [x] **LIFE-03**: 插件激活失败可以归因到具体插件或模块，而不是只暴露平台整体失败。
- [x] **LIFE-04**: `disable` / `suspend` 会停止插件运行能力，但默认保留数据和历史记录。
- [x] **LIFE-05**: `uninstall` 前会执行 preflight，并明确 retention / cleanup 影响。
- [x] **LIFE-06**: built-in / default plugins 复用同一 lifecycle model，而不是保留特权路径。

### Platform Event Bus & Observability Hooks

- [ ] **EVNT-01**: command 成功后会产生 typed platform event，与 command envelope 明确分离。
- [ ] **EVNT-02**: 平台事件会写入 durable event outbox / ledger，并关联 `commandId`、`correlationId`、`causationId`。
- [ ] **EVNT-03**: 插件、审计、分析和 future workflow / agent 订阅者可以消费 platform events，而不依赖 classroom runtime transport bus。
- [ ] **EVNT-04**: 系统可以把 platform events 桥接到 in-process、Redis、WebSocket delivery adapters，但不改变 SQLite truth ownership。
- [ ] **EVNT-05**: command、event、task、audit 共享统一 correlation metadata。
- [ ] **EVNT-06**: command handlers 返回 invalidation intent，使入口层能统一 `updateTag()` / `revalidateTag()`。
- [ ] **EVNT-07**: 平台维护者可以在最小 operator surface 查看 command / event execution summary 与 failure attribution。

### AI-Native Contract Exposure

- [x] **AINT-01**: 平台调用方可以列出 commands、actions、capabilities 的 machine-readable descriptors。
- [x] **AINT-02**: 每个 descriptor 都声明 input schema、required capability、side-effect class、stability / version metadata。
- [ ] **AINT-03**: command、event、audit metadata 支持 human actor、system actor、plugin actor、delegated agent actor。
- [ ] **AINT-04**: delegated agent action 可以携带 delegation / approval metadata，而不是默认高权限执行。
- [x] **AINT-05**: `v3.0` 交付 agent-callable contracts，而不要求完整 Agent Runtime / Skill Runtime 落地。

## Future Requirements

### Advanced Runtime Isolation

- **FUT-01**: 插件可以在 Extension Host 或其他独立宿主中运行，以降低 UI/主进程耦合。
- **FUT-02**: 平台可以为受信或第三方扩展提供更强隔离级别的 sandbox runtime。

### Workflow & AI Runtime Expansion

- **FUT-03**: 平台可以在 command / event contracts 之上接入正式 Workflow Engine。
- **FUT-04**: 平台可以在 machine-readable contracts 之上接入完整 Agent Runtime、Skill Runtime 与 approval workflow。

### Infrastructure Evolution

- **FUT-05**: 当 SQLite-first 不再满足规模需求时，平台可平滑演进到 PostgreSQL / pgvector 等更重型存储拓扑。

## Out of Scope

| Feature | Reason |
|---------|--------|
| QuickJS / arbitrary JS plugin execution | 与当前安全边界冲突，且会把本阶段从 contract 收口拖向 sandbox 工程 |
| Extension Host / 多进程插件宿主 | 属于后续高隔离阶段，不是第一阶段平台内核必需项 |
| PostgreSQL / pgvector cutover | 当前仍坚持 SQLite-first，本 milestone 不偷跑存储拓扑迁移 |
| Workflow Engine / Temporal | 这轮先建立 command / event 平台 contract，而不是直接引入 workflow runtime |
| Full Agent Runtime / Skill Runtime | 本轮只交付 agent-callable contracts，不交付完整 AI runtime |
| 分布式 Event Bus / Kafka / Redis Streams truth source | Redis 与队列只能做 delivery/orchestration，不能取代 SQLite canonical truth |
| classroom realtime rewrite | `v2.2` 已完成 transport cutover，本轮不重开课堂实时主链路 |
| 把未完成 `v2.4` scope 全部自动并入 | `v2.4` 作为冻结上下文保留，但不自动成为 `v3.0` committed scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOUND-01 | Phase 50 | Completed |
| BOUND-02 | Phase 50 | Completed |
| BOUND-03 | Phase 50 | Completed |
| BOUND-04 | Phase 50 | Completed |
| CMD-01 | Phase 51 | Pending |
| CMD-02 | Phase 51 | Pending |
| CMD-03 | Phase 51 | Pending |
| CMD-04 | Phase 51 | Pending |
| CMD-05 | Phase 51 | Pending |
| ACTN-01 | Phase 52 | Complete |
| ACTN-02 | Phase 52 | Complete |
| ACTN-03 | Phase 52 | Complete |
| ACTN-04 | Phase 52 | Complete |
| ACTN-05 | Phase 52 | Complete |
| LIFE-01 | Phase 52 | Complete |
| LIFE-02 | Phase 52 | Complete |
| LIFE-03 | Phase 52 | Complete |
| LIFE-04 | Phase 52 | Complete |
| LIFE-05 | Phase 52 | Complete |
| LIFE-06 | Phase 52 | Complete |
| EVNT-01 | Phase 53 | Pending |
| EVNT-02 | Phase 53 | Pending |
| EVNT-03 | Phase 53 | Pending |
| EVNT-04 | Phase 53 | Pending |
| EVNT-05 | Phase 53 | Pending |
| EVNT-06 | Phase 53 | Pending |
| EVNT-07 | Phase 53 | Pending |
| AINT-01 | Phase 54 | Complete |
| AINT-02 | Phase 54 | Complete |
| AINT-03 | Phase 54 | Pending |
| AINT-04 | Phase 54 | Pending |
| AINT-05 | Phase 54 | Complete |

**Coverage:**
- v3.0 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-21*  
*Last updated: 2026-05-21 after Phase 50 closure and requirement status sync*
