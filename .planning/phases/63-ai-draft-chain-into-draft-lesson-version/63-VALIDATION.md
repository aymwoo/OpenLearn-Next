---
phase: 63
slug: ai-draft-chain-into-draft-lesson-version
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-31
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 63-RESEARCH.md §Validation Architecture (committed 0e64239).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.mts` (`pnpm test` entry — package.json:69) |
| **Quick run command** | `pnpm test -- src/features/platform-core/commands` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~? seconds (full suite; quick scope < 10s) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- <touched path>` + `pnpm typecheck`
- **After every plan wave:** Run `pnpm test -- src/features/platform-core src/lib/dal`
- **Before `/gsd:verify-work`:** `pnpm test` full suite green + `pnpm typecheck` + `pnpm lint`
- **Max feedback latency:** ~10 seconds (quick scope)

---

## Per-Task Verification Map

> Planner expands per-task rows (Task ID / Plan / Wave) during PLAN.md authoring.
> Requirement-level coverage anchors below from 63-RESEARCH.md test map.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 63-??-?? | ?? | 1 | DRAFT-01 | T-63-tamper | persist 命令经 Bus 写 `draftLessonVersions`，snapshot 复用 step schema，**不写 lessonSteps** | unit | `pnpm test -- handlers/lesson-draft` | ❌ W0 | ⬜ pending |
| 63-??-?? | ?? | 1 | DRAFT-02 | T-63-replay | 同 idempotencyKey 重试：dedupe 短路 **且** 表唯一约束兜底（行数恒 1），含 pending-崩溃-重放路径 | unit | `pnpm test -- commands/bus` | ❌ W0 | ⬜ pending |
| 63-??-?? | ?? | 1 | DRAFT-03 | T-63-disclose | 行级 `source='ai'`/`sourceCommandId` 可查；无任何学生/classroom 读路径触及 draft | unit | `pnpm test -- dal/classroom` + 新 draft DAL 测试 | ⚠️ classroom.test.ts 存在 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/platform-core/commands/handlers/lesson-draft.test.ts` — persist handler（DRAFT-01/03），含越权拒绝 + `source` 标注断言
- [ ] bus dedupe replay 测试增量 — 覆盖 `pending` 崩溃重放 → 表唯一约束兜底（DRAFT-02 关键路径，RESEARCH Pitfall 1）
- [ ] draft DAL 读取测试 — 断言学生/classroom 路径不返回 draft（DRAFT-03 结构隔离）
- [ ] migration 应用 smoke — migrate 后 `draftLessonVersions` 表存在且唯一约束就位

*现有 `classroom.test.ts:49` 提供 `db.query` mock 夹具范式可复用。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 教师审校/接受 draft 的端到端 UI 流 | (Phase 64) | 本 phase 无 UI | Deferred — Phase 64 |

*本 phase 所有服务端行为均有自动化验证；UI 行为属 Phase 64。*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
