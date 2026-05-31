# Phase 52: Action Registry & Plugin Lifecycle Governance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 52-action-registry-plugin-lifecycle-governance
**Areas discussed:** Catalog visibility, Lifecycle semantics, Dependency and failure handling, Uninstall and retention

---

## Catalog visibility

| Option | Description | Selected |
|--------|-------------|----------|
| 双视图 | 主 catalog 只返回当前可执行 action；另设 governance/diagnostic 视图暴露 blocked actions。 | ✓ |
| 单一可执行表 | 只返回当前可执行 action，blocked 完全不可见。 | |
| 单一混合表 | 一个 catalog 同时列出可执行和 blocked action。 | |

**User's choice:** 双视图
**Notes:** 主 catalog 只给正常调用方可执行 actions；diagnostic 视图专供 operator / governance 使用。

| Option | Description | Selected |
|--------|-------------|----------|
| 结构化 reason code | blocked reason 用稳定 code + 简短摘要表达。 | ✓ |
| 自然语言说明 | 只给人读的文案。 | |
| 完整内部快照 | 直接暴露 lifecycle / dependency / failure 全量内部状态。 | |

**User's choice:** 结构化 reason code
**Notes:** blocked action 需要 machine-readable diagnostics。

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 operator/governance | 只有治理入口可以看 blocked actions。 | ✓ |
| 所有内部调用方 | 应用内任何内部调用方都能看到 blocked actions。 | |
| 按 capability 开放 | 谁持有特定 capability 谁可见。 | |

**User's choice:** 仅 operator/governance
**Notes:** 普通调用方与默认 future agent 不消费 blocked diagnostics。

---

## Lifecycle semantics

| Option | Description | Selected |
|--------|-------------|----------|
| 对外五态 + 内部细分 | 对外固定 `installed / enabled / active / suspended / uninstalled`；内部保留 `mounted / ready / failed`。 | ✓ |
| 直接暴露全量状态 | 把 `mounted / ready / failed` 也作为正式对外状态。 | |
| 极简四态 | 合并 `enabled` 和 `active`。 | |

**User's choice:** 对外五态 + 内部细分
**Notes:** 对外 contract 要稳，内部 orchestration 细节不直接冻结给外部。

| Option | Description | Selected |
|--------|-------------|----------|
| Enabled=已允许, Active=已可运行 | `enabled` 表示被允许参与系统，`active` 表示依赖满足且已可运行。 | ✓ |
| Enabled 即 Active | enable 成功即 active。 | |
| Active 仅给运行时 | action registry 只看 enabled。 | |

**User's choice:** Enabled=已允许, Active=已可运行
**Notes:** 需要表达 “已 enable 但未成功激活” 的治理状态。

| Option | Description | Selected |
|--------|-------------|----------|
| 内部诊断子状态 | `failed` 只在内部诊断层表达。 | ✓ |
| 正式第六状态 | 把 `failed` 升格为正式外部状态。 | |
| 挂到 suspended | 失败统一映射成 `suspended`。 | |

**User's choice:** 内部诊断子状态
**Notes:** 不把失败细节冻结为长期 lifecycle contract。

---

## Dependency and failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| 受影响范围内 fail-fast | 只阻止受影响插件及其依赖链下游进入 active。 | ✓ |
| 全局 fail-fast | 任一插件出问题就阻止所有插件激活。 | |
| 允许部分激活并降级 | 尽量继续激活其余插件，即使存在不一致状态。 | |

**User's choice:** 受影响范围内 fail-fast
**Notes:** 不把整个平台一起拖停，但必须阻止受影响链条半启动。

| Option | Description | Selected |
|--------|-------------|----------|
| 插件级 + reason code | 至少明确是哪个插件、什么失败类别。 | ✓ |
| 插件级 + 依赖链摘要 | 再加阻塞链路摘要。 | |
| 完整内部错误细节 | 直接暴露内部错误细节。 | |

**User's choice:** 插件级 + reason code
**Notes:** 先保证治理粒度稳定，不把内部细节暴露过深。

| Option | Description | Selected |
|--------|-------------|----------|
| 显式恢复 | 修复后通过 enable / retry / reconcile 显式恢复。 | ✓ |
| 依赖恢复后自动重试 | 依赖满足后自动再次激活。 | |
| 仅系统启动时重试 | 只在 bootstrap/reconcile 批次重试。 | |

**User's choice:** 显式恢复
**Notes:** 生命周期变化必须保持可审计、可归因。

---

## Uninstall and retention

| Option | Description | Selected |
|--------|-------------|----------|
| 默认保留数据 + 可选 cleanup | uninstall 默认 retain；cleanup 需显式请求。 | ✓ |
| 默认全清理 | 卸载即默认清除数据。 | |
| 只允许保留，不支持 cleanup | 本阶段只定义逻辑卸载。 | |

**User's choice:** 默认保留数据 + 可选 cleanup
**Notes:** 与治理目标中 retention / cleanup 明确分离的要求一致。

| Option | Description | Selected |
|--------|-------------|----------|
| 必须显式确认可清理项 | preflight 必须列出并确认 cleanup 影响。 | ✓ |
| 给出提示即可继续 | 只提示风险，不需要额外确认。 | |
| 高风险一律阻止 | 只要有数据影响就禁止 cleanup。 | |

**User's choice:** 必须显式确认可清理项
**Notes:** cleanup 被视为显式高风险治理动作。

| Option | Description | Selected |
|--------|-------------|----------|
| 不可卸载，仅可 disable/suspend | built-in/default 共用 lifecycle model，但仍不可卸载。 | ✓ |
| 允许卸载，但默认保留数据 | built-in/default 与普通插件完全同等。 | |
| 仅 default 可卸载 | built-in 不可卸载，default 可卸载。 | |

**User's choice:** 不可卸载，仅可 disable/suspend
**Notes:** 保留现有产品语义，同时继续共用统一治理模型。

---

## the agent's Discretion

- reason code 的具体命名、descriptor schema 字段名、projection/table 命名，由 planner 在项目现有命名风格下收敛。
- operator/governance diagnostic 视图最终作为独立 query surface 还是治理 API 变体，由 planner 决定。

## Deferred Ideas

- 让 blocked action diagnostics 对所有普通调用方可见。
- 把 `failed` 升格为正式 lifecycle state。
- 自动恢复 / 自动重试 activation。
- built-in/default plugin 可卸载化。
