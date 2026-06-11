# Phase 76: v4.2 Authoritative Close Gate - Research

**Researched:** 2026-06-11
**Domain:** Milestone close gate scripting, formal verification, proof mapping, cross-plugin regression orchestration
**Confidence:** HIGH

## Summary

Phase 76 是 v4.2 里程碑的权威收关门，完全对标 Phase 74（v4.1 close gate）的 5-wave 结构，扩展为 6-wave/plan：在保留 v4.1 的 `verify:phase` alias（=> `verify:phase72 && verify:phase73-v41-close-gate`）的同时，追加 `verify:phase75` + `verify:v42-cross-plugin` 形成扩展的组合 alias。Phase 76 不新建产品功能、不新增数据库表或迁移、不引入新的外部依赖——所有产出都是 TypeScript 验证脚本、package.json alias 扩展、planning 目录下的文档产物。

核心挑战在于跨插件回归编排：需要让 quiz 全量测试（5 题型 stats + lifecycle + live dashboard）与 homework 全量测试（lifecycle 12 + cross-plugin regression 6）独立运行、独立报告，并且协调 quiz+homework 双绿作为 gate 必要条件。这与 Phase 74 的单插件 close gate 有本质不同——Phase 76 必须解决"第二个插件的 cross-plugin proof 如何融合进既有 gate 流水线"。

