# Phase 44: Plugin Identity & Namespace Contract - Research

**Researched:** 2026-05-20
**Domain:** 插件稳定身份、安装真相、数据库命名空间 contract [VERIFIED: 44-CONTEXT.md]
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-44-01:** `pluginKey` 的稳定来源锁定为 `manifest.id`。注册或 reconcile 时必须把它复制进正式 SQL 列；`name` 继续只是展示名。
- **D-44-02:** built-in/default 插件与非 built-in 插件共享同一身份规则，不再维持“两套 identity source”。
- **D-44-03:** 现有任何按 `plugin.name` 或 payload `pluginName` 解析稳定插件身份的路径都视为 Phase 44 待收口债务；展示名可继续保留给 UI 和 suggestion payload，但不能再作为 canonical identity。
- **D-44-04:** 正式插件安装记录需要直接暴露 `pluginKey`，下游 DAL / registry / bootstrap / reconcile 不应再以解析 `manifestJson.id` 作为唯一真相读取方式。
- **D-44-05:** `dbNamespace` 是独立于 `pluginKey` 的正式字段。首次可以由 `pluginKey` 规范化生成，但它不是简单的“运行时临时推导值”。
- **D-44-06:** `dbNamespace` 一旦作为公开插件 contract 发布后即视为冻结；Phase 44 不提供 rename、alias 或双写兼容机制。
- **D-44-07:** Phase 44 只建立 `dbNamespace` 作为统一数据库对象前缀来源的 contract，不在本阶段展开后续 extension/plugin-owned table 的精确命名细节。
- **D-44-08:** 因为 `pluginKey` 可能包含供应商前缀、连字符或未来不适合作为 SQL 对象名前缀的形态，`dbNamespace` 不强制等于 `pluginKey`。
- **D-44-09:** 同一学校内，`pluginKey` 冲突的安装或 reconcile 结果必须硬拒绝；系统不能静默覆盖、重复安装或生成第二条等价记录。
- **D-44-10:** 同一学校内，`dbNamespace` 冲突的安装或 reconcile 结果同样必须硬拒绝；Phase 44 不做 namespace alias、自动迁移或兼容旧名。
- **D-44-11:** 冲突处理以“安装失败并返回明确原因”为主，而不是提供人工 override、强制绑定旧记录或自动兼容旧身份。
- **D-44-12:** 学校范围的唯一性 contract 在 SQL truth 与 install/reconcile 流程两侧都要成立；不能只靠 UI copy 或人工约定避免冲突。
- **D-44-13:** 默认插件必须通过统一、幂等的 install/reconcile 服务进入学校插件安装模型，而不是继续使用 built-in 特例 upsert 路径。
- **D-44-14:** 默认插件 reconcile 的触发时机固定为显式系统流程，例如建校/bootstrap、repair 或受控 seed，而不是页面首次访问时隐式写库。
- **D-44-15:** `defaultEnabled` 的语义在 Phase 44 中收敛为“正式安装后默认处于启用姿态的安装快照/策略输入”，而不再只是 `registerPluginManifest()` 中的布尔直映射。
- **D-44-16:** 默认插件仍保持“可启用 / 停用、不可删除”的产品语义，但这一语义必须建立在统一安装记录和统一 lifecycle model 之上，而不是 built-in 特例。

### the agent's Discretion
- `pluginKey`、`dbNamespace`、source type、default install source 等字段的精确列名，可由 planner 结合现有 `pluginRegistrations` 与 DTO 命名做最小正确收敛；但四类信息必须成为正式 SQL truth，而不是只留在 JSON。
- `dbNamespace` 的规范化算法可由 planner 在现有命名约束与 SQLite 对象命名习惯下收敛，例如小写 ASCII、`_`、长度限制等；但“独立字段、冻结 contract、不强制等于 pluginKey”已锁定。
- 默认插件 reconcile 服务最终落在 DAL helper、server registry service，还是 bootstrap shared helper，可由 planner 按最小改动路径决定；但不能继续分叉出 built-in only 的真相写入路径。
- built-in teaching step 相关 payload 中 `pluginName` 的保留范围可由 planner 收敛：它可继续作为展示字段存在，但不能再承担 canonical identity 角色。

