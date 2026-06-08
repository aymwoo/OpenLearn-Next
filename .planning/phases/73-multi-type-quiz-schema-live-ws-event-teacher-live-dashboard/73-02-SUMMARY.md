---
phase: 73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard
plan: 02
subsystem: ui
tags: [websocket, classroom, quiz, dashboard, zustand]

# Dependency graph
requires:
  - phase: 73-01
    provides: multi-type quiz submit path and append-only answer truth
provides:
  - quiz.answer.received transport bridge from durable submit path
  - teacher-only classroom websocket filtering for live answers
  - /classroom live-answer sibling tab with read-only dashboard
affects: [74-close-gate, classroom transport, quiz runtime]

# Tech tracking
tech-stack:
  added: [zustand]
  patterns: [command-bus-to-transport bridge, teacher-only websocket filtering, read-only live aggregation]

key-files:
  created:
    - src/features/platform-core/commands/handlers/quiz-answer-received.ts
    - src/features/platform-core/commands/producers/quiz-answer-received.ts
    - src/components/classroom/live-answer-dashboard-store.ts
    - src/components/classroom/live-answer-dashboard-surface.tsx
    - src/components/ui/tabs.tsx
    - scripts/verify-live-answer-zero-write.ts
  modified:
    - src/lib/dal/classroom.ts
    - src/features/runtime-platform/seams/transport/ws-envelope.ts
    - src/features/runtime-platform/seams/transport/ws-auth.ts
    - src/features/runtime-platform/seams/transport/ws-connection-registry.ts
    - src/features/runtime-platform/seams/transport/ws-adapter.ts
    - src/components/classroom/classroom-control-panel.tsx
    - src/app/(classroom)/classroom/page.tsx

key-decisions:
  - "Kept quiz live answers on the existing classroom-runtime transport path and mapped them to a dedicated websocket server kind instead of introducing a new endpoint."
  - "Applied teacher-only filtering in the websocket connection registry so both local and Redis fanout paths enforce the same delivery boundary."
  - "Implemented the live dashboard as a read-only sibling tab inside the existing ClassroomControlPanel and used URL tab state instead of a new route."

patterns-established:
  - "Pattern 1: persisted classroom answer -> lightweight platform command producer -> transport publish bridge"
  - "Pattern 2: live classroom read models aggregate on the client with Zustand and never import write actions"

requirements-completed: [QUIZ-EXT-02-A, QUIZ-EXT-02-B, QUIZ-EXT-02-C, QUIZ-EXT-02-D, QUIZ-EXT-02-E]

# Metrics
duration: 33min
completed: 2026-06-08
---

# Phase 73: Multi-Type Quiz Schema, Live WS Event & Teacher Live Dashboard Summary

**Teacher-only live quiz answer streaming now rides the existing classroom websocket transport and renders as a read-only dashboard tab inside `/classroom`.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-06-08T10:01:00+08:00
- **Completed:** 2026-06-08T10:34:30+08:00
- **Tasks:** 5
- **Files modified:** 29

## Accomplishments
- Added `quiz.answer.received` websocket envelope support, command-bus transport bridge, and Redis/runtime fanout routing.
- Enforced teacher-only live answer delivery while keeping existing classroom websocket auth invariants intact.
- Added a `/classroom` live-answer sibling tab with a read-only Zustand store, recent-answer stream, per-question aggregation, and zero-write guard.

## Task Commits

Each task was committed atomically:

1. **Task 1: ws-envelope.ts 新增 `quiz.answer.received` 事件 kind + payload schema** - `ee56b47` (feat)
2. **Task 2: ws-server.ts teacher-only 通道路由 + ws-auth.ts 鉴权保留 v2.2 invariant** - `526c186` (feat)
3. **Task 3: 可选 Redis fanout + contract test 覆盖 REDIS_URL env 切换** - `4531a13` (feat)
4. **Task 4: /classroom 控制室「作答实时」sibling tab + 访问控制** - `24109e1` (feat)
5. **Task 5: 实时仪表盘 Zustand store + RSC 客户端聚合 + 零写姿势守卫** - `5134b9b` (feat)

## Files Created/Modified
- `src/features/platform-core/commands/handlers/quiz-answer-received.ts` - Bridges durable quiz answer commands into the transport layer.
- `src/features/platform-core/commands/producers/quiz-answer-received.ts` - Produces system-scoped platform commands from the quiz submit path.
- `src/lib/dal/classroom.ts` - Publishes `quiz.answer.received` after append-only answer persistence.
- `src/features/runtime-platform/seams/transport/ws-envelope.ts` - Adds dedicated websocket server envelope support for quiz answer events.
- `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` - Filters quiz live events to teacher sockets only.
- `src/components/classroom/live-answer-dashboard-store.ts` - Aggregates latest answers per student/question and recent streams in Zustand.
- `src/components/classroom/live-answer-dashboard-surface.tsx` - Renders the read-only live answer dashboard surface.
- `src/components/classroom/classroom-control-panel.tsx` - Hosts the new `作答实时` sibling tab.
- `src/app/(classroom)/classroom/page.tsx` - Persists tab state via `?tab=live-answer` and rejects unknown session IDs.
- `scripts/verify-live-answer-zero-write.ts` - Enforces the no-write posture for the live dashboard surface.

