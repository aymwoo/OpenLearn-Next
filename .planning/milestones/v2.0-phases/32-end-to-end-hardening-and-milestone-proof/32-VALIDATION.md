---
phase: 32
slug: end-to-end-hardening-and-milestone-proof
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-16
source_plans:
  - 32-01-PLAN.md
  - 32-02-PLAN.md
  - 32-03-PLAN.md
  - 32-04-PLAN.md
  - 32-05-PLAN.md
  - 32-06-PLAN.md
  - 32-07-PLAN.md
---

# Phase 32 — Validation strategy

> Per-phase validation contract for feedback sampling during execution.

Phase 32 的 close 口径必须保持单一、可重复、可审计。这个 validation
strategy 的目标是把 milestone proof 收口成一个外部可执行的总闸门，避免
close 继续依赖一次性手工演示、口头说明，或把上游 phase baseline 混入
`verify:phase32` 的覆盖声明。

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `Vitest 4.1.x` + `tsx` phase verifier scripts |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | task-local `pnpm test --run ...` command from the active PLAN |
| **Full suite command** | `pnpm verify:phase32` |
| **Estimated runtime** | ~180 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local `pnpm test --run ...` command
  declared in the owning PLAN.
- **After Wave 1:** Run the completed `32-01`, `32-05`, and `32-06`
  task-local verifies.
- **After Wave 2:** Run the completed `32-02` and `32-04` task-local verifies.
- **After Wave 3 and at phase close:** Run `pnpm verify:phase32`.
- **Before `/gsd-verify-work`:** `pnpm verify:phase32` must be green.
- **Max feedback latency:** 180 seconds.

`pnpm verify:phase32` 是唯一的外部 milestone-close 命令；它在脚本内部需要先
重跑 `verify:phase27`、`verify:phase28`、`verify:phase29`、`verify:phase30`、
`verify:phase31` 这些前置 baseline，再执行 Phase 32 自己的 focused proof guards、
demo handoff drift checks 和 regression suites。在 Wave 3 之前，采样反馈只使用各
plan 的 task-local verify 命令。

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | RHOST-04 | T-32-01-01 | canonical proof lesson keeps one seeded HTML runtime step, and editor/publish preserves the runtime descriptor inside the published snapshot | unit | `pnpm test --run src/features/runtime-platform/classroom/runtime-session.test.ts src/lib/dal/lesson-authoring.test.ts` | ✅ | ⬜ pending |
| 32-01-02 | 01 | 1 | RHOST-04 | T-32-01-02 / T-32-01-03 | durable submit result and classroom DTO expose `runtimeSessionId` plus UI-ready proof summary | unit | `pnpm test --run src/features/runtime-platform/classroom/runtime-session.test.ts src/lib/dal/classroom.test.ts` | ✅ | ⬜ pending |
| 32-02-01 | 02 | 2 | RHOST-04 | T-32-02-01 | submit success locks runtime UI, shows summary, and blocks save or resubmit | component | `pnpm test --run src/features/runtime-platform/host/runtime-host.test.tsx` | ✅ | ⬜ pending |
| 32-02-02 | 02 | 2 | RHOST-04 | T-32-02-02 | save or submit failure stays on the current runtime surface with retry CTA and draft continuity | component | `pnpm test --run src/features/runtime-platform/host/runtime-host.test.tsx src/components/surfaces/student-player-surfaces.test.ts` | ✅ | ⬜ pending |
| 32-03-01 | 03 | 3 | RHOST-04 | T-32-03-02 | focused suites lock editor/publish continuity, launch affordance, terminal posture, recovery, classroom proof, and inspector review semantics | component | `pnpm test --run src/lib/dal/lesson-authoring.test.ts src/components/classroom/classroom-launch-panel.test.tsx src/features/runtime-platform/host/runtime-host.test.tsx src/components/surfaces/student-player-surfaces.test.ts src/lib/dal/classroom.test.ts src/lib/dal/runtime-inspector.test.ts src/components/surfaces/runtime-inspector-surface.test.tsx` | ✅ | ⬜ pending |
| 32-03-02 | 03 | 3 | RHOST-04 | T-32-03-01 / T-32-03-03 | single external gate `verify:phase32` re-confirms compatibility baseline, cache freshness, session durability, capability denial, rollback-safe transport, editor/publish continuity, inspector review, and the handoff contract inside one command | script | `pnpm verify:phase32` | ❌ planned | ⬜ pending |
| 32-04-01 | 04 | 2 | RHOST-04 | T-32-04-01 / T-32-04-03 | launch, classroom, and inspector surfaces expose proof affordance, `runtimeSessionId` drill-down, and reviewable proof timeline posture | component | `pnpm test --run src/components/classroom/classroom-launch-panel.test.tsx src/lib/dal/runtime-inspector.test.ts src/components/surfaces/runtime-inspector-surface.test.tsx src/components/surfaces/classroom-console-surface.test.tsx` | ✅ | ⬜ pending |
| 32-04-02 | 04 | 2 | RHOST-04 | T-32-04-02 | handoff doc captures bootstrap, accounts, canonical chain, second-step inspector drill-down, and out-of-scope limits | doc-check | `See exact command in "Automated command details" below.` | ❌ planned | ⬜ pending |
| 32-05-01 | 05 | 1 | RHOST-04 | T-32-05-01 / T-32-05-02 | host accepts the pre-bootstrap iframe ready handshake without relaxing runtime-ready, interaction, save, or submit instance isolation | component | `pnpm test --run src/features/runtime-platform/host/runtime-host.test.tsx` | ✅ | ⬜ pending |
| 32-05-02 | 05 | 1 | RHOST-04 | T-32-05-03 | html pilot keeps the `runtime-pilot-pending` placeholder ready contract until bootstrap returns the final runtime instance id | component | `pnpm test --run src/features/runtime-platform/host/runtime-host.test.tsx` | ✅ | ⬜ pending |
| 32-06-01 | 06 | 1 | RHOST-04 | T-32-06-01 / T-32-06-03 | teacher `/classroom` listens to SSE snapshot version changes and only triggers `router.refresh()` back into the server-owned snapshot DTO | component | `pnpm test --run src/components/classroom/classroom-live-snapshot-refresh.test.tsx` | ✅ | ⬜ pending |
| 32-06-02 | 06 | 1 | RHOST-04 | T-32-06-02 | classroom-first proof feedback stays visible outside runtime-step gating, and the canonical close gate executes both live refresh and proof feedback regressions | component + script | `pnpm test --run src/components/classroom/classroom-live-snapshot-refresh.test.tsx src/components/surfaces/classroom-console-surface.test.tsx src/components/classroom/classroom-student-detail-panel.test.tsx && pnpm verify:phase32` | ✅ | ⬜ pending |
| 32-07-01 | 07 | 4 | RHOST-04 | T-32-07-01 | runtime host iframe keeps the minimal same-origin sandbox tokens required for the current pilot route, without adding wider browser permissions | component | `pnpm test --run src/features/runtime-platform/host/runtime-host.test.tsx` | ✅ | ⬜ pending |
| 32-07-02 | 07 | 4 | RHOST-04 | T-32-07-02 / T-32-07-03 | `verify:phase32` keeps same-origin sandbox startup posture as automated close evidence for the opaque-origin regression | script | `pnpm verify:phase32` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| An operator can follow `32-DEMO-HANDOFF.md` without reverse-engineering repo internals | RHOST-04 | Human route discovery, account switching, and affordance clarity across `editor/publish -> launch/classroom -> student submit -> classroom first-feedback -> inspector drill-down` are not fully captured by source drift guards alone | 1. Run `pnpm db:bootstrap:dev`. 2. Sign in with `teacher@example.com` and `student@example.com`. 3. Follow the canonical chain exactly as documented, including the editor or publish leg before launch. 4. Confirm the first success or failure cue appears on `/classroom` before opening inspector. 5. Open inspector only via `runtimeSessionId` second-step drill-down and confirm the proof timeline is reviewable. |

