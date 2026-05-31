# Phase 32 Patterns — end-to-end hardening and milestone proof

## Scope

This pattern map identifies the closest existing analogs for Phase 32 work so the
plans can stay anchored to established runtime-platform conventions.

---

## Pattern 1 — deterministic demo seed and published lesson bootstrap

| Target work | Existing analog | Why it matters |
|---|---|---|
| Canonical demo lesson + class + published snapshot seed | `scripts/bootstrap-dev-db.ts` | Already creates teacher/student/class/course/published lesson deterministically |
| Built-in HTML runtime descriptor source | `src/lib/dto/resource-ai.ts` (`htmlCourseware`) | Existing `payload.runtime` truth should be reused, not copied into a divergent shape |

### Reuse notes

- Extend the existing `DEV_STEP_DEFINITIONS` path rather than creating a second demo
  seeding entry.
- Keep seeded actors on `teacher@example.com` and `student@example.com`.

---

## Pattern 2 — trusted runtime host action boundary

| Target work | Existing analog | Why it matters |
|---|---|---|
| Submit/save/interaction trusted boundary | `src/features/runtime-platform/host/runtime-host-client.tsx` | Shared host already owns request routing and status copy |
| Server action entrypoints | `src/actions/classroom-actions.ts` | Existing updateTag discipline must remain the only mutation entry |
| Durable submit result truth | `src/features/runtime-platform/classroom/runtime-session.ts` | Existing runtime submit bridge already writes real classroom/learning truth |

### Reuse notes

- Hardening should extend the existing `runtime-submit` result contract.
- Do not move any truth write into iframe code.

---

## Pattern 3 — student runtime shell and reconnect posture

| Target work | Existing analog | Why it matters |
|---|---|---|
| Runtime step rendering in student flow | `src/components/learning/classroom-runtime-client.tsx` | Already embeds `RuntimeHostClient` inside the current-step shell |
| Player route composition | `src/app/(student)/student/player/page.tsx` | Keeps shell static and personal/runtime data streamed |

### Reuse notes

- Failure recovery belongs inside the current player runtime surface.
- Snapshot reconnect banners stay in the player shell, not inside the iframe.

---

## Pattern 4 — teacher-first live proof surface

| Target work | Existing analog | Why it matters |
|---|---|---|
| First teacher confirmation or anomaly | `src/components/classroom/classroom-control-panel.tsx` | Current classroom main stage already owns teacher live-state feedback |
| Launch discovery posture | `src/components/surfaces/classroom-launch-surface.tsx` | Existing teacher launch surface is the correct place for proof affordance and entry copy |

### Reuse notes

- Do not add a second milestone dashboard.
- Keep teacher proof cues inside launch/classroom surfaces that already exist.

---

## Pattern 5 — runtime inspector deep-link and timeline posture

| Target work | Existing analog | Why it matters |
|---|---|---|
| Runtime-session anchored inspector entry | `src/app/settings/labs/runtime-inspector/page.tsx` | Already consumes `runtimeSessionId` search params |
| Unified timeline surface | `src/components/surfaces/runtime-inspector-surface.tsx` | Phase 31 locked the single timeline posture |
| Scope-safe read model | `src/lib/dal/runtime-inspector.ts` | Existing read model already filters by teacher/admin/developer scope |

### Reuse notes

- Proof affordances should deep-link into this route.
- Do not inline inspector details into `/classroom`.

---

## Pattern 6 — phase verifier structure

| Target work | Existing analog | Why it matters |
|---|---|---|
| Phase-specific canonical gate | `scripts/verify-phase29-runtime-host.ts` | Good template for runtime proof drift guards |
| Multi-domain drift gate | `scripts/verify-phase31-transport-inspector.ts` | Good template for transport + inspector + route posture checks |

### Reuse notes

- `verify:phase32` should combine static source guards and focused suites.
- It may invoke earlier phase verifiers, but must add Phase 32-specific assertions.

---

## File-role classification

| File | Role | Planned use in Phase 32 |
|---|---|---|
| `scripts/bootstrap-dev-db.ts` | deterministic seed/bootstrap | canonical demo seed |
| `src/features/runtime-platform/classroom/runtime-session.ts` | durable runtime submit/save truth | thread `runtimeSessionId` + structured summary |
| `src/features/runtime-platform/host/runtime-host-client.tsx` | shared host UX/state orchestration | terminal submit + recoverable failure states |
| `src/app/runtime/html-courseware/pilot/page.tsx` | local runtime pilot UI | lock UI on submit success and handle retry/result envelopes |
| `src/components/learning/classroom-runtime-client.tsx` | student runtime shell | keep proof continuity and reconnect posture |
| `src/components/classroom/classroom-control-panel.tsx` | teacher live proof surface | first confirmation and anomaly cues |
| `src/components/surfaces/classroom-launch-surface.tsx` | teacher launch entry | productized proof entry affordance |
| `src/lib/dal/runtime-inspector.ts` | inspector read model | deep-link anchor continuity |
| `src/components/surfaces/runtime-inspector-surface.tsx` | inspector presentation | proof drill-down affordance |
| `package.json` + `scripts/verify-phase31-transport-inspector.ts` | verifier registration pattern | add `verify:phase32` |
