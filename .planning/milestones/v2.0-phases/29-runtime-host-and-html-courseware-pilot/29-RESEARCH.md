# Phase 29 Research — runtime host and HTML courseware pilot

**Date:** 2026-05-16
**Phase:** 29
**Status:** Complete

## Research question

What do we need to know to plan the first sandboxed HTML runtime host pilot
without breaking the existing `editor -> preview -> classroom -> player`
chain established through Phase 28?

## Recommended implementation posture

### 1. Build one shared Runtime Host, not three surface-specific iframe paths

- Introduce a single shared Runtime Host component that owns iframe lifecycle,
  bootstrap handshake, message validation, height sync, and host-to-runtime
  updates.
- Reuse that same host in:
  - teacher preview (`/teacher/editor/preview`)
  - student player (`/student/player` personal runtime region)
  - classroom-compatible teacher stage (`/classroom` live snapshot surface)
- Keep surface differences outside the host through explicit props such as
  `surface`, `actorScope`, `previewMode`, `classroomSessionId`, and
  `snapshotPayload`.

**Why:** This satisfies `RHOST-01` while avoiding three divergent iframe
integration stacks that would immediately drift.

### 2. Keep the iframe sandbox minimal and host-owned

- The runtime is rendered inside a sandboxed iframe.
- The host owns all parent-page concerns:
  - iframe sizing
  - loading and error chrome
  - bootstrap calls
  - runtime save and submit calls
  - classroom snapshot push updates
- The iframe must not:
  - access cookies or raw DB data
  - reach Server Actions directly
  - mutate parent DOM
  - subscribe to SSE on its own

Recommended runtime communication model:

1. iframe loads a local built-in HTML runtime entry
2. iframe sends typed `postMessage` requests to the host
3. host validates message shape and runtime instance identity
4. host calls existing Phase 28 runtime host actions or server actions
5. host sends typed result or snapshot updates back into the iframe

**Why:** This preserves the Phase 28 rule that all runtime writes stay behind
the trusted server boundary.

### 3. Treat height sync as a host contract, not a CSS trick

- The runtime must report semantic height changes through a typed message such as
  `runtime-height-changed` or equivalent.
- The host stores the latest accepted height and applies it to the iframe
  container.
- Height updates should be throttled or deduplicated to avoid feedback loops.
- The classroom and player surfaces should keep a stable shell even before the
  first height message arrives.

**Why:** This directly addresses `RHOST-02` and prevents the runtime from
breaking the existing tonal stage layouts.

### 4. Push classroom updates from existing durable truth into the runtime

- The iframe should not become a new live-state owner.
- Classroom updates continue to come from the current server-owned snapshot and
  player personal DTO paths.
- The host translates those existing DTO changes into runtime-facing snapshot
  update messages.

Recommended source per surface:

| Surface | Runtime update source |
|---|---|
| Teacher preview | draft preview DTO only, no live classroom or student state |
| Student player | existing `StudentPlayerPersonalDTO.runtime` and current step context |
| Classroom live stage | existing `ClassroomSnapshotDTO` |

**Why:** This preserves the locked Phase 23, 24, and 28 truth ownership rules.

### 5. Add the pilot runtime through the existing built-in teaching-step path

- Do not add a new lesson step family for Phase 29.
- Add one built-in teaching-step definition for an HTML runtime pilot.
- The built-in template should still produce an existing step payload
  (`content`, `task`, or `quiz`) carrying a frozen `payload.runtime`
  descriptor.
- Keep the authoring entry on the current `listBuiltInTeachingStepTemplates()`
  plus `addLessonStepAction()` path.

**Why:** This satisfies `RHOST-03` without reopening the Phase 28 decision to
avoid a parallel runtime-only lesson model.

### 6. Keep the first runtime pilot local and built-in

- The HTML runtime pilot should be a local built-in asset or route served by the
  current app.
- Do not plan remote URLs, third-party embeds, marketplace loading, or arbitrary
  plugin JavaScript in this phase.
- The runtime descriptor should keep `kind: "html-courseware"` and a concrete
  local bootstrap entry.

**Why:** This keeps the security boundary small while proving the platform with
one real runtime type.

### 7. Use one simple structured interaction for the pilot

The pilot runtime should demonstrate one real interaction and one structured
submit shape, for example:

- choose an answer or stage
- optionally enter a short explanation
- submit a structured payload through the existing Phase 28 runtime submit path

The exact payload shape can stay small, but it must be:

- deterministic
- serializable
- reviewable in current classroom truth
- valid without adding a second submission system

**Why:** This proves the runtime platform end to end while keeping formal
hardening and milestone proof work for Phase 32.

## Existing patterns to reuse

1. **Teacher preview route discipline**
   - `src/app/(teacher)/teacher/editor/preview/page.tsx`
   - keeps `courseId + lessonId` strict and uses a dedicated preview surface
2. **Student player shell/personal split**
   - `src/app/(student)/student/player/page.tsx`
   - `PlayerSurface` keeps the shell static and streams personal runtime state
3. **Student runtime stage composition**
   - `src/components/learning/classroom-runtime-client.tsx`
   - already owns current-step rendering, SSE state, and current action area
4. **Classroom live console posture**
   - `src/app/(classroom)/classroom/page.tsx`
   - `src/components/surfaces/classroom-console-surface.tsx`
   - same route hosts live snapshot and teacher operations
5. **Built-in teaching-step injection**
   - `src/lib/dto/resource-ai.ts`
   - `src/lib/dal/plugins.ts`
   - `src/server/plugins/registry.ts`
   - `src/components/authoring/lesson-authoring-workspace.tsx`
6. **Phase 28 runtime server boundary**
   - `src/features/runtime-platform/classroom/runtime-session.ts`
   - `src/features/runtime-platform/host-actions/runtime-host.ts`
   - `src/actions/classroom-actions.ts`

## Recommended plan structure

This phase fits the roadmap's four-plan split:

1. shared Runtime Host shell, sandboxed iframe container, and host bootstrap
   wiring
2. teacher preview, student player, and classroom-compatible rendering
   integration
3. built-in HTML runtime authoring entry and publish descriptor persistence
4. end-to-end pilot interaction proof plus focused regression and phase verifier

## Pitfalls to avoid

- Do not let the iframe call DAL or `db` directly.
- Do not let the iframe own live classroom state or subscribe to SSE directly.
- Do not add a new lesson step type when `payload.runtime` already exists.
- Do not introduce remote runtime loading, plugin marketplace semantics, or
  third-party script execution.
- Do not let teacher preview accidentally consume student progress or classroom
  live data.
- Do not merge runtime state into the cached player shell.
- Do not treat this pilot as the final `RHOST-04` hardening close; that remains
  in Phase 32.

## Requirement coverage intent

| Requirement | Planned approach |
|---|---|
| `RHOST-01` | shared Runtime Host mounted into preview, player, and classroom-compatible surfaces |
| `RHOST-02` | typed bootstrap handshake, iframe height sync, host-pushed classroom snapshot updates |
| `RHOST-03` | built-in HTML runtime teaching-step template added to current authoring flow and frozen into published snapshot |
