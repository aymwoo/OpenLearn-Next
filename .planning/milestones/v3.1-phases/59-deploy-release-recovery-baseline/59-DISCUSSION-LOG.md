# Phase 59: Deploy, Release & Recovery Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26T16:15:05+08:00
**Phase:** 59-Deploy, Release & Recovery Baseline
**Areas discussed:** 部署拓扑, 发布门禁, 健康判定, 备份恢复

---

## 部署拓扑

| Option | Description | Selected |
|--------|-------------|----------|
| 单机双进程 | 一台主机，明确跑 `web` + `worker` 两个长期进程，SQLite 文件落本机磁盘，Redis 作为可选或同机依赖。这和现有仓库结构最贴近，blast radius 最小。 | ✓ |
| Compose 容器化 | 把 web、worker、Redis 都收进 docker compose 作为官方试点基线。更容易复制环境，但会引入容器运维前提。 | |
| 平台托管 | 官方基线直接面向 Railway / Render / Fly.io 之类平台，仓库只提供平台配置和最少脚本，不把本地/单机部署当主路线。 | |

**User's choice:** 单机双进程
**Notes:** 官方部署基线要贴近当前 `server.ts` + `worker:start` 结构，不引入额外托管假设。

| Option | Description | Selected |
|--------|-------------|----------|
| 必需依赖 | 官方部署必须带 Redis，worker/BullMQ 和可选 fanout 都按有 Redis 的姿态交付。 | |
| Worker 必需, fanout 可选 | Redis 对 BullMQ worker 是正式依赖；课堂 Redis fanout 继续保持 optional / degraded-visible posture。 | ✓ |
| 整体可选 | 连 worker 也允许无 Redis 运行，只提供降级模式。 | |

**User's choice:** Worker 必需, fanout 可选
**Notes:** 继续复用当前 async 架构，同时保留 classroom fanout 的 optional honesty posture。

| Option | Description | Selected |
|--------|-------------|----------|
| Systemd + shell 脚本 | 官方基线直接给单机主机的进程管理、启动/停止、迁移、备份恢复脚本与 env 示例。 | ✓ |
| Shell 脚本 + 轻量 Docker | 主路线仍是脚本，但顺手补一个轻量 Dockerfile 方便后续扩展。 | |
| 只写文档 | 只定义步骤和清单，不正式提交可执行 deploy artifact。 | |

**User's choice:** Systemd + shell 脚本
**Notes:** Phase 59 要交付正式可执行基线，不接受只写文档。

---

## 发布门禁

| Option | Description | Selected |
|--------|-------------|----------|
| Git SHA + release manifest | 每次发布都产出仓库内可读的 release manifest，记录 git SHA、migration、env/profile、verifier 结果、时间戳与操作者。 | ✓ |
| 纯 git tag | 只靠 tag/commit 作为 release 标识。 | |
| 外部发布系统 | 把 release 记录主要放到外部平台。 | |

**User's choice:** Git SHA + release manifest
**Notes:** release traceability 必须是仓库内 authoritative 记录。

| Option | Description | Selected |
|--------|-------------|----------|
| Lint/Typecheck/Build | 静态与构建层必须过。 | ✓ |
| 关键测试/phase verifier | 不仅要跑常规测试，还要跑和样板链路直接相关的 repo-local verifier。 | ✓ |
| Migration gate | 迁移必须先演练并通过。 | ✓ |
| Health/Ready gate | 部署后必须立即跑 health/ready。 | ✓ |

**User's choice:** Lint/Typecheck/Build, 关键测试/phase verifier, Migration gate, Health/Ready gate
**Notes:** 以上全部是 hard gate，任何失败都不能算 release 完成。

| Option | Description | Selected |
|--------|-------------|----------|
| 立即回滚到上个 green release | 把 rollback 视为正式默认动作；失败的 release 只能保留记录，不能继续带病上线。 | ✓ |
| 中止并人工判断 | 先停住，不自动回滚，由 operator/release owner 判断。 | |
| 继续观察后再决定 | 允许短时间带失败发布继续存在。 | |

