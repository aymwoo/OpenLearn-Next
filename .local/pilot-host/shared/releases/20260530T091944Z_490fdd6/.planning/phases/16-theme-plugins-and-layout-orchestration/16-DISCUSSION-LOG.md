# Phase 16: Theme plugins and layout orchestration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 16-theme-plugins-and-layout-orchestration
**Areas discussed:** 导航壳层 ownership, 页面编排覆盖范围, layout contract 粒度, fallback 与可理解性

---

## 导航壳层 ownership

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | 只支持两种一级导航模式：`left nav` 和 `top nav` | |
| 2 | 支持 `top nav + secondary rail` 的中等复杂壳层 | |
| 3 | 支持更自由的 hybrid shell | ✓ |

**User's choice:** 3
**Notes:** 最终收敛为 allowlisted hybrid shell，而不是无限制自由拼装。必需支持的壳层组合为 `left nav`、`top nav`、`top nav + left secondary rail`。

---

## 壳层生效范围

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | 整个 teacher workspace 统一一种壳层 | |
| 2 | 按页面类型切换壳层 | |
| 3 | 主题有默认壳层，但少数或多数页面可覆写 | ✓ |

**User's choice:** 3
**Notes:** 继续追问后，用户明确大多数 teacher 页面可覆写，且不为 editor、launch、classroom runtime 预留固定壳层豁免。

---

## 页面编排覆盖范围

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | 只覆盖 teacher 壳层和首页型页面 | |
| 2 | 覆盖大多数 teacher 管理页 | |
| 3 | 覆盖所有 teacher-facing 页面 | ✓ |

**User's choice:** 3
**Notes:** 进一步收敛为“覆盖所有 teacher-facing 页面，但只允许页面级区域顺序调整，不进入业务组件内部结构重排”。

---

## Layout contract 粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | 纯 token 扩展 | |
| 2 | region-based contract | ✓ |
| 3 | slot-based contract | |

**User's choice:** 2
**Notes:** 首发 allowlisted regions 定为 `primary-nav`、`secondary-nav`、`page-header`、`main-content`、`context-panel`、`page-footer`。其中核心 regions 必须存在，辅助 regions 可显隐。

---

## Region 内模块编排

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | 主题只管 region 壳层，不管模块集合 | |
| 2 | 主题可选择 allowlisted 模块集合并调整顺序 | |
| 3 | 主题可选择 allowlisted 模块集合、调整顺序并控制大小占比 | ✓ |

**User's choice:** 3
**Notes:** 模块大小占比不接受任意值；最终锁定为少量比例枚举，例如 `30/70`、`40/60`、`50/50`、`60/40`。

---

## Fallback 与设置页可理解性

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | 整个页面退回默认布局 | |
| 2 | 按 region 局部回退 | ✓ |
| 3 | 按模块局部回退 | |

**User's choice:** 2
**Notes:** richer theme 的说明方式选择“结构摘要”，而不是一句话描述或缩略 wireframe 预览。

---

## Claude's Discretion

- 具体 layout schema 字段命名
- region fallback 的内部实现方式
- settings 页结构摘要的最终文案格式
- shell 内部 CSS grid/flex 与 spacing token 的实现细节

## Deferred Ideas

None
