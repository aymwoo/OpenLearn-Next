---
phase: 53-platform-event-bus-execution-observability
plan: "02"
subsystem: platform-core
tags: [platform-events, command-bus, plugin-governance, event-emission, observability]
requires:
  - phase: 53-01
    provides: typed platform event contracts, SQLite event ledger/outbox foundation
provides:
  - handler-owned generic/domain event emission on plugin governance paths
  - persist-then-notify command bus flow for success and failure events
  - concrete publication-port seam from command bus into the platform persisted-event bus
affects: [Phase 53, platform-core, plugin-governance, command-bus, future event subscribers]
tech-stack:
  added: []
  patterns: [handler-owned event semantics, generic-failure-only rule, persist-then-notify, command-first dispatch result]
key-files:
  created:
    - src/features/platform-core/commands/handlers/plugins.events.test.ts
  modified:
    - src/features/platform-core/commands/bus.ts
    - src/features/platform-core/commands/bus.test.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/handlers/plugins.ts
    - src/features/platform-core/commands/producers/plugin-governance.ts
    - src/features/platform-core/events/contracts.ts
key-decisions:
  - "Business failures still throw through the existing producer/API flow, but the bus persists one generic failure event before rethrowing."
  - "Handlers own success/domain semantics; the bus never infers domain events from command type."
  - "Publication port receives persisted event/dispatch ids only, never raw unpersisted payloads."
patterns-established:
  - "Success path pattern: command summary -> platform event append -> dispatch allocation -> optional publishPersisted(batch)."
  - "Failure path pattern: command summary -> one generic failure event append -> optional publishPersisted(batch) -> rethrow."
requirements-completed: [EVNT-01, EVNT-02, EVNT-05]
duration: recovery session
completed: 2026-05-22
---

# Phase 53 Plan 02: Command-path event emission summary

**plugin governance command path 现在会显式产生 typed platform events，并在 `dispatchPlatformCommand()` 内完成 persist-then-notify 接线。**

## Performance

- **Duration:** recovery session
- **Completed:** 2026-05-22
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 在 `src/features/platform-core/commands/handlers/plugins.ts` 中把 install、lifecycle、kill switch、retry、uninstall 等成功路径升级为显式 `emittedEvents` 返回。
- 新增 `PlatformCommandExecutionError`，让 handler 能为业务失败提供结构化 `failureAttribution` 与单条 generic failure event。
- 在 `src/features/platform-core/commands/bus.ts` 中把 command execution 扩展为 `record summary -> append persisted events -> allocate dispatch rows -> optional publication port handoff`。
- 在 `src/features/platform-core/commands/producers/plugin-governance.ts` 中接入默认 in-process platform publication port，实现 command-path -> persisted-event-bus 的真实桥接点。

## Files created/modified

- `src/features/platform-core/commands/handlers/plugins.ts` - handler-owned success/domain event emission 与 structured failure semantics。
- `src/features/platform-core/commands/handlers/plugins.events.test.ts` - install / lifecycle / kill switch / retry failure event regression coverage。
- `src/features/platform-core/commands/contracts.ts` - 新增 `PlatformCommandExecutionError`，并收紧 execution result 输出类型。
- `src/features/platform-core/events/contracts.ts` - publication port 改为接收 persisted batch ids。
- `src/features/platform-core/commands/bus.ts` - success/failure event append、correlation continuity、optional publishPersisted handoff。
- `src/features/platform-core/commands/bus.test.ts` - command bus event persistence / failure / no-runtime-import guard tests。
- `src/features/platform-core/commands/producers/plugin-governance.ts` - 注入默认 in-process publication port。

## Verification

- `pnpm vitest run src/features/platform-core/commands/handlers/plugins.events.test.ts src/features/platform-core/commands/handlers/plugins.test.ts`
- `pnpm vitest run src/features/platform-core/commands/bus.test.ts`

## Deviations from plan

### Auto-fixed issues

**1. [Execution Recovery] Kept throw-based producer semantics while still persisting failure events**
- **Found during:** Task 1 / Task 2 implementation
- **Issue:** 现有 Server Action / host action 上游依赖 command failure 继续抛错；如果改成纯 result-return 会打破现有错误流。
- **Fix:** 让 handler/ bus 在 failure path 上先持久化 generic failure event，再继续 rethrow 原错误。
- **Impact:** 保持了既有调用语义，同时满足 D-53-04 / D-53-08 的 failure observability 要求。

## Next phase readiness

- `53-03` 可以直接把 `publicationPort.publishPersisted(batch)` 实现成真实 persisted-event bus，而无需再改 command bus contract。
- event correlation metadata 已从 command envelope 穿透到 event append 和 dispatch rows。

## Self-check: PASSED

- FOUND: `src/features/platform-core/commands/handlers/plugins.events.test.ts`
- FOUND: `src/features/platform-core/commands/bus.ts`
- FOUND: `src/features/platform-core/commands/producers/plugin-governance.ts`
- VERIFIED: focused Wave 2 handler and bus tests passed

---
*Phase: 53-platform-event-bus-execution-observability*
*Completed: 2026-05-22*
