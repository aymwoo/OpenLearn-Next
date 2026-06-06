# Phase 71: Marketplace Lifecycle — Install Governance, Semver Upgrade & Retain/Cleanup Uninstall - Research

**Researched:** 2026-06-04 [VERIFIED: system date]  
**Domain:** external plugin marketplace lifecycle, governed install, semver upgrade orchestration, retain/cleanup uninstall, active-classroom safety [VERIFIED: 71-CONTEXT.md]  
**Confidence:** MEDIUM [VERIFIED: synthesis of codebase + docs + local runtime inspection]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-71-01:** `/settings/plugins` 继续作为唯一 marketplace 入口，但改为**同页双分区**：built-in 与 external 同页展示，不拆独立 external 子页。 [VERIFIED: 71-CONTEXT.md]
- **D-71-02:** external 插件卡片在未安装态先展示**治理摘要**，优先暴露版本、权限、声明数据、命名空间/来源等安装判断信息，而不是盲点安装按钮。 [VERIFIED: 71-CONTEXT.md]
- **D-71-03:** external 安装失败时，拒因必须在**插件卡片内联回显**，直接显示 manifest/dataModel/命名冲突等具名原因，不把 operator 赶到独立结果页或只给 toast。 [VERIFIED: 71-CONTEXT.md]
- **D-71-04:** external 分区的产品语气可以接近**应用商店**，但必须保持受治理 posture：重点仍是“可发现 + 可安装 + 风险透明”，不能滑向运营层 marketplace。 [VERIFIED: 71-CONTEXT.md]
- **D-71-05:** external 插件出现新版本时，默认入口是**先看升级预检**，而不是直接升级。 [VERIFIED: 71-CONTEXT.md]
- **D-71-06:** 升级预检第一屏优先展示**数据影响与阻断项**：是否有真实作答数据、会跑哪些迁移阶段、是否存在 active classroom / 校验失败 / 身份冲突等 blocker；changelog 不是首屏主信息。 [VERIFIED: 71-CONTEXT.md]
- **D-71-07:** 升级执行反馈必须明确呈现 **backfill -> verify -> cutover** 三阶段进度，而不是单一模糊进度条。 [VERIFIED: 71-CONTEXT.md]
- **D-71-08:** 如果升级在 verify 阶段失败，默认停留**旧版本继续可用**并标记升级失败；不进入半升级待修复状态，也不自动切到新版本。 [VERIFIED: 71-CONTEXT.md]
- **D-71-09:** 卸载默认主动作是 **retain**；cleanup 是危险次级操作，不作为默认首选。 [VERIFIED: 71-CONTEXT.md]
- **D-71-10:** 选择 cleanup 时，确认区第一屏必须先展示**真实影响面计数 + confirmation token**，包括将删除多少条作答、影响多少复盘等，而不是只给泛化警告文案。 [VERIFIED: 71-CONTEXT.md]
- **D-71-11:** retain 后若同 `pluginKey` 重新安装，UI 必须明确提示**“已接管保留数据”**；这仍然是一次重新安装，但要诚实表达历史数据被恢复接管。 [VERIFIED: 71-CONTEXT.md]
- **D-71-12:** retain 状态的插件仍留在目录中，但卡片状态必须是**“已卸载但可恢复”**，不能伪装成普通 disabled，也不能从主目录消失。 [VERIFIED: 71-CONTEXT.md]
- **D-71-13:** 只要 external 插件正被 active classroom 使用，升级默认**硬阻断并解释原因**；不提供默认排队延后，也不提供强制升级入口。 [VERIFIED: 71-CONTEXT.md]
- **D-71-14:** 卸载与升级在 active classroom 场景下采用**统一硬阻断策略**，避免 operator 心智分裂。 [VERIFIED: 71-CONTEXT.md]
- **D-71-15:** 阻断提示第一优先展示**哪些课堂/会话正在占用该插件**，而不是只说“当前不可操作”。 [VERIFIED: 71-CONTEXT.md]
- **D-71-16:** 被阻断后提供的后续动作是**查看受影响课堂 + 稍后重试**；不引入偷偷排队执行，也不开放 override 语义。 [VERIFIED: 71-CONTEXT.md]

