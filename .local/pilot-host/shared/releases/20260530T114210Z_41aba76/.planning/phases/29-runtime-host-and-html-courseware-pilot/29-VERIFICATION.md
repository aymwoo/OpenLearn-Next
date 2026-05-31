---
phase: 29-runtime-host-and-html-courseware-pilot
verified: 2026-05-16T15:35:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
gaps: []
human_verification: []
---

# Phase 29: Runtime Host and HTML courseware pilot verification report

**Phase Goal:** Deliver the first sandboxed HTML courseware runtime pilot inside
the existing teacher preview, student player, and classroom-compatible flow.  
**Verified:** 2026-05-16T15:35:00Z  
**Status:** passed

## Goal achievement

### Observable truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Teacher preview, student player, and classroom teacher stage can all render a shared sandboxed iframe Runtime Host for runtime-capable steps. | ✓ VERIFIED | `src/components/surfaces/teacher-lesson-preview-surface.tsx`, `src/components/learning/classroom-runtime-client.tsx`, and `src/components/classroom/classroom-control-panel.tsx` all import and render `RuntimeHostClient` with surface-specific props. |
| 2 | The Runtime Host bootstraps iframe runtime, syncs runtime height, and pushes host-owned bootstrap/snapshot updates through a typed browser bridge. | ✓ VERIFIED | `src/features/runtime-platform/host/runtime-host-bridge.ts` defines `runtime-bootstrap`, `runtime-snapshot-update`, and `runtime-height-change` messages; `runtime-host-client.tsx` posts bootstrap/snapshot messages and accepts height changes into host state. |
| 3 | Teacher can add and publish one built-in HTML runtime step through the existing authoring flow without introducing a new step family. | ✓ VERIFIED | `src/lib/dto/resource-ai.ts` adds `htmlCourseware` as a built-in `task` step with `payload.runtime`; `lesson-authoring-workspace.test.tsx` proves it appears in the built-in library; `lesson-authoring.test.ts` proves the full descriptor is frozen into the published snapshot. |
| 4 | A local HTML runtime pilot can complete a real interaction and submit a structured result back through the trusted runtime submit boundary. | ✓ VERIFIED | `src/app/runtime/html-courseware/pilot/page.tsx` sends `runtime-interaction`, `runtime-save`, and `runtime-submit` through `window.parent.postMessage`; `RuntimeHostClient` routes them into existing trusted classroom actions; `pnpm verify:phase29` passes. |

**Score:** 4/4 truths verified

### Required artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/runtime-platform/host/runtime-host-client.tsx` | single shared host client | ✓ VERIFIED | Owns runtime bootstrap, ready/save/submit dispatch, height sync, and host fallback state. |
| `src/features/runtime-platform/host/runtime-host-bridge.ts` | typed browser bridge | ✓ VERIFIED | Defines the runtime host channel, iframe ready/height messages, and bootstrap/snapshot helpers. |
| `src/features/runtime-platform/host/runtime-host-frame.tsx` | sandboxed iframe shell | ✓ VERIFIED | Renders the iframe with host-owned status copy and `sandbox="allow-scripts allow-forms"`. |
| `src/app/runtime/html-courseware/pilot/page.tsx` | local HTML runtime pilot entry | ✓ VERIFIED | Implements local runtime interaction, save, submit, and height reporting over the browser bridge. |
| `src/lib/dto/resource-ai.ts` | built-in HTML runtime template definition | ✓ VERIFIED | Adds `htmlCourseware` with a local `/runtime/html-courseware/pilot` bootstrap descriptor. |
| `scripts/verify-phase29-runtime-host.ts` | canonical phase verifier | ✓ VERIFIED | Guards host drift, surface drift, and submit-path drift, then runs focused suites. |
| `package.json` | phase-specific verifier entry | ✓ VERIFIED | `verify:phase29` points to `tsx scripts/verify-phase29-runtime-host.ts`. |

### Key link verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/components/surfaces/teacher-lesson-preview-surface.tsx` | `src/features/runtime-platform/host/runtime-host-client.tsx` | draft-only shared host embedding | ✓ WIRED | Preview renders `RuntimeHostClient` with `surface="teacher-preview"` and explicit draft-only copy. |
| `src/components/learning/classroom-runtime-client.tsx` | `src/features/runtime-platform/host/runtime-host-client.tsx` | player current-step runtime rendering | ✓ WIRED | Player chooses the shared host when `step.payload.runtime` exists and keeps shell/personal split intact. |
| `src/components/classroom/classroom-control-panel.tsx` | `src/features/runtime-platform/host/runtime-host-client.tsx` | classroom live-stage runtime embedding | ✓ WIRED | Live classroom stage renders the shared host with snapshot-backed props and teacher scope. |
| `src/features/runtime-platform/host/runtime-host-client.tsx` | `src/actions/classroom-actions.ts` | trusted runtime action boundary | ✓ WIRED | Ready, interaction, save, and submit all flow into trusted server actions, not direct DAL calls. |
| `src/lib/dto/resource-ai.ts` | `src/app/runtime/html-courseware/pilot/page.tsx` | local built-in bootstrap entry | ✓ WIRED | Built-in template bootstrap URL points at the local pilot route. |
| `scripts/verify-phase29-runtime-host.ts` | preview/player/classroom/action files | focused phase gate | ✓ WIRED | The verifier checks all three surface wiring points and the trusted submit path. |

### Behavioral spot-checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 29 canonical verifier | `pnpm verify:phase29` | passed | ✓ PASS |

### Requirements coverage

| Requirement | Source plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `RHOST-01` | `29-01`, `29-02`, `29-04` | Existing teacher preview, student player, and classroom surfaces can render a sandboxed iframe Runtime Host for runtime-capable steps. | ✓ SATISFIED | Shared `RuntimeHostClient` now appears on all three product paths, and the iframe shell is sandboxed in `runtime-host-frame.tsx`. |
| `RHOST-02` | `29-01`, `29-02`, `29-04` | Host can bootstrap the iframe runtime, sync runtime height, and deliver classroom snapshot updates. | ✓ SATISFIED | `runtime-host-client.tsx` calls bootstrap action, posts bootstrap and snapshot updates, and applies iframe-reported height inside host state. |
| `RHOST-03` | `29-03` | Teacher can add and publish one built-in HTML runtime step inside the existing lesson authoring workflow. | ✓ SATISFIED | `htmlCourseware` is exposed as a built-in template and remains frozen inside `publishedLessonVersions.snapshotJson`. |

`RHOST-04` intentionally remains outside this phase and is still tracked in Phase 32.

### Anti-patterns found

None.

### Human verification required

None. Phase 29 close is supported by committed focused tests and the passing
`verify:phase29` gate.

### Gaps summary

None within Phase 29 scope. Remaining work belongs to capability governance,
transport boundary, and milestone hardening phases.

---

_Verified: 2026-05-16T15:35:00Z_  
_Verifier: the agent (Phase 29 close verification)_
