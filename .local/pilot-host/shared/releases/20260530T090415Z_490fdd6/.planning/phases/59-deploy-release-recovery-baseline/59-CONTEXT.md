# Phase 59: Deploy, Release & Recovery Baseline - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把单校试点环境的部署、发布、探活、回滚、备份与恢复收口成正式可重复执行的生产基线，
让课堂投票样板在既有 platform/runtime/operator baseline 之上具备可交付、可回滚、可恢复的环境能力。

Phase 59 建立在 Phase 56-58 已经完成的真实样板链路与 operator recovery surfaces 之上。
它不重做课堂投票 authoring/runtime/operator 产品闭环，不扩张多校 SaaS、重型 observability 平台、Kubernetes、或新的平台抽象。

本阶段的正式职责是：
- 收敛单校试点的官方部署拓扑、env discipline 与启动方式；
- 固定 release traceability、migration gate、health/ready gate 与 rollback posture；
- 定义 backup / restore baseline、restore drill 与 post-restore verification；
- 为 Phase 60 的 load/degrade rehearsal 提供可信的 deploy/recovery 基线。

</domain>

<decisions>
## Implementation Decisions

### Deploy topology and environment baseline
- **D-59-01:** Phase 59 的官方试点部署基线固定为 **single-node dual-process**：同一台主机上运行 `web` 与 `worker` 两个长期进程，而不是把容器编排或平台托管当成主路线。
- **D-59-02:** `web` 继续复用现有 `server.ts` / `pnpm start`，`worker` 继续复用现有 `src/server/workers/async-task-worker.ts` / `pnpm worker:start`；Phase 59 不重写服务宿主。
- **D-59-03:** Redis 在 Phase 59 中的正式地位固定为：**BullMQ worker 的正式依赖，classroom Redis fanout 继续保持 optional / deploy-authoritative posture**。缺失 Redis 时不能把 worker 假装 ready，但 fanout 仍允许 degraded-visible 而非 release blocker。
- **D-59-04:** Phase 59 的官方 deploy artifact 主路线固定为 **systemd + shell scripts**；不把 Docker/compose 作为主交付物，也不接受“只写文档不交付可执行基线”。
- **D-59-05:** env discipline 必须通过正式 env schema 与 `.env.example` 收敛；敏感配置不能继续散落在 source 中的 `process.env` 约定或只存在 `.env.local`。

### Release gate and traceability posture
- **D-59-06:** 每次 pilot release 的唯一主记录固定为 **Git SHA + release manifest**；manifest 必须串起 release 时间、目标环境、migration、gate 结果与操作者，而不是只靠 git tag 或外部平台日志。
- **D-59-07:** 发布前 hard gate 固定包含：`lint`、`typecheck`、`build`、关键测试 / phase verifier、migration gate、post-deploy health/ready gate；这些任一失败都不能算作 release 完成。
- **D-59-08:** migration 必须属于正式 release gate，而不是部署后补跑或由 operator 手工执行的松散步骤。
- **D-59-09:** 如果 migration 或 post-deploy `health/ready` 失败，官方默认动作固定为 **立即回滚到上一个 green release**；不能允许失败 release 带病停留在线上观察。
- **D-59-10:** rollback 必须绑定上一份 green release manifest 与 post-rollback verification，满足 `55-FAILURE-RECOVERY-MATRIX.md` 中的 rollback trigger/post-rollback verification 语义。

### Health and readiness contract
- **D-59-11:** `health` 与 `ready` 采用明确分工：`health = process alive`，`ready = safe to receive pilot traffic`；Phase 59 不做 only-ready 模型，也不让两者都承担同样的全量检查。
- **D-59-12:** `/api/ready` 的 blocking 子系统固定包括：`SQLite / DB`、`web app runtime`、`worker/BullMQ posture`。这些任何一项不 green，都必须让系统 not-ready。
- **D-59-13:** Redis fanout 不进入 Phase 59 的 ready hard gate；它继续保持 optional posture，但必须在 health/ready 响应中以 **non-blocking degraded** 的方式诚实暴露。
- **D-59-14:** health/ready 的返回内容必须服务于 release gate 与 restore verification：不仅给 pass/fail，还要明确组件级 posture，避免 operator/release owner 只能看到布尔值却无法解释失败原因。

