# Phase 28: Runtime bridge contracts and session persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 28-Runtime bridge contracts and session persistence
**Areas discussed:** Descriptor 挂载, Session 身份, Bootstrap 上下文, 写入与事件口径

---

## Descriptor 挂载

### descriptor 初始挂载层

| Option | Description | Selected |
|--------|-------------|----------|
| payload 内 | 在现有 `lessonStepPayload` 里加可选 `runtime` block，延续 `teachingDesign` / `builtInSource` 的做法 | ✓ |
| step 顶层字段 | 把 descriptor 放到 step 顶层，和 payload 分离 | |
| 独立 metadata | 单独建 step-runtime metadata 真相源 | |

**User's choice:** payload 内
**Notes:** 明确不新起平行 step truth，保持现有 step payload 与 published snapshot 主路径。

### 发布后如何进入 snapshot

| Option | Description | Selected |
|--------|-------------|----------|
| 冻结完整 descriptor | `version`、`kind`、`entry`、`requestedCapabilities` 等完整随 published snapshot 冻结 | ✓ |
| 只冻 descriptor 引用 | snapshot 只存 `runtimeId + version`，运行时回查 registry | |
| 混合模式 | 冻结最小执行字段，同时保留实现引用 | |

**User's choice:** 冻结完整 descriptor
**Notes:** 发布后的 runtime 行为不能随着外部 registry/manifest 漂移。

### `payload.runtime` 的适用范围

| Option | Description | Selected |
|--------|-------------|----------|
| 任一现有 step 可选挂载 | `content / task / quiz` 都允许带可选 `runtime` block | ✓ |
| 仅特定 step 使用 | 只允许某一类明确标记的 step payload 挂 runtime | |
| 先不锁死 由 planner 收敛 | 只锁 payload 内挂载，具体允许类型后定 | |

**User's choice:** 任一现有 step 可选挂载
**Notes:** 继续沿用线性步骤模型，不为了 runtime 另建专用步骤体系。

---

## Session 身份

### 同 actor 再次进入时怎么处理

| Option | Description | Selected |
|--------|-------------|----------|
| 按 classroom+step+actor 复用 | 同一 `classroomSession + stepId + actor` 只有一个当前 runtime session | ✓ |
| 每次进入都新建 | 每次打开都创建新 runtime session | |
| 学生复用 教师新建 | 学生恢复，教师控制台可多次新开 | |

**User's choice:** 按 classroom+step+actor 复用
**Notes:** 恢复和 durable truth 需要稳定主键，不希望每次进入都制造碎片化 session。

### identity 是否包含 descriptor 版本

| Option | Description | Selected |
|--------|-------------|----------|
| 带上 descriptor 版本 | identity 收口为 `classroomSession + stepId + actor + runtime version` | ✓ |
| 不带 descriptor | 只看 `classroomSession + stepId + actor` | |
| 只带 runtimeId | 忽略 version，只区分 runtime 实现 | |

**User's choice:** 带上 descriptor 版本
**Notes:** 避免升级后的不兼容状态误复用旧 session。

### 升版/重置后旧 session 怎么处理

| Option | Description | Selected |
|--------|-------------|----------|
| 保留历史 标记 latest | 保留旧 session / state，并把当前可恢复记录标为 latest | ✓ |
| 直接覆盖同一行 | 同一 identity 永远只有一条记录 | |
| 保留历史 不设 latest | 仅靠时间排序决定当前 session | |

**User's choice:** 保留历史 标记 latest
**Notes:** 恢复与审计都需要历史保留，但也要有单一当前入口。

---

## Bootstrap 上下文

### bootstrap 默认返回哪类 lesson/classroom 数据

| Option | Description | Selected |
|--------|-------------|----------|
| 最小只读 DTO | 只给 step title、descriptor、session/lock/active-step 摘要、actor scope、必要恢复信息 | ✓ |
| 整步快照 | 一次下发更多 lesson metadata 和 step payload | |
| 按需拉取 | bootstrap 只给 IDs，runtime 再单独拉细节 | |

**User's choice:** 最小只读 DTO
**Notes:** 既给 runtime 足够启动信息，又不把 raw snapshot / DB 结构直接暴露出去。

### capability token / context 的语义

| Option | Description | Selected |
|--------|-------------|----------|
| 会话级授权快照 | 启动时下发 actor scope、school scope、granted capabilities、session/runtime IDs；每次 host action 仍二次校验 | ✓ |
| 直接执行凭证 | 拿到 token 即可直接代表 runtime 执行 host operations | |
| 只做展示上下文 | 不携带 capabilities，只给 actor/session 标签 | |

**User's choice:** 会话级授权快照
**Notes:** token 是上下文和关联键，不是跳过服务端鉴权的执行凭证。

### 是否直接带 latest runtime state 摘要

| Option | Description | Selected |
|--------|-------------|----------|
| 带 latest 摘要 | bootstrap 直接返回当前可恢复 runtime state 的最小恢复数据 | ✓ |
| 只带 session id | 让 runtime 再单独拉状态 | |
| 默认不带 | 每次都从空状态 ready | |

**User's choice:** 带 latest 摘要
**Notes:** 与“按当前 actor 复用 runtime session”保持一致，恢复不应多一次往返。

---

## 写入与事件口径

### 哪些事件必须 durable

| Option | Description | Selected |
|--------|-------------|----------|
| 五类都记 canonical event | `ready / interaction / save / submit / teacher-control` 全部进入 canonical runtime event log / outbox | ✓ |
| 只记关键写入 | 只持久化 `save / submit / teacher-control` | |
| ready+submit 必记 | 只保 lifecycle 起点与最终提交 | |

**User's choice:** 五类都记 canonical event
**Notes:** audit timeline 不能只剩最终写入，起点与过程都需要 canonical durable record。

### `save / submit` 对现有主链的影响

| Option | Description | Selected |
|--------|-------------|----------|
| submit 桥回主链 save 留 runtime 内 | `submit` 更新现有主链读模型与 cache；`save` 只更新 runtime session/state | ✓ |
| save 和 submit 都桥回主链 | 两者都进入现有教师/学生读模型 | |
| 都只留在 runtime session | 先只做 runtime 内闭环 | |

**User's choice:** submit 桥回主链 save 留 runtime 内
**Notes:** 明确锁定“save 不是正式提交”，避免教师和学生 surface 提前看到假提交态。

### `runtime.interaction` 的粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 语义事件 不是原始点击流 | 只记录 runtime 主动上报的业务语义交互 | ✓ |
| 尽量全量 | 交互尽量都上报并持久化 | |
| 只记最终 checkpoint | interaction 只在关键阶段收敛成 checkpoint | |

**User's choice:** 语义事件 不是原始点击流
**Notes:** 保留 inspector / audit 价值，但不把 outbox 和 payload 膨胀成点击流遥测系统。

---

## the agent's Discretion

- `payload.runtime`、bootstrap DTO、runtime session/state、outbox/event payload 的精确字段命名与 schema 颗粒度。
- `submit` 最终桥回哪些现有读模型的组合，以及是否需要新增 runtime-specific DTO 包装层。
- runtime write 的精确 cache invalidation matrix 与是否引入 runtime-specific cache tags。

## Deferred Ideas

- iframe Runtime Host shell、HTML runtime 渲染与 authoring surface
- capability enforcement 细节、plugin lifecycle state machine、allowed/denied audit inspector
- raw clickstream / 高频遥测
- Redis/Event Bus/WebSocket 正式 cutover
- 独立 runtime descriptor registry / metadata truth path
