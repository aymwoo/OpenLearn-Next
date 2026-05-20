# Project Research Summary

**Project:** OpenLearn Next  
**Domain:** v2.4 Plugin Data Architecture & Default Plugins  
**Milestone:** v2.4 Plugin Data Architecture & Default Plugins  
**Researched:** 2026-05-20  
**Confidence:** HIGH

## Executive Summary

v2.4 不应被定义成“增加更多插件”，而应被定义成：**在现有 Next.js 单体、SQLite durable truth、DAL / Server Actions 边界和已建立的 plugin lifecycle/governance 基线上，补齐一个可让插件安全拥有结构化数据的正式架构。**

推荐路线很明确：不引入新数据库、不做 runtime DDL、不把插件平台升级成通用低代码引擎；而是在主仓库 Drizzle migration 体系中，建立三件关键能力：

1. **插件稳定身份与 `dbNamespace` contract**  
2. **extension table + plugin-owned table 两种唯一允许的数据模式**  
3. **默认插件复用同一套数据治理模型，而不再走 built-in 特例**  

最大的风险不是“做不出插件表”，而是**边界失守**：把关键治理字段继续埋在 JSON、让插件污染核心表、缺少统一前缀、让插件绕过 DAL / authz / cache / audit，或者让默认插件继续走 hard-coded 特例。只要 requirements 从一开始把这些约束写死，v2.4 就能成为后续默认插件与学校插件扩展的稳定底座。

## Key Findings

### Recommended stack posture

- **继续使用现有栈**：Next.js 16、React 19.2、Drizzle ORM、SQLite-first、DAL / Server Actions。  
- **新增的是模式，不是平台重写**：plugin identity explicit columns、namespace helper、schema module split、plugin data DAL、migration governance。  
- **不要增加**：PostgreSQL-only plugin schema strategy、runtime DDL、manifest 自带 SQL、通用 EAV/plugin blob store。  

### Feature table stakes

- 插件稳定身份进入 SQL 模型：`pluginKey`、`dbNamespace`、source type、installed version。  
- 核心实体扩展必须通过 extension table，而不是核心表污染。  
- 插件可以拥有独立业务表，但这些表仍然是 school-scoped、DAL-only、repo-governed。  
- 所有插件数据库对象都必须遵循统一前缀 / namespace。  
- install / enable / disable / suspend / uninstall 语义必须明确分离。  
- 默认插件必须作为首批正式样板使用这套模型。  

### Architecture approach

推荐数据流为：

`UI / settings / product action -> Server Action -> plugin/core DAL -> extension/plugin-owned tables -> DTO / cache invalidation / audit`

关键结构：

1. **Plugin catalog**：代码级定义插件稳定 identity、namespace、ownership metadata  
2. **`pluginRegistration` installation row**：承接 school-scoped installation/lifecycle/governance  
3. **Plugin schema modules**：每个插件自己的 schema 模块，统一纳入主仓库 Drizzle graph  
4. **Plugin data DAL**：每个插件自己的 typed DAL，而不是 generic CRUD gateway  
5. **Default plugin bootstrap/reconcile**：让内建插件走正式安装与数据治理路径  

### Critical pitfalls

1. **使用 display name 作为稳定 identity**  
2. **只管表名前缀，不管 index/constraint naming governance**  
3. **继续把治理字段埋在 `manifestJson`**  
4. **核心表被插件 nullable columns 污染**  
5. **SQLite migration/backfill 计划不足**  
6. **插件权限只校验 manifest，不校验 actor capability**  
7. **插件数据写入不接入 cache tag / audit / DAL discipline**  
8. **默认插件仍走 hard-coded special path**  

## Implications for Roadmap

基于研究，v2.4 最合理的是一个 **6 阶段主线**，并从上一 milestone 的 Phase 43 继续编号：

### Phase 44: Plugin identity and namespace contract
- 显式化 `pluginKey` / `dbNamespace` / source type / install snapshot
- 建立 naming helper 与唯一约束

### Phase 45: Extension and plugin-owned schema patterns
- 明确 extension table 与 plugin-owned table 的 cut line
- 落第一批 schema 样板

### Phase 46: Migration governance and backfill safety
- 把 plugin schema evolution 纳入统一 migration flow
- 为 JSON -> structured migration 建立 backfill/cutover 模板

### Phase 47: DAL, authz, cache, audit integration
- 将插件数据读写纳入 typed DAL
- 收口 actor capability、school scope 与 cache invalidation

### Phase 48: Lifecycle and uninstall semantics
- install/enable/disable/suspend/uninstall 正式建模
- ownership registry + uninstall preflight

### Phase 49: Default plugin exemplars
- 2-3 个系统默认插件走正式路径
- 证明 built-in 不再是数据治理特例

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 现有 Drizzle + SQLite + DAL 基线与本 milestone 高度一致 |
| Features | HIGH | requirement categories 与用户补充目标完全对齐 |
| Architecture | HIGH | additive, low-blast-radius path is clear |
| Pitfalls | HIGH | 风险集中在 identity/governance/authz/cache/lifecycle，而不是技术选型本身 |

**Overall confidence:** HIGH

## Gaps to Address During Requirements

- 哪些默认插件进入本 milestone committed scope，哪些只保留为 future follow-up  
- 哪些 v2.3 resource-processing 入口缺口在本 milestone 中被视为“插件样板依赖”，哪些继续保持 accepted debt  
- 插件 ownership registry 做到 requirement 还是 roadmap implementation detail  

## Sources

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/PROJECT.md`
- `src/db/schema.ts`
- `src/lib/dal/plugins.ts`
- `src/server/plugins/registry.ts`

---
*Research completed: 2026-05-20*  
*Ready for requirements definition and roadmap planning: yes*
