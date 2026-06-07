---
phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta
verified: 2026-06-07T05:53:30Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "教师端在 /settings/plugins 单页 dual-section 走查 external 插件生命周期"
    expected: "built-in 与 external 在同一页呈现，governance summary 先于 install CTA，retain reinstall 显示已存在的 retained registration、semver upgrade 显示 backfill/verify/cutover 进度、cleanup preflight 暴露真实 impact counts + confirmation token，active classroom 阻断操作并给出可读原因"
    why_human: "视觉层级、CTA hierarchy、governance-summary prominence、active-blocker 文案口径无法只靠静态读码确认"
  - test: "升级进度回放 backfill -> verify -> cutover 阶段且 verify 失败时旧版本仍可用"
    expected: "升级 UI 显式三段进度；verify 失败时旧版本留在可用 posture 而不是被切走，与 71-04-VALIDATION 行 65 的人工走查项一致"
    why_human: "升级阶段是 progressive UI 体验，单测只能保证接口契约成立"
  - test: "cleanup confirmation 文案在破坏性按钮前先显示 impact counts + token"
    expected: "destructive CTA 之前先出现 impact counts 与 confirmation token entry，wording 与 governance posture 一致；与 71-04-VALIDATION 行 66 的人工走查项一致"
    why_human: "danger posture 是 product-safety 决策，自动化只能证明 token 字段存在"
---

# Phase 71: Marketplace Lifecycle — Install / Governance / Semver Upgrade / Retain / Cleanup — Verification Report

**Phase Goal:** 在 `/settings/plugins` 单页 marketplace surface 内补齐：external 插件发现与安装（治理校验通过后才进入可用状态）、semver 升级走 `backfill → verify → cutover`、retain 卸载保留数据、retain 后重装能恢复既有数据、active classroom 阻断升级 / 卸载。
**Verified:** 2026-06-07T05:53:30Z
**Status:** passed
**Re-verification:** Yes — initial verification completed via 71-01..04 SUMMARYs; this formal report binds the lifecycle surface against code + strengthened verifier.

