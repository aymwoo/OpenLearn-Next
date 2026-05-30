# ROADMAP

**Current milestone:** `(none)`
**Status:** Awaiting next milestone definition
**Latest archive:** `.planning/milestones/v3.1-ROADMAP.md`
**Current requirements file:** `(none; create during /gsd-new-milestone)`

## Overview

`v3.1` 已于 2026-05-30 归档。仓库当前已经具备 single-school pilot production readiness baseline：课堂投票样板链路、operator recovery、deploy/release/restore、40/5 rehearsal evidence 与 closeout audit 都已收口。下一轮 planning 应从这份已归档事实出发，定义新的用户价值切口，而不是重开 `v3.1` 已完成能力。

## Milestones

- ✅ **v3.1 Single-School Pilot Production Readiness (Plugin-First)** - Archived 2026-05-30. See `.planning/milestones/v3.1-ROADMAP.md`.
- ✅ **v3.0 AI Native Educational OS Upgrade** - Archived 2026-05-23. See `.planning/milestones/v3.0-ROADMAP.md`.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 remain frozen historical context.
- ✅ **v2.3 Async Task Platform** - Archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Archived 2026-05-15.

## Phases

<details>
<summary>✅ v3.1 Single-School Pilot Production Readiness (Plugin-First) (Phases 55-60, 60.1, 60.2) — SHIPPED 2026-05-30</summary>

- [x] **Phase 55: Pilot Scope & Acceptance Gate** - 冻结单校试点口径、课堂投票样板、40/5 容量目标、proof artifact 与 close gate。 (completed 2026-05-24)
- [x] **Phase 56: Voting Plugin Contract & Authoring Integration** - 打通课堂投票插件的 authoring、schema validation、compatibility gating、publish preflight 与 version freeze。 (completed 2026-05-25)
- [x] **Phase 57: Classroom Runtime Sample Chain** - 打通 launch readiness、teacher trigger、student participation、canonical result writes 与 teacher evidence。 (completed 2026-05-25)
- [x] **Phase 58: Operator Recovery & Production Surfaces** - 交付 classroom/plugin/command/task 关联诊断面、degraded honesty 与可执行恢复动作。 (completed 2026-05-26)
- [x] **Phase 59: Deploy, Release & Recovery Baseline** - 交付 env discipline、CI/CD、health/ready、release traceability、backup/restore 与 restore drill。 (completed 2026-05-27)
- [x] **Phase 60: Load, Degrade & Pilot Rehearsal** - 交付 k6/Playwright rehearsal、Redis degraded、worker backlog tests、rollout/rollback checklist 与 closeout evidence。 (completed 2026-05-30)
- [x] **Phase 60.1: Replace dry-run phase60 proof with live rehearsal evidence** - 用 live smoke/capacity/drills/rollout-rollback rehearsal evidence 替换 dry-run close artifacts。 (completed 2026-05-30)
- [x] **Phase 60.2: Wire frozen voting contract into launch and runtime** - 把 frozen voting contract 接入 runtime truth，关闭 `PLUG-01` / `CHAIN-03`。 (completed 2026-05-28)

### Phase 55: Pilot Scope & Acceptance Gate
**Goal**: 冻结单校试点口径、样板链路、proof artifact 与 close gate。
**Depends on**: milestone kickoff

### Phase 56: Voting Plugin Contract & Authoring Integration
**Goal**: 打通课堂投票插件的 authoring、schema validation、compatibility gating 与 publish freeze。
**Depends on**: Phase 55

### Phase 57: Classroom Runtime Sample Chain
**Goal**: 打通 launch readiness、teacher trigger、student participation、canonical result writes 与 teacher evidence。
**Depends on**: Phase 56

### Phase 58: Operator Recovery & Production Surfaces
**Goal**: 交付 classroom/plugin/command/task 关联诊断面、degraded honesty 与可执行恢复动作。
**Depends on**: Phase 57

### Phase 59: Deploy, Release & Recovery Baseline
**Goal**: 交付 env discipline、CI/CD、health/ready、release traceability、backup/restore 与 restore drill。
**Depends on**: Phase 58

### Phase 60: Load, Degrade & Pilot Rehearsal
**Goal**: 交付 sample smoke、40/5 capacity、degraded drills 与 rollout/rollback rehearsal。
**Depends on**: Phase 59

### Phase 60.1: Replace dry-run phase60 proof with live rehearsal evidence
**Goal**: 用真实 rehearsal evidence 替换 dry-run close artifacts。
**Depends on**: Phase 60

### Phase 60.2: Wire frozen voting contract into launch and runtime
**Goal**: 把 frozen voting contract 接入 runtime truth，关闭 `PLUG-01` / `CHAIN-03`。
**Depends on**: Phase 60

</details>

### Awaiting Next Milestone

- No active phases are open.
- Start the next milestone with `/gsd-new-milestone`.
- Create a new `.planning/REQUIREMENTS.md` only after the next committed scope is defined.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 55. Pilot Scope & Acceptance Gate | v3.1 | 3/3 | Complete | 2026-05-24 |
| 56. Voting Plugin Contract & Authoring Integration | v3.1 | 5/5 | Complete | 2026-05-25 |
| 57. Classroom Runtime Sample Chain | v3.1 | 5/5 | Complete | 2026-05-25 |
| 58. Operator Recovery & Production Surfaces | v3.1 | 8/8 | Complete | 2026-05-26 |
| 59. Deploy, Release & Recovery Baseline | v3.1 | 5/5 | Complete | 2026-05-27 |
| 60. Load, Degrade & Pilot Rehearsal | v3.1 | 4/4 | Complete | 2026-05-30 |
| 60.1. Replace dry-run phase60 proof with live rehearsal evidence | v3.1 | 3/3 | Complete | 2026-05-30 |
| 60.2. Wire frozen voting contract into launch and runtime | v3.1 | 1/1 | Complete | 2026-05-28 |
