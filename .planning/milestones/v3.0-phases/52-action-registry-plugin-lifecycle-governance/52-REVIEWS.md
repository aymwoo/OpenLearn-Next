---
phase: 52
reviewers: [gemini, claude, codex, qwen]
reviewed_at: 2026-05-24T00:04:35Z
plans_reviewed:
  - 52-01-PLAN.md
  - 52-02-PLAN.md
  - 52-03-PLAN.md
  - 52-04-PLAN.md
  - 52-05-PLAN.md
  - 52-06-PLAN.md
  - 52-07-PLAN.md
  - 52-08-PLAN.md
---

# Cross-AI Plan Review - Phase 52

## Gemini Review

MCP issues detected. Run /mcp list for status.这是一份针对 Phase 52: Action
Registry & Plugin Lifecycle Governance 实施计划（52-01 至 52-08）的深度评审
报告。

### 1. 总体评价 (Summary)
Phase 52 的整体设计非常严密且具备高度的系统性。它不仅完成了从“功能实现”到“平台
治理”的转型，还成功建立了一套名为“外部五态生命周期”的稳定契约。通过将复杂的插件
依赖、激活状态和卸载语义（Retain vs Cleanup）收口到统一的治理投影（Governance
Projection）中，该阶段解决了 UI 逻辑与后端真相之间的“诚实性”缺口。计划不仅涵盖了
静态合同定义，还深入到了写路径的强制校验（如 Cleanup Token 和有序激活），为后续
AI Agent 运行环境提供了坚实的内核基础。

### 2. 核心优势 (Strengths)
- 契约化分层设计：将内部实现的细分状态（`mounted`/`ready`/`failed`）与对外暴露的
  治理状态（`installed`/`active`/`suspended` 等）解耦，保证了平台契约的长期稳定性。
- 写路径诚实性 (Mutation Honesty)：在 Plan 04 中引入的服务端强制清理令牌
  （Cleanup Token）和依赖感知激活（Dependency-aware activation），确保了破坏性操作
  和生命周期推进不再仅仅依赖 UI 的前端逻辑，而是由 DAL/Command Bus 强制保证。
- 从“诊断”到“自愈”：引入 `plugin.reconcile` 命令（Plan 07），使系统具备了显式的故障
  恢复能力，而不是仅仅停留在显示错误代码上。
- 静态与行为双重门禁：`verify:phase52` 脚本不仅运行 Vitest，还通过静态代码分析防止
  UI 回退到直接消费原始 DTO 的旧模式，这种对“架构漂移”的防御非常出色。
- 严谨的卸载模型：默认保留数据（Retain）的设计符合企业级应用对数据安全的要求，同时
  Cleanup 的显式二次确认流程在用户体验与安全性之间取得了平衡。

### 3. 潜在问题与风险 (Concerns)
- 读路径性能风险 (Severity: LOW)：现在的 Action Catalog 读取需要汇总静态描述符、数
  据库注册记录、依赖图计算和治理投影。随着插件数量增加，这种实时计算拓扑链的方式可
  能会产生一定的延迟。
- 激活链失败处理 (Severity: LOW)：在执行 `plugin.reconcile` 或有序激活时（Plan
  04/07），如果链条中间某个插件激活失败，事务虽然能回滚，但对于操作员而言，复杂的依
  赖报错可能需要更细致的故障归因引导。
- Host Adapter 的 `reasonCode` 耦合 (Severity: LOW)：Host 侧的恢复门禁高度依赖
  `reasonCode` 的精确映射。如果未来新增了阻断类型但未同步更新
  `isReasonMatchedRecoveryAction`，可能会导致合法的恢复操作被意外拦截。

### 4. 改进建议 (Suggestions)
- 增加投影缓存：考虑到插件清单（Manifest）和注册状态是不常变化的，建议在
  `registry.ts` 层面对治理投影结果进行短时间的失效检查或缓存，避免高频请求下重复构建
  依赖图。
- 结构化错误上下文：在诊断视图（Blocked Diagnostics）中，建议除了 `reasonCode`
  外，将缺失的依赖键名（missing dependency keys）以结构化字段返回，而不仅仅是拼接在
  错误字符串里，这将更有利于未来 AI Agent 自动处理修复。
- 强化 Reconcile 日志：在 `plugin.reconcile` 执行过程中，可以在 `governanceAudits`
  中记录更详细的拓扑排序步骤，以便在出现复杂循环依赖时进行事后分析。

### 5. 风险评估 (Risk Assessment)
**风险等级：LOW**

**评估理由：**
该阶段通过 8 份相互关联的计划，形成了一个完整的闭环。它在不破坏现有 Command Bus
边界的前提下，通过“投影层”实现了复杂的治理逻辑。代码中体现了极高的安全性意识（如
对 `src/server/plugins/registry.ts` 权限的冻结，以及对 Cleanup 令牌的校验）。现有的
`verify:phase52` 回归闸门已经覆盖了几乎所有关键契约点，风险主要集中在未来随着插件规
模扩大后的读取性能调优，而非逻辑正确性或安全性。

---

