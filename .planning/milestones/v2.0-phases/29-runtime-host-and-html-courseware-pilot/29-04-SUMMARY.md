---
phase: 29-runtime-host-and-html-courseware-pilot
plan: 04
subsystem: verification
tags: [runtime-platform, html-courseware, verifier, runtime-host, trusted-submit]
requires:
  - phase: 29-01
    provides: shared Runtime Host and browser bridge
  - phase: 29-02
    provides: preview/player/classroom host wiring
  - phase: 29-03
    provides: built-in HTML runtime template and local bootstrap route
provides:
  - local HTML courseware pilot route
  - real interaction, save, and structured submit over the shared browser bridge
  - canonical verify:phase29 gate
affects: [phase-29, runtime-pilot, verifier, submit-path]
tech-stack:
  added: []
  patterns: [local runtime pilot route, trusted submit path, phase-specific verifier]
key-files:
  created:
    - src/app/runtime/html-courseware/pilot/page.tsx
    - scripts/verify-phase29-runtime-host.ts
  modified:
    - package.json
    - src/actions/classroom-actions.test.ts
    - src/components/surfaces/student-player-surfaces.test.ts
    - src/components/surfaces/classroom-console-surface.test.tsx
    - src/features/runtime-platform/host/runtime-host.test.tsx
key-decisions:
  - "local HTML pilot 只通过 browser bridge 与 shared Runtime Host 通信，不直接触达 DAL、DB 或 API route。"
  - "Phase 29 verifier 只守 shared host、本地 runtime entry、surface wiring 与 trusted submit path，不提前承担 Phase 32 milestone proof。"
patterns-established:
  - "Pattern: runtime pilot proofs combine static drift guards with focused suites, instead of relying on manual UI inspection only."
requirements-completed: [RHOST-01, RHOST-02, RHOST-03]
duration: not-recorded
completed: 2026-05-16
---

# Phase 29 Plan 04: Local pilot and verifier summary

**Local HTML runtime pilot plus canonical `verify:phase29` gate for host drift, surface drift, and trusted submit wiring**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 新增 `src/app/runtime/html-courseware/pilot/page.tsx`，实现本地 HTML runtime pilot：接收宿主 bootstrap，发送 `runtime-ready`、`runtime-interaction`、`runtime-save`、`runtime-submit` 与 `runtime-height-change`。
- pilot 页面使用宿主下发的真实 `classroomSessionId`、`stepId`、`lessonId`、`publishedVersionId` 和 runtime session 上下文，不再使用假上下文占位。
- 新增 `scripts/verify-phase29-runtime-host.ts` 与 `package.json` 中的 `verify:phase29`，把 shared host、本地 runtime entry、surface wiring 和 trusted submit path 收敛成单一 gate。
- `pnpm verify:phase29` 当前通过：4 个测试文件、54 个测试全部通过。

## Task Commits

No task commits recorded yet. 当前改动仍在工作树中；若后续需要提交，应只精确提交 Phase 29 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/app/runtime/html-courseware/pilot/page.tsx` - 本地 HTML runtime pilot，通过 `window.parent.postMessage()` 走 typed browser bridge。
- `scripts/verify-phase29-runtime-host.ts` - 静态 guard + focused suites 的 Phase 29 verifier。
- `package.json` - 注册 `verify:phase29`。
- `src/features/runtime-platform/host/runtime-host.test.tsx` - 锁定 runtime-ready 和 local pilot browser bridge。
- `src/actions/classroom-actions.test.ts` - 持续锁定 runtime submit 仍走 trusted action path。
- `src/components/surfaces/student-player-surfaces.test.ts` / `src/components/surfaces/classroom-console-surface.test.tsx` - 锁住 shared host 的 surface wiring 不漂移。

## Decisions Made

- local HTML pilot 采用 repo 内 route，而不是内联 HTML blob 或 remote iframe source，便于 verifier 做静态 guard。
- `verify:phase29` 明确分成 `host drift`、`surface drift`、`submit-path drift` 三类，优先快速暴露 contract 退化。
- 本阶段 proof 只证明首个 local HTML runtime pilot 已经闭环，不提前宣称完成 `RHOST-04` 或 milestone-level end-to-end hardening。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pilot 初版仍使用占位上下文而不是真实宿主 bootstrap 字段**
- **Found during:** runtime host integration verification
- **Issue:** pilot 页面最初还保留 preview-style fallback context，无法证明真实 live runtime interaction 会把 lesson/step/session identity 带回 trusted boundary。
- **Fix:** 改为优先消费宿主下发的真实 `classroomSessionId`、`stepId`、`lessonId`、`publishedVersionId`、`runtimeVersion` 和 runtime session id。
- **Files modified:** `src/app/runtime/html-courseware/pilot/page.tsx`
- **Verification:** `pnpm verify:phase29`
- **Committed in:** pending (working tree)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 修正了 pilot proof 的真实性，没有扩展 Phase 29 目标。

## Issues Encountered

None remaining.

## User Setup Required

None.

## Next Phase Readiness

- Phase 30 可以基于当前 `RuntimeHostClient`、browser bridge 和 local pilot，继续叠 capability enforcement 与 lifecycle audit。
- Phase 32 的最终 milestone proof 可直接建立在 `verify:phase29` 已锁住的 host/surface/submit path 之上。

## Self-Check: PASSED

- Found `src/app/runtime/html-courseware/pilot/page.tsx`
- Found `window.parent.postMessage`
- Found `scripts/verify-phase29-runtime-host.ts`
- Found package script `verify:phase29`

---

*Phase: 29-runtime-host-and-html-courseware-pilot*
*Completed: 2026-05-16*
