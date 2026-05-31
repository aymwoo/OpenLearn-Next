# Phase 32: End-to-end hardening and milestone proof - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 32-End-to-end hardening and milestone proof
**Areas discussed:** 主链路证明, 提交后姿态, 故障恢复, Proof 交付物

---

## 主链路证明

| Option | Description | Selected |
|--------|-------------|----------|
| 教师开课链路 | `editor/publish -> launch/classroom -> 学生互动提交 -> inspector` 作为主线 proof | ✓ |
| 学生直达 player | 从已发布 lesson 直接进入 `/student/player` 完成交互与 proof | |
| 双路径并列 | 教师开课链路与 player 直达链路同级 proof | |

**User's choice:** 教师开课链路
**Notes:** proof 建立在固定 demo lesson/session/账号数据上；必须可重复演示；结束后通过 `runtimeSessionId` 直达 inspector。

---

## 提交后姿态

| Option | Description | Selected |
|--------|-------------|----------|
| 完成态锁定 | submit 后进入 terminal state，不再允许编辑/再次提交 | ✓ |
| 完成态可回看 | 允许查看但不再提交 | |
| 允许 resubmit | 继续修改并再次提交 | |

**User's choice:** 完成态锁定
**Notes:** 学生端必须展示提交摘要与成功确认；教师侧第一反馈落在 `/classroom`；submit 后彻底禁用 `save`。

---

## 故障恢复

| Option | Description | Selected |
|--------|-------------|----------|
| 停留当前页并显式失败态 | 在当前 runtime 保留上下文并显示失败 | ✓ |
| 自动静默重试 | 后台优先重试，不强调失败可见性 | |
| 直接退出回 player | 失败后回 lesson/player 壳层 | |

**User's choice:** 停留当前页并显式失败态
**Notes:** 学生端主恢复动作是重试当前失败动作；教师先在 `/classroom` 感知异常，再把 inspector 作为标准第二步排障。

---

## Proof 交付物

| Option | Description | Selected |
|--------|-------------|----------|
| 可重复 demo + verifier 双轨 | 既有 seeded demo，也有 canonical `verify:phase32` | ✓ |
| 只要 verifier | 主要依赖自动验证 | |
| 只要 demo surface | 主要依赖演示，不强调统一 gate | |

**User's choice:** 可重复 demo + verifier 双轨
**Notes:** handoff 以 seeded demo lesson + 明确入口文档为主；`verify:phase32` 是 Phase 级总闸门；产品化重心放在现有 surfaces 的 demo affordance 收口，不新建 milestone dashboard。

---

## the agent's Discretion

- demo seed 的具体命名、数据组织和 bootstrap 细节可由 planner 收敛。
- 完成态/失败态文案、CTA 位置和 deep-link 交互可由 planner / executor 在既有 surface 里细化。
- `verify:phase32` 的实现结构和静态 guard 分类可由 planner 决定，但必须保持单一 canonical gate。

## Deferred Ideas

- 把 `/student/player` 直达路径提升为同级 canonical proof
- 新建独立 milestone dashboard / demo hub 页面
- submit 后允许 resubmit 或继续 save
- 失败时自动强制跳转 inspector
