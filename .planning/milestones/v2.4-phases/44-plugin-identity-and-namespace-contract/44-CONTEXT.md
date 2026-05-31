# Phase 44: Plugin Identity & Namespace Contract - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只解决插件正式数据治理的最前置 contract：插件是谁、学校安装记录如何稳定识别它、
`dbNamespace` 如何成为长期数据库命名前缀，以及默认插件如何通过正式安装/reconcile 模型进入学校。

Phase 44 固定建立在 Phase 30 已经有基础插件 lifecycle / governance 审计链路、以及当前仓库已经有
`pluginRegistration`、manifest 注册、启停、kill switch、built-in teaching step registry 的事实上。
它的职责不是一次性把插件自有表、extension table、migration backfill、卸载清理和默认插件全量样板都做完。

Phase 44 只交付四类结果：

1. 把稳定插件身份从展示名和 `manifestJson` 提升为 SQL 中可直接读取的正式字段。
2. 把稳定 `dbNamespace` 定义成正式安装记录的一部分，并视为长期 contract，而不是临时从显示名推导。
3. 在学校范围对 `pluginKey` / `dbNamespace` 冲突做显式拒绝，阻止脏安装记录进入真相源。
4. 让默认插件通过统一的 install/reconcile 路径进入学校插件注册表，而不是继续依赖 built-in 特例 upsert。

本阶段不定义插件自有业务表长什么样，不引入 runtime DDL，不做 alias/rename migration 机制，不在页面访问时
隐式写库，也不重写整个 plugin marketplace / settings surface 的产品语义。这些分别属于后续 Phase 45-49。

</domain>

<decisions>
## Implementation Decisions

### Stable plugin identity
- **D-44-01:** `pluginKey` 的稳定来源锁定为 `manifest.id`。注册或 reconcile 时必须把它复制进正式 SQL 列；`name` 继续只是展示名。
- **D-44-02:** built-in/default 插件与非 built-in 插件共享同一身份规则，不再维持“两套 identity source”。
- **D-44-03:** 现有任何按 `plugin.name` 或 payload `pluginName` 解析稳定插件身份的路径都视为 Phase 44 待收口债务；展示名可继续保留给 UI 和 suggestion payload，但不能再作为 canonical identity。
- **D-44-04:** 正式插件安装记录需要直接暴露 `pluginKey`，下游 DAL / registry / bootstrap / reconcile 不应再以解析 `manifestJson.id` 作为唯一真相读取方式。

### Stable database namespace
- **D-44-05:** `dbNamespace` 是独立于 `pluginKey` 的正式字段。首次可以由 `pluginKey` 规范化生成，但它不是简单的“运行时临时推导值”。
- **D-44-06:** `dbNamespace` 一旦作为公开插件 contract 发布后即视为冻结；Phase 44 不提供 rename、alias 或双写兼容机制。
- **D-44-07:** Phase 44 只建立 `dbNamespace` 作为统一数据库对象前缀来源的 contract，不在本阶段展开后续 extension/plugin-owned table 的精确命名细节。
- **D-44-08:** 因为 `pluginKey` 可能包含供应商前缀、连字符或未来不适合作为 SQL 对象名前缀的形态，`dbNamespace` 不强制等于 `pluginKey`。

### School-scoped conflict posture
- **D-44-09:** 同一学校内，`pluginKey` 冲突的安装或 reconcile 结果必须硬拒绝；系统不能静默覆盖、重复安装或生成第二条等价记录。
- **D-44-10:** 同一学校内，`dbNamespace` 冲突的安装或 reconcile 结果同样必须硬拒绝；Phase 44 不做 namespace alias、自动迁移或兼容旧名。
- **D-44-11:** 冲突处理以“安装失败并返回明确原因”为主，而不是提供人工 override、强制绑定旧记录或自动兼容旧身份。
- **D-44-12:** 学校范围的唯一性 contract 在 SQL truth 与 install/reconcile 流程两侧都要成立；不能只靠 UI copy 或人工约定避免冲突。

