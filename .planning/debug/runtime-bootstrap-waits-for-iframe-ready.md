---
status: diagnosed
trigger: "Phase 32 / UAT Test 1: runtime bootstrap 已返回，等待 iframe ready。"
created: 2026-05-17T00:00:00Z
updated: 2026-05-17T00:10:00Z
---

## Current Focus

hypothesis: confirmed — the student runtime stalls because the iframe sends `runtime-frame-ready` before it knows the final host-generated `runtimeInstanceId`, and the host version under UAT ignores that first ready signal.
test: completed by tracing the ready handshake across host client, pilot iframe, and prior Phase 32 debug notes.
expecting: n/a
next_action: return diagnose-only root cause summary to the caller.

## Symptoms

expected: Teacher can launch the seeded lesson, student can submit once, and the student UI stays in terminal success state with locked inputs and summary visible.
actual: runtime bootstrap 已返回，等待 iframe ready。
errors: None reported
reproduction: Test 1 in UAT
started: Discovered during UAT

## Eliminated

## Evidence

- timestamp: 2026-05-17T00:03:00Z
  checked: prior debug session `.planning/debug/runtime-transport-bootstrap.md`
  found: the earlier Phase 32 investigation recorded a secondary root cause where the pilot iframe sent `runtime-frame-ready` with placeholder id `runtime-pilot-pending`, while the parent host only processed instance-matched messages after bootstrap.
  implication: this directly matches the UAT symptom "runtime bootstrap 已返回，等待 iframe ready。" because bootstrap exists but `frameReady` never flips to true.

- timestamp: 2026-05-17T00:04:00Z
  checked: `src/features/runtime-platform/host/runtime-host-client.tsx`
  found: the loading copy is set to `runtime bootstrap 已返回，等待 iframe ready。` when bootstrap resolves but `frameReady` is still false; the message handler now special-cases `runtime-frame-ready` before `isRuntimeBridgeMessageForInstance(...)`.
  implication: the code explicitly encodes this exact symptom and also shows the intended fix path, confirming that an earlier version could stall here when ready messages were filtered too early.

- timestamp: 2026-05-17T00:07:00Z
  checked: `src/app/runtime/html-courseware/pilot/page.tsx`
  found: the iframe announces readiness immediately on mount with `kind: "runtime-frame-ready"` and `runtimeInstanceId: "runtime-pilot-pending"`, then waits for a later `runtime-bootstrap` message to learn the real instance id.
  implication: the iframe cannot satisfy strict instance matching on its first ready message, so any host that requires the final instance id before processing ready will deadlock.

- timestamp: 2026-05-17T00:08:00Z
  checked: `src/features/runtime-platform/host/runtime-host.test.tsx` and `src/features/runtime-platform/host-actions/guards.test.ts`
  found: regression coverage was added specifically for two Phase 32 blockers — accepting pre-bootstrap iframe ready handshake and binding bootstrap transport to `classroomSessionId`.
  implication: the repository already recorded this as the concrete Phase 32 live-browser failure mode, not a speculative theory.

## Resolution

root_cause: ""
fix: ""
verification: ""
files_changed: []
