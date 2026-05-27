---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: Single-School Pilot Production Readiness (Plugin-First)
status: planning
last_updated: "2026-05-27T05:04:09Z"
last_activity: 2026-05-27 -- Phase 59 closeout completed
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 26
  completed_plans: 26
  percent: 83
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-24)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 60 — load-degrade-pilot-rehearsal

## Current Position

Milestone: v3.1 -- Single-School Pilot Production Readiness (Plugin-First)
Phase: 60 (load-degrade-pilot-rehearsal) — PLANNED
Plan: 0 of 0
Status: Phase 59 complete — next phase ready for discussion
Last activity: 2026-05-27 -- Phase 59 closeout completed
Progress: [████████░░] 83%
Next queued phase: 60

## Performance Metrics

**Current milestone posture:**

- Planned phases: 6 (55-60)
- Planned sample: classroom voting plugin
- Target pilot capacity: 40 students per classroom, 5 simultaneous classrooms

**Historical reference:**

- Latest completed milestone: `v3.0 AI Native Educational OS Upgrade`
- Archived on: 2026-05-23
- Delivered scope: 5 phases, 22 plans

**Recent execution:**

- 2026-05-26 — `59-01` completed in 5 min, 2 tasks, 3 files (`.env.example`, `src/lib/ops/env.server.ts`, `src/lib/ops/env.server.test.ts`)
- 2026-05-26 — `59-02` completed in 6 min, 3 tasks, 6 files (`src/lib/ops/release-status.ts`, `src/lib/ops/release-status.test.ts`, `src/app/api/health/route.ts`, `src/app/api/ready/route.ts`, `src/app/api/release/route.ts`, `src/app/api/ops-routes.test.ts`)
- 2026-05-26 — `59-03` completed with repo-local `verify:phase59` gate and GitHub Actions pilot release workflow.
- 2026-05-26 — `59-04` completed with deploy/rollback scripts, canonical release pointers, systemd units, and rollout/rollback runbooks.
- 2026-05-27 — `59-05` completed with truth-first backup/restore artifacts and one successful real restore drill.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Milestone v3.1]: milestone scope is fixed as single-school pilot production readiness, not another platform abstraction wave.
- [Milestone v3.1]: the sample plugin is fixed to classroom voting.
- [Milestone v3.1]: the primary sample chain is fixed to teacher design -> publish -> launch -> student completion.
- [Milestone v3.1]: pilot capacity is fixed to 40 students in one classroom and 5 concurrent classrooms.
- [Milestone v3.1]: existing WebSocket-first transport, optional Redis fanout, BullMQ worker, and SQLite + DAL truth posture are baseline capabilities to reuse, not gaps to rebuild.
- [Milestone v3.1]: operator recovery, deploy/release, backup/restore, and load/degrade rehearsal are committed scope because they are required for pilot production use.
- [Phase 59-01]: env parsing is centralized in `src/lib/ops/env.server.ts` before broader runtime adoption.
- [Phase 59-01]: BullMQ readiness and fanout capability are modeled as separate Redis postures to prevent a single shared readiness toggle.
- [Phase 59-02]: health/ready/release contracts are centralized in `src/lib/ops/release-status.ts` so routes, deploy scripts, and restore verification share one honesty vocabulary.
- [Phase 59-02]: `/api/release` reads only canonical `current.json` and `green.json` pointers, never scans the manifests directory for the “latest” file.
- [Phase 59-02]: readiness remains blocked by DB/web/worker posture while fanout degraded stays explicit but non-blocking.
- [Phase 59]: verify:phase59 now locks required deploy/release artifacts and focused suites before later rollout and restore plans fill them. — Phase 59 needs a repo-local hard gate before shell/systemd/restore artifacts land.
- [Phase 59]: pilot-release workflow treats BullMQ Redis as blocking while preserving fanout as optional via REDIS_FANOUT_ENABLED=false. — This preserves D-59-07 and D-59-08 hard-gate honesty without promoting optional fanout into a release blocker.
- [Phase 59]: deploy manifest stores migration, gates, and OPS-01 correlation metadata as canonical release truth.
- [Phase 59]: deploy updates current.json and green.json only after post-restart health and ready succeed.
- [Phase 59]: dry-run deploy and rollback skip manifest and pointer writes while preserving release gate order.
- [Phase 59]: restore success is defined by integrity, foreign-key, health, ready, and sample-smoke gates all passing on a restored target.
- [Phase 59]: the successful restore drill required explicit restored runtime env plus a reachable BullMQ Redis dependency; env.template alone is not a runnable contract.

### Pending Todos

- Run `/gsd-discuss-phase 60` to gather context for load, degrade, and pilot rehearsal.
- Before committing Phase 59 closeout, run GitNexus `detect-changes --scope all` and stage only the intended closeout files.

### Blockers/Concerns

- Current worktree still contains unrelated source changes outside the Phase 59 closeout scope; commits must stage only the intended Phase 59 files.
- Phase 60 has not started discussion/planning yet.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| milestone_close | atp-22-resource-ingest-product-trigger | accepted-risk | 2026-05-20 |
| milestone_close | atp-23-fourth-workload-proof-partial | accepted-risk | 2026-05-20 |
| proof_gap | missing-phase39-verification-artifact | accepted-risk | 2026-05-20 |
| proof_gap | missing-phase40-verification-and-script-entry | accepted-risk | 2026-05-20 |
| proof_gap | missing-phase41-verification-artifact | accepted-risk | 2026-05-20 |
| quick_task | 260515-9yu-phase-14-01-publish-unpublish-archive-1- | accepted-risk | 2026-05-23 |
| quick_task | 260515-ac7-phase-14-03-course-05-guardrail-1-eligib | accepted-risk | 2026-05-23 |
| quick_task | 260517-e35-full-suite-teacher-course-center-surface | accepted-risk | 2026-05-23 |
| quick_task | 260517-gnb-student-runtime-host-bootstrap-productio | accepted-risk | 2026-05-23 |
| quick_task | 260517-k2u-auth-localhost-untrustedhost | accepted-risk | 2026-05-23 |
| Phase 59 P03 | 0 min | 2 tasks | 4 files |
| Phase 59 P04 | 2 min | 2 tasks | 8 files |
| Phase 59 P05 | 1 session | 3 tasks | 6 files |

## Session Continuity

Last session: 2026-05-27T05:04:09Z
Stopped at: Completed Phase 59 closeout and queued Phase 60 discussion
Resume file: None