## Automated command details

### 32-04-02 exact command

```bash
python - <<'PY'
from pathlib import Path

text = Path('.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md').read_text()
required_groups = {
    'accounts': ['teacher@example.com', 'student@example.com'],
    'bootstrap': ['db:bootstrap:dev'],
    'proof_chain': ['editor/publish', 'launch/classroom', 'student submit', 'classroom first-feedback', 'inspector drill-down'],
    'inspector_second_step': ['runtimeSessionId', '第二步'],
    'out_of_scope': ['PostgreSQL', 'Redis', 'WebSocket', 'dashboard', 'player-direct'],
}
missing = {
    group: [item for item in values if item not in text]
    for group, values in required_groups.items()
}
missing = {group: values for group, values in missing.items() if values}
raise SystemExit(1 if missing else 0)
PY
```

## Validation sign-off

- [x] All tasks have `<automated>` verify or existing infrastructure coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 180s.
- [x] `nyquist_compliant: true` is set in frontmatter.
- [x] External close uses a single gate: `pnpm verify:phase32`.

`pnpm verify:phase32` is the only external automated close command for Phase 32.
It must run `verify:phase27`, `verify:phase28`, `verify:phase29`, `verify:phase30`,
and `verify:phase31` inside the script as milestone prerequisites, then fail loudly
if any roadmap-close baseline or Phase 32 proof guard regresses.

## Exit criteria

- All in-scope truths have focused automated evidence.
- `verify:phase32` output separates roadmap-close prerequisites from Phase 32-specific
  drift checks: compatibility baseline, cache freshness, session durability,
  capability denial, rollback-safe transport, `editor/publish drift`,
  `proof seed drift`, `launch affordance drift`, `terminal posture drift`,
  `recovery drift`, `sandbox startup drift`, `classroom live refresh drift`,
  `classroom proof drift`, `inspector review drift`, and `demo handoff drift`.
- Demo handoff documentation lets a downstream executor replay the canonical proof
  path without reverse-engineering source files.
- Teacher-side live refresh and classroom-first proof feedback both remain inside
  `pnpm verify:phase32`, not as manual-only checks.
- iframe same-origin startup posture remains inside `pnpm verify:phase32`, not as
  a one-off browser workaround.
- Phase 32 close can be stated as `milestone proof verified`, not merely
  `baseline still mostly works`.

## Gap closure addendum

Plan `32-07` closes the remaining live-browser startup gap discovered after the
first Phase 32 close pass. The automated proof now explicitly requires
`RuntimeHostFrame` to keep `allow-same-origin` alongside `allow-scripts` and
`allow-forms`, while still rejecting wider sandbox capabilities such as top
navigation, popups, or downloads. This protects the canonical pilot route from
falling back to opaque-origin startup again.

**Approval:** pending execution
