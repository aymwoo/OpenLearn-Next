# Phase 74: v4.1 Authoritative Close Gate (Multi-Type + Live Dashboard) - Research

**Researched:** 2026-06-08 [VERIFIED: system date]
**Domain:** authoritative milestone close gate, reusable product verifier layering, proof mapping, manual surface sign-off, alias cutover control [CITED: .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md]
**Confidence:** HIGH [VERIFIED: local codebase + locked phase context + existing v4.0 analog artifacts]

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied verbatim from `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md`. [CITED: .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md]

### Locked Decisions

### Gate Topology
- **D-01:** Phase 74 采用两层验证结构，而不是单层最终闸门。必须先补一个可独立复跑的 `verify:phase73` / `scripts/verify-phase73-quiz-ext.ts`，再由 `verify:phase73-v41-close-gate` 作为 v4.1 authoritative milestone close gate 包在外层。
- **D-02:** 外层 `verify:phase73-v41-close-gate` 只把 `pnpm verify:phase73` 作为上游 proof lane，再补 close-gate 特有检查：final artifact dependencies、manual sign-off、proof-chain wording、alias cutover readiness。外层不重复复制内层产品断言，避免职责混叠。

### Global Alias Cutover
- **D-03:** `package.json` 中全局 `verify:phase` 不提前切换；在 Phase 74 完成前继续保持指向 `verify:phase72`。
- **D-04:** 只有以下条件全部成立，才允许把 `verify:phase` 从 `verify:phase72` 切到 v4.1 新入口：`verify:phase73` 已落库、`verify:phase73-v41-close-gate` 已落库、`73-VERIFICATION.md` / `73-PROOF-MAPPING.md` / `73-CLOSEOUT.md` 三件套存在，且新增的两条 Manual Surface Sign-Off 都已真实 `status: passed`。

### Manual Surface Sign-Off
- **D-05:** 新增的 2 行 Manual Surface Sign-Off Ledger（`/classroom` 实时作答 tab、多题型课后 recap）必须真人观察后才能记为 `status: passed`。脚本、grep、smoke、静态证据只能支撑人工判断，不能替代人工签核。
- **D-06:** `executed_by` 必须填写真实执行观察的人，不要求固定由项目负责人签字；谁实际完成观察，谁留下可审计记录。

### Verification Artifact Shape
- **D-07:** `73-VERIFICATION.md` 正文按用户可见链路组织，而不是按 7 个 gate stages 平铺。至少要覆盖两条产品链路：多题型课后 recap 链路、实时 dashboard 链路。
- **D-08:** `73-VERIFICATION.md` 文末必须附一个显式的 `user flow -> gate stages` 对照区，便于 `73-PROOF-MAPPING.md` 与最终 gate script 回指，不把 stage 映射完全藏到 proof mapping 里。

### Phase Discipline
- **D-09:** 继续继承 D-72.1-16：Phase 74 的产出顺序固定为先 `73-PROOF-MAPPING.md`，再 gate wiring，然后 `73-VERIFICATION.md`，最后 `73-CLOSEOUT.md`。任何让结论先于证据的捷径都应视为 forbidden shortcut。
- **D-10:** Phase 74 以 Phase 73 已交付的产品事实为前提：teacher-only、read-only dashboard；`/classroom` sibling tab；无新事实源；无新增写侧行为。researcher / planner 不应重开这些已锁定决定。

### the agent's Discretion

