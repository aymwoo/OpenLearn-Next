# Phase 60: Load, Degrade & Pilot Rehearsal - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把课堂投票样板在单校试点口径下做成可复查的 load/degrade/rehearsal close gate：
用真实样板 smoke、40/5 容量 gate、核心 failure drills、以及一次受控 rollout/rollback rehearsal，证明当前系统不仅能“看起来可跑”，而且已经在试点容量与降级姿态下被正式演练过。

Phase 60 建立在 Phase 57 已锁定的样板链路、Phase 58 已锁定的 degraded honesty / recovery taxonomy、以及 Phase 59 已交付的 deploy/release/rollback/restore baseline 之上。
它不重写课堂投票产品链路，不重开 transport / worker / Redis 架构选择，也不把 SSE fallback、重型 observability 或多校能力夹带进来。

本阶段的正式职责是：
- 把教师设计到学生完成的样板链路与 40 学生 * 5 并发课堂容量口径绑定到正式 gate；
- 把 Redis degraded、worker backlog、学生 reconnect/retry、partial failure 做成明确 automated drills；
- 把 transport fallback、operator escalation、rollout/rollback 做成真实 rehearsal，而不是只保留 runbook 文档；
- 为 milestone close 产出可以直接复查的 proof artifacts，而不是继续依赖口头说明。

</domain>

<decisions>
## Implementation Decisions

### Load gate architecture
- **D-60-01:** Phase 60 的负载验证采用 **分层双轨**：Playwright 只负责锁定真实课堂投票样板 smoke；k6 或等价协议层负载 gate 负责锁定 40/5 容量口径。
- **D-60-02:** 浏览器样板 smoke 与 k6 容量 gate 都是 **hard blockers**；任一失败都不能宣称 Phase 60 close。
- **D-60-03:** 40/5 容量口径必须按 **5 个并发 classroom/session，每个课堂 40 个 student actor** 建模，而不是退化成松散的 200 全局用户池。
- **D-60-04:** Playwright 轨道的职责是证明“真实教师/学生样板链路仍成立”，不是承担容量证明；容量证明必须落在 k6 或等价更稳定的协议/服务层 gate 上。

### Failure drill coverage
- **D-60-05:** Phase 60 的 automated gates 至少必须覆盖四类 failure drill：`Redis degraded`、`worker backlog`、`学生 reconnect/retry`、`partial failure`。
- **D-60-06:** `transport fallback` 在 Phase 60 中保留为 **现场 rehearsal / runbook 执行面**，不是首选 automated gate；它需要验证 operator 何时判定进入 fallback、如何观察影响、何时升级到 rollback。
- **D-60-07:** 所有 failure drills 都必须继续沿用 Phase 58 的 honesty posture 与 Phase 55 的 failure taxonomy；Phase 60 只验证这些姿态在 rehearsal 中是否真实成立，不重写表达语义。

### Stop rules and blocker posture
- **D-60-08:** Phase 60 必须采用 **明确 stop rules**，不能只给 advisory 或“尽量不要失败”的方向性建议。
- **D-60-09:** blocker posture 采用 **关键项一票否决**：样板 smoke 失败、40/5 容量 gate 失败、worker blocking posture 未恢复、或受控 rollback rehearsal 失败，都直接阻断 close。
- **D-60-10:** planner 必须为以下维度给出明确数字阈值并写入计划/验证产物：`reconnect 恢复时长`、`worker backlog 可接受窗口`、`partial failure 可接受比例`、`degraded 持续时长`。讨论阶段先锁维度，不预先锁死具体数字。
- **D-60-11:** 任何超出这些阈值的 rehearsal 结果，都必须被解释为 close blocker、rollback trigger、或至少明确升级条件；不能留给 milestone close 时再口头裁量。

