# Phase 60: Load, Degrade & Pilot Rehearsal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 60-Load, Degrade & Pilot Rehearsal
**Areas discussed:** 负载门槛设计, 降级演练范围, 通过阻断阈值, 现场演练与回滚

---

## 负载门槛设计

| Option | Description | Selected |
|--------|-------------|----------|
| 分层双轨 | Playwright 锁真实样板 smoke；k6 锁 40/5 容量，最贴合现有 verifier 骨架。 | ✓ |
| 全浏览器负载 | 尽量用 Playwright 跑高并发真实 UI，证明直观但维护成本高。 | |
| 仅协议层负载 | 只做 k6/HTTP/WebSocket 容量，不保留浏览器级样板 smoke。 | |

**User's choice:** 分层双轨
**Notes:** 浏览器链路只证明样板真实成立，容量证据必须由更稳定的协议/服务层 gate 提供。

| Option | Description | Selected |
|--------|-------------|----------|
| 两轨都阻断 | Playwright 样板 smoke 或 k6 容量 gate 任一失败都阻断 close。 | ✓ |
| 只阻断 k6 | 浏览器链路只做证明材料。 | |
| 只阻断样板 smoke | 容量结果更像 advisory。 | |

**User's choice:** 两轨都阻断
**Notes:** Phase 60 不能出现“样板回归但容量通过”或“容量失真但 smoke 通过”的侥幸 close。

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂为主建模 | 5 个并发课堂，每个课堂 40 个学生 actor，直接对齐 `PILOT-03`。 | ✓ |
| 全局 200 用户池 | 更简单，但弱化 5 个课堂并发语义。 | |
| 分阶段递增 | 先单课堂 40，再 5 并发课堂。 | |

**User's choice:** 课堂为主建模
**Notes:** k6 需要围绕 classroom/session 建模，而不是抽象全局流量池。

---

## 降级演练范围

| Option | Description | Selected |
|--------|-------------|----------|
| 核心自动化+现场演练 | 关键 degraded/reconnect/backlog/partial failure 自动化，其余通过 rehearsal 落证。 | ✓ |
| 尽量全自动化 | 几乎所有 failure/posture 都脚本化。 | |
| 自动化最小化 | 只做少量关键自动化，其余主要靠 runbook。 | |

**User's choice:** 核心自动化+现场演练
**Notes:** 需要平衡证据强度和本期交付成本。

| Option | Description | Selected |
|--------|-------------|----------|
| Redis degraded | 验证 optional fanout degraded 下 honesty 和样板链路语义。 | ✓ |
| Worker backlog | 验证 BullMQ backlog/heartbeat posture 与 operator 可见性。 | ✓ |
| 学生重连/重试 | 验证 reconnect/retry 仍保持 Phase 57 的 submit/idempotency 语义。 | ✓ |
| 部分失败 | 验证局部课堂/局部学生受影响时有可解释 evidence。 | ✓ |

**User's choice:** Redis degraded, Worker backlog, 学生重连/重试, 部分失败
**Notes:** 四类都属于 Phase 60 的正式 automated drill 面。

| Option | Description | Selected |
|--------|-------------|----------|
| 现场演练为主 | `transport fallback` 主要走 runbook/rehearsal，而不是稳定自动化 gate。 | ✓ |
| 也进自动化 | 把 transport fallback 也脚本化。 | |
| 先不覆盖 | 本期不专门验证 transport fallback。 | |

**User's choice:** 现场演练为主
**Notes:** 它更像姿态切换与 operator 判断闭环，不应被误写成常态自动化交付路径。

---

## 通过阻断阈值

| Option | Description | Selected |
|--------|-------------|----------|
| 明确 stop rules | 为关键维度定义清晰通过/阻断条件。 | ✓ |
| 分级告警 | 主要提供 green/yellow/red 指导。 | |
| 只给方向 | 只保留原则性要求。 | |

**User's choice:** 明确 stop rules
**Notes:** Phase 60 close 不应继续依赖口头解释。

| Option | Description | Selected |
|--------|-------------|----------|
| 关键项一票否决 | 样板 smoke、容量 gate、worker blocking posture、rollback rehearsal 等关键项失败即阻断。 | ✓ |
| 综合评分 | 多项结果汇总成总分再决策。 | |
| 人工裁量优先 | 数值主要作参考。 | |

**User's choice:** 关键项一票否决
**Notes:** close gate 需要明确 blocker posture，而不是综合印象分。

| Option | Description | Selected |
|--------|-------------|----------|
| 锁类型不锁数字 | 先锁必须有数字阈值的维度，具体数字交给 research/planning。 | ✓ |
| 现在就锁具体数字 | 讨论阶段直接定死秒数/比例/队列长度。 | |
| 只锁 blocker 类型 | 不要求 planner 给清晰数字阈值。 | |

**User's choice:** 锁类型不锁数字
**Notes:** reconnect、backlog、partial failure、degraded duration 这些维度必须在 planning 时转成明确数值阈值。

---

## 现场演练与回滚

| Option | Description | Selected |
|--------|-------------|----------|
| 一次受控真回滚 | 在受控环境中模拟 blocker 并执行真实 rollback 流程。 | ✓ |
| dry-run + 桌面推演 | 以 dry-run 和 walkthrough 为主。 | |
| 多轮真演练 | 多次真实 rollout/rollback 组合。 | |

**User's choice:** 一次受控真回滚
**Notes:** 必须留下比 dry-run 更硬的 proof，但不把本期扩成多轮大演习。

| Option | Description | Selected |
|--------|-------------|----------|
| 样板回归/ready blocker | 用样板 smoke 回归或 `/api/ready` blocking posture 驱动回滚。 | ✓ |
| 人工强制触发 | 不依赖具体失败，直接演回滚。 | |
| 降级持续超阈值 | 用 degraded 超时来驱动。 | |

**User's choice:** 样板回归/ready blocker
**Notes:** 回滚 trigger 必须直接对齐 Phase 59 deploy contract 与 Phase 60 close blocker 语义。

| Option | Description | Selected |
|--------|-------------|----------|
| health/ready + 样板 smoke | 回滚后 probes 恢复 green，且课堂投票样板重新通过 smoke。 | ✓ |
| 只看 health/ready | 只证明系统能接流量。 | |
| 加 operator walkthrough | 再补一层 operator 关联验证。 | |

**User's choice:** health/ready + 样板 smoke
**Notes:** 采用与 Phase 59 restore drill 一致的 `probe + sample smoke` 成功定义。

---

## Claude's Discretion

- k6 场景拆分、threshold 字段形态、以及 rehearsal summary 的具体版式留给 planner/researcher 收敛。

## Deferred Ideas

None.
