## ROADMAP

**Current milestone:** `None`
**Status:** ◇ Awaiting next milestone definition
**Latest archive:** `.planning/milestones/v2.3-ROADMAP.md`
**Current requirements file:** none active

## Overview

`v2.3 Async Task Platform` 已于 2026-05-20 归档。当前仓库没有 active milestone；下一轮工作应先决定是补一个小 closure slice 收口 `v2.3` accepted gaps，还是直接启动新的 frontier milestone。

归档后的 planning posture 保持不变：继续沿用“单体内平台化”路线，SQLite + DAL 持有 durable truth，Redis/BullMQ/WebSocket 只承担 orchestration 与 delivery 角色，不反客为主成为新的业务真相源。

## Milestones

- ✅ **v2.3 Async Task Platform** - Phase 39-43 archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Phase 36-38 archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Phase 33-35 archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Phase 27-32 archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Phase 21-26 archived 2026-05-15.

## Archived Milestones

<details>
<summary>✅ v2.3 Async Task Platform (Phases 39-43) - ARCHIVED 2026-05-20</summary>

- Archived at `.planning/milestones/v2.3-ROADMAP.md`.
- Delivered typed async task registry, unified enqueue boundary, SQLite durable task ledger, BullMQ worker posture, operator visibility/retry, and multiple real workloads.
- Closure accepted known gaps: `ATP-22` unsatisfied, `ATP-23` partial, and proof-chain gaps for Phases 39-41.

</details>

<details>
<summary>✅ v2.2 WebSocket Classroom Transport Cutover (Phases 36-38) - ARCHIVED 2026-05-18</summary>

- Archived at `.planning/milestones/v2.2-ROADMAP.md`.
- Scope remained limited to `ws + ioredis` classroom transport cutover, fallback posture, and canonical close artifacts.

</details>

## Next Planning Frontier

- Decide whether to run a small `v2.3` closure slice for resource-ingest product trigger + missing proof artifacts, or leave those as accepted debt and start a fresh milestone.
- If a new milestone is chosen, create a new `.planning/REQUIREMENTS.md` via `/gsd-new-milestone` before additional implementation work.
- Do not reopen PostgreSQL cutover, AI runtime expansion, and third-party runtime governance all at once; choose one frontier and keep blast radius narrow.
