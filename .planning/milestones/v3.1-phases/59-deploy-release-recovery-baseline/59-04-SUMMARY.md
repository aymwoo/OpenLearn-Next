---
phase: 59-deploy-release-recovery-baseline
plan: "04"
subsystem: infra
tags: [deploy, rollback, systemd, release-manifest, runbook]
requires:
  - phase: 59-01
    provides: env schema and deploy environment contract
  - phase: 59-02
    provides: canonical health ready and release pointer surfaces
  - phase: 59-03
    provides: verify:phase59 release artifact gate
provides:
  - single-node deploy script with immutable release manifest and previous-green rollback handoff
  - rollback script bound to canonical current/green manifest pointers
  - systemd web and worker units for pnpm start and pnpm worker:start
  - rollout and rollback checklists mapped to failure recovery triggers and OPS-01 correlation fields
affects: [phase-59-05, phase-60, release-operations, pilot-recovery]
tech-stack:
  added: []
  patterns: [immutable release manifest pointers, failure-triggered previous-green rollback, systemd dual-process host baseline]
key-files:
  created: [ops/deploy/deploy.sh, ops/deploy/rollback.sh, ops/systemd/openlearn-web.service, ops/systemd/openlearn-worker.service, ops/releases/checklists/rollout.md, ops/releases/checklists/rollback.md]
  modified: [src/lib/ops/release-status.ts, src/lib/ops/release-status.test.ts]
key-decisions:
  - "deploy manifest stores both migration and gates status plus OPS-01 correlation metadata as the canonical release truth"
  - "deploy failure path immediately hands off to rollback.sh against the previous green release instead of leaving the failed release live"
  - "dry-run deploy and rollback paths stay side-effect free while preserving the exact gate order and pointer semantics"
patterns-established:
  - "Canonical release pointer pattern: deploy updates current.json and green.json only after post-restart health and ready succeed"
  - "Rollback contract pattern: rollback reads releaseDir/gitSha from green pointer or explicit manifest before restarting systemd units"
requirements-completed: [ENVR-03, OPS-01]
duration: 2 min
completed: 2026-05-26
---

# Phase 59 Plan 04: Deploy, Release & Recovery Baseline Summary

**Single-node deploy and rollback shell artifacts with immutable release manifests, canonical current/green pointers, systemd dual-process units, and operator-facing rollout/rollback runbooks**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-26T19:24:48+08:00
- **Completed:** 2026-05-26T11:27:20Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 交付 `ops/deploy/deploy.sh`，固定 lint/typecheck/test/build/migrate/verifier/systemd/health/ready gate 顺序，并写 immutable release manifest。
- 交付 `ops/deploy/rollback.sh`，绑定 previous green manifest / `green.json`，执行 post-rollback health/ready 校验并回写 canonical pointer。
- 交付 web/worker systemd units 与 rollout/rollback checklists，把 Phase 55 recovery matrix trigger、`current.json` / `green.json`、operator correlation 字段和 post verification 全部固化为仓库 artifact。

## Task Commits

Each task was committed atomically:

1. **Task 1: 实现 deploy/rollback scripts 与 release manifest 写入** - `15e2696` (feat)
2. **Task 1: 实现 deploy/rollback scripts 与 release manifest 写入（hardening）** - `9991de6` (fix)
3. **Task 2: 提供 systemd units 与 rollout/rollback checklists** - `9a75f2a` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `ops/deploy/deploy.sh` - 单机发布脚本，负责 release tree、gate 执行、manifest 写入、pointer 刷新与 failure-triggered rollback。
- `ops/deploy/rollback.sh` - previous green rollback 脚本，负责解析 manifest、重指 current root、重启 systemd unit 与 post-rollback probe。
- `ops/systemd/openlearn-web.service` - web 长驻进程 unit，执行 `pnpm start`。
- `ops/systemd/openlearn-worker.service` - worker 长驻进程 unit，执行 `pnpm worker:start`。
- `ops/releases/checklists/rollout.md` - rollout block trigger、pointer、post-deploy verification 与 OPS-01 correlation 字段清单。
- `ops/releases/checklists/rollback.md` - rollback trigger、previous green binding、post-rollback verification 与 escalation 清单。
- `src/lib/ops/release-status.ts` - 放宽 manifest `operatorCorrelation` 解析，支持 id/href/hrefTemplate object metadata。
- `src/lib/ops/release-status.test.ts` - 覆盖 object-shaped correlation metadata 读取场景。