**评审结论：通过 (PASS)**
建议立即执行，该计划为系统的 AI 原生特性提供了极其稳固的扩展基石。

---

## Claude Review

# Cross-AI Plan Review: Phase 52 - Action Registry & Plugin Lifecycle Governance

**Reviewed:** 2026-05-24
**Plans reviewed:** 52-01 through 52-08 (8 plans, 6 waves, all executed)
**Supporting documents:** 52-CONTEXT.md, 52-RESEARCH.md, 52-VERIFICATION.md,
52-REVIEW.md, all 8 SUMMARIES, live implementation files

## Executive Summary

The 8 plans deliver a principled separation of executable catalog from blocked
diagnostics, a clean external five-state lifecycle projection over existing
internal states, and a layered architecture (contracts -> projection -> read
model -> adapters -> UI -> verifier). All 11 requirements are covered, 109
tests pass, and the phase verifier gate exists. However, the existing code
review (`52-REVIEW.md`) identified **3 BLOCKER-class bugs** that remain unfixed
in the implementation, and the plan structure itself reveals significant
mid-execution scope discovery: 5 of 8 plans carry `gap_closure: true`. The
plans were individually well-scoped and TDD-disciplined, but the initial 3-wave
design was optimistic by about 2.7x.

**Overall grade: B/B+ for plan quality, C for initial scope estimation, D for
closing the loop on discovered CR bugs.**

## Per-Plan Analysis

### Plan 52-01: Action Descriptor Contracts & Static Catalog

- Clarity: Excellent. The objective, output, and acceptance criteria are
  precise.
- Scope: Appropriate. Defines contracts only, defers wiring.
- Risk: Low. Pure contract work with no mutation path changes.
- Edge cases: Duplicate key rejection, implementation source lock,
  catalog/diagnostic separation.
- Missing: No test for `registry.ts` being completely empty. Minor.

Strengths: `implementationSource` locking directly fulfills ACTN-05 and the
Phase 50 handoff constraint. The three-way schema split is clean.

Concern: `src/lib/dto/resource-ai.ts` is an odd DTO sink for action catalog
DTOs and suggests expedient coupling.

### Plan 52-02: Lifecycle Governance Projection & Dependency Graph

- Clarity: Good. The five-state mapping is well-documented.
- Scope: Appropriate for Wave 1. Defines projection without wiring.
- Risk: Medium. The external/internal state mapping propagates everywhere.
- Edge cases: Retain uninstall, cycle detection, no auto-recovery,
  chain-only blocking.
- Missing: The plan frontmatter over-claims requirement completion for a
  projection-only deliverable.

Strengths: `recommendedRecoveryAction` is well-thought-out, and banning
`auto-recover` avoids future drift. The distinction between `enabled` and
`active` is semantically crisp.

Concern: LIFE requirements were marked complete before mutation-path
enforcement actually existed.

### Plan 52-03: Registry Wiring & Operator UI

- Clarity: Good. Wiring responsibilities are explicit.
- Scope: Large. Touches host, server actions, and UI at once.
- Risk: Medium-high.
- Edge cases: Blocked diagnostics isolation, external lifecycle in UI,
  verifier pattern.
- Missing: The verifier remained too shallow to catch later CR bugs.

Strengths: `readGovernanceDashboardBundle()` avoids N+1 queries. The task
ordering keeps a 14-file change manageable.

Concern: The blast radius is large and suggests this might have benefited from
an additional split.

### Plan 52-04: Gap Closure - Uninstall & Recovery on Mutation Path

- Clarity: Good. The gap is explicitly named.
- Scope: Heavy for a gap closure. Includes schema change, DAL rewrite,
  handler refactor, and test migration.
- Risk: High.
- Edge cases: Confirmation token validation, retain vs cleanup branching,
  dependency ordering in enable/resume, host recovery gating.
- Missing: The implementation still left CR-01/02/03 unfixed.

Strengths: The deterministic `cleanupConfirmationToken` format is strong, and
the schema change is minimal and non-breaking.

Concern: Discovering schema work this late indicates the initial contract work
did not fully trace durable truth requirements end to end.

### Plan 52-05: UI Rewiring to Governance Read Model

- Clarity: Excellent.
- Scope: Tight.
- Risk: Low.
- Edge cases: Old inference helpers removed, verifier guards against
  regression.

Strengths: This is a principled second-source-of-truth removal plan and is one
of the best-scoped plans in the phase.

Concern: The need for a dedicated cleanup plan reflects earlier parallel old/new
system coexistence.

### Plan 52-06: Retain Uninstall Metadata -> Governance Snapshot

- Clarity: Good.
- Scope: Tight. Read-model wiring only.
- Risk: Low.
- Edge cases: retain -> uninstalled mapping, executable=false, no primary
  actions.

Strengths: The early return in `mapLifecycleState()` is the correct approach.

Concern: This should likely have been part of 52-04 instead of a separate gap
closure.

### Plan 52-07: `plugin.reconcile` Command Family

- Clarity: Good.
- Scope: Right-sized for one command family.
- Risk: Medium.
- Edge cases: blocked-after-attempt handling, activation-chain reuse.
- Missing: CR-03. The default target state is wrong.

