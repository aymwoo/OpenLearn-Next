# Feature Landscape — v2.4 Plugin Data Architecture & Default Plugins

**Milestone:** v2.4 Plugin Data Architecture & Default Plugins  
**Domain:** Brownfield education product plugin data model  
**Researched:** 2026-05-20  
**Confidence:** HIGH

## Scope Framing

这个 milestone 不应被定义成“做更多插件”，而应被定义成：**让插件第一次成为可安全拥有结构化数据的正式系统边界，并让默认插件先走通这套模型。**

它必须尊重三件事：

1. **durable truth 仍在 SQLite + DAL + canonical write path**，插件拥有表不等于插件绕过主系统。  
2. **默认插件不能继续走 built-in 特例**，而应成为正式插件数据模型的第一批使用者。  
3. **灵活扩展不等于动态建表平台**，本 milestone 要的是 repo-governed schema，不是 runtime DDL。  

## Feature Categories

建议把 v2.4 feature scope 组织成 7 组，后续可直接映射 requirement：

| Category | Why it belongs in v2.4 | Requirement question |
|---------|-------------------------|----------------------|
| Plugin identity & installation | 插件要拥有数据，必须先有稳定身份、namespace 与 school-scoped installation | 系统如何稳定识别“这是哪个插件、属于哪个学校、拥有哪些数据对象”？ |
| Core entity extension | 插件需要安全扩展 lesson/resource/step 等核心实体 | 哪些扩展必须结构化落表，而不是继续塞 JSON？ |
| Plugin-owned business data | 插件需要独立业务对象，不能都挂在核心实体上 | 哪些场景应使用 plugin-owned table？ |
| Namespace & migration governance | 插件表一多，命名与迁移马上会失控 | 如何强制前缀、避免冲突、保持 migration centralization？ |
| Lifecycle semantics | 安装/启用/停用/挂起/卸载语义会直接影响插件数据安全 | 停用是否删数据？默认插件能不能删？ |
| Default plugin exemplars | 需要用系统默认插件证明模型不是理论架构 | 哪 2-3 类默认插件足以验证 extension 与 plugin-owned 两种模式？ |
| DAL/auth/cache/audit consistency | 插件拥有表后，现有 DAL/cache/authz discipline 不能破 | 插件数据如何继续受统一的权限、缓存与审计治理？ |

## Table Stakes

### 1. Plugin identity & installation

- 插件稳定身份必须显式化：`pluginKey`、`dbNamespace`、source type、installed version。  
- 安装单元必须是 school-scoped。  
- 默认插件必须也走同一 installation model。  

### 2. Core entity extension

- 插件可通过 extension table 扩展 lesson / lessonStep / resource / course 等核心实体。  
- 核心表扩展应有强唯一性、school scope 和 cascade 约束。  
- 不允许持续向 core tables 追加插件专属 nullable columns。  

### 3. Plugin-owned business data

- 插件可以拥有自己的独立业务实体。  
- 这些实体仍然必须：school-scoped、typed、DAL-only、migration-governed。  
- 适合场景包括：模板、规则、建议稿、批注、插件配置。  

### 4. Namespace & migration governance

- 所有插件数据库对象都必须遵循统一前缀规范。  
- 命名治理必须覆盖 table、index、unique constraint。  
- 所有插件 schema 变更都进入主仓库 migration。  

### 5. Lifecycle semantics

- `install`、`enable`、`disable`、`suspend/kill switch`、`uninstall` 必须是不同语义。  
- `disable` 默认停功能但保留数据。  
- built-in/default plugins 保持“可停用、不可删除”的产品语义。  

### 6. Default plugin exemplars

- 至少挑 2-3 个默认插件样板。  
- 样板必须覆盖：
  - 一个 extension-table plugin
  - 一个 plugin-owned-table plugin
  - 一个 built-in/default plugin bootstrap path

### 7. DAL/auth/cache/audit consistency

- 插件数据仍必须走 DAL + Server Actions。  
- 插件写入必须继续受 school scope、actor capability、cache tag、audit trail 约束。  
- 插件数据不是“新数据库特权通道”。  

