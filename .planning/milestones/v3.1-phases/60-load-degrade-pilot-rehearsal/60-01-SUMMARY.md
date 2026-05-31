---
phase: 60-load-degrade-pilot-rehearsal
plan: "01"
subsystem: verification
tags: [phase60, verifier, thresholds, stop-rules]
completed: 2026-05-28
---

# Phase 60 Plan 01 Summary

## Accomplishments

- 新增 `scripts/load/phase60-thresholds.js`，把 40/5 容量常量和四个 stop-rule 数值收口到单一共享源。
- 新增 `scripts/load/phase60-thresholds.test.ts`，锁定 `classrooms=5`、`studentsPerClassroom=40`、`reconnect=15000ms`、`worker backlog=120000ms`、`partial failure<0.02`、`degraded=180000ms`。
- 新增 `scripts/verify-phase60-load-and-rehearsal.ts` 与 `scripts/verify-phase60-load-and-rehearsal.test.ts`，冻结 `static -> sample smoke -> capacity -> drills -> rollout/rollback rehearsal -> summary` 硬 gate 顺序。
- 在 `package.json` 中新增 `verify:phase60` 入口。

## Verification

- `pnpm exec vitest --run scripts/load/phase60-thresholds.test.ts scripts/verify-phase60-load-and-rehearsal.test.ts`

## Notes

- verifier 保留 `PHASE60_K6_MODE=dry-run` 与 `PHASE60_REHEARSAL_MODE=dry-run` authoring 模式，但默认 close 语义仍是硬失败。
- `60.1` 收口后，`pnpm verify:phase60` 已显式拒绝 `dry-run` machine-readable result；dry-run 现在只用于 authoring wiring 验证，不再代表 close gate 通过。
