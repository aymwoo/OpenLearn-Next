---
phase: 42-operator-visibility-and-recovery
verified: 2026-05-19T15:41:00+08:00
status: complete
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - description: Settings Labs operator IA feels parallel to Runtime Inspector rather than a generic admin console
    expected: async operator quick link and page rhythm feel like an operator tool inside Settings Labs, not a generic admin dashboard
  - description: Retry confirm interaction clearly communicates same-task new attempt and recovery-event semantics before execution
    expected: failed recovery-enabled task detail shows the required confirm copy, then returns to honest retrying posture after submit
---

# Phase 42: operator visibility and recovery verification report

本报告按 Phase 42 的 roadmap success criteria、3 个 plan 文件、focused suites、canonical verifier 与最终人工 UAT 倒推验证。当前结论是：**所有自动化 must-haves 与 2 项人工 UAT 均已通过；Phase 42 已达到完成态。**

**Phase Goal:** 把 async platform 做成可运营能力，而不是只在 worker 日志里看 job id；operator 必须能看健康、看错误、看历史，并执行安全重试。
**Verified:** 2026-05-19T15:41:00+08:00
**Status:** complete

## Goal achievement

### Observable truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Operator 可以从应用内看到 queue health、worker connectivity、backlog posture 与 degraded honesty | ✓ VERIFIED | `src/features/async-tasks/infra/heartbeat.ts`、`src/features/async-tasks/worker/bootstrap.ts`、`src/lib/dal/async-task-operator.ts`、`src/components/surfaces/async-task-operator-surface.tsx` 共同形成 durable heartbeat + request-fresh overview surface。 |
| 2 | Operator 可以查看单个任务的状态摘要、latest error、progress snapshot、attempt groups 与 timeline | ✓ VERIFIED | `src/lib/dto/async-task-operator.ts`、`src/lib/dal/async-task-operator.ts`、`src/components/surfaces/async-task-operator-detail-surface.tsx` 提供 summary-first detail read model 与 surface。 |
| 3 | Operator recovery 只对受支持的 failed task 开放，并在同一 durable task 下追加新 attempt | ✓ VERIFIED | `src/features/async-tasks/server/recovery.ts` 消费 registry `operatorRecovery` metadata，先 seed ledger，再走 `Job.retry()`，并写 recovery audit events。 |
| 4 | Operator-facing surfaces 全部通过应用 read model / DTO 暴露状态，而不是直接读取 BullMQ admin state | ✓ VERIFIED | `src/app/settings/labs/async-tasks/page.tsx`、`src/app/settings/labs/async-tasks/[taskId]/page.tsx` 仅装配 DAL； verifier 也静态阻断了 direct `bullmq` / `@/db` drift。 |

**Score:** 4/4 truths verified

### Required artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/async-tasks/infra/heartbeat.ts` | durable worker heartbeat truth | ✓ VERIFIED | 提供 upsert / stopping / stopped / list helper。 |
| `src/features/async-tasks/worker/bootstrap.ts` | startup refresh and shutdown heartbeat lifecycle | ✓ VERIFIED | 启动即写 heartbeat、15 秒刷新、关闭前后写 stopping / stopped。 |
| `src/features/async-tasks/server/operator-access.ts` | centralized operator authz | ✓ VERIFIED | overview/detail/recovery 共用持久化 visibility truth。 |
| `src/lib/dal/async-task-operator.ts` | request-fresh operator overview/detail DAL | ✓ VERIFIED | 无 `"use cache"` / `cacheLife()`，直接读取 heartbeat + SQLite ledger。 |
| `src/app/settings/labs/async-tasks/page.tsx` | operator overview route | ✓ VERIFIED | page 保持薄装配，只消费 DAL。 |
| `src/app/settings/labs/async-tasks/[taskId]/page.tsx` | operator detail route | ✓ VERIFIED | page 保持薄装配，只消费 DAL。 |
| `src/features/async-tasks/server/recovery.ts` | safe same-task retry | ✓ VERIFIED | compare-and-set seed、`Job.retry()`、审计事件与失败补偿都已存在。 |
| `src/actions/async-task-operator-actions.ts` | typed recovery action wrapper | ✓ VERIFIED | 使用 typed result，精确 `updateTag()` + `revalidatePath()`。 |
| `src/components/surfaces/async-task-operator-retry-action.tsx` | explicit confirm copy and honest refresh | ✓ VERIFIED | 包含 required copy，成功后 `router.refresh()`。 |
| `scripts/verify-phase42-operator-recovery.ts` | canonical phase verifier | ✓ VERIFIED | 静态守卫 + focused suites + Phase 41 regression 已跑通。 |

### Behavioral spot-checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 42 focused suites | `pnpm exec vitest --run src/features/async-tasks/worker/bootstrap.test.ts src/features/async-tasks/server/registry.reliability.test.ts src/lib/dal/async-task-operator.test.ts src/components/surfaces/async-task-operator-surface.test.tsx src/features/async-tasks/server/recovery.test.ts src/features/async-tasks/infra/queue-events.test.ts src/actions/async-task-operator-actions.test.ts` | 7 test files passed, 24 tests passed | ✓ PASS |
| canonical phase gate | `pnpm exec tsx scripts/verify-phase42-operator-recovery.ts` | passed, and Phase 41 regression remained green | ✓ PASS |
| repository type safety | `pnpm typecheck` | passed | ✓ PASS |
| repository production build | `pnpm build` | passed after removing incompatible `dynamic = "force-dynamic"` from the WebSocket 426 route | ✓ PASS |

### Requirements coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `ATP-15` | `42-01`, `42-02` | Operator can inspect queue health, worker connectivity, backlog posture, and degraded status. | ✓ SATISFIED | durable heartbeat + request-fresh overview DAL + overview surface。 |
| `ATP-16` | `42-02` | Operator can inspect task run details, attempt history, progress snapshots, and latest error. | ✓ SATISFIED | detail DTO / DAL / summary-first surface。 |
| `ATP-17` | `42-03` | Operator can safely retry supported failed tasks through explicit recovery action. | ✓ SATISFIED | registry-gated recovery service, action wrapper, confirm UI, audit events. |
| `ATP-18` | `42-01`, `42-02`, `42-03` | Operator-facing surfaces use application read models instead of BullMQ admin state. | ✓ SATISFIED | route pages and verifier block direct substrate drift. |

## Human verification result

`42-HUMAN-UAT.md` 已完成，结论如下：

1. `/settings/labs` 已补齐 `Runtime Inspector` 与 `Async Operator` 的并列 Labs 快捷入口，文案分别锚定 transport timeline 与 worker/queue/backlog/problem tasks，信息气味已对齐 Runtime Inspector，而不是 generic admin console。
2. failed recovery-enabled task detail 的 `重试此任务` 交互已实测通过：确认态明确展示“追加新 attempt + 记录 recovery event”，提交后页面进入 `retrying / enqueue dispatched`、`retry_requested` 与“仅失败任务可重试。”的诚实姿态，timeline 同步追加 recovery audit events。

---

_Verified: 2026-05-19T15:41:00+08:00_
_Verifier: the agent (manual execute-phase orchestration)_
