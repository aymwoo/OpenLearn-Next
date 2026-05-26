# REQUIREMENTS

**Current milestone:** `v3.1 Single-School Pilot Production Readiness (Plugin-First)`
**Status:** Active
**Sample plugin:** classroom voting plugin
**Sample chain:** teacher design -> publish -> launch -> student completion -> teacher/operator verification
**Pilot capacity target:** 40 students per classroom, 5 simultaneous classrooms

## Validated Baseline

以下能力已存在，应在 `v3.1` 中被视为 baseline，而不是待建设缺口：

- Next.js 16 + React 19.2 + Turbopack 主栈。
- Auth.js v5 + Drizzle ORM + SQLite/libSQL。
- DAL + Server Actions only 数据访问边界。
- WebSocket-first classroom transport。
- optional Redis fanout 多实例 delivery 能力与 degraded posture 暴露。
- BullMQ + dedicated worker + SQLite task ledger 异步执行层。
- plugin lifecycle / command / event / operator observability 基础。
- lesson editor / publish / classroom runtime / student progress 的主链路基础。

## Active Requirements

### PILOT

- [ ] **PILOT-01**: `v3.1` 必须正式固定为“单校试点生产可用（插件先行）”，并明确首个真实样板是课堂投票插件。 Phase: 55
- [ ] **PILOT-02**: milestone 必须前置定义 success criteria、failure taxonomy、recovery matrix 与 proof artifacts，而不是在 close 时补写。 Phase: 55
- [ ] **PILOT-03**: 试点容量口径必须量化为单课堂 40 名学生、同时 5 个课堂，并进入 close gate。 Phase: 55, 60

### PLUG

- [ ] **PLUG-01**: 课堂投票插件必须具备正式的 action resolve / dispatch / result contract，而不是只停留在 descriptor 或 registry 展示。 Phase: 56, 57
- [ ] **PLUG-02**: 教师只能在 authoring 与 publish 路径中使用当前学校可用、已启用、版本兼容的课堂投票插件能力。 Phase: 56
- [x] **PLUG-03**: 插件失败必须有明确 taxonomy，并为 operator 暴露可执行的 retry / reconcile / suspend / fallback 等恢复动作。 Phase: 57, 58

### CHAIN

- [ ] **CHAIN-01**: lesson editor 必须支持课堂投票插件步骤的正式配置、schema validation、默认值与错误回显。 Phase: 56
- [ ] **CHAIN-02**: publish / republish 必须冻结课堂投票插件配置到可执行版本，并执行 preflight / compatibility gate。 Phase: 56
- [ ] **CHAIN-03**: classroom launch 必须验证样板课 readiness，并绑定正确的 runtime snapshot 与 plugin execution context。 Phase: 57
- [ ] **CHAIN-04**: 学生端必须能真实参与课堂投票、提交结果，并把结果写回 canonical progress / submission / evidence truth。 Phase: 57
- [ ] **CHAIN-05**: 教师端必须能看到课堂投票结果、完成率、失败情况或未响应名单，而不是只有原始日志。 Phase: 57, 58

### OPS

- [x] **OPS-01**: operator 必须能按 school / classroom / lesson version / plugin / action / command / task 关联定位问题。 Phase: 58, 59
- [x] **OPS-02**: Redis degraded、worker lag、transport fallback、plugin disabled 等降级姿态必须诚实暴露在 operator surface。 Phase: 58, 60
- [x] **OPS-03**: operator 与 support 必须能在不改库的前提下执行恢复动作，并有最小 runbook。 Phase: 58

### ENVR

- [x] **ENVR-01**: 环境变量必须通过正式 env schema 与 `.env.example` 收敛，避免手改常量上线。 Phase: 59
- [x] **ENVR-02**: CI/CD 必须覆盖 lint、typecheck、test、build、migrate 与 health-check gate。 Phase: 59
- [x] **ENVR-03**: 发布必须具备 release traceability、rollout checklist 与 rollback checklist。 Phase: 59, 60

### SAFE

- [ ] **SAFE-01**: SQLite + DAL 必须继续作为唯一 durable truth；Redis、WebSocket、BullMQ 只能作为 delivery 或 orchestration substrate。 Phase: 56, 57
- [x] **SAFE-02**: 样板链路中的关键写操作必须具备强校验、幂等/去重、补偿或 replay-safe 语义。 Phase: 56, 57, 58
- [ ] **SAFE-03**: SQLite 与附加资产必须具备备份恢复、restore drill 与恢复后校验。 Phase: 59, 60

### LOAD

- [ ] **LOAD-01**: 必须有面向课堂投票样板的定向压测，覆盖 40/5 容量假设。 Phase: 60
- [ ] **LOAD-02**: 必须验证 degraded、reconnect、worker backlog、retry 与 partial failure 场景，而不是只验证 happy path。 Phase: 60

## Phase Traceability

| Phase | Scope | Requirements |
|-------|-------|--------------|
| 55 | Freeze pilot scope and acceptance gate | PILOT-01, PILOT-02, PILOT-03 |
| 56 | Voting plugin contract and authoring integration | PLUG-01, PLUG-02, CHAIN-01, CHAIN-02, SAFE-01, SAFE-02 |
| 57 | Classroom runtime sample chain | PLUG-01, PLUG-03, CHAIN-03, CHAIN-04, CHAIN-05, SAFE-01, SAFE-02 |
| 58 | Operator recovery and production surfaces | PLUG-03, OPS-01, OPS-02, OPS-03, SAFE-02 |
| 59 | Deploy, release, and recovery baseline | OPS-01, ENVR-01, ENVR-02, ENVR-03, SAFE-03 |
| 60 | Load, degrade, and pilot rehearsal | PILOT-03, OPS-02, ENVR-03, SAFE-03, LOAD-01, LOAD-02 |

## Out of Scope

- 多校多租户完整 SaaS 运营体系。
- 通用 plugin marketplace、商店化生态与安装评分系统。
- Classroom realtime 主链路重写。
- BullMQ/worker 重写、第二套 workflow engine、Agent Runtime / Skill Runtime 真执行。
- PostgreSQL/pgvector primary cutover、Kafka/NATS/Redis Streams、Kubernetes/Helm/ArgoCD。
- Prometheus/Grafana/Loki/ELK 等重型 observability 平台建设。
- 任意第三方远程插件执行、QuickJS sandbox、Extension Host、多进程插件宿主。

## Notes

- 所有 `v3.1` 任务都必须能回挂到“课堂投票插件”真实样板链路，无法挂靠的工作默认 defer。
- 所有 production readiness 工作都必须以 SQLite + DAL truth 为中心设计恢复与验证路径。
- 所有 phase 都应在 kickoff 时定义 proof artifacts，而不是 close 时补写。
