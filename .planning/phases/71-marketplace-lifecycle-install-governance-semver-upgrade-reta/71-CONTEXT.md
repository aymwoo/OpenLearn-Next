# Phase 71: Marketplace Lifecycle - Install Governance, Semver Upgrade & Retain/Cleanup Uninstall - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

在既有 governed marketplace / plugin lifecycle / plugin migration 基线上，把 external 插件做成真实可操作的生命周期闭环：目录发现、安装预检、semver 升级预检与执行、retain/cleanup 卸载、retain 后按同 `pluginKey` 重装接管历史数据，以及 active classroom 冲突阻断。

本 phase 只交付 MKT-01 / MKT-02 / MKT-03 / MKT-04 / MKT-05：
- operator 能在 marketplace surface 发现并安装 external 插件
- 升级走 backfill -> verify -> cutover，且对真实作答数据零丢失
- 卸载默认 retain，cleanup 需要基于真实影响面的确认 token
- retain 后同 `pluginKey` 重装时接管保留数据
- active classroom 使用中时，升级/卸载被安全阻断并给出明确原因

固定边界：
- 不扩成商店运营层；不做付费、评分评论、开发者门户、自动化审核流水线。
- 不引入任意代码执行、远程动态 import、runtime DDL、第二迁移引擎。
- 不重建 marketplace / lifecycle / migration kernel，只在既有 surface、DAL、governance projection、migration discipline 上泛化 external 生命周期。
- 不做 milestone 级端到端 close gate（Phase 72）。

</domain>

<decisions>
## Implementation Decisions

### 目录与安装入口
- **D-71-01:** `/settings/plugins` 继续作为唯一 marketplace 入口，但改为**同页双分区**：built-in 与 external 同页展示，不拆独立 external 子页。
- **D-71-02:** external 插件卡片在未安装态先展示**治理摘要**，优先暴露版本、权限、声明数据、命名空间/来源等安装判断信息，而不是盲点安装按钮。
- **D-71-03:** external 安装失败时，拒因必须在**插件卡片内联回显**，直接显示 manifest/dataModel/命名冲突等具名原因，不把 operator 赶到独立结果页或只给 toast。
- **D-71-04:** external 分区的产品语气可以接近**应用商店**，但必须保持受治理 posture：重点仍是“可发现 + 可安装 + 风险透明”，不能滑向运营层 marketplace。

### 升级体验与闸门
- **D-71-05:** external 插件出现新版本时，默认入口是**先看升级预检**，而不是直接升级。
- **D-71-06:** 升级预检第一屏优先展示**数据影响与阻断项**：是否有真实作答数据、会跑哪些迁移阶段、是否存在 active classroom / 校验失败 / 身份冲突等 blocker；changelog 不是首屏主信息。
- **D-71-07:** 升级执行反馈必须明确呈现 **backfill -> verify -> cutover** 三阶段进度，而不是单一模糊进度条。
- **D-71-08:** 如果升级在 verify 阶段失败，默认停留**旧版本继续可用**并标记升级失败；不进入半升级待修复状态，也不自动切到新版本。

### 卸载与重装恢复
- **D-71-09:** 卸载默认主动作是 **retain**；cleanup 是危险次级操作，不作为默认首选。
- **D-71-10:** 选择 cleanup 时，确认区第一屏必须先展示**真实影响面计数 + confirmation token**，包括将删除多少条作答、影响多少复盘等，而不是只给泛化警告文案。
- **D-71-11:** retain 后若同 `pluginKey` 重新安装，UI 必须明确提示**“已接管保留数据”**；这仍然是一次重新安装，但要诚实表达历史数据被恢复接管。
- **D-71-12:** retain 状态的插件仍留在目录中，但卡片状态必须是**“已卸载但可恢复”**，不能伪装成普通 disabled，也不能从主目录消失。

