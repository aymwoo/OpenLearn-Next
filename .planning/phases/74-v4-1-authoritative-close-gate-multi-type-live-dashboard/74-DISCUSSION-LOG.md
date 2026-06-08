# Phase 74: v4.1 Authoritative Close Gate (Multi-Type + Live Dashboard) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 74-v4.1 Authoritative Close Gate (Multi-Type + Live Dashboard)
**Areas discussed:** 脚本分层, 主闸门切换, 人审证据, 验证报告结构

---

## 脚本分层

| Option | Description | Selected |
|--------|-------------|----------|
| 两层结构 | 先补一个 `verify:phase73` 作为 Phase 73 的可独立复跑 verifier，再由 `verify:phase73-v41-close-gate` 作为里程碑 close gate 包在外层。 | ✓ |
| 单层最终闸门 | 直接只做一个最终 `verify:phase73-v41-close-gate`。 | |
| 保留72外层 | 继续让 `verify:phase72` 做外层入口，只是在里面串上 v4.1 检查。 | |

**User's choice:** 两层结构
**Notes:** 进一步锁定外层只包内层 `verify:phase73`，只额外检查 final artifacts、manual sign-off、proof chain，不重复产品断言。

---

## 主闸门切换

| Option | Description | Selected |
|--------|-------------|----------|
| 最后再切 | 等脚本、三件套、manual sign-off 全齐后再切 `verify:phase`。 | ✓ |
| 尽早切换 | 一开始就把 `verify:phase` 指到新链路。 | |
| 双入口并行 | 暂时保留两个权威入口。 | |

**User's choice:** 最后再切
**Notes:** 进一步锁定切换门槛：`verify:phase73`、`verify:phase73-v41-close-gate`、`73-VERIFICATION.md`、`73-PROOF-MAPPING.md`、`73-CLOSEOUT.md` 全齐，且两条新增 manual sign-off 都真实 passed 后，才允许把 `verify:phase` 从 `verify:phase72` 改过去。

---

## 人审证据

| Option | Description | Selected |
|--------|-------------|----------|
| 必须真人观察 | 新增 2 行 manual sign-off 只能由真人观察后记为 `status: passed`。 | ✓ |
| 静态先过 | 允许脚本/grep/smoke 先记为 passed。 | |
| 混合口径 | 部分允许自动化，部分必须真人。 | |

**User's choice:** 必须真人观察
**Notes:** 进一步锁定 `executed_by` 填真实执行观察的人，不要求固定负责人，只要求审计真实。

---

## 验证报告结构

| Option | Description | Selected |
|--------|-------------|----------|
| 按用户链路 | 先讲多题型 recap、实时 dashboard 两条用户链路。 | ✓ |
| 按7个stage | 严格按 gate 7 个 stages 平铺。 | |
| 链路优先+stage映射 | 正文按链路，内部强绑定 stages。 | |

**User's choice:** 按用户链路
**Notes:** 进一步锁定文末需要一个显式 `user flow -> 7 stages` 对照区，便于 proof mapping 与 gate script 回指。

---

## the agent's Discretion

None.

## Deferred Ideas

None.
