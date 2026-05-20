# Technology Stack — v2.4 Plugin Data Architecture & Default Plugins

**Project:** OpenLearn Next  
**Researched:** 2026-05-20  
**Scope:** 只覆盖本 milestone 新增的插件数据架构、命名治理与默认插件基线；不重开 PostgreSQL cutover，不引入动态建表引擎，不扩成第三方插件 runtime 平台。

## Existing Baseline We Must Keep

以下不是本 milestone 要替换的东西，而是必须复用的既有基础：

- **Framework/runtime**：Next.js 16 App Router + React 19.2 + Node runtime posture 已成立。
- **Data truth**：Drizzle ORM + SQLite-first + DAL / Server Actions 边界仍是唯一主线。
- **Plugin baseline**：当前已有 `pluginRegistration`、lifecycle/governance audit、受控 hook/action、built-in teaching step、marketplace surface。
- **Security posture**：插件不能直接访问 DB，不能自带任意代码执行或 SQL migration。

**结论：** v2.4 不需要重选数据库或 ORM；只需要在现有 Drizzle + SQLite + DAL 体系上补齐插件数据层。

## Recommended Stack Additions / Changes

### Core Additions

| Addition | Purpose | Why v2.4 needs it | Confidence |
|----------|---------|-------------------|------------|
| Explicit plugin identity columns on `pluginRegistration` | Stabilize plugin identity in SQL | `pluginKey` / `dbNamespace` / source type 不能继续只埋在 `manifestJson` | HIGH |
| Plugin naming helpers | Enforce unified DB object prefix | 所有插件表、索引、约束都需要稳定前缀，避免 SQLite 全局名字空间冲突 | HIGH |
| Extension table pattern | Extend core entities safely | 让插件给 lesson/resource/step 增加结构化数据，而不是污染 core table 或继续塞 JSON | HIGH |
| Plugin-owned table pattern | Support independent plugin business data | 让插件承载自己的业务对象，而不是所有东西都挤进 plugin registry 或 payload blob | HIGH |
| Plugin data DAL modules | Keep DB access inside DAL boundary | 插件拥有表后，仍必须走 typed DAL / Server Actions，而不是出现通用 SQL gateway | HIGH |
| Migration governance rules | Keep schema evolution centralized | 插件表也必须进主仓库 migration，不允许 runtime DDL 或 manifest 自带 SQL | HIGH |

### Recommended `pluginRegistration` additions

| Column | Purpose | Notes |
|--------|---------|-------|
| `pluginKey` | Stable plugin definition key | 不随展示名变化，建议来自 manifest id 的稳定值 |
| `dbNamespace` | Stable DB prefix namespace | 仅允许小写 ASCII / `_`，发布后不可随意改名 |
| `sourceType` | Distinguish `system_default` vs `school_installed` | 默认插件和后续学校安装插件共用同一模型 |
| `installedVersion` | Track installed plugin version | 供 migration / bootstrap / uninstall preflight 使用 |
| `defaultEnabled` | Snapshot installation default | 不再只从 manifest parse |
| `nonDeletable` | Lifecycle governance field | 默认插件通常为 true |

### Recommended uniqueness

- `unique(schoolId, pluginKey)`
- Prefer `unique(schoolId, dbNamespace)`

## Canonical Data Modeling Patterns

### 1. Extension table

用于插件给核心实体补结构化字段，而不是改 core table：

- `plg_<dbNamespace>_lesson_step_ext`
- `plg_<dbNamespace>_resource_ext`
- `plg_<dbNamespace>_course_ext`

建议字段：

- `id`
- `schoolId`
- `pluginRegistrationId`
- core entity foreign key
- plugin-owned typed fields
- `createdAt` / `updatedAt`

### 2. Plugin-owned business table

用于插件自己的业务实体，而不是核心实体附属字段：

- `plg_<dbNamespace>_template`
- `plg_<dbNamespace>_proposal`
- `plg_<dbNamespace>_rule`
- `plg_<dbNamespace>_annotation`

建议字段：

- `id`
- `schoolId`
- `pluginRegistrationId`
- business foreign keys where needed
- typed business columns
- `createdAt` / `updatedAt`

## Naming Governance

建议统一：

- Table: `plg_<dbNamespace>_<entity>`
- Index: `plg_<dbNamespace>_<entity>_<purpose>_idx`
- Unique index: `plg_<dbNamespace>_<entity>_<purpose>_uq`

`dbNamespace` 规则：

- 小写 ASCII
- 只允许 `[a-z0-9_]+`
- 作为稳定公共 contract，不随展示名变动

## Migration Governance

- 所有插件表迁移都进入主仓库 `drizzle/`
- 继续由 Drizzle migration/journal 作为唯一 schema truth
- 插件 enable/disable/install 不能触发 DDL
- manifest 不能自带可执行 SQL migration
- SQLite 复杂变更默认按“新表 + copy + rename”安全路径处理

## DAL / Cache / Lifecycle Guidance

- UI 仍然不能直连插件表
- 插件业务数据读写应进入 `src/lib/dal/plugin-data/*`
- 写 extension table 时，既要失效 plugin data tag，也要失效被扩展 core entity tag
- `disable` / `kill switch` 默认停执行、不删数据
- `uninstall` 只删除安装与附属数据，不 drop 物理表

## What NOT To Add

| Do Not Add | Why |
|-----------|-----|
| PostgreSQL schema-per-plugin | 项目明确 SQLite-first，本 milestone 不偷跑未来 PG 架构 |
| Runtime DDL / manifest-driven table creation | 破坏安全边界和主仓库 migration 治理 |
| Generic EAV or mega JSON extension table | 会让结构化数据再次退化成不可治理 blob |
| Plugin direct DB access | 与 DAL-only discipline 冲突 |
| School-per-table / installation-per-table dynamic schema | 会让 SQLite 单体 schema 和运维复杂度失控 |

## Risks

1. `dbNamespace` 一旦发布后很难改名，必须视为稳定 contract。  
2. 当前 `pluginRegistration` 身份信息不足，不先显式化就无法做好前缀治理与 migration ownership。  
3. SQLite 复杂 schema 变更能力有限，extension/plugin-owned pattern 需要一开始就尽量设计稳定。  
4. 如果继续把关键字段塞进 JSON，后面几乎一定要回头补结构化表，代价更高。  

## Sources

- `.planning/PROJECT.md` — milestone context and constraints. Confidence: HIGH.
- `src/db/schema.ts` — existing plugin/theme/core table posture. Confidence: HIGH.
- `src/lib/dal/plugins.ts` — plugin lifecycle/governance baseline. Confidence: HIGH.
- `src/lib/dto/resource-ai.ts` — plugin manifest / built-in definitions / theme layout schemas. Confidence: HIGH.
