---
phase: 66
slug: wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `66-RESEARCH.md` § Validation Architecture. Task IDs marked `TBD` are filled by the planner in PLAN.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (co-located `*.test.ts`) |
| **Config file** | `vitest.config.mts` (repo root) |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `pnpm test run` |
| **Estimated runtime** | ~60 seconds (full suite); quick per-file ~3–8s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed file's spec>`
- **After every plan wave:** Run `pnpm test run` (full)
- **Before `/gsd-verify-work`:** Full suite green + `pnpm verify:phase` passing
- **Max feedback latency:** ~8 seconds (per-file quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 66-02 T1/T2 | 66-02 | 1 | DRAFT-01 | T-66-04/05 | run→persist bridge: successful run dispatches persist; draft lands in `draftLessonVersions` | integration | `npx vitest run src/server/ai/agents/lesson-agent.test.ts` | ✅ extend existing | ⬜ pending |
| 66-03 T1/T2 | 66-03 | 2 | AGENT-03 | T-66-07/08/09 | draft server action: flag enabled → persists; flag disabled → `AGENT_DISABLED`, no command dispatched | integration | `npx vitest run src/actions/lesson-agent-actions.test.ts` | ✅ created by 66-03 (was W0) | ⬜ pending |
| 66-02 T3 | 66-02 | 1 | DRAFT-02 | T-66-06 | persist idempotent: same `sourceCommandId` re-dispatch — no double-write, no duplicate draft row / event | integration | `npx vitest run src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts` | ✅ extend existing | ⬜ pending |
| 66-04 T1/T3 | 66-04 | 2 | DRAFT-03 / REVIEW-01 | T-66-11/12/13/14 | accept/discard go through Command Bus, single-event path (no direct DAL) | integration | `npx vitest run src/actions/lesson-authoring-actions.draft-routing.test.ts` | ✅ created by 66-04 | ⬜ pending |
| 66-01 T1/T3 | 66-01 | 1 | REVIEW-03 (version fix) | T-66-01/02/03 | accepted/discarded events carry `version === draft.version` (≥1, never 0) | unit/integration | `npx vitest run src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` | ✅ extend existing | ⬜ pending |
| 66-07 T1 | 66-07 | 3 | E2E closure | T-66-18/19/20 | flag enabled (test-DB fixture) → trigger → run+persist (draft row, version≥1) → accept via command (accepted version≥1) → publish chain | integration (e2e) | `npx vitest run src/server/ai/agents/lesson-draft-loop.e2e.test.ts` | ✅ created by 66-07 (was W0; core delivery assertion) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> All Wave-0 (test-scaffold) items are folded into TDD RED tasks within the plans below — no separate Wave 0 plan is required.

- [x] `src/actions/lesson-agent-actions.test.ts` — AGENT-03 flag enforcement + draft action orchestrating two commands → **66-03 Task 1 (RED)**
- [x] End-to-end closure integration spec (flows 0/1, the audit's core gap) incl. flag-enabled state injection (direct-write `agentRegistry` row `enabled=true`, RESEARCH Open Q1) → **66-07 Task 1** (`src/server/ai/agents/lesson-draft-loop.e2e.test.ts`)
- [x] Extend `src/server/ai/agents/lesson-agent.test.ts` — assert successful run **actually dispatches** persist → **66-02 Task 1 (RED) / Task 2 (GREEN)**
- [x] Extend `lesson-draft.events.test.ts` — assert accepted/discarded `version` is a real positive integer → **66-01 Task 1 (RED) / Task 3 (GREEN)**
- [x] Extend `lesson-draft.persist.test.ts` — assert same-`sourceCommandId` re-dispatch idempotency (no double-write / duplicate event) → **66-02 Task 3**
- [x] Framework install: not needed — Vitest already present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Teacher editor "AI 起草" button visually triggers draft + intent input renders | AGENT-03 (UI surface) | UI rendering / layout fidelity not asserted by integration tests | In `/teacher/editor` workspace: click "AI 起草", enter intent + stepType, confirm draft version appears in review panel |

*All logic-level behaviors have automated verification; only the editor UI surfacing is manual.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (folded into 66-02 / 66-03 / 66-07 RED tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready (pending execution — task Status cells flip to ✅ as plans complete)
