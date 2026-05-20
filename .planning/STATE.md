---
gsd_state_version: 1.0
milestone: none
milestone_name: No Active Milestone
current_phase: 0
current_phase_name: none
current_plan: 0
status: awaiting_next_milestone
last_updated: "2026-05-20T13:58:07+08:00"
last_activity: 2026-05-20 -- Archived milestone v2.3 with accepted audit gaps
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Current Position

Milestone: None — between milestones
Phase: None
Phase name: none
Plan: None
Status: v2.3 archived; awaiting next milestone definition
Last activity: 2026-05-20 -- Archived milestone v2.3 with accepted audit gaps
Progress: [----------] 0%
Next queued phase: None — choose next milestone or closure slice

<!--
GSD compatibility fields for older state parsers.
Current Phase: 0
Current Phase Name: none
Current Plan: 0
Total Plans in Phase: 0
Last Activity Description: Archived milestone v2.3 with accepted audit gaps
-->

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-20)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Decide between a small `v2.3` closure slice and the next milestone frontier.

## Milestone Notes

- 最近归档 milestone 为 `v2.3 Async Task Platform`；archive 位于 `.planning/milestones/v2.3-ROADMAP.md`、`.planning/milestones/v2.3-REQUIREMENTS.md` 与 `.planning/milestones/v2.3-MILESTONE-AUDIT.md`。
- 该 milestone 已交付通用 async platform 底座、batch import、operator recovery、scheduled reminders 和 classroom summary derived workload。
- close 时接受的已知 gap 主要包括：`ATP-22` resource ingest 缺产品触发入口、`ATP-23` 第四类 workload 证明不完整，以及 Phase 39-41 proof-chain artifact 缺口。
- 当前没有 active `.planning/REQUIREMENTS.md`；下一轮 planning 必须先定义新 milestone 或明确 closure slice。

## Deferred Items

### 2026-05-20 (`v2.3` close)

| Category | Item | Status |
|----------|------|--------|
| milestone_close | atp-22-resource-ingest-product-trigger | accepted-risk |
| milestone_close | atp-23-fourth-workload-proof-partial | accepted-risk |
| proof_gap | missing-phase39-verification-artifact | accepted-risk |
| proof_gap | missing-phase40-verification-and-script-entry | accepted-risk |
| proof_gap | missing-phase41-verification-artifact | accepted-risk |
| integration_warning | classroom-summary-artifact-read-path-not-wired | accepted-risk |

### 2026-05-18 (`v2.2` close)

| Category | Item | Status |
|----------|------|--------|
| milestone_close | missing-v2.2-milestone-audit | accepted-risk |
| runtime_followup | rtpx-01-postgresql-cutover | deferred |
| runtime_followup | broader-rtpx-02-async-worker-slice | resolved-in-v2.3 |
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
- 产品面把 `pending_enqueue`、`dispatching`、`stalled_recovery` 统一折叠为 queued posture，避免把平台内部中间态直接泄露给 teacher/staff。
- 课程中心只保留 hero 级最近导入任务卡，完成后继续展示最近摘要，但始终回流到 batch detail 作为单一事实页。
- [Phase 41]: Phase 41 verifier 采用 exact import/string guards + focused suites，避免宽泛 grep 或注释噪音造成误判。
- [Phase 41]: 课程中心 recent import card 在 active 状态必须展示 progress copy，而不是只保留 terminal summary。
- [Phase 41]: 课程导入 DTO 在测试路径内使用本地 status schema，避免与 course-authoring DTO 形成循环初始化。
- [Phase 43]: scheduled reminder、classroom session summary、resource knowledge source ingest 已证明 shared async platform 不依赖单一 batch import workload。
- [Phase 43]: teacher 页面继续保持 business-entity-first posture，async truth 通过 DTO 映射回 reminder/resource surface，而不是漂移成 task center。
- [Phase 43]: operator recovery posture 对 reminder delivery、classroom summary、resource ingest 三类新增 workload 继续成立，且仅 operator 可执行 recovery。
- [Milestone close]: milestone audit 必须把真实产品闭环缺口和 proof artifact 缺口分开陈述，否则 close 结论会失真。

## Next Steps

1. 决定是否执行一个小型 `v2.3` closure slice，范围仅限于 resource-ingest 产品触发入口与 proof-chain artifacts。
2. 如果继续收口，先补 `ATP-22` / `ATP-23`，再补 Phase 39/40/41 verification artifacts 并重跑 milestone audit。
3. 如果不继续收口，使用 `/gsd-new-milestone` 定义新的 `.planning/REQUIREMENTS.md`，再启动下一轮实现。
