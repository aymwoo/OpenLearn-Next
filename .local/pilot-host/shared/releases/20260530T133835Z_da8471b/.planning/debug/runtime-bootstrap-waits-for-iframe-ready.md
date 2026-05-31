---
status: resolved
trigger: "Phase 32 / UAT Test 1: runtime bootstrap 已返回，等待 iframe ready。"
created: 2026-05-17T00:00:00Z
updated: 2026-05-20T13:43:20+08:00
---

## Current Focus

hypothesis: confirmed — the student runtime stalls because the iframe sends `runtime-frame-ready` before it knows the final host-generated `runtimeInstanceId`, and the host version under UAT ignores that first ready signal.
test: completed by tracing the ready handshake across host client, pilot iframe, and prior Phase 32 debug notes.
expecting: n/a
next_action: none

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

root_cause: 学生端 iframe 在收到 bootstrap 前就发送 `runtime-frame-ready`，但旧版宿主先按最终 `runtimeInstanceId` 过滤事件，导致首次 ready 握手被忽略，`frameReady` 无法成立，页面卡在“等待 iframe ready”。
fix: Phase 32-05 已将 `RuntimeHostClient` 的 message listener 提前到 bootstrap 之前，并把 `runtime-frame-ready` 作为 bootstrap 前唯一允许的特例消息，同时保留其他 runtime message 的实例级过滤。
verification: `32-05-SUMMARY.md` 已记录该修复，`32-VERIFICATION.md` 与 `32-UAT.md` 均表明 canonical runtime startup 已通过，Phase 32 最终状态为 passed。
files_changed:
  - src/features/runtime-platform/host/runtime-host-client.tsx
  - src/features/runtime-platform/host/runtime-host.test.tsx
