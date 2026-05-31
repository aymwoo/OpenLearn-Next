# Phase 26: Cross-session trends and Stitch productization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 26-cross-session-trends-and-stitch-productization
**Areas discussed:** 趋势入口与导航, 趋势比较口径, 趋势钻取路径, 跨页面产品化语言

---

## 趋势入口与导航

| Option | Description | Selected |
|--------|-------------|----------|
| 独立趋势入口 | 新增独立 teacher trends/analytics 入口；`/classroom` 继续只管运行与单次 recap，`/teacher/review` 继续只管 lesson-level feedback。 | ✓ |
| 并入批改中心 | 放进 `/teacher/review` 里做 tab 或分区，趋势分析与逐条批改混在同一主入口。 | |
| 留在课堂域 | 继续从 `/classroom` 扩成趋势入口，减少新导航但会冲击已锁定的 classroom 边界。 | |

**User's choice:** 独立趋势入口。
**Notes:** 趋势页采用双入口：既作为教师主导航一级入口，也允许从单次 `/classroom` recap 深链进入同一趋势页面。

---

## 趋势比较口径

| Option | Description | Selected |
|--------|-------------|----------|
| 班级趋势优先 | 先看整班最近几次课的参与、完成、提交和待反馈走势，再钻到单个学生。 | ✓ |
| 学生趋势优先 | 先看学生连续表现和重点名单，再回看班级整体走势。 | |
| 双列并列 | 首屏同时给班级趋势和重点学生趋势，信息更全但密度更高。 | |

**User's choice:** 班级趋势优先。
**Notes:** 班级趋势的首发默认比较单位固定为“最近几次真实 classroom session”，而不是先做 lesson-first 聚合。

---

## 趋势钻取路径

| Option | Description | Selected |
|--------|-------------|----------|
| 先在趋势内展开 | 先在 trends 页面内展开对应 session 摘要、学生名单和关键指标，再决定是否跳去其他工作台。 | ✓ |
| 直接跳单次复盘 | 一点击就跳回对应 `/classroom?sessionId=...` 的单次 recap。 | |
| 直接跳批改中心 | 直接去 `/teacher/review` 做 follow-up。 | |

**User's choice:** 先在趋势内展开。
**Notes:** 在 trends 展开后，主下一跳优先回对应 single-session `/classroom` recap；`/teacher/review` 作为次级 follow-up 去向保留。

---

## 跨页面产品化语言

| Option | Description | Selected |
|--------|-------------|----------|
| 强统一骨架 | 共享同一套 header 节奏、hero/section 层级、CTA 语法、状态卡语言；每页只在主工作区结构上变化。 | ✓ |
| 中度统一 | 统一颜色、圆角和卡片节奏，但允许每页继续各自定义 header 和状态表达。 | |
| 仅视觉统一 | 主要统一配色和质感，信息架构与页面姿态可以差异更大。 | |

**User's choice:** 强统一骨架。
**Notes:** 本轮统一范围明确包括 `editor / launch / classroom`、`review / trends`、`teacher dashboard`，以及 `help / settings` 等次级教师页面。

---

## the agent's Discretion

- 独立 trends route 的精确命名仍可由 planner 收敛。
- trends 的具体图形与模块形式未锁死，但必须服从“班级优先、最近 session 优先、先页内展开再回单次 recap”的工作流。
- 次级页继承统一骨架的具体组件切分和 responsive 简化方式仍留给 planner / researcher 决定。

## Deferred Ideas

None — discussion stayed within phase scope.
