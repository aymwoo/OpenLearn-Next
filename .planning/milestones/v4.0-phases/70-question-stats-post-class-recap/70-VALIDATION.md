---
phase: 70
slug: question-stats-post-class-recap
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for latest-only plugin-owned quiz stats and recap UI integration.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest（unit/integration）+ phase close-gate script (`tsx`) |
| **Config file** | Existing Vitest conventions + `scripts/server-only-node-shim.cjs` |
| **Quick run command** | `pnpm vitest run src/lib/dal/classroom.test.ts src/components/classroom/classroom-session-recap-surface.test.tsx src/actions/classroom-actions.test.ts src/lib/cache-policy.test.ts` |
| **Full suite command** | `pnpm verify:phase70`（added only by `70-04-PLAN.md`; global `verify:phase` alias stays unchanged） |
| **Estimated runtime** | ~60-90s once close gate exists |

---

## Sampling Rate

- After every DAL/DTO task: run focused `classroom.test.ts` and any touched schema/cache tests.
- After every UI task: run `classroom-session-recap-surface.test.tsx`.
- After every cache invalidation task: run `classroom-actions.test.ts` + `cache-policy.test.ts`.
- Before phase close: `pnpm verify:phase70` and `pnpm verify:phase69` must both pass.

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | Test Assets | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| STATS-01 | latest-only per-question aggregation uses `plugin_owned_quiz_responses(isLatest)` and question snapshot rows only | integration | `pnpm vitest run src/lib/dal/classroom.test.ts -t "quiz sample stats"` | `src/lib/dal/classroom.test.ts` (extend) | ✅ green |
| STATS-01 | 作答/未作答人数相对 `classroomParticipants` 计算，不受课后 enrollment 漂移影响 | integration | `pnpm vitest run src/lib/dal/classroom.test.ts -t "unanswered denominator"` | `src/lib/dal/classroom.test.ts` (extend) | ✅ green |
| STATS-01 | recap DTO 扩出 quiz sample stats section，但不污染 `ClassroomSessionSummaryArtifactSchema` / 持久化 summary path | unit + integration | `pnpm vitest run src/lib/dal/classroom.test.ts` | `src/lib/dal/classroom.test.ts` (extend) | ✅ green |
| STATS-01 | submit quiz sample answer 成功后刷新 `cacheTags.quizStats(sessionId)` | unit | `pnpm vitest run src/actions/classroom-actions.test.ts src/lib/cache-policy.test.ts` | `src/actions/classroom-actions.test.ts` (extend), `src/lib/cache-policy.test.ts` (extend) | ✅ green |
| STATS-02 | recap surface renders question cards, correct-rate label, option distribution, answered/unanswered copy with no empty crash | component | `pnpm vitest run src/components/classroom/classroom-session-recap-surface.test.tsx` | `src/components/classroom/classroom-session-recap-surface.test.tsx` (extend) | ✅ green |
| STATS-01 / STATS-02 | phase close gate covers plugin-owned truth, latest semantics, no core analytics writeback, recap seam visibility | gate | `pnpm verify:phase70` | `scripts/verify-phase70-quiz-stats.ts` (new), `package.json` (new script) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/cache-policy.ts` 增加 `cacheTags.quizStats(sessionId)`。
- [x] `src/lib/dto/classroom.ts` 增加 quiz sample recap section schemas。
- [x] `src/lib/dal/classroom.test.ts` 覆盖 latest-only、answered/unanswered、no-summary-writeback。
- [x] `src/actions/classroom-actions.test.ts` 覆盖 quiz stats tag invalidation。
- [x] `src/lib/cache-policy.test.ts` 覆盖新 tag 生成。
- [x] `src/components/classroom/classroom-session-recap-surface.test.tsx` 覆盖 quiz stats section rendering。
- [x] `scripts/verify-phase70-quiz-stats.ts` close gate：plugin-owned truth + latest-only + recap seam + no core analytics writeback。
- [x] `package.json` 新增 `verify:phase70`；全局 `verify:phase` alias 保持不变。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 题目复盘 section 是否真的融入现有 recap 视觉语言，而不是像拼上的 BI 模块 | STATS-02 | 视觉节奏、层级、文案口径无法只靠自动化断言 | 启动本地 `/classroom?sessionId=...&recapTab=students`，检查题目复盘 section 是否遵守 Lexend、no-line、tonal depth、glass/gradient CTA 和现有 recap hero/workload 节奏 |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing tests/scripts
- [x] No watch-mode flags
- [x] Feedback latency < 90s for routine focused runs
- [x] `nyquist_compliant: true` set in frontmatter before verification handoff

**Approval:** verified via `pnpm verify:phase70` and `pnpm verify:phase69` on 2026-06-05