## Decisions Made
- Kept the new live answer signal inside the existing `classroom-runtime` transport channel to minimize transport churn.
- Treated `quiz.answer.received` as a dedicated platform command rather than embedding transport side effects directly in the server action.
- Implemented tabs with a small local UI primitive instead of introducing another large UI dependency beyond the required Zustand store.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aligned plan file paths with the actual `/classroom` route layout**
- **Found during:** Task 4 (dashboard tab integration)
- **Issue:** The plan referenced `src/app/(teacher)/classroom/*`, but the repo's live classroom route is `src/app/(classroom)/classroom/*`.
- **Fix:** Integrated the live tab into the real route and control-surface files already used by the app.
- **Files modified:** `src/app/(classroom)/classroom/page.tsx`, `src/components/surfaces/classroom-console-surface.tsx`, `src/components/classroom/classroom-control-panel.tsx`
- **Verification:** `src/app/(classroom)/classroom/page.test.tsx`, `tests/classroom/dashboard.test.ts`
- **Committed in:** `24109e1`

**2. [Rule 3 - Blocking] Added missing platform AI metadata for command catalog consistency**
- **Found during:** Task 3 (command-bus bridge wiring)
- **Issue:** Extending the platform command catalog surfaced pre-existing missing metadata entries in `src/features/platform-core/ai-contracts/registry.ts`.
- **Fix:** Added the new `quiz.answer.received` descriptor and filled the missing plugin upgrade metadata entries so the command registry stays internally consistent.
- **Files modified:** `src/features/platform-core/ai-contracts/registry.ts`
- **Verification:** targeted test suite remained green after metadata extension
- **Committed in:** `4531a13`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to land the planned behavior on the real route and keep the command catalog coherent. No scope expansion beyond the transport/dashboard objective.

## Issues Encountered
- The phase plan referenced route files that do not exist in this repo; the real `/classroom` implementation lives under `src/app/(classroom)/classroom/*`.
- Full-repo `pnpm typecheck` is still blocked by pre-existing unrelated errors, plus old phase verification fixtures that still expect the pre-Phase-73 quiz submit signature. Those repo-wide issues were not expanded beyond the one direct caller updated in `scripts/verify-phase69-quiz-sample.ts`.

## User Setup Required

None - no external service configuration required.

## Validation

- `pnpm vitest run src/features/runtime-platform/seams/transport/ws-envelope.test.ts src/features/runtime-platform/seams/transport/ws-auth.test.ts src/features/runtime-platform/seams/transport/ws-adapter.test.ts src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts src/actions/classroom-actions.test.ts src/lib/dal/classroom.test.ts "src/app/(classroom)/classroom/page.test.tsx" src/components/classroom/live-answer-dashboard-store.test.ts src/components/classroom/live-answer-dashboard-surface.test.tsx src/components/classroom/classroom-control-panel.test.tsx tests/classroom/ws-events.test.ts tests/classroom/fanout.test.ts tests/classroom/dashboard.test.ts tests/classroom/live-view.test.ts` -> passed (150 tests)
- `pnpm test:live-answer-zero-write` -> passed
- `pnpm typecheck` -> still fails due to existing unrelated repo-wide issues outside this plan's direct scope, plus old fixtures not yet migrated everywhere to the multi-type quiz input contract

## Impact Analysis

- `buildClassroomWebSocketServerEnvelope` -> 9 affected symbols across websocket adapter/server paths; risk remained medium because changes stayed additive and were covered by targeted transport tests.
- `authenticateClassroomWebSocket` -> 4 affected symbols; risk remained medium because the handshake contract was preserved and only a helper was extracted.
- `handleClassroomWebSocketClientMessage` -> 4 affected symbols; risk remained medium because inbound teacher/student behavior was left intact and teacher-only filtering was enforced on outbound delivery.
- `submitQuizSampleAnswer` -> 7 affected symbols; risk remained medium because the durable write path now publishes a post-write command and one direct verification script caller required signature alignment.
- `ClassroomControlPanel` -> 5 affected symbols; risk remained medium because the new dashboard is a sibling tab inside the existing surface and does not alter the canonical control actions.

## Next Phase Readiness

- Phase 74 can now build its close gate on top of a real live-answer transport path, a read-only dashboard surface, and an executable zero-write guard.
- Remaining caution: repository-wide `typecheck` is still noisy due to unrelated existing errors, so Phase 74 verification should continue to rely on targeted phase commands until those debts are cleaned up.

## Self-Check: PASSED

---
*Phase: 73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard*
*Completed: 2026-06-08*
