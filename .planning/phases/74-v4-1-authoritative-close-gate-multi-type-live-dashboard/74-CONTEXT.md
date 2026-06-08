# Phase 74: v4.1 Authoritative Close Gate (Multi-Type + Live Dashboard) - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

把 Phase 73 已交付的多题型 quiz 与教师端实时作答 dashboard，收口为 v4.1 的单一权威 close gate：补出独立的 `verify:phase73` 产品 verifier、在其外层包裹 `verify:phase73-v41-close-gate` 作为最终里程碑 gate，并产出 `73-VERIFICATION.md`、`73-PROOF-MAPPING.md`、`73-CLOSEOUT.md` 三件套与新增 2 行 Manual Surface Sign-Off Ledger。

本 phase 只讨论 close gate、proof chain、verification/reporting 与 archive posture；不新增任何 quiz 产品能力，不重开 Phase 73 scope，也不引入新的 dashboard 写侧行为。

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope & Locked Decisions
- `.planning/ROADMAP.md` — v4.1 Phase 74 的目标、计划拆分、success criteria、verify 条款与 D-72.1-16 顺序要求
- `.planning/REQUIREMENTS.md` — `QUIZ-EXT-CLOSE-01/02/03` 的正式需求边界与 out-of-scope 列表
- `.planning/PROJECT.md` — 项目级技术/治理/close-gate 约束，尤其是 v4.0/v4.1 baseline 与 Key Decisions
- `.planning/STATE.md` — 当前 milestone 的运行状态与已记录的 v4.1 决策

### Phase 73 Baseline
- `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CONTEXT.md` — Phase 73 已锁定的产品事实、代码接缝与禁止重开的决定
- `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-RESEARCH.md` — Phase 73 原始验证计划与 `verify:phase73` 预期职责

### v4.0 Close Gate Analogs
- `.planning/milestones/v4.0-phases/72-end-to-end-verify-phase-close-gate/72-VERIFICATION.md` — v4.0 authoritative gate 的验证报告样板、proof chain wording、artifact dependency 口径
- `.planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PROOF-MAPPING.md` — Manual Surface Sign-Off Ledger schema 与 proof mapping 结构的直接类比
- `.planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-CLOSEOUT.md` — archive-ready closeout 的写法与 final proof-chain 组织方式
- `.planning/milestones/v4.0-phases/72.1-close-gap-gate-01-authoritative-milestone-close-gate/72.1-PATTERNS.md` — 72.1 收口阶段的 pattern reuse 与 final artifact discipline

### Verifier & Wiring Surfaces
- `scripts/verify-phase72-close-gate.ts` — 现有 authoritative gate 的脚本结构，Phase 74 的最近类比
- `package.json` — `verify:phase72` 与 `verify:phase` 当前 wiring；Phase 74 会在这里新增/调整 script entries

### Product Surfaces Referenced by the Gate
- `src/components/classroom/live-answer-dashboard-surface.tsx` — `/classroom` 实时作答 tab 的实际 surface，Manual Surface Sign-Off 的观察对象之一
- `src/components/classroom/live-answer-dashboard-store.ts` — 实时 dashboard 客户端聚合状态的产品实现基线
- `src/components/classroom/classroom-session-recap-surface.tsx` — 多题型课后 recap surface，Manual Surface Sign-Off 的另一条观察对象

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-phase72-close-gate.ts`：已经体现 authoritative gate 的 stage runner、artifact hard-fail、proof-chain grep、manual ledger parser，可作为 v4.1 外层 gate 的直接骨架。
- `src/components/classroom/live-answer-dashboard-surface.tsx` 与 `src/components/classroom/live-answer-dashboard-surface.test.tsx`：可作为 live dashboard 存在性、只读姿势和人工签核的目标 surface。
- `src/components/classroom/classroom-session-recap-surface.tsx` 与 `src/components/classroom/classroom-session-recap-surface.test.tsx`：可作为多题型 recap 证明链与人工签核的目标 surface。
- `src/components/classroom/live-answer-dashboard-store.ts` 与 `src/components/classroom/live-answer-dashboard-store.test.ts`：当前实时聚合算法与 recent-limit 行为的代码基线，适合由 `verify:phase73` 吸收为上游产品 proof。

### Established Patterns
- authoritative gate 已在 v4.0 形成明确分层：上游 phase verifiers 提供产品 truth，外层 milestone gate 负责 proof-chain、artifact dependencies、manual sign-off、alias wiring。
- closeout 纪律固定：proof mapping 先行，closeout 最后落笔；任何 doc-only closure、缺 manual sign-off、或无 artifact dependency 的 gate wiring 都应被视为 forbidden shortcut。
- repo 当前 `verify:phase` 仍显式绑定 `verify:phase72`，说明 Phase 74 需要处理从 v4.0 权威入口迁移到 v4.1 权威入口的 cutover，而不是直接覆盖旧脚本名。

### Integration Points
- `package.json`：将新增 `verify:phase73` 与 `verify:phase73-v41-close-gate` script entries，并最终决定何时切换全局 `verify:phase`。
- `scripts/verify-phase72-close-gate.ts`：需要被复制/改写为 v4.1 外层 gate 的基础实现。
- `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/`：Phase 74 的三件套都应写回 Phase 73 目录，作为被收口 phase 的正式证明，而不是写进 Phase 74 自己的文档集合里。

</code_context>

<specifics>
## Specific Ideas

- 用户明确要求两层结构保持清晰职责边界：`verify:phase73` 证明产品链路，`verify:phase73-v41-close-gate` 只包内层并做收口检查。
- 用户明确要求新增两条 Manual Surface Sign-Off 必须来自真实人眼观察，不能用自动化假装人工签核。
- 用户偏好 `73-VERIFICATION.md` 先讲用户可见链路，再在文末附 stage 对照区，而不是把文档写成脚本 stage dump。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 74-v4.1 Authoritative Close Gate (Multi-Type + Live Dashboard)*
*Context gathered: 2026-06-08*
