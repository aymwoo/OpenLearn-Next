# Phase 23 Research — Student in-class activity flow

**Date:** 2026-05-13
**Phase:** 23
**Status:** Complete

## Research question

What does the planner need to know to turn `/student/player` from a generic
lesson reader into a classroom-first activity surface, while preserving the
current cached shell, Suspense personal state, append-only task/quiz semantics,
and live classroom SSE contract?

## Executive summary

- Phase 23 should extend the existing `StudentPlayerShellDTO` /
  `StudentPlayerPersonalDTO` split instead of collapsing player reads back into
  one large DTO.
- The safest shape is a three-part change:
  1. add server-derived activity guidance and evidence copy to the current
     player DTO/runtime contract;
  2. add a dedicated quick-response evidence path that writes through existing
     `recordClassroomEvidence()` durability and cache invalidation boundaries;
  3. add focused regression and a phase verifier so future runtime work does not
     silently break player UX, append-only semantics, or classroom compatibility.
- Existing code already provides most of the substrate:
  `teachingDesign`, `evidenceExpectation`, `getStudentPlayerShellDTO()`,
  `getStudentPlayerPersonalDTO()`, `classroom-runtime-client.tsx`,
  `TaskStepCard`, `QuizStepCard`, and `recordClassroomEvidenceAction()`.
- The key planning constraint is expression, not reinvention: the student player
  must reuse current truths and rewrite them into classroom-friendly guidance,
  not create a parallel student-only design system or client-side evidence model.

## Existing code facts

### 1. The player already honors the required cache boundary

- `src/app/(student)/student/player/page.tsx` streams personal state through
  `<Suspense>` and keeps shell data separate from request-specific reads.
- `src/lib/dal/learning.ts` uses cached `getPublishedStudentPlayerShellDTO()`
  for lesson shell data and dynamic `getStudentPlayerPersonalDTO()` for
  progress, runtime state, and submissions.
- `src/components/surfaces/player-surface.tsx` already renders a single hero and
  delegates all dynamic classroom interaction to `ClassroomRuntimeClient`.

Planning implication: Phase 23 should enrich shell/personal DTO fields and the
runtime client, not merge shell and personal reads or move DAL logic into the
client.

### 2. The runtime contract already exposes the classroom posture we need

- `src/components/learning/classroom-runtime-client.tsx` already owns step rail,
  locked/unlocked semantics, reconnect banner, forced step behavior, and the
  current-step renderer.
- `src/lib/dal/learning.ts` already converts live classroom state into
  `forcedStepId`, `teacherRecommendedStepId`, `locked`, `disabledStepIds`, and
  reconnect copy.
- `src/lib/dto/classroom.ts` and `src/lib/dal/classroom.ts` already encode the
  canonical classroom snapshot and durable session boundaries.

Planning implication: Phase 23 should make the existing runtime posture clearer
to students, but must not invent a second classroom-control protocol.

### 3. Teaching-design metadata already exists, but the student player does not surface it well

- `src/lib/dto/lesson-authoring.ts` already defines `teachingDesign` with
  `activityIntent`, `estimatedMinutes`, `activityMode`, and
  `evidenceExpectation`.
- The launch-side preview in `src/lib/dal/classroom.ts` already translates those
  fields into `family`, `evidenceSummary`, `materialCues`, and fallback markers.
- The student player currently still renders mostly generic task/content/quiz
  cards and does not convert those fields into direct student guidance.

Planning implication: the player should reuse these fields to derive explicit
 student-facing guidance like what to do, what to submit, and when the step is
 considered complete.

### 4. Durable quick-response writing should reuse classroom evidence, not task submissions

- `recordClassroomEvidence()` already writes append-only classroom evidence rows
  and a matching classroom timeline entry.
- `recordClassroomEvidenceAction()` already invalidates
  `cacheTags.classroom(sessionId)`.
- `taskSubmissions` and `quizAttempts` are lesson-wide append-only attempt models
  and remain correct for task/quiz, but they are not the best truth source for
  a lightweight in-class check-in tied to a classroom session.

Planning implication: Phase 23 should add a typed student quick-response path on
top of classroom evidence instead of overloading task submissions or storing
client-only check-ins.

### 5. Current regressions are present but still shallow

- `src/components/learning/student-step-cards.test.ts` and
  `src/components/surfaces/student-player-surfaces.test.ts` currently protect the
  phase-4 player mostly through source-string assertions.
- `src/lib/dal/learning.test.ts` already guards shell/personal cache boundaries
  and live runtime behavior in the DAL.
- The repo uses phase verifiers such as `verify:phase21` and `verify:phase22`
  to combine static checks with focused test commands.

