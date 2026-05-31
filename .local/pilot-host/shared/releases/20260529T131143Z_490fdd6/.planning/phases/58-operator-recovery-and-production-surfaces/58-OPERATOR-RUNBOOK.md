# Phase 58 Operator Runbook Excerpt

> 适用范围：课堂投票样板在单校试点中的 incident-first support / operator 值守。
>
> 证据基线回挂：[`55-PROOF-INVENTORY.md`](../55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md) 与 [`55-FAILURE-RECOVERY-MATRIX.md`](../55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md)。

## 统一入口

1. **没有 deep link 时，一律先去** `/settings/labs` 或 `/settings/labs/incidents`。
2. **先读 classroom incident card / detail**，不要先跳 Runtime Inspector、Async Operator 或插件治理工具页。
3. **先确认 honesty posture**：
   - 仍可信什么 / 已不可信什么
   - 影响范围
   - 推荐下一步

这三段是 support 的可信边界，不要把 badge、reason code、或某一条日志当成完整事实。

## Scenario A — plugin failure

对应 Phase 55 taxonomy：`plugin disabled or incompatible` / `activation_failed`。

### 标准入口

- 从 `Settings Labs` 的 classroom incidents 卡片进入受影响课堂。
- 在课堂事件 detail 中确认：
  - 当前课堂是否仍有 SQLite canonical truth 与课堂 session 可作为锚点。
  - 插件恢复结果是否已经失真或尚未收敛。

### 正确动作

1. 先在课堂事件页执行**轻量恢复**：`retry` 或 `reconcile`。
2. 若事件要求姿态变化，再去插件治理 detail 执行 **reason-gated** 动作：
   - `enable`
   - `retry`
   - `resume`
   - `reconcile`
3. 若仍 blocked，记录 reason code，并按 `55-FAILURE-RECOVERY-MATRIX.md` 升级给开发。

### 不可直接执行的动作

- **不要**在 summary surface 直接做 `resume / suspend / fallback`。
- **不要**跳过 incident detail 直接改插件状态。
- **不要**凭“插件看起来启用了”就判定课堂已恢复。

### 无需 DB surgery 的证据点

- 课堂事件 summary 的轻量恢复走 `runOperatorClassroomRecoveryAction -> runCurrentVotingRecoveryAction`。
- 插件治理 detail 的高风险动作走受控 Server Actions / command bus / audit trail。
- 恢复是否生效，应以课堂事件、插件治理 detail、命令/任务详情中的正式记录为准，而不是手工改库。

## Scenario B — transport / worker degraded

对应 Phase 55 taxonomy：`transport degraded or reconnect issue` / `worker backlog or retry failure`。

### 标准入口

- 从 `Settings Labs` incident list 进入受影响课堂，或从课堂 shell 的 **查看课堂事件** 进入。
- 先读 degraded honesty：
  - 当前是否仍可信 SQLite canonical truth / task ledger / 已完成 evidence。
  - 当前不可直接信任的是跨实例 fanout、即时队列处理或补偿已完成假设。

### 正确动作

1. 若是 transport degraded：
   - 从课堂事件进入 Runtime Inspector，确认 transport / consumer / governance lane。
   - 继续观察是否是局部 degraded 还是课堂级影响扩大。
2. 若是 worker degraded：
   - 从课堂事件进入 Async Operator。
   - 先看 backlog posture，再看 problem task detail。
   - 只执行正式支持的 retry / reconcile / detail recovery。

### 不可直接执行的动作

- **不要**在课堂 shell 上恢复 `resume / suspend / fallback` 快捷路径。
- **不要**把 Runtime Inspector 当成“修复工具台”；它先是事实面，再决定是否下钻。
- **不要**手工删除任务、清空队列记录或直接改 session / evidence 行。

### 无需 DB surgery 的证据点

- degraded honesty 已明确区分“仍可信什么 / 已不可信什么”。
- Async Operator 与 Runtime Inspector 都通过正式 DTO / DAL / Server Actions 提供恢复判断。
- 标准恢复证据来自 classroom incident、runtime timeline、task history、plugin governance audit，而不是 SQL 改写。

## 升级条件

满足以下任一条件时升级：

- reason code 与实际姿态不一致。
- `retry` / `reconcile` 完成后，课堂事件仍无法收敛到新的 authoritative posture。
- degraded 状态超过值守窗口，或开始影响多个课堂。
- support 无法用正式页面给出“当前可信边界 + 下一步”，只能依赖猜测。

## 交接口径

交给下一位 operator / support 时，最少写清：

1. 从哪个课堂事件进入。
2. 当前 honesty posture 三段分别是什么。
3. 已执行过哪些正式恢复动作。
4. 为什么判断**无需 DB surgery**，以及剩余升级项是什么。
