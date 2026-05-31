---
phase: 60-load-degrade-pilot-rehearsal
plan: "02"
subsystem: load-proof
tags: [phase60, smoke, capacity, fixtures, k6]
completed: 2026-05-28
---

# Phase 60 Plan 02 Summary

## Accomplishments

- 新增 `scripts/load/phase60-fixtures.ts`，生成 5 个 classroom-affined session、每课堂 40 名学生 actor，并写出 `phase60-fixtures.generated.json`。
- 新增 `scripts/proof-phase60-load-smoke.ts`，先挂 `verify:phase56`，再复用 `runPhase57BrowserProof()`，并写出 `ops/releases/evidence/phase60/smoke-result.json`。
- 新增 `scripts/load/phase60-capacity.k6.js`，把 5 classroom x 40 actor 作为具名 scenario 输出到 `ops/releases/evidence/phase60/capacity-result.json`。

## Verification

- `PHASE60_REHEARSAL_MODE=dry-run PHASE60_K6_MODE=dry-run pnpm verify:phase60`

## Notes

- 当前仓库内已具备 dry-run authoring 路径；live k6 容量 gate 仍需要真实可达服务与 pilot host / target 环境。
- 这里记录的 `PHASE60_REHEARSAL_MODE=dry-run PHASE60_K6_MODE=dry-run pnpm verify:phase60` 属于历史 authoring 验证；`60.1` 收口后，close gate 已不再接受 dry-run result 作为通过证据。
