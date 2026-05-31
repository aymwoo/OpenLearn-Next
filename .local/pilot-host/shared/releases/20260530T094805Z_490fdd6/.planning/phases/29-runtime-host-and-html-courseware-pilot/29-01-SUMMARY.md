---
phase: 29-runtime-host-and-html-courseware-pilot
plan: 01
subsystem: runtime-host
tags: [runtime-platform, runtime-host, iframe, browser-bridge, bootstrap]
requires:
  - phase: 28-01
    provides: typed TeachingBridge request and result contracts
  - phase: 28-02
    provides: runtime bootstrap DTO and session recovery contracts
  - phase: 28-03
    provides: trusted runtime bootstrap/save/submit host actions
provides:
  - shared Runtime Host client and frame shell
  - typed browser bridge for iframe bootstrap, snapshot, height, and result messages
  - trusted runtime-ready wiring on the existing classroom action boundary
affects: [phase-29, runtime-host, preview, player, classroom]
tech-stack:
  added: []
  patterns: [single shared runtime host, typed postMessage bridge, host-owned iframe state]
key-files:
  created:
    - src/features/runtime-platform/host/index.ts
    - src/features/runtime-platform/host/runtime-host-bridge.ts
    - src/features/runtime-platform/host/runtime-host-frame.tsx
    - src/features/runtime-platform/host/runtime-host-client.tsx
    - src/features/runtime-platform/host/runtime-host.test.tsx
  modified:
    - src/actions/classroom-actions.ts
    - src/features/runtime-platform/classroom/index.ts
key-decisions:
  - "共享 Runtime Host 保持单一 client/frame/bridge 组合，不为 preview/player/classroom 分裂出私有 iframe helper。"
  - "browser bridge 只做 typed postMessage 交换；真正的 runtime bootstrap、ready、interaction、save、submit 仍走 trusted server boundary。"
patterns-established:
  - "Pattern: RuntimeHostClient owns iframe lifecycle, frame height, host fallback copy, and trusted action dispatch."
  - "Pattern: iframe runtime reports height and readiness declaratively; host validates and applies them."
requirements-completed: [RHOST-01, RHOST-02]
duration: not-recorded
completed: 2026-05-16
---

# Phase 29 Plan 01: Shared Runtime Host summary

**Single shared Runtime Host shell with typed browser bridge, trusted bootstrap, and host-owned iframe state**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 新增 `src/features/runtime-platform/host/` 子域，提供 `RuntimeHostClient`、`RuntimeHostFrame`、`runtime-host-bridge` 和 public export。
- 用 `RUNTIME_HOST_BRIDGE_CHANNEL` 与 Zod schema 固定 host/runtime 浏览器消息，覆盖 `runtime-frame-ready`、`runtime-height-change`、`runtime-bootstrap`、`runtime-snapshot-update` 以及现有 TeachingBridge envelope。
- `RuntimeHostClient` 现可调用 `bootstrapRuntimeSessionAction`、`recordRuntimeReadyAction`、`recordRuntimeInteractionAction`、`saveRuntimeStateAction`、`submitRuntimeStateAction`，并在宿主层维护 iframe ready、高度、fallback copy 和 trusted result 状态。
- 新增 `recordRuntimeReadyAction()`，把 `runtime-ready` 补回现有 trusted host boundary，闭合 runtime 首次挂载后的真实就绪链路。

## Task Commits

No task commits recorded yet. 当前改动仍在工作树中；若后续需要提交，应只精确提交 Phase 29 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/features/runtime-platform/host/runtime-host-bridge.ts` - 定义 typed browser bridge、channel 常量、bootstrap/snapshot message helpers。
- `src/features/runtime-platform/host/runtime-host-frame.tsx` - 统一渲染宿主卡片、状态 copy、sandboxed iframe 和 host-owned 高度。
- `src/features/runtime-platform/host/runtime-host-client.tsx` - 组合 bootstrap、ready、interaction、save、submit 和 height sync。
- `src/features/runtime-platform/host/index.ts` - 暴露 shared host public API。
- `src/features/runtime-platform/host/runtime-host.test.tsx` - 锁定 runtime-ready 和 local pilot 仅走 browser bridge。
- `src/actions/classroom-actions.ts` - 新增 `recordRuntimeReadyAction()` trusted boundary。
- `src/features/runtime-platform/classroom/index.ts` - 暴露 classroom 子域 export 以便共享接入。

## Decisions Made

- shared Runtime Host 以 `RuntimeHostClient -> RuntimeHostFrame -> iframe` 为唯一宿主结构，不在 surface 层重复做 bootstrap 和 postMessage 逻辑。
- iframe bootstrap 与 snapshot 下发都通过 typed bridge 完成，避免 surface 直接拼 message object。
- runtime-ready 也必须落入 trusted server boundary，而不是只在浏览器内本地切状态。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bootstrap 初版错误要求显式 `actorId` 才能继续**
- **Found during:** host wiring self-check
- **Issue:** `RuntimeHostClient` 初版把 bootstrap 身份依赖写成了必须传入 `actorId`，导致 student surface 在没有显式 actor id 时无法走 trusted bootstrap。
- **Fix:** 改成 `actorId ?? runtime-host-${actorScope}` 的安全宿主身份默认值，并继续由 server boundary 做最终 actor scope 校验。
- **Files modified:** `src/features/runtime-platform/host/runtime-host-client.tsx`
- **Verification:** `pnpm verify:phase29`
- **Committed in:** pending (working tree)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 修正了 host bootstrap 的实际可用性，没有扩展计划范围。

## Issues Encountered

None remaining.

## User Setup Required

None - local HTML runtime pilot and shared host stay inside the repo.

## Next Phase Readiness

- Plan 02 可以直接把同一个 `RuntimeHostClient` 接到 preview/player/classroom，而不必再造 surface-specific iframe glue code。
- Plan 04 的 local runtime pilot 已经有稳定 browser bridge contract 可复用。

## Self-Check: PASSED

- Found `src/features/runtime-platform/host/runtime-host-client.tsx`
- Found `src/features/runtime-platform/host/runtime-host-bridge.ts`
- Found `src/features/runtime-platform/host/runtime-host-frame.tsx`
- Found `src/actions/classroom-actions.ts` export `recordRuntimeReadyAction`

---

*Phase: 29-runtime-host-and-html-courseware-pilot*
*Completed: 2026-05-16*
