---
phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
plan: 04
subsystem: infra
tags: [runtime-platform, seams, sqlite, sse, event-bus, guards]
requires:
  - phase: 27-03
    provides: runtime-platform contracts root for permissions and descriptors
provides:
  - centralized runtime-platform seam contracts and default adapters
  - guarded runtime/plugin host action wrappers
  - focused regression tests for default-only seam posture and guard failures
affects: [phase-28-runtime-bridge, runtime-host, transport-boundary, plugin-governance]
tech-stack:
  added: []
  patterns: [centralized seam contracts with default adapters, guarded host action entrypoints, default-only posture regression tests]
key-files:
  created:
    - src/features/runtime-platform/seams/index.ts
    - src/features/runtime-platform/seams/database/contract.ts
    - src/features/runtime-platform/seams/database/sqlite-adapter.ts
    - src/features/runtime-platform/seams/event-bus/contract.ts
    - src/features/runtime-platform/seams/event-bus/default-adapter.ts
    - src/features/runtime-platform/seams/transport/contract.ts
    - src/features/runtime-platform/seams/transport/sse-adapter.ts
    - src/features/runtime-platform/host-actions/guards.ts
    - src/features/runtime-platform/host-actions/runtime-host.ts
    - src/features/runtime-platform/host-actions/plugin-host.ts
    - src/features/runtime-platform/seams/seams.test.ts
    - src/features/runtime-platform/host-actions/guards.test.ts
  modified:
    - .planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md
key-decisions:
  - "将 PostgreSQL、Event Bus、WebSocket 演进点统一收敛到 runtime-platform/seams，且只导出当前默认 adapter。"
  - "runtime/plugin host actions 先通过 createGuardedHostAction 强制 actor scope、school scope 和 DTO parse，再允许后续 host operation 扩展。"
patterns-established:
  - "Centralized seams: contract + default adapter 成对出现，并显式声明 truth ownership 仍在 SQLite/classroom-session write path。"
  - "Guard-first host actions: host 入口先做 schema parse 和 scope 校验，再触达 seam adapter。"
requirements-completed: [SAFE-02, ARCH-03]
duration: 15 min
completed: 2026-05-15
---

# Phase 27 Plan 04: Add infrastructure seam adapters summary

**集中建立 runtime-platform seams 与 guarded host action wrappers，保持 SQLite / in-process event bus / SSE 的 default-only posture，不提前开启任何 cutover。**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-15T14:26:51Z
- **Completed:** 2026-05-15T14:41:51Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- 建立 `runtime-platform/seams` 集中边界，分别提供 database、event-bus、transport 的 contract 与 default adapter。
- 新增 `createGuardedHostAction`，让 runtime/plugin host actions 统一经过 actor、school scope 和 DTO parse 守卫。
- 用 focused Vitest 回归锁定 default-only seam posture 与 guard 拒绝路径，避免 provider toggle 或未授权入口漂移。

## Task Commits

Each task was committed atomically:

1. **Task 1: 建立 centralized seams 与 default adapters** - `97d0b76` (feat)
2. **Task 2: 为 runtime/plugin host actions 建立 guard wrappers 并锁定 default-only 姿态** - `0f18d08` (feat)

**Plan metadata:** `pending`

## Files Created/Modified

- `src/features/runtime-platform/seams/index.ts` - 集中导出 seam contracts 与默认 adapter。
- `src/features/runtime-platform/seams/database/contract.ts` - 定义未来 PostgreSQL-ready 的数据库 seam contract。
- `src/features/runtime-platform/seams/database/sqlite-adapter.ts` - 声明当前 SQLite truth ownership 的默认 database adapter。
- `src/features/runtime-platform/seams/event-bus/contract.ts` - 定义 canonical event publish/subscribe seam contract。
- `src/features/runtime-platform/seams/event-bus/default-adapter.ts` - 提供 current in-process default event bus adapter。
- `src/features/runtime-platform/seams/transport/contract.ts` - 定义 future WebSocket-ready 的 transport seam contract。
- `src/features/runtime-platform/seams/transport/sse-adapter.ts` - 提供明确保持 SSE posture 的默认 transport adapter。
- `src/features/runtime-platform/host-actions/guards.ts` - 提供 guarded host action wrapper 工具。
- `src/features/runtime-platform/host-actions/runtime-host.ts` - 通过 guard wrapper 暴露 runtime host 入口。
- `src/features/runtime-platform/host-actions/plugin-host.ts` - 通过 guard wrapper 暴露 plugin host 入口。
- `src/features/runtime-platform/seams/seams.test.ts` - 固定 default-only seam posture 与无 toggle 姿态。
- `src/features/runtime-platform/host-actions/guards.test.ts` - 覆盖未授权 actor、缺失 school scope、DTO parse 失败三类拒绝路径。
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md` - 记录仓库既有 typecheck blocker。

## Decisions Made

- 所有 future infra seam 都以 `contract + default adapter` 成对落地，避免只留注释式占位。
- seam ownership 文案和测试都明确声明 truth ownership 仍在现有 SQLite/classroom-session write path，transport 与 event bus 只承担未来 delivery seam 角色。
- host action 入口先统一收敛到 guard wrapper，再向后扩展实际 host operations，避免后续 runtime/plugin 直接旁路现有服务端边界。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修正 guarded host action 的 Zod 泛型解析方式**
- **Found during:** Task 2 (为 runtime/plugin host actions 建立 guard wrappers 并锁定 default-only 姿态)
- **Issue:** 初版 `guards.ts` 使用统一 envelope parse 时触发 TypeScript 泛型推断错误，影响新文件自身编译。
- **Fix:** 改为分别 parse actor 与 input，保持同样的 guard 语义但移除类型阻塞。
- **Files modified:** src/features/runtime-platform/host-actions/guards.ts
- **Verification:** `./node_modules/.bin/vitest run src/features/runtime-platform/seams/seams.test.ts src/features/runtime-platform/host-actions/guards.test.ts`
- **Committed in:** `0f18d08`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅修复实现期类型阻塞；无额外 scope 扩张，且保持计划要求的 guard 行为不变。

## Issues Encountered

- `pnpm typecheck` 与直接 `./node_modules/.bin/tsc --noEmit` 都被仓库既有、与本计划无关的测试类型错误阻塞；已记录到 `deferred-items.md`，本计划改用 focused Vitest 覆盖验证新增边界。

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- Phase 28 可以在现有 seam contracts 上继续接入 runtime bridge、runtime session persistence 和 canonical event flows。
- 当前 default adapters 已把 SQLite / SSE / in-process event posture 锁死，后续实现可在不引入切换开关的前提下逐步替换内部实现。
- 全仓库 typecheck 仍受既有测试文件阻塞，若后续计划依赖 repo-wide `tsc --noEmit`，需先清理 `deferred-items.md` 记录的问题。

## Self-Check: PASSED

- Found file: `src/features/runtime-platform/seams/index.ts`
- Found file: `src/features/runtime-platform/host-actions/guards.ts`
- Found file: `src/features/runtime-platform/seams/seams.test.ts`
- Found commit: `97d0b76`
- Found commit: `0f18d08`

---
*Phase: 27-compatibility-baseline-and-v2-boundary-scaffolding*
*Completed: 2026-05-15*
