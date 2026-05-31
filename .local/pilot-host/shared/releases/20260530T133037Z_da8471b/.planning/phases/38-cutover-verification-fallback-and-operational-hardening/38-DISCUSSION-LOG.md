# Phase 38: Cutover verification, fallback, and operational hardening - Discussion Log

## Discussion Status

- Status: research completed; planning locked
- Last updated: 2026-05-18

## Known Inputs

- Roadmap already defines 2 plan slots: verifier/parity proof, then fallback/bootstrap/observability closeout.
- Phase 36 and Phase 37 are both closed with phase-specific verifiers.
- Current milestone remaining scope is only Phase 38 closeout.

## Open Questions

1. Phase 38 执行时，是否会发现真实 parity gap，迫使我们对现有 verifier 或 surface 做最小代码修正？
2. `38-DEMO-RUNBOOK.md` 最终应该放在 phase 目录，还是需要额外落到 repo 级 docs 目录？

## Decisions

- Phase 38 将发布独立的 milestone close gate：`verify:phase38`。
- `verify:phase38` 的职责是组合 `verify:phase36` + `verify:phase37`，再补 closeout-specific checks；不会替代前两者。
- Phase 38 将新增三类 closeout artifact：fallback matrix、demo runbook、milestone closeout doc。
- closeout scope 固定只覆盖 `ws + ioredis` classroom transport；BullMQ、PostgreSQL、第二 runtime 与 broader runtime expansion 继续 deferred。
