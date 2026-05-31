# Phase 37: Redis fanout and multi-instance delivery convergence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 37-redis-fanout-and-multi-instance-delivery-convergence
**Areas discussed:** Redis 接入层, Topic 粒度, 失败恢复语义, 本地开发姿态, 谁能改全局 Redis 设置, 设置如何持久化, 降级状态给谁看

---

## Redis 接入层

| Option | Description | Selected |
|--------|-------------|----------|
| WS层统一走Redis | 保留 `publishTransportEvent()` 和 gateway 作为唯一业务入口；把 `ws-adapter` 升级成 Redis fanout + 本地 socket 投递。 | |
| Gateway直接发Redis | gateway 直接把 Redis 当 transport hop。 | |
| 本地直发+Redis补远端 | 同实例继续本地投递，只把跨实例交给 Redis。 | |
| Redis可选模式 | 默认不走 Redis；显式启用并配置后统一走 Redis。 | ✓ |

**User's choice:** Redis 不是默认基线，而是可选模式；默认不走 Redis，启用并配置后统一走 Redis。
**Notes:** 后续继续锁定为“部署配置 + 产品设置”双层开关，部署配置优先。

---

## Redis 开关位置与权威

| Option | Description | Selected |
|--------|-------------|----------|
| 部署配置层 | 只用 env / server config 控制。 | |
| 产品设置页 | 只用产品内设置切换。 | |
| 两者都要 | 部署层提供能力，产品设置再做二次开关。 | ✓ |
| 部署配置优先 | 不一致时以服务端能力为权威。 | ✓ |
| 产品设置优先 | 产品设置强行覆盖部署层。 | |
| 不一致就降级关闭 | 任何不一致都关闭。 | |

**User's choice:** 同时有部署配置和产品设置，但部署配置是最终权威。
**Notes:** 产品设置只能在部署已允许且 Redis 已可用时生效。

---

## Topic 粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 按classroom session | 所有消息共用单一 session topic。 | |
| session加子channel | 主作用域是 `classroomSessionId`，再按 channel 拆分。 | ✓ |
| 细到runtime实例 | 再拆到 runtimeSessionId / runtimeInstanceId。 | |
| classroom和runtime分开 | 至少分 `classroom` 和 `runtime` 两类子 channel。 | ✓ |
| 只保留现有channel名 | 直接映射现有 channel，不收敛命名。 | |
| 再细分control/snapshot | 继续细拆更多 topic。 | |

**User's choice:** 主作用域按 `classroomSessionId`，并按 `classroom` / `runtime` 子 channel 拆分。
**Notes:** 不接受把 snapshot、runtime event、teacher control 全部混在单一 Redis topic。

---

## 失败恢复语义

| Option | Description | Selected |
|--------|-------------|----------|
| 诚实降级并标记失败 | Redis 故障时显式标记 degraded/failure。 | ✓ |
| 尽量静默回退 | 自动回退，尽量不暴露给用户。 | |
| Redis异常即阻断 | Redis 异常时不再继续实时投递。 | |
| 仅本实例继续投递 | 回退到本地 connection registry。 | ✓ |
| 只保留SSE读取回退 | 不再继续 websocket fanout。 | |
| 完全关闭实时投递 | 只剩 durable truth。 | |

**User's choice:** Redis 故障时诚实降级，并回退到“仅当前实例本地 fanout”。
**Notes:** 不能伪装成跨实例仍正常；SSE rollback posture 仍保留，但不是掩盖失败的借口。

---

## 本地开发姿态

| Option | Description | Selected |
|--------|-------------|----------|
| 默认无Redis也能跑 | 本地默认继续单实例开发。 | ✓ |
| 本地默认要求Redis | 日常开发也强依赖 Redis。 | |
| 按命令区分 | dev 不要求，某些命令要求。 | |
| 专门的Redis验证命令 | 用 dedicated verifier/smoke 证明 Redis 模式可用。 | ✓ |
| 手工启动说明即可 | 只文档说明，不脚本验证。 | |
| dev启动时自动探测 | 靠 dev 输出作为主要验证。 | |

**User's choice:** 本地开发默认不要求 Redis，但必须有专门的 Redis-focused verification gate。
**Notes:** Phase 37 不能只靠手工说明宣称 Redis 模式已可用。

---

## 设置范围与生效时机

| Option | Description | Selected |
|--------|-------------|----------|
| 全局系统级 | 整个部署共享一个 Redis fanout 设置。 | ✓ |
| 按学校 | school 级单独配置。 | |
| 按课堂会话 | session 级单独配置。 | |
| 仅新会话生效 | 只影响后续新创建会话。 | ✓ |
| 允许热切换 | 已运行会话也切换。 | |
| 重连后生效 | 下次重连再生效。 | |
| 课堂会话创建时快照 | 在创建 `classroomSession` 时固定 transport mode。 | ✓ |
| 连接握手时读取当前全局值 | 每次连接看当前值。 | |
| 运行时按当前值动态判断 | 每次 publish/subscribe 看当前值。 | |

**User's choice:** 产品设置是全局系统级，且只影响新会话；具体落点是 classroom session 创建时快照 transport mode。
**Notes:** 明确避免同一课堂运行中热切换 transport 语义。

---

## 全局 Redis 设置权限

| Option | Description | Selected |
|--------|-------------|----------|
| 仅开发者/超管 | 只有 developer / super admin 能改。 | ✓ |
| 学校管理员也可改 | school admin 也能改全局开关。 | |
| 任何管理员都可改 | 所有 admin-like 角色都能改。 | |

**User's choice:** 仅 `developer` / `super_admin` 可修改产品内的全局 Redis 设置。
**Notes:** 其他角色最多查看状态。

---

## 设置如何持久化

| Option | Description | Selected |
|--------|-------------|----------|
| 数据库全局系统配置 | 写入数据库中的全局 config record。 | ✓ |
| 沿用现有cookie式设置链路 | 类似主题设置。 | |
| 只做内存态+部署配置 | 不落库。 | |

**User's choice:** 产品里的全局 Redis 设置需要持久化到数据库全局系统配置。
**Notes:** 当前仓库没有现成 system config table，这会成为 Phase 37 的新增边界。

---

## 降级状态给谁看

| Option | Description | Selected |
|--------|-------------|----------|
| 操作者和设置页都看 | settings/inspector + `/classroom` 操作者都能看到。 | ✓ |
| 只在settings/inspector | 只暴露给运维/开发者。 | |
| 所有相关角色都看 | 连学生侧也提示。 | |

**User's choice:** Redis 模式降级时，settings/inspector 与 classroom 操作者都必须看到状态。
**Notes:** teacher/operator 需要明确知道跨实例 fanout 已失效，但不需要把噪音扩散到学生侧。

---

## the agent's Discretion

- Redis topic 的精确字符串命名和 verifier 文件命名由 planner 决定。
- settings 中把该功能放在 `/settings` 还是 `/settings/labs` 的具体位置由 planner 收敛。
- degradation banner 的精确文案、颜色与信息密度由 planner 收敛。

## Deferred Ideas

- 把 Redis 变成默认基线。
- 按学校或按课堂会话分散配置 Redis 模式。
- 允许运行中热切换 transport mode。
- 再细分 per-command / per-runtime-instance 的 Redis topics。
- 让学生侧看到 Redis degraded 状态。