### Backup, restore, and recovery baseline
- **D-59-15:** Phase 59 的官方备份对象固定为 **SQLite + 上传/运行资产 + env template**。只备份 SQLite 不足以支撑单校试点恢复；但真实 secrets 不进入备份快照。
- **D-59-16:** SAFE-03 的 restore drill 验收最低标准固定为：**post-restore health/ready green + 样板链路 smoke 通过**；不能只做 DB restore 或 only-health smoke。
- **D-59-17:** 如果 restore drill 或 post-restore smoke 失败，该结果必须被视为 **release blocker**，不能仅记录风险后继续把当前基线宣称为 pilot-ready。
- **D-59-18:** backup / restore posture 必须继续以 SQLite + DAL 作为 canonical truth 中心设计；Redis、WebSocket、BullMQ 都只能在恢复后重新附着，不能反过来决定恢复是否成功。

### the agent's Discretion
- systemd unit 的具体命名、shell script 文件名、目录布局、以及 release manifest 的字段顺序，可由 planner 在不违背 D-59-01 至 D-59-10 的前提下做最小正确收敛。
- env schema 的技术实现可采用集中式 `zod` env module、server/public split 或等价 server-owned 封装，只要满足 `.env.example`、startup validation 与敏感变量不外泄即可。
- health/ready 的 JSON shape、component label 命名、以及 non-blocking degraded 字段名可由 planner 结合现有 operator honesty vocabulary 收敛，但不能把 optional fanout 重新变成隐形状态。
- backup/restore 的具体工具链（例如脚本编排、备份文件命名、资产目录约定）可由 researcher / planner 依据当前仓库与单机试点 posture 做最小实现，但必须满足 D-59-15 至 D-59-18 的验收线。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 59 的正式 goal、requirements、success criteria 与 Phase 60 依赖关系。
- `.planning/REQUIREMENTS.md` — `OPS-01`、`ENVR-01`、`ENVR-02`、`ENVR-03`、`SAFE-03` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.1` 的 scope fence、baseline truths、single-school pilot posture 与 out-of-scope。
- `.planning/STATE.md` — 当前 milestone posture，确认 Phase 58 已完成且 Phase 59 是当前 planning target。

### Locked pilot contract and recovery triggers
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PILOT-CONTRACT.md` — 锁定 single-school pilot、sample chain、baseline truths 与 deferred wall。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md` — Phase 59 必须交付的 env/deploy、release/health-check、backup/restore drill proof。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md` — deploy health failure、rollback trigger、restore trigger 与 post-rollback / post-restore 要求。

### Upstream phase context that remains locked
- `.planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md` — operator surfaces 已完成，Phase 59 只补 deploy/release/recovery baseline，不重做 incident/operator 产品面。
- `.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md` — 样板链路 smoke 的真实锚点来源，restore 后最小验证必须能回挂到这条链路。
- `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-CONTEXT.md` — 样板插件 publish/runtime contract 已锁定，Phase 59 不重开 plugin authoring/runtime 边界。

### Research guidance and production-readiness recommendations
- `.planning/research/SUMMARY.md` — v3.1 对 deploy/env、health/ready、release traceability、backup/restore、restore drill 的推荐收口方式。
- `.planning/codebase/STACK.md` — 当前 Node/Next/SQLite/Redis/BullMQ 基础栈与运行前提。
- `.planning/codebase/ARCHITECTURE.md` — server action / DAL / SQLite 分层、custom Node server、worker/bootstrap 的系统边界。
- `.planning/codebase/INTEGRATIONS.md` — 当前 auth、DB、Redis、worker、deployment integration 现状与缺失项。