### Default plugin install / reconcile posture
- **D-44-13:** 默认插件必须通过统一、幂等的 install/reconcile 服务进入学校插件安装模型，而不是继续使用 built-in 特例 upsert 路径。
- **D-44-14:** 默认插件 reconcile 的触发时机固定为显式系统流程，例如建校/bootstrap、repair 或受控 seed，而不是页面首次访问时隐式写库。
- **D-44-15:** `defaultEnabled` 的语义在 Phase 44 中收敛为“正式安装后默认处于启用姿态的安装快照/策略输入”，而不再只是 `registerPluginManifest()` 中的布尔直映射。
- **D-44-16:** 默认插件仍保持“可启用 / 停用、不可删除”的产品语义，但这一语义必须建立在统一安装记录和统一 lifecycle model 之上，而不是 built-in 特例。

### the agent's Discretion
- `pluginKey`、`dbNamespace`、source type、default install source 等字段的精确列名，可由 planner 结合现有 `pluginRegistrations` 与 DTO 命名做最小正确收敛；但四类信息必须成为正式 SQL truth，而不是只留在 JSON。
- `dbNamespace` 的规范化算法可由 planner 在现有命名约束与 SQLite 对象命名习惯下收敛，例如小写 ASCII、`_`、长度限制等；但“独立字段、冻结 contract、不强制等于 pluginKey”已锁定。
- 默认插件 reconcile 服务最终落在 DAL helper、server registry service，还是 bootstrap shared helper，可由 planner 按最小改动路径决定；但不能继续分叉出 built-in only 的真相写入路径。
- built-in teaching step 相关 payload 中 `pluginName` 的保留范围可由 planner 收敛：它可继续作为展示字段存在，但不能再承担 canonical identity 角色。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 44 的正式 goal、requirements、success criteria。
- `.planning/REQUIREMENTS.md` — `PLUG-01`、`PLUG-02`、`PLUG-03`、`PLUG-04` 的 requirement truth。
- `.planning/PROJECT.md` — v2.4 插件数据架构 milestone 的总边界，以及 SQLite-first、DAL + Server Actions、无 runtime DDL 的非协商约束。
- `.planning/STATE.md` — 当前 milestone / phase 状态，确认当前推进到 Phase 44。

### Locked upstream decisions
- `.planning/phases/30-capability-enforcement-and-plugin-lifecycle/30-CONTEXT.md` — 现有 plugin lifecycle、allowlist、governance posture 的上游边界。
- `.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md` — 最近 phase 的边界控制方式与“只锁本 phase 真正要拍板的 contract”写法参考。
- `.planning/phases/42-operator-visibility-and-recovery/42-CONTEXT.md` — 近期 context 的产品边界与 honest posture 参考。

### Current plugin identity / lifecycle anchors
- `src/db/schema.ts` — 当前 `pluginRegistrations` 只有 `name`、`manifestJson`、enabled、kill switch、lifecycleState；还没有 `pluginKey` / `dbNamespace` / source type 列。
- `src/lib/dal/plugins.ts` — `registerPluginManifest()`、`listPluginsForSchool()`、`deletePluginForSchool()`、`runPluginHook()` 的当前真相路径；目前身份仍主要靠 `name + manifestJson`。
- `src/actions/plugin-actions.ts` — 当前 plugin server actions 边界与 cache invalidation 样板。
- `src/lib/dto/resource-ai.ts` — `PluginManifestSchema`、`PluginRegistrationDTOSchema`、built-in teaching step definitions；当前 manifest 已有 `id`，但 registration DTO 还未显式暴露 `pluginKey` / `dbNamespace`。

