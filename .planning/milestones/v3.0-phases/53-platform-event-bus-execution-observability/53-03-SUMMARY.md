---
phase: 53-platform-event-bus-execution-observability
plan: "03"
subsystem: platform-core
tags: [platform-events, subscribers, in-process, adapters, event-bus]
requires:
  - phase: 53-01
    provides: persisted event ledger and dispatch-state tables
  - phase: 53-02
    provides: publication-port handoff from dispatchPlatformCommand()
provides:
  - persisted-event bus over SQLite-backed platform event truth
  - typed subscriber registry and selector helpers
  - in-process adapter plus future Redis/WebSocket bridge contracts
affects: [Phase 53, platform-core, plugin-governance, future workflow consumers, operator timeline]
tech-stack:
  added: []
  patterns: [persisted-first delivery, selector-based subscribers, delivery-only bridges, dispatch-failure isolation]
key-files:
  created:
    - src/features/platform-core/events/adapters/future-bridges.ts
    - src/features/platform-core/events/adapters/in-process.ts
    - src/features/platform-core/events/adapters.test.ts
    - src/features/platform-core/events/bus.test.ts
    - src/features/platform-core/events/bus.ts
    - src/features/platform-core/events/subscribers.ts
  modified:
    - src/features/platform-core/events/ledger.ts
key-decisions:
  - "Persisted event ids/dispatch ids are the only publication input; raw payloads are never treated as truth."
  - "In-process is the only concrete Phase 53 delivery adapter; Redis/WebSocket remain contract-only bridges."
  - "Subscriber failures mark dispatch rows failed but do not rewrite event truth."
patterns-established:
  - "Subscriber registry pattern: selector over event type/category/aggregateType, no runtime topics."
  - "Delivery isolation pattern: one dispatch row is marked delivered/failed per persisted dispatch execution."
requirements-completed: [EVNT-03, EVNT-04, EVNT-05]
duration: recovery session
completed: 2026-05-22
---

# Phase 53 Plan 03: Persisted-event bus summary

**platform events 现在有真实的 persisted-event subscriber seam：command bus 交出 persisted batch ids，platform event bus 从 SQLite ledger 读取 truth，再通过 in-process adapter 执行订阅分发。**

## Performance

- **Duration:** recovery session
- **Completed:** 2026-05-22
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 新增 `src/features/platform-core/events/subscribers.ts`，提供 typed subscriber registry、selector matching 与 domain/outcome selector helpers。
- 新增 `src/features/platform-core/events/bus.ts`，实现 persisted-first platform event bus，并作为 `PlatformEventPublicationPort` 的 concrete implementation。
- 新增 `src/features/platform-core/events/adapters/in-process.ts`，把 Phase 53 默认 adapter 锁定为 in-process delivery。
- 新增 `src/features/platform-core/events/adapters/future-bridges.ts`，定义 Redis/WebSocket future bridge contract，并明确禁止桥接层夺取 truth ownership。
- 扩展 `src/features/platform-core/events/ledger.ts`，加入按 ids 批量读取 events / dispatches 的 helper，供 persisted-event bus 使用。

## Files created/modified

- `src/features/platform-core/events/subscribers.ts` - subscriber registry 与 selector helpers。
- `src/features/platform-core/events/bus.ts` - persisted-event publication orchestration，按 persisted ids 读取 ledger truth。
- `src/features/platform-core/events/adapters/in-process.ts` - 默认 in-process platform adapter。
- `src/features/platform-core/events/adapters/future-bridges.ts` - future Redis/WebSocket bridge ownership contract。
- `src/features/platform-core/events/ledger.ts` - 新增 `loadPlatformEventsByIds()` / `loadPlatformDispatchesByIds()`。
- `src/features/platform-core/events/bus.test.ts` - persisted-first publish / selector filtering / failure isolation coverage。
- `src/features/platform-core/events/adapters.test.ts` - in-process ownership 与 future bridge constraint coverage。

## Verification

- `pnpm vitest run src/features/platform-core/events/bus.test.ts src/features/platform-core/events/adapters.test.ts`
- `pnpm vitest run src/features/platform-core/commands/handlers/plugins.events.test.ts src/features/platform-core/commands/handlers/plugins.test.ts src/features/platform-core/commands/bus.test.ts src/features/platform-core/events/bus.test.ts src/features/platform-core/events/adapters.test.ts`

## Deviations from plan

### Auto-fixed issues

**1. [Execution Recovery] Server-only test environment needed explicit mocking**
- **Found during:** 53-03 focused test bring-up
- **Issue:** `events/bus.ts` 与 adapter modules 带 `server-only`，Vitest 直接导入时会报错。
- **Fix:** 在 focused tests 中显式 `vi.mock("server-only", () => ({}))`。
- **Impact:** 只影响测试环境，不改变 production ownership or runtime posture。

## Next phase readiness

- `53-04` 可以直接消费 persisted dispatch state、command summary 和 event timeline 组装 operator-visible observability。
- future Redis/WebSocket bridge phases 已有 contract 落点，但当前 truth ownership 仍稳定锚定在 SQLite ledger。

## Self-check: PASSED

- FOUND: `src/features/platform-core/events/bus.ts`
- FOUND: `src/features/platform-core/events/subscribers.ts`
- FOUND: `src/features/platform-core/events/adapters/in-process.ts`
- FOUND: `src/features/platform-core/events/adapters/future-bridges.ts`
- VERIFIED: focused Wave 2 event bus and adapter tests passed

---
*Phase: 53-platform-event-bus-execution-observability*
*Completed: 2026-05-22*
