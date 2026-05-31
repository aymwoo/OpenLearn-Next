---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "03"
subsystem: ui
tags: [action-registry, plugin-lifecycle, governance, verifier, vitest]
requires:
  - phase: 52-01
    provides: typed action descriptor contracts and static catalog source
  - phase: 52-02
    provides: external lifecycle governance projection and retain/cleanup semantics
provides:
  - executable action catalog and blocked diagnostics registry wiring
  - operator governance surface with catalog and diagnostics dual views
  - phase 52 verifier script and package entrypoint
affects: [phase-53-event-bus, phase-54-ai-contracts, plugin-governance, operator-ui]
tech-stack:
  added: []
  patterns: [registry read model, operator-only blocked diagnostics, retain-first uninstall confirmation]
key-files:
  created:
    - scripts/verify-phase52-action-registry-and-lifecycle.ts
    - src/features/platform-core/actions/registry.ts
  modified:
    - src/actions/plugin-actions.ts
    - src/actions/plugin-actions.test.ts
    - src/features/runtime-platform/host-actions/plugin-host.ts
    - src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts
    - src/features/runtime-platform/host-actions/plugin-host.test.ts
    - src/features/runtime-platform/host-actions/runtime-host.ts
    - src/features/platform-core/actions/contracts.ts
    - src/features/platform-core/actions/static-catalog.test.ts
    - src/features/platform-core/plugins/governance-projection.test.ts
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
    - package.json
key-decisions:
  - "普通调用面只读取 executable catalog；blocked rows 只从 operator diagnostics 入口读取。"
  - "governance lifecycle 对外固定为 installed/enabled/active/suspended/uninstalled 五态，mounted/ready/failed 只留在诊断文案。"
  - "uninstall 默认 retain，cleanup 必须先 preflight 再显式确认。"
patterns-established:
  - "Registry read model: 通过 registry.ts 汇总 static descriptor 与 governance projection，再分发给 server action / host / UI。"
  - "Governance operator UX: 默认首屏展示 runnable catalog，阻断原因放入次级 diagnostics 视图。"
  - "Phase verifier: 采用 static guard + focused vitest 组合，而不是脆弱全文本匹配。"
requirements-completed: [ACTN-03, ACTN-04, LIFE-01, LIFE-02, LIFE-03, LIFE-04, LIFE-05, LIFE-06]
duration: 31min
completed: 2026-05-21
---

# Phase 52 Plan 03: Action registry wiring summary

**统一 action registry read model、operator 双视图治理界面与 `verify:phase52`
回归闸门，把插件生命周期治理真正接到 host、server action 与 UI。**

## Performance

- **Duration:** 31 min
- **Started:** 2026-05-21T15:13:24Z
- **Completed:** 2026-05-21T15:45:25Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- 把 executable catalog、blocked diagnostics、plugin lifecycle read model
  统一收敛到 `src/features/platform-core/actions/registry.ts`。
- 把 operator surface 升级为“可执行 actions / 查看治理诊断”双视图，
  并落实 retain-first uninstall contract。
- 新增 `verify:phase52`，用静态 guard + focused suites 锁定 phase 52
  的治理语义。

## Task Commits

Each task was committed atomically:

1. **Task 1: 接入统一 registry read model 到 server action 与 host
   governance adapter** - `e476a7a` (test), `2e4d9fb` (feat)
2. **Task 2: 将 operator surface 升级为 catalog + governance diagnostics
   双视图** - `5107590` (feat)
3. **Task 3: 新增 Phase 52 verifier，锁定 registry、lifecycle 与 UI 语义**
   - `259bd2a` (feat)

**Plan metadata:** pending

## Files created/modified

- `src/features/platform-core/actions/registry.ts` - 统一 executable catalog、
  blocked diagnostics 与 plugin lifecycle read model。
- `src/actions/plugin-actions.ts` - server actions 改为消费 registry read API，
  卸载支持 retain / cleanup。
- `src/features/runtime-platform/host-actions/plugin-host.ts` - host 读取统一
  lifecycle envelope，并把 write gating 与 read-lifecycle 分离。
- `src/features/runtime-platform/host-actions/runtime-host.ts` - internal /
  external lifecycle 映射分离。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 新的
  operator 双视图、显式 diagnostics 与 cleanup 确认流程。
- `scripts/verify-phase52-action-registry-and-lifecycle.ts` - phase 52
  verifier。
- `package.json` - 暴露 `verify:phase52`。

## Decisions made

- 用 `registry.ts` 作为唯一 read-model 汇聚点，避免 host、server action、UI
  各自拼装治理语义。
- blocked diagnostics 不回流到普通 catalog，满足最小暴露与 operator-only
  诊断边界。
- cleanup 不是默认破坏性分支；默认 retain，只有显式 opt-in + confirm
  才会进入 cleanup。

## Deviations from plan

### Auto-fixed issues

**1. [Rule 1 - Bug] 修复 cleanup 确认 checkbox 在 dialog 中读取失效事件对象**
- **Found during:** Task 2（operator surface 测试）
- **Issue:** `onChange` 在 state updater 中直接读取
  `event.currentTarget.checked`，导致 React 事件在重渲染后变成 `null`。
- **Fix:** 先提取 `checked` 常量，再写入 `cleanupConfirmed` state。
- **Files modified:** `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`
- **Verification:** `pnpm exec vitest run
  src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- **Committed in:** `5107590`

**2. [Rule 3 - Blocking] 修复 phase 52 contract 测试仍使用旧 blocked
diagnostic shape**
- **Found during:** Task 3（phase verifier）
- **Issue:** `static-catalog.test.ts` 仍按旧 schema 构造 blocked diagnostic
  DTO，缺少必需的 `lifecycleState`，导致 verifier 失败。
- **Fix:** 更新测试样例，对齐新的 blocked diagnostic contract。
- **Files modified:** `src/features/platform-core/actions/static-catalog.test.ts`
- **Verification:** `pnpm tsx
  scripts/verify-phase52-action-registry-and-lifecycle.ts` 与
  `pnpm run verify:phase52`
- **Committed in:** `259bd2a`

---

**Total deviations:** 2 auto-fixed（1 bug, 1 blocking）
**Impact on plan:** 两处修复都直接服务于 phase 52 correctness 与 verifier
闭环，没有引入额外 scope。

## Issues encountered

- UI 测试最初仍按旧卸载默认语义断言“首次确认不触发卸载”；实际 contract
  已改为首次走 `retain`，因此测试同步重写为 retain / cleanup 两段验证。

## Known stubs

None.

## Threat flags

None.

## User setup required

None - no external service configuration required.

## Next phase readiness

- Phase 53 可以直接复用 `verify:phase52` 作为回归前置检查。
- host、server action 与 operator surface 已共享同一治理 vocabulary，后续
  event bus / observability 扩展可以基于统一 contract 继续演进。

## Self-check: PASSED

- FOUND: `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-03-SUMMARY.md`
- FOUND: `e476a7a`
- FOUND: `2e4d9fb`
- FOUND: `5107590`
- FOUND: `259bd2a`
