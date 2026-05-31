---
phase: 29-runtime-host-and-html-courseware-pilot
reviewed: 2026-05-16T15:35:00Z
depth: focused
files_reviewed: 16
files_reviewed_list:
  - package.json
  - scripts/verify-phase29-runtime-host.ts
  - src/app/runtime/html-courseware/pilot/page.tsx
  - src/actions/classroom-actions.ts
  - src/actions/classroom-actions.test.ts
  - src/components/surfaces/teacher-lesson-preview-surface.tsx
  - src/components/learning/classroom-runtime-client.tsx
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/surfaces/student-player-surfaces.test.ts
  - src/components/surfaces/classroom-console-surface.test.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
  - src/lib/dal/plugins.builtins.test.ts
  - src/lib/dal/lesson-authoring.test.ts
  - src/lib/dto/resource-ai.ts
  - src/features/runtime-platform/host/runtime-host-bridge.ts
  - src/features/runtime-platform/host/runtime-host-client.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 29: Code review report

**Reviewed:** 2026-05-16T15:35:00Z  
**Depth:** focused  
**Files Reviewed:** 16  
**Status:** clean

## Summary

本次 review 聚焦 Phase 29 的四条主线：shared Runtime Host 宿主层、preview/player/classroom
三条 surface 接入、built-in HTML runtime authoring/publish path，以及 local pilot +
`verify:phase29` 收口。

结论：当前实现满足本阶段锁定边界，没有发现新的 blocker、warning 或需要立刻回滚的
trusted-boundary 漂移。Shared host、local pilot route、built-in template 和 canonical
verifier 已形成一致闭环。

## Findings

本次 focused review 未发现需要记录的 critical 或 warning 级问题。

## What was checked

| Area | Status | Evidence |
| --- | --- | --- |
| Shared Runtime Host stays single-root instead of per-surface iframe glue | ✓ PASS | `src/features/runtime-platform/host/runtime-host-client.tsx` and `runtime-host-frame.tsx` own iframe lifecycle, while preview/player/classroom only import `RuntimeHostClient`. |
| Browser bridge remains typed and local-only | ✓ PASS | `src/features/runtime-platform/host/runtime-host-bridge.ts` defines a typed `RUNTIME_HOST_BRIDGE_CHANNEL`, message schemas, and helper factories for bootstrap, snapshot, and request envelopes. |
| Runtime ready/save/submit stay behind trusted server actions | ✓ PASS | `src/actions/classroom-actions.ts` exposes `recordRuntimeReadyAction`, `recordRuntimeInteractionAction`, `saveRuntimeStateAction`, and `submitRuntimeStateAction`, all with Zod parse + cache-tag updates. |
| Teacher preview does not leak live or personal truth | ✓ PASS | `src/components/surfaces/teacher-lesson-preview-surface.tsx` explicitly labels the host as draft-only and says it does not include student progress or live classroom state. |
| Student and classroom surfaces reuse the same host while preserving existing posture | ✓ PASS | `src/components/learning/classroom-runtime-client.tsx` keeps shell/personal split; `src/components/classroom/classroom-control-panel.tsx` embeds the host inside the current live classroom control path. |
| Built-in HTML runtime authoring remains on the existing step family and publish snapshot truth | ✓ PASS | `src/lib/dto/resource-ai.ts` adds `htmlCourseware` as a `task` built-in with `payload.runtime`, and `src/lib/dal/lesson-authoring.test.ts` keeps the full descriptor frozen into `snapshotJson`. |
| Local pilot stays on browser `postMessage` only and avoids direct DAL/API writes | ✓ PASS | `src/app/runtime/html-courseware/pilot/page.tsx` uses `window.parent.postMessage` and contains no DAL imports, `db.` calls, or `/api` bypass writes. |
| Phase verifier covers host drift, surface drift, and submit-path drift | ✓ PASS | `scripts/verify-phase29-runtime-host.ts` checks all three and runs focused suites before reporting success. |

## Residual risks

本次 review 没有发现 Phase 29 内部阻断项。剩余风险主要属于后续 phase scope：

- Phase 30 仍需把当前 runtime host action 路径升级为 capability-gated governance。
- Phase 31 仍需把当前 runtime/classroom 事件从 SSE 语义中抽离到 transport boundary。
- 当前 `verify:phase29` 仍是 focused gate，不替代最终 milestone 级 end-to-end demo proof。

---

_Reviewed: 2026-05-16T15:35:00Z_  
_Reviewer: the agent (focused Phase 29 close review)_
