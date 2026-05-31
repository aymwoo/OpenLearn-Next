# Phase 39: Async contracts and durable task truth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 39-async-contracts-and-durable-task-truth
**Areas discussed:** 任务归属与可见性, 进度与结果合同, enqueue 诚实语义, 任务类型注册粒度

---

## 任务归属与可见性

| Option | Description | Selected |
|--------|-------------|----------|
| actor+school+entity | 显式存 `actorId`、`schoolId`、`taskType`、`featureArea` 和目标实体引用 | ✓ |
| actor+taskType | 其余上下文从 payload 反推 | |
| school+entity | 以系统视角为主，弱化发起人 | |

**User's choice:** actor+school+entity
**Notes:** 目标对象统一用 typed entityRef；visibility 先锁 scope，默认 actor-owned，manage/retry 权限留到后续 phase。

---

## 进度与结果合同

| Option | Description | Selected |
|--------|-------------|----------|
| structured progress snapshot | 统一结构化 progress 快照 | ✓ |
| message + percent | 只保留文本和百分比 | |
| opaque JSON | 完全不定义共同字段 | |

**User's choice:** structured progress snapshot
**Notes:** 结果采用 `summary + outcome payload`；持久化形态为 latest snapshot + append-only events；partial success 是一等 outcome。

---

## enqueue 诚实语义

| Option | Description | Selected |
|--------|-------------|----------|
| ledger committed + pending dispatch | 先写 durable record 和 enqueue intent，再诚实推进 dispatch | ✓ |
| ledger+enqueue both succeed | 只有真正 queue add 成功才算 queued | |
| queue add succeeded only | 以 queue add 为主真相 | |

**User's choice:** ledger committed + pending dispatch
**Notes:** 产品面允许 `pending_enqueue` / `dispatching`；enqueue 失败保留 reconciliation posture；统一 enqueue seam 只给 feature orchestrators 调用。

---

## 任务类型注册粒度

| Option | Description | Selected |
|--------|-------------|----------|
| contract + product metadata | 同时锁 schema、visibility、entityRef、label keys 等元数据 | ✓ |
| only technical contract | 只锁 schema | |
| full future metadata | 连 retry/idempotency/concurrency 全锁 | |

**User's choice:** contract + product metadata
**Notes:** registry 只提供 label/summary keys，不承载最终文案；`visibility` 和 `entityRef kind` 为必填字段；retry/idempotency 只预留字段位，不锁语义。

---

## the agent's Discretion

- async task 表和事件表的精确命名
- pending/dispatched failure 相关状态枚举的最终命名
- labelKey / summaryKey 的命名规范和 helper 位置

## Deferred Ideas

- 本阶段直接实现 worker/retry/recovery 全量能力
- 本阶段提前锁死 operator retry/manage 语义
- 把 registry 扩成 workflow engine 或多 worker pool 平台
