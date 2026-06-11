# Phase 76: v4.2 Authoritative Close Gate - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v4.2 里程碑建立权威收关门。基于 v4.1 authoritative close gate（Phase 74）范式 + Phase 75 刚交付的 homework 插件 + marketplace 泛化验证，扩展 `verify:phase` 组合 alias 加入 Phase 75 验证 + 跨插件回归（quiz + homework 双绿），产出 formal verification、proof mapping、closeout artifacts 和 Manual Surface Sign-Off Ledger。

**Scope anchor:** PROJECT.md v4.2 milestone close gate 扩展——在 v4.1 `verify:phase` 组合 alias 基础上增加第二个插件的跨插件回归（不破 quiz + 新插件全链路 green），最终产出 v4.2 MILESTONE-AUDIT.md。
</domain>

<decisions>
## Implementation Decisions

### Gate 拓扑与 Stage 设计
- **D-01:** 采用 **6-stage 扩展**：Stage 1（Phase 72 v4.0 gate 回归）→ Stage 2（Phase 73 quiz 多题型验证）→ Stage 3（Phase 75 homework 全链路验证）→ Stage 4（跨插件回归 quiz+homework 双绿）→ Stage 5（formal verification + proof mapping）→ Stage 6（Manual Surface Sign-Off + closeout artifacts）。
- **D-02:** `verify:phase` 组合 alias 采用 **逐阶段 alias** 设计：`pnpm verify:phase` = `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate && pnpm verify:phase75 && pnpm verify:v42-cross-plugin`。各阶段独立可跑，阶段间依赖明确。
- **D-03:** 对标 Phase 74 的 5-wave 结构（gate 骨架→formal verification→proof mapping→closeout→sign-off），Phase 76 扩展为 6-wave/plan，wave 1 建立 gate 骨架 + alias，wave 2-4 各验证阶段，wave 5 formal verification + proof mapping，wave 6 sign-off + audit。

### 跨插件回归策略
- **D-04:** 回归范围：**双插件全量**——quiz 全量测试（5 题型 + stats + lifecycle）+ homework 全量测试（lifecycle 12 + cross-plugin regression 6），两者独立跑、独立报告。任一失败即阻断 gate 通过。
- **D-05:** 组织方式：**独立回归脚本** `pnpm verify:v42-cross-plugin`，内部编排 quiz 全量 + homework 全量 + cross-plugin dedicated suite，作为 gate 的独立 Stage 4。不复用 Phase 75 已有 cross-plugin-regression.test.ts 的 6 cases，而是将其作为子集纳入更大的回归脚本。
- **D-06:** 阻断策略：按 stage 顺序执行，任一步失败即停止。跨插件回归（Stage 4）的阻断优先级与单插件验证（Stage 1-3）相同——不破 quiz + 新插件全链路 green 是 hard requirement。

### Manual Surface Sign-Off Ledger
- **D-07:** 采用 **8-row 扩展** ledger：
  - Quiz 保留 4 row：quiz play（学生答题）、quiz deploy（教师发布）、classroom live dashboard（作答实时）、quiz recap（课后统计）
  - Homework 新增 4 row：homework assign（教师布置作业）、homework submit（学生提交）、homework grade（教师批改打分）、homework lifecycle（uninstall 清理 + 同 pluginKey 重装恢复）
- **D-08:** 签核标准：每 row 需 `status: passed` + 日期 + 签核人。对标 v4.1 4-row ledger（全部 `status: passed`），8-row 全部通过方可标记 milestone audit 为 passed。

### Closeout 产出与审计
- **D-09:** VERIFICATION.md 结构：**对标 Phase 74 的 7-section 结构**（automated checks / gate stage results / manual sign-off / regression / proof mapping / requirements traceability / summary），扩展至覆盖 v4.2 范围（增加 homework 验证 section + cross-plugin regression section）。
- **D-10:** MILESTONE-AUDIT.md：**新建 v4.2 专属审计框架**。在 v4.1 审计维度（requirements/phases/integration/flows）基础上新增：跨插件验证维度（quiz↔homework 互不破坏）、泛化修复验证维度（quiz-only 假设已消除）。审计脚本 `pnpm audit:v42` 输出结构化结果。
- **D-11:** closeout artifacts 清单：`76-VERIFICATION.md` + `v4.2-MILESTONE-AUDIT.md` + `v4.2-PROOF-MAP.md`（proof mapping 追溯每项 requirement → plan → commit → test）+ `v4.2-CLOSEOUT.md`（收关摘要，对标 Phase 74.5 closeout）。

### Cross-Phase Discipline
- **D-12:** 继续继承 D-72.1-16（conclusion never leads evidence）：Phase 76 的产出顺序固定为 gate 骨架→验证→proof mapping→sign-off→audit。任何让结论先于证据的捷径视为 forbidden shortcut。
- **D-13:** v4.1 close gate 的 `verify:phase` alias 在 Phase 76 开发期间保持不变，全部扩展在 Phase 76 内部完成后再切主 alias。

