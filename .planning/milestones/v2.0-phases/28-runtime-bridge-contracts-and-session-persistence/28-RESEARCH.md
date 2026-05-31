# Phase 28 Research — runtime bridge contracts and session persistence

**Date:** 2026-05-16
**Phase:** 28
**Status:** Complete

## Research question

What do we need to know to plan Phase 28 well without breaking the existing
`lesson -> launch -> classroom -> player` chain?

## Recommended implementation posture

### 1. Extend the existing lesson payload and published snapshot

- Keep `payload.runtime` inside the current `lessonStepPayloadSchema`.
- Allow `content` / `task` / `quiz` to carry the same optional runtime block.
- Reuse `publishLesson()` snapshot freezing so `publishedLessonVersions.snapshotJson`
  stores the full runtime descriptor, not a mutable registry reference.

**Why:** This directly satisfies `BRDG-01` and the locked decisions `D-01` to
`D-04` without introducing a second lesson-step truth source.

### 2. Use append-only runtime persistence with explicit latest markers

Use a dedicated SQLite durability slice rather than overloading
`classroomSessions` or `classroomEvidence`:

- `runtimeStepSessions`
  - identity: `classroomSessionId + stepId + actorId + actorScope + runtimeVersion`
  - `isLatest` boolean for recovery entry
- `runtimeStepStates`
  - append-only saved/submitted state snapshots per runtime session
  - `isLatest` boolean plus summary JSON for bootstrap recovery
- `runtimeEventOutbox`
  - canonical durable event/outbox rows for `ready`, `interaction`, `save`,
    `submit`, `teacher-control`
  - delivery status metadata stays here; transport remains downstream only

**Why:** This matches the repository's proven append-only + latest pattern from
`taskSubmissions` and `quizAttempts`, and it satisfies `SAFE-03`, `RTSE-01`,
`RTSE-02`, and decisions `D-05` to `D-08`.

### 3. Keep bootstrap minimal and server-owned

Bootstrap should be a host-side loader that:

- resolves the published runtime descriptor from the frozen snapshot
- finds or creates the current latest runtime session
- returns only:
  - step summary
  - lesson/classroom summary
  - actor scope
  - granted capabilities
  - runtime session identifiers
  - recovery summary from latest runtime state

It must **not** return cookies, secrets, raw DB rows, or the full lesson
snapshot.

**Why:** This aligns with `BRDG-03` and decisions `D-09` to `D-12`.

### 4. Route all runtime writes through guarded host-side handlers

Use `createGuardedHostAction()` as the entry discipline.

Recommended host actions / server entrypoints:

- `bootstrapRuntimeSession`
- `recordRuntimeReady`
- `recordRuntimeInteraction`
- `saveRuntimeState`
- `submitRuntimeState`
- `recordRuntimeTeacherControl`

Each entrypoint must:

1. parse input with Zod
2. resolve actor + school scope on the server
3. load the frozen published descriptor
4. append durable runtime state/event rows
5. bridge only the allowed final truth writes

**Why:** This is required by `RTSE-03` and preserves the existing Phase 27
guard-first posture.

### 5. Separate `save` from `submit`

Recommended semantics:

- `save`
  - append `runtimeStepStates`
  - append `runtimeEventOutbox`
  - do **not** create formal task/quiz submissions
  - do **not** imply the student has submitted
- `submit`
  - append `runtimeStepStates`
  - append `runtimeEventOutbox`
  - bridge to current durable classroom / learning truth
  - update downstream cache tags immediately

Recommended bridge target:

- always append one `classroomEvidence` row for auditable classroom truth
- when the runtime-capable step is a `task`, also create the current
  `taskSubmissions` latest attempt
- when the runtime-capable step is a `quiz`, also create the current
  `quizAttempts` latest attempt
- for runtime-enabled `content`, keep the formal bridge on
  `classroomEvidence` only

**Why:** This best fits decisions `D-15` and `D-16` while keeping the existing
read models honest.

## Cache invalidation matrix

Recommended write invalidation rules:

| Mutation | Required tags |
|---|---|
| bootstrap create/resume | none (read path only) |
| `ready` | `classroom(sessionId)` |
| `interaction` | `classroom(sessionId)` when teacher/classroom summaries read it |
| `save` | `classroom(sessionId)` |
| `submit` for content runtime | `classroom(sessionId)`, `progress(lessonId,userId)` |
| `submit` for task runtime | `classroom(sessionId)`, `progress(lessonId,userId)`, `submission(lessonId,userId)`, `teacherReview(lessonId)` |
| `submit` for quiz runtime | `classroom(sessionId)`, `progress(lessonId,userId)`, `submission(lessonId,userId)`, `teacherReview(lessonId)` |
| `teacher-control` | `classroom(sessionId)` |

**Why:** This satisfies `RTSE-04` and preserves read-your-writes across teacher
and student surfaces.

## Existing patterns to reuse

1. **Contracts:** `src/features/runtime-platform/contracts/*`
2. **Guarded host actions:** `src/features/runtime-platform/host-actions/guards.ts`
3. **Published snapshot freezing:** `src/lib/dal/lesson-authoring.ts#publishLesson`
4. **Append-only latest:** `taskSubmissions`, `quizAttempts`
5. **Classroom truth writes:** `src/lib/dal/classroom.ts`
6. **Cache invalidation:** `src/actions/classroom-actions.ts`, `src/lib/cache-policy.ts`

## Pitfalls to avoid

- Do not create a separate runtime metadata registry read path for live
  sessions.
- Do not let SSE or transport memory become the current runtime truth.
- Do not let `save` update submission-oriented teacher or student UI as if work
  were formally submitted.
- Do not expose full snapshot JSON or raw DB payloads to runtime bootstrap.
- Do not add provider toggles or Redis/WebSocket prerequisites in this phase.

## Planning impact

This phase can be planned as four sequential plans:

1. contracts + payload/snapshot freeze
2. persistence schema + bootstrap/session contracts
3. guarded host-side bootstrap/save/submit/event implementation
4. cache invalidation + regression/verifier coverage

## Requirement coverage intent

| Requirement | Planned approach |
|---|---|
| SAFE-03 | append-only runtime session/state/event durability with latest recovery |
| BRDG-01 | optional `payload.runtime` on existing step payloads |
| BRDG-02 | shared versioned TeachingBridge schemas |
| BRDG-03 | minimal bootstrap DTO with capability context |
| BRDG-04 | typed host result envelopes |
| RTSE-01 | durable runtime session tables keyed by classroom session + step + actor + runtime version |
| RTSE-02 | canonical runtime event / outbox append path |
| RTSE-03 | guarded host-side mutations only |
| RTSE-04 | explicit tag invalidation matrix and downstream truth bridging |
