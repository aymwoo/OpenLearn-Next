---
phase: 60-load-degrade-pilot-rehearsal
plan: "04"
subsystem: rehearsal
tags: [phase60, rollout, rollback, evidence, dry-run]
completed: 2026-05-28
---

# Phase 60 Plan 04 Summary

## Accomplishments

- 新增 `scripts/rehearse-phase60-rollout-rollback.ts` 与对应测试，受控复用 `ops/deploy/deploy.sh` / `ops/deploy/rollback.sh`，并把 rollback trigger 限定为 `sample-smoke regression` 或 `ready blocker`。
- 新增 `ops/releases/evidence/phase60/rehearsal-summary.md`、`rollout-notes.md`、`rollback-notes.md`、`transport-fallback-notes.md`。
- verifier dry-run 已完整走通 smoke -> k6 placeholders -> rollout/rollback rehearsal -> summary 收口闭环。

## Verification

- `pnpm exec vitest --run scripts/rehearse-phase60-rollout-rollback.test.ts`
- `PHASE60_REHEARSAL_MODE=dry-run PHASE60_K6_MODE=dry-run pnpm verify:phase60`

## Notes

- 真实 rollout/rollback rehearsal 仍需要计划文件中要求的 pilot host 环境变量和 systemd target；本次仓库内验证完成的是 contract、脚本 wiring 和 dry-run close gate。
- `60.1` 收口后，`pnpm verify:phase60` 已对 `dry-run` smoke/capacity/drill/rehearsal result fail closed；因此这里的 dry-run 结果只能作为历史 authoring 证据，不能再被当成 milestone close proof。
