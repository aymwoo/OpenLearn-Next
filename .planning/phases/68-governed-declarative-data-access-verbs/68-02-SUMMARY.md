---
phase: 68-governed-declarative-data-access-verbs
plan: 02
subsystem: api
tags: [plugin-governance, data-access, audit, zod, drizzle, kill-switch, tenant-isolation]

# Dependency graph
requires:
  - phase: 68-01
    provides: PLUGIN_DATA_ACCESS_REASONS / PluginDataAccessError named-rejection vocabulary + allowlist consumer layer
  - phase: 30/48
    provides: projectPluginGovernance lifecycle/kill-switch projection (executable flag)
provides:
  - PluginDataAccessInput 五动词判别联合输入契约（注入面类型层不可表达）
  - writePluginDataAccessAudit —— tx-aware 动词级治理审计写入器（复用 governanceAudits）
  - assertActionExecutable —— 读写动词共享的前置治理门（lifecycle/kill-switch/越校三类具名拒绝 + denial audit）
affects: [68-03 write-verbs, 68-04 read-verbs, plugin-data-access dispatch facade]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "discriminated-union verb contract: 注入面（tenant 键/自由谓词/raw 语句）在类型层不可表达 (SC1)"
    - "single governance gate前置: 复用 projectPluginGovernance.executable，不重写 lifecycle 判定"
    - "tx-aware audit reusing existing governanceAudits table (无第二审计真相源)"

key-files:
  created:
    - src/features/platform-core/plugin-data-access/contracts.ts
    - src/features/platform-core/plugin-data-access/audit.ts
    - src/features/platform-core/plugin-data-access/governance-gate.ts
    - src/features/platform-core/plugin-data-access/governance-gate.test.ts
  modified: []

key-decisions:
  - "schoolId 仅由 assertActiveTeacher session scope 派生，assertActionExecutable 签名不接受 schoolId 入参 (SC2/D-08)"
  - "审计复用既有 governanceAudits 表，action 前缀 plugin.data.<verb>，不新建审计表 (避免第二真相源, Pitfall #8)"
  - "executable=false 时按 lifecycle.killSwitchEnabled 二选一拒因: kill_switch_rejected / lifecycle_not_executable"
  - "gate 接受 verb 入参以便 denial audit 记录被拒动词（plan 示例签名的合理扩展）"

patterns-established:
  - "Pattern 1: 治理门在 actor 本校范围内迭代定位插件，插件不可见即视作 non_school_actor_rejected（不暴露内部边界）"
  - "Pattern 2: audit 写入器只落库不裁决 decision，写动词 allowed+denied / 读动词仅 denied 由调用方控制 (D-04)"

requirements-completed: [ACCESS-02]

# Metrics
duration: 6min
completed: 2026-06-02
---

# Phase 68 Plan 02: Governance Gate & Verb-Level Audit Summary

**读写动词共享的前置治理门 + tx-aware 动词级审计就位：lifecycle/kill-switch/越校在数据触达前被具名拒绝并写 governance audit，schoolId 仅由 session 推导，审计复用既有单一表。**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-02T13:34:28Z
- **Completed:** 2026-06-02T13:40:00Z
- **Tasks:** 3 completed
- **Files modified:** 4 created

## Accomplishments
- `assertActionExecutable` 前置治理门复用 `projectPluginGovernance.executable`，三类拒绝路径（kill-switch / lifecycle / 非本校 actor）各带具名 reasonCode + denial governance audit。
- `PluginDataAccessInput` 五动词判别联合，把租户键 / 自由谓词 / raw 语句注入面在类型层做成不可表达（SC1）。
- `writePluginDataAccessAudit` tx-aware，复用既有 `governanceAudits` 表落库，写动词可与变更原子提交（D-04），全仓无新增审计表。

## Task Commits

Each task was committed atomically:

1. **Task 1: contracts.ts 动词判别联合输入 + 拒因类型** - `9031b58` (feat)
2. **Task 2: audit.ts writePluginDataAccessAudit tx-aware 审计** - `85a9388` (feat)
3. **Task 3: governance-gate.ts assertActionExecutable 前置治理门** - `1f98234` (test, RED) → `1536319` (feat, GREEN)

## Verification

- `pnpm vitest run src/features/platform-core/plugin-data-access` → **34 passed (2 files)**（allowlist 28 + governance-gate 6）
- `pnpm tsc --noEmit` → 三个新文件零类型错误
- 三类拒绝路径各有测试 + denial audit 断言；actor 身份缺失/不匹配 → `non_school_actor_rejected`（不泄露内部 `PLUGIN_ACTOR_REQUIRED`/`TEACHER_AUTH_REQUIRED`）
- 无新增审计表/迁移（`grep CREATE TABLE.*data_access_audit drizzle/` 无命中）

## Deviations from Plan

None - 计划按原样执行。任务 2（audit.ts，标记 tdd）按计划显式约定将行为断言并入任务 3 共建的 `governance-gate.test.ts`，本任务仅作 tsc 编译校验，故无独立 audit 测试文件。

## TDD Gate Compliance

- Task 3 严格 RED → GREEN：`test(68-02)` 失败测试（`1f98234`）先于 `feat(68-02)` 实现（`1536319`）。
- Task 2（audit.ts）的行为断言由 Task 3 的共建测试覆盖（denial 写入 `governanceAudits`、`action` 前缀 `plugin.data.`、tx-aware），符合计划显式约定。

## Known Stubs

None — 全部交付物为可执行治理/审计基座，无空值占位或未接线数据源。

## Self-Check: PASSED