### Rollout and rollback rehearsal depth
- **D-60-12:** rollout/rollback 必须做 **一次受控真回滚 rehearsal**，不能只停留在 dry-run 或桌面推演。
- **D-60-13:** 这次真回滚必须由 **样板回归或 `/api/ready` blocking posture** 触发，保证它直接对齐 Phase 59 的 deploy/rollback contract 与 Phase 60 的 close blocker 语义。
- **D-60-14:** 回滚成功的最低证明固定为 **`/api/health` green + `/api/ready` green + 样板 smoke 恢复通过**；只恢复 probe、不恢复样板链路，不算 rehearsal 完成。
- **D-60-15:** rollout/rollback rehearsal 继续复用 Phase 59 的 canonical manifest、`current.json` / `green.json`、systemd units、checklists 与 release probe truth，不额外发明第二套发布语义。

### Claude's Discretion
- k6 具体场景拆分、VU 组织方式、teacher/student actor 的实现技术、以及 WebSocket/HTTP 混合建模细节，可由 researcher / planner 在不违背 D-60-01 至 D-60-04 的前提下做最小正确收敛。
- stop rule 的具体数值、告警文案、统计窗口、以及 rehearsal summary 的最终表格结构，可由 planner 依据现有 verifier / release artifact 风格统一收敛，但不得把硬 blocker 重新降格为 advisory。
- `transport fallback` rehearsal 的具体执行形式，可选择脚本辅助 + 人工操作记录或等价方式，只要最终能留下清晰的 trigger、影响范围、operator 动作与结论证据。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 60 的正式 goal、requirements、success criteria，以及它对 Phase 59 基线的依赖。
- `.planning/REQUIREMENTS.md` — `PILOT-03`、`OPS-02`、`ENVR-03`、`SAFE-03`、`LOAD-01`、`LOAD-02` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.1` 的 sample chain、40/5 pilot posture、baseline truths 与 out-of-scope fence。
- `.planning/STATE.md` — 当前 milestone posture，确认 Phase 60 是当前 planning target。

### Locked pilot contract and failure taxonomy
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PILOT-CONTRACT.md` — 锁定单校试点定义、样板链路优先级、40/5 容量口径与 anti-smuggling rule。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md` — 锁定 Phase 60 所需 proof artifacts、automated gates 与 rehearsal evidence。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md` — 锁定 degraded / reconnect / backlog / rollback / restore 的 failure groups 与 trigger 语义。

### Upstream phase context that remains locked
- `.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md` — 样板课堂链路、submit/reconnect/idempotency 语义与 teacher-visible result truth 的锁定来源。
- `.planning/phases/58-operator-recovery-and-production-surfaces/58-CONTEXT.md` — degraded honesty、operator recovery、incident-first posture 与 trust-boundary 文案的锁定来源。
- `.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md` — deploy/release/rollback/restore baseline 与 Phase 60 可复用的 official runtime surface。
- `.planning/phases/59-deploy-release-recovery-baseline/59-VERIFICATION.md` — Phase 59 已验证通过的 release/ready/restore truths，Phase 60 应视为基线而不是待补缺口。
- `.planning/phases/59-deploy-release-recovery-baseline/59-RESTORE-DRILL.md` — restore drill 对 `health/ready + sample smoke` close posture 的真实先例。

