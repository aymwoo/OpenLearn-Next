---
phase: 66
slug: wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD | TBD | 1 | DRAFT-01 | — | run→persist bridge: successful run dispatches persist; draft lands in `draftLessonVersions` | integration | `npx vitest run src/server/ai/agents/lesson-agent.test.ts` | ✅ extend existing | ⬜ pending |
| TBD | TBD | 0/1 | AGENT-03 | — | draft server action: flag enabled → persists; flag disabled → `AGENT_DISABLED`, no command dispatched | integration | `npx vitest run src/actions/lesson-agent-actions.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DRAFT-02 | — | persist idempotent: same `sourceCommandId` re-dispatch does not double-write | integration | `npx vitest run src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts` | ✅ extend existing | ⬜ pending |
| TBD | TBD | 1 | DRAFT-03 / REVIEW-01 | — | accept/discard go through Command Bus, single-event path (no direct DAL) | integration | `npx vitest run src/actions/lesson-authoring-actions.test.ts` | ✅ extend existing | ⬜ pending |
| TBD | TBD | 1 | REVIEW-03 (version fix) | — | accepted/discarded events carry `version === draft.version` (≥1, never 0) | unit/integration | `npx vitest run src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` | ✅ extend existing | ⬜ pending |
| TBD | TBD | 1 | E2E closure | — | enable flag → trigger → run+persist → review → accept via command → publish | integration | planner sets locus (extend `lesson-agent.test.ts` or new e2e-loop spec) | ❌ W0 (core delivery assertion) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/lesson-agent-actions.test.ts` (or folded into existing actions test) — covers AGENT-03 flag enforcement + draft action orchestrating two commands
- [ ] End-to-end closure integration spec — covers flows 0/1 (the audit's core gap); includes "flag-enabled state injection" fixture (direct-write `agentRegistry` row `enabled=true`, see RESEARCH Open Q1)
- [ ] Extend `src/server/ai/agents/lesson-agent.test.ts` — assert successful run **actually dispatches** persist (currently missing)
- [ ] Extend `lesson-draft.events.test.ts` — assert accepted/discarded `version` is a real positive integer (currently uncovered)
- [ ] Framework install: not needed — Vitest already present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Teacher editor "AI 起草" button visually triggers draft + intent input renders | AGENT-03 (UI surface) | UI rendering / layout fidelity not asserted by integration tests | In `/teacher/editor` workspace: click "AI 起草", enter intent + stepType, confirm draft version appears in review panel |

*All logic-level behaviors have automated verification; only the editor UI surfacing is manual.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
