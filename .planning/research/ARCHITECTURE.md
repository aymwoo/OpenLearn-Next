# Architecture Patterns — v2.4 Plugin Data Architecture & Default Plugins

**Domain:** Plugin-owned data inside the existing OpenLearn Next monolith  
**Researched:** 2026-05-20  
**Confidence:** HIGH

## Recommended Architecture

结论先说：**把插件数据做成单体内受治理的扩展层，不是新的动态数据库平台。**

OpenLearn Next 当前正确姿势已经很清晰：

- Next.js monolith 继续承载 UI、Route Handlers、Server Actions
- SQLite + DAL 继续承载 durable truth
- Plugin registration/lifecycle/governance 已经建立受控入口
- Built-in/default plugin 只在产品语义上特殊，不应在数据治理上特权化

因此 v2.4 不应该做成：

`plugin manifest -> runtime create table -> plugin SQL -> UI`

而应该做成：

`UI / settings / product action -> Server Action -> plugin/core DAL -> plugin-owned or extension table -> DTO / cache invalidation / audit`

## Integration Points

### 1. Split plugin definition data from plugin business data

- **Plugin definition data**：插件是谁、稳定标识、版本、namespace、默认启用、是否内置。  
- **Plugin installation data**：某学校是否安装、是否启用、kill switch、lifecycle。  
- **Plugin business data**：插件真正拥有或扩展的结构化业务数据。  

这三层不能继续都塞在 `manifestJson` 里。

### 2. Keep `pluginRegistration` as installation/governance row

`pluginRegistration` 继续承接：

- school scope
- install / enable / disable / suspend
- governance audit join key

但它不应成为插件业务真相源。插件业务真相应进入 extension/plugin-owned tables。

### 3. Two allowed persistence patterns only

#### Extension table

用于扩展核心实体：

- `plg_<ns>_lesson_step_ext`
- `plg_<ns>_resource_ext`
- `plg_<ns>_course_ext`

#### Plugin-owned table

用于插件自己的业务实体：

- `plg_<ns>_template`
- `plg_<ns>_rule`
- `plg_<ns>_proposal`
- `plg_<ns>_annotation`

## New / Modified Parts

### New parts

1. **Plugin catalog**
   - Suggested path: `src/server/plugins/catalog.ts`
   - Holds stable code-owned plugin definitions: `pluginKey`, `dbNamespace`, source type, uninstall policy, manifest factory, data ownership metadata.

2. **Plugin data DAL modules**
   - Suggested path: `src/lib/dal/plugin-data/*`
   - Each plugin gets typed DAL instead of using a generic CRUD gateway.

3. **Plugin schema modules**
   - Suggested path: `src/db/plugins/<namespace>.ts`
   - Re-export from central schema barrel so Drizzle still sees one governed schema graph.

4. **Plugin uninstall/bootstrap orchestration**
   - Install bootstrap for default plugins
   - Preflight checks for uninstall/cleanup

### Modified parts

1. **`src/db/schema.ts` / schema organization**
   - Add explicit plugin identity columns to `pluginRegistration`
   - Prefer splitting plugin schema out of the monolithic schema file while keeping one central export

2. **`src/lib/dal/plugins.ts`**
   - Keep registration/lifecycle/governance here
   - Add reconcile/install/bootstrap/uninstall-preflight orchestration
   - Do not turn it into the DAL for all plugin business data

3. **`src/actions/plugin-actions.ts`**
   - Add install/bootstrap/reconcile/uninstall-preflight actions as needed
   - Upgrade cache invalidation to school/plugin/entity-scoped tags

4. **`src/server/plugins/registry.ts`**
   - Stop resolving built-ins by display name
   - Prefer stable `pluginKey`

## Build Order

### Phase 1 — Stable plugin identity and namespace contract

- Add `pluginKey`, `dbNamespace`, `sourceType`, version/install snapshot fields
- Backfill current built-ins
- Establish naming helper and uniqueness rules

### Phase 2 — Extension/plugin-owned schema patterns

- Land the first extension table
- Land the first plugin-owned table
- Document the cut line between the two patterns

### Phase 3 — DAL/auth/cache/audit integration

- Add plugin data DAL modules
- Define cache tag matrix
- Ensure actor capability and school scope are enforced on plugin data writes

### Phase 4 — Default plugin bootstrap and lifecycle alignment

- Reconcile built-in/default plugins into the formal installation model
- Ensure `defaultEnabled` triggers idempotent bootstrap, not just enabled=true

### Phase 5 — Default plugin exemplars

- Pick 2-3 default plugins
- Verify they use the new model rather than hard-coded special paths

## Migration Risks

1. **Current built-ins depend too much on display names**  
   `pluginName`-based resolution is fragile once plugin identity becomes stable and data-owned.

2. **Manifest snapshot vs DB governance drift**  
   If `builtIn/defaultEnabled/nonDeletable/dbNamespace` stay JSON-only, DB truth and code truth will drift.

3. **Schema file size and change blast radius**  
   `src/db/schema.ts` is already large; plugin schema work should be additive and modularized.

4. **Uninstall semantics are dangerous**  
   Wrong cascade direction could delete core truth instead of plugin-owned rows.

## Explicit Recommendation

For v2.4:

1. **Make plugin identity explicit in SQL**
2. **Allow only extension table and plugin-owned table patterns**
3. **Keep all schema changes repo-governed through Drizzle**
4. **Let default plugins be the first real adopters**
5. **Keep DAL/auth/cache/audit discipline unchanged in spirit, only extended in scope**

## Sources

- `.planning/PROJECT.md` — current milestone framing and constraints. Confidence: HIGH.
- `src/db/schema.ts` — shared SQLite schema and current plugin tables. Confidence: HIGH.
- `src/lib/dal/plugins.ts` — lifecycle/governance and built-in helper behavior. Confidence: HIGH.
- `src/actions/plugin-actions.ts` — current plugin server action boundary. Confidence: HIGH.
- `src/lib/dto/resource-ai.ts` — plugin manifest and built-in plugin contracts. Confidence: HIGH.