## Decisions Made
- Manifest 中同时写 `migration` / `migrations`、`gates`、`systemdUnits`、`restoreDrill` 与 object-shaped `operatorCorrelation`，让 `/api/release` 与 operator drill-down 共用同一主记录。
- deploy 只在 `systemctl daemon-reload` / `systemctl restart openlearn-web openlearn-worker` 之后且 `/api/health`、`/api/ready` 成功时才刷新 `current.json` 和 `green.json`。
- `--dry-run` 只保留真实 gate 顺序与日志，不落 manifest、不改 symlink、不写 pointer，避免 rehearsal 污染 canonical truth。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修正 deploy gate 顺序与 dry-run side effects**
- **Found during:** Task 1 (实现 deploy/rollback scripts 与 release manifest 写入)
- **Issue:** 初版脚本把 `/api/health`、`/api/ready` 放在 systemd restart 之前，且 dry-run 会错误写 manifest/pointer，违背计划中的 post-restart gate 和 dry-run 语义。
- **Fix:** 调整为先切 current root、daemon-reload、restart web/worker，再执行 health/ready；同时让 dry-run 跳过 manifest 与 pointer 写入。
- **Files modified:** `ops/deploy/deploy.sh`
- **Verification:** 重新运行 `bash ops/deploy/deploy.sh --dry-run ...`，日志顺序与 side-effect 行为符合预期。
- **Committed in:** `9991de6`

**2. [Rule 3 - Blocking] 修正 failure-triggered rollback 的 manifest env 初始化**
- **Found during:** Task 1 (实现 deploy/rollback scripts 与 release manifest 写入)
- **Issue:** gate 失败时 `trigger_failure_rollback` 先写 manifest，但相关环境变量尚未 export，真实 failure path 会先在写 manifest 时崩掉，无法继续 rollback。
- **Fix:** 抽出 `sync_manifest_env()`，在成功路径和失败路径都先同步 gate/env/actor/release metadata，再写 manifest。
- **Files modified:** `ops/deploy/deploy.sh`
- **Verification:** 重新跑 dry-run deploy/rollback 验证，并检查脚本结构中 failure path 已先执行 `sync_manifest_env`。
- **Committed in:** `9991de6`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** 两项偏差都属于 deploy/rollback correctness hardening，没有扩大范围，但避免了 failure path 与 rehearsal path 的错误行为。

## Issues Encountered
- `gitnexus impact` 在索引 stale 时先提示重建索引；已按 AGENTS 约束先执行 `npx gitnexus analyze` 再做 helper blast radius 检查。
- 计划要求的 dry-run 验证无法真实访问本地 3300 探针，因此采用脚本内置 dry-run 分支校验 gate 顺序和 command wiring，同时保留实际 `curl /api/health` 与 `curl /api/ready` 命令路径供真实主机执行。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `current.json` / `green.json`、systemd unit、rollout/rollback checklist 已成为正式 release baseline，Phase 59-05 可直接在此基础上补 backup/restore/verify-restore。
- `verify:phase59` 所要求的 deploy/rollback/systemd/checklist artifacts 已落地，后续 Phase 59 close gate 只剩 backup/restore drill contract 需要补齐。

## Self-Check: PASSED

- Found `ops/deploy/deploy.sh`, `ops/deploy/rollback.sh`, `ops/systemd/openlearn-web.service`, `ops/systemd/openlearn-worker.service`, `ops/releases/checklists/rollout.md`, `ops/releases/checklists/rollback.md`
- Found commits `15e2696`, `9991de6`, and `9a75f2a`
- Re-ran `pnpm test --run src/lib/ops/release-status.test.ts src/app/api/ops-routes.test.ts scripts/verify-phase59-deploy-release.test.ts`
- Re-ran `bash ops/deploy/deploy.sh --dry-run ...` and `bash ops/deploy/rollback.sh --dry-run ...`