### Active 课堂冲突处理
- **D-71-13:** 只要 external 插件正被 active classroom 使用，升级默认**硬阻断并解释原因**；不提供默认排队延后，也不提供强制升级入口。
- **D-71-14:** 卸载与升级在 active classroom 场景下采用**统一硬阻断策略**，避免 operator 心智分裂。
- **D-71-15:** 阻断提示第一优先展示**哪些课堂/会话正在占用该插件**，而不是只说“当前不可操作”。
- **D-71-16:** 被阻断后提供的后续动作是**查看受影响课堂 + 稍后重试**；不引入偷偷排队执行，也不开放 override 语义。

### the agent's Discretion
- dual-section marketplace 的具体布局方式（stacked sections、tabs-in-page、section hero 组合）可由 planner / UI planning 决定，只要保持同页双分区与治理摘要优先。
- 治理摘要里“版本 / 权限 / dataModel / namespace / sourceType”的具体字段排布与视觉层级可由 planner 结合现有 `PluginMarketplaceSurface` 细化。
- 升级预检与执行是否完全驻留卡片内、抽屉内，还是进入同页 detail panel，可由 planner 决定；前提是不偏离“先预检、后执行、分阶段进度、verify 失败不 cutover”。
- retain 恢复提示的具体 wording、badge、CTA 文案可由 planner 结合 Stitch / DESIGN 决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 里程碑契约
- `.planning/ROADMAP.md` — Phase 71 goal, success criteria, and pitfall notes.
- `.planning/REQUIREMENTS.md` — MKT-01..MKT-05 original requirement text and v4.0 out-of-scope boundary.
- `.planning/PROJECT.md` — v4.0 milestone goal, red lines, and “reuse existing marketplace/kernel” posture.
- `.planning/STATE.md` — current milestone position and pending verification notes from Phase 70.

### 上游 phase 决策
- `.planning/phases/68-governed-declarative-data-access-verbs/68-CONTEXT.md` — governed plugin data access, audit posture, and Phase 71 deferred upgrade/uninstall boundary.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-CONTEXT.md` — quiz sample session-freeze/latest-only truth and explicit defer of marketplace lifecycle to Phase 71.
- `.planning/phases/70-question-stats-post-class-recap/70-CONTEXT.md` — recap/statistics truth and the fact that Phase 71 must preserve those stats across upgrade/uninstall.

### 既有实现接缝
- `src/components/surfaces/plugin-marketplace-surface.tsx` — current marketplace UI, currently built-in only via `.filter(plugin => plugin.builtIn)`.
- `src/app/settings/plugins/page.tsx` — route entry for the marketplace surface.
- `src/actions/plugin-actions.ts` — current server-action boundary for register/enable/disable/lifecycle operations and cache invalidation.
- `src/lib/dal/plugins.ts` — install/reconcile, uninstall preflight, retain/cleanup uninstall, lifecycle transitions, governance audit hooks.
- `src/features/platform-core/plugins/governance-projection.ts` — current projection of lifecycle/uninstall posture into UI-friendly status rows.
- `src/lib/dal/plugin-migration.ts` — existing `backfill -> verify -> cutover` migration discipline to reuse for semver upgrades.

### 数据与样板真相源
- `plugins/quiz-sample/data-model.ts` — current sample plugin data model source of truth used to prove real owned-data upgrade semantics.
- `src/db/schema/generated/plugin-owned/quiz.ts` — generated plugin-owned quiz tables whose real data must survive upgrade / retain / cleanup decisions.
- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — generated access metadata proving compile-time governed schema posture.

### 研究上下文
- `.planning/research/SUMMARY.md` — milestone-level architecture summary explicitly identifies external marketplace lifecycle as one of the remaining real gaps.
- `.planning/research/ARCHITECTURE.md` — existing marketplace surface / DAL / uninstall / migration seams and build order notes for external plugin lifecycle.
- `.planning/research/STACK.md` — existing stack posture and additive-only upgrade discipline to reuse.
- `.planning/research/FEATURES.md` — current feature map for pluginRegistrations, marketplace surface, and lifecycle scope boundaries.
- `.planning/research/PITFALLS.md` — anti-patterns around lossy upgrade, retain/cleanup governance, and marketplace scope creep.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/surfaces/plugin-marketplace-surface.tsx` 已有 Stitch/DESIGN 对齐的 marketplace shell、metrics、卡片与 settings 跳转，适合直接扩成 built-in + external 双分区，而不是新开整页。
- `src/lib/dal/plugins.ts#installOrReconcilePluginWithTx` 已有 manifest 校验、`pluginKey`/`dbNamespace` 冲突检查、安装/重装 reconcile 逻辑，是 external install/reinstall 的核心接缝。
- `src/lib/dal/plugins.ts#preflightUninstallPluginWithTx` 与 `#uninstallPluginWithTx` 已有 retain/cleanup、影响面计数与 confirmation token 生成，是 Phase 71 卸载治理的直接底座。
- `src/features/platform-core/plugins/governance-projection.ts` 已能把 lifecycle/uninstall posture 投影成 UI-friendly status，可扩展 external install/retain/recovery/blocking 表达。
- `src/lib/dal/plugin-migration.ts` 已有 backfill/verify/cutover discipline，可作为 semver upgrade 的既有执行范式，而非重做第二套升级引擎。