None — `74-CONTEXT.md` 没有单独的 `the agent's Discretion` 区块。 [VERIFIED: .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

Descriptions are copied from `.planning/REQUIREMENTS.md`; support guidance below is based on current code and locked phase context. [CITED: .planning/REQUIREMENTS.md][VERIFIED: local codebase]

| ID | Description | Research Support |
|----|-------------|------------------|
| QUIZ-EXT-CLOSE-01 | `verify:phase` 脚本扩展。 [CITED: .planning/REQUIREMENTS.md] | 复用 `scripts/verify-phase72-close-gate.ts` 的 stage runner、artifact hard-fail、manual ledger parser；新增内层 `verify:phase73`，外层只包 proof lane 与 close-specific checks。 [VERIFIED: scripts/verify-phase72-close-gate.ts][CITED: 74-CONTEXT.md] |
| QUIZ-EXT-CLOSE-02 | Manual Surface Sign-Off Ledger。 [CITED: .planning/REQUIREMENTS.md] | 复用 `72.1-PROOF-MAPPING.md` 的 locked ledger schema；新增两行必须指向 `/classroom` live-answer tab 与 multi-type recap surface，且只能由真人观察写成 `status: passed`。 [CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md][CITED: 74-CONTEXT.md][VERIFIED: src/components/classroom/live-answer-dashboard-surface.tsx][VERIFIED: src/components/classroom/classroom-session-recap-surface.tsx] |
| QUIZ-EXT-CLOSE-03 | Retro / 归档就绪。 [CITED: .planning/REQUIREMENTS.md] | 三件套必须写回 Phase 73 目录；outer gate 必须 hard-fail on missing artifacts；alias cutover 只能在 docs + gates + real manual sign-off 全齐后发生。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md][VERIFIED: package.json][VERIFIED: scripts/verify-phase72-close-gate.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须保持 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite-first 的项目基线，不应在 close-gate phase 顺手改基础栈。 [CITED: AGENTS.md]
- UI 组件禁止直连数据库；任何 close-gate 研究与计划都不能建议为验证方便而绕开 DAL / Server Actions。 [CITED: AGENTS.md]
- Node.js 20.9+ 是主 runtime；Phase 74 的 verifier / gate 脚本应继续跑在 Node CLI，而不是引入 Edge-only gate 逻辑。 [CITED: AGENTS.md][VERIFIED: package.json]
- Next.js 16 必须显式缓存并在写后更新 tag；Phase 74 只能验证现有 `updateTag(cacheTags.quizStats(...))` 契约，不应重开 caching 设计。 [CITED: AGENTS.md][VERIFIED: src/actions/classroom-actions.ts]
- 设计层必须继续尊重 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`；两条 manual sign-off 都是现有真实 UI 表面的观察，而不是“验证页”或“临时调试页”。 [CITED: AGENTS.md][CITED: 74-CONTEXT.md]
- **Constraint conflict to surface honestly:** `AGENTS.md` 把课堂广播写成 SSE 基线，但 v4.1 REQUIREMENTS / ROADMAP / 当前代码都明确是复用 v2.2 WebSocket-first transport。 [CITED: AGENTS.md][CITED: .planning/REQUIREMENTS.md][CITED: .planning/ROADMAP.md][VERIFIED: src/components/classroom/classroom-ws-client.ts][VERIFIED: src/features/runtime-platform/seams/transport/ws-envelope.ts] 对 Phase 74 的可执行建议是：不要重开 transport 选择；按锁定 phase scope 验证现有 WebSocket path，并禁止新建第二 transport runtime。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md]

## Summary

Phase 74 不是产品扩展 phase，而是 Phase 73 已交付事实的 authoritative close phase。 [CITED: 74-CONTEXT.md] 规划重点不是“再实现 dashboard / recap / multi-type”，而是把这些既有事实收口成一条可独立复跑、可审计、可归档、可条件切换 alias 的 proof chain。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md][VERIFIED: local codebase]

对 planner 最重要的事实有四条。第一，必须采用“两层验证”而不是一个大而全的单层 gate：`verify:phase73` 负责产品 truth，`verify:phase73-v41-close-gate` 负责 outer close truth。 [CITED: 74-CONTEXT.md] 第二，文档顺序受 D-09 锁定：先 `73-PROOF-MAPPING.md`，再 gate wiring，再 `73-VERIFICATION.md`，最后 `73-CLOSEOUT.md`；这比早期 ROADMAP 里的 plan prose 更新、更高优先级。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md] 第三，两条新增 manual rows 只能来自真人观察，脚本最多证明“应该去看哪里”，不能代替签核。 [CITED: 74-CONTEXT.md] 第四，`verify:phase` 当前仍指向 `verify:phase72`，且只有在新 gate、新 artifacts、真实 manual sign-off 都齐备后才允许 cutover。 [VERIFIED: package.json][CITED: 74-CONTEXT.md]

现有代码与 artifacts 已经给出很强的复用骨架：`scripts/verify-phase72-close-gate.ts` 提供 outer gate stage runner / artifact dependency / ledger parser；`scripts/verify-phase71-marketplace-lifecycle.ts` 提供 smoke/full split；`69-VERIFICATION.md` 提供 formal verification scaffold；`72.1-PROOF-MAPPING.md` 与 `72.1-CLOSEOUT.md` 提供 ledger / closeout 语言模板。 [VERIFIED: scripts/verify-phase72-close-gate.ts][VERIFIED: scripts/verify-phase71-marketplace-lifecycle.ts][CITED: .planning/milestones/v4.0-phases/69-interactive-single-choice-quiz-sample-plugin/69-VERIFICATION.md][CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md][CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-CLOSEOUT.md]

**Primary recommendation:** 先规划一个可独立执行的 `verify:phase73`，把 Phase 73 的真实产品 seams、targeted Vitest suites、zero-write guard、WS contract checks 收成内层 truth lane；再规划一个“薄 outer gate” `verify:phase73-v41-close-gate`，只检查 `pnpm verify:phase73`、phase72 bridge regression、三件套存在性、proof-chain wording、manual ledger、alias cutover readiness。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md][VERIFIED: scripts/verify-phase72-close-gate.ts]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `verify:phase73` product verifier | API / Backend | Browser / Client | 它是 Node CLI proof lane，但要证明的对象是 multi-type recap、WS event、teacher dashboard、zero-write posture 等既有产品 seams。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md][VERIFIED: local codebase] |
| `verify:phase73-v41-close-gate` outer milestone gate | API / Backend | — | 它是 package script + Node CLI orchestration / parser / artifact hard-fail，不直接承载 UI truth。 [CITED: 74-CONTEXT.md][VERIFIED: scripts/verify-phase72-close-gate.ts] |
| `/classroom` live-answer manual sign-off | Browser / Client | API / Backend | 观察对象是 `ClassroomControlPanel` 内 sibling tab 与 Zustand 聚合 surface；脚本只能定位和静态断言，不替代视觉签核。 [CITED: 74-CONTEXT.md][VERIFIED: src/components/classroom/classroom-control-panel.tsx][VERIFIED: src/components/classroom/live-answer-dashboard-surface.tsx] |
| Multi-type post-class recap manual sign-off | Frontend Server (SSR) | API / Backend | `ClassroomPage` 在 ended session path 调 `getClassroomSessionRecapDTO`，再由 `ClassroomSessionRecapSurface` 渲染。 [VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/lib/dal/classroom.ts][VERIFIED: src/components/classroom/classroom-session-recap-surface.tsx] |
| Proof artifacts (`73-PROOF-MAPPING.md`, `73-VERIFICATION.md`, `73-CLOSEOUT.md`) | API / Backend | — | 这些是 Node / doc pipeline 产物，outer gate 会把它们当 hard dependency；它们不属于运行时 UI 层。 [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md][VERIFIED: scripts/verify-phase72-close-gate.ts] |
| `verify:phase` alias cutover | API / Backend | — | 实际控制点在 `package.json` script wiring，不在 UI 层；切换条件由 close gate 与 manual ledger 共同把关。 [VERIFIED: package.json][CITED: 74-CONTEXT.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `24.1.0` installed; project minimum `20.9+` [VERIFIED: `node --version`][CITED: AGENTS.md] | 运行 phase verifier / close-gate scripts | 现有 `verify:phase72` 与所有 phase scripts 都在 Node CLI 上执行；Phase 74 无需引入第二执行 runtime。 [VERIFIED: package.json][VERIFIED: scripts/verify-phase72-close-gate.ts] |
| pnpm | `10.33.0` installed [VERIFIED: `pnpm --version`] | 统一脚本入口 | `verify:phase72`、`verify:phase69`、`verify:phase70`、`test:live-answer-zero-write` 都通过 pnpm scripts 暴露。 [VERIFIED: package.json] |
| `tsx` | `4.22.3` installed; latest `4.22.4` published `2026-05-31` [VERIFIED: `pnpm exec tsx --version`][VERIFIED: npm registry] | 直接执行 TypeScript verifier scripts | 现有 close gate 与 phase verifiers 都依赖 `tsx` / `--import tsx`，所以 Phase 74 应复用同一 runner grammar。 [VERIFIED: package.json][VERIFIED: scripts/verify-phase72-close-gate.ts] |
| Vitest | `4.1.5` installed; latest `4.1.8` published `2026-06-01` [VERIFIED: `pnpm exec vitest --version`][VERIFIED: npm registry] | 运行 targeted proof suites | 现有 phase validation 与 classroom/transport/component tests 都已基于 Vitest，`vitest.config.mts` 也已落库。 [VERIFIED: vitest.config.mts][VERIFIED: package.json] |
| Next.js | `16.2.4` installed; latest `16.2.7` on npm [VERIFIED: package.json][VERIFIED: npm registry] | 提供被签核的 `/classroom` 与 recap surfaces | 两条 manual sign-off 都落在现有 App Router page / surfaces 上；Phase 74 只验证这些 surfaces，不改框架。 [VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/components/surfaces/classroom-console-surface.tsx] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | `5.0.14` installed; latest `5.0.14` published `2026-05-28` [VERIFIED: package.json][VERIFIED: npm registry] | live dashboard client aggregation baseline | `verify:phase73` 应把 `live-answer-dashboard-store.ts` / tests 作为上游 product proof，而不是重做另一个 live aggregation harness。 [VERIFIED: src/components/classroom/live-answer-dashboard-store.ts][VERIFIED: src/components/classroom/live-answer-dashboard-store.test.ts] |
| `ws` | `8.20.1` installed [VERIFIED: package.json] | 既有 WebSocket transport test target | inner verifier 需要吸收 `ws-envelope` / `ws-adapter` / fanout tests，对 teacher-only live answer path 给出 product proof。 [VERIFIED: src/features/runtime-platform/seams/transport/ws-envelope.test.ts][VERIFIED: src/features/runtime-platform/seams/transport/ws-adapter.test.ts][VERIFIED: src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts] |
| `@testing-library/react` | `16.3.2` installed [VERIFIED: package.json] | 现有 dashboard / recap surface tests | 已有 `live-answer-dashboard-surface.test.tsx` 与 `classroom-control-panel.test.tsx` 可直接复用。 [VERIFIED: src/components/classroom/live-answer-dashboard-surface.test.tsx][VERIFIED: src/components/classroom/classroom-control-panel.test.tsx] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two-layer `verify:phase73` + outer close gate | Single monolithic `verify:phase73-v41-close-gate` | 已被 D-01 / D-02 明确否决；单层 gate 会把 product truth 与 close truth 混在一起。 [CITED: 74-CONTEXT.md] |
| Reusing `scripts/verify-phase72-close-gate.ts` skeleton | 新写一套 gate framework | 没必要；现有 skeleton 已包含 stage runner、artifact hard-fail、manual ledger parser。 [VERIFIED: scripts/verify-phase72-close-gate.ts] |
| Reusing deterministic markdown ledger parsing | 引入 AST/MD parser dependency | 当前仓库已证明 deterministic token parser 足够稳定，且更容易被 gate smoke 复现。 [VERIFIED: scripts/verify-phase72-close-gate.ts][CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md] |

**Installation:**
```bash
# No new npm packages are required for Phase 74.
pnpm install
```

**Version verification:**
- `node --version` → `v24.1.0`. [VERIFIED: bash]
- `pnpm --version` → `10.33.0`. [VERIFIED: bash]
- `pnpm exec vitest --version` → `4.1.5`; `npm view vitest version` → `4.1.8`; `npm view vitest time --json` shows `4.1.8` published `2026-06-01T08:14:50.474Z`. [VERIFIED: bash][VERIFIED: npm registry]
- `pnpm exec tsx --version` → `4.22.3`; `npm view tsx version` → `4.22.4`; `npm view tsx time --json` shows `4.22.4` published `2026-05-31T12:22:19.330Z`. [VERIFIED: bash][VERIFIED: npm registry]
- `npm view zustand version` → `5.0.14`; `npm view zustand time --json` shows `5.0.14` published `2026-05-28T10:17:58.249Z`. [VERIFIED: npm registry]
- `package.json` pins `next@16.2.4`; `npm view next version` → `16.2.7`; `npm view next time --json` shows `16.2.4` published `2026-04-15T22:33:47.905Z`. [VERIFIED: package.json][VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Phase 73 product facts already exist in code/tests
    │
    ├── multi-type recap truth
    │     ├── submitQuizSampleAnswer()
    │     ├── buildQuizSampleRecapStats()
    │     └── ClassroomSessionRecapSurface
    │
    └── live dashboard truth
          ├── produceQuizAnswerReceived()
          ├── quizAnswerReceivedHandler -> publishTransportEvent()
          ├── ws-connection-registry teacher-only filter
          └── ClassroomControlPanel -> LiveAnswerDashboardSurface -> Zustand store
    │
    ▼
`verify:phase73`  (inner verifier / product truth lane)
    ├── targeted Vitest suites
    ├── zero-write guard script
    ├── static seam checks for schema + ws + route + dashboard
    └── smoke/full mode for repeatable replay
    │
    ▼
`73-PROOF-MAPPING.md`  (must land first)
    ├── requirement -> flow -> proof tables
    └── manual sign-off ledger rows (existing baseline + 2 new v4.1 rows)
    │
    ▼
`verify:phase73-v41-close-gate`  (outer authoritative close gate)
    ├── package script wiring checks
    ├── upstream `pnpm verify:phase73`
    ├── phase72 bridge regression checks
    ├── final-artifact dependency checks
    ├── proof-chain wording checks
    ├── manual ledger parser
    └── alias-cutover readiness checks
    │
    ├── if any proof/doc/manual row missing -> hard fail
    └── if all pass -> enables `73-VERIFICATION.md` + `73-CLOSEOUT.md`
    │
    ▼
Conditional alias cutover
`verify:phase` stays on `verify:phase72`
    └── only flips after D-04 conditions are all true
```

### Recommended Project Structure

```text
scripts/
├── verify-phase72-close-gate.ts              # existing outer-gate analog [reuse]
├── verify-phase73-quiz-ext.ts                # new inner verifier [add]
├── verify-phase73-v41-close-gate.ts          # new outer gate [add]
└── verify-live-answer-zero-write.ts          # existing dashboard zero-write guard [reuse]

.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/
├── 73-PROOF-MAPPING.md                       # must land first [add]
├── 73-VERIFICATION.md                        # user-flow-first formal verification [add]
└── 73-CLOSEOUT.md                            # final conclusion, last [add]

package.json                                  # adds verify:phase73 / verify:phase73-v41-close-gate / optional alias cutover
```

### Pattern 1: Thin Outer Gate, Strong Inner Verifier
**What:** `verify:phase73` owns product assertions; `verify:phase73-v41-close-gate` owns milestone-close assertions. [CITED: 74-CONTEXT.md]
**When to use:** Whenever a milestone close gate needs to stay authoritative without duplicating every product seam. [CITED: 74-CONTEXT.md]
**Example:**
```typescript
// Source: scripts/verify-phase72-close-gate.ts
const finalArtifactChecks = verifyFinalArtifactDependencies();
const signOffChecks = verifyManualSignOffLedger();
const finalArtifactStage = summariseStaticChecks(
  "Final-artifact dependencies + manual sign-off ledger",
  [...finalArtifactChecks, ...signOffChecks],
);
```

### Pattern 2: Smoke / Full Split for Repeatable Proof
**What:** Keep a fast `--smoke` lane for static + isolated proof, and a default/full lane that also runs targeted suites. [VERIFIED: scripts/verify-phase71-marketplace-lifecycle.ts][VERIFIED: scripts/verify-phase72-close-gate.ts]
**When to use:** `verify:phase73` should be fast enough for authoring replay but still able to run a full targeted suite in CI / final gate. [CITED: .planning/ROADMAP.md]
**Example:**
```typescript
// Source: scripts/verify-phase71-marketplace-lifecycle.ts
const smokeOnly = process.argv.includes("--smoke");

console.log("[1/3] Static seam checks...");
console.log("[2/3] Focused vitest stage...");
console.log("[3/3] Isolated SQLite proof stage...");
```

### Pattern 3: Manual Surface Sign-Off Ledger Uses Locked Schema
**What:** Every executed row must contain `proof artifact`, literal `status: passed`, `executed_by`, `executed_at`, and `evidence note`. [CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md]
**When to use:** Both new v4.1 rows and any carried-forward baseline rows the outer gate counts locally. [CITED: .planning/ROADMAP.md]
**Example:**
```markdown
| field | value |
|-------|-------|
| proof artifact | `src/app/(classroom)/classroom/page.tsx` + `src/components/classroom/live-answer-dashboard-surface.tsx` |
| status | `status: passed` |
| executed_by | <real observer> |
| executed_at | <ISO timestamp> |
| evidence note | <what the human actually saw> |
```

### Pattern 4: VERIFICATION.md Must Follow User Flows, Then Crosswalk Back to Stages
**What:** 正文先讲“多题型 recap 链路”和“live dashboard 链路”，最后再给 `user flow -> gate stages` 对照区。 [CITED: 74-CONTEXT.md]
**When to use:** Writing `73-VERIFICATION.md`; do not dump stage logs as the main body. [CITED: 74-CONTEXT.md]
**Example:**
```markdown
## Goal Achievement
### Observable Truths
### Required Artifacts
### Key Link Verification
### Data/Control-Flow Trace
### Behavioral Spot-Checks
### Requirements Coverage
### Human Verification
### user flow -> gate stages
```

### Anti-Patterns to Avoid
- **Single monolithic gate:** Violates D-01 / D-02 and makes product truth / close truth drift together. [CITED: 74-CONTEXT.md]
- **Outer gate reasserts all product seams again:** Locked scope says outer gate should consume `pnpm verify:phase73` as proof lane instead of cloning its assertions. [CITED: 74-CONTEXT.md]
- **Conclusion before evidence:** `73-VERIFICATION.md` or `73-CLOSEOUT.md` written before `73-PROOF-MAPPING.md` and gate wiring is a forbidden shortcut. [CITED: 74-CONTEXT.md]
- **Auto-passing manual rows:** Static evidence can seed a row template, but D-05 / D-06 forbid using automation as the final human sign-off. [CITED: 74-CONTEXT.md]
- **Writing close artifacts under Phase 74 directory:** Context explicitly says Phase 74 writes the three close artifacts back into the Phase 73 directory. [CITED: 74-CONTEXT.md]
- **Cutting `verify:phase` over early:** Current alias still points at `verify:phase72`; changing it before D-04 conditions are satisfied would break the locked governance posture. [VERIFIED: package.json][CITED: 74-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Outer close-gate framework | Brand-new stage runner / reporting engine | `scripts/verify-phase72-close-gate.ts` skeleton [VERIFIED: scripts/verify-phase72-close-gate.ts] | It already has package wiring checks, artifact hard-fails, bridge stages, smoke/full behavior, and deterministic ledger parsing. [VERIFIED: scripts/verify-phase72-close-gate.ts] |
| Manual ledger schema | New markdown shape | `72.1-PROOF-MAPPING.md` ledger schema [CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md] | The existing parser pattern is token-based; schema drift would immediately make the gate brittle. [VERIFIED: scripts/verify-phase72-close-gate.ts] |
| Zero-write proof for dashboard | Another ad hoc grep script | `scripts/verify-live-answer-zero-write.ts` [VERIFIED: scripts/verify-live-answer-zero-write.ts] | The guard already checks forbidden write verbs and action imports on the exact live dashboard surface. [VERIFIED: scripts/verify-live-answer-zero-write.ts] |
| Phase 73 transport proof harness | Fresh mock-heavy websocket harness | Existing transport/component tests already covering envelope, adapter, fanout parity, live view, and control-panel tab state [VERIFIED: src/features/runtime-platform/seams/transport/ws-envelope.test.ts][VERIFIED: src/features/runtime-platform/seams/transport/ws-adapter.test.ts][VERIFIED: src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts][VERIFIED: tests/classroom/live-view.test.ts][VERIFIED: src/app/(classroom)/classroom/page.test.tsx] | Reuse gives higher confidence and avoids proving a second synthetic path instead of the real one. [VERIFIED: local codebase] |
| Formal verification document shape | New prose-only report format | `69-VERIFICATION.md` / `72-VERIFICATION.md` scaffold [CITED: .planning/milestones/v4.0-phases/69-interactive-single-choice-quiz-sample-plugin/69-VERIFICATION.md][CITED: .planning/milestones/v4.0-phases/72-end-to-end-verify-phase-close-gate/72-VERIFICATION.md] | The repo already expects table-first, evidence-first verification docs. [CITED: .planning/milestones/v4.0-phases/69-interactive-single-choice-quiz-sample-plugin/69-VERIFICATION.md] |

**Key insight:** Phase 74 should add almost no new product logic; it should mostly recompose existing proof assets into a stronger milestone-close grammar. [CITED: 74-CONTEXT.md][VERIFIED: local codebase]

## Common Pitfalls

### Pitfall 1: Planning from the earlier ROADMAP prose instead of the newer locked CONTEXT order
**What goes wrong:** Planner writes `73-VERIFICATION.md` first because Plan 74-01 prose says so, then tries to backfill proof mapping later. [CITED: .planning/ROADMAP.md]
**Why it happens:** `74-CONTEXT.md` post-dates the roadmap and explicitly changes the close order to proof-mapping first. [CITED: 74-CONTEXT.md]
**How to avoid:** Treat `74-CONTEXT.md` as the newest authority and plan `73-PROOF-MAPPING.md` before any final verification/closeout writing. [CITED: 74-CONTEXT.md]
**Warning signs:** Any task list that places `73-CLOSEOUT.md` or `73-VERIFICATION.md` before proof mapping / gate wiring is wrong. [CITED: 74-CONTEXT.md]

### Pitfall 2: Outer gate duplicates the inner verifier and becomes impossible to maintain
**What goes wrong:** `verify:phase73-v41-close-gate` rechecks every recap/dashboard seam directly, so any future product tweak must be updated twice. [CITED: 74-CONTEXT.md]
**Why it happens:** It is tempting to copy Phase 72’s “bridge-stage” pattern literally without adapting to the new two-layer topology. [VERIFIED: scripts/verify-phase72-close-gate.ts][CITED: 74-CONTEXT.md]
**How to avoid:** Put product truth in `verify:phase73`; make the outer gate consume that command plus artifact/manual/alias checks only. [CITED: 74-CONTEXT.md]
**Warning signs:** Outer gate contains direct multi-type DAL assertions, WS payload assertions, or dashboard zero-write regexes that already live in inner-verifier sources. [CITED: 74-CONTEXT.md][VERIFIED: local codebase]

### Pitfall 3: Fake manual sign-off
**What goes wrong:** Rows are marked `status: passed` based only on static tests, smoke output, or executor placeholders. [CITED: 74-CONTEXT.md]
**Why it happens:** The v4.0 analog seeded rows from executor evidence, so it is easy to cargo-cult that pattern into a stricter v4.1 requirement. [CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md][CITED: 74-CONTEXT.md]
**How to avoid:** Seed row templates if needed, but reserve a final explicit operator step that replaces placeholders with the real observer, real timestamp, and real evidence note. [CITED: 74-CONTEXT.md]
**Warning signs:** `executed_by` repeats a generic executor label without any corresponding human observation step in the plan. [CITED: 74-CONTEXT.md]

### Pitfall 4: Alias cutover gets bundled into “finish the phase” regardless of readiness
**What goes wrong:** `verify:phase` is switched to the v4.1 gate even though artifacts or manual rows are still incomplete. [VERIFIED: package.json][CITED: 74-CONTEXT.md]
**Why it happens:** Alias change looks trivial in `package.json`, but it is actually the final governance action for the milestone. [VERIFIED: package.json][CITED: 74-CONTEXT.md]
**How to avoid:** Plan alias cutover as a last, conditional task with a no-cutover fallback if D-04 is not fully satisfied. [CITED: 74-CONTEXT.md]
**Warning signs:** A task list that edits `package.json` before the three Phase 73 close artifacts and manual rows exist. [VERIFIED: package.json][CITED: 74-CONTEXT.md]

### Pitfall 5: Verifying the wrong UI surface path
**What goes wrong:** Planner targets `src/app/(teacher)/classroom/*` or a hypothetical dashboard route, missing the actual live classroom path. [CITED: .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-02-SUMMARY.md]
**Why it happens:** Earlier planning prose used a wrong route family; Phase 73 fixed this during implementation. [CITED: .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-02-SUMMARY.md]
**How to avoid:** Anchor all manual and static checks to `src/app/(classroom)/classroom/page.tsx`, `ClassroomConsoleSurface`, and `ClassroomControlPanel`. [VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/components/surfaces/classroom-console-surface.tsx][VERIFIED: src/components/classroom/classroom-control-panel.tsx]
**Warning signs:** Any new task references a non-existent teacher-only route or proposes a new route just for verification. [CITED: 74-CONTEXT.md][VERIFIED: local codebase]

## Code Examples

Verified patterns from the current codebase:

### Outer gate merges artifact checks and manual ledger checks
```typescript
// Source: scripts/verify-phase72-close-gate.ts
const finalArtifactChecks = verifyFinalArtifactDependencies();
const signOffChecks = verifyManualSignOffLedger();
const finalArtifactStage = summariseStaticChecks(
  "Final-artifact dependencies + manual sign-off ledger",
  [...finalArtifactChecks, ...signOffChecks],
);
```

### Teacher-only live-answer delivery is enforced at the connection registry
```typescript
// Source: src/features/runtime-platform/seams/transport/ws-connection-registry.ts
if (
  envelope.kind === "quiz.answer.received" &&
  connection.owner.actorScope !== "teacher"
) {
  continue;
}

connection.socket.send(payload);
```

### Durable submit path emits `quiz.answer.received` only after the append-only write succeeds
```typescript
// Source: src/lib/dal/classroom.ts
await produceQuizAnswerReceived({
  actorId: user.id,
  schoolId: classRow.schoolId,
  payload: {
    questionId: payload.stepId,
    studentId: user.id,
    responseType: payload.questionType,
    payload: payload.selectedOption,
    receivedAt: Date.now(),
    classroomSessionId: session.id,
  },
});
```

### `/classroom` already carries the live-answer tab state through the real page/surface chain
```tsx
// Source: src/app/(classroom)/classroom/page.tsx
const requestedTab = resolvedSearchParams?.tab === 'live-answer' ? 'live-answer' : 'control';

<ClassroomConsoleSurface
  consoleData={consoleData}
  initialSnapshot={snapshot}
  recap={recap}
  studentDetail={studentDetail}
  activeDetailTab={detailTab}
  activeConsoleTab={requestedTab}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `verify:phase` is a single v4.0 alias to `verify:phase72`. [VERIFIED: package.json] | v4.1 keeps that alias frozen until the new inner verifier, outer gate, three close artifacts, and two real manual rows all exist. [CITED: 74-CONTEXT.md] | Locked on 2026-06-08 context gather. [CITED: 74-CONTEXT.md] | Alias cutover is a conditional close task, not a default script edit. [CITED: 74-CONTEXT.md] |
| v4.0 outer gate directly bridges upstream phases 67→71 and enforces final-artifact + ledger checks in one script. [VERIFIED: scripts/verify-phase72-close-gate.ts] | v4.1 introduces a reusable inner verifier `verify:phase73` and keeps the outer gate thin around that proof lane. [CITED: 74-CONTEXT.md] | Locked on 2026-06-08. [CITED: 74-CONTEXT.md] | Product truth moves inward; outer gate remains authoritative without duplicating product assertions. [CITED: 74-CONTEXT.md] |
| v4.0 proof mapping ledger has 2 executed manual rows (`/settings/plugins`, ended recap). [CITED: .planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md] | v4.1 success criteria expect 4 rows total once the 2 new live-dashboard / multi-type-recap rows are added. [CITED: .planning/ROADMAP.md] | v4.1 roadmap drafted 2026-06-07. [CITED: .planning/ROADMAP.md] | Phase 74 planning must decide how all 4 rows are represented locally so the parser can count them deterministically. [CITED: .planning/ROADMAP.md][VERIFIED: scripts/verify-phase72-close-gate.ts] |
| Phase 69 VERIFICATION report proves a product chain with a table-first scaffold. [CITED: .planning/milestones/v4.0-phases/69-interactive-single-choice-quiz-sample-plugin/69-VERIFICATION.md] | Phase 74 must reuse that scaffold but change the narrative order to user-visible recap/dashboard flows plus a stage crosswalk footer. [CITED: 74-CONTEXT.md] | Locked on 2026-06-08. [CITED: 74-CONTEXT.md] | Planner should not write a stage-dump report. [CITED: 74-CONTEXT.md] |

**Deprecated/outdated:**
- **Single-layer final gate only:** Replaced by the locked two-layer topology in D-01 / D-02. [CITED: 74-CONTEXT.md]
- **Executor-only seeded manual pass rows as final evidence:** Replaced by the stricter “real observer only” rule in D-05 / D-06. [CITED: 74-CONTEXT.md]
- **Any plan order that writes closeout before proof mapping:** Explicitly forbidden by D-09. [CITED: 74-CONTEXT.md]

## Resolved Questions

1. **(RESOLVED) `verify:phase72` sequencing lives in `package.json#verify:phase`, not inside `verify:phase73-v41-close-gate`.**
   - Resolution: keep the outer v4.1 gate single-purpose per D-02. `verify:phase73-v41-close-gate` may run only `pnpm verify:phase73` as its upstream product proof lane. The milestone-level composition with `verify:phase72` belongs to the global alias in `package.json`, and only after D-04 is fully satisfied. Before cutover, `verify:phase` stays exactly `pnpm verify:phase72`. After cutover, the only accepted composed alias is `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate`. [CITED: 74-CONTEXT.md][VERIFIED: package.json][CITED: .planning/ROADMAP.md]

2. **(RESOLVED) `73-PROOF-MAPPING.md` must inline all 4 manual rows in one file.**
   - Resolution: use a single authoritative ledger in Phase 73's proof-mapping artifact. The file must carry the 2 v4.0 carried-forward rows plus the 2 v4.1 rows for `/classroom` live-answer and multi-type recap. The outer gate must enforce 4 passed rows total and separately verify that the two new rows correspond to the v4.1 surfaces. Do not aggregate manual-row counts across multiple markdown files. [CITED: .planning/ROADMAP.md][CITED: 74-CONTEXT.md][VERIFIED: scripts/verify-phase72-close-gate.ts]

3. **(RESOLVED) real manual observation is an in-phase blocking checkpoint before final closeout and alias cutover.**
   - Resolution: the planner must schedule a blocking human-verification step inside Phase 74. A real observer supplies `executed_by`, `executed_at`, and `evidence note` for both v4.1 surfaces on the real `/classroom` paths. Only after those values are written into `73-PROOF-MAPPING.md`, the final readiness check may decide whether alias cutover is allowed. If the checkpoint is not completed, the valid fallback is to keep `verify:phase` on `verify:phase72` and mark cutover as blocked. [CITED: 74-CONTEXT.md][VERIFIED: package.json]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All verifier / gate scripts | ✓ [VERIFIED: bash] | `24.1.0` [VERIFIED: bash] | — |
| pnpm | `package.json` verify ladder | ✓ [VERIFIED: bash] | `10.33.0` [VERIFIED: bash] | npm can inspect versions, but repo script wiring is pnpm-native. [VERIFIED: package.json] |
| npm | Registry version checks during research / maintenance | ✓ [VERIFIED: bash] | `10.33.0` [VERIFIED: `npm --version`] | — |
| `tsx` | TypeScript script execution | ✓ [VERIFIED: bash] | local `4.22.3` [VERIFIED: `pnpm exec tsx --version`] | direct `tsx` bin is already present; no fallback needed. [VERIFIED: local environment] |
| Vitest | targeted suites inside inner verifier | ✓ [VERIFIED: bash] | local `4.1.5` [VERIFIED: `pnpm exec vitest --version`] | — |

**Missing dependencies with no fallback:**
- None identified in the local execution environment. [VERIFIED: bash]

**Missing dependencies with fallback:**
- None identified in the local execution environment. [VERIFIED: bash]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.5` + Node CLI verifier scripts via `tsx` `4.22.3`. [VERIFIED: `pnpm exec vitest --version`][VERIFIED: `pnpm exec tsx --version`] |
| Config file | `vitest.config.mts`. [VERIFIED: vitest.config.mts] |
| Quick run command | `pnpm test:live-answer-zero-write && pnpm vitest run src/components/classroom/live-answer-dashboard-store.test.ts src/components/classroom/live-answer-dashboard-surface.test.tsx src/features/runtime-platform/seams/transport/ws-envelope.test.ts src/features/runtime-platform/seams/transport/ws-adapter.test.ts src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts tests/classroom/live-view.test.ts "src/app/(classroom)/classroom/page.test.tsx" src/components/classroom/classroom-control-panel.test.tsx src/lib/dal/classroom.test.ts` — recommended baseline for inner `verify:phase73`. [VERIFIED: package.json][CITED: .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-02-SUMMARY.md] |
| Full suite command | `pnpm vitest run` during local regression; phase-specific full gate should eventually be `pnpm verify:phase73 && pnpm verify:phase73-v41-close-gate`. [VERIFIED: package.json][CITED: 74-CONTEXT.md] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUIZ-EXT-CLOSE-01 | Inner verifier proves multi-type recap + live dashboard product seams; outer gate proves close wiring only. [CITED: 74-CONTEXT.md] | smoke + targeted integration | `pnpm verify:phase73 --smoke` and `pnpm verify:phase73-v41-close-gate --smoke` (to be added). [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md] | ❌ Wave 0 — both scripts are currently absent. [VERIFIED: grep / glob] |
| QUIZ-EXT-CLOSE-02 | Manual Surface Sign-Off Ledger exists with locked schema and required rows. [CITED: .planning/REQUIREMENTS.md][CITED: 74-CONTEXT.md] | static gate + human/manual | `pnpm verify:phase73-v41-close-gate --smoke` should fail until ledger rows and fields are complete. [CITED: .planning/ROADMAP.md][VERIFIED: scripts/verify-phase72-close-gate.ts analog] | ❌ Wave 0 — `73-PROOF-MAPPING.md` does not exist yet. [VERIFIED: grep / glob] |
| QUIZ-EXT-CLOSE-03 | Phase 73 directory contains `73-VERIFICATION.md`, `73-PROOF-MAPPING.md`, `73-CLOSEOUT.md`; alias cutover only if ready. [CITED: .planning/REQUIREMENTS.md][CITED: 74-CONTEXT.md] | static artifact gate + script wiring | `pnpm verify:phase73-v41-close-gate --smoke`; after all conditions, `pnpm verify:phase`. [CITED: 74-CONTEXT.md][VERIFIED: package.json][VERIFIED: scripts/verify-phase72-close-gate.ts analog] | ❌ Wave 0 — artifacts and scripts are absent; alias still points to phase72. [VERIFIED: package.json][VERIFIED: grep / glob] |

### Sampling Rate
- **Per task commit:** run the smallest targeted suite plus `pnpm test:live-answer-zero-write`. [VERIFIED: package.json][CITED: .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-02-SUMMARY.md]
- **Per wave merge:** run `pnpm verify:phase73 --smoke` once the inner verifier exists. [CITED: 74-CONTEXT.md]
- **Phase gate:** run `pnpm verify:phase73-v41-close-gate --smoke`; only after real manual sign-off and final docs are ready should the planner consider `pnpm verify:phase` cutover. [CITED: 74-CONTEXT.md][VERIFIED: package.json]

### Wave 0 Gaps
- [ ] `scripts/verify-phase73-quiz-ext.ts` — reusable inner verifier required by D-01. [CITED: 74-CONTEXT.md]
- [ ] `scripts/verify-phase73-v41-close-gate.ts` — outer authoritative gate required by D-01 / QUIZ-EXT-CLOSE-01. [CITED: 74-CONTEXT.md][CITED: .planning/REQUIREMENTS.md]
- [ ] `package.json` script entries for `verify:phase73` and `verify:phase73-v41-close-gate`. [CITED: 74-CONTEXT.md][VERIFIED: package.json]
- [ ] `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md`. [CITED: 74-CONTEXT.md]
- [ ] `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-VERIFICATION.md`. [CITED: 74-CONTEXT.md]
- [ ] `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CLOSEOUT.md`. [CITED: 74-CONTEXT.md]
- [ ] Explicit manual observation task for `/classroom` live-answer tab. [CITED: 74-CONTEXT.md]
- [ ] Explicit manual observation task for multi-type post-class recap. [CITED: 74-CONTEXT.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes [VERIFIED: local codebase] | Manual sign-off target surfaces rely on existing authenticated classroom route / websocket handshake paths; Phase 74 should verify, not bypass, those boundaries. [VERIFIED: src/app/(classroom)/classroom/page.tsx][VERIFIED: src/features/runtime-platform/seams/transport/ws-auth.ts] |
| V3 Session Management | yes [VERIFIED: local codebase] | Live dashboard state is session-scoped (`bindSession`, `activeSessionId`) and websocket subscriptions are keyed by `sessionId`. [VERIFIED: src/components/classroom/live-answer-dashboard-store.ts][VERIFIED: src/components/classroom/classroom-ws-client.ts] |
| V4 Access Control | yes [VERIFIED: local codebase] | `quiz.answer.received` is filtered to teacher sockets only and the live-answer tab lives inside teacher classroom control UI. [VERIFIED: src/features/runtime-platform/seams/transport/ws-connection-registry.ts][VERIFIED: src/components/classroom/classroom-control-panel.tsx] |
| V5 Input Validation | yes [VERIFIED: local codebase] | Zod protects quiz submit payloads and websocket envelopes; outer gate should apply the same determinism to manual-ledger parsing and artifact presence checks. [VERIFIED: src/actions/classroom-actions.ts][VERIFIED: src/features/runtime-platform/seams/transport/ws-envelope.test.ts][VERIFIED: scripts/verify-phase72-close-gate.ts] |
| V6 Cryptography | no [VERIFIED: phase scope] | Phase 74 does not introduce new crypto; existing `createHash("sha256")` dedupe in the quiz-answer producer is reused, not redesigned. [VERIFIED: src/features/platform-core/commands/producers/quiz-answer-received.ts] |

### Known Threat Patterns for this close-gate stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Manual ledger row is marked passed without real human observation | Repudiation | D-05 / D-06 require real observer identity, real timestamp, and evidence note; planner must schedule an explicit manual step. [CITED: 74-CONTEXT.md] |
| Teacher-only live answers leak to student sockets | Information Disclosure | Preserve `ws-connection-registry.broadcast()` teacher-only filter and `authenticateClassroomWebSocket()` membership checks as inner-verifier proof targets. [VERIFIED: src/features/runtime-platform/seams/transport/ws-connection-registry.ts][VERIFIED: src/features/runtime-platform/seams/transport/ws-auth.ts] |
| Outer gate passes while close artifacts are missing | Tampering | Reuse final-artifact dependency checks from the phase72 gate analog and point them at `73-*.md`. [VERIFIED: scripts/verify-phase72-close-gate.ts][CITED: .planning/ROADMAP.md] |
| `verify:phase` is cut over before readiness | Tampering | Keep alias on `verify:phase72` until D-04 is fully satisfied. [VERIFIED: package.json][CITED: 74-CONTEXT.md] |
| Planner treats stale summaries as final truth | Repudiation | Use current source files, tests, and package wiring as primary truth; use summaries only as secondary narrative context. [VERIFIED: local codebase][CITED: .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-01-SUMMARY.md][CITED: .planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-02-SUMMARY.md] |

## Sources

### Primary (HIGH confidence)
- `package.json` — current verify script wiring, local dependency pins, zero-write guard script. [VERIFIED: package.json]
- `scripts/verify-phase72-close-gate.ts` — authoritative outer-gate analog: stage runner, artifact dependencies, manual ledger parser. [VERIFIED: scripts/verify-phase72-close-gate.ts]
- `scripts/verify-phase71-marketplace-lifecycle.ts` — smoke/full split analog for reusable verifier design. [VERIFIED: scripts/verify-phase71-marketplace-lifecycle.ts]
- `scripts/verify-live-answer-zero-write.ts` — existing zero-write posture guard for the live dashboard. [VERIFIED: scripts/verify-live-answer-zero-write.ts]
- `src/lib/dal/classroom.ts` — `submitQuizSampleAnswer`, `buildQuizSampleRecapStats`, `getClassroomSessionRecapDTO`. [VERIFIED: src/lib/dal/classroom.ts]
- `src/features/platform-core/commands/producers/quiz-answer-received.ts` and `src/features/platform-core/commands/handlers/quiz-answer-received.ts` — durable write -> command -> transport bridge. [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/ws-connection-registry.ts`, `ws-adapter.ts`, `ws-envelope.ts`, `ws-auth.ts` — live-answer delivery, teacher-only filter, ws contract. [VERIFIED: local codebase]
- `src/components/classroom/classroom-control-panel.tsx`, `live-answer-dashboard-surface.tsx`, `live-answer-dashboard-store.ts`, `classroom-session-recap-surface.tsx` — manual sign-off target surfaces and store. [VERIFIED: local codebase]
- `src/components/classroom/live-answer-dashboard-surface.test.tsx`, `live-answer-dashboard-store.test.ts`, `src/features/runtime-platform/seams/transport/ws-envelope.test.ts`, `ws-adapter.test.ts`, `redis-fanout-manager.test.ts`, `tests/classroom/live-view.test.ts`, `src/app/(classroom)/classroom/page.test.tsx`, `src/components/classroom/classroom-control-panel.test.tsx`, `src/lib/dal/classroom.test.ts` — current targeted proof inventory. [VERIFIED: local codebase]
- Runtime/tool checks via bash: `node --version`, `pnpm --version`, `pnpm exec vitest --version`, `pnpm exec tsx --version`. [VERIFIED: bash]
- npm registry checks: `npm view vitest version/time`, `npm view tsx version/time`, `npm view zustand version/time`, `npm view next version/time`, `npm view typescript version/time`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md` — locked scope, decisions, close order, alias cutover rule. [CITED: .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md]
- `.planning/REQUIREMENTS.md` — QUIZ-EXT-CLOSE-01/02/03 requirement wording. [CITED: .planning/REQUIREMENTS.md]
- `.planning/ROADMAP.md` — phase goals, success criteria, verify clauses, cross-phase considerations. [CITED: .planning/ROADMAP.md]
- `.planning/STATE.md` — current milestone state, known pending todo for package wiring, v4.1 decisions. [CITED: .planning/STATE.md]
- `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CONTEXT.md` and `73-RESEARCH.md` — baseline product scope and expected inner-verifier responsibilities. [CITED: local planning docs]
- `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-01-SUMMARY.md` and `73-02-SUMMARY.md` — implementation history and targeted validation command inventory. [CITED: local planning docs]
- `.planning/milestones/v4.0-phases/72-end-to-end-verify-phase-close-gate/72-VERIFICATION.md`, `72.1-PROOF-MAPPING.md`, `72.1-CLOSEOUT.md`, `72.1-PATTERNS.md`, `69-VERIFICATION.md` — v4.0 close-gate/reporting analogs. [CITED: local planning docs]
- `AGENTS.md` — project-wide constraints and the SSE-vs-WS contradiction that must be surfaced honestly. [CITED: AGENTS.md]

### Tertiary (LOW confidence)
- None. This research did not rely on unverified web-search-only claims. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — local installed versions, `package.json`, and npm registry publish dates were all checked directly. [VERIFIED: package.json][VERIFIED: bash][VERIFIED: npm registry]
- Architecture: HIGH — the two-layer topology, artifact destinations, cutover rules, and manual-signoff discipline are locked by `74-CONTEXT.md`, while the relevant runtime seams already exist in code. [CITED: 74-CONTEXT.md][VERIFIED: local codebase]
- Pitfalls: HIGH — each major pitfall is either an explicit locked rule (D-01..D-10), a proven v4.0 analog, or a current codebase fact such as route/path reality and alias state. [CITED: 74-CONTEXT.md][CITED: .planning/ROADMAP.md][VERIFIED: local codebase]

**Research date:** 2026-06-08 [VERIFIED: system date]
**Valid until:** 2026-07-08 unless `package.json`, `scripts/verify-phase*.ts`, or the Phase 73 close artifacts change first. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | This research should be treated as fresh for roughly 30 days unless Phase 73/74 script wiring or close artifacts change earlier. | Metadata | Low — planner may re-run research sooner if the repo moves quickly, but no implementation decision depends on this estimate. |