Planning implication: Phase 23 should add a dedicated verifier and strengthen
test coverage around player guidance, quick-response durability, and runtime
compatibility.

## Recommended implementation shape

### 1. Add a student activity contract to the player DTOs

Recommended additions inside `src/lib/dto/learning.ts` and
`src/lib/dal/learning.ts`:

- a derived activity-summary block per step or per current-step payload that
  includes:
  - `activityGuidance`
  - `expectedOutput`
  - `evidenceExpectationSummary`
  - `completionStateCopy`
  - student-facing labels for `activityMode` and `estimatedMinutes`
- these values should be derived server-side from `teachingDesign`, payload
  type, submission history, and progress state.

Important: do not leak raw teacher-only field names or make the client infer
classroom copy from partial payloads.

### 2. Converge step rendering into one classroom activity shell

The runtime should keep the current architecture but render each current step
through one unified classroom activity shell that consistently shows:

1. current step title
2. activity guidance
3. expected output
4. evidence expectation summary
5. current completion state
6. one step-specific action area

Important: task, quiz, and content may still have different action bodies, but
they should stop competing with different top-level card structures.

### 3. Introduce a typed quick-response evidence path

Recommended shape:

- define a dedicated quick-response input/result contract under the classroom
  action boundary;
- submit through a dedicated student-facing Server Action that internally calls
  `recordClassroomEvidence()` with `sourceType: "student-quick-response"`;
- read latest/history for the active session and step through
  `getStudentPlayerPersonalDTO()` so the player can render `latest + history`
  next to the input area.

Important: keep it append-only and session-scoped. Do not add client-only
toggles, overwrite semantics, or a second source of truth.

### 4. Keep lock/recommend guidance direct but non-hostile

Locked mode should continue to disable navigation only. Unlocked mode should
continue to allow browsing. The change for Phase 23 is copy and hierarchy:

- explain what the teacher currently expects in plain Chinese;
- keep the recommended-step CTA secondary;
- avoid turning the top banner into a warning-heavy control surface.

### 5. Add a Phase 23 verifier instead of relying on memory

The repo pattern already exists. Phase 23 should add `verify:phase23` that
checks:

- player page still uses `<Suspense>` and split shell/personal reads;
- runtime UI contains unified activity guidance and evidence wording;
- quick-response writes still go through Server Actions and classroom evidence;
- focused tests for player shell, runtime client, and classroom action wiring
  all pass.

## Recommended plan split

### Plan 23-01 — player DTO and unified activity shell

Own:

- derived student activity guidance contract
- current-step unified activity shell
- content/task/quiz UI convergence under one classroom-first structure

### Plan 23-02 — durable quick response and evidence capture

Own:

- typed quick-response action/input contract
- append-only classroom evidence reads and writes for the student player
- quick-response UI path inside the runtime without breaking task/quiz flows

### Plan 23-03 — verification and runtime compatibility guard

Own:

- focused regressions for player shell/runtime/evidence wiring
- `verify:phase23` script and package command
- explicit guards for cache boundary, Server Action usage, and append-only
  evidence semantics

## Risks and landmines

1. **Collapsing the shell/personal boundary**
   If Phase 23 folds all player data into one dynamic DTO, it will regress the
   current cached shell + Suspense architecture.

2. **Leaking teacher-only metadata verbatim**
   `studentVisibility: "teacher-only"` and fallback-reason internals must be
   translated into natural student copy, not displayed directly.

3. **Overloading task submissions for quick-response**
   That would blur lesson-level submission truth with classroom-session evidence
   truth and make later analytics harder.

4. **Making lock mode punitive**
   The current contract only limits navigation. Phase 23 must not block current
   step completion or turn runtime guidance into an alarm-heavy experience.

5. **Keeping tests too shallow**
   Source-string checks alone are not enough for the new behavior. Phase 23
   needs focused assertions around DTO contract, runtime wiring, and action
   boundaries.

## Planning guidance

- Prefer minimal extension of existing DTOs and components over new route-level
  abstractions.
- Reuse `recordClassroomEvidence()` and current cache tags instead of inventing
  a separate evidence store.
- Keep the player visually single-stage: one main activity card, one step rail,
  secondary reconnect and immersion guidance.
- Treat ACT-01 as the guidance-and-shell contract and ACT-02 as the durable
  quick-response contract, with 23-03 guarding both.

## Outcome

Phase 23 is ready for planning. The codebase already has the durability,
runtime, and teaching-design primitives needed. The plans should focus on
server-derived student guidance, a unified activity shell, a session-scoped
quick-response evidence path, and explicit verification coverage.
