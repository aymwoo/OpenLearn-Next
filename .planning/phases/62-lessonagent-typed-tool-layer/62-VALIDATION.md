---
phase: 62
slug: lessonagent-typed-tool-layer
status: planned
nyquist_compliant: true
wave_0_complete: true
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

> 各 PLAN.md 采用「每 plan Task 1 = 失败测试（RED）、Task 2 = 实现（GREEN）」模式，不设独立 Wave 0 plan：每个测试文件由其所属 plan 的 Task 1 创建（避免独立 Wave 0 因 import 未实现符号而坏掉整套 suite）。Nyquist 由此满足——无连续 3 task 缺自动化 verify。

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 62-01-1 | 01 | 1 | AGENT-04 | T-62-09 | 三条 AI 域事件契约（`.strict()` + summary-only），payload 经 `SummaryRecordSchema` 守卫、禁整包 step | unit | `pnpm vitest run src/features/platform-core/events/contracts.test.ts` | ✅ T1 创建 | ⬜ pending |
| 62-01-2 | 01 | 1 | AGENT-04 | T-62-09 | 实现 Lesson* 事件 schema 并并入 `PlatformDomainEventSchema` 联合（GREEN） | unit | `pnpm vitest run src/features/platform-core/events/contracts.test.ts` | ✅ | ⬜ pending |
| 62-02-1 | 02 | 1 | AGENT-01, AGENT-02 | T-62-01..05 | tool `inputSchema` 拒非法 payload（AGENT-01）+ no-leak 静态断言 execute 不 import DB/env/eval（AGENT-02） | unit + 静态 | `pnpm vitest run src/server/ai/tools/lesson-draft.test.ts src/server/ai/tools/no-leak.test.ts` | ✅ T1 创建 | ⬜ pending |
| 62-02-2 | 02 | 1 | AGENT-01, AGENT-03 | T-62-06,07 | prompts + `createDraftLessonStepTool` factory（teacherId 闭包注入）+ barrel；产出单步 schema 形状、纯生成不落库（GREEN） | unit | `pnpm vitest run src/server/ai/tools/lesson-draft.test.ts` | ✅ | ⬜ pending |
| 62-03-1 | 03 | 2 | AGENT-04 | T-62-09 | handler emit 三事件（eventType + summary-only payload）/ 失败路径无 domain 事件 | unit | `pnpm vitest run src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` | ✅ T1 创建 | ⬜ pending |
| 62-03-2 | 03 | 2 | AGENT-03, AGENT-04 | T-62-08,09 | command 类型 + handler（授权→调 tool→emit/失败抛错）+ registry 注册；step 经 resultSummary 回传（GREEN） | unit | `pnpm vitest run src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` | ✅ | ⬜ pending |
| 62-04-1 | 04 | 3 | AGENT-03, AGENT-04 | T-62-10..13 | 端到端：注入 `persistPlatformEvents` 断言三事件经真实 bus→handler 落账、summary-only、envelope 合法（sentinel pluginId）、失败透传 | integration | `pnpm vitest run src/server/ai/agents/lesson-agent.test.ts` | ✅ T1 创建 | ⬜ pending |
| 62-04-2 | 04 | 3 | AGENT-03, AGENT-04 | T-62-10..13 | `draftLessonStep` 公共入口（构造 envelope→dispatchPlatformCommand→从 resultSummary 取回 step），server-only 边界完整（GREEN） | integration | `pnpm vitest run src/server/ai/agents/lesson-agent.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> 本 phase 不设独立 Wave 0 plan。每个测试文件由其所属 plan 的 **Task 1（RED）** 创建并在 **Task 2（GREEN）** 转绿，下列即各 plan Task 1 的产物清单：

- [ ] `src/features/platform-core/events/contracts.test.ts` —（62-01 Task 1）AGENT-04：三 AI 域事件契约 + summary-only（`SummaryRecordSchema`）
- [ ] `src/server/ai/tools/lesson-draft.test.ts` —（62-02 Task 1）AGENT-01（`inputSchema` 拒非法）/ AGENT-03（单步 schema、纯生成不落库）/ D-04（只读上下文）
- [ ] `src/server/ai/tools/no-leak.test.ts` —（62-02 Task 1，扩展 Phase 61 既有）AGENT-02：tool execute 不 import DB client / 不读 env key / 不可执行任意代码
- [ ] `src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` —（62-03 Task 1）AGENT-04：注入 `persistPlatformEvents` 断言三 eventType + payload 过 `SummaryRecordSchema` + 失败路径无 domain 事件
- [ ] `src/server/ai/agents/lesson-agent.test.ts` —（62-04 Task 1）AGENT-03/04：端到端经真实 bus 三事件落账 + step 经 resultSummary 回传 + 失败透传
- [x] 确认 Vitest 脚本与 config 路径：`vitest.config.mts`；单文件 `pnpm vitest run <file>`；全套 `pnpm test`（=`vitest`），~30s

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 真实 provider 端点起草质量（步骤包贴合度） | AGENT-03 | 依赖真实 LLM 输出，非确定性，不入自动断言（质量 eval 归 Phase 65） | 教师对一节真实课时触发起草，人工核对产出步骤包是否符合学科/年级 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved（planner 回填，2026-05-31）