### Existing verification, rehearsal, and release artifacts
- `package.json` — `verify:phase57`、`verify:phase58`、`verify:phase59`、`test`、`build`、`db:migrate` 等正式脚本入口。
- `scripts/verify-phase57-classroom-runtime.ts` — 现有样板链路 hard gate 与 browser/UAT proof 入口。
- `scripts/verify-phase58-operator-recovery-and-surfaces.ts` — 现有 operator recovery / honesty proof gate，Phase 60 的 degraded drills 需与其口径保持一致。
- `scripts/verify-phase59-deploy-release.ts` — 现有 deploy/release close gate 与 focused suite 骨架，可作为 Phase 60 verifier 组织方式参考。
- `src/lib/ops/release-status.ts` — `/api/health`、`/api/ready`、`/api/release` 的正式 truth surface，尤其是 worker blocking 与 fanout non-blocking degraded 的既有定义。
- `ops/deploy/deploy.sh` — 正式 rollout 路径、release manifest 生成、gate 顺序与失败触发 rollback 的实现真相。
- `ops/deploy/rollback.sh` — 正式 rollback 路径、pointer 回切、systemd restart、post-rollback health/ready 校验真相。
- `ops/releases/checklists/rollout.md` — rollout block trigger、operator correlation、post-deploy verification 的现场检查单。
- `ops/releases/checklists/rollback.md` — rollback trigger、post-rollback verification 与 escalate-to-restore 的现场检查单。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-phase57-classroom-runtime.ts`：已经把“focused suites + browser proof”组织成正式 verifier，可直接复用为 Phase 60 的 Playwright smoke 轨道锚点。
- `scripts/verify-phase58-operator-recovery-and-surfaces.ts`：已经锁定 degraded honesty、recovery walkthrough 与 proof hard gate 文化，可直接复用其 failure-proof 结构。
- `scripts/verify-phase59-deploy-release.ts`：已经提供 repo-local close gate 的 helper / static-check / focused-suite 组织方式，可作为 `verify:phase60` 的脚本骨架。
- `src/lib/ops/release-status.ts`：已经把 `worker = blocking`、`fanout = non-blocking degraded`、`health != ready` 的试点姿态集中化，适合直接作为 backlog / degraded drill 的 truth seam。
- `ops/deploy/deploy.sh` / `ops/deploy/rollback.sh`：已经具备真实 rollout/rollback 执行面、manifest pointer truth、以及 ready 失败自动回滚的路径，不需要 Phase 60 另造第二套脚本。
- `ops/releases/checklists/rollout.md` / `ops/releases/checklists/rollback.md`：已经把现场操作面规范化，Phase 60 只需把 rehearsal 结果补齐为 evidence。

### Established Patterns
- repo-local verification 已形成“`verify:phaseNN` + focused suites + proof script/notes”的 close gate 习惯；Phase 60 应延续，而不是只写临时命令集合。
- 样板链路 proof 必须回挂到真实产品流，而不是单纯 API smoke；Phase 57 已经把 browser/UAT proof 纳入正式 gate。
- degraded posture 的 truth 必须继续以 SQLite + DAL + operator honesty surface 为中心解释；Redis fanout 继续 optional，BullMQ worker 继续 blocking。
- deploy/release/rollback 的正式真相已经收敛到 immutable manifest、`current.json` / `green.json`、systemd、`/api/health`、`/api/ready`；Phase 60 只能复用，不能平行发明。

### Integration Points
- 需要一个新的 `verify:phase60` 或等价 repo-local verifier，把双轨负载 gate、核心 degraded drills、以及 rollout/rollback rehearsal artifact 收敛成同一 close gate。
- 需要新增 k6 或等价负载场景资产，并让它围绕 5 个 classroom/session * 40 students 的 sample-chain 建模，而不是散乱用户洪峰脚本。
- 需要把 Playwright 样板 smoke 与 release/rollback 脚本连上，让“样板回归/ready blocker -> rollback trigger -> post-rollback sample smoke”成为可复查闭环。
- 需要新增 rehearsal summary artifact，把 automated gate 结果、现场演练记录、stop rules 命中情况与最终 go/no-go 结论统一呈现。

</code_context>

<specifics>
## Specific Ideas

- 用“双轨负载 gate”把“真实样板还活着”和“40/5 容量成立”明确拆开，避免浏览器脚本被误当容量证明，也避免纯协议压测丢掉样板闭环。
- 所有核心 failure drill 都应该继续围绕课堂投票样板链路来设计，而不是脱离 sample chain 做通用 infra 演练。
- `transport fallback` 在本期更像一条 operator posture rehearsal，不应该为了脚本化而被误写成常态交付路径。
- rollout/rollback 必须真的走一次“因样板回归或 ready blocker 触发回滚”的现场闭环，回滚后最低证明继续沿用 Phase 59 的 `probe + sample smoke` 口径。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 60-Load, Degrade & Pilot Rehearsal*
*Context gathered: 2026-05-28*
