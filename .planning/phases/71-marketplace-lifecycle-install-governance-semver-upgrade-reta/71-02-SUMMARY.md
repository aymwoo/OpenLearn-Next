---
phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta
plan: "02"
subsystem: marketplace-lifecycle
tags: [marketplace, install, recover, command-bus, external-plugin]
requires:
  - phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta
    provides: verifier seed and marketplace lifecycle fixtures
provides:
  - checked-in external marketplace catalog with quiz external versions
  - install preflight and retained recovery truth in DAL
  - governed install/recover command and server action contract
affects: [71-03, 71-04, marketplace-lifecycle]
tech-stack:
  added: []
  patterns: [checked-in external catalog, preflight-first marketplace install, retained recovery with new plugin identity]
key-files:
  created:
    - src/lib/plugins/external-catalog.ts
  modified:
    - src/lib/dal/plugins.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/handlers/plugins.ts
    - src/features/platform-core/commands/handlers/plugins.test.ts
    - src/actions/plugin-actions.ts
    - src/lib/dal/plugins.test.ts
    - src/actions/plugin-actions.test.ts
key-decisions:
  - "external marketplace 保持 checked-in catalog 模式，先打通治理生命周期，不引入远程 store 服务。"
  - "recover-install 必须创建新 pluginId 并接管真实 owned rows，禁止 silent reuse retained registration。"
patterns-established:
  - "install/recover 统一走 Server Action -> plugin.install command -> handler -> DAL"
  - "named reject reason 直接透传到 action DTO，供后续同页 UI 内联渲染"
requirements-completed: [MKT-01, MKT-04]
duration: 0h
completed: 2026-06-05
---

# Phase 71: Wave 02 Summary

**External marketplace 的 install / recover 后端治理链路已经打通。**

## Performance

- **Duration:** 0h
- **Started:** 2026-06-05T00:00:00Z
- **Completed:** 2026-06-05T00:00:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 新增 checked-in external catalog，提供 quiz external `1.0.0` / `1.1.0` 版本清单。
- DAL 增加 install preflight 与 retained recovery takeover，返回具名 reject reason。
- command handler 与 server actions 继续复用既有 governed command chain，没有在 action 层绕开治理边界。

## Task Commits

Each task was completed in the working tree:

1. **Task 1: external install preflight 与 recover-install 真相层** - `uncommitted` (feat)
2. **Task 2: install/recover server action contract 与 cache invalidation** - `uncommitted` (feat)

**Plan metadata:** `uncommitted` (docs)

## Files Created/Modified
- `src/lib/plugins/external-catalog.ts` - checked-in external marketplace catalog 与 version inventory。
- `src/lib/dal/plugins.ts` - install preflight、retained recovery、新 pluginId takeover。
- `src/features/platform-core/commands/contracts.ts` - install/recover 受治理 command contract。
- `src/features/platform-core/commands/handlers/plugins.ts` - install/recover handler wiring。
- `src/actions/plugin-actions.ts` - marketplace preflight/install/recover server actions。

## Decisions Made
- install preflight 先做 manifest、data model、pluginKey、dbNamespace 校验，再允许写 registration。
- recover path 成功返回 takeover posture 字段，供 registry / UI 诚实表达“恢复并接管旧数据”。

## Deviations from Plan

None.

## Issues Encountered
- 当前工作树包含大量并行开发中的未提交改动，本 wave 以计划验收测试与 key-link 校验作为完成依据。

## User Setup Required

None.

## Next Phase Readiness
- Wave 03 可以直接复用 `plugin.upgrade.preflight` / `plugin.upgrade` contract seam 扩展 destructive lifecycle。
- Wave 04 已可消费 install/recover DTO 与 reject reasons 构建同页 marketplace surface。

---
*Phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta*
*Completed: 2026-06-05*
