# Phase 25: Teaching data capture and session analytics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 25-teaching-data-capture-and-session-analytics
**Areas discussed:** Recap 入口路径, 提交/反馈工作量, 钻取结构, 完成/参与口径

---

## Recap 入口路径

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂内续流 | 结束课堂后仍在 `/classroom` 同一上下文进入 recap | ✓ |
| 独立分析页 | 结束后跳到新的 teacher analytics / recap 路由 | |
| 双入口并存 | 同时提供课堂内直达和独立入口 | |

**User's choice:** 保持课堂内续流。
**Notes:** 用户进一步锁定了两点：`/classroom` 在 session `ended` 后主舞台直接切为 recap 版面；后续历史回看也从 `/classroom` 内的课堂记录列表打开，而不是挂到 `/teacher/review` 或新的 teacher analytics 主入口。

---

## 提交/反馈工作量

| Option | Description | Selected |
|--------|-------------|----------|
| 只算待反馈提交 | 仅统计 task / quiz latest attempt 是否缺 `attemptFeedback` | |
| 提交+课堂观察都算一个数 | 把 feedback 与 classroom follow-up 混成单一总负载 | |
| 拆成两类 | 拆为“待反馈提交”和“待跟进课堂信号” | ✓ |

**User's choice:** 拆成两类工作量。
**Notes:** 用户补充锁定：
- `待反馈提交` 以 latest task / quiz attempt 为单位统计，不看历史尝试总数。
- `待跟进课堂信号` 只纳入强确定性信号，不做泛化大杂烩。
- 对 quick response / classroom evidence 这类 classroom-domain 信号，只要老师已经留下 formative evaluation，就视为已处理。

---

## 钻取结构

| Option | Description | Selected |
|--------|-------------|----------|
| 按学生 | 总指标先按学生展开，再进个人 session 摘要与 raw evidence | ✓ |
| 按环节 | 总指标先看步骤层表现 | |
| 按时间线 | 总指标先回到统一时间线 | |

**User's choice:** student-first drill-down。
**Notes:** 用户继续锁定了三层结构：
- 单学生默认先看“本次 session 摘要”，不是直接丢进原始记录流。
- raw evidence 在 recap 中按分组展开，而不是统一塞进一条时间线或拆跳旧页面。
- 需要保留次级步骤视角，帮助老师复盘“哪一环节出了问题”，但这只能是辅助面板，不能取代 student-first 主路径。

---

## 完成/参与口径

| Option | Description | Selected |
|--------|-------------|----------|
| 以 session 结束时最终状态为准 | 主 completion metric 反映这节课结束时的最终结果 | ✓ |
| 以课堂过程最差状态为准 | 中途掉队直接影响 headline metric | |
| 让教师评价覆盖主口径 | 用过程评价直接修正完成判断 | |

**User's choice:** 完成率看 session 结束时最终状态；参与情况以教师三档评价为主。
**Notes:** 用户额外锁定：
- 中途掉线、回连、短时掉队等波动应留在 raw evidence / timeline 解释层，不进入主完成率 headline。
- participation 主指标优先基于 `积极参与 / 正常参与 / 需要关注` 三档过程评价。
- 未被教师评价的学生必须明确标记为“未评价”，不能自动推断或默认归类。

---

## the agent's Discretion

- `/classroom` 下 ended-session recap 的具体 route shape 可以在 planning 阶段收敛，但必须保留 session 主域与自动切换 recap 语义。
- 单学生 session 摘要卡的具体字段顺序和视觉层级可由 planning 结合现有 surface 语言收敛。
- `掉队或未提交关键证据` 的精确 deterministic 判定公式可由 researcher / planner 基于现有 monitoring contracts 细化。

## Deferred Ideas

- 跨 session / 跨 lesson 趋势分析与长期对比视图。
- AI narrative recap 或自动洞察文案。
- 把 `/teacher/review` 与 classroom recap 合并成统一评价系统。
- 为每条 classroom evidence 单独引入 handled state machine。
