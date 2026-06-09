---
phase: 74
slug: v4-1-authoritative-close-gate-multi-type-live-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-08
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + Node CLI verifier scripts via `tsx` 4.22.3 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `test -f scripts/verify-phase73-quiz-ext.ts && test -f scripts/verify-phase73-v41-close-gate.ts && test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md && test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md && test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md && grep -Eq '"verify:phase73": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-quiz-ext.ts"' package.json && grep -Eq '"verify:phase73-v41-close-gate": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-v41-close-gate.ts"' package.json` |
| **Full suite command** | `pnpm verify:phase` |
| **Estimated runtime** | <30 seconds fast lane / ~180 seconds final gate |

---

## Sampling Rate

- **After every task commit:** Run the sub-30s fast lane only: `test -f scripts/verify-phase73-quiz-ext.ts && test -f scripts/verify-phase73-v41-close-gate.ts && test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md && test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md && test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md && grep -Eq '"verify:phase73": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-quiz-ext.ts"' package.json && grep -Eq '"verify:phase73-v41-close-gate": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-v41-close-gate.ts"' package.json`
- **After every plan wave:** Run `pnpm verify:phase73 --smoke`
- **Before `/gsd-verify-work`:** Full suite must be green via `pnpm verify:phase`
- **Max feedback latency:** <30 seconds for fast lane; reserve `pnpm verify:phase` for wave-merge / final gate

### Fast lane vs final gate

