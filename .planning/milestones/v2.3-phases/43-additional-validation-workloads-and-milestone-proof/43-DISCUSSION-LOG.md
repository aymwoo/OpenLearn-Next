# Phase 43: Additional validation workloads and milestone proof - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 43-additional-validation-workloads-and-milestone-proof
**Areas discussed:** 提醒任务边界, 事件后处理落点, 资源处理语义, 里程碑证明方式

---

## 提醒任务边界

| Option | Description | Selected |
|--------|-------------|----------|
| 只把“实际发送 dispatch”接到 async platform | 规则保存仍留在 schedule feature 内同步完成；planned dispatch -> queued/running/sent/failed/retry 走 async contract。 | ✓ |
| 把“规则保存后创建计划 + 实际发送”都纳入 async platform | 保存 rule 后就创建 async task，统一度更高但会改主产品链路。 | |
| 只把“失败后的 retry dispatch”接到 async platform | 首次发送维持同步，只有失败重试转成 async。 | |

**User's choice:** 只把“实际发送 dispatch”接到 async platform。
**Notes:** reminder rule 的保存、修改与计划生成继续留在 feature 内，不改成 async 主链路。

| Option | Description | Selected |
|--------|-------------|----------|
| 每次发送一条 | 每个 `scheduleReminderDispatch` 记录对应一个 async task。 | ✓ |
| 每种规则一条 | 一个 rule 对应长期任务。 | |
| 按学校批次 | 同一学校同时段发送聚成一条 task。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 每次发送一条。
**Notes:** 一条 `scheduleReminderDispatch` 对应一条 async reminder task。

| Option | Description | Selected |
|--------|-------------|----------|
| 到点自动入队 | `scheduledFor` 到点时自动创建/入队 task，证明 scheduled workload。 | ✓ |
| 只在手动重试 | 首次发送仍走同步，只有 retry 才任务化。 | |
| 首次和重试都走 | 首次到点发送与 retry 都统一走 async task。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 到点自动入队。
**Notes:** reminder workload 需要证明 scheduled，而不是只证明 manual retry。

| Option | Description | Selected |
|--------|-------------|----------|
| 保留当前列表，只换 honest 状态 | 教师页继续以 rule + delivery list 为主，不变成通用任务中心。 | ✓ |
| 列表里加任务入口 | 保持业务列表，同时加 task detail 入口。 | |
| 教师页直接任务化 | 最近 delivery 列表改成任务列表。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 保留当前列表，只换 honest 状态。
**Notes:** `/teacher/schedule/reminders` 不升级成通用任务中心。

| Option | Description | Selected |
|--------|-------------|----------|
| 只在 operator 面 | 教师页只看到失败状态，不直接重试；retry 收口到 async operator。 | ✓ |
| 教师页也可重试 | 教师页保留重试动作，底层走 async recovery contract。 | |
| 教师页提示跳转 | 教师页不重试，只提示去 operator 面处理。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 只在 operator 面。
**Notes:** teacher/operator 分层继续保持清晰。

---

## 事件后处理落点

| Option | Description | Selected |
|--------|-------------|----------|
| classroomEvents（推荐） | 以 `classroomEvents` 作为事件事实源，最贴近 append-only durable truth。 | ✓ |
| runtime transport 事件 | 以 ws/runtime transport trace 为事件源。 | |
| agent/资源相关事件 | 挂在 agent proposal 或资源相关事件上。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** classroomEvents。
**Notes:** event post-processing 要证明 derived workload，优先选择最贴近产品事实的事件源。

| Option | Description | Selected |
|--------|-------------|----------|
| 会话摘要/聚合 | 从事件流派生 session-level summary / recap / metrics。 | ✓ |
| 告警/异常标记 | 产出异常提醒或 operator flags。 | |
| 只做投影缓存 | 异步整理成 projection/read model。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 会话摘要/聚合。
**Notes:** 后处理产物偏 session-level summary/aggregation，而不是异常告警优先。

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂结束时 | 仅 `ended` 后统一触发一次。 | |
| 关键事件后增量触发 | 在 step/lock/slide 变化后增量入队。 | |
| 两者都要 | 平时增量，结束后再做 finalize。 | ✓ |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 两者都要。
**Notes:** event workload 采用“增量 + finalize”双触发。

---

## 资源处理语义

| Option | Description | Selected |
|--------|-------------|----------|
| RAG ingest / indexing（推荐） | 以 `knowledgeSources` / `knowledgeChunks` 为 truth，接入资源处理任务。 | ✓ |
| 资源元数据整理 | 只做 metadata enrichment / normalization。 | |
| 资源外链探测 | 围绕 `resource.url` 做 link validation / extract。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** RAG ingest / indexing。
**Notes:** resource processing 不泛化，直接落在现有 RAG pipeline 半成品上。

| Option | Description | Selected |
|--------|-------------|----------|
| 每个 knowledgeSource 一条 | 一个 knowledge source 对应一条 async task。 | ✓ |
| 每个资源一条 | 一个 resource 对应一条 task。 | |
| 分两类任务 | source ingest 一条、chunk indexing 再一条。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 每个 knowledgeSource 一条。
**Notes:** Phase 43 不把 resource processing 再拆成第二个独立 task family。

| Option | Description | Selected |
|--------|-------------|----------|
| 业务状态优先 | 老师继续看到 resource / knowledge source 的业务状态，不直接暴露 task 细节。 | ✓ |
| 业务状态 + 任务入口 | 业务状态为主，但可回到 task detail。 | |
| 直接任务化 | 产品面直接展示 async task 状态。 | |
| 你来定 | 由 agent 收敛。 | |

**User's choice:** 业务状态优先。
**Notes:** resource 产品面继续以 knowledge source / chunk 的业务状态为主。

---

## 里程碑证明方式

| Option | Description | Selected |
|--------|-------------|----------|
| 验证矩阵（推荐） | 用 workload coverage / proof matrix 证明四类任务共享同一平台 contract。 | ✓ |
| 单一 demo runbook | 更偏人工演示脚本。 | |
| focused verifier 套件 | 更偏脚本化回归与自动验证。 | |
| 矩阵 + verifier | 同时要人工可读矩阵和自动 verifier。 | |

**User's choice:** 验证矩阵。
**Notes:** milestone close 的主 artifact 以人工可读 proof / coverage matrix 为主。

## the agent's Discretion

- reminder delivery、classroom event summary、resource ingest 三类 task family 的精确命名与 featureArea 收敛留给 planner。
- event 增量触发具体选哪些事件类型、resource task 内部如何组织 chunk/indexing 细节，留给 planner 在已锁定边界内细化。

## Deferred Ideas

None.
