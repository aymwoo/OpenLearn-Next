---
phase: 68
slug: governed-declarative-data-access-verbs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest（单元/集成，`*.test.ts`，全库标准）+ `verify:phase68` tsx 闸门脚本（负样本契约） |
| **Config file** | 既有 vitest 配置（`*.test.ts` 同目录）；闸门脚本无独立 config |
| **Quick run command** | `pnpm vitest run src/features/platform-core/plugin-data-access` |
| **Full suite command** | `pnpm verify:phase68`（新增）+ 更新 `verify:phase` alias → `pnpm verify:phase68` |
| **Estimated runtime** | ~30 秒（单元）/ ~60 秒（含闸门 + compile 漂移断言） |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/features/platform-core/plugin-data-access`
- **After every plan wave:** Run `pnpm verify:phase68`（负样本契约 + 漂移闸门）
- **Before `/gsd-verify-work`:** `pnpm verify:phase68` 全绿 + 既有 `verify:phase67`（migration-proof）仍绿
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| ACCESS-01 | 5 动词具名调用、白名单列、参数化、拒裸 SQL/自由 where/任意字段 | unit | `pnpm vitest run .../facade.test.ts` | ❌ W0 | ⬜ pending |
| ACCESS-01/02 | 7 类负样本各断言特定拒因 + audit 落库（D-08） | gate (负样本) | `pnpm verify:phase68` | ❌ W0 | ⬜ pending |
| ACCESS-02 | 写动词经 Command Bus 持久化、replay-safe、dedupe | integration | `pnpm vitest run .../handlers/plugin-data.test.ts` | ❌ W0 | ⬜ pending |
| ACCESS-02 | lifecycle/kill-switch 越权经治理门拒（第 7 类） | unit | `pnpm vitest run .../governance-gate.test.ts` | ❌ W0 | ⬜ pending |
| ACCESS-03 | schoolId session 注入、payload 带 schoolId → cross_school_rejected | unit | `pnpm vitest run .../facade.test.ts` | ❌ W0 | ⬜ pending |
| D-06 | 白名单"重新编译无 diff"零漂移 | gate | `pnpm verify:phase68`（重跑 compile + git diff 断言） | ❌ W0 | ⬜ pending |
| D-05 | aggregate 仅 count+groupBy(白名单列)；非聚合列 → unindexed/unknown 拒 | unit | `pnpm vitest run .../read-verbs.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-phase68-data-access-verbs.ts` — 1 合法动词 + 7 非法各断言特定拒因 + audit（D-08）
- [ ] `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — 编译期派生白名单 const（checked-in）
- [ ] `scripts/compile-plugin-data-model.ts` 扩展 — 产出 allowlist + "重新编译无 diff" 断言
- [ ] `src/features/platform-core/plugin-data-access/{facade,contracts,governance-gate,read-verbs}.test.ts`
- [ ] `src/features/platform-core/commands/handlers/plugin-data.test.ts` — 写动词 bus 持久化/replay
- [ ] **A1 spike**：drizzle-zod `createInsertSchema` 在 zod v4 + SQLite text-enum 下行为验证
- [ ] `package.json`：新增 `verify:phase68` + 更新 `verify:phase` alias
- [ ] 框架安装：无需（vitest/tsx 已在）

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | All phase behaviors have automated verification（负样本契约 + 单元 + 漂移闸门全自动） |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
