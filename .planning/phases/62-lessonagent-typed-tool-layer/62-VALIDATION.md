---
phase: 62
slug: lessonagent-typed-tool-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-31
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest（项目既有，STACK 指定 Vitest + Testing Library + Playwright） |
| **Config file** | `vitest.config.mts`（仓库已有 `*.test.ts`，如 Phase 61 `facade.test.ts` / `no-leak.test.ts`） |
| **Quick run command** | `pnpm vitest run <file>`（planner 在 Wave 0 按实际脚本核实） |
| **Full suite command** | `pnpm test`（package.json `"test": "vitest"`，planner 核实 watch/run 行为） |
| **Estimated runtime** | ~30 秒（按 planner 实测修订） |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run <file>`（对应单文件 quick run）
- **After every plan wave:** Run `pnpm test`（full suite 绿）
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 秒

---

## Per-Task Verification Map

> 占位草稿 —— 任务 ID / Wave / Threat Ref 由 gsd-planner 在 PLAN.md 落定后回填。

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 62-XX-XX | XX | 1 | AGENT-01 | — | 非法 payload 在 tool `inputSchema` 边界被拒，返回校验错误 | unit | `pnpm vitest run <tool>.test.ts` | ❌ W0 | ⬜ pending |
| 62-XX-XX | XX | 1 | AGENT-02 | — | tool `execute` 不导入 DB client / 不读 env key / 不执行任意代码（沿用 no-leak 断言） | unit + 静态 | `pnpm vitest run <no-leak>.test.ts` | ❌ W0 | ⬜ pending |
| 62-XX-XX | XX | 2 | AGENT-03 | — | 教师触发起草，产出符合单步 `content`/`task`/`quiz` schema 的步骤包 DTO（内存返回、不落库） | unit | `pnpm vitest run <tool>.test.ts` | ❌ W0 | ⬜ pending |
| 62-XX-XX | XX | 2 | AGENT-04 | — | 三/四关键节点 typed events 经 Command Bus 落账、summary-only 合规、correlationId 串联 | unit | `pnpm vitest run <events>.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `<tool>.test.ts` — tool 单测：覆盖 AGENT-01（`inputSchema` 拒非法 payload）/ AGENT-03（纯生成、不落库、单步 schema 形状）/ D-04（只读上下文）
- [ ] `<no-leak>.test.ts`（或扩展 Phase 61 既有）— AGENT-02：断言 tool `execute` 边界不导入 DB client、不读 env key、不可执行任意代码
- [ ] `<events>.test.ts` — AGENT-04：注入 `persistPlatformEvents` mock，断言三/四 eventType + payload 通过 `SummaryRecordSchema`（summary-only）
- [ ] （若新增 AI command 类型）`<command-handler>.test.ts` — 覆盖 dispatch → attempt → events 落账链
- [ ] 确认 Vitest 脚本与 config 路径（quick/full 命令与 `vitest.config.mts`）

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 真实 provider 端点起草质量（步骤包贴合度） | AGENT-03 | 依赖真实 LLM 输出，非确定性，不入自动断言（质量 eval 归 Phase 65） | 教师对一节真实课时触发起草，人工核对产出步骤包是否符合学科/年级 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