**Primary recommendation:** 严格对标 Phase 74 的 5-wave 结构 + Phase 75 的验证基线，采用 6-wave 逐阶段产出：gate 骨架 + alias -> Stage 1-4 验证 -> formal verification + proof mapping -> sign-off + audit。不引入新的外部包，所有脚本复用现有的 `verify-phase73-v41-close-gate.ts` 作为外层 gate 的骨架参考。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gate 脚本骨架 + alias wiring | Shell/package.json | — | package.json scripts 层是唯一 alias 定义点，tsx 脚本处理验证逻辑 |
| Stage 1: v4.0 gate 回归 | Shell/package.json | scripts/ | 复用既有 `verify:phase72`，无需修改 |
| Stage 2: quiz 多题型验证 | Shell/package.json | scripts/ | 复用既有 `verify:phase73` + `verify:phase73-v41-close-gate` |
| Stage 3: homework 全链路验证 | Shell/package.json | vitest | 复用既有 `verify:phase75`（3 quiz + 18 homework tests） |
| Stage 4: 跨插件回归 | Shell/package.json | vitest | 新建 `verify:v42-cross-plugin`，编排 quiz 全量 + homework 全量 + dedicated suite |
| Stage 5: formal verification + proof mapping | Planning layer | — | 产出 `76-VERIFICATION.md` + `v4.2-PROOF-MAP.md`，对标 Phase 74 VERIFICATION.md 的 7-section 结构 |
| Stage 6: sign-off + closeout artifacts | Planning layer | package.json | 产出 `v4.2-MILESTONE-AUDIT.md` + `v4.2-CLOSEOUT.md` + 8-row sign-off ledger |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (tsx) | >=22 | TypeScript 验证脚本运行时 | 既有 gate 脚本全部使用 tsx，无需额外构建步骤 [VERIFIED: codebase] |
| Vitest | 4.1.5 | 测试运行器，用于 `verify:phase75` 和 cross-plugin 回归 | 项目标准测试框架，既有 gate 全部经 vitest 执行 [VERIFIED: codebase] |
| pnpm | 10.33.0 | 包管理器 + 脚本编排 | 项目标准，`verify:phase` alias 全由 pnpm 串联 [VERIFIED: codebase] |
| drizzle-kit | 0.31.10 | 数据库迁移验证（Stage 2/3 间接消费） | 项目标准 ORM 迁移工具 [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 6.0.3 | 类型检查验证 | Stage 5 的 typecheck 步骤需要确认无新增编译错误 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 纯 bash 串联 gate stages | TypeScript (tsx) 验证脚本 | bash 适合简单串联，但 TypeScript 提供更好的错误报告、结构化输出和 reusable gate 骨架 |
| 合并 cross-plugin 到 `verify:phase75` 内部 | 独立 `verify:v42-cross-plugin` | D-04 要求独立编排和独立报告，合并会混淆单插件验证和跨插件回归的职责边界 |

**Installation:**
```bash
# Phase 76 不安装新外部包，所有工具已存在于项目:
# - tsx (devDeps)
# - vitest 4.1.5 (devDeps)
# - pnpm 10.33.0 (全局)
```

**Version verification:**
```bash
pnpm --version  # 10.33.0
npx vitest --version  # 4.1.5
```

## Package Legitimacy Audit

> Phase 76 不安装任何新的外部 npm/pip/cargo 包。所有产出都是 TypeScript 脚本、Markdown 文档、package.json alias 修改和 planning 目录产物。无需审计。

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| N/A (no new packages) | — | — | — | — | — | No packages to audit |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Packages tagged [ASSUMED]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        pnpm verify:phase (v4.2)                          │
│  "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate              │
│   && pnpm verify:phase75 && pnpm verify:v42-cross-plugin"                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  Stage 1: v4.0   │    │  Stage 2: v4.1 quiz  │    │  Stage 3: Phase 75   │
│  gate 回归        │    │  multi-type verify   │    │  homework full-chain │
│                  │    │                      │    │                      │
│ verify:phase72   │    │ verify:phase73        │    │ verify:phase75       │
│ (脚本级复用)       │    │ verify:phase73-       │    │ (3 quiz + 18 hw)     │
│                  │    │   v41-close-gate      │    │                      │
└──────────────────┘    └──────────────────────┘    └──────────────────────┘
                                                            │
          ┌─────────────────────────────────────────────────┘
          ▼
┌──────────────────────────────────────────────────────────────────┐
│               Stage 4: 跨插件回归 (verify:v42-cross-plugin)        │
│                                                                  │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────┐  │
│  │ quiz 全量测试     │   │ homework 全量测试   │   │ cross-plugin │  │
│  │ (5题型 + stats   │ + │ (lifecycle 12    │ + │  dedicated   │  │
│  │  + lifecycle)   │   │  + regression 6)  │   │  suite        │  │
│  └─────────────────┘   └──────────────────┘   └──────────────┘  │
│                          ▲                                       │
│           任一失败即阻断 gate 通过 ──────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                Stage 5: Formal Verification + Proof Mapping       │
│                                                                  │
│  76-VERIFICATION.md (7-section, 对标 Phase 74)                    │
│  v4.2-PROOF-MAP.md (requirement -> plan -> commit -> test)       │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│           Stage 6: Manual Surface Sign-Off + Closeout             │
│                                                                  │
│  8-row Manual Surface Sign-Off Ledger (4 quiz + 4 homework)      │
│  v4.2-MILESTONE-AUDIT.md (新增跨插件 + 泛化修复维度)             │
│  v4.2-CLOSEOUT.md (收关摘要)                                      │
│  verify:phase alias cutover (per D-13)                            │
└──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
.planning/phases/76-v4-2-authoritative-close-gate/
├── 76-01-PLAN.md           # Wave 1: Gate 骨架 + alias 建立
├── 76-02-PLAN.md           # Wave 2: Stage 1+2 验证 (v4.0 + quiz)
├── 76-03-PLAN.md           # Wave 3: Stage 3 验证 (homework)
├── 76-04-PLAN.md           # Wave 4: Stage 4 跨插件回归
├── 76-05-PLAN.md           # Wave 5: Formal verification + proof mapping
├── 76-06-PLAN.md           # Wave 6: Manual sign-off + closeout artifacts + audit
├── 76-VERIFICATION.md      # Formal verification report (Phase 76 产出)
├── 76-MANUAL-SIGNOFF.md    # 8-row sign-off payload (Phase 76 产出)

scripts/
├── verify:v42-cross-plugin.ts  # Stage 4: 跨插件回归入口 (Phase 76 新建)

.planning/milestones/
├── v4.2-MILESTONE-AUDIT.md     # v4.2 审计报告 (Phase 76 产出)
├── v4.2-PROOF-MAP.md           # v4.2 proof mapping (Phase 76 产出)
├── v4.2-CLOSEOUT.md            # v4.2 closeout 摘要 (Phase 76 产出)
```

### Pattern 1: 6-Stage Gate Structure (对标 Phase 74 5-wave 扩展)
**What:** Phase 74 的 5-wave/5-plan 结构（gate 骨架 -> formal verification -> proof mapping -> closeout -> sign-off），Phase 76 扩展为 6-wave/6-plan，插入独立的 cross-plugin regression wave
**When to use:** 多插件 close gate 场景，每个插件有独立验证阶段，跨插件回归需独立编排
**Key insight:** Wave 2-4 的 3 个 plan 对应 Stage 1-4 的验证编排，每个 plan 互不依赖（可调整为并行），Wave 5-6 依赖前序全部通过后执行

### Pattern 2: Outer Gate + Inner Verifiers (Phase 74 D-01/D-02 原样复用)
**What:** 外层 `verify:phase` 只做 close truth（artifact dependencies、manual sign-off、proof-chain wording、alias readiness），内层每个 phase verifier 独立证明产品链路
**Example (Phase 76 扩展版):**
```typescript
// 外层 gate 骨架（对标 scripts/verify-phase73-v41-close-gate.ts 的 818 行结构）
// 核心：不复制产品断言，只消费上游 proof lane + 做 close-truth 检查
// Source: Phase 74-02-PLAN.md + 74-05-PLAN.md 的 D-04 cutover 判定逻辑
```

### Pattern 3: Cross-Plugin Regression as Independent Gate Stage (v4.2 新增)
**What:** 跨插件回归作为独立 Stage 4，quiz 全量 + homework 全量 + dedicated cross-plugin suite，任一失败即阻断
**When to use:** 多插件 close gate 场景
**Example (编排逻辑):**
```typescript
// verify:v42-cross-plugin 的内部结构:
// 1. pnpm vitest run <quiz 全量测试路径>   —— quiz 5题型 + stats + lifecycle
// 2. pnpm vitest run <homework 全量测试路径> —— lifecycle 12 + cross-plugin regression 6
// 3. cross-plugin dedicated checks           —— 把既有 6-case 包装为独立报告
// 三者独立跑，独立报告，任一失败 exit 1
// Source: D-04/D-05/D-06 from 76-CONTEXT.md
```

### Anti-Patterns to Avoid
- **把 Stage 4 合并进 Stage 3:** 跨插件回归的阻断优先级与单插件验证相同，合并会模糊职责边界、绕开 D-04 独立判定要求
- **在 gate 脚本中重跑产品断言:** 外层 gate 应只做 close truth 检查，不复制 inner verifier 的内容（per Phase 74 D-02）
- **提前切换 `verify:phase` alias:** D-13 明确 v4.1 alias 保持冻结，全部扩展在 Phase 76 内部完成后再切
- **结论先于证据（D-12/D-09）:** 产出顺序固定为: gate 骨架 -> 验证 -> proof mapping -> sign-off -> audit
- **在未完成 Manual Sign-Off 前标记 pass:** 8-row ledger 全部 `status: passed` 后才能标记 milestone audit 为 passed（D-08）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gate 阶段编排 | 自定义 orchestration 框架 | pnpm `&&` 链 + TypeScript tsx 脚本 | 既有 62 个 `verify:phaseNN` 全部使用此模式，Phase 74 的 818 行 outer gate 提供了完整的 Stage/Label/StaticCheck/Run 骨架 |
| 跨插件测试调度 | 自定义 test runner | Vitest 的 `vitest run` 命令 | 项目标准，`verify:phase75` 已经用 `pnpm vitest run src/components/learning/quiz-sample-step-card.test.tsx && pnpm vitest run src/plugins/homework/` 模式 |
| 测试报告生成 | 手写 markdown 报告 | Vitest JSON output + 结构化 gate script | 既有 verify-phase73-v41-close-gate.ts 的 `Stage` 输出格式直接复用 |
| Proof mapping | 手动追踪 requirement -> commit | 对标 Phase 74-01 PLAN 的 proof mapping 表格结构 | `73-PROOF-MAPPING.md` 的 5-section 结构（Requirement -> Flow Segment -> Proof Files / Scripts / Tests / User Flow -> Code Seam -> Proof / Archival Artifact -> Purpose -> Dependency / Final Proof Chain / Manual Ledger） |

**Key insight:** Phase 76 的核心增量是"编排"而非"实现"——最大的工作量是把已经存在的 quiz 和 homework 验证脚本正确串联进 gate 骨架，并补全跨插件回归的 dedicated suite。没有需要手写的复杂逻辑，所有模式都有可复用的基线。

## Runtime State Inventory

> Phase 76 是 close gate 阶段——产出全部为脚本和文档，不涉及代码重命名或数据库迁移。但 D-11 要求产出 `v4.2-MILESTONE-AUDIT.md` 等新文件，需确认 planning 目录下的 milestone artifacts 命名不与既有文件冲突。

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | none — Phase 76 不修改数据库 | — |
| Live service config | none — Phase 76 不修改 n8n/Datadog/Tailscale 等 | — |
| OS-registered state | none — 无 OS 级注册变更 | — |
| Secrets/env vars | none — 无 secret key 变更 | — |
| Build artifacts | none — 全部产出为脚本/Markdown 文件 | — |

## Common Pitfalls

### Pitfall 1: `verify:phase` alias 过早切换导致 v4.1 验证链断裂
**What goes wrong:** 在 Phase 76 内部 stage 未全部通过的情况下，把 `verify:phase` 从 `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate` 切到包含 `verify:phase75 && verify:v42-cross-plugin` 的新 alias
**Why it happens:** Phase 74 的 cutover 逻辑是"全部条件成立才切"，但 Phase 76 的 6-wave 周期更长，中间可能忘了 D-13 的冻结约束
**How to avoid:** 在 Wave 1 确定新 alias 目标字符串，但只在 Wave 6 最终 cutover 时才修改 `package.json`。期间任何 wave 的验证脚本通过 `pnpm run` 独立测试即可，不依赖 alias 切换
**Warning signs:** `package.json` 中 `verify:phase` 的值在 Phase 76 前 5 个 wave 期间发生变化

### Pitfall 2: 跨插件回归与单插件验证职责混淆
**What goes wrong:** Stage 4 的 `verify:v42-cross-plugin` 既跑 quiz 全量又跑 homework 全量，导致与 Stage 2/3 的验证重复或职责不清
**Why it happens:** quiz 全量测试在 Stage 2 和 Stage 4 都执行，homework 全量测试在 Stage 3 和 Stage 4 都执行
**How to avoid:** D-04 明确了 Stage 4 的编排——Stage 2/3 是单插件验证（独立可跑），Stage 4 是跨插件回归（dedicated cross-plugin suite + quiz 全量 + homework 全量）。Stage 4 复用 Stage 2/3 中已验证的测试命令，但作为独立 gate 阶段运行，确保"双插件同时存在时不互相破坏"
**Warning signs:** Stage 4 的脚本里出现与 Stage 2/3 完全不同的测试路径（应直接复用相同 vitest 命令）

### Pitfall 3: 8-row sign-off ledger 中的 homework 行缺少真实观察数据
**What goes wrong:** homework 的 4 行（assign/submit/grade/lifecycle）在没有真人观察的情况下标记为 `status: passed`
**Why it happens:** Phase 74 Wave 4（Plan 04）用 `prepare-phase74-observation-targets.ts` 生成了确定性 URL 并等待真人签核。Phase 76 的 homework 行可能需要类似的 observation target 准备脚本
**How to avoid:** Phase 74-04-PLAN 的 preparation + signoff 流程直接复用：先用脚本准备确定性的观察目标 URL，再由真人实际观察后回填 ledger。对标 D-05/D-06 的签核标准
**Warning signs:** sign-off payload 的 `executed_by` 使用占位符、"status: passed" 出现在没有 `session_id` / `observed_url` 的行中

### Pitfall 4: v4.2 audit 框架缺少跨插件 + 泛化修复两个专属维度
**What goes wrong:** v4.2-MILESTONE-AUDIT.md 简单地复制 v4.1 的 4 维度（requirements/phases/integration/flows），没有新增 D-10 要求的跨插件验证 + 泛化修复验证维度
**Why it happens:** v4.1 audit 只有单插件 quiz，不需要跨插件维度；直接套用其结构会遗漏 v4.2 的核心验证目标
**How to avoid:** v4.2 audit 框架设计为 6 维度：requirements/phases/integration/flows（v4.1 carry-forward）+ cross-plugin verification（新增）+ generalization verification（新增）。泛化修复验证维度检查 Phase 75 的 quiz-only 假设消除是否真正生效
**Warning signs:** MILESTONE-AUDIT.md 的 scoring 维度数与 v4.1 完全相同

## Code Examples

Verified patterns from Phase 74 close gate implementation:

### Outer Gate Stage Structure
```typescript
// Source: scripts/verify-phase73-v41-close-gate.ts (818 lines)
// 核心结构复用于 Phase 76 的 outer gate 骨架
export const STAGE_LABELS = [
  "Static gate checks",
  "Upstream proof artifacts",
  "Phase lifecycle bridge",
  "Manual Surface Sign-Off Ledger",
  "Upstream verification",
  "Live dashboard crosswalk",
  "D-04 alias readiness + final cutover",
] as const;

// Phase 76 扩展版:
// Stage 1-2: v4.0 + quiz 回归 (复用既有)
// Stage 3: homework 全链路 (消费 verify:phase75)
// Stage 4: 跨插件回归 (消费 verify:v42-cross-plugin)
// Stage 5: formal verification + proof mapping
// Stage 6: sign-off + closeout artifacts
```

### Pnpm Alias Chain Pattern
```json
// Source: package.json line 78
// v4.1 current:
"verify:phase": "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate"

// v4.2 target (D-02):
"verify:phase": "pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate && pnpm verify:phase75 && pnpm verify:v42-cross-plugin"
// 新增 verify:v42-cross-plugin 脚本条目 (D-05)
```

### Manual Sign-Off Ledger Schema
```markdown
// Source: 73-PROOF-MAPPING.md (4-row ledger, exact schema)
| proof artifact | status | executed_by | executed_at | evidence note |
|---|---|---|---|---|
| /settings/plugins lifecycle surface | `status: passed` | ... | ... | ... |
| ended classroom recap baseline surface | `status: passed` | ... | ... | ... |
| /classroom live-answer tab | `status: passed` | ... | ... | ... |
| multi-type ended-session recap surface | `status: passed` | ... | ... | ... |

// Phase 76 8-row 扩展:
// Quiz 4 rows (carry-forward from v4.1):
//   1. /settings/plugins lifecycle surface
//   2. ended classroom recap baseline surface
//   3. /classroom live-answer tab
//   4. multi-type ended-session recap surface
// Homework 4 rows (D-07):
//   5. homework assign (教师布置作业)
//   6. homework submit (学生提交)
//   7. homework grade (教师批改打分)
//   8. homework lifecycle (uninstall 清理 + 同 pluginKey 重装恢复)
```

### Cross-Plugin Regression Command Structure
```bash
# Source: package.json line 87 + D-04/D-05 from 76-CONTEXT.md
# verify:phase75 current:
pnpm vitest run src/components/learning/quiz-sample-step-card.test.tsx && \
  pnpm vitest run src/plugins/homework/

# verify:v42-cross-plugin target (D-04/D-05):
# 编排 quiz 全量 + homework 全量 + cross-plugin dedicated suite
# 内部编排三类运行，任一失败 exit 1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单插件 close gate (Phase 74) | 多插件 close gate with cross-plugin regression | v4.2 (current) | 新增 Stage 4 跨插件回归、8-row ledger、2 个新 audit 维度 |
| 4-row sign-off ledger (v4.1) | 8-row sign-off ledger (v4.2) | v4.2 (current) | 新增 homework 4 行（assign/submit/grade/lifecycle） |
| 4-dimension audit (v4.1) | 6-dimension audit (v4.2) | v4.2 (current) | 新增 cross-plugin verification + generalization verification |

**Deprecated/outdated:**
- Phase 74 的 `verify:phase` alias 将在 Phase 76 Wave 6 完成时被新 alias 替代（D-13），旧 alias 在 cutover 前继续有效
- `src/features/runtime-platform/__tests__/cross-plugin-regression.test.ts` 不存在——实际位置是 `src/plugins/homework/__tests__/cross-plugin-regression.test.ts`（6 cases），Phase 76 需将其作为 Stage 4 的 sub-suite 纳入

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `src/features/runtime-platform/__tests__/cross-plugin-regression.test.ts` 不存在，实际跨插件回归测试在 `src/plugins/homework/__tests__/cross-plugin-regression.test.ts`（6 cases）| Code Examples, Canonical Refs | MEDIUM — 如果存在另一个 cross-plugin 测试文件，Stage 4 的测试列表需要调整 |
| A2 | Phase 75 的 `verify:phase75` 命令已经能独立通过（14/14 truths verified per 75-VERIFICATION.md） | Stage 3 Design | LOW — Phase 75 VERIFICATION 报告已确认 14/14，但 typecheck 仍有 22 个预存错误 |
| A3 | 8-row sign-off ledger 中 homework 的 4 行需要类似的 observation target preparation 脚本（对标 Phase 74-04） | Pitfall 3 | MEDIUM — 如果 homework 表面可以直接观察而不需要 preparation，则 Wave 6 的 Plan 可以简化 |
| A4 | v4.2 MILESTONE-AUDIT.md 的 audit 脚本命名为 `pnpm audit:v42` | Code Examples | LOW — 如果偏好不同命名（如 `pnpm audit:milestone-v42`），需调整 |

## Open Questions

1. **Observation target preparation for homework surfaces**
   - What we know: Phase 74-04 用了 `prepare-phase74-observation-targets.ts` 生成确定性 `/classroom?...` URL 供人工签核
   - What's unclear: homework 的 4 个 surface（assign/submit/grade/lifecycle）是否也需要类似的 preparation 脚本，还是在已有的 classroom session 中即可观察
   - Recommendation: 在 Wave 6 plan 中参照 Phase 74-04 创建 preparation 脚本，但 homework 的 "assign" 和 "grade" 表面在现有 `/classroom` 路由中即可观察，不需要新建 session

2. **Stage 4 跨插件回归脚本的超时设置**
   - What we know: quiz 全量测试（~100+ tests）+ homework 全量（18 tests）+ dedicated suite（6 cases），单次运行预计 30-60 秒
   - What's unclear: D-05 中的"并发 vs 顺序"选择未锁定——vitest run 是顺序的，但 quiz 和 homework 可以并行 vitest run
   - Recommendation: 采用顺序执行（`&&` 链），确保 quiz 和 homework 在隔离环境中各自报告，失败时能精确定位

3. **v4.2 audit 的 Nyquist compliance 检查**
   - What we know: Phase 75 有 VALIDATION.md（但未确认其存在性和状态），Phase 76 作为 close gate 需要产出自己的 VALIDATION.md
   - What's unclear: Phase 75 的 VALIDATION.md 是否完整、78 个 phase 中哪些需要被 audit 追溯
   - Recommendation: v4.2 audit 的 Nyquist 维度应至少覆盖 Phase 75 + Phase 76，与 v4.1 覆盖 Phase 73 + Phase 74 对应

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tsx gate scripts | ✓ | v24.1.0 | — |
| pnpm | alias chain, script execution | ✓ | 10.33.0 | — |
| tsx | TypeScript script execution | ✓ | devDeps (installed) | — |
| vitest | Test execution (Stage 3/4) | ✓ | 4.1.5 | — |
| drizzle-kit | Schema migration checks (indirect) | ✓ | 0.31.10 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

**Note:** `pnpm verify:phase72` （v4.0 gate）在隔离环境中可能因 `/tmp/opencode/` 下的 libsql 文件不可达而失败——这是 v4.0 遗留的环境问题（已在 v4.1 audit 中标记），非 Phase 76 的责任范围。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.ts` (root level) |
| Quick run command | `pnpm vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts` |
| Full suite command | `pnpm verify:phase` (v4.2 target alias after cutover) |

### Phase Requirements -> Test Map

Phase 76 是 close gate 阶段，不映射到 REQUIREMENTS.md 中的产品需求（MKT-EXT-03 已在 Phase 75 完成）。验证目标来自 76-CONTEXT.md 的 6-stage 设计和 D-01 至 D-13 的锁定决策。

| Requirement | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| D-01/D-02 (6-stage gate) | `verify:phase` alias 串联全部 6 个 stage | integration | `pnpm verify:phase` (post-cutover) | ❌ Wave 1 |
| Stage 1 (v4.0 regression) | `verify:phase72` 通过 | smoke | `pnpm verify:phase72` | ✅ 现有 |
| Stage 2 (quiz verification) | `verify:phase73` + `verify:phase73-v41-close-gate` 通过 | smoke | `pnpm verify:phase73 --smoke && pnpm verify:phase73-v41-close-gate --smoke` | ✅ 现有 |
| Stage 3 (homework verification) | `verify:phase75` 21 tests 全绿 | integration | `pnpm verify:phase75` | ✅ 现有 |
| Stage 4 (cross-plugin regression) | quiz 全量 + homework 全量 + dedicated suite 全部通过 | integration | `pnpm verify:v42-cross-plugin` | ❌ Wave 4 |
| Stage 5 (formal verification) | 76-VERIFICATION.md 符合 7-section 结构 | manual/script | gate script parser check | ❌ Wave 5 |
| Stage 6 (sign-off + audit) | 8-row ledger 全部 `status: passed` | human | manual observation | ❌ Wave 6 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts` (sub-10s)
- **Per wave merge:** 该 wave 对应的 stage script（如 Wave 4: `pnpm verify:v42-cross-plugin`）
- **Phase gate:** `pnpm verify:phase` (v4.2 full alias chain, post-cutover)

### Wave 0 Gaps
- [ ] `scripts/verify:v42-cross-plugin.ts` — 新建，Stage 4 跨插件回归入口
- [ ] `76-VERIFICATION.md` — 新建，formal verification report
- [ ] `v4.2-MILESTONE-AUDIT.md` — 新建，audit framework
- [ ] `v4.2-PROOF-MAP.md` — 新建，proof mapping
- [ ] `v4.2-CLOSEOUT.md` — 新建，closeout summary
- [ ] Gate script test file — 如 `scripts/verify:v42-cross-plugin.test.ts`（对标 Phase 74 的 test）

*Note: Phase 76 的 Wave 0 缺口是预期中的——作为 close gate 阶段，大部分文件是新建产物。Wave 1 负责建立 skeleton，Wave 2-4 逐步填充验证，Wave 5-6 补齐文档。*

## Security Domain

> `security_enforcement` 未在 config.json 中显式设为 false，按规范 absent = enabled。

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 76 不修改 auth 逻辑 |
| V3 Session Management | no | Phase 76 不修改 session 逻辑 |
| V4 Access Control | no | Phase 76 不修改 access control |
| V5 Input Validation | no | Phase 76 纯脚本和文档，无用户输入 |
| V6 Cryptography | no | Phase 76 不涉及加密操作 |

Phase 76 是 close gate 阶段——所有产出为 TypeScript 验证脚本、Markdown 文档、package.json alias 修改。不涉及运行时用户数据、API 端点、数据库操作或任何攻击面扩展。

### Known Threat Patterns for Close Gate Scripting

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Alias tampering — 在条件不满足时提前切换 `verify:phase` | Tampering | D-13 冻结 + Wave 6 exact predicate check（对标 Phase 74 D-04） |
| Proof forgery — sign-off ledger 中 fake `status: passed` | Repudiation | D-05/D-06/D-08 要求真人观察 + `executed_by`/`executed_at`/`evidence note` 非空 |
| Incomplete gate — 跳过某些 stage 但标记整体通过 | Repudiation | 逐 stage 阻断策略（D-06），任一步失败即停止 |

## Sources

### Primary (HIGH confidence)
- Phase 74 CONTEXT.md (5-wave gate structure, 7-section VERIFICATION, D-04 cutover) [CITED: codebase]
- Phase 74 VERIFICATION.md (7-section structure template, observable truths, key link verification pattern) [CITED: codebase]
- Phase 74-01-PLAN.md (proof mapping 5-section structure, 4-row ledger schema, inner verifier pattern) [CITED: codebase]
- Phase 74-05-PLAN.md (D-04 cutover predicate, fast preflight pattern, STATE.md sync) [CITED: codebase]
- Phase 75 VERIFICATION.md (14/14 truths, cross-plugin regression 6 cases, verify:phase75 command) [CITED: codebase]
- Phase 76 CONTEXT.md (6-stage design, D-01 to D-13 locked decisions) [CITED: codebase]
- `package.json` (existing verify scripts, current `verify:phase` alias) [VERIFIED: codebase]
- `vitest.config.ts` (test include patterns, maxWorkers, timeout) [VERIFIED: codebase]
- `scripts/verify-phase73-v41-close-gate.ts` (818 lines, outer gate skeleton) [VERIFIED: codebase]
- `scripts/verify-phase73-quiz-ext.ts` (269 lines, inner verifier pattern) [VERIFIED: codebase]
- `src/plugins/homework/__tests__/cross-plugin-regression.test.ts` (6 cases, mock pattern) [VERIFIED: codebase]
- `src/plugins/homework/__tests__/lifecycle.test.ts` (12 tests, lifecycle verification) [VERIFIED: codebase]
- v4.1-MILESTONE-AUDIT.md (4-dimension audit framework baseline) [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- None — all critical claims verified from codebase or CONTEXT.md locked decisions

### Tertiary (LOW confidence)
- None — no claims depend on unresolved WebSearch results

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified via codebase (`package.json` + vitest config + script files)
- Architecture: HIGH — Phase 74 (5-wave) and Phase 76 CONTEXT.md (6-wave) provide exhaustive canonical patterns
- Pitfalls: HIGH — 4 pitfalls identified from Phase 74 execution lessons + v4.2-specific cross-plugin concerns

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable patterns from Phase 74 close gate, unlikely to change in 30 days)
