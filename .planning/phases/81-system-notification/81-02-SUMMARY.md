---
phase: 81-system-notification
plan: 02
subsystem: notification
tags: [command-bus, drizzle, zod, redis, rate-limit, cursor-pagination, auth.js, api-routes]
requires:
  - phase: 81-01
    provides: pluginNotifications table, SystemNotificationSendPayloadSchema, MarkReadSchema, SystemCommandNotificationSchema
provides:
  - Complete system.notification.send Command Bus handler (authorize + execute)
  - dispatchSystemCommand facade branch for system.notification.send
  - Notification DAL (insert/get/list/mark-read/mark-all-read/count)
  - Redis-based dual-layer rate limiter (plugin 60/min + user 30/hr)
  - User-facing notification API Routes (GET list, POST mark-read, GET unread-count)
  - Cache tag: notifications:userId
affects: [81-03 (frontend UI), plugins that emit notifications]
tech-stack:
  added: []
  patterns:
    - "TDD with vitest (RED-GREEN per task)"
    - "DAL with Zod validation from unknown input"
    - "Command Bus handler: deny helper (audit-before-throw) pattern"
    - "Cursor-based pagination via base64-encoded createdAt timestamp"
    - "Redis INCR+EXPIRE Lua script for atomic rate limiting"
    - "FAIL-OPEN pattern for rate limiter (Redis unavailable → allow + warn)"
    - "Auth.js session → userId → DAL (userId never from request params)"
key-files:
  created:
    - src/lib/dal/notification.ts — 5 DAL functions for notification CRUD
    - src/features/system-commands/rate-limiter.ts — plugin + user rate limiters
    - src/app/api/notification/list/route.ts — GET notification list
    - src/app/api/notification/mark-read/route.ts — POST mark read
    - src/app/api/notification/unread-count/route.ts — GET unread count
  modified:
    - src/features/system-commands/handler.ts — added systemNotificationHandler
    - src/features/system-commands/facade.ts — added system.notification.send branch
    - src/features/system-commands/audit.ts — added system.notification.send to union
    - src/features/platform-core/commands/registry.ts — registered system.notification.send
    - src/lib/cache-policy.ts — added notifications cache tag
key-decisions:
  - "Cursor-based pagination uses createdAt timestamp (not id) per plan spec"
  - "Rate limiter uses FAIL-OPEN pattern (Redis unavailable → allow + warn)"
  - "MarkReadSchema is discriminated union: {markAll:true} | {markAll:false, notificationId}"
  - "API Routes userId derived from auth() session only (not query params or body)"
  - "DAL functions accept unknown input and validate with Zod schemas internally"
  - "CreatedAt/readAt are Drizzle mode: timestamp_ms (Date objects in TypeScript, integers in DB)"
  - "Cherry-picked 81-01 commits (28cf4a1, 5d4976b) for schema.ts + contracts.ts dependencies"
patterns-established:
  - "system.notification.send handler mirrors system.file.delete handler pattern (manifest resolver → authorize → execute)"
  - "denySystemNotification mirrors denySystemFile pattern (audit-before-throw PlattformCommandExecutionError)"
  - "API Routes follow system file routes pattern (auth() + DAL direct call)"
  - "Rate limiter Lua script follows standard Redis INCR+EXPIRE atomic pattern"
requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, SYS-06]
duration: 21min
completed: 2026-06-13
---

# Phase 81 Plan 02: Notification Backend Summary

**system.notification.send Command Bus handler (5-step authorize: manifest allowlist → membership → double rate limit → execute) + cursor-paginated user API Routes (list/mark-read/unread-count)**

## Performance

- **Duration:** 21 min
- **Started:** 2026-06-13T12:09:00Z
- **Completed:** 2026-06-13T12:30:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Command Bus writer path: system.notification.send flows through dispatchSystemCommand facade → Command Bus → handler.authorize (manifest notificationTypes allowlist + memberships schoolId check + dual rate limit) → handler.execute (insert + audit)
- 5 DAL functions with Zod validation: insertNotification, getNotifications (cursor-based pagination), markNotificationRead (ownership guard), markAllNotificationsRead, getUnreadCount
- Redis-based dual-layer rate limiter via atomic Lua script: plugin 60/min + user 30/hr, FAIL-OPEN on Redis unavailable
- 3 user-facing API Routes with Auth.js session: GET /api/notification/list, POST /api/notification/mark-read, GET /api/notification/unread-count
- All denial paths write governance audit BEFORE throwing PlatformCommandExecutionError

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: DAL + 频率限制器** - `5521ae8` (test) → `b593e0c` (feat)
   - *23 tests, 5 DAL functions, 2 rate limiter functions, 1 cache tag*
   - *Cherry-pick dc0705f for pluginNotifications table (81-01 dependency)*

