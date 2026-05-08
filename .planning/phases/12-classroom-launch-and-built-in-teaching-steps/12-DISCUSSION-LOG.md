# Phase 12: Classroom Launch and Built-in Teaching Steps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution
> agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives
> considered.

**Date:** 2026-05-08
**Phase:** 12-classroom-launch-and-built-in-teaching-steps
**Areas discussed:** 开课入口与恢复策略, 开课前预览深度, 作者页内置教学环节入口, 插件市场默认态

---

## 开课入口与恢复策略

| Option | Description | Selected |
|--------|-------------|----------|
| 默认新开课堂 | Dedicated launch page leads with creating a new classroom. Resume stays secondary. | ✓ |
| 默认恢复进行中课堂 | If a live session exists, foreground recovery over new launch. | |
| 双主路径并列 | Give launch and resume equal weight on first load. | |

**User's choice:** 默认新开课堂
**Notes:**
- 独立 launch 页面仍以新建课堂为主。
- 只在次要位置提示可恢复进行中的课堂。

---

## 开课前预览深度

| Option | Description | Selected |
|--------|-------------|----------|
| 内联详细预览 | Show step order, summaries, durations, and material cues directly on the launch page. | ✓ |
| 最小预览 | Show only title, step count, and a lightweight confirmation summary. | |
| 独立预览页 | Move preview into a separate view before launch. | |

**User's choice:** 内联详细预览
**Notes:**
- 在 launch 页内联展示步骤顺序、摘要、时长和材料提示。

---

## 作者页内置教学环节入口

| Option | Description | Selected |
|--------|-------------|----------|
| 一级选项 + 独立分组 | Built-in teaching steps are directly selectable and grouped under a dedicated built-in section. | ✓ |
| 二级选择器 | Teacher first picks a broad category, then selects a built-in step template. | |
| 与基础步骤完全混排 | Built-in steps appear without a distinct built-in grouping. | |

**User's choice:** 一级选项 + 独立分组
**Notes:**
- 在“新增步骤”里直接可选。
- 放到“内置教学环节”分组。

---

## 插件市场默认态

| Option | Description | Selected |
|--------|-------------|----------|
| 已启用可关闭不可删除 | Built-in plugins start enabled, may be turned off, and cannot be deleted. | ✓ |
| 已启用且不可关闭 | Built-in plugins are always-on system features. | |
| 普通插件处理 | Built-in plugins behave like removable marketplace plugins. | |

**User's choice:** 已启用可关闭不可删除
**Notes:**
- 需要明确标记 `系统内置` / `默认开启`。
- 不能让它们看起来像普通第三方插件。

---

## Claude's Discretion

- Exact information architecture for the secondary resume affordance.
- Exact visual treatment of built-in plugin badges and status markers.
- Exact extraction boundary between launch-page preview components and reused
  authoring/runtime display components.

## Deferred Ideas

None.
