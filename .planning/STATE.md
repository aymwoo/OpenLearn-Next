---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Async Task Platform
current_phase: 40
current_phase_name: bullmq-infra-seam-and-worker-reliability-posture
current_plan: 1
status: executing
last_updated: "2026-05-18T22:54:41.263Z"
last_activity: 2026-05-18 -- Phase 41 planning complete
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 9
  completed_plans: 6
  percent: 67
---

# Project State

## Current Position

Milestone: v2.3 Async Task Platform
Phase: 40 (bullmq-infra-seam-and-worker-reliability-posture) — EXECUTING
Phase name: BullMQ infra seam and worker reliability posture
Plan: 1 of 3
Status: Ready to execute
Last activity: 2026-05-18 -- Phase 41 planning complete
Progress: [██████████] 100%
Next queued phase: Phase 40 - BullMQ infra seam and worker reliability posture

<!--
GSD compatibility fields for older state parsers.
Current Phase: 40
Current Phase Name: bullmq-infra-seam-and-worker-reliability-posture
Current Plan: 1
Total Plans in Phase: 3
Last Activity Description: Phase 41 planning complete — 3 plans ready
-->

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-18)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 40 — bullmq-infra-seam-and-worker-reliability-posture

## Milestone Notes

- `v2.3 Async Task Platform` 已启动，目标是在现有单体内建立可复用的 BullMQ/worker 后台任务平台。
- 本轮主攻 broader `RTPX-02` async worker / BullMQ slice，不把 PostgreSQL、classroom realtime rewrite、AI 扩张或第三方 runtime/package governance 绑进来。
- 当前范围包含四类真实验证任务：batch import、scheduled reminders、event post-processing、resource processing。
- 当前 roadmap 已定义为 Phase 39-43，共 5 个 phases，按 durable task truth -> BullMQ infra -> batch import -> operator recovery -> additional workloads 顺序推进。

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-18:

| Category | Item | Status |
|----------|------|--------|
| milestone_close | missing-v2.2-milestone-audit | accepted-risk |
| runtime_followup | rtpx-01-postgresql-cutover | deferred |
| runtime_followup | broader-rtpx-02-async-worker-slice | active-in-v2.3 |
| runtime_followup | rtpx-04-second-runtime | deferred |
| runtime_followup | rtpx-05-third-party-runtime-governance | deferred |
| runtime_followup | rtpx-06-ai-runtime-workflows | deferred |

## Accumulated Context

### Decisions

- `verify:phase38` 现在是唯一外部 milestone close gate。
- Redis fanout 保持 optional、deploy-authoritative、delivery-only posture。
- SSE rollback surface 继续作为设计内事实保留，不被伪装成已经移除。
- durable truth 继续停留在 SQLite + DAL + canonical classroom/runtime write path。
- v2.3 中 BullMQ/Redis 只能承担 orchestration 与 execution substrate，不能变成新的业务真相源。
- worker 必须是独立进程入口，不能并入 `server.ts` 或 web 请求生命周期。

## Next Steps

1. 进入 Phase 40，建立 BullMQ connection factory、queue/worker bootstrap 和独立 worker 入口。
2. 把 QueueEvents projection、attempt history、retry/backoff 与 idempotency 收敛到 durable truth。
3. 在 Phase 40 完成后再把 batch import 挂到统一 async platform 上验证真实 workload。
