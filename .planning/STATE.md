---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Async Task Platform
current_phase: 41
current_phase_name: first-real-product-slice-batch-import-async-workflow
current_plan: 2
status: executing
last_updated: "2026-05-18T23:11:43Z"
last_activity: 2026-05-18 -- Completed 41-01 batch import async workflow integration
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 9
  completed_plans: 7
  percent: 78
---

# Project State

## Current Position

Milestone: v2.3 Async Task Platform
Phase: 41 (first-real-product-slice-batch-import-async-workflow) — EXECUTING
Phase name: first-real-product-slice-batch-import-async-workflow
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-05-18 -- Completed 41-01 batch import async workflow integration
Progress: [████████░░] 78%
Next queued phase: Phase 41 - first-real-product-slice-batch-import-async-workflow (Plan 02)

<!--
GSD compatibility fields for older state parsers.
Current Phase: 41
Current Phase Name: first-real-product-slice-batch-import-async-workflow
Current Plan: 2
Total Plans in Phase: 3
Last Activity Description: Phase 41 execution started
-->

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-18)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 41 — first-real-product-slice-batch-import-async-workflow

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
- 同一 course import batch 的 active task 通过 entityType/entityId + active status 集合在 DAL 层复用，而不是只依赖 BullMQ job id 去重。
- worker completed 事件优先解析 typed AsyncTaskResultSummary，partial success 直接投影为 `partially_completed` rich result，而不是 generic done payload。

## Next Steps

1. 执行 Phase 41 Plan 02，在 batch detail 与 course center surface 暴露 queued/running/partial/completed/failed 语义。
2. 让课程导入产品面消费当前 rich result summary，而不是继续依赖同步 apply 结果。
3. 在 Phase 41 Plan 03 补齐 focused verification，锁住 dedupe、partial success 与 cache-safe updates。
