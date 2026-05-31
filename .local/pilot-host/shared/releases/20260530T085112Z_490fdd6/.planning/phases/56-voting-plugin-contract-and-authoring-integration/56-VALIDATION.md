---
phase: 56
slug: voting-plugin-contract-and-authoring-integration
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-25
source_plans:
  - 56-01-PLAN.md
  - 56-02-PLAN.md
  - 56-03-PLAN.md
  - 56-04-PLAN.md
  - 56-05-PLAN.md
---

# Phase 56 - Validation Strategy

> Per-phase execution validation contract for feedback sampling during implementation.

Phase 56 closes only when five truths hold together: classroom voting stays inside the existing `quiz` shell, teachers can edit and save dedicated voting config through the real authoring chain, `plugin_ext_lesson_step` remains the only durable executable-config truth, built-in lifecycle/provenance checks stay unified between authoring and publish readiness, and `pnpm verify:phase56` fails on real regressions instead of static false positives.

## Validation Mode

- `.planning/config.json` currently sets `workflow.nyquist_validation` to `true`. `[VERIFIED: codebase read .planning/config.json]`
- This file is the required Nyquist validation contract for Phase 56 gap closure and is consumed by plan-checker before execute-phase.
- `nyquist_compliant: false` remains intentional until `56-04` and `56-05` are executed and all verification commands run green.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Phase verifier script |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | task-local verify command from the active Phase 56 plan |
| **Full suite command** | `pnpm verify:phase56` |
| **Estimated runtime** | quick ~20-60 seconds, full ~90-150 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local verify command declared in the active Phase 56 plan.
- **After `56-04` Task 1:** Run `pnpm vitest run src/components/authoring/lesson-step-editor.test.tsx src/actions/lesson-authoring-actions.test.ts`.
- **After `56-04` Task 2:** Run `pnpm vitest run src/lib/dal/lesson-authoring.test.ts src/actions/lesson-authoring-actions.test.ts`.
- **After `56-05` Task 1:** Run `pnpm vitest run src/lib/dal/plugins.builtins.test.ts src/components/authoring/lesson-authoring-workspace.test.tsx src/lib/dal/lesson-authoring.test.ts`.
- **After `56-05` Task 2:** Run `pnpm vitest run src/lib/dal/lesson-authoring.test.ts src/components/authoring/authoring-status-panel.test.tsx`.
- **After `56-05` Task 3 and at phase close:** Run `pnpm verify:phase56`.
- **Before `/gsd-verify-work`:** `pnpm verify:phase56` must be green.
- **Max feedback latency:** 150 seconds.

`pnpm verify:phase56` is the single external close gate for this phase. It must statically guard only the irreducible contract boundaries (repo-local entrypoint and exactly three core step types) while proving lifecycle gate, non-voting provenance, editor safe-parse fallback, durable writer wiring, and stale-blocker refresh through focused behavior suites.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 56-04-01 | 04 | 1 | PLUG-02, CHAIN-01 | T-56-04-01 / T-56-04-02 | dedicated classroom voting editor hydrates from contract defaults, blocks invalid input locally, and echoes server validation without clearing teacher input | component + action | `pnpm vitest run src/components/authoring/lesson-step-editor.test.tsx src/actions/lesson-authoring-actions.test.ts` | ✅ existing suites | ⬜ pending |
| 56-04-02 | 04 | 1 | PLUG-02, SAFE-01, SAFE-02 | T-56-04-02 / T-56-04-03 / T-56-04-04 | voting save action writes mirrored quiz shell plus durable plugin extension truth through DAL, rejects invalid scope/lifecycle input, and keeps duplicate saves replay-safe | DAL + action | `pnpm vitest run src/lib/dal/lesson-authoring.test.ts src/actions/lesson-authoring-actions.test.ts` | ✅ existing suites | ⬜ pending |
| 56-05-01 | 05 | 2 | PLUG-02, CHAIN-02 | T-56-05-01 | authoring visibility and publish availability use one runnable built-in lifecycle truth, and every built-in insertion preserves provenance | DAL + component | `pnpm vitest run src/lib/dal/plugins.builtins.test.ts src/components/authoring/lesson-authoring-workspace.test.tsx src/lib/dal/lesson-authoring.test.ts` | ✅ existing suites | ⬜ pending |
| 56-05-02 | 05 | 2 | CHAIN-01, SAFE-01 | T-56-05-02 / T-56-05-03 | a single bad persisted step cannot crash the whole editor DTO, and publish blockers refresh from latest lesson props with no stale cache | DAL + component | `pnpm vitest run src/lib/dal/lesson-authoring.test.ts src/components/authoring/authoring-status-panel.test.tsx` | ✅ existing suites | ⬜ pending |
| 56-05-03 | 05 | 2 | PLUG-02, CHAIN-01, CHAIN-02, SAFE-01 | T-56-05-04 | repo-local close gate runs the exact focused suites and no longer relies on `includes()` to prove lifecycle/provenance/safe-parse/stale-state behaviors | script + integration | `pnpm verify:phase56` | ✅ existing script | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

