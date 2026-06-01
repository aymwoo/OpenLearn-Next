---
phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
plan: 03
subsystem: api
tags: [server-action, feature-flag, lesson-agent, zod, ai, authorize-boundary]

# Dependency graph
requires:
  - phase: 66-02
    provides: draftLessonStep run→persist orchestration closure (lesson-agent.ts)
  - phase: ai-rag DAL
    provides: getAgentRegistryDTO (lesson_agent_enabled source of truth)
provides:
  - draftLessonWithAgentAction — teacher-facing server action that triggers LessonAgent drafting
  - Flag hard-stop enforcement at the authorize boundary (AGENT_DISABLED, zero dispatch)
  - First production caller of draftLessonStep (was zero-caller)
affects: [66-05 UI trigger wiring, lesson-authoring editor AI draft button]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature-flag hard-stop in server action via DAL registry read before any dispatch"
    - "Server-derived identity (schoolId) + strict zod schema rejecting client identity injection"

key-files:
  created:
    - src/actions/lesson-agent-actions.ts
    - src/actions/lesson-agent-actions.test.ts
  modified: []

key-decisions:
  - "D-02 backend: teacher AI draft trigger maps to new draftLessonWithAgentAction calling draftLessonStep"
  - "D-03: lesson_agent_enabled enforced server-side via getAgentRegistryDTO as HARD-STOP; OFF → AGENT_DISABLED, dispatch nothing"
  - "Strict zod schema rejects (not silently ignores) injected client teacherId/courseId/schoolId — stronger than plan's 'ignore' wording while satisfying T-66-07/T-66-08"

patterns-established:
  - "Authorize-boundary flag gate: parse → assertActiveTeacher → registry flag check (hard-stop) → orchestration call"
  - "ActionResult<T> ok/error/message shape reused from lesson-authoring-actions conventions"

requirements-completed: [AGENT-03, DRAFT-01]

# Metrics
duration: 4min
completed: 2026-06-01
---

# Phase 66 Plan 03: Teacher LessonAgent Draft Trigger Action Summary

**New `draftLessonWithAgentAction` server action wires the teacher 「AI 起草」 trigger to the run→persist closure, gated by a `lesson_agent_enabled` hard-stop that returns `AGENT_DISABLED` and dispatches nothing when the flag is OFF.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-01T14:36:12Z
- **Completed:** 2026-06-01T14:39:00Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 2 (both created)

## Accomplishments

- Created `src/actions/lesson-agent-actions.ts` exporting `draftLessonWithAgentAction` — the missing production caller of `draftLessonStep` (previously zero callers).
- Enforced D-03 flag hard-stop: reads `lesson_agent_enabled` via `getAgentRegistryDTO`; when the LessonAgent registry row is `enabled=false`, returns `{ ok:false, error:"AGENT_DISABLED" }` BEFORE any dispatch (backend authoritative; UI hide in 66-05 is secondary).
- Enforced D-02 happy path: flag ON → validates intent/stepType server-side and invokes `draftLessonStep` with server-derived `schoolId` from `assertActiveTeacher`.
- Mitigated T-66-07/T-66-08: `.strict()` zod schema (`lessonId`, `stepType` enum, non-empty `intent`) rejects injected client identity fields; only the 4 server-controlled fields reach the `draftLessonStep` payload.
- 6 passing tests covering: flag OFF hard-stop, flag ON dispatch + exact-payload assertion, missing intent, bad stepType, client identity injection rejection, and unauthorized (TEACHER_AUTH_REQUIRED → UNAUTHORIZED).

## Task Commits

| Task | Name | Type | Commit |
| ---- | ---- | ---- | ------ |
| 1 | Failing flag-enforcement test (RED) | test | e1c7085 |
| 2 | Implement draftLessonWithAgentAction (GREEN) | feat | ebb521e |

## Deviations from Plan

### Test-design correction (not a plan deviation)

**1. [Rule 1 - Test/spec correctness] Strict-reject vs silent-ignore for client identity injection**
- **Found during:** Task 2 (GREEN)
- **Issue:** Task 1's initial test asserted that injecting client `teacherId/courseId/schoolId` returned `ok:true` (silently ignored). This contradicts the plan-mandated `.strict()` schema (T-66-08), which correctly *rejects* unknown keys with a validation error.
- **Fix:** Updated the test to expect `VALIDATION_ERROR` on identity injection (strict-reject — a stronger guarantee that still satisfies T-66-07 "never forwarded to payload"), and moved the "forwarded payload contains only server-derived fields" proof into the flag-ON happy-path test (asserts exact 4 keys + `schoolId === "school-1"`).
- **Files modified:** src/actions/lesson-agent-actions.test.ts
- **Commit:** ebb521e (test updated alongside GREEN implementation)

The implementation matches the plan exactly (`.strict()` + flag hard-stop + server-derived identity). The correction was to the test's expectation only.

## Verification

- `npx vitest run src/actions/lesson-agent-actions.test.ts` → 6 passed
- `grep -n "AGENT_DISABLED" src/actions/lesson-agent-actions.ts` → present at line 73, precedes the single gated `draftLessonStep` call at line 77
- `grep -n "draftLessonStep" src/actions/lesson-agent-actions.ts` → single gated call (line 77)

## TDD Gate Compliance

- RED gate: `test(66-03)` commit e1c7085 (6 failing assertions — module absent)
- GREEN gate: `feat(66-03)` commit ebb521e (all 6 green)
- REFACTOR: none required.

## Known Stubs

None. The action is fully wired to the real `draftLessonStep` orchestration and real `getAgentRegistryDTO` flag source.

## Self-Check: PASSED
