---
phase: 53-platform-event-bus-execution-observability
verified: 2026-05-23T15:28:28Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7 must-haves verified
  gaps_closed:
    - real_production_subscriber_registration
    - operator_visible_dispatch_delivery_detail
  gaps_remaining: []
  regressions: []
---

# Phase 53: Platform event bus & execution observability verification report

**Phase Goal:** 把 platform event truth 从 runtime transport 中分离出来，建立
SQLite-owned event ledger、persisted-first delivery seam、以及 command-summary-
first 的 operator observability。
**Verified:** 2026-05-23T15:28:28Z
**Status:** passed
**Re-verification:** Yes — closure re-check after subscriber + labs timeline wiring

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | command 成功后会产生 typed platform event，并在失败时只落一条 generic failure event。 | ✓ VERIFIED | `src/features/platform-core/commands/handlers/plugins.ts` 显式发出 outcome/domain events；`src/features/platform-core/commands/handlers/plugins.events.test.ts` 与 `src/features/platform-core/commands/bus.test.ts` 覆盖 success/failure path。 |
| 2 | 平台事件写入独立 durable SQLite event ledger，并与 command/attempt/correlation 关联。 | ✓ VERIFIED | `src/features/platform-core/events/ledger.ts:17-91` 写入 `platformEvents` 与 `platformEventDispatches`；`src/db/schema.ts` 提供独立表真相源。 |
| 3 | 平台事件可以被生产链路中的下游 consumer 消费，而不依赖 classroom runtime transport。 | ✓ VERIFIED | `src/features/platform-core/events/adapters/in-process.ts` 现在在生产路径上给 `defaultPersistedPlatformEventBus` 注册真实 subscriber，并把 outcome event 摘要写入 `governanceAudits`。 |
| 4 | in-process / future Redis / WebSocket adapters 保持 delivery-only，不夺取 SQLite truth ownership。 | ✓ VERIFIED | `src/features/platform-core/events/bus.ts:43-52` 与 `src/features/platform-core/events/adapters/future-bridges.ts` 都把 `sqlite-platform-event-ledger` 固定为 source of truth。 |
| 5 | command/event 共享 correlation、causation 与 summary-only audit continuity。 | ✓ VERIFIED | `events/ledger.ts:38-51` 持久化 correlation + audit summary；`events/bus.ts:87-97` replay 时恢复 audit；`observability/dto.ts` 将其投影到 operator DTO。 |
| 6 | command handlers 返回 invalidation intent，operator surface 保持 command-summary-first。 | ✓ VERIFIED | `events/ledger.ts:74-78` 把 invalidation/failure attribution 回写 command summary；`operator-read-model.ts:20-95` 以 command summary + timeline drill-down 暴露读取边界。 |
| 7 | operator surface 可以完整看到 command/event execution summary 与 delivery detail。 | ✓ VERIFIED | `/settings/labs` timeline 现在同时显示 `dispatch.status`、`dispatch.adapterId`、`dispatch.failureReason` 等 delivery detail。 |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/platform-core/events/contracts.ts` | typed platform event envelopes | ✓ VERIFIED | outcome/domain event contracts 已存在并有 focused tests。 |
| `src/features/platform-core/events/ledger.ts` | durable event ledger + dispatch rows | ✓ VERIFIED | append/load/mark helpers 已成立。 |
| `src/features/platform-core/commands/handlers/plugins.ts` | handler-owned emission semantics | ✓ VERIFIED | success/domain/failure emission 由 handlers 显式控制。 |
| `src/features/platform-core/commands/bus.ts` | persist-then-notify bus flow | ✓ VERIFIED | command summary -> event append -> dispatch allocation -> optional publishPersisted batch 已接线。 |
| `src/features/platform-core/events/subscribers.ts` | subscriber registry and selector helpers | ✓ VERIFIED | typed registry seam 已存在。 |
| `src/features/platform-core/events/bus.ts` | persisted-event publication seam | ✓ VERIFIED | persisted-first bus 现在有真实生产 subscriber 消费链路。 |
| `src/features/platform-core/observability/operator-read-model.ts` | server-only summary/timeline read model | ✓ VERIFIED | command summary + ordered timeline DTO read model 已存在。 |
| `src/components/surfaces/settings-surface.tsx` | minimal operator execution surface | ✓ VERIFIED | command summary、timeline、dispatch delivery/failure detail 都已渲染。 |
| `scripts/verify-phase53-platform-events.ts` | canonical phase verifier | ✓ VERIFIED | 直连 verifier 已通过，并守住 boundary drift。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `handlers/plugins.ts` | `events/contracts.ts` | `emittedEvents` / `failureEvent` | ✓ WIRED | handler 拥有 event 语义，不由 bus 推断 domain event。 |
| `commands/bus.ts` | `events/ledger.ts` | `appendPlatformEvents(...)` | ✓ WIRED | command 结果先写 command summary，再写 event truth。 |
| `commands/producers/plugin-governance.ts` | `events/adapters/in-process.ts` | `publicationPort` | ✓ WIRED | canonical producer 会把 persisted batch ids 交给 event bus adapter。 |
| `events/bus.ts` | `events/subscribers.ts` | `registry.select()` / `registerSubscriber()` | ✓ WIRED | `adapters/in-process.ts` 已在生产路径注册默认 subscriber。 |
| `operator-read-model.ts` | `observability/dto.ts` | summary/timeline DTO projection | ✓ WIRED | DTO 已包含 audit 与 dispatch detail。 |
| `settings-surface.tsx` | `operator-read-model.ts` | `/settings/labs` operator surface | ✓ WIRED | UI 已消费 read model，并显示 dispatch delivery/failure detail。 |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| `handlers/plugins.ts` | `emittedEvents[]` / `failureEvent` | command execution result | Yes | ✓ FLOWING |
| `events/ledger.ts` | event row + dispatch row | persisted command execution | Yes | ✓ FLOWING |
| `events/bus.ts` | replayed `event.audit` + `dispatches` | durable ledger rows | Yes | ✓ FLOWING |
| `operator-read-model.ts` | command summary / timeline DTO | command rows + event rows + dispatch rows | Yes | ✓ FLOWING |
| production subscriber registration | `registerSubscriber(...)` caller | non-test runtime code | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Direct phase verifier entry | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase53-platform-events.ts` | Static checks passed; 8 files / 34 tests passed | ✓ PASS |
| Persisted event bus seam | `src/features/platform-core/events/bus.test.ts` | selector filtering、delivery isolation、audit replay 均通过 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `EVNT-01` | 53-02 | command 成功后产生 typed platform event | ✓ SATISFIED | handlers + bus emission tests 通过。 |
| `EVNT-02` | 53-01, 53-02 | 事件写入 durable ledger 并带关联 metadata | ✓ SATISFIED | ledger schema + append helpers 已成立。 |
| `EVNT-03` | 53-03, 53-04 | 下游 consumer 可消费 platform events | ✓ SATISFIED | `adapters/in-process.ts` 已注册真实生产 subscriber，canonical producer 也已接到默认 adapter。 |
| `EVNT-04` | 53-03 | 可桥接到 in-process/Redis/WebSocket adapters，且不改变 truth ownership | ✓ SATISFIED | ownership posture 明确且已测试。 |
| `EVNT-05` | 53-01, 53-02, 53-03 | command/event/task/audit 共享 correlation metadata | ✓ SATISFIED | correlation/causation/audit summary 已贯通 durable truth 与 operator DTO。 |
| `EVNT-06` | 53-01, 53-04 | invalidation intent 由 command summary 暴露 | ✓ SATISFIED | command rows 持续承载 invalidation intent；operator summary 已显示。 |
| `EVNT-07` | 53-04 | operator surface 可查看 execution summary 与 failure attribution | ✓ SATISFIED | labs operator surface 已显示 dispatch delivery / failure attribution detail。 |

### Anti-Patterns Found

无当前 phase-local anti-pattern blocker。SQLite truth ownership、persisted-first
delivery seam、生产 subscriber adoption、以及 operator delivery attribution 都已
经接通。

### Human Verification Required

无当前 human-only blocker。

### Gaps Summary

本次 re-verification 已关闭上一版 Phase 53 的两个缺口：

1. persisted-event bus 现在已有真实生产 subscriber；
2. `/settings/labs` operator timeline 现在已显示 dispatch delivery / failure
   attribution detail。

因此，Phase 53 的 phase goal 现已达成，状态更新为 `passed`。

补充说明：与 package script 等价的直连 verifier 已再次通过；当前 shell 下
`pnpm verify:phase53` wrapper 仍可能先触发环境级依赖修复，并卡在与本 phase
逻辑无关的 `sharp/node-gyp` 问题，这不再视为 Phase 53 blocker。

---

_Verified: 2026-05-23T15:28:28Z_
_Verifier: the agent (gsd-verifier)_