### Deferred Ideas (OUT OF SCOPE)
- Phase 45 再定义 lesson / lesson step / resource extension table 与 plugin-owned business table 的精确 schema pattern。
- Phase 46 再处理 JSON -> 结构化 backfill、命名规则落地、migration governance 与 repair tooling。
- Phase 48 再处理 uninstall preflight、data retention 与 default plugin 不可删除语义的完整 lifecycle 收口。
- Phase 49 再用教学步骤 built-ins、课表/提醒助手、资源处理/知识入库样板验证默认插件模型。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | 平台维护者可以为每个插件登记稳定的 `pluginKey`，且该身份不依赖展示名或仅存于 `manifestJson`。 | 在 `pluginRegistrations` 增加正式 `pluginKey` 列，并让 DTO / DAL / bootstrap / registry 直接读取它 [VERIFIED: schema.ts][VERIFIED: plugins.ts][VERIFIED: 44-CONTEXT.md] |
| PLUG-02 | 平台维护者可以为每个插件登记稳定的 `dbNamespace`，并用它作为插件数据库对象统一前缀的来源。 | 在 `pluginRegistrations` 增加冻结的 `dbNamespace` 列，并通过单一 normalizer/installer 生成与写入 [VERIFIED: 44-CONTEXT.md][ASSUMED] |
| PLUG-03 | 系统可以在学校范围内拒绝重复或冲突的插件身份 / namespace 安装记录。 | 在 SQL 加学校范围唯一约束，并在 install/reconcile DAL 返回明确冲突错误 [CITED: https://orm.drizzle.team/docs/indexes-constraints][VERIFIED: plugins.ts][VERIFIED: 44-CONTEXT.md] |
| PLUG-04 | 系统默认插件也通过正式的插件安装模型注册，而不是继续依赖 built-in 特例路径。 | 把 `scripts/bootstrap-dev-db.ts` 的按 `name` upsert 改为调用共享 reconcile helper，同时保留记录 id 稳定性 [VERIFIED: bootstrap-dev-db.ts][VERIFIED: lesson-authoring.ts][VERIFIED: 44-CONTEXT.md] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发 [VERIFIED: AGENTS.md]
- UI 组件禁止直连数据库；本阶段所有读写都必须继续走 DAL + Server Actions [VERIFIED: AGENTS.md]
- Node.js 20.9+ 为主；不要把 DB / Auth 逻辑放到 Edge runtime [VERIFIED: AGENTS.md]
- Next.js 16 缓存必须显式处理；写入后必须更新或失效 tag [VERIFIED: AGENTS.md][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
- 所有关联外键继续保持 `onDelete: 'cascade'` [VERIFIED: AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API；Phase 44 不能借 identity contract 打开新特权通道 [VERIFIED: AGENTS.md]
- 页面实现如需调整展示，仍需遵守 Stitch 项目 `5322129002350954765` 与 `DESIGN.md` 的既有视觉语言 [VERIFIED: AGENTS.md]

## Summary

当前仓库的插件“正式身份”仍然分散在三处：SQL 里只有 `pluginRegistrations.name` 与 `manifestJson`，DTO 通过解析 `manifestJson` 反推出 `builtIn/defaultEnabled`，而 built-in dispatch 还会把 `plugin.name` 塞进 payload 里的 `pluginName` 再去解析定义 [VERIFIED: schema.ts][VERIFIED: plugins.ts][VERIFIED: resource-ai.ts][VERIFIED: registry.ts]。这说明 Phase 44 的核心不是“再多加两个字段”，而是把 `manifest.id -> pluginKey`、`dbNamespace`、来源类型、默认安装来源收口成 **SQL truth + shared reconcile path**，否则同一插件会继续在注册、bootstrap、UI、built-in dispatch 四条路径里拥有不同 canonical identity [VERIFIED: 44-CONTEXT.md][VERIFIED: bootstrap-dev-db.ts][VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx]。

本阶段的 blast radius 主要集中在 `pluginRegistrations` schema、`src/lib/dal/plugins.ts`、`scripts/bootstrap-dev-db.ts`、`src/server/plugins/registry.ts` 和 built-in lesson payload 相关链路 [VERIFIED: 44-CONTEXT.md][VERIFIED: lesson-authoring.ts]。尤其要注意：lesson payload 已经把 built-in source 持久化为 `pluginId + builtInKey + pluginName`，发布前检查直接依赖 `pluginId` 是否仍然可用；因此默认插件 reconcile 绝不能用“删旧建新”的方式替换安装记录，否则现有 lesson draft / published payload 会被误判为 built-in 插件不可用 [VERIFIED: lesson-authoring.ts][VERIFIED: bootstrap-dev-db.ts]。

**Primary recommendation:** 先做一个 DAL-owned、幂等的 `installOrReconcilePlugin()` 真相入口：它写入 `pluginKey=manifest.id`、冻结 `dbNamespace`、来源类型并执行学校范围唯一性校验；随后让手动注册、默认插件 bootstrap/repair、UI DTO 与 built-in registry 全部改走这条入口 [VERIFIED: 44-CONTEXT.md][VERIFIED: plugins.ts][VERIFIED: bootstrap-dev-db.ts][CITED: https://orm.drizzle.team/docs/indexes-constraints]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 插件稳定身份 `pluginKey` 持久化 | Database / Storage | API / Backend | `pluginKey` 必须成为 SQL 可直接读取字段，而不是展示层或 JSON 解析结果 [VERIFIED: 44-CONTEXT.md][VERIFIED: schema.ts] |
| `dbNamespace` 生成与冻结 | API / Backend | Database / Storage | 规范化算法属于服务端治理逻辑，但最终冻结值必须写入数据库作为长期 contract [VERIFIED: 44-CONTEXT.md][ASSUMED] |
| 学校范围冲突拒绝 | Database / Storage | API / Backend | SQL 唯一约束负责兜底真相，DAL 负责把冲突转成明确错误语义 [VERIFIED: 44-CONTEXT.md][CITED: https://orm.drizzle.team/docs/indexes-constraints] |
| 默认插件 install / reconcile | API / Backend | Database / Storage | bootstrap / repair 属于显式系统流程，应该复用服务端安装逻辑而不是页面或客户端触发 [VERIFIED: 44-CONTEXT.md][VERIFIED: bootstrap-dev-db.ts] |
| 插件列表与设置面展示 | API / Backend | Browser / Client | 页面只能消费 DAL/Server Action 暴露的正式字段，不能自己解析 `manifestJson.id` 当真相 [VERIFIED: AGENTS.md][VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx] |
| built-in teaching step 定义解析 | API / Backend | Browser / Client | registry dispatch 发生在服务端；`pluginName` 只能作为展示值保留，不应再承担 canonical identity [VERIFIED: registry.ts][VERIFIED: 44-CONTEXT.md] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.6` [VERIFIED: npm registry, published 2026-05-07] | Server Actions + cache invalidation | Phase 44 的 install/toggle/reconcile mutation 继续通过 Server Actions，并用 `updateTag()` 保证 read-your-own-writes [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |
| Drizzle ORM | `0.45.2` [VERIFIED: npm registry, published 2026-03-27] | SQLite schema / migration / unique constraints | 当前 schema 已全面使用 Drizzle；学校范围唯一约束应继续用 Drizzle 声明，不应手写分叉 SQL truth [VERIFIED: schema.ts][CITED: https://orm.drizzle.team/docs/indexes-constraints] |
| Zod | `4.4.3` [VERIFIED: npm registry, published 2026-05-04] | Manifest / DTO / action input validation | `PluginManifestSchema`、`PluginRegistrationDTOSchema`、Server Action 输入已在现有代码中使用 Zod，Phase 44 继续扩展同一路径即可 [VERIFIED: resource-ai.ts][VERIFIED: plugin-actions.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React | `19.2.6` [VERIFIED: npm registry, published 2026-05-06] | settings / marketplace surface 消费新字段 | 仅在展示层消费新增 DTO 字段，不参与身份真相判断 [VERIFIED: package.json][VERIFIED: settings-surface.tsx] |
| Vitest | `4.1.5` [VERIFIED: package.json] | 保护 DAL / built-in dispatch contract | 为 `plugins.ts`、`plugins.builtins.test.ts`、可能新增的 Phase 44 verifier 提供最小回归保障 [VERIFIED: package.json][VERIFIED: plugins.test.ts][VERIFIED: plugins.builtins.test.ts] |
| tsx | `4.22.1` [VERIFIED: local command] | migration / verify / bootstrap 脚本执行 | Phase 44 很可能需要一个 focused `verify:phase44` 脚本和更新后的 bootstrap 脚本 [VERIFIED: package.json][ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 正式 SQL `pluginKey` 列 [VERIFIED: 44-CONTEXT.md] | 继续解析 `manifestJson.id` [VERIFIED: plugins.ts] | 解析 JSON 会让 registry / bootstrap / UI 继续各自解释 identity，违背“SQL truth”目标 [VERIFIED: 44-CONTEXT.md] |
| 正式 SQL `dbNamespace` 列 [VERIFIED: 44-CONTEXT.md] | 每次运行时从 `pluginKey` 或 `name` 临时推导 [VERIFIED: 44-CONTEXT.md] | 运行时推导无法表达“冻结 contract”，也无法在学校范围显式拒绝 namespace 冲突 [VERIFIED: 44-CONTEXT.md] |
| 共享 install/reconcile helper [VERIFIED: 44-CONTEXT.md] | `bootstrap-dev-db.ts` 继续 built-in 特例 upsert [VERIFIED: bootstrap-dev-db.ts] | 特例路径会绕开统一身份/冲突语义，并让默认插件与普通插件继续两套治理模型 [VERIFIED: 44-CONTEXT.md] |

**Installation:**
```bash
# No new package is required for the Phase 44 baseline. [VERIFIED: package.json]
```

**Version verification:** `next@16.2.6` 发布于 2026-05-07、`react@19.2.6` 发布于 2026-05-06、`drizzle-orm@0.45.2` 发布于 2026-03-27、`zod@4.4.3` 发布于 2026-05-04 [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Admin / Bootstrap / Repair flow
        |
        v
Server Action or explicit script trigger
        |
        v
Shared install/reconcile service (DAL-owned)
  - parse manifest
  - pluginKey = manifest.id
  - derive/freeze dbNamespace
  - classify source/default policy
        |
        +--> conflict precheck (schoolId + pluginKey / dbNamespace)
        |         |
        |         +--> explicit failure reason returned to caller
        |
        v
pluginRegistrations INSERT-or-UPDATE-in-place
        |
        +--> lifecycle transition / governance audit append
        +--> updateTag(pluginRegistry, plugin(id))
        |
        v
DTO readers / settings / marketplace / built-in registry
  - read SQL identity fields directly
  - treat name/pluginName as display-only
```

该图对应当前代码的真实入口：手动注册走 `plugin-actions.ts -> plugins.ts`，默认插件 seed 走 `scripts/bootstrap-dev-db.ts`，built-in dispatch 走 `plugins.ts -> registry.ts` [VERIFIED: plugin-actions.ts][VERIFIED: plugins.ts][VERIFIED: bootstrap-dev-db.ts][VERIFIED: registry.ts]。

### Recommended Project Structure
```text
src/
├── db/schema.ts                  # 为 pluginRegistrations 增加 pluginKey/dbNamespace/source 列与学校范围唯一约束
├── lib/dal/plugins.ts            # 共享 install/reconcile truth、DTO 映射、冲突错误与 lifecycle/audit append
├── actions/plugin-actions.ts     # Server Actions 入口 + updateTag
├── lib/dto/resource-ai.ts        # PluginRegistrationDTO / manifest contract 暴露新正式字段
├── server/plugins/registry.ts    # built-in dispatch 去掉对 pluginName 的 canonical 依赖
└── components/surfaces/*.tsx     # 设置面 / marketplace 显示 SQL 正式字段而非解析 manifestJson

scripts/
├── bootstrap-dev-db.ts           # 默认插件改为 shared reconcile
└── verify-phase44-plugin-identity.ts  # focused verifier [ASSUMED]
```

### Concrete Code Anchors

| File | Current Role | Phase 44 Planner Anchor |
|------|--------------|-------------------------|
| `src/db/schema.ts` | `pluginRegistrations` 目前只有 `name`、`manifestJson`、`enabled`、`killSwitchEnabled`、`lifecycleState` [VERIFIED: schema.ts] | 这里必须新增 `pluginKey`、`dbNamespace`、来源字段和学校范围唯一约束 [VERIFIED: 44-CONTEXT.md] |
| `src/lib/dal/plugins.ts` | `registerPluginManifest()` 只写 `name + manifestJson`，`toPluginDTO()` 不暴露正式 identity 字段 [VERIFIED: plugins.ts] | 这里应该成为统一 install/reconcile seam [VERIFIED: 44-CONTEXT.md] |
| `scripts/bootstrap-dev-db.ts` | built-in/dev theme 仍按 `name` 查重并 upsert [VERIFIED: bootstrap-dev-db.ts] | 必须切到 shared reconcile helper，且优先 update-in-place 保持现有 `pluginId` [VERIFIED: lesson-authoring.ts] |
| `src/server/plugins/registry.ts` | built-in teaching definition 通过 `payload.pluginName` 查找 [VERIFIED: registry.ts] | planner 需要把 canonical lookup 改为 `pluginKey` 或 `builtInKey`，同时保留展示名输出 [VERIFIED: 44-CONTEXT.md][ASSUMED] |
| `src/lib/dal/lesson-authoring.ts` | 发布检查直接依赖持久化的 `builtInSource.pluginId` [VERIFIED: lesson-authoring.ts] | 这是“不能 delete+insert 默认插件记录”的关键风险锚点 [VERIFIED: lesson-authoring.ts] |
| `src/components/surfaces/settings-surface.tsx` / `plugin-marketplace-surface.tsx` | 当前把 `manifestJson.id` 当次级 badge 展示 [VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx] | 至少需要展示/消费新的正式 SQL 字段，满足维护者“直接看到”的 requirement [VERIFIED: ROADMAP.md] |

### Pattern 1: SQL Truth Over JSON Parsing
**What:** 正式身份与 namespace 必须写入 `pluginRegistrations` 的独立列，而不是依赖 `manifestJson.id` 或 `name` 运行时解析 [VERIFIED: 44-CONTEXT.md][VERIFIED: plugins.ts]。
**When to use:** 所有插件安装、读取、冲突判定、registry 绑定与 UI 展示场景 [VERIFIED: ROADMAP.md]。
**Example:**
```typescript
// Source: Drizzle unique constraint docs + existing schema style
export const pluginRegistrations = sqliteTable("pluginRegistration", {
  schoolId: text("schoolId").notNull(),
  pluginKey: text("pluginKey").notNull(),
  dbNamespace: text("dbNamespace").notNull(),
}, (table) => [
  uniqueIndex("pluginRegistration_school_pluginKey_unique").on(table.schoolId, table.pluginKey),
  uniqueIndex("pluginRegistration_school_dbNamespace_unique").on(table.schoolId, table.dbNamespace),
])
```

### Pattern 2: One Install/Reconcile Service, Many Callers
**What:** 手动注册、默认插件 bootstrap、repair、未来 seed 都调用同一个 install/reconcile helper [VERIFIED: 44-CONTEXT.md]。
**When to use:** 任何创建或修正 `pluginRegistrations` 的写路径 [VERIFIED: ROADMAP.md]。
**Example:**
```typescript
// Source: existing plugins.ts register path + Phase 44 contract
await installOrReconcilePlugin({
  schoolId,
  actorId,
  displayName: manifestDisplayName,
  manifestJson,
  installSource: "bootstrap",
})
```

### Pattern 3: Presentation Name Stays Presentation-Only
**What:** `name` / `pluginName` 仅保留给 UI copy、lesson preview label、template payload 展示 [VERIFIED: resource-ai.ts][VERIFIED: lesson-authoring.ts]。
**When to use:** 面向教师/维护者的文案、badge、preview label [VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx]。
**Example:**
```typescript
// Source: lesson authoring DTO shape
builtInSource: {
  pluginId,
  builtInKey,
  pluginName: displayName,
}
```

### Anti-Patterns to Avoid
- **按 `plugin.name` 做 built-in / default 插件查重：** 当前 bootstrap 正是这样做的；Phase 44 后这会制造“同名不同 key”或“改名即新插件”的脏记录 [VERIFIED: bootstrap-dev-db.ts][VERIFIED: 44-CONTEXT.md]
- **删除旧记录再重建默认插件：** 会让 lesson payload 里已保存的 `builtInSource.pluginId` 失效 [VERIFIED: lesson-authoring.ts]
- **只在 UI 层阻止冲突：** requirement 明确要求 SQL truth 与 install/reconcile 双侧都成立 [VERIFIED: 44-CONTEXT.md]
- **继续让 registry 通过 `payload.pluginName` 决定 canonical built-in definition：** 这会把展示名继续变成系统真相 [VERIFIED: registry.ts][VERIFIED: 44-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 学校范围唯一性 | 只靠 UI 提示或字符串比较 [VERIFIED: 44-CONTEXT.md] | Drizzle/SQLite 唯一约束 + DAL 冲突错误 [CITED: https://orm.drizzle.team/docs/indexes-constraints] | SQL 才能兜住并发与所有写路径 [CITED: https://orm.drizzle.team/docs/indexes-constraints] |
| 默认插件 seed | `bootstrap-dev-db.ts` 私有 upsert 逻辑 [VERIFIED: bootstrap-dev-db.ts] | shared install/reconcile helper [VERIFIED: 44-CONTEXT.md] | 否则 built-in/default 继续两套 install truth [VERIFIED: 44-CONTEXT.md] |
| identity 解析 | 到处读取 `manifestJson.id` / `plugin.name` [VERIFIED: plugins.ts][VERIFIED: settings-surface.tsx][VERIFIED: registry.ts] | DTO 直接暴露 SQL `pluginKey` / `dbNamespace` [VERIFIED: 44-CONTEXT.md] | 下游无需重复解析，也能避免 split-brain [VERIFIED: 44-CONTEXT.md] |
| mutation 后刷新 | 人工刷新页面或等待缓存自然过期 [ASSUMED] | `updateTag()` in Server Actions [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] | 插件注册/启停属于 read-your-own-writes 场景 [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |
| namespace 规则 | 在多个文件散落写正则/slugify [ASSUMED] | 一个集中 `deriveDbNamespace()` helper [ASSUMED] | 否则 migration、DAL、bootstrap 容易产生不一致值 [ASSUMED] |

**Key insight:** Phase 44 不是“built-in 改一处、UI 改一处”的小修；它必须先收口 **唯一的安装真相入口**，否则任何新增字段都只会变成第三套 identity source [VERIFIED: 44-CONTEXT.md][VERIFIED: plugins.ts][VERIFIED: bootstrap-dev-db.ts]

## Common Pitfalls

### Pitfall 1: Name/Manifest/SQL 三套身份同时存在
**What goes wrong:** `pluginRegistrations.name`、`manifestJson.id`、`payload.pluginName` 会继续分别被 bootstrap、UI、registry 当成 canonical identity [VERIFIED: bootstrap-dev-db.ts][VERIFIED: settings-surface.tsx][VERIFIED: registry.ts]。
**Why it happens:** 当前 `toPluginDTO()` 没有正式 `pluginKey/dbNamespace` 字段，系统只能继续偷看 JSON 或展示名 [VERIFIED: plugins.ts][VERIFIED: resource-ai.ts]。
**How to avoid:** 所有读取面优先消费 SQL `pluginKey/dbNamespace`，展示名只做 copy [VERIFIED: 44-CONTEXT.md]。
**Warning signs:** 新代码里还出现 `manifestJson.id` badge 充当 identity、或 `plugin.name` 被用于查重/匹配 [VERIFIED: settings-surface.tsx][VERIFIED: bootstrap-dev-db.ts]。

### Pitfall 2: 默认插件 reconcile 破坏已有 `pluginId`
**What goes wrong:** lesson draft / publish readiness 会把内置步骤误报为“插件不可用” [VERIFIED: lesson-authoring.ts]。
**Why it happens:** `builtInSource` 已持久化 `pluginId`，如果 reconcile 通过 delete+insert 生成新安装记录，旧 payload 会悬空 [VERIFIED: lesson-authoring.ts]。
**How to avoid:** 对同 school + same `pluginKey` 的默认插件执行 update-in-place；只有首次缺失才 insert [VERIFIED: 44-CONTEXT.md][ASSUMED]。
**Warning signs:** plan 中出现“重建 built-in 插件记录”“清空后重新 seed”之类步骤 [VERIFIED: lesson-authoring.ts][ASSUMED]。

### Pitfall 3: 冲突只在 DAL 里判，不在 SQL 里兜底
**What goes wrong:** 并发安装或未来额外写路径仍可能写入重复 `pluginKey` / `dbNamespace` [VERIFIED: 44-CONTEXT.md]。
**Why it happens:** 只做应用层 `findFirst()` 检查无法替代数据库唯一性 [CITED: https://orm.drizzle.team/docs/indexes-constraints]。
**How to avoid:** DAL 预检查 + SQL 唯一约束双保险 [VERIFIED: 44-CONTEXT.md][CITED: https://orm.drizzle.team/docs/indexes-constraints]。
**Warning signs:** schema migration 没有新增唯一约束，或测试只断言错误文案不检查数据库行为 [VERIFIED: schema.ts][VERIFIED: plugins.test.ts]。

### Pitfall 4: built-in registry 继续靠 `pluginName` 做查找
**What goes wrong:** 插件显示名改动会改变 template/suggestion 解析结果 [VERIFIED: registry.ts]。
**Why it happens:** `resolveBuiltInTeachingStep()` 当前只读 `payload.pluginName` [VERIFIED: registry.ts]。
**How to avoid:** 让 registry 通过 `pluginKey` 或 `builtInKey` 查 built-in definition，再把 `pluginName` 留在返回 payload 中用于展示 [VERIFIED: 44-CONTEXT.md][ASSUMED]。
**Warning signs:** planner 没安排 registry 调整，只改了 schema 与 bootstrap [VERIFIED: registry.ts]。

### Pitfall 5: 新字段写入了，但 UI 仍看不到
**What goes wrong:** requirement 1 要求维护者“直接看到”正式字段，但 settings/marketplace 继续显示 `manifestJson.id` badge [VERIFIED: ROADMAP.md][VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx]。
**Why it happens:** 当前 surfaces 只消费旧 DTO [VERIFIED: resource-ai.ts][VERIFIED: settings-surface.tsx]。
**How to avoid:** 在 DTO 中暴露新字段，并让至少一个维护面显示 `pluginKey`、`dbNamespace` 与来源类型 [VERIFIED: ROADMAP.md][VERIFIED: 44-CONTEXT.md]。
**Warning signs:** plan 没有任何 surface / DTO 任务，却宣称 requirement 1 完成 [VERIFIED: ROADMAP.md]。

## Code Examples

Verified patterns from official sources:

### SQLite unique constraints in Drizzle
```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { int, text, unique, sqliteTable } from "drizzle-orm/sqlite-core";

export const composite = sqliteTable("composite_example", {
  id: int("id"),
  name: text("name"),
}, (t) => [
  unique().on(t.id, t.name),
  unique("custom_name").on(t.id, t.name),
]);
```

### `updateTag()` for read-your-own-writes in Server Actions
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/updateTag
"use server";

import { updateTag } from "next/cache";

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: { title: formData.get("title"), content: formData.get("content") },
  });

  updateTag("posts");
  updateTag(`post-${post.id}`);
}
```

### Existing built-in availability coupling that planner must preserve
```typescript
// Source: VERIFIED codebase - src/lib/dal/lesson-authoring.ts
const builtInSource = parsedStep.payload.builtInSource;

if (!pluginAvailability.get(builtInSource.pluginId)) {
  blockingIssues.push(buildIssue({
    code: "BUILT_IN_PLUGIN_UNAVAILABLE",
    pluginId: builtInSource.pluginId,
    builtInKey: builtInSource.builtInKey,
    pluginName: builtInSource.pluginName,
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `name` + `manifestJson.id` + `payload.pluginName` 共同承担 identity [VERIFIED: plugins.ts][VERIFIED: registry.ts][VERIFIED: bootstrap-dev-db.ts] | `pluginKey` / `dbNamespace` 成为正式 SQL truth [VERIFIED: 44-CONTEXT.md] | Phase 44 planning target [VERIFIED: ROADMAP.md] | planner 必须把 schema、DAL、bootstrap、registry 作为同一 contract wave，而不是分开做 [VERIFIED: 44-CONTEXT.md] |
| 默认插件走 built-in 特例 upsert [VERIFIED: bootstrap-dev-db.ts] | 默认插件走统一 install/reconcile [VERIFIED: 44-CONTEXT.md] | Phase 44 planning target [VERIFIED: ROADMAP.md] | bootstrap / repair / seed 都能复用同一 lifecycle model [VERIFIED: 44-CONTEXT.md] |
| UI 展示 `manifestJson.id` 作为次级元数据 [VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx] | UI 直接展示 SQL `pluginKey` / `dbNamespace` / source type [VERIFIED: ROADMAP.md][VERIFIED: 44-CONTEXT.md] | Phase 44 planning target [VERIFIED: ROADMAP.md] | 维护者无需再靠 JSON 解释真相 [VERIFIED: ROADMAP.md] |

**Deprecated/outdated:**
- `scripts/bootstrap-dev-db.ts` 里按 `pluginRegistrations.name` 查重并 upsert built-in/default 插件 [VERIFIED: bootstrap-dev-db.ts]
- `src/server/plugins/registry.ts` 里通过 `payload.pluginName` 解析 built-in teaching step definition [VERIFIED: registry.ts]
- `PluginRegistrationDTO` 不暴露 `pluginKey` / `dbNamespace` / source 字段 [VERIFIED: resource-ai.ts]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dbNamespace` 规范化算法应集中在一个 helper 中，而不是散落在 migration / DAL / bootstrap 多处 [ASSUMED] | Don't Hand-Roll / Architecture Patterns | 若错误，计划仍能执行，但实现容易出现 namespace 值不一致 |
| A2 | 来源字段可能需要拆成 `sourceType` 与 `installSource` 两类信息，精确列名可由 planner 收敛 [ASSUMED] | User Constraints / Concrete Code Anchors | 若过度设计，Phase 44 会 scope creep；若设计不足，后续 default plugin provenance 不清晰 |
| A3 | 新增 focused verifier 最好采用 `scripts/verify-phase44-plugin-identity.ts` 这类独立脚本 [ASSUMED] | Recommended Project Structure / Environment Availability | 若错误，仅影响验证组织方式，不影响核心 contract |
| A4 | built-in registry 的 canonical lookup 更适合改成 `builtInKey` 或 `pluginKey`，而不是继续使用 `pluginName` [ASSUMED] | Common Pitfalls / Open Questions | 若选错 key，可能增加 built-in refactor 范围或造成后续 exemplar phase 二次返工 |

## Open Questions (RESOLVED)

1. **已有 `pluginRegistrations` 行的 Phase 44 migration 是一次性 backfill，还是允许首次 bootstrap/reconcile 补写？**
   - Resolution: **一次性 migration/backfill。** Phase 44 必须通过仓库既有 migration-first 路径把旧行升级到完整 contract，不允许页面访问、首次 bootstrap 或首次 reconcile 遇到半升级记录后再偷偷补写 [VERIFIED: 44-CONTEXT.md][VERIFIED: package.json]
   - Why resolved: 项目约束明确要求 development bootstrap 走 migration-first，且 `db:migrate` 已是标准入口；如果把 backfill 留给运行时 helper，会重新引入“显式系统流程之外写库”的歧义 [VERIFIED: AGENTS.md][VERIFIED: package.json]
   - Planning implication: Phase 44 计划应把 backfill 放进 migration/apply 流程，并用 `pnpm db:migrate` + SQLite `PRAGMA` 校验数据库真相，而不是把 `drizzle-kit push` 作为默认路径 [VERIFIED: package.json]

2. **built-in definition 的 canonical lookup 最小改动应该选 `pluginKey` 还是 `builtInKey`？**
   - Resolution: **`pluginKey` 作为 canonical install identity，`builtInKey` 作为 built-in payload/definition 的辅助定位键。** registry 不再通过 `pluginName` 查 definition；优先按 `pluginKey` 对齐正式安装真相，必要时允许 `builtInKey` 作为兼容辅助，但不能反向成为学校安装身份 [VERIFIED: registry.ts][VERIFIED: lesson-authoring.ts][VERIFIED: 44-CONTEXT.md]
   - Why resolved: Phase 44 的核心是把 `manifest.id -> pluginKey` 提升为统一 SQL truth；同时现有 lesson payload 已持久化 `builtInKey`，所以最小 blast radius 方案是“install identity 看 `pluginKey`，definition payload 仍保留 `builtInKey`” [VERIFIED: lesson-authoring.ts][VERIFIED: 44-CONTEXT.md]
   - Planning implication: built-in registry / DAL payload 注入任务必须显式写明 `pluginKey` canonical lookup，并保留 `builtInKey` 作为 helper，而不是二选一悬而未决 [VERIFIED: registry.ts]

3. **维护者“直接看到”正式字段的最小 UI 面是哪一个？**
   - Resolution: **至少完整落在 settings labs；marketplace 同步补最少 metadata。** settings labs 负责完整展示 `pluginKey`、`dbNamespace`、`sourceType`、`installSource`，marketplace 保留原有 built-in 产品语义，只补 `pluginKey + dbNamespace + sourceType` 这类最小正式元数据 [VERIFIED: settings-surface.tsx][VERIFIED: plugin-marketplace-surface.tsx][VERIFIED: ROADMAP.md]
   - Why resolved: 这满足“平台维护者直接看到正式字段”的 requirement，又不会把 Phase 44 scope 扩散成整轮 UI 重写；并且符合项目既有 surface pattern 与 milestone 的最小闭环原则 [VERIFIED: ROADMAP.md][VERIFIED: 44-CONTEXT.md]
   - Planning implication: UI 计划需要同时覆盖 settings labs 与 marketplace，但必须明确保持现有视觉系统，仅替换 metadata 来源为正式 DTO 字段 [VERIFIED: DESIGN.md][VERIFIED: settings-surface.tsx]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next/Drizzle scripts, verifier, bootstrap | ✓ [VERIFIED: local command] | `v24.1.0` [VERIFIED: local command] | — |
| npm | registry checks / package scripts | ✓ [VERIFIED: local command] | `11.6.2` [VERIFIED: local command] | — |
| pnpm | repo bootstrap command `pnpm db:bootstrap:dev` | ✓ [VERIFIED: local command] | `10.33.0` [VERIFIED: local command] | `npm run <script>` for most scripts [ASSUMED] |
| tsx | migration/bootstrap/verify scripts | ✓ [VERIFIED: local command] | `4.22.1` [VERIFIED: local command] | `node --import tsx` where script entries already use it [VERIFIED: package.json] |

**Missing dependencies with no fallback:**
- None identified for planning-time research [VERIFIED: local command]

**Missing dependencies with fallback:**
- None identified for planning-time research [VERIFIED: local command]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes [VERIFIED: plugin-actions.ts] | 管理与变更入口先 `requireCurrentActorId()`，再进 DAL teacher scope 校验 [VERIFIED: plugin-actions.ts][VERIFIED: plugins.ts] |
| V3 Session Management | no [VERIFIED: phase scope] | 本阶段不新增 session 语义；沿用现有 Auth.js / current user session [VERIFIED: AGENTS.md][VERIFIED: plugin-actions.ts] |
| V4 Access Control | yes [VERIFIED: plugins.ts] | 学校范围校验、teacher manager scope、学校范围唯一约束 [VERIFIED: plugins.ts][VERIFIED: 44-CONTEXT.md][CITED: https://orm.drizzle.team/docs/indexes-constraints] |
| V5 Input Validation | yes [VERIFIED: resource-ai.ts][VERIFIED: plugin-actions.ts] | Zod `PluginManifestSchema`、`PluginRegistrationDTOSchema`、Server Action input schemas [VERIFIED: resource-ai.ts][VERIFIED: plugin-actions.ts] |
| V6 Cryptography | no [VERIFIED: phase scope] | 本阶段不新增加密逻辑 [VERIFIED: REQUIREMENTS.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 同校重复 `pluginKey` / `dbNamespace` 写入 | Tampering | DAL 冲突预检查 + SQL 学校范围唯一约束 [VERIFIED: 44-CONTEXT.md][CITED: https://orm.drizzle.team/docs/indexes-constraints] |
| 用展示名伪装成系统 built-in | Spoofing | `pluginKey = manifest.id` 入 SQL；registry 不再以 `pluginName` 作为 canonical lookup [VERIFIED: 44-CONTEXT.md][VERIFIED: registry.ts][ASSUMED] |
| 跨学校修改插件安装记录 | Elevation of Privilege | `assertTeacherManagerScope()` + `schoolId` 条件更新/删除 [VERIFIED: plugins.ts] |
| 默认插件 seed 绕过统一治理 | Repudiation / Tampering | bootstrap 改走 shared reconcile，并继续写 lifecycle / audit 轨迹 [VERIFIED: bootstrap-dev-db.ts][VERIFIED: plugins.ts][VERIFIED: 44-CONTEXT.md] |
| 写入后 UI 继续读到旧插件 DTO | Integrity | Server Action mutation 后 `updateTag(cacheTags.pluginRegistry)` 与 `updateTag(cacheTags.plugin(id))` [VERIFIED: plugin-actions.ts][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |

## Sources

### Primary (HIGH confidence)
- `44-CONTEXT.md` - 本阶段锁定 contract、边界与 canonical refs [VERIFIED: codebase read]
- `.planning/ROADMAP.md` - Phase 44 goal、requirements、success criteria [VERIFIED: codebase read]
- `.planning/REQUIREMENTS.md` - `PLUG-01` ~ `PLUG-04` 正式 requirement truth [VERIFIED: codebase read]
- `AGENTS.md` - 项目级约束：Next.js 16 / DAL-only / SQLite-first / plugin security [VERIFIED: codebase read]
- `src/db/schema.ts` - `pluginRegistrations` 当前 schema 现状 [VERIFIED: codebase read]
- `src/lib/dal/plugins.ts` - 当前 register/list/get/delete/hook 真相路径 [VERIFIED: codebase read]
- `src/actions/plugin-actions.ts` - Server Action + `updateTag()` 调用点 [VERIFIED: codebase read]
- `src/lib/dto/resource-ai.ts` - manifest / DTO / built-in definition shape [VERIFIED: codebase read]
- `src/lib/dto/lesson-authoring.ts` and `src/lib/dal/lesson-authoring.ts` - `builtInSource` 持久化与发布检查耦合 [VERIFIED: codebase read]
- `scripts/bootstrap-dev-db.ts` - 默认插件现有 built-in 特例 upsert [VERIFIED: codebase read]
- `src/server/plugins/registry.ts` - `payload.pluginName` canonical lookup 现状 [VERIFIED: codebase read]
- `https://orm.drizzle.team/docs/indexes-constraints` - SQLite unique constraints / indexes [CITED: https://orm.drizzle.team/docs/indexes-constraints]
- `https://nextjs.org/docs/app/api-reference/functions/updateTag` - `updateTag()` Server Action 适用范围与 read-your-own-writes [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
- `https://nextjs.org/docs/app/getting-started/caching` - Next.js 16 cache components / Suspense / caching posture [CITED: https://nextjs.org/docs/app/getting-started/caching]
- npm registry checks on 2026-05-20 - `next@16.2.6`, `react@19.2.6`, `drizzle-orm@0.45.2`, `zod@4.4.3` [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- None needed; primary sources already cover core claims [VERIFIED: research session]

### Tertiary (LOW confidence)
- None; all low-confidence recommendations are listed in Assumptions Log instead [VERIFIED: research session]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 版本来自 npm registry，能力来自官方 docs 与当前代码 [VERIFIED: npm registry][CITED: Next/Drizzle docs]
- Architecture: HIGH - 主要结论来自 Phase 44 context + 当前 code path 直接阅读 [VERIFIED: 44-CONTEXT.md][VERIFIED: plugins.ts][VERIFIED: bootstrap-dev-db.ts][VERIFIED: registry.ts]
- Pitfalls: HIGH - 风险点均能在现有代码找到直接耦合证据，少数“如何最小改”细节保留为 assumptions [VERIFIED: lesson-authoring.ts][VERIFIED: registry.ts][ASSUMED]

**Research date:** 2026-05-20
**Valid until:** 2026-06-19