## Useful Differentiators

- **默认插件先 dogfood**：系统模块自己走这套模型，比单纯画平台图更有价值。  
- **插件拥有的数据边界可审计**：能回答“这个插件拥有了哪些表、哪些扩展、哪些默认 seed 数据”。  
- **插件扩展不污染核心表**：长期对 schema 可维护性价值很高。  

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|--------------------|
| Runtime DDL / manifest 自带 SQL | 破坏安全边界与 migration truth | 由主仓库 Drizzle migration 统一管理 |
| Generic plugin EAV / mega JSON store | 看似灵活，长期不可治理 | 使用 extension table 与 plugin-owned table 两种明确模式 |
| Schema-per-plugin / database-per-plugin | 与 SQLite-first 项目现实不符 | 保持单体共享物理 schema + stable namespace |
| Core table plugin column creep | 会让默认插件变成核心特权通道 | 用旁路扩展表 |
| 插件数量导向的 milestone | 会把本轮从数据架构做成“插件市场 demo” | 先做 2-3 个高价值样板 |

## Recommended default plugin validation set

### Recommended exemplars

1. **Built-in teaching step library plugin**  
   - 证明默认教学环节不再只是硬编码常量。  
   - 适合承载模板元数据或 lesson/step 扩展。  

2. **Schedule / reminder assistant plugin**  
   - 证明插件可以拥有独立业务实体，如建议稿、提醒规则、冲突批注。  
   - 与现有 schedule assistant action 方向自然衔接。  

3. **Resource processing / enrichment plugin**  
   - 证明插件既可扩展 resource 核心实体，也可拥有附属业务数据。  
   - 只在本 milestone 范围内做最小必要闭环，不顺手重开 v2.3 async closure。  

## Requirement-Oriented Cut Lines

### Must ship in v2.4

| Requirement Area | Must-have outcome |
|------------------|-------------------|
| Identity | 插件身份、namespace、installation state 进入正式模型 |
| Schema pattern | extension table 与 plugin-owned table 有明确决策边界 |
| Governance | 插件对象命名与 migration 规则成文且落地 |
| Consistency | DAL/auth/cache/audit 对插件数据继续成立 |
| Default plugins | 至少 2-3 个样板走通正式模型 |

### Good to ship if scope allows

| Requirement Area | Nice-to-have outcome |
|------------------|----------------------|
| Ownership registry | 能列出插件拥有的表/扩展/seed artifacts |
| Uninstall preflight | 卸载前能说明保留/阻断/清理策略 |
| Better product UX | settings/marketplace 更清晰展示 built-in/default plugin lifecycle |

### Explicitly defer

| Defer | Reason |
|------|--------|
| Third-party plugin runtime governance expansion | 与本 milestone 的数据边界主问题不同 |
| PostgreSQL-first advanced schema strategy | 当前项目明确 SQLite-first |
| Generic low-code entity engine | 会严重放大 scope |
| Full marketplace / billing / distribution platform | 不是本 milestone 的成功标准 |

## MVP Recommendation

优先级建议如下：

1. 插件身份与 `dbNamespace` contract
2. extension table / plugin-owned table 决策与样板 schema
3. DAL + auth + cache + audit 对插件数据的统一约束
4. 默认插件安装/启停/bootstrap 正式化
5. 2-3 个默认插件样板落地

如果只能保住一条最小闭环，应该保：

**“默认插件不再是特例；插件可以拥有结构化数据；并且所有数据仍然受主系统治理。”**

## Sources

- `.planning/PROJECT.md` — milestone framing and constraints. Confidence: HIGH.
- `src/lib/dal/plugins.ts` — current plugin lifecycle and built-in resolution baseline. Confidence: HIGH.
- `src/server/plugins/registry.ts` — action allowlist and current built-in dispatch posture. Confidence: HIGH.
- `src/components/surfaces/plugin-marketplace-surface.tsx` — current built-in marketplace UX and lifecycle semantics. Confidence: HIGH.
