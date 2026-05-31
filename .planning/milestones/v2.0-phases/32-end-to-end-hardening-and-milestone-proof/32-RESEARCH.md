# Phase 32 Research — end-to-end hardening and milestone proof

**Date:** 2026-05-16
**Phase:** 32
**Status:** Complete

## Research question

What must Phase 32 harden so the existing HTML runtime pilot becomes one repeatable,
shippable milestone proof across `editor/publish -> launch/classroom -> student
runtime submit -> inspector`, without expanding scope into new runtime types,
transport cutover, or a second demo surface?

## Recommended implementation posture

### 1. Treat Phase 32 as a proof-hardening phase, not a new platform phase

- Phase 29 already proved shared Runtime Host wiring and local HTML runtime submit.
- Phase 30 already proved capability/lifecycle governance.
- Phase 31 already proved transport gateway plus independent inspector.
- Phase 32 should close the remaining integration gaps between those pieces instead
  of rebuilding them.

**Implication for planning:** keep work centered on existing routes, DTOs, Server
Actions, DAL read models, verifier scripts, and deterministic bootstrap data.

### 2. Use one canonical seeded lesson path and make it deterministic

- The canonical proof must be backed by repo-local seed data, not an arbitrary real
  lesson.
- The natural anchor is `scripts/bootstrap-dev-db.ts`, because it already provisions
  teacher/student accounts, class membership, a published lesson, and built-in
  plugins.
- Extend that bootstrap so the seeded published lesson includes exactly one built-in
  HTML runtime step with a published snapshot frozen from the existing
  `htmlCourseware` descriptor contract.
- Do not create a second provisioning system or a separate milestone demo database.

**Why:** this satisfies D-02, D-03, and D-14 while keeping the proof repeatable for
developers, later executors, and verification.

### 3. Thread `runtimeSessionId` and structured submit summary through the real truth path

- The current runtime submit path already ends in `submitRuntimeSessionState()` and
  `submitRuntimeStateAction()`.
- Phase 32 should ensure the durable submit result explicitly carries:
  - `runtimeSessionId`
  - `classroomSessionId`
  - `lessonId`
  - `actorId`
  - a small structured summary that the UI can present without reverse-engineering
    raw state
- Classroom-side read models should expose enough runtime submit context for the
  teacher to confirm completion on `/classroom` first.
- Inspector should continue to use `runtimeSessionId` as the deep-link anchor.

**Why:** this closes D-04, D-07, D-11, and D-12 without inventing a second source of
truth.

### 4. Put terminal submit posture in the shared host + runtime UI pair

- `RuntimeHostClient` already centralizes ready/interaction/save/submit handling.
- The local pilot runtime (`/runtime/html-courseware/pilot`) currently sends
  requests, but it does not yet visibly consume a final "submit succeeded" result as
  a locked terminal state.
- Phase 32 should add a stable post-submit contract:
  - host marks submit success distinctly from save success
  - runtime receives the submit result envelope
  - runtime UI locks editing and save actions
  - runtime UI renders a visible structured summary and success confirmation
- Save must be disabled after submit success.

**Why:** this is the core of D-05, D-06, and D-08.

### 5. Model failures as explicit recoverable states, not silent host errors

- The current host falls into `status="error"` when runtime actions fail.
- Phase 32 should harden this into explicit recoverable states for save/submit:
  - keep the student on the current runtime surface
  - preserve the local draft/summary context
  - expose a primary retry action for the failed verb
  - keep player-level reconnect/snapshot fallback logic in the existing player shell
- Do not auto-bounce to another route, and do not auto-jump into inspector.

**Why:** this directly satisfies D-09, D-10, and preserves the Phase 23 shell split.

### 6. Keep first teacher feedback on `/classroom`, then deep-link to inspector

- `/classroom` already exposes the main teacher live stage and monitoring summary.
- Inspector already has an independent page with `runtimeSessionId` query input.
- Phase 32 should use a two-step operator posture:
  1. classroom shows first proof or failure feedback tied to the current runtime
     interaction/submit
  2. an inspector deep link opens `/settings/labs/runtime-inspector?runtimeSessionId=...`
     for detailed trace review
- Do not move the primary proof surface into inspector.

**Why:** this is the cleanest fit for D-07, D-11, and D-12.

### 7. Make `verify:phase32` the milestone proof gate, not a wrapper around old verifiers

- Reuse the structure of `verify:phase29` and `verify:phase31`:
  - source drift guards
  - focused Vitest suites
- But do not stop at chaining older commands.
- The Phase 32 verifier must additionally assert:
  - seeded canonical demo lesson/runtime step still exists
  - submit terminal posture exists
  - save-after-submit is blocked
  - failure recovery copy/CTA exists
  - classroom-first feedback exists
  - inspector deep-link affordance exists
- It is acceptable for the verifier to invoke prior phase verifiers as prerequisites,
  but Phase 32-specific guards must remain first-class.

**Why:** this is required by D-13 and D-15.

## Existing patterns to reuse

1. **Seed/bootstrap pattern**
   - `scripts/bootstrap-dev-db.ts`
   - deterministic teacher/student/course/class/lesson provisioning
2. **Shared host boundary**
   - `src/features/runtime-platform/host/runtime-host-client.tsx`
   - trusted bridge routing and status copy ownership
3. **Student runtime shell split**
   - `src/components/learning/classroom-runtime-client.tsx`
   - reconnect/snapshot fallback remains outside iframe
4. **Teacher live proof surface**
   - `src/components/classroom/classroom-control-panel.tsx`
   - current live stage plus monitoring summary posture
5. **Inspector deep-link posture**
   - `src/app/settings/labs/runtime-inspector/page.tsx`
   - `src/lib/dal/runtime-inspector.ts`
   - `runtimeSessionId`-anchored default selection
6. **Phase-specific verifier pattern**
   - `scripts/verify-phase29-runtime-host.ts`
   - `scripts/verify-phase31-transport-inspector.ts`

## Recommended plan structure

The roadmap's four-plan split is correct if the work is decomposed as:

1. **32-01** — deterministic demo seed + truth-path integration (`runtimeSessionId`,
   classroom feedback data, deep-link anchor)
2. **32-02** — terminal submit posture + failure recovery hardening in shared host,
   player shell, and local runtime pilot
3. **32-03** — final proof regression coverage + `verify:phase32`
4. **32-04** — productized proof affordances on launch/classroom/inspector surfaces
   plus explicit handoff documentation

## Pitfalls to avoid

- Do not create a second demo provisioning path outside `bootstrap-dev-db.ts`.
- Do not make `/student/player` direct entry the canonical proof path in this phase.
- Do not add resubmit or save-after-submit posture.
- Do not make inspector the first confirmation surface.
- Do not couple proof success to PostgreSQL, Redis/Event Bus, or WebSocket cutover.
- Do not make the verifier rely only on prose or manual inspection.

## Requirement and decision coverage intent

| Source | Coverage intent |
|---|---|
| `RHOST-04` | Student completes one real HTML runtime interaction and submits successfully through the existing learning flow |
| D-01 to D-04 | canonical teacher-launched seeded proof path with `runtimeSessionId` deep link |
| D-05 to D-08 | explicit terminal submit state with visible structured summary and no post-submit save |
| D-09 to D-12 | explicit recoverable failure state, classroom-first anomaly visibility, inspector as second-step drill-down |
| D-13 to D-16 | single `verify:phase32` gate plus seeded handoff docs and affordances on existing surfaces |
