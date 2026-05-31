# Phase 57: Classroom Runtime Sample Chain - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 57-classroom-runtime-sample-chain
**Areas discussed:** 开课门禁, 投票互动形态, 重复与重连语义, 教师结果视图

---

## 开课门禁

| Option | Description | Selected |
|--------|-------------|----------|
| 只拦 blocker | 只有 blocking issues 禁止开课；attention/advisory 仅提示 | ✓ |
| 拦 blocker+部分 attention | 某些高风险 attention 也禁止开课 | |
| 几乎都可开课 | 除绝对致命错误外都允许开课 | |

**User's choice:** 只拦 blocker
**Notes:** launch blocker 要按 step 定位；attention 只警示、不加二次确认；开课后若 posture 变差，转课堂内告警，不自动终止 session。

---

## 投票互动形态

| Option | Description | Selected |
|--------|-------------|----------|
| 老师触发后全班同步投票 | teacher 触发后，全班进入明确投票态 | ✓ |
| 普通 quiz 步骤完成 | student 像普通 quiz 一样自行完成 | |
| 两者兼容 | 同时支持同步投票和自行完成 | |

**User's choice:** 老师触发后全班同步投票
**Notes:** 触发后 student 强制切到当前投票 step；投票由老师显式结束；student 提交后显示已提交并等待老师结束。

---

## 重复与重连语义

| Option | Description | Selected |
|--------|-------------|----------|
| 允许覆盖最后一次提交 | 截止前可改票，latest truth 认最后一次有效提交 | ✓ |
| 首提交锁定 | 首次提交后不允许再改 | |
| 只允许一次重提 | 给一次改票机会 | |

**User's choice:** 允许覆盖最后一次提交
**Notes:** 同 payload 重复提交按幂等去重；重连后恢复当前投票态并带回已提交状态；老师结束后新提交明确拒绝。

---

## 教师结果视图

| Option | Description | Selected |
|--------|-------------|----------|
| 实时汇总 + 未完成人数 | 首屏先看全班分布与完成规模 | ✓ |
| 实名明细优先 | 首屏直接展示每个学生投票详情 | |
| 只看完成率 | 先看有多少人提交 | |

**User's choice:** 实时汇总 + 未完成人数
**Notes:** 未完成名单单独成块；实名结果默认折叠、按需展开；投票进行中实时更新，老师结束后冻结结果。

---

## the agent's Discretion

- teacher trigger / stop voting 的具体 command naming 与 DTO 字段命名
- realtime aggregate 的具体 UI 呈现方式
- 幂等去重的技术实现形式（request token / payload hash / equivalent replay-safe seam）

## Deferred Ideas

None.
