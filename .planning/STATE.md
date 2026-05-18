---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Async Task Platform
current_phase: 0
current_phase_name: roadmap-defined
current_plan: 0
status: planning
stopped_at: Milestone v2.3 roadmap defined; ready for Phase 39 planning
last_updated: "2026-05-18T12:00:00.000Z"
last_activity: 2026-05-18 -- Defined roadmap for milestone v2.3
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 15
  completed_plans: 0
  percent: 0
---

# Project State

## Current Position

Milestone: v2.3 Async Task Platform
Phase: Not started (roadmap defined)
Phase name: Roadmap defined
Plan: —
Status: Roadmap defined
Last activity: 2026-05-18 -- Defined roadmap for milestone v2.3
Progress: [░░░░░░░░░░] 0%
Next queued phase: Phase 39 - Async contracts and durable task truth

<!--
GSD compatibility fields for older state parsers.
Current Phase: 0
Current Phase Name: roadmap-defined
Current Plan: 0
Total Plans in Phase: 0
Last Activity Description: Milestone v2.3 roadmap defined — ready to start Phase 39 planning
-->

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-18)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Milestone v2.3 Async Task Platform planning

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

1. 从 Phase 39 开始进入 `/gsd-discuss-phase 39` 或 `/gsd-plan-phase 39`。
2. 把 Phase 39 拆成可执行 PLAN.md 并锁定 async task registry、ledger 和 enqueue seam。
3. 在 Phase 39 完成后再推进 Phase 40 的 BullMQ worker 与 reliability posture。