### Established Patterns
- marketplace / plugin lifecycle 必须继续走 Server Actions -> Command/Governance producer -> DAL -> SQLite 的单一真相链路，不能在 UI 层发明本地状态真相。
- retain/cleanup 已经是 repo 内存在的治理语义；Phase 71 要做的是把它扩展到 plugin-owned 真实数据与 operator 可见行为，而不是重定义概念。
- Phase 68/69/70 已把 quiz sample 的 owned tables、latest-only 写入与 recap read model走通，Phase 71 升级/卸载必须以这些真实数据为对象证明“零丢失/可恢复”。
- 项目对 destructive 操作的基调是显式治理与审计，不走“静默后台替你完成”。这约束了 active classroom 冲突不能默认排队或强制 override。

### Integration Points
- UI 层：`/settings/plugins` marketplace surface 扩展 external catalog、预检视图、升级进度、retain/recovery 状态与阻断说明。
- Action 层：`src/actions/plugin-actions.ts` 扩展 install/upgrade/uninstall/recover 相关 server actions 与 cache tag invalidation。
- DAL 层：`src/lib/dal/plugins.ts` 扩展 preflight/install/reconcile/uninstall block reason、恢复接管与 external status projection。
- Migration 层：`src/lib/dal/plugin-migration.ts` 或其等价 orchestrator 负责 semver upgrade 的 additive-only backfill -> verify -> cutover。
- Projection 层：`src/features/platform-core/plugins/governance-projection.ts` 扩展 external installability / upgradeability / retained recovery / active-session blocking 的 UI posture。

</code_context>

<specifics>
## Specific Ideas

- external 区块虽然同页共存，但产品语气可以接近“应用商店”，前提是风险与治理信息始终前置，不做消费级“先装再说”。
- 升级体验希望像一次受治理发布操作，而不是普通包管理器更新：先预检，再明确展示三阶段进度，失败就留在旧版本。
- cleanup 的危险感不靠抽象警告，而靠真实影响面数字来建立：删除多少作答、影响多少复盘必须被 operator 直接看到。
- retain 后重装不是普通 enable，也不是普通 upgrade；它是“重新安装，但历史数据已被接管恢复”，UI 需要诚实表达这一点。
- active classroom 冲突处理要求高度可解释：先告诉 operator 哪些课堂在占用，再给“查看受影响课堂 + 稍后重试”。

</specifics>

<deferred>
## Deferred Ideas

- marketplace 运营层能力（付费/计费、评分评论、公开开发者门户、自动化审核流水线）继续 deferred，不并入 Phase 71。
- 自动排队等课堂结束后再执行升级/卸载、强制 override destructive operations、后台订阅提醒系统，均不纳入本 phase；若未来需要，应单独立 phase。
- milestone 级端到端 close gate 仍属于 Phase 72，不在本 phase 解决。

</deferred>

---

*Phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta*
*Context gathered: 2026-06-04*
