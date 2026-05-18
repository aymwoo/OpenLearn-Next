# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.2 — WebSocket Classroom Transport Cutover

**Shipped:** 2026-05-18
**Phases:** 3 | **Plans:** 9 | **Sessions:** not tracked in repo artifacts

### What Was Built
- WebSocket-first classroom transport with authenticated handshake, typed envelopes, and WS-first teacher or student runtime surfaces.
- Optional `ioredis` fanout with session-scoped transport snapshot, local-only default posture, and degraded operator visibility.
- Canonical close chain built from `verify:phase36`, `verify:phase37`, `verify:phase38`, plus fallback matrix, parity proof, demo runbook, and closeout artifact.

### What Worked
- Phase-specific verifiers made the milestone claim executable instead of prose-only.
- Keeping Redis and WebSocket as delivery-only layers prevented the cutover from breaking DAL truth ownership.
- Repo-local demo and fallback docs turned reviewer or operator handoff into a repeatable path.

### What Was Inefficient
- Phase 37 and Phase 38 work reached the working tree before the archive or tag pass, so milestone close had to reconcile implementation state and archive state together.
- The expected `gsd-sdk query ...` workflow commands were not available in the installed CLI, so audit steps required manual fallback and explicit risk acceptance.

### Patterns Established
- Use a layered close chain: implementation verifier -> capability verifier -> milestone verifier.
- Treat transport adapters as delivery layers only; durable truth stays in DAL + canonical write paths.
- Document fallback posture and operator observation points as first-class milestone artifacts, not as handoff folklore.

### Key Lessons
1. Infra cutovers close cleanly only when rollback posture is documented as explicitly as the happy path.
2. Optional distributed delivery must surface degraded truth to operators instead of hiding it behind local success.

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: tight phase summaries plus verifier scripts made same-day closeout feasible.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.0 | not tracked | 6 | Established runtime-platform foundations inside the main repo without a big-bang rewrite. |
| v2.1 | not tracked | 3 | Reframed milestone close around safety gates and honest backlog partition. |
| v2.2 | not tracked | 3 | Unified transport cutover, optional Redis fanout, and a single external close gate. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.0 | focused suites + phase verifiers | not tracked | not tracked |
| v2.1 | focused suites + `verify:phase35` | not tracked | not tracked |
| v2.2 | focused suites + `verify:phase36/37/38` | not tracked | not tracked |

### Top Lessons (Verified Across Milestones)

1. Keep milestone claims executable through canonical verifiers rather than prose-only close notes.
2. Separate durable truth from delivery transport even during infrastructure migrations.
