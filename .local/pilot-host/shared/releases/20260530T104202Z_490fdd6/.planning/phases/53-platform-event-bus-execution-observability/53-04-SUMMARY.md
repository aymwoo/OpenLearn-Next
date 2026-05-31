---
phase: 53-platform-event-bus-execution-observability
plan: "04"
subsystem: platform-core
tags: [platform-events, observability, operator-surface, verify-phase53, settings-labs]
requires:
  - phase: 53-02
    provides: command-path event persistence and publication handoff
  - phase: 53-03
    provides: persisted-event bus and delivery adapter seam
provides:
  - command-summary-first operator read model over platform command + event ledger
  - minimal `/settings/labs` execution summary and event timeline drill-down
  - focused `verify:phase53` regression gate for truth and scope boundaries
affects: [Phase 53, platform-core, settings-labs, plugin-governance, operator observability]
tech-stack:
  added: []
  patterns: [command-summary-first operator UI, summary DTO boundary, focused phase verifier]
key-files:
  created:
    - src/features/platform-core/commands/producers/plugin-governance.test.ts
    - src/features/platform-core/observability/dto.ts
    - src/features/platform-core/observability/operator-read-model.test.ts
    - src/features/platform-core/observability/operator-read-model.ts
    - scripts/verify-phase53-platform-events.ts
    - .planning/phases/53-platform-event-bus-execution-observability/53-04-SUMMARY.md
  modified:
    - package.json
    - src/app/settings/labs/page.tsx
    - src/components/surfaces/settings-surface.test.tsx
    - src/components/surfaces/settings-surface.tsx
key-decisions:
  - "operator surface stays command-summary-first; timeline is secondary drill-down, not a raw event console."
  - "invalidation intent remains summary metadata on the command row and does not expand into a separate event family."
  - "verify:phase53 statically guards Phase 53 boundaries and then runs only the focused platform-event regression suite."
patterns-established:
  - "Read-model pattern: platform command summary DTO + ordered event timeline DTO behind server-only DAL access."
  - "Operator panel pattern: reuse `/settings/labs` instead of adding a new standalone observability route family."
requirements-completed: [EVNT-06, EVNT-07]
duration: single execution session
completed: 2026-05-22
---

# Phase 53 Plan 04: Execution observability summary

**Phase 53 已收口：真实 producer composition 现在会把 persisted-event publication port 注入 command bus，operator 可以在 `/settings/labs` 先看 command summary，再下钻 event timeline，并且 `verify:phase53` 会自动守住 truth ownership 与 scope boundary。**

## Performance

- **Duration:** single execution session
- **Completed:** 2026-05-22
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 新增 `src/features/platform-core/observability/dto.ts`，把 operator 消费边界固定为 command summary DTO 与 timeline DTO，不暴露 raw DB row shape。
- 新增 `src/features/platform-core/observability/operator-read-model.ts`，提供 command list 与单 command timeline detail 的 server-only read model。
- 新增 `src/features/platform-core/observability/operator-read-model.test.ts`，覆盖 success summary、failure attribution、timeline ordering、empty timeline 与 invalidation visibility。
- 新增 `src/features/platform-core/commands/producers/plugin-governance.test.ts`，证明 canonical producer dispatch 会带上 concrete publication port，并把 persisted dispatch ids 交给 event bus。
- 扩展 `src/components/surfaces/settings-surface.tsx` 与 `src/app/settings/labs/page.tsx`，在现有 `/settings/labs` 中加入最小 execution summary / timeline drill-down。
- 新增 `scripts/verify-phase53-platform-events.ts` 并接入 `package.json#verify:phase53`，把 runtime truth reuse、noisy invalidation family、Redis/WebSocket truth drift、以及 Phase 54 scope leakage 变成自动化回归闸门。

## Files created/modified

- `src/features/platform-core/observability/dto.ts` - operator-facing summary / timeline DTOs.
- `src/features/platform-core/observability/operator-read-model.ts` - command-first summary list 和 ordered timeline loader.
- `src/features/platform-core/observability/operator-read-model.test.ts` - read model focused regression coverage.
- `src/features/platform-core/commands/producers/plugin-governance.test.ts` - producer-side publication-port composition coverage.
- `src/components/surfaces/settings-surface.tsx` - `/settings/labs` 平台事件 operator panel.
- `src/components/surfaces/settings-surface.test.tsx` - labs surface source wiring assertions.
- `src/app/settings/labs/page.tsx` - `commandId` search param 接线.
- `scripts/verify-phase53-platform-events.ts` - focused phase verifier.
- `package.json` - `verify:phase53` script entry.

## Verification

- `pnpm exec vitest run src/features/platform-core/commands/producers/plugin-governance.test.ts src/features/platform-core/observability/operator-read-model.test.ts src/components/surfaces/settings-surface.test.tsx`
- `pnpm verify:phase53`

## Deviations from plan

### Auto-fixed issues

**1. verifier 初版误扫到测试 guard 字符串**
- **Found during:** first `pnpm verify:phase53`
- **Issue:** 静态扫描把 `.test.ts` 中对 `runtimeEventOutbox` 的 guard 断言也当成 runtime truth reuse。
- **Fix:** 把 verifier 的静态扫描范围收窄到运行时代码，排除 `*.test.ts(x)`。
- **Impact:** verifier 继续严格守住运行时代码边界，但不会被测试文本误伤。

## Next phase readiness

- Phase 53 四个 plans 已全部完成，`verify:phase53` 可作为后续 Phase 54 前的稳定回归入口。
- Phase 54 可以在不破坏 event truth / operator observability posture 的前提下继续补 machine-readable AI-native contracts。

## Self-check: PASSED

- FOUND: `src/features/platform-core/observability/dto.ts`
- FOUND: `src/features/platform-core/observability/operator-read-model.ts`
- FOUND: `scripts/verify-phase53-platform-events.ts`
- VERIFIED: `/settings/labs` source wiring updated for platform event operator panel
- VERIFIED: `pnpm verify:phase53` passed

---
*Phase: 53-platform-event-bus-execution-observability*
*Completed: 2026-05-22*