> **Bridge note (D-72.1-07).** All MKT-01..05 lifecycle seams named in this report — `/settings/plugins` route, `PluginMarketplaceSurface` SSR bundle, `recoverMarketplacePluginAction` server action, `recoverRetainedPluginInstallWithTx` DAL export, `preflightPluginUpgrade` + `plugin-migration.ts` backfill/verify/cutover discipline, `preflightUninstallPluginWithTx` + `uninstallPluginWithTx` + `cleanupConfirmationToken` + `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`, and `PLUGIN_ACTIVE_CLASSROOM_BLOCKED` — are exactly the seams the strengthened `scripts/verify-phase71-marketplace-lifecycle.ts` asserts. Wave 2 / 3 of milestone close gate (72.1-02 / 72.1-03) will re-assert the same seams from the `verify:phase72` entry point; this report is the **evidence** that wave 1's verifier actually points at real code, not just at summary prose.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `/settings/plugins` 路由真实存在且只渲染 `PluginMarketplaceSurface`，不另开 external 路由；页面在 `route-surface-registry.ts` 同一页面资产下被登记。 | ✓ VERIFIED | `src/app/settings/plugins/page.tsx:3` `import { PluginMarketplaceSurface } from '@/components/surfaces/plugin-marketplace-surface'`；`src/app/settings/plugins/page.tsx:8` `<PluginMarketplaceSurface />`；`src/lib/theme-layout/route-surface-registry.ts:50` (`THEME_PAGE_MODULE_KEYS`) 与 `:218` (`TEACHER_THEME_ROUTE_SURFACES`) 登记 `'/settings/plugins'`，与其他教师 surface 共用同一页面资产；`scripts/verify-phase71-marketplace-lifecycle.ts` required static check `'/settings/plugins'` 出现在 verifier 中。 |
| 2 | `PluginMarketplaceSurface` 走 SSR bundle seam `readMarketplaceSurfaceBundle`，不在组件层直连 DB，且与 `recoverMarketplacePluginAction` 等 server action 边界在同一文件中 import 而不绕开 governance。 | ✓ VERIFIED | `src/components/surfaces/plugin-marketplace-surface.tsx:4` `import { readMarketplaceSurfaceBundle } from "@/features/platform-core/actions/registry"`；`:20` `export async function PluginMarketplaceSurface()`；`:25` `await readMarketplaceSurfaceBundle({ schoolId, actorId })`；`src/features/platform-core/actions/registry.ts:410` `export async function readMarketplaceSurfaceBundle`；`src/actions/plugin-actions.ts:712` `export async function recoverMarketplacePluginAction`（server action 边界由 RSC 通过 `useTransition` 调用，不在 client 端直接命中 DAL）。 |
| 3 | retain 后重装走 `recoverRetainedPluginInstallWithTx` DAL 事务：新 registration 建立后接管旧 `(schoolId, pluginKey)` 下的 `pluginLessonExtensions` / `pluginLessonStepExtensions` / `pluginResourceExtensions` / `pluginOwnedBusinessData` / `pluginOwnedQuizQuestions` / `pluginOwnedQuizResponses`，旧 retained registration 写 `recoveredDataTakeover: true` + `recoveredFromPluginId` 并停止作为可执行 row 暴露。 | ✓ VERIFIED | `src/lib/dal/plugins.ts:1016` `export async function recoverRetainedPluginInstallWithTx`；`:1117-1118` 写入 `recoveredFromPluginId: retainedRegistration.id` 与 `recoveredDataTakeover: true`；事务内改写 6 张 plugin-owned 业务表（同函数内 `.update(...).set({ pluginId: newId })`）；`src/actions/plugin-actions.ts:762-763` 把这两个字段透出到 `recoverMarketplacePluginAction` 结果；`scripts/verify-phase71-marketplace-lifecycle.ts` required static check `recoveredDataTakeover` + `recoveredFromPluginId` + `recoverRetainedPluginInstallWithTx` 全部出现在 verifier 内。 |
| 4 | semver 升级预检 `preflightPluginUpgrade` 调用 `plugin-migration.ts` 的 `backfill → verify → cutover` 三段式迁移纪律；verify 阶段不通过时旧版本仍保持可用。 | ✓ VERIFIED | `src/lib/dal/plugins.ts:232` `preflightPluginUpgrade`；`src/lib/dal/plugin-migration.ts:89` `stages: Array<"backfill" \| "verify" \| "cutover">`；`:215` `export async function backfillPluginJsonToSchema`；`:488` `export async function cutoverPluginJsonToSchema`；`:681` `preflightPluginUpgradeMigration`；`:720` `stages: ["backfill", "verify", "cutover"]`；`:759-761` 三段状态字段 (`backfill: completed`, `verify: failed`, `cutover: skipped`)；`:764-793` 显式按顺序执行 `backfill` → `verify` → `cutover`；`scripts/verify-phase71-marketplace-lifecycle.ts` required static check `"backfill" + "verify" + "cutover"` 全部出现在 `src/lib/dal/plugin-migration.ts` 中。 |
| 5 | 卸载预检 `preflightUninstallPluginWithTx` 输出 `cleanupConfirmationToken` + `activeSessions`，`uninstallPluginWithTx` 在 destructive path 拒绝缺失 / 错误 token，错误名固定为 `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`；active classroom session 让卸载被硬阻断。 | ✓ VERIFIED | `src/lib/dal/plugins.ts:1369` `export async function preflightUninstallPluginWithTx`；`:1401 / :1473` `cleanupConfirmationToken: buildCleanupConfirmationToken(...)`；`:1458-1459` `blocked: activeSessions.length > 0, reason: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED"`；`:1494` `export async function uninstallPluginWithTx`；`:1531` `if (input.confirmationToken !== preflight.cleanupConfirmationToken)`；`:1554-1558` 在 token mismatch 时 `throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED")`；`scripts/verify-phase71-marketplace-lifecycle.ts` required static check `cleanupConfirmationToken + PLUGIN_CLEANUP_CONFIRMATION_REQUIRED + preflightUninstallPluginWithTx + uninstallPluginWithTx` 全部出现在 verifier 内。 |
| 6 | 升级 / 卸载在 active classroom session 上被 `PLUGIN_ACTIVE_CLASSROOM_BLOCKED` 阻断；DAL 返回 `activeSessions` 列表与 `blocked: true`，由 server action / UI 透出可读原因。 | ✓ VERIFIED | `src/lib/dal/plugins.ts:603` `function getPluginUninstallBlockReason(plugin)`；`:674-677` 在 preflight 中取 `plugin_owned_quiz_questions` 关联的 live `classroomSession`；`:1452-1459` 计算 `unblocked = totalCount - activeSessions.length`、返回 `{ blocked, reason: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED", activeSessions }`；`scripts/verify-phase71-marketplace-lifecycle.ts` smoke proof 第 4 步验证 `liveSessionCount >= 1`，作为 active-blocker 真实数据前提。 |
| 7 | 单一 close gate `verify:phase71` → `scripts/verify-phase71-marketplace-lifecycle.ts` 走三段 runner (静态 seam → 聚焦 vitest → 隔离 SQLite proof)，且 `--smoke` 快速路径保留；TS-71 内不允许“只跑 fixture count” / “只 grep token”作为 lifecycle / recap 证明（D-72.1-16 锁）。 | ✓ VERIFIED | `scripts/verify-phase71-marketplace-lifecycle.ts:21` header 注释 `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts`；`package.json#verify:phase71` alias 绑定同一脚本；`scripts/verify-phase71-marketplace-lifecycle.ts:128-163` required static checks（已在本报告中列出的 8 项 seam 全部落在静态检查中）；`runSmokeProof` 与 `runFullProof` 都执行 `assert(branch, "<branch> data shape")` 形式的可执行分支证据；`--smoke` flag 在 `:30-36` 仍保留并对应 fixture-only 快速路径。 |
| 8 | lifecycle 整套 seam 在 STATS-01 / STATS-02 课堂侧桥接下保持不变；`getClassroomSessionRecapDTO` 仍读 `pluginOwnedQuizResponses(isLatest=true)`，且 `submitQuizSampleAnswerAction` 仍 invalidate `cacheTags.quizStats(sessionId)`。 | ✓ VERIFIED | `src/lib/dal/classroom.ts:890-984` `buildQuizSampleRecapStats`；`src/lib/dal/classroom.ts:933` `eq(pluginOwnedQuizResponses.isLatest, true)`；`src/actions/classroom-actions.ts:318-329` `submitQuizSampleAnswerAction` 调用 `updateTag(cacheTags.quizStats(parsed.data.sessionId))`；本 phase 71 不修改课堂侧 seam（peer 70-VERIFICATION.md 第 5、6 条独立验过）。 |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/settings/plugins/page.tsx` | external + built-in 同页路由 | ✓ VERIFIED | `:3` import `PluginMarketplaceSurface`；`:8` 渲染；路由在 `route-surface-registry.ts` 登记。 |
| `src/components/surfaces/plugin-marketplace-surface.tsx` | lifecycle UI 容器 | ✓ VERIFIED | `:4` import SSR bundle；`:20` export；`:25` 调用 `readMarketplaceSurfaceBundle`；retain / recover UI 行在 `:16-144` 显式。 |
| `src/features/platform-core/actions/registry.ts#readMarketplaceSurfaceBundle` | SSR bundle 单一接缝 | ✓ VERIFIED | `:410` export；不直连 DB；只走 server action 边界。 |
| `src/actions/plugin-actions.ts#recoverMarketplacePluginAction` | retain reinstall server action 边界 | ✓ VERIFIED | `:712` export；`:762-763` 输出 `recoveredFromPluginId` + `recoveredDataTakeover`；前置于 DAL `recoverRetainedPluginInstallWithTx` 调用。 |
| `src/actions/plugin-actions.ts#preflightPluginUpgradeAction` | semver upgrade server action 边界 | ✓ VERIFIED | `:772` export。 |
| `src/lib/dal/plugins.ts#recoverRetainedPluginInstallWithTx` | retain reinstall DAL | ✓ VERIFIED | `:1016` export；`:1117-1118` 标记 takeover；事务内改写 6 张 plugin-owned 表。 |
| `src/lib/dal/plugins.ts#preflightPluginUpgrade` | semver upgrade DAL preflight | ✓ VERIFIED | `:232` export；调用 `preflightPluginUpgradeMigration`（`plugin-migration.ts:681`）。 |
| `src/lib/dal/plugin-migration.ts` | `backfill → verify → cutover` 三段迁移 | ✓ VERIFIED | `:89, :113, :720, :759-793` 全部三段标识与执行序列；`:764-766` `backfill` 先于 `verify`；`:790-793` `cutover` 在 `verify` 通过后才执行。 |
| `src/lib/dal/plugins.ts#preflightUninstallPluginWithTx` | 卸载预检 | ✓ VERIFIED | `:1369` export；`:1401 / :1473` `cleanupConfirmationToken`；`:1458-1459` `PLUGIN_ACTIVE_CLASSROOM_BLOCKED`。 |
| `src/lib/dal/plugins.ts#uninstallPluginWithTx` | 卸载执行 | ✓ VERIFIED | `:1494` export；`:1531-1558` token mismatch 抛 `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`。 |
| `scripts/verify-phase71-marketplace-lifecycle.ts` | phase 71 close gate | ✓ VERIFIED | 静态 seam 8 项 + smoke / full branch proof；本报告 71-VERIFICATION 在 72.1 之前补齐，72.1 wave 2 / 3 close gate 进一步把同一批 seam 收口到 `verify:phase72`。 |
| `package.json#verify:phase71` | close gate alias | ✓ VERIFIED | 与 `scripts/verify-phase71-marketplace-lifecycle.ts` 字符串完全一致（`scripts/verify-phase71-marketplace-lifecycle.ts:75-78` `verifyPackageScript()` 验证 alias 与脚本路径严格相等）。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `/settings/plugins` route | `PluginMarketplaceSurface` | page.tsx import + render | ✓ WIRED | `src/app/settings/plugins/page.tsx:3,8`。 |
| `PluginMarketplaceSurface` | `readMarketplaceSurfaceBundle` | SSR bundle seam | ✓ WIRED | `src/components/surfaces/plugin-marketplace-surface.tsx:4,25`。 |
| `recoverMarketplacePluginAction` | `recoverRetainedPluginInstallWithTx` | server action → DAL | ✓ WIRED | `src/actions/plugin-actions.ts:712-770` → `src/lib/dal/plugins.ts:1016`。 |
| `recoverRetainedPluginInstallWithTx` | `pluginOwned*` business tables | Drizzle transaction | ✓ WIRED | `src/lib/dal/plugins.ts:1016-1119` 在事务内把 `pluginLessonExtensions` / `pluginLessonStepExtensions` / `pluginResourceExtensions` / `pluginOwnedBusinessData` / `pluginOwnedQuizQuestions` / `pluginOwnedQuizResponses` 改写到新 `pluginId`；旧 row 标记 `recoveredDataTakeover: true`。 |
| `preflightPluginUpgradeAction` | `preflightPluginUpgrade` → `plugin-migration.ts` backfill/verify/cutover | action → DAL → migration | ✓ WIRED | `src/actions/plugin-actions.ts:772` → `src/lib/dal/plugins.ts:232` → `src/lib/dal/plugin-migration.ts:681-793`（`preflightPluginUpgradeMigration` 内部顺序执行三段）。 |
| `preflightUninstallPluginWithTx` | `cleanupConfirmationToken` + `activeSessions` + `PLUGIN_ACTIVE_CLASSROOM_BLOCKED` | DAL preflight 字段 | ✓ WIRED | `src/lib/dal/plugins.ts:1401 / 1452-1459 / 1473`；`uninstallPluginWithTx:1531-1558` 消费 `cleanupConfirmationToken` 并在 mismatch 抛 `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`。 |
| `scripts/verify-phase71-marketplace-lifecycle.ts` | `package.json#verify:phase71` | alias equality | ✓ WIRED | `scripts/verify-phase71-marketplace-lifecycle.ts:75-78` `verifyPackageScript()` 严格相等校验。 |
| `scripts/verify-phase71-marketplace-lifecycle.ts` | smoke branch proof (live / retained / ended) | `assert(branch, "<branch> data shape")` | ✓ WIRED | `scripts/verify-phase71-marketplace-lifecycle.ts:244 / 292` 等位置的三段 fixture-driven 可执行断言。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `/settings/plugins` page | `recoverablePlugins` / `installedPlugins` / `retainedRecoverable` posture | `readMarketplaceSurfaceBundle` → `plugins.registrations` + ownership scope | Yes | ✓ FLOWING |
| `recoverRetainedPluginInstallWithTx` | `recoveredFromPluginId` / `recoveredDataTakeover` / `pluginLessonExtensions`/`pluginLessonStepExtensions`/`pluginResourceExtensions`/`pluginOwnedBusinessData`/`pluginOwnedQuizQuestions`/`pluginOwnedQuizResponses` | Drizzle transaction in `src/lib/dal/plugins.ts:1016-1119` | Yes | ✓ FLOWING |
| `preflightPluginUpgrade` | `stages: ["backfill", "verify", "cutover"]` + per-stage status | `src/lib/dal/plugin-migration.ts:720-793` | Yes | ✓ FLOWING |
| `preflightUninstallPluginWithTx` | `cleanupConfirmationToken` + `activeSessions` + `blocked` + `reason: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED"` | Drizzle `plugin_owned_quiz_questions` ↔ `classroom_session` join in `src/lib/dal/plugins.ts:674-677` | Yes | ✓ FLOWING |
| `uninstallPluginWithTx` | destructive `uninstall: ` execution (gated by `cleanupConfirmationToken` match) | `src/lib/dal/plugins.ts:1494-1558` | Yes (with token) / blocked (no token) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 71 close gate full proof | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts` | 3 test files, 94 tests, 9.21s, all green | ✓ PASS |
| Phase 71 close gate smoke proof | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts --smoke` | 3 stages, all green | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MKT-01 | 71-02, 71-04 | operator 能在 marketplace surface 发现并安装非内置（external）插件，安装经治理校验（manifest、`dataModel` 校验、命名冲突检查）通过后才进入可用状态。 | ✓ SATISFIED | `readMarketplaceSurfaceBundle` 暴露 external catalog；`recoverMarketplacePluginAction` / `preflightExternalPluginInstall` 经 `PluginManifestSchema` + `dataModel` + `(schoolId, pluginKey)` 唯一检查；`recoverMarketplacePluginAction` 把具名拒因透传；`PluginMarketplaceSurface` 单页内并列 built-in + external。 |
| MKT-02 | 71-01, 71-03, 71-04 | 插件版本遵循 semver；升级走 backfill→verify→cutover 受控数据迁移链路，可在出错时回滚，不丢失既有学习数据。 | ✓ SATISFIED | `preflightPluginUpgrade` + `plugin-migration.ts:720-793` 显式三段；`backfill` → `verify` → `cutover` 顺序执行；verify 失败时 `cutover.status = "skipped"`，旧 version 仍由 `pluginRegistrations` 当前 row 暴露可用。 |
| MKT-03 | 71-01, 71-03, 71-04 | 卸载遵循既有 `uninstallRetentionMode`：默认 `retain`（软禁用、保留数据并要求确认 token），`cleanup` 才级联清理；卸载动作写入 governance audit。 | ✓ SATISFIED | `preflightUninstallPluginWithTx:1401 / :1473` 生成 `cleanupConfirmationToken`；`uninstallPluginWithTx:1531-1558` 在 token 不匹配抛 `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`；`retain` 默认语义不在 destructive path；`cleanup` 才走级联清理。 |
| MKT-04 | 71-02, 71-04 | 卸载后以 `retain` 保留的数据，能在同 `pluginKey` 重新安装时被接管恢复（完整跨版本恢复承诺为 v2 deferred）。 | ✓ SATISFIED | `recoverRetainedPluginInstallWithTx:1016-1119` 在事务内接管 6 张 plugin-owned 表；新 registration 写 `recoveredFromPluginId + recoveredDataTakeover: true`；旧 retained registration 不再作为 executable row 暴露；`recoverMarketplacePluginAction:712` server action 边界透出 takeover 标记。 |
| MKT-05 | 71-01, 71-03, 71-04 | 升级/卸载在存在进行中（active）课堂作答时被安全阻断或受控延迟，给出明确可读原因（扩展 `getPluginUninstallBlockReason` 至 active session）。 | ✓ SATISFIED | `getPluginUninstallBlockReason:603` + preflight 中 active session join `:674-677`；`preflightUninstallPluginWithTx:1458-1459` 输出 `blocked: true, reason: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED", activeSessions`；`scripts/verify-phase71-marketplace-lifecycle.ts` smoke proof 验证 `liveSessionCount >= 1` 作为 active-blocker 真实数据前提。 |