## Wave 0 Requirements

- [x] `vitest.config.mts` exists and is the canonical Vitest config for this phase.
- [x] `src/components/authoring/lesson-step-editor.test.tsx` exists and is the dedicated editor regression suite.
- [x] `src/actions/lesson-authoring-actions.test.ts` exists and is the action contract suite.
- [x] `src/lib/dal/lesson-authoring.test.ts` exists and is the DAL/snapshot/readiness regression suite.
- [x] `src/lib/dal/plugins.builtins.test.ts` exists and is the built-in lifecycle visibility suite.
- [x] `src/components/authoring/lesson-authoring-workspace.test.tsx` exists and is the insertion/provenance suite.
- [x] `src/components/authoring/authoring-status-panel.test.tsx` exists and is the blocker refresh suite.
- [x] `scripts/verify-phase56-voting-authoring.ts` exists and is the canonical repo-local close gate.
- [x] `scripts/verify-phase56-voting-authoring.test.ts` exists and locks the verifier contract.
- [x] `package.json` already exposes `verify:phase56`.

## Validation Architecture

Phase 56 uses a five-layer validation stack:

1. **Editor contract layer**
   Validate that classroom voting steps render a dedicated config section, hydrate from `authoringContract.defaultConfig`, and echo client/server validation without falling back to generic quiz correctness fields.
2. **Durable writer layer**
   Validate that the authoring save chain writes mirrored `quiz` shell data plus `plugin_ext_lesson_step` truth through DAL and that duplicate saves stay idempotent.
3. **Lifecycle and provenance layer**
   Validate that authoring visibility and publish availability share one runnable built-in truth and that every built-in insertion preserves `builtInSource`.
4. **Editor resilience and freshness layer**
   Validate that bad persisted step payloads degrade into structured issues and that `AuthoringStatusPanel` derives blockers from fresh server props instead of stale local cache.
5. **Phase close gate**
   Validate that `pnpm verify:phase56` runs the exact focused suites and only keeps irreducible static assertions.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline copy sequencing in the real teacher editor still feels coherent after save -> refresh -> publish-ready transitions | CHAIN-01, CHAIN-02 | automated suites prove state transitions, but not the exact perceived pacing/copy emphasis in the real browser shell | Run the local teacher editor, open a classroom voting step, trigger save success and a blocker-clearing refresh, then confirm footer/status-panel copy follows `正在保存投票配置...` -> `正在刷新发布检查...` -> refreshed blocker/ready state without toast-only fallback |

## Validation Sign-Off

- [x] All gap-closure tasks now have explicit automated verify commands.
- [x] Sampling continuity: no three consecutive execution tasks lack an automated verification step.
- [x] Wave 0 prerequisites are explicit and already exist in the repo.
- [x] No watch-mode flags appear in automated commands.
- [x] Feedback latency stays under 150 seconds for the full close gate target.
- [ ] `nyquist_compliant: true` can only be set after `56-04` and `56-05` execute and all commands above are green.

## Exit Criteria

- Teachers can configure classroom voting inside the existing lesson editor and save through the formal action/DAL chain.
- `plugin_ext_lesson_step` is the only durable truth for voting executable config and duplicate saves are replay-safe.
- Built-in lifecycle visibility, provenance retention, editor safe-parse fallback, and stale-blocker refresh all have focused regression proof.
- `pnpm verify:phase56` is the only external automated close command for the phase.

**Approval:** planning-stage validation strategy drafted on 2026-05-25; execution evidence pending.