2. **Task 2: Handler + Facade + Registry + Audit** - `beecbc4` (test) → `7c72e9c` (feat)
   - *8 handler tests, systemNotificationHandler, facade branch, registry registration, audit type union*
   - *Cherry-pick d9e567c for contracts.ts + dto/notification.ts (81-01 dependency)*

3. **Task 3: API Routes** - `fbaef2f` (test) → `16ff0d4` (feat)
   - *12 API route tests, 3 route handlers (list, mark-read, unread-count)*

**Plan metadata commit:** Pending (this SUMMARY.md)

## Files Created/Modified

- `src/lib/dal/notification.ts` (new) — 5 DAL functions: insert, get (cursor pagination), markRead, markAllRead, unreadCount
- `src/features/system-commands/rate-limiter.ts` (new) — Redis INCR+EXPIRE Lua script atomic rate limiters
- `src/app/api/notification/list/route.ts` (new) — GET paginated notification list
- `src/app/api/notification/mark-read/route.ts` (new) — POST mark single/all read
- `src/app/api/notification/unread-count/route.ts` (new) — GET unread count
- `src/features/system-commands/handler.ts` (modified) — +250 lines: systemNotificationHandler, deny helper, authorize/execute functions
- `src/features/system-commands/facade.ts` (modified) — +50 lines: system.notification.send branch
- `src/features/system-commands/audit.ts` (modified) — +1 line: "system.notification.send" added to union
- `src/features/platform-core/commands/registry.ts` (modified) — +10 lines: system.notification.send registration
- `src/lib/cache-policy.ts` (modified) — +1 line: notifications cache tag

## Decisions Made
- Cursor-based pagination uses createdAt timestamp (not id) for deterministic ordering across inserts
- Rate limiter uses FAIL-OPEN pattern: Redis unavailable → allow + console.warn (accept risk per T-81-07)
- MarkReadSchema is discriminated union: {markAll:true} | {markAll:false, notificationId} per 81-01 DTO
- API Routes userId derived from auth() session only (not from query params or body — per T-81-08/T-81-10)
- DAL functions accept `unknown` input and validate with Zod schemas internally (project pattern)
- Drizzle timestamp_ms mode: readAt/createdAt are Date objects in TypeScript, integers in DB
- Cherry-picked 81-01 commits (28cf4a1: schema.ts, 5d4976b: contracts.ts + dto) for worktree dependency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cherry-picked 81-01 schema and contracts changes**
- **Found during:** Task 1 (DAL creation) and Task 2 (handler creation)
- **Issue:** Worktree was reset to 882bb71 (before 81-01), missing pluginNotifications table definition and SystemNotificationSendPayloadSchema
- **Fix:** Cherry-picked 28cf4a1 (schema.ts table) and 5d4976b (contracts.ts + dto/notification.ts)
- **Files modified:** src/db/schema.ts, src/features/platform-core/commands/contracts.ts, src/lib/dto/notification.ts
- **Committed in:** dc0705f, d9e567c (cherry-picks)

**2. [Rule 1 - Bug] Fixed Drizzle timestamp_ms type mismatches**
- **Found during:** Task 1 GREEN implementation
- **Issue:** new Date() vs number for readAt/createdAt in set operations, lt() comparison expected Date not number
- **Fix:** Used new Date() for set operations, converted cutoff to new Date(cutoff) for lt comparisons, used .getTime() for comparisons
- **Files modified:** src/lib/dal/notification.ts, src/lib/dal/notification.test.ts
- **Committed in:** b593e0c (Task 1 GREEN)

**3. [Rule 1 - Bug] Fixed Zod schema mismatch in mark-read tests**
- **Found during:** Task 3 GREEN verification  
- **Issue:** Tests sent { notificationId: "xxx" } but MarkReadSchema (discriminated union) requires { markAll: false, notificationId: "xxx" }
- **Fix:** Updated tests to use correct shape: { markAll: false, notificationId: "xxx" }
- **Files modified:** src/app/api/notification/mark-read/route.test.ts
- **Committed in:** 16ff0d4 (Task 3 GREEN, combined with implementation commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for correct execution. Cherry-picks were required due to worktree isolation model. No scope creep.

## Issues Encountered
- Worktree reset to pre-81-01 base required cherry-picking 81-01 commits for dependencies (schema table, contracts types)
- vitest binary not on PATH in pnpm worktree; resolved by using direct path to vitest.mjs
- Drizzle timestamp_ms mode presents Date in TypeScript but integer in SQLite — required careful handling between set/where operations

## Next Phase Readiness
- Backend notification system is fully wired: plugins → Command Bus → handler → DB + audit trail
- User API Routes are ready for frontend integration (81-03)
- Rate limiter FAIL-OPEN ensures notification system works without Redis
- Notification cleanup job (BullMQ) deferred to 81-03 or separate plan

---
*Phase: 81-system-notification*
*Plan: 02*
*Completed: 2026-06-13*