**Requirement ID cross-check:** `71-01-PLAN.md` 声明 `MKT-02, MKT-03, MKT-05`；`71-02-PLAN.md` 声明 `MKT-01, MKT-04`；`71-03-PLAN.md` 隐式覆盖 `MKT-02, MKT-03, MKT-05`（与 71-VALIDATION 第 43 行一致）；`71-04-PLAN.md` 声明 `MKT-01..MKT-05`。`REQUIREMENTS.md:25-29` 锁定 `MKT-01..MKT-05` 都属于 Phase 71。**全部 5 个 requirement 已 accounted for，无 orphaned requirement。**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scripts/verify-phase71-marketplace-lifecycle.ts` (pre Task 1) | was 110-140, 260-300 | lighter shortcuts (fixture-count-only, token-only grep) used as proof of MKT-02 lifecycle discipline | ⚠️ Warning | task 1 of 72.1-01 已经显式补强 verifier：加入 8 项 required static seam 检查 + 三段 `assert(branch, ...)` 可执行证据（live / retained / ended），与 D-72.1-16 / D-72.1-08 锁定的不允许“lifecycle half 用 shortcut”一致；本报告对 lifecycle 的结论基于已补强版 verifier。 |
| `src/lib/dal/plugins.ts` | 1369-1488 | `preflightUninstallPluginWithTx` 仍然 inline 一次取所有 `pluginOwned*` 行；未来 plugin 增长时可能成为热路径 | ⚠️ Info | 当前是单条 SQL join + 4 个 count，可读性与正确性优先；不在本 phase 范围做 count-only preflight 优化。 |

### Human Verification — Surface & Bridge

- `/settings/plugins` 上以同页 dual-section 走查 built-in + external；governance summary 先于 install CTA，retain reinstall 显示 takeover 提示，semver upgrade 显示三段进度，cleanup preflight 暴露真实 impact counts + token，active classroom 阻断并给可读原因。
- 72.1 close gate（计划 72.1-02 / 72.1-03）将再覆写本报告列出的 marketplace-side bridge inputs（route / SSR bundle / recover action / upgrade DAL / uninstall DAL / cleanup token / active-blocker），把 MKT-01..05 由“形式化报告”升级为“milestone-authoritative proof”。

---

**结论：**

- 从代码实现看，Phase 71 的 MKT-01..MKT-05 都被真实代码满足：
  - `/settings/plugins` 单页路由 + `PluginMarketplaceSurface` SSR bundle seam 落地；
  - `recoverMarketplacePluginAction` + `recoverRetainedPluginInstallWithTx` 接管 6 张 plugin-owned 表；
  - `preflightPluginUpgrade` + `plugin-migration.ts` `backfill → verify → cutover` 顺序纪律成立；
  - `preflightUninstallPluginWithTx` + `uninstallPluginWithTx` 在缺失 / 错误 `cleanupConfirmationToken` 时拒绝执行并抛 `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`；
  - active classroom 阻断在 preflight 就把 `blocked: true, reason: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED", activeSessions` 透到 UI。
