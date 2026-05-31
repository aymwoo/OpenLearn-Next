---
status: resolved
trigger: "Phase 32 canonical proof live-browser chain still fails at runtime bootstrap transport delivery; student runtime falls back before reaching stable ready/submit success."
created: 2026-05-17T00:00:00Z
updated: 2026-05-20T13:43:20+08:00
---

## Current Focus

hypothesis: runtime bootstrap result is being published with mismatched session identifiers, causing `transportDeliveryAttempt` writes or downstream delivery lookup to fail and host to fall back.
test: trace `runtime.host-result.runtime-bootstrap` from host action result creation through transport gateway persistence and compare `sessionId`, `truthRef.classroomSessionId`, and `truthRef.runtimeSessionId` semantics.
expecting: find one concrete identifier mismatch or persistence contract violation that explains why production-like teacher/student flow never reaches stable ready state.
next_action: none

## Symptoms

- expected: under `npm run start`, teacher launches `开发测试课时` + `开发测试班级`, switches `/classroom` to `互动证明：HTML 课件实验` with lock enabled, and student `/student/player` reaches proof ready/submit success while teacher sees first-feedback.
- actual: student runtime enters proof shell but bootstrap falls back before stable ready/submit success; teacher-side proof chain cannot complete.
- errors: prior blockers are already cleared (`UntrustedHost`, `/classroom` validation error, `HOST_ACTION_DENIED:capability_missing`); remaining failure is around runtime bootstrap / transport / `transportDeliveryAttempt` write path.
- reproduction: run seeded Phase 32 demo on `npm run start`, login as teacher and student, move teacher classroom to proof step with lock enabled, then open student player and observe runtime bootstrap failure/fallback.
- started: after clearing prior Phase 32 live-browser blockers on latest code, before final human UAT closeout.

## Evidence

- `src/features/runtime-platform/host-actions/runtime-host.ts:206-214` originally built the `runtime-bootstrap` host result envelope with `sessionId: bootstrap.sessionId` only.
- In this code path, `bootstrap.sessionId` is the runtime session id, not the classroom session id used by classroom transport lookup.
- `src/features/runtime-platform/seams/transport/gateway.ts:46-66` persists transport attempts with `classroomSessionId: event.truthRef.classroomSessionId ?? event.sessionId`.
- Because bootstrap results omitted `truthRef.classroomSessionId`, the gateway fell back to `event.sessionId` and wrote the runtime session id into `transportDeliveryAttempt.classroomSessionId`.
- `src/features/runtime-platform/seams/transport/gateway.ts:133-147` later resolves consumer traces by `transportDeliveryAttempts.classroomSessionId = trace.sessionId`, so the wrong persisted identifier breaks downstream lookup and transport association.
- Added regression coverage in `src/features/runtime-platform/host-actions/guards.test.ts:90-96` to lock the bootstrap result to `bootstrap.classroomSummary.classroomSessionId`.
- Focused verification passed:
  - `pnpm vitest run "src/features/runtime-platform/host-actions/guards.test.ts" "src/features/runtime-platform/seams/transport/gateway.test.ts"`
- Re-ran the focused verification on current worktree at `2026-05-17T04:15:47Z`; both transport-related test files still pass green after confirming the classroom-session binding remains in `runtime-host.ts`.
- Found an additional live-runtime blocker in `src/features/runtime-platform/host/runtime-host-client.tsx`: the parent host filtered `runtime-frame-ready` through `isRuntimeBridgeMessageForInstance(...)` before any bootstrap message had synchronized the iframe to the generated `runtimeInstanceId`. The pilot iframe emits its first ready handshake as `runtime-pilot-pending`, so the parent ignored the ready event, never set `frameReady`, and therefore never posted bootstrap back into the iframe.
- Fixed the handshake by parsing `runtime-frame-ready` before instance-specific filtering, while keeping all other runtime messages scoped to `runtimeInstanceId`.
- Added regression coverage in `src/features/runtime-platform/host/runtime-host.test.tsx` asserting the host accepts the pre-bootstrap ready handshake from the pilot iframe.
- Verification passed:
  - `pnpm vitest run "src/features/runtime-platform/host/runtime-host.test.tsx" "src/features/runtime-platform/host-actions/guards.test.ts" "src/features/runtime-platform/seams/transport/gateway.test.ts"`
  - 3 test files, 21 tests green.

## Eliminated

- `UntrustedHost` was already fixed before this session and is not the current blocker.
- `/classroom` validation failures were already fixed before this session and are not the current blocker.
- `HOST_ACTION_DENIED:capability_missing` for student bootstrap was already fixed before this session and is not the current blocker.
- The original transport failure was a concrete session identifier contract mismatch on bootstrap result publication.
- A second live-browser failure path also existed in the iframe/host bootstrap handshake: the host discarded the iframe's first `runtime-frame-ready` message because it arrived before `runtimeInstanceId` synchronization.

## Resolution

root_cause: `runtime-bootstrap` published its host result with only `sessionId = bootstrap.sessionId`, where that value is the runtime session id. The transport gateway uses `truthRef.classroomSessionId ?? event.sessionId` when persisting `transportDeliveryAttempt.classroomSessionId`, so bootstrap attempts were written against the runtime session instead of the classroom session. Downstream consumer trace lookup keys on classroom session id, causing transport association to miss and the browser runtime to fall back before stable ready/submit.
secondary_root_cause: the pilot iframe sends its initial `runtime-frame-ready` event with placeholder id `runtime-pilot-pending`, but the parent host only processed messages after `isRuntimeBridgeMessageForInstance(...)` matched the generated host-side id. That caused a deadlock where the host waited for iframe ready before sending bootstrap, and the iframe waited for bootstrap before ever learning the real instance id.
fix: add `classroomSessionId: bootstrap.classroomSummary.classroomSessionId` to the `runtime-bootstrap` result envelope in `src/features/runtime-platform/host-actions/runtime-host.ts`; in `src/features/runtime-platform/host/runtime-host-client.tsx`, parse and accept `runtime-frame-ready` before instance-specific filtering; add regression tests covering both the classroom-session binding and the pre-bootstrap iframe ready handshake.
verification: `pnpm vitest run "src/features/runtime-platform/host/runtime-host.test.tsx" "src/features/runtime-platform/host-actions/guards.test.ts" "src/features/runtime-platform/seams/transport/gateway.test.ts"` passed with 3 test files and 21 tests green.
files_changed:
- `src/features/runtime-platform/host-actions/runtime-host.ts`
- `src/features/runtime-platform/host-actions/guards.test.ts`
- `src/features/runtime-platform/host/runtime-host-client.tsx`
- `src/features/runtime-platform/host/runtime-host.test.tsx`