**User's choice:** 立即回滚到上个 green release
**Notes:** migration 或 post-deploy health/ready 失败都直接进入 rollback posture。

---

## 健康判定

| Option | Description | Selected |
|--------|-------------|----------|
| Health=进程存活, Ready=可接流量 | `health` 只证明 web 进程活着；`ready` 才检查数据库、worker/Redis posture、关键依赖是否可服务。 | ✓ |
| 两者都做全量检查 | `health` 和 `ready` 都检查一整套依赖。 | |
| 只做 ready | 只提供一个严格探针，不区分 liveness 和 readiness。 | |

**User's choice:** Health=进程存活, Ready=可接流量
**Notes:** 用于发布门禁和恢复校验时，需要明确区分 liveness 与 readiness。

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite / DB | 数据库可连、truth source 可读写。 | ✓ |
| Web app runtime | Next server 自身关键配置和应用启动状态正常。 | ✓ |
| Worker/BullMQ posture | 异步 worker 与队列基线可用。 | ✓ |
| Redis fanout | 课堂 fanout 也必须 green 才 ready。 | |

**User's choice:** SQLite / DB, Web app runtime, Worker/BullMQ posture
**Notes:** fanout 不进入 ready hard gate。

| Option | Description | Selected |
|--------|-------------|----------|
| 暴露为 non-blocking degraded | 响应里明确列出 fanout posture，但不把它算成 not-ready。 | ✓ |
| 完全不显示 | 只在 operator 页面里看 Redis fanout，不进 health/ready。 | |
| 显示且人工升级为 blocker | 默认不是 blocker，但 release owner 可以手工把它判成 blocker。 | |

**User's choice:** 暴露为 non-blocking degraded
**Notes:** 延续 Phase 37/58 的 honesty posture。

---

## 备份恢复

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite + 上传/运行资产 + env template | 不仅备份数据库，还备份会影响课堂样板运行与恢复判断的附加资产；但不把真实 secrets 明文纳入备份。 | ✓ |
| 只备份 SQLite | 先保证 durable truth，可恢复最核心数据。 | |
| 整机级备份 | 把应用目录、数据库、资产、配置都视为整体快照。 | |

**User's choice:** SQLite + 上传/运行资产 + env template
**Notes:** SAFE-03 不能只恢复 DB，还要恢复试点运行所需资产边界。

| Option | Description | Selected |
|--------|-------------|----------|
| 通过样板链路 smoke + health/ready | 恢复后不仅看数据库能开，还要确认 health/ready 为 green，并能跑通最小 classroom voting sample smoke。 | ✓ |
| 只跑 health/ready + DB checks | 确认服务和数据恢复，但不要求样板链路 smoke。 | |
| 跑完整 E2E | 恢复后要跑完整 teacher→student→operator 链路。 | |

**User's choice:** 通过样板链路 smoke + health/ready
**Notes:** restore 成功的最低标准必须回挂真实样板链路。

| Option | Description | Selected |
|--------|-------------|----------|
| 视为 release blocker | 恢复演练失败就说明 SAFE-03 不成立。 | ✓ |
| 记录风险继续推进 | 把它作为已知风险登记，但不阻断 Phase 59 结论。 | |
| 只阻断正式发布 | 不阻断 Phase 59 完成，但阻断后续真实试点 release。 | |

**User's choice:** 视为 release blocker
**Notes:** restore drill 和 post-restore smoke 任一失败都不能把当前基线视为 pilot-ready。

---

## the agent's Discretion

- systemd unit、shell script、release manifest 的具体文件命名与字段排序可由 planner 收敛。
- health/ready 的 JSON shape 与 component label 命名可由 planner 在 honesty posture 下决定。
- backup/restore 的具体工具链与目录约定可由 researcher/planner 做最小正确实现。

## Deferred Ideas

None.