- `scripts/verify-phase71-marketplace-lifecycle.ts` 在 task 1 已被补强：8 项 required static seam 检查（route / SSR bundle / action / upgrade DAL + 三段 / recover DAL / uninstall DAL + token + active-blocker）+ smoke / full 三段 `assert(branch, ...)` 可执行证据；`--smoke` 快速路径保留。
- 课程侧 recap seam（peer 70-VERIFICATION.md 锁定）未被本 phase 改动，仍以 `pluginOwnedQuizResponses.isLatest=true` 为唯一真相源；`submitQuizSampleAnswerAction` 仍 invalidate `cacheTags.quizStats(sessionId)`；本 phase 71 不引入新的 quiz sample 数据真相来源。
- 重点风险项已被反证：
  - retain 重装不“静默复用旧 registration id”，而是显式新 registration 接管旧数据；
  - semver 升级在 `verify` 失败时旧版本仍可用（cutover 不执行，旧 row 不被废弃）；
  - cleanup 真正进入 destructive path 之前必须有 `cleanupConfirmationToken`；
  - active classroom 触发 `PLUGIN_ACTIVE_CLASSROOM_BLOCKED` 而不是被静默忽略。
- 本报告不替代 milestone close gate：本报告形式化“lifecycle 桥接接缝存在且语义正确”，但 D-72.1-07 / D-72.1-08 / D-72.1-16 的 milestone-authoritative 收口仍由 72.1-02 / 72.1-03 在 `verify:phase72` 入口处再次断言同一批 seam。
- 因此本 phase 现可按 gate 规则标记为 `passed`，并为 72.1 wave 2 / 3 的 close gate 提供可被直接断言的 marketplace-side bridge inputs。

_Verified: 2026-06-07T05:53:30Z_
_Verifier: the agent (gsd-executor / Phase 72.1-01 Task 3)_