### Existing code anchors and runtime seams
- `package.json` — `start`、`worker:start`、`db:migrate`、现有 phase verifier 与 build/typecheck/lint script truth。
- `server.ts` — 当前 web server 启动入口与 custom Node host 姿态。
- `src/server/workers/async-task-worker.ts` — worker boot 入口与 `ASYNC_TASKS_ENABLED` / `BULLMQ_REDIS_URL` 缺失时的当前行为。
- `src/features/async-tasks/infra/connection.ts` — BullMQ env capability、instance identity、worker readiness 相关 truth。
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` — Redis fanout 仍是 optional deploy capability 的现有 truth。
- `src/db/index.ts` — SQLite/libSQL authoritative DB boot seam。
- `drizzle.config.ts` — migration 继续以 `DB_FILE_NAME` 指向的 SQLite truth 为正式入口。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json`：已经有 `build`、`lint`、`typecheck`、`db:migrate`、`worker:start`、`verify:phase56-58` 等脚本，可直接组成 Phase 59 的 CI/release gate 骨架。
- `server.ts`：现有 custom Node server 已经是正式 web host，不需要为 Phase 59 新造运行时壳。
- `src/server/workers/async-task-worker.ts`：已经是稳定的 worker boot entry，可作为 systemd / shell script 的第二个正式进程。
- `src/features/async-tasks/infra/connection.ts`：已把 BullMQ 所需 env、enabled posture、instance id 集中成 capability seam，适合纳入 `ready` gate 与 env schema。
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`：已把 Redis fanout 明确建模为 deploy-authoritative optional capability，可直接复用到 non-blocking degraded health reporting。
- `src/db/index.ts` + `drizzle.config.ts`：已把 SQLite truth 收敛到 `DB_FILE_NAME`，适合作为 migrate / backup / restore 的主锚点。

### Established Patterns
- 仓库当前采用 **custom Node server + separate worker process**，不是 serverless / edge-first 托管姿态。
- canonical truth 仍然只能由 `SQLite + DAL` 持有；Redis、BullMQ、WebSocket 都是 delivery/orchestration substrate，不可在恢复流程中反客为主。
- Redis 已有两种不同 posture：BullMQ worker 侧是 async execution 依赖，classroom fanout 侧是 optional deploy capability；Phase 59 不能把两者混成一个 readiness 判断。
- 仓库已有 phase verifier 文化，且 close gate 倾向使用 repo-local verifier + focused tests，而不是只靠外部平台流水线截图。

### Integration Points
- 需要新增统一 env schema / `.env.example`，把当前散落的 `AUTH_SECRET`、`DB_FILE_NAME`、`BULLMQ_REDIS_URL`、`ASYNC_TASKS_ENABLED`、`REDIS_URL` 等收敛成正式 deploy contract。
- 需要新增正式 `health/ready` route，并与 worker/BullMQ/DB/fanout capability seam 对接，作为 release gate 与 restore verification 的共享探针。
- 需要新增 release manifest、deploy / rollback / restore shell scripts、以及 systemd/service management artifacts，形成 single-node dual-process 官方操作面。
- 需要新增 `verify:phase59` 或等价 verifier，把 release traceability、health/ready surface、restore verification contract 固化成 repo-local gate。

</code_context>

<specifics>
## Specific Ideas

- 官方试点部署路线固定为 single-node dual-process，不把 Docker/compose 或平台托管当成主叙事。
- release record 要以 Git SHA + release manifest 为主，而不是散落在 tag、CI 页面和 operator 记忆里。
- `health` 和 `ready` 语义必须明确拆开：`health` 证明进程还活着，`ready` 才回答“现在能不能安全接试点流量”。
- fanout posture 必须像 Phase 37/58 那样诚实暴露为 non-blocking degraded，而不是悄悄隐藏或误升格为 hard blocker。
- restore 成功的最低定义不是“数据库能打开”，而是“health/ready 绿 + 样板链路 smoke 过”。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 59-Deploy, Release & Recovery Baseline*
*Context gathered: 2026-05-26*