- **Fast lane (current authoritative quick feedback):** parser/static/readiness preflight only, target <30s. It exists to catch missing scripts, missing artifacts, and wiring drift before invoking any heavy verifier chain.
- **Final gate (current authoritative merge/close lane):** `pnpm verify:phase`. This is the only full-suite command for wave merge and final close.
- **Historical / superseded note:** earlier drafts that treated `pnpm verify:phase73 && pnpm verify:phase73-v41-close-gate` as the standing full suite are now superseded; the single current authoritative full-suite entrypoint is `pnpm verify:phase`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 74-01-01 | 01 | 1 | QUIZ-EXT-CLOSE-01 | T-74-01 | `73-PROOF-MAPPING.md` 先于 closeout 落地，并显式追踪 `QUIZ-EXT-01/02/CLOSE` 全部 sub-IDs | static doc gate | `for token in QUIZ-EXT-01-A QUIZ-EXT-01-B QUIZ-EXT-01-C QUIZ-EXT-01-D QUIZ-EXT-01-E QUIZ-EXT-02-A QUIZ-EXT-02-B QUIZ-EXT-02-C QUIZ-EXT-02-D QUIZ-EXT-02-E QUIZ-EXT-CLOSE-01 QUIZ-EXT-CLOSE-02 QUIZ-EXT-CLOSE-03; do grep -q "$token" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md || exit 1; done` | ❌ W0 | ⬜ pending |
| 74-01-02 | 01 | 1 | QUIZ-EXT-CLOSE-01 | T-74-02 | `verify:phase73` 覆盖 multi-type schema/DTO/allowlist/cache-tag 与 live dashboard truth lane | script + targeted integration | `pnpm test:live-answer-zero-write && pnpm vitest run src/features/platform-core/plugin-data-access/quiz-data-access.test.ts src/features/platform-core/plugin-data-access/allowlist.test.ts src/components/classroom/live-answer-dashboard-store.test.ts src/components/classroom/live-answer-dashboard-surface.test.tsx src/components/classroom/classroom-session-recap-surface.test.tsx src/features/runtime-platform/seams/transport/ws-envelope.test.ts src/features/runtime-platform/seams/transport/ws-adapter.test.ts src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts tests/classroom/live-view.test.ts tests/classroom/ws-events.test.ts tests/classroom/fanout.test.ts tests/classroom/dashboard.test.ts "src/app/(classroom)/classroom/page.test.tsx" src/components/classroom/classroom-control-panel.test.tsx src/lib/dal/classroom.test.ts && pnpm verify:phase73 --smoke` | ✅ | ⬜ pending |
| 74-02-01 | 02 | 2 | QUIZ-EXT-CLOSE-01 | T-74-03 | outer gate 在 smoke 下证明 wiring/parser/readiness 已就绪，在 full mode 才 hard-fail future artifacts/manual requirements | static gate | `pnpm verify:phase73-v41-close-gate --smoke` | ❌ W0 | ⬜ pending |
| 74-02-02 | 02 | 2 | QUIZ-EXT-CLOSE-03 | T-74-04 | outer gate alias wiring 接受 pre-cutover / post-cutover 两种合法 posture，不自相矛盾 | static gate + script wiring | `pnpm verify:phase73-v41-close-gate --smoke && grep -Eq '"verify:phase": "pnpm verify:phase72( && pnpm verify:phase73-v41-close-gate)?"' package.json` | ❌ W0 | ⬜ pending |
| 74-03-01 | 03 | 3 | QUIZ-EXT-CLOSE-01 | T-74-03-01 | `73-VERIFICATION.md` 以 user-flow-first 方式记录 multi-type recap / live dashboard truth | doc verification | `grep -q "Multi-type recap" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md && grep -q "Live dashboard" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md && grep -q "user flow -> gate stages" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 74-03-02 | 03 | 3 | QUIZ-EXT-CLOSE-03 | T-74-03-02 | verification report 明确记录 SSE baseline 与 locked WebSocket-first path 的治理例外，且不引入第二 runtime | doc governance gate | `grep -q "SSE" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md && grep -q "WebSocket" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md && grep -q "no second transport runtime" .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 74-04-01 | 04 | 4 | QUIZ-EXT-CLOSE-02 | T-74-04-01 | deterministic preparation lane emits one real live URL and one real ended URL before human sign-off | prep script | `pnpm seed:test-accounts && node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/prepare-phase74-observation-targets.ts && grep -q 'teacher_login: teacher@example.com / password' .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-OBSERVATION-TARGETS.md && grep -q 'live_url: /classroom?sessionId=' .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-OBSERVATION-TARGETS.md && grep -q 'ended_url: /classroom?sessionId=' .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-OBSERVATION-TARGETS.md` | ❌ W0 | ⬜ pending |
| 74-04-02 | 04 | 4 | QUIZ-EXT-CLOSE-02 | T-74-04-02 | human sign-off payloads bind to exact prepared `/classroom` URLs and real observer evidence | manual + smoke | `test -f .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-OBSERVATION-TARGETS.md && pnpm verify:phase73 --smoke && pnpm verify:phase73-v41-close-gate --smoke` | ❌ W0 | ⬜ pending |
| 74-05-01 | 05 | 5 | QUIZ-EXT-CLOSE-02 | T-74-05-01 | proof mapping v4.1 manual rows are fully backed by real sign-off payloads | static doc gate | `grep -c '^| status | \\`status: passed\\` |' .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md | grep -q '4'` | ❌ W0 | ⬜ pending |
| 74-05-02 | 05 | 5 | QUIZ-EXT-CLOSE-03 | T-74-05-02 | closeout exists before D-04 evaluation and records transport-governance note without premature verdict | fast preflight | `test -f .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md && grep -q 'Alias cutover status: pending final D-04 evaluation' .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md && grep -q 'no second transport runtime' .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md` | ❌ W0 | ⬜ pending |
| 74-05-03 | 05 | 5 | QUIZ-EXT-CLOSE-03 | T-74-05-03 | final close gate only succeeds after fast preflight + smoke + authoritative `pnpm verify:phase`, then syncs `.planning/STATE.md` to 100% | final gate | `test -f scripts/verify-phase73-quiz-ext.ts && test -f scripts/verify-phase73-v41-close-gate.ts && pnpm verify:phase73-v41-close-gate --smoke && pnpm verify:phase && grep -q 'Current focus: v4.1 authoritative close gate complete' .planning/STATE.md && grep -q 'completed_phases: 2' .planning/STATE.md && grep -q 'percent: 100' .planning/STATE.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-phase73-quiz-ext.ts` — reusable inner verifier
- [ ] `scripts/verify-phase73-v41-close-gate.ts` — authoritative outer close gate
- [ ] `package.json` script entries for `verify:phase73` and `verify:phase73-v41-close-gate`
- [ ] `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md`
- [ ] `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md`
- [ ] `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/classroom` live-answer dashboard tab shows the intended teacher-facing surface and evidence note reflects a real observation | QUIZ-EXT-CLOSE-02 | D-05 and D-06 require a real human observer; scripts can only prepare the exact target URL | Read `74-OBSERVATION-TARGETS.md`, open the prepared `live_url` as `teacher@example.com`, confirm the dashboard surface is visible and remains read-only, then record real `executed_by`, `executed_at`, and `evidence note` in `73-PROOF-MAPPING.md` |
| multi-type post-class recap renders the expected recap surface for the ended session path and evidence note reflects a real observation | QUIZ-EXT-CLOSE-02 | the recap sign-off is a product-surface observation and cannot be auto-passed | Read `74-OBSERVATION-TARGETS.md`, open the prepared `ended_url`, verify the recap surface renders the expected multi-type recap content, then record real `executed_by`, `executed_at`, and `evidence note` in `73-PROOF-MAPPING.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