### Claude's Discretion
- 6-stage gate 的具体实现细节（stage 间依赖、错误报告格式）
- 跨插件回归脚本的具体编排（并发 vs 顺序、超时设置）
- proof mapping 的粒度和格式（requirement→plan→commit→test 链路）
- MILESTONE-AUDIT.md 新建框架的具体维度权重和评分规则
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope & Locked Decisions
- `.planning/PROJECT.md` — v4.2 milestone 目标、target features（MKT-EXT-03 + close gate 扩展）、constraints
- `.planning/ROADMAP.md` — v4.2 Phase 75/76 目标、milestone 结构
- `.planning/STATE.md` — 当前 milestone 运行状态

### Prior Close Gate Pattern（Phase 74 — 必须对标）
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md` — v4.1 close gate 的已锁定决策（5-wave、alias 设计、sign-off ledger）
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-01-PLAN.md` — Gate 骨架 + alias 建立
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-02-PLAN.md` — Formal verification
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-03-PLAN.md` — Proof mapping
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-04-PLAN.md` — Closeout artifacts
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-05-PLAN.md` — Final sign-off + audit
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-VERIFICATION.md` — v4.1 7-section 验证报告（Phase 76 VERIFICATION.md 的结构模板）
- `.planning/milestones/v4.1-MILESTONE-AUDIT.md` — v4.1 审计报告（Phase 76 审计框架的基线参考）

### Phase 75 Verification Baseline（必须纳入 gate 的增量）
- `.planning/phases/75-second-external-plugin-marketplace-generalization/75-CONTEXT.md` — homework 插件 + 泛化修复的已锁定决策
- `.planning/phases/75-second-external-plugin-marketplace-generalization/75-VERIFICATION.md` — Phase 75 验证报告（14/14，2 gaps 已关闭）
- `.planning/phases/75-second-external-plugin-marketplace-generalization/75-REVIEW.md` — Phase 75 代码审查报告
- `src/plugins/homework/` — homework 插件源码（data-model、lifecycle、cross-plugin regression）
- `drizzle/0023_phase75_homework_upgrade.sql` — homework upgrade 迁移

### Existing Verification Scripts（必须扩展的基线）
- `package.json` §scripts — 现有 verify 脚本（verify:phase72、verify:phase73-v41-close-gate、verify:phase75）
- `src/features/runtime-platform/__tests__/cross-plugin-regression.test.ts` — 既有跨插件回归（6 cases，Phase 75 产出）

### Codebase Architecture
- `.planning/codebase/ARCHITECTURE.md` — 分层数据访问、plugin lifecycle、governance 审计
- `.planning/codebase/STACK.md` — 技术栈（Next.js 16、Drizzle、Auth.js v5、Vitest）

### Design System
- `DESIGN.md` — Stitch 对齐的设计规范
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 74 close gate scripts** (`package.json`): `verify:phase72` + `verify:phase73-v41-close-gate` — Phase 76 的 alias 将在此基础上追加 `verify:phase75` + `verify:v42-cross-plugin`
- **Phase 75 verification runner** (`pnpm verify:phase75`): 已存在的 Phase 75 验证脚本，直接纳入 gate Stage 3
- **cross-plugin-regression.test.ts** (`src/features/runtime-platform/__tests__/`): Phase 75 产出的 6-case 跨插件回归，Phase 76 需将其扩展/包装为 `verify:v42-cross-plugin`
- **v4.1 Manual Surface Sign-Off Ledger** (Phase 74-05-PLAN.md): 4-row ledger 模板，Phase 76 直接扩展为 8-row

### Established Patterns
- **Close gate 5-wave 结构** (Phase 74): 骨架→验证→proof→closeout→sign-off，Phase 76 扩展为 6-wave（插入跨插件回归 stage）
- **逐阶段 alias 模式**: `verify:phase` = `cmd1 && cmd2 && cmd3`，每个 cmd 对应一个独立 pnpm script
- **7-section VERIFICATION.md** (Phase 74): 结构模板直接复用于 Phase 76
- **MILESTONE-AUDIT.md 审计维度** (v4.1): requirements + phases + integration + flows，Phase 76 新增跨插件 + 泛化修复维度

### Integration Points
- `package.json` §scripts — 新增 `verify:v42-cross-plugin`、更新 `verify:phase` alias
- `.planning/milestones/` — 新增 `v4.2-MILESTONE-AUDIT.md`、`v4.2-PROOF-MAP.md`、`v4.2-CLOSEOUT.md`
- Phase 74 VERIFICATION.md — 作为 Phase 76 VERIFICATION.md 的结构模板
</code_context>

<specifics>
## Specific Ideas

- 用户强调 v4.2 审计框架应为"新建"而非对标 v4.1，需新增跨插件验证 + 泛化修复验证两个专属维度
- Manual Sign-Off 需同时覆盖 quiz（稳定回归）和 homework（新增全链路），两者在 ledger 中地位对等
- 跨插件回归作为独立 gate stage，不与单插件验证合并——确保 quiz 不破 + homework 全绿可独立判定

</specifics>

<deferred>
## Deferred Ideas

None — 讨论完全聚焦在 Phase 76 close gate 范围内，无 scope creep。

</deferred>

---

*Phase: 76-v4-2-authoritative-close-gate*
*Context gathered: 2026-06-11*
