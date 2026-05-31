---
phase: 46-migration-governance-and-backfill-safety
reviewed: 2026-05-24T07:11:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - .planning/phases/46-migration-governance-and-backfill-safety/46-01-PLAN.md
  - .planning/phases/46-migration-governance-and-backfill-safety/46-01-SUMMARY.md
  - .planning/phases/46-migration-governance-and-backfill-safety/SPEC.md
  - package.json
  - src/db/schema.ts
  - src/lib/dal/plugin-migration.ts
  - src/lib/dal/plugin-migration.test.ts
  - scripts/verify-phase46-migration-governance.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 46: Code Review Report

**Reviewed:** 2026-05-24T07:11:00Z  
**Depth:** deep  
**Files Reviewed:** 8  
**Status:** clean

## Summary

本次复审基于当前 live codebase 重新检查了 Phase 46 的迁移 DAL、focused tests 与 `verify:phase46` close gate，并实际重新运行了 `pnpm exec vitest --run src/lib/dal/plugin-migration.test.ts` 与 `pnpm run verify:phase46`。

结论：上一轮 review 记录的 2 个 blocker 与 1 个 warning 均已关闭。lesson / step 迁移范围已收紧到 owner-aware authoring 边界；close gate 现在会精确校验 governed plugin data tables 的实体列、唯一索引名与索引列顺序；runtime DDL 防护也已经补上真实 install/reconcile 运行路径 proof，不再主要依赖源码字符串扫描。

## Findings

本次 deep review 未发现需要继续记录的 critical 或 warning 级问题。

## What Was Checked

| Area | Status | Evidence |
| --- | --- | --- |
| lesson / step migration no longer crosses owner boundary inside the same school | ✓ PASS | `src/lib/dal/plugin-migration.ts:113-178, 257-315, 376-472` 对 lesson / step 三阶段查询统一使用 `ownedCourseScope(scope, schoolId)`；`src/lib/dal/plugin-migration.test.ts:373-410, 456-501, 729-764` 证明同校但非 owner 的 lesson / step 不会被 backfill / cutover。 |
| Backfill remains idempotent and concurrency-safe after auth hardening | ✓ PASS | `src/lib/dal/plugin-migration.ts:145-164, 185-204, 223-241` 仍保持 `onConflictDoUpdate(...)` 原子 upsert；`src/lib/dal/plugin-migration.test.ts:344-371` 并发双写后仍只保留 1 行。 |
| Cutover still fails closed on mismatch and rolls back transactionally | ✓ PASS | `src/lib/dal/plugin-migration.ts:385-462, 474-555` 先 preflight verify，再在事务内二次核对并失败即回滚；`src/lib/dal/plugin-migration.test.ts:583-673` 覆盖 verify fail fast 与事务内漂移回滚。 |
| Phase 46 close gate now verifies exact physical contract instead of self-proving current state | ✓ PASS | `scripts/verify-phase46-migration-governance.ts:87-172, 311-355` 为 4 张 governed tables 明确声明 expected columns / unique index name / unique index columns，并用 `PRAGMA table_info/index_list/index_info` 对照校验。 |
| Runtime DDL prevention is backed by executable proof, not just keyword scanning | ✓ PASS | `scripts/verify-phase46-migration-governance.ts:174-275, 414-421` 在临时 proof DB 上运行真实 `installOrReconcilePluginWithTx(..., actorScope: "system")`，验证 `sqlite_master` 未变化、governed plugin data tables 行数不变、但 plugin registration / lifecycle rows 会正常落库；`src/lib/dal/plugin-migration.test.ts:767-797` 对同一 invariant 做 focused regression。 |
| Phase close gate remains honest and executable in current repo | ✓ PASS | `package.json:48` 暴露 `verify:phase46`；本次实际执行 `pnpm run verify:phase46` 返回 0，并级联通过 phase45 / phase44 regression。 |

## Residual Risks

- resource 迁移仍按 school boundary 处理，而不是 owner-aware。基于当前 Phase 45/46 contract，这与现有 `plugin-data.ts` 的 resource 授权模型一致，不属于本 phase 缺口；若未来资源 authoring 边界收紧，Phase 46 migration scope 也需要同步更新。
- close gate 的 runtime DDL proof 目前证明的是 install/reconcile 主路径不产生 schema drift；如果后续新增其他 plugin lifecycle command，也应把它们纳入同类 proof，而不是只依赖当前 coverage。

---

_Reviewed: 2026-05-24T07:11:00Z_  
_Reviewer: the agent (Phase 46 close review)_  
_Depth: deep_