Strengths: Good reuse of existing command and activation helpers.

Concern: Defaulting reconcile to `enabled` contradicts the governance
projection's executable-catalog semantics.

### Plan 52-08: Final UI Recovery Dispatch & Verifier Hardening

- Clarity: Good.
- Scope: Tight.
- Risk: Low.
- Edge cases: four recovery actions mapped, uninstalled has no action.
- Missing: CR-01. Retry still lacks a real failed command ID source.

Strengths: `submitRecoveryAction()` is clean and the verifier added useful
static guards.

Concern: Static guard checks are necessary but insufficient for runtime
behavioral correctness.

## Cross-Cutting Analysis

### Where the plans were strong

- Contract-first sequencing in 52-01 and 52-02.
- Consistent threat-model discipline across plans.
- Strong TDD posture and machine-rerunnable phase verifier.
- Willingness to delete obsolete wiring in 52-05.

### Where the plans were weak

- Three correctness bugs from `52-REVIEW.md` remained unfixed.
- Five of eight plans were reactive gap closures, showing substantial
  mid-execution scope discovery.
- `verify:phase52` is too dependent on string-presence guards and focused unit
  suites.
- No integration or E2E plan existed to validate host/operator recovery flows.
- Requirement completion was sometimes marked before the end-to-end behavior was
  actually enforced.

### Risk assessment

| Risk | Severity | Likelihood | Status |
|------|----------|------------|--------|
| CR-01: retry uses fake commandId | High | Certain | Unfixed |
| CR-02: host resume blocked by kill_switch check ordering | High | Certain | Unfixed |
| CR-03: reconcile defaults to wrong target state | High | Certain | Unfixed |
| Schema migration drift (local.db) | Medium | Occurred in 52-04 | Resolved |
| Verifier false-positives | Medium | Ongoing | Warning |
| No E2E/integration tests | Medium | Ongoing | Accepted |

### Suggestions

1. Fix CR-01/02/03 before treating Phase 52 as fully closed.
2. Add `lastFailedCommandId` to the governance read model.
3. Strengthen `verify:phase52` with behavioral assertions:
   - `uses lastFailedCommandId for retry recovery`
   - `allows host plugin.resume when reasonCode=kill_switch`
   - `reconcile returns plugin to executable catalog`
4. Allocate explicit integration/E2E coverage in future phases.
5. Improve planning methodology so full data flow from schema to UI is traced
   earlier.
6. Consider a type-enforced recovery-action dispatch map in 52-08 style code.

## Conclusion

The 8 Phase 52 plans collectively delivered a well-architected governance
system with clean separation of concerns, consistent vocabulary, and a layered
read model. However, the initial 3-wave design underestimated implementation
depth, leading to 5 reactive gap-closure plans. More importantly, 3
BLOCKER-class behavioral bugs survived despite 109 passing tests, indicating
the verification strategy needs behavioral depth beyond static guards.

---

## Codex Review

Codex review failed or returned empty output.

Notes:
- CLI auth was invalid during invocation (`refresh_token_reused`, expired token).
- Reviewer process started but did not return a usable markdown review.

---

## Qwen Review

Qwen review failed or returned empty output.

Notes:
- CLI reported OAuth 免费额度已停用，需要重新 `/auth` 切换 provider。

---

## Consensus Summary

这次 cross-AI review 的有效结果主要来自 `gemini` 与 `claude` 两份评审。两者对 Phase
52 的基础设计评价都偏正面，认为 contract-first layering、governance projection、统一
read model 与 operator surface wiring 的方向是对的；分歧主要在于对“是否已经足够可收口”
的判断。

### Agreed Strengths

- 分层设计清晰：contract -> projection -> read model -> adapters -> UI 的边界基本成立。
- 外部五态 lifecycle 契约设计稳定，内部状态与对外治理状态做了合理解耦。
- 写路径治理比纯 UI 推断更可靠，特别是 cleanup token、dependency-aware activation
  这类 server-enforced 约束。
- `verify:phase52` 作为 phase gate 的方向是对的，具备可重复 rerun 的价值。

### Agreed Concerns

- `verify:phase52` 的防线偏静态，缺少行为级断言，难以兜住 recovery path 的 correctness
  回归。
- Phase 52 在执行过程中出现了较多 gap-closure 计划，说明最初 3-wave 设计低估了端到端数据
  流与写路径约束的复杂度。
- Host/operator recovery 相关 contract 对 `reasonCode`、恢复目标态、失败命令来源等细节比
  较脆弱，未来新增状态或恢复动作时容易再出漂移。

### Divergent Views

- `gemini` 认为当前风险总体偏 LOW，问题更多在未来规模增长后的性能和诊断可观测性。
- `claude` 认为当前仍存在 3 个已知 BLOCKER correctness bugs，因此不能把风险看作低风
  险，且不应把这些问题降级成普通 tech debt。
- 综合现有 `52-REVIEW.md` 与 `claude` 评审，当前更可信的结论是：**架构方向正确，但收口
  状态仍受 CR-01/02/03 影响，Phase 52 的“计划质量”与“实现正确性”需要分开看待。**