### the agent's Discretion
- dual-section marketplace 的具体布局方式（stacked sections、tabs-in-page、section hero 组合）可由 planner / UI planning 决定，只要保持同页双分区与治理摘要优先。 [VERIFIED: 71-CONTEXT.md]
- 治理摘要里“版本 / 权限 / dataModel / namespace / sourceType”的具体字段排布与视觉层级可由 planner 结合现有 `PluginMarketplaceSurface` 细化。 [VERIFIED: 71-CONTEXT.md]
- 升级预检与执行是否完全驻留卡片内、抽屉内，还是进入同页 detail panel，可由 planner 决定；前提是不偏离“先预检、后执行、分阶段进度、verify 失败不 cutover”。 [VERIFIED: 71-CONTEXT.md]
- retain 恢复提示的具体 wording、badge、CTA 文案可由 planner 结合 Stitch / DESIGN 决定。 [VERIFIED: 71-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- marketplace 运营层能力（付费/计费、评分评论、公开开发者门户、自动化审核流水线）继续 deferred，不并入 Phase 71。 [VERIFIED: 71-CONTEXT.md]
- 自动排队等课堂结束后再执行升级/卸载、强制 override destructive operations、后台订阅提醒系统，均不纳入本 phase；若未来需要，应单独立 phase。 [VERIFIED: 71-CONTEXT.md]
- milestone 级端到端 close gate 仍属于 Phase 72，不在本 phase 解决。 [VERIFIED: 71-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | operator 能发现并安装 external 插件，且安装经过 manifest / `dataModel` / 命名冲突治理校验。 [VERIFIED: REQUIREMENTS.md] | 研究确认现有 `installOrReconcilePluginWithTx()` 已有 manifest 解析、`pluginKey` / `dbNamespace` 冲突检查，但当前 `/settings/plugins` 仍只展示 built-in，且缺 external 目录、安装预检和内联拒因回显。 [VERIFIED: src/lib/dal/plugins.ts; src/components/surfaces/plugin-marketplace-surface.tsx] |
| MKT-02 | 插件升级必须走 semver + `backfill -> verify -> cutover`，且 rollback-safe、零丢失。 [VERIFIED: REQUIREMENTS.md] | 研究确认 repo 已有 `plugin-migration.ts` 三段式迁移纪律和 Drizzle transaction 支撑，但尚无 Phase 71 级 semver upgrade orchestrator、真实答题数据对账、或 verify-failure 保留旧版本的 operator flow。 [VERIFIED: src/lib/dal/plugin-migration.ts; src/features/platform-core/commands/handlers/plugins.ts] |
| MKT-03 | 卸载遵循 retain/cleanup，cleanup 需要确认 token，且动作写 governance audit。 [VERIFIED: REQUIREMENTS.md] | 研究确认 `preflightUninstallPluginWithTx()` / `uninstallPluginWithTx()` 已有 retain/cleanup、confirmation token 和治理审计基础，但当前影响面只覆盖 `plugin_ext_*` 与 `plugin_owned_business_data`，未覆盖 quiz 结构表与 recap 影响。 [VERIFIED: src/lib/dal/plugins.ts] |
| MKT-04 | retain 后同 `pluginKey` 重装时可接管保留数据。 [VERIFIED: REQUIREMENTS.md] | 研究确认当前 manual install 遇到同 `pluginKey` 会直接冲突，只有非-manual reconcile 或显式 registrationId 才会复用记录，因此必须新增明确的 retain-recover install path，而不是沿用现状。 [VERIFIED: src/lib/dal/plugins.ts] |
| MKT-05 | active classroom 下升级/卸载必须安全阻断并给出可读原因。 [VERIFIED: REQUIREMENTS.md] | 研究确认当前 uninstall blocker 只检查 default/nonDeletable，尚未检查 live `classroomSession`；本地 SQLite 还存在 6 条 `status='live'` 课堂记录，说明该阻断必须是后端真约束而非 UI 文案。 [VERIFIED: src/lib/dal/plugins.ts; src/db/schema.ts; local.db sqlite query] |
</phase_requirements>

## Summary

Phase 71 不是重建 marketplace kernel，而是在已经存在的 lifecycle / governance / migration seams 上补齐 external 插件的“可发现、可安装、可升级、可卸载、可恢复、可解释阻断”闭环。当前代码已经具备 `pluginRegistrations` 的 school-scoped 唯一约束、`dataVersion`、retain/cleanup 卸载语义、`plugin-migration.ts` 的 `backfill -> verify -> cutover` 纪律、以及 `governance-projection` / operator surface 的基础投影能力，但 `/settings/plugins` 仍只展示 built-in，且 uninstall/upgrade 阻断尚未接入 active classroom 与 quiz owned data 的真实影响面。 [VERIFIED: src/db/schema.ts; src/lib/dal/plugins.ts; src/lib/dal/plugin-migration.ts; src/features/platform-core/plugins/governance-projection.ts; src/components/surfaces/plugin-marketplace-surface.tsx]

规划的核心不是“再写一套升级/卸载引擎”，而是把现有事务边界、缓存失效、治理审计、latest-only quiz 真相、以及 classroom live state 绑成一个单一路径。具体说，安装必须走 manifest + `dataModel` + `(schoolId, pluginKey)` / `(schoolId, dbNamespace)` 预检；升级必须在旧版本继续可用前提下完成 preflight、backfill、verify、cutover 与 verify-failure rollback-safe 停留；卸载必须先拿真实影响面（作答条数、受影响 recap 数、占用中的课堂）再决定 retain 或 cleanup。 [VERIFIED: 71-CONTEXT.md; src/lib/dal/plugins.ts; src/lib/dal/plugin-migration.ts; src/lib/dal/classroom.ts]

本地运行时检查还暴露了一个重要规划事实：当前 `local.db` 中已有 13 条 plugin registration、1 条 retained uninstall 样例、6 条 live classroom session，但 `plugin_owned_quiz_questions` / `plugin_owned_quiz_responses` 仍都是 0 行。换言之，Phase 71 的“真实作答零丢失”证明不能依赖现有开发库，必须在 `verify:phase71` 或专用 seed/proof 脚本里主动制造真实 quiz data，再跑升级/retain/cleanup 对账。 [VERIFIED: local.db sqlite query]

**Primary recommendation:** 直接复用 `installOrReconcilePluginWithTx()`、`plugin-migration.ts`、`preflightUninstallPluginWithTx()` 和 `projectPluginGovernance()` 四个既有接缝，新增一个 Phase 71 专属 orchestrator：`install preflight -> upgrade preflight -> upgrade execute -> uninstall preflight -> recover install -> active-session block query`，并把 UI 做成 `/settings/plugins` 同页 built-in / external 双分区。 [VERIFIED: src/lib/dal/plugins.ts; src/lib/dal/plugin-migration.ts; src/features/platform-core/plugins/governance-projection.ts; 71-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| External catalog discovery and governed install preflight | API / Backend [VERIFIED: codebase grep] | Frontend Server (SSR) [VERIFIED: codebase grep] | 拒因、命名冲突、manifest / `dataModel` 校验必须以后端事务与 Zod 为权威；SSR 只负责把 external catalog 和 preflight DTO 呈现到 `/settings/plugins`。 [VERIFIED: src/actions/plugin-actions.ts; src/lib/dal/plugins.ts; src/components/surfaces/plugin-marketplace-surface.tsx] |
| Semver upgrade orchestration (`backfill -> verify -> cutover`) | API / Backend [VERIFIED: codebase grep] | Database / Storage [VERIFIED: codebase grep] | 升级要复用 Drizzle transaction、`pluginRegistrations.dataVersion` 和 plugin-owned 数据表，对账与 rollback-safe 都属于服务端/数据库职责。 [VERIFIED: src/db/schema.ts; src/lib/dal/plugin-migration.ts] |
| Retain/cleanup uninstall governance | API / Backend [VERIFIED: codebase grep] | Database / Storage [VERIFIED: codebase grep] | confirmation token、impact count、治理审计、retain 软卸载与 cleanup cascade 都在 DAL 事务里执行，不能放到客户端。 [VERIFIED: src/lib/dal/plugins.ts] |
| Active-classroom destructive-op blocking | API / Backend [VERIFIED: codebase grep] | Database / Storage [VERIFIED: codebase grep] | live classroom 状态来自 `classroomSession.status='live'` 和 plugin-owned quiz/session 关系，必须由后端查询并生成统一阻断理由。 [VERIFIED: src/db/schema.ts; src/lib/dal/classroom.ts; src/lib/dal/plugins.ts] |
| Marketplace status, progress, and inline reason rendering | Frontend Server (SSR) [VERIFIED: codebase grep] | Browser / Client [VERIFIED: codebase grep] | `/settings/plugins` 页面与 operator surface 负责展示双分区、治理摘要、升级三阶段进度与 retain/recover badge；真正的状态来源仍是 server actions + SSR DTO。 [VERIFIED: src/components/surfaces/plugin-marketplace-surface.tsx; src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite-first。 [VERIFIED: AGENTS.md]
- UI / RSC 组件不能直连数据库；所有读写必须经 DAL 和 Server Actions。 [VERIFIED: AGENTS.md]
- Node.js 20.9+ 是项目目标运行时；Edge Runtime 只用于 SSE，不把复杂 DB / Auth / migration 放到边缘。 [VERIFIED: AGENTS.md]
- 写后必须显式 `updateTag()` / `revalidateTag()`，不能依赖隐式缓存刷新。 [VERIFIED: AGENTS.md; CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx]
- 所有数据库关联继续要求 `onDelete: 'cascade'`。 [VERIFIED: AGENTS.md; CITED: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/relations.mdx]
- 插件系统继续维持“声明式 JSON + Hook + Action + Core API”，禁止 `eval()`、远程动态 import、插件直连 DB / 核心 API。 [VERIFIED: AGENTS.md]
- 页面实现必须继续参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`，且保持 Lexend、无 1px 分隔线、tonal surface 语言。 [VERIFIED: AGENTS.md]
- 只在 GSD 流程内写 planning artifact；本研究输出写入 Phase 71 planning 目录是合规操作。 [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `semver` | `7.8.1` in repo and latest npm as of 2026-05-21 [VERIFIED: package.json; VERIFIED: npm registry] | 比较版本、判断升级范围、处理 prerelease / range / rollback gate。 [CITED: https://github.com/npm/node-semver] | 不要手写版本比较；官方 README 明确提供 `valid` / `satisfies` / `gt` / `lt` / `diff` / `inc` / range parsing，这正是 Phase 71 upgrade planner 需要的能力。 [CITED: https://github.com/npm/node-semver] |
| `zod` | `4.4.3` in repo and latest npm as of 2026-05-04 [VERIFIED: package.json; VERIFIED: npm registry] | external manifest、install preflight、upgrade preflight、uninstall confirm payload 的边界校验。 [VERIFIED: package.json; VERIFIED: codebase grep] | 当前 action / DTO / data-model meta-schema 已经以 Zod 为统一校验边界；Phase 71 应继续沿用而不是引入第二套 validator。 [VERIFIED: src/actions/plugin-actions.ts; plugins/quiz-sample/data-model.ts] |
| `drizzle-orm` | `0.45.2` in repo and latest npm as of 2026-05-22 [VERIFIED: package.json; VERIFIED: npm registry] | 事务、cascade 删除、plugin-owned 读写与 migration verification。 [VERIFIED: package.json; VERIFIED: codebase grep] | Drizzle 官方文档明确支持 transaction 和 `references(..., { onDelete: 'cascade' })`；项目现有 lifecycle / migration seam 已全部建立在 Drizzle 上。 [CITED: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/transactions.mdx; CITED: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/relations.mdx; VERIFIED: src/lib/dal/plugins.ts] |
| `next/cache` (`updateTag`, `revalidateTag`) | repo uses Next `16.2.4`; latest npm is `16.2.7` as of 2026-06-02 [VERIFIED: package.json; VERIFIED: npm registry] | registry / plugin / quizStats / future external catalog 缓存失效。 [VERIFIED: package.json; VERIFIED: codebase grep] | Next.js 文档明确 `updateTag()` 只用于 Server Actions 的 read-your-own-writes，`revalidateTag()` 可用于 Route Handler / background refresh；Phase 71 install/upgrade/uninstall 都需要这两个模式。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx; CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/revalidateTag.mdx] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | repo `4.1.5`; latest npm `4.1.8` as of 2026-06-01 [VERIFIED: package.json; VERIFIED: npm registry] | DAL / action / surface regression tests for install, upgrade, uninstall, recovery, blocking。 [VERIFIED: package.json; VERIFIED: vitest.config.mts] | 继续沿用现有 unit/integration harness；Phase 71 不需要另起测试框架。 [VERIFIED: vitest.config.mts; scripts/verify-phase48-lifecycle-and-uninstall.ts] |
| `plugin-migration.ts` (internal seam) | existing repo seam [VERIFIED: codebase grep] | `backfill -> verify -> cutover` 的唯一迁移纪律。 [VERIFIED: src/lib/dal/plugin-migration.ts] | 只要 upgrade 触及 plugin-owned 数据形态，就必须复用它，不要再发明第二套 migration runner。 [VERIFIED: src/lib/dal/plugin-migration.ts; 71-CONTEXT.md] |
| `governance-projection.ts` (internal seam) | existing repo seam [VERIFIED: codebase grep] | 把 lifecycle / uninstall / blocker 统一投影到 UI DTO。 [VERIFIED: src/features/platform-core/plugins/governance-projection.ts] | external dual-section、retain-recover badge、active-session hard block、cleanup token 缺失提示都应从同一 projection 产出。 [VERIFIED: src/features/platform-core/actions/registry.ts; src/components/surfaces/plugin-lifecycle-operator-surface.tsx] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `semver` [VERIFIED: package.json] | 手写 `major/minor/patch` 比较 [ASSUMED] | 不值得；node-semver 已覆盖 range、prerelease、coercion、subset、min/max satisfying，手写实现极易在 prerelease 与 rollback gate 上出错。 [CITED: https://github.com/npm/node-semver] |
| existing `plugin-migration.ts` [VERIFIED: codebase grep] | 新建第二套 lifecycle migration engine [ASSUMED] | 不该做；现有三段式迁移已经符合 Phase 71 success criteria，第二引擎只会制造双真相与审计分裂。 [VERIFIED: src/lib/dal/plugin-migration.ts; 71-CONTEXT.md] |
| `updateTag()` in Server Actions [CITED: Next.js docs] | 全部使用 `revalidateTag()` [CITED: Next.js docs] | install / upgrade / uninstall 完成后当前操作人需要立即看见新状态时应使用 `updateTag()`；只有 route handler 或后台补偿流才该用 `revalidateTag()`。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx; CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/revalidateTag.mdx] |

**Installation:**
```bash
# No new packages required for Phase 71.
# Reuse repo-pinned semver, zod, drizzle-orm, next, and vitest.
```

**Version verification:**  
- `semver@7.8.1`, modified `2026-05-21`. [VERIFIED: npm registry]  
- `next@16.2.7` latest on npm, while repo is pinned to `16.2.4`; do not bundle framework upgrade into Phase 71. [VERIFIED: npm registry; VERIFIED: package.json]  
- `drizzle-orm@0.45.2`, modified `2026-05-22`. [VERIFIED: npm registry]  
- `zod@4.4.3`, modified `2026-05-04`. [VERIFIED: npm registry]  
- `vitest@4.1.8` latest on npm, while repo is pinned to `4.1.5`; Phase 71 can stay on existing pin. [VERIFIED: npm registry; VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Operator opens /settings/plugins
    |
    v
SSR surface loads built-in + external sections
    |
    +--> install preflight request ------------------------------+
    |                                                           |
    |                                                     validate manifest
    |                                                     validate dataModel
    |                                                     check pluginKey/dbNamespace uniqueness
    |                                                           |
    |<---------------- inline accept / named reject -------------+
    |
    +--> upgrade preflight request ------------------------------+
    |                                                           |
    |                                                     query live classroom blockers
    |                                                     inspect retained data / owned rows / recap impact
    |                                                     build semver migration plan
    |                                                           |
    |<------------- blocker list + backfill/verify/cutover plan -+
    |
    +--> upgrade execute ----------------------------------------+
    |                                                           |
    |                                            backfill -> verify -> cutover
    |                                            row-count/checksum/stat parity
    |                                            updateTag(plugin registry/views)
    |                                                           |
    |<-------------------- stage progress / verify failure ------+
    |
    +--> uninstall preflight ------------------------------------+
    |                                                           |
    |                                              count ext rows + owned rows
    |                                              count affected recap/session surfaces
    |                                              derive confirmation token
    |                                                           |
    |<--------------- retain default / cleanup impact summary ---+
    |
    +--> retain or cleanup execute ------------------------------+
                                                                |
                                                         governance audit + tx
                                                         retain: soft disable
                                                         cleanup: cascade delete
                                                         active-session hard block
```

### Recommended Project Structure

```text
src/
├── components/surfaces/
│   ├── plugin-marketplace-surface.tsx        # Phase 71 dual-section marketplace + inline preflight/upgrade state
│   └── plugin-lifecycle-operator-surface.tsx # shared lifecycle/uninstall dialog patterns
├── actions/
│   └── plugin-actions.ts                     # install/upgrade/uninstall/recover server-action boundary + cache invalidation
├── lib/dal/
│   ├── plugins.ts                            # install/reconcile/preflight/uninstall/retain/recover/block reason truth
│   ├── plugin-migration.ts                   # backfill/verify/cutover orchestration reused for semver upgrade
│   └── classroom.ts                          # live classroom detection + quiz stats parity source
├── features/platform-core/
│   ├── commands/handlers/plugins.ts          # governance command orchestration
│   ├── actions/registry.ts                   # dashboard bundle and projection consumers
│   └── plugins/governance-projection.ts      # lifecycle/uninstall/block DTO projection
└── db/schema/generated/plugin-owned/
    └── quiz.ts                               # real plugin-owned quiz data Phase 71 must preserve
```

### Pattern 1: Install Preflight Before Registration
**What:** external 安装先做 manifest / `dataModel` / uniqueness preflight，通过后才调用 registration transaction。 [VERIFIED: 71-CONTEXT.md; VERIFIED: src/lib/dal/plugins.ts]  
**When to use:** 所有 `sourceType='external'` 安装与 retain-recover 重装入口。 [VERIFIED: src/db/schema.ts; 71-CONTEXT.md]  
**Example:**
```typescript
// Source: src/lib/dal/plugins.ts [VERIFIED: codebase grep]
const parsedManifest = PluginManifestSchema.parse(input.manifestJson)
const pluginKey = parsedManifest.id
const derivedNamespace = deriveDbNamespace(pluginKey)

if (pluginKeyConflict) throw new Error("PLUGIN_KEY_CONFLICT")
if (namespaceConflict) throw new Error("PLUGIN_DB_NAMESPACE_CONFLICT")

// Phase 71 should add external install preflight before this write.
await tx.insert(pluginRegistrations).values({
  schoolId: input.schoolId,
  manifestJson: parsedManifest,
  pluginKey,
  dbNamespace: derivedNamespace,
  sourceType: "external",
})
```

### Pattern 2: Upgrade as `backfill -> verify -> cutover`, Never Direct Cutover
**What:** 先做可重复的 backfill，再做 row-count / parity verify，最后才 cutover；verify 失败则旧版本继续可用。 [VERIFIED: 71-CONTEXT.md; VERIFIED: src/lib/dal/plugin-migration.ts]  
**When to use:** 任何跨 semver 数据形态变化，尤其涉及 quiz question/response 结构或 derived stats 的升级。 [VERIFIED: REQUIREMENTS.md; 71-CONTEXT.md]  
**Example:**
```typescript
// Source: src/lib/dal/plugin-migration.ts [VERIFIED: codebase grep]
await backfillPluginJsonToSchema(actorId, schoolId, pluginId, entityType)

const verify = await verifyBackfillData(actorId, schoolId, pluginId, entityType)
if (!verify.matches) {
  throw new Error(`CUTOVER_ABORTED: ${verify.mismatches.join(",")}`)
}

await cutoverPluginJsonToSchema(actorId, schoolId, pluginId, entityType)
```

### Pattern 3: Retain-First Uninstall with Explicit Cleanup Confirmation
**What:** retain 是默认路径；cleanup 必须拿真实影响面派生 token，再进入级联删除事务。 [VERIFIED: 71-CONTEXT.md; VERIFIED: src/lib/dal/plugins.ts]  
**When to use:** 所有 external 卸载入口。 [VERIFIED: REQUIREMENTS.md]  
**Example:**
```typescript
// Source: src/lib/dal/plugins.ts [VERIFIED: codebase grep]
const preflight = await preflightUninstallPluginWithTx({...})

if (retentionMode === "cleanup") {
  if (input.confirmationToken !== preflight.cleanupConfirmationToken) {
    throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED")
  }
  await tx.delete(pluginRegistrations).where(...)
} else {
  await tx.update(pluginRegistrations).set({
    lifecycleState: "disabled",
    uninstalledAt: new Date(),
    uninstallRetentionMode: "retain",
  })
}
```

### Pattern 4: Active-Classroom Hard Block Comes from Backend Query, Not UI Guessing
**What:** 升级/卸载 blocker 必须以后端查询 live `classroomSession` + plugin usage 为真相。 [VERIFIED: 71-CONTEXT.md; VERIFIED: src/db/schema.ts; VERIFIED: local.db sqlite query]  
**When to use:** 所有 destructive lifecycle 操作的 preflight。 [VERIFIED: REQUIREMENTS.md]  
**Example:**
```typescript
// Source pattern: classroomSession.status and recap DAL seams [VERIFIED: codebase grep]
const liveSessions = await db
  .select({ id: classroomSessions.id, lessonId: classroomSessions.lessonId, classId: classroomSessions.classId })
  .from(classroomSessions)
  .where(eq(classroomSessions.status, "live"))

// Phase 71 should join these sessions to plugin usage before allowing upgrade/uninstall.
```

### Anti-Patterns to Avoid
- **不要把 upgrade 做成“直接切新版本再补校验”**：这会违背 D-71-08 的 verify-failure old-version-safe 约束。 [VERIFIED: 71-CONTEXT.md]
- **不要把 retain-recover 偷偷实现成 manual install 自动覆写旧 registration**：当前 manual install 对同 `pluginKey` 直接冲突，必须设计显式 recover path。 [VERIFIED: src/lib/dal/plugins.ts]
- **不要只统计 `plugin_owned_business_data` 影响面**：quiz sample 的真实数据在 `plugin_owned_quiz_questions` / `plugin_owned_quiz_responses`，否则 cleanup token 和 impact 文案会低报。 [VERIFIED: src/db/schema/generated/plugin-owned/quiz.ts; src/lib/dal/plugins.ts]
- **不要把 active-session blocker 放到前端禁用按钮了事**：本地数据库已有 6 条 live classroom，后端必须拒绝真实命令。 [VERIFIED: local.db sqlite query]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 版本比较 / 范围匹配 | 自写 `major/minor/patch` 比较器 [ASSUMED] | `semver.valid` / `satisfies` / `gt` / `diff` [CITED: https://github.com/npm/node-semver] | prerelease、range、coercion、subset 都是坑点；npm 官方实现已覆盖。 [CITED: https://github.com/npm/node-semver] |
| 生命周期迁移引擎 | 第二套 upgrade migration runner [ASSUMED] | existing `plugin-migration.ts` + Drizzle transaction [VERIFIED: codebase grep; CITED: Drizzle docs] | repo 已有 backfill/verify/cutover seam；重复发明只会引入双真相和审计分裂。 [VERIFIED: src/lib/dal/plugin-migration.ts] |
| 读写后缓存刷新 | 客户端 toast 后手工 `router.refresh()` 当唯一真相 [ASSUMED] | `updateTag()` in Server Actions, `revalidateTag()` in route/background flows [CITED: Next.js docs] | Next.js 16 明确区分 read-your-own-writes 与 background refresh；生命周期 UI 需要后端 authoritative invalidation。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx; CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/revalidateTag.mdx] |
| 卸载确认 | 纯 UI checkbox / “我已知晓风险” 文案 [ASSUMED] | 真实影响面计数 + deterministic confirmation token [VERIFIED: codebase grep; VERIFIED: 71-CONTEXT.md] | 只有和真实数据量绑定，operator 才能看见 blast radius，且后端可以复核。 [VERIFIED: src/lib/dal/plugins.ts; 71-CONTEXT.md] |

**Key insight:** Phase 71 真正危险的不是 UI，而是“看起来只是 lifecycle 按钮，实际上会改动 plugin identity、owned rows、stats truth、以及 live classroom continuity”；这些都必须绑定到现有受治理后端接缝。 [VERIFIED: 71-CONTEXT.md; src/lib/dal/plugins.ts; src/lib/dal/classroom.ts]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `local.db` 当前有 `pluginRegistration=13`、`plugin_owned_quiz_questions=0`、`plugin_owned_quiz_responses=0`、`classroomSession=6`、`classroomParticipant=201`、`governanceAudit=33`，且存在 1 条 retained uninstall row（`phase52-retain-uninstall-plugin`）。 [VERIFIED: local.db sqlite query] | 计划里必须包含可重复 seed / verify fixture：主动制造 quiz question/response 真数据、retain row、live classroom 占用样本，再跑 upgrade / uninstall / recover proof；否则 MKT-02/MKT-04/MKT-05 没有真实数据可验。 [VERIFIED: local.db sqlite query] |
| Live service config | 在 repo scope 内未发现 plugin lifecycle 依赖外部 marketplace service、队列编排或非 SQLite 的 lifecycle config；现有 install/uninstall/registry/dashboard 读取均直接来自 repo 内 Server Actions + DAL。 [VERIFIED: src/actions/plugin-actions.ts; src/features/platform-core/actions/registry.ts; codebase grep] | 代码层无需外部服务迁移；但 planner 应显式说明“Phase 71 proof 以 repo-local SQLite + Vitest / verify script 为主”。 [VERIFIED: codebase grep] |
| OS-registered state | workspace inspection 未发现与 plugin lifecycle 绑定的 systemd / launchd / pm2 / scheduler 注册物；当前 phase 入口是 Next app + scripts，不是 OS-level plugin daemon。 [VERIFIED: workspace inspection; codebase grep] | None — repo-local execution path already covers the phase. [VERIFIED: workspace inspection] |
| Secrets/env vars | 代码中未发现 plugin lifecycle 专属 env var 名；与本 phase 直接相关的只有通用 `DB_FILE_NAME`。 [VERIFIED: grep over `src/**` and `scripts/**`] | None for lifecycle naming; verify scripts may override `DB_FILE_NAME` to isolated test DBs. [VERIFIED: scripts/verify-phase68-data-access-verbs.ts; scripts/verify-phase69-quiz-sample.ts] |
| Build artifacts | plugin-owned schema 生成物是 repo-tracked `src/db/schema/generated/plugin-owned/*.ts`，不是宿主机全局安装产物；workspace inspection 未发现额外 plugin lifecycle-specific binary/install artifact。 [VERIFIED: codebase grep; workspace inspection] | None — keep generated schema in repo and add Phase 71 verifier script under `scripts/`. [VERIFIED: src/db/schema/generated/plugin-owned/quiz.ts; scripts directory listing] |

## Common Pitfalls

### Pitfall 1: Uninstall Preflight Under-Counts Real Impact
**What goes wrong:** 当前 preflight 只统计 `plugin_ext_*` 与 `plugin_owned_business_data`，没有统计 `plugin_owned_quiz_questions` / `plugin_owned_quiz_responses`，也没有计算“影响多少复盘”。 [VERIFIED: src/lib/dal/plugins.ts; src/db/schema/generated/plugin-owned/quiz.ts]  
**Why it happens:** Phase 48 的 uninstall seam建立在 generic ext/KV 时代，晚于 Phase 69/70 的结构化 quiz data 与 recap 投影。 [VERIFIED: scripts/verify-phase48-lifecycle-and-uninstall.ts; 71-CONTEXT.md]  
**How to avoid:** 扩展 preflight summary 到 plugin-owned structured tables，并新增 recap/session impact counting query。 [VERIFIED: 71-CONTEXT.md]  
**Warning signs:** cleanup token 的 `totalCount` 很小，但该插件明明已经有真实答题数据或课后复盘记录。 [VERIFIED: codebase behavior synthesis]

### Pitfall 2: Governance Audit Is Written Before Cleanup Token Is Fully Accepted
**What goes wrong:** `uninstallPluginWithTx()` 在校验 cleanup token 之前就先写了一条 `governanceAudit(decision='allowed')`，随后 token 不匹配才抛错。 [VERIFIED: src/lib/dal/plugins.ts]  
**Why it happens:** 当前审计写入位于 retain/cleanup 分支之前。 [VERIFIED: src/lib/dal/plugins.ts]  
**How to avoid:** Phase 71 规划应把审计拆成 preflight intent 与 execute outcome，或把 cleanup-denied 记录为 `decision='denied'`。 [VERIFIED: codebase reasoning from `uninstallPluginWithTx()`]  
**Warning signs:** 审计里显示 `plugin.uninstall allowed`，但 UI 实际收到 `PLUGIN_CLEANUP_CONFIRMATION_REQUIRED`。 [VERIFIED: src/lib/dal/plugins.ts]

### Pitfall 3: Retain-Recover Flow Accidentally Becomes Identity Reuse or Identity Drift
**What goes wrong:** 当前 manual install 的同 `pluginKey` 会直接报 `PLUGIN_KEY_CONFLICT`，而非 recover；如果简单放开冲突，又可能把 retain recovery 变成“静默覆写旧 registration”。 [VERIFIED: src/lib/dal/plugins.ts]  
**Why it happens:** 现有 reconcile 只在 `installSource !== 'manual'` 或显式 `pluginId` 时自动复用旧记录。 [VERIFIED: src/lib/dal/plugins.ts]  
**How to avoid:** 设计显式的 recover-install path：先识别 retained row，再决定是新 pluginId 接管旧数据、还是复用旧 row 并单独记录 recovery audit。 [VERIFIED: 71-CONTEXT.md; codebase gap analysis]  
**Warning signs:** 重装 external 插件时只看到 generic conflict，或恢复后旧/新 pluginId 同时可见。 [VERIFIED: 71-CONTEXT.md; src/lib/dal/plugins.ts]

### Pitfall 4: Active-Classroom Blocker Is Still UI-Only
**What goes wrong:** 当前后端 blocker 只拒 default / nonDeletable，不拒 live classroom；如果 planner 只做按钮禁用文案，命令层仍然能执行 destructive op。 [VERIFIED: src/lib/dal/plugins.ts]  
**Why it happens:** `getPluginUninstallBlockReason()` 还没有 classroom join。 [VERIFIED: src/lib/dal/plugins.ts]  
**How to avoid:** 把 live `classroomSession` 检测并入 uninstall/upgrade preflight 和最终 execute guard。 [VERIFIED: src/db/schema.ts; local.db sqlite query]  
**Warning signs:** `/settings/plugins` 显示被占用，但直接调 action/command 仍能卸载或升级。 [VERIFIED: codebase architecture]

### Pitfall 5: Zero-Loss Upgrade Is Claimed Without Real Quiz Data
**What goes wrong:** 升级链只在空表或 synthetic counts 上验证，无法证明真实作答和统计投影不丢失。 [VERIFIED: local.db sqlite query]  
**Why it happens:** 当前开发库里 quiz owned rows 为 0，容易让 phase 在“逻辑正确”但“没有真实数据”时通过。 [VERIFIED: local.db sqlite query]  
**How to avoid:** `verify:phase71` 必须先 seed quiz question/response rows，再校验 row counts、latest-only stats parity、retain recovery parity。 [VERIFIED: REQUIREMENTS.md; 71-CONTEXT.md]  
**Warning signs:** verifier 只检查 action wiring / surface copy，不检查 pre-upgrade 与 post-upgrade data parity。 [VERIFIED: scripts/verify-phase48-lifecycle-and-uninstall.ts; scripts/verify-phase70-quiz-stats.ts]

## Code Examples

Verified patterns from official sources:

### Semver Range and Comparison Operations
```typescript
// Source: https://github.com/npm/node-semver
import semver from 'semver'

semver.valid('1.2.3')
semver.satisfies('1.2.3', '^1.2.0')
semver.gt('2.0.0', '1.9.9')
semver.diff('1.2.3', '2.0.0')
```

### Server Action Cache Invalidation for Read-Your-Own-Writes
```typescript
// Source: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx
'use server'

import { updateTag } from 'next/cache'

export async function completeLifecycleMutation(pluginId: string) {
  // ...perform DB work...
  updateTag('plugin:registry')
  updateTag(`plugin:${pluginId}`)
}
```

### Drizzle Transaction for Atomic Lifecycle Mutations
```typescript
// Source: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/transactions.mdx
import { eq } from 'drizzle-orm'

await db.transaction(async (tx) => {
  await tx.delete(orderDetails).where(eq(orderDetails.orderId, id))
  await tx.delete(orders).where(eq(orders.id, id))
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/settings/plugins` 只显示 built-in，并强调“无删除语义”。 [VERIFIED: codebase grep] | Phase 71 需要同页 built-in + external 双分区，并把 external 卡片变成治理型 install/upgrade/uninstall surface。 [VERIFIED: 71-CONTEXT.md; src/components/surfaces/plugin-marketplace-surface.tsx] | built-in-only baseline comes from Phase 48 surface. [VERIFIED: scripts/verify-phase48-lifecycle-and-uninstall.ts] | Planner 不能新开 external 独立页，也不能把 external lifecycle 藏到 settings labs。 [VERIFIED: 71-CONTEXT.md] |
| uninstall blocker 只拒 default/nonDeletable。 [VERIFIED: src/lib/dal/plugins.ts] | Phase 71 blocker 要扩展到 active classroom，占用课堂/会话需可读展示。 [VERIFIED: 71-CONTEXT.md] | current baseline in repo on 2026-06-04. [VERIFIED: codebase grep] | destructive-op safety now depends on classroom join logic, not only plugin metadata. [VERIFIED: src/db/schema.ts; 71-CONTEXT.md] |
| preflight impact count 只覆盖 `plugin_ext_*` 和 `plugin_owned_business_data`。 [VERIFIED: src/lib/dal/plugins.ts] | Phase 71 必须覆盖 `plugin_owned_quiz_*` 与 recap impact。 [VERIFIED: 71-CONTEXT.md; src/db/schema/generated/plugin-owned/quiz.ts] | gap surfaced after Phases 69-70 introduced structured quiz data and recap stats. [VERIFIED: 69-CONTEXT.md; 70-CONTEXT.md] | cleanup confirmation token and inline blast radius text must become data-complete. [VERIFIED: 71-CONTEXT.md] |
| `plugin-migration.ts` 已支持 `backfill -> verify -> cutover`，但未挂 semver upgrade UX。 [VERIFIED: src/lib/dal/plugin-migration.ts] | Phase 71 要把它变成 operator-visible semver upgrade pipeline with rollback-safe failure posture. [VERIFIED: 71-CONTEXT.md] | migration seam existed before Phase 71. [VERIFIED: src/lib/dal/plugin-migration.ts] | 不需要第二引擎，只需要 planner-level orchestration、progress DTO 和 verify proof. [VERIFIED: codebase analysis] |

**Deprecated/outdated:**
- 继续把 external lifecycle 操作塞回 `settings/labs` 或 operator-only surface 已不符合 D-71-01 的单页 `/settings/plugins` 入口决策。 [VERIFIED: 71-CONTEXT.md]
- 把 cleanup 确认退化成泛化警告弹窗已不符合 D-71-10 的真实影响面 + token 首屏要求。 [VERIFIED: 71-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None — all material claims below were verified against codebase, local runtime inspection, npm registry, or official docs used in this session. [VERIFIED: research record] | — | — |

## Open Questions (RESOLVED)

1. **retain 恢复到底是“新 pluginId 接管旧数据”还是“恢复同一 retained row”更适合现有 schema？** [RESOLVED] [VERIFIED: 71-CONTEXT.md; src/lib/dal/plugins.ts]
   - Final decision: 采用 **“新 pluginId 接管旧数据”**，不恢复同一 retained row。新的 external 安装会创建新 registration，再把 `pluginLessonExtensions`、`pluginLessonStepExtensions`、`pluginResourceExtensions`、`pluginOwnedBusinessData`、`pluginOwnedQuizQuestions`、`pluginOwnedQuizResponses` 这些仍归属于 retained plugin 的业务行在单事务内改写到新 `pluginId`；旧 retained registration 保留为 takeover source/审计来源，但不再作为可执行 plugin row 暴露。 [VERIFIED: 71-CONTEXT.md; src/lib/dal/plugins.ts; src/db/schema/generated/plugin-owned/quiz.ts]
   - Why: 这与 D-71-11 的“同 `pluginKey` 重装时以新 pluginId 身份接管恢复”完全一致，也避免把 manual install 偷偷变成 silent reuse retained row。旧 audit 记录保持原 `pluginId`，通过 recovery metadata 关联新旧身份，比重写历史 audit 更诚实。 [VERIFIED: 71-CONTEXT.md; codebase analysis]

2. **“影响 M 个复盘”应基于什么事实表计数？** [RESOLVED] [VERIFIED: 71-CONTEXT.md; src/lib/dal/plugins.ts; src/lib/dal/classroom.ts]
   - Final decision: 使用 **“受影响的 ended classroom sessions 数”** 作为 Phase 71 的 `M`。统计口径不是虚构的 `classroomSessionSummary` durable artifact，而是“如果 cleanup 删除该 plugin 的 owned quiz questions/responses 后，会失去题目复盘能力的 ended sessions 数”。 [VERIFIED: 71-CONTEXT.md; 70-CONTEXT.md; local.db sqlite query]
   - Why: Phase 70 已明确 quiz stats 是只读投影，不落 durable summary 表；因此把 `M` 定义为受影响 ended sessions 最贴近 operator 可理解的 blast radius，也与 D-71-10 的“影响多少复盘”表达一致。 [VERIFIED: 70-CONTEXT.md; codebase analysis]

3. **upgrade verify 的 checksum 应覆盖哪些对象？** [RESOLVED] [VERIFIED: REQUIREMENTS.md; src/lib/dal/plugin-migration.ts]
   - Final decision: upgrade verify 同时覆盖三类对象：1) `plugin_owned_quiz_questions` 行数与稳定业务字段；2) `plugin_owned_quiz_responses` 的业务校验和，字段最少包含 `classroomSession`、`student`、`question`、`selectedOption`、`attemptNo`、`isLatest`；3) 基于 ended session 计算出的 quiz stats DTO hash，用于证明统计口径不变。 [VERIFIED: ROADMAP.md; 71-CONTEXT.md; src/db/schema/generated/plugin-owned/quiz.ts; src/lib/dal/classroom.ts]
   - Why: 单看 row count 不能证明 stats parity，直接 hash 全量 JSON 又会把非业务字段噪音算进去；按稳定业务字段 + 聚合 DTO 做 checksum，最符合 MKT-02 对“零丢失、历史统计不变”的要求。 [VERIFIED: codebase analysis]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js server actions, verify scripts, tsx execution [VERIFIED: package.json; codebase grep] | ✓ [VERIFIED: shell] | `v24.1.0` installed; project target is `>=20.9`. [VERIFIED: shell; AGENTS.md] | — |
| pnpm | package scripts and verifier runs [VERIFIED: package.json] | ✓ [VERIFIED: shell] | `10.33.0` [VERIFIED: shell] | npm can run some scripts, but repo is pnpm-based. [VERIFIED: package.json] |
| npm | npm registry checks / fallback CLI tools [VERIFIED: shell] | ✓ [VERIFIED: shell] | `11.6.2` [VERIFIED: shell] | — |
| sqlite3 CLI | local proof DB inspection and lightweight runtime state audit [VERIFIED: shell] | ✓ [VERIFIED: shell] | `3.53.1` [VERIFIED: shell] | Drizzle tests can still run without CLI, but manual state inspection becomes slower. [VERIFIED: shell] |
| Context7 MCP | current docs lookup [VERIFIED: tool attempt] | ✗ [VERIFIED: tool error] | API key unavailable in this session [VERIFIED: tool error] | CLI fallback `npx ctx7@latest ...` works and was used successfully. [VERIFIED: bash output] |

**Missing dependencies with no fallback:**
- None identified for planning/research. [VERIFIED: shell inspection]

**Missing dependencies with fallback:**
- Context7 MCP credentials are unavailable, but CLI fallback via `npx ctx7@latest` is viable. [VERIFIED: tool error; VERIFIED: bash output]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.5` in repo, config at `vitest.config.mts`. [VERIFIED: package.json; VERIFIED: vitest.config.mts] |
| Config file | `vitest.config.mts`. [VERIFIED: vitest.config.mts] |
| Quick run command | `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-marketplace-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`. [VERIFIED: existing test files] |
| Full suite command | `none — see Wave 0`; Phase 71 needs a dedicated `verify:phase71` script analogous to `verify:phase48` / `verify:phase70`. [VERIFIED: package.json; VERIFIED: scripts directory listing] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-01 | external install preflight rejects bad manifest / bad `dataModel` / naming conflicts and surfaces named reasons inline. [VERIFIED: REQUIREMENTS.md; 71-CONTEXT.md] | unit + surface | `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-marketplace-surface.test.tsx` [VERIFIED: files exist] | ✅ extend existing files [VERIFIED: glob/read] |
| MKT-02 | semver upgrade runs preflight/backfill/verify/cutover, preserves row counts and stats parity. [VERIFIED: REQUIREMENTS.md] | integration + verifier | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts` [VERIFIED: naming pattern from package scripts] | ❌ Wave 0 |
| MKT-03 | retain default, cleanup token required, both paths write correct governance audit. [VERIFIED: REQUIREMENTS.md] | unit + integration | `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` [VERIFIED: files exist] | ✅ extend existing files [VERIFIED: glob/read] |
| MKT-04 | retained uninstall can be reinstalled and explicitly shows takeover of retained data. [VERIFIED: REQUIREMENTS.md] | integration + surface | `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-marketplace-surface.test.tsx` [VERIFIED: files exist] | ✅/❌ existing files yes, scenario coverage no — Wave 0 additions needed [VERIFIED: current test reads] |
| MKT-05 | live classroom blocks upgrade/uninstall and lists affected sessions. [VERIFIED: REQUIREMENTS.md] | integration + DAL | `pnpm vitest run src/lib/dal/plugins.test.ts src/lib/dal/classroom.test.ts src/actions/plugin-actions.test.ts` [VERIFIED: files exist] | ✅/❌ files exist, coverage absent — Wave 0 additions needed [VERIFIED: glob/read] |

### Sampling Rate
- **Per task commit:** quick Vitest subset above. [VERIFIED: test file inventory]  
- **Per wave merge:** quick Vitest subset + dedicated Phase 71 verifier script once added. [VERIFIED: scripts pattern from `verify-phase48` / `verify-phase70`]  
- **Phase gate:** `pnpm verify:phase71` should seed real quiz data, execute install/upgrade/retain/cleanup/live-session blocking proofs, and then run regression subsets from Phases 48-70. [VERIFIED: ROADMAP dependency chain; scripts/verify-phase48-lifecycle-and-uninstall.ts; scripts/verify-phase70-quiz-stats.ts]

### Wave 0 Gaps
- [ ] `scripts/verify-phase71-marketplace-lifecycle.ts` — covers MKT-02/MKT-03/MKT-04/MKT-05 with real quiz data and active classroom blockers. [VERIFIED: scripts gap]
- [ ] `src/components/surfaces/plugin-marketplace-surface.test.tsx` — add external dual-section, inline preflight reject reasons, recover badge, upgrade-preflight-first coverage. [VERIFIED: current test only covers built-in non-destructive posture]
- [ ] `src/lib/dal/plugins.test.ts` — add structured quiz row impact counts, active classroom blocker, retain-recover install path, audit outcome correctness. [VERIFIED: current tests only cover generic cleanup/retain basics]
- [ ] `src/actions/plugin-actions.test.ts` — add upgrade/recover actions and cache invalidation assertions. [VERIFIED: current tests stop at preflight uninstall basics]
- [ ] `src/lib/dal/classroom.test.ts` or dedicated lifecycle-blocker test — prove live `classroomSession.status='live'` blocks destructive ops. [VERIFIED: current phase-71-specific coverage absent]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes [VERIFIED: codebase grep] | lifecycle actions require authenticated user via `requireCurrentActorId()` and membership scope checks. [VERIFIED: src/actions/plugin-actions.ts; src/lib/dal/plugins.ts] |
| V3 Session Management | no direct new session mechanism [VERIFIED: codebase grep] | reuse existing Auth.js session-derived actor identity; Phase 71 should not add custom session state. [VERIFIED: AGENTS.md; src/actions/plugin-actions.ts] |
| V4 Access Control | yes [VERIFIED: codebase grep] | teacher/admin/developer role checks, governed action registry, school-scoped DAL, live-classroom backend blockers. [VERIFIED: src/actions/plugin-actions.ts; src/lib/dal/plugins.ts; src/features/platform-core/actions/registry.ts] |
| V5 Input Validation | yes [VERIFIED: codebase grep] | Zod for manifest/dataModel/action payloads; semver parsing for version legitimacy; no raw SQL or free-form where clauses. [VERIFIED: src/actions/plugin-actions.ts; plugins/quiz-sample/data-model.ts; CITED: https://github.com/npm/node-semver] |
| V6 Cryptography | limited / mostly no [VERIFIED: codebase grep] | current cleanup token is deterministic business token, not cryptographic proof; do not market it as security secret. [VERIFIED: src/lib/dal/plugins.ts] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Namespace collision (`pluginKey` / `dbNamespace`) to hijack another plugin’s identity | Spoofing / Tampering | reject install unless `(schoolId, pluginKey)` and `(schoolId, dbNamespace)` are unique; keep school-scoped checks in DAL. [VERIFIED: src/db/schema.ts; src/lib/dal/plugins.ts] |
| Destructive cleanup submitted with stale or fake confirmation data | Tampering | derive token from real counts server-side and recheck in transaction before delete. [VERIFIED: src/lib/dal/plugins.ts] |
| Upgrade/uninstall during live classroom causes answer loss or broken runtime | Tampering / DoS | backend preflight + execute guard must query `classroomSession.status='live'` and reject with affected session list. [VERIFIED: src/db/schema.ts; 71-CONTEXT.md; local.db sqlite query] |
| Malformed external manifest / `dataModel` opening injection or invalid schema path | Tampering / Elevation | parse with Zod at boundary and keep compile-time governed `dataModel` discipline. [VERIFIED: plugins/quiz-sample/data-model.ts; REQUIREMENTS.md] |
| Cache stale after lifecycle mutation makes operator act on wrong state | Tampering / Repudiation | `updateTag()` after Server Actions, `revalidateTag()` only in background/route contexts. [CITED: Next.js docs; VERIFIED: src/actions/classroom-actions.ts; src/actions/plugin-actions.ts] |

## Sources

### Primary (HIGH confidence)
- `src/lib/dal/plugins.ts` — install/reconcile conflicts, uninstall preflight, retain/cleanup logic, current blocker gaps. [VERIFIED: codebase grep]
- `src/lib/dal/plugin-migration.ts` — existing `backfill -> verify -> cutover` seam. [VERIFIED: codebase grep]
- `src/components/surfaces/plugin-marketplace-surface.tsx` — built-in-only marketplace baseline. [VERIFIED: codebase grep]
- `src/features/platform-core/plugins/governance-projection.ts` and `src/features/platform-core/actions/registry.ts` — lifecycle/uninstall projection and dashboard bundle seam. [VERIFIED: codebase grep]
- `src/lib/dal/classroom.ts` and `src/db/schema.ts` — live classroom truth, quiz owned tables, stats seam, `classroomSession.status='live'`. [VERIFIED: codebase grep]
- `package.json`, `vitest.config.mts`, `scripts/verify-phase48-lifecycle-and-uninstall.ts`, `scripts/verify-phase70-quiz-stats.ts` — current dependency, test, and verifier baseline. [VERIFIED: codebase grep]
- `local.db` SQLite inspection — retained uninstall sample, live classroom count, absence of existing quiz owned rows. [VERIFIED: local sqlite query]
- Next.js official docs — `updateTag()` / `revalidateTag()` behavior. [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx; CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/revalidateTag.mdx]
- Drizzle ORM official docs — transactions and cascade foreign keys. [CITED: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/transactions.mdx; CITED: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/relations.mdx]
- `npm/node-semver` official README and npm registry version metadata. [CITED: https://github.com/npm/node-semver; VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md`, `.planning/research/PITFALLS.md` — milestone research context and previously identified lifecycle risks. [VERIFIED: planning docs]
- `.planning/phases/68-*/68-CONTEXT.md`, `.planning/phases/69-*/69-CONTEXT.md`, `.planning/phases/70-*/70-CONTEXT.md` — upstream locked truths this phase must preserve. [VERIFIED: planning docs]

### Tertiary (LOW confidence)
- None. [VERIFIED: research record]

## Metadata

**Confidence breakdown:**  
- Standard stack: HIGH — versions were rechecked against npm registry and aligned against repo pins. [VERIFIED: npm registry; VERIFIED: package.json]  
- Architecture: HIGH — core lifecycle, migration, governance, and classroom seams were inspected directly in the codebase. [VERIFIED: codebase grep]  
- Pitfalls: MEDIUM-HIGH — the major gaps are directly visible in code, but exact retain-recover identity handoff still needs planning resolution. [VERIFIED: codebase grep; 71-CONTEXT.md]

**Research date:** 2026-06-04 [VERIFIED: system date]  
**Valid until:** 2026-07-04 for repo-seam findings; re-check npm/doc versions before implementation if planning slips beyond 30 days. [VERIFIED: npm registry; CITED: official docs URLs]
