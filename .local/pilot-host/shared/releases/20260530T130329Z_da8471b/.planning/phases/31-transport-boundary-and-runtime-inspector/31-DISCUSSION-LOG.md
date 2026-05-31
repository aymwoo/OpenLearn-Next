# Phase 31: transport-boundary-and-runtime-inspector - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 31-transport-boundary-and-runtime-inspector
**Areas discussed:** Transport Gateway, Inspector Main View, Health Semantics, Roles And Entry

---

## Transport Gateway

| Option | Description | Selected |
|--------|-------------|----------|
| 单一统一 gateway | 所有 runtime / classroom producer 都进入同一个 transport publish 入口 | ✓ |
| 按领域分两个 gateway | runtime 与 classroom 分别入口，底层共享 adapter | |
| 保留现有直连 adapter，只加薄封装 helper | 最小改动，但 boundary 最弱 | |

**User's choice:** 单一统一 gateway
**Notes:** 业务代码不再直连 transport adapter，后续 inspector 需要统一解释整条 delivery 链路。

| Option | Description | Selected |
|--------|-------------|----------|
| 按 event channel / event kind 路由 | 由标准化事件语义决定 dispatch | ✓ |
| 按 producer type 路由 | 由 runtime/classroom/plugin 等 producer 决定 dispatch | |
| 混合路由 | 先按 producer type，再按 channel/kind | |

**User's choice:** 按 channel/kind 路由
**Notes:** transport boundary 要优先按事件语义解耦，而不是继续绑在业务 producer 上。

| Option | Description | Selected |
|--------|-------------|----------|
| 只返回 accepted | 只确认 gateway 已接受请求 | |
| 返回二段式结果：truth persisted + delivery attempted | 分开表达 durable truth 与 transport attempt | ✓ |
| 返回强结果：delivered / not delivered | 以 consumer 是否真正收到为强语义 | |

**User's choice:** 返回二段式结果：truth persisted + delivery attempted
**Notes:** 避免把 transport delivery 结果误当成系统真相。

---

## Inspector Main View

| Option | Description | Selected |
|--------|-------------|----------|
| 单条统一 timeline | runtime/plugin/transport/governance traces 串成一条时间线 | ✓ |
| 概览页 + 分 tab 深查 | 先看卡片概览，再切多个 tab | |
| 对象优先详情页 | 先选对象，再看局部 timeline | |

**User's choice:** 单条统一 timeline
**Notes:** 首屏优先服务链路解释和排障，而不是模块化概览。

| Option | Description | Selected |
|--------|-------------|----------|
| runtime session | 围绕单次 runtime 运行实例组织 timeline | ✓ |
| classroom session | 围绕课堂会话组织 timeline | |
| target object 通用锚点 | 先选对象类型再进入 timeline | |

**User's choice:** runtime session
**Notes:** 首发先追清一次 runtime run 的完整因果链。

---

## Health Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 deterministic health | 只汇总持久化事实，不做推测 | ✓ |
| deterministic 为主 + 少量运营信号 | 在事实基础上加少量规则 | |
| 偏运营告警型 health | 主要靠时间窗口和异常频率判定 | |

**User's choice:** 纯 deterministic health
**Notes:** health 不引入新的真相源或推测型告警系统。

---

## Roles And Entry

| Option | Description | Selected |
|--------|-------------|----------|
| 先放在 `/classroom` 内联入口 | 就地课堂排障 | |
| 做成独立 inspector 页面 | 独立 operator surface | ✓ |
| 双入口 | 课堂内联 + 独立页面 | |

**User's choice:** 做成独立 inspector 页面
**Notes:** inspector 首发定位为 operator-grade 独立页面，不是 classroom 附件。

| Option | Description | Selected |
|--------|-------------|----------|
| 教师只看自己相关，管理员/开发者看全局或更广范围 | 按角色分层 | ✓ |
| 教师和管理员都只看自己范围，只有开发者看全局 | 更保守 | |
| 所有角色都可广泛查看，再做字段裁剪 | 范围最宽 | |

**User's choice:** 教师只看自己相关，管理员看本校范围，开发者看系统/开发范围
**Notes:** 继续沿用现有 actor scope 与 school scope，inspector 不成为权限例外面。

---

## Claude's Discretion

- 统一 gateway 的内部命名、registry/API 结构
- inspector 独立页面的精确路由与布局细节
- deterministic health 的字段命名与摘要组织

## Deferred Ideas

- WebSocket 正式 cutover 与更高级 transport parity
- 推测型告警与监控系统
- `/classroom` 内的近场 inspector 快捷入口