### Built-in / default plugin anchors
- `scripts/bootstrap-dev-db.ts` — 当前 built-in/default plugin seed 仍按 `pluginRegistrations.name` 查重并 upsert，是 Phase 44 要收口的 built-in 特例路径。
- `src/server/plugins/registry.ts` — built-in teaching step action 分发当前仍通过 `payload.pluginName` 解析 definition，说明展示名耦合尚未解除。
- `src/components/surfaces/plugin-marketplace-surface.tsx` — 当前 marketplace 只展示 built-in，并强调“默认开启、可停用、不可删除”的产品语义；Phase 44 需要保留该语义但改正其数据来源。
- `src/components/surfaces/settings-surface.tsx` — 当前 settings labs 的 plugin 列表同样把 `manifestJson.id` 作为次级元数据展示，而不是正式 SQL identity 字段。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PluginManifestSchema` 已经有稳定 `id`，说明 canonical plugin identity 的源头其实已存在，不需要重新发明第三套 manifest key 规则。
- `pluginRegistrations`、`pluginLifecycleTransitions`、`pluginActionAudits`、`governanceAudits` 已经提供了正式安装记录和 lifecycle/audit 轨迹的基础骨架，Phase 44 应在此之上补 identity contract，而不是另建第二张注册真相表。
- `listPluginsForSchool()`、`getEnabledPluginsForAnchor()`、`setPluginEnabled()` 已经形成完整 school-scoped 插件读取与 lifecycle 操作入口，适合继续复用，只需把 identity source 从 name/manifest JSON 收口到正式字段。
- `bootstrap-dev-db.ts` 已经有内置插件 seed 列表和幂等 upsert 意图，说明默认插件 reconcile 的“输入定义”已经存在，只是当前写入路径还是 built-in 特例。

### Established Patterns
- 项目长期约束已经锁定：SQLite-first、Drizzle migration、DAL + Server Actions 为唯一读写边界；Phase 44 不应引入 runtime schema mutation 或插件自带 SQL。
- 默认插件的产品语义已经在 marketplace/settings surface 中形成共识：学校可见、默认开启、可停用、不可删除；本阶段要改的是安装真相，不是重写产品 copy。
- 近几期 phase 都要求把 durable truth 放回 SQL / DAL，而不是继续依赖 JSON 解析或展示层约定；`pluginKey` / `dbNamespace` 也必须遵守这条 discipline。

### Integration Points
- 需要为 `pluginRegistrations` 与相关 DTO 增加正式 identity / namespace 字段，并把 school-scoped uniqueness 纳入 schema 与 DAL install/reconcile 流程。
- 需要把 `registerPluginManifest()` 从“直接插入一条注册记录”升级到能识别 stable identity 的安装逻辑，至少让 planner 能明确普通注册与默认插件 reconcile 的边界。
- 需要新增或重构默认插件 reconcile helper，使 `bootstrap-dev-db.ts` 不再按 `name` upsert，而改用正式 identity / namespace contract。
- 需要逐步清除 built-in teaching step 对 `pluginName` 的身份依赖，使 registry/action dispatch 能与 Phase 44 的稳定身份一致。

</code_context>

<specifics>
## Specific Ideas

- 把 `manifest.id` 提升为 `pluginKey` 正式列，让 UI、DAL、registry、bootstrap、审计都能直接读到同一身份。
- 新增独立 `dbNamespace` 字段，并明确它是未来所有插件表/索引命名前缀的唯一来源，即使本阶段还不落具体表。
- 对默认插件新增统一 reconcile/install 入口，让建校 seed、repair、未来默认插件样板都复用同一路径。
- 保留 `plugin.name` 和 built-in payload 里的 `pluginName` 作为展示文案，但去掉它们承担稳定身份的职责。
- 冲突处理先保持简单而硬：同校内 `pluginKey` 或 `dbNamespace` 冲突即失败，不引入 override、alias 或自动迁移。

</specifics>

<deferred>
## Deferred Ideas

- Phase 45 再定义 lesson / lesson step / resource extension table 与 plugin-owned business table 的精确 schema pattern。
- Phase 46 再处理 JSON -> 结构化 backfill、命名规则落地、migration governance 与 repair tooling。
- Phase 48 再处理 uninstall preflight、data retention 与 default plugin 不可删除语义的完整 lifecycle 收口。
- Phase 49 再用教学步骤 built-ins、课表/提醒助手、资源处理/知识入库样板验证默认插件模型。

</deferred>

---

*Phase: 44-Plugin Identity & Namespace Contract*
*Context gathered: 2026-05-20*
