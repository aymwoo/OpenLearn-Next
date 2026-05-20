# Requirements: OpenLearn Next

**Defined:** 2026-05-20
**Milestone:** v2.4 Plugin Data Architecture & Default Plugins
**Core Value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## v2.4 Requirements

### Plugin Identity & Namespace

- [ ] **PLUG-01**: 平台维护者可以为每个插件登记稳定的 `pluginKey`，且该身份不依赖展示名或仅存于 `manifestJson`。
- [ ] **PLUG-02**: 平台维护者可以为每个插件登记稳定的 `dbNamespace`，并用它作为插件数据库对象统一前缀的来源。
- [ ] **PLUG-03**: 系统可以在学校范围内拒绝重复或冲突的插件身份 / namespace 安装记录。
- [ ] **PLUG-04**: 系统默认插件也通过正式的插件安装模型注册，而不是继续依赖 built-in 特例路径。

### Core Entity Extension Tables

- [ ] **EXT-01**: 插件可以通过受治理的 extension table 为 lesson 保存结构化扩展数据，而不是继续依赖零散 JSON 字段。
- [ ] **EXT-02**: 插件可以通过受治理的 extension table 为 lesson step 保存结构化扩展数据，而不是向核心表追加插件专属列。
- [ ] **EXT-03**: 插件可以通过受治理的 extension table 为 resource 保存结构化扩展数据，以承载资源处理或知识入库相关元数据。
- [ ] **EXT-04**: 插件扩展表必须强制记录学校范围、插件归属和核心实体关联，并对单插件-单实体扩展场景提供唯一性约束。

### Plugin-Owned Business Tables

- [ ] **OWN-01**: 插件可以拥有独立业务表来保存自身模板、规则、建议稿、批注或配置，而不是把所有业务数据挂在插件注册表上。
- [ ] **OWN-02**: 插件自有业务数据必须按学校范围隔离，并能追溯到具体插件安装记录。
- [ ] **OWN-03**: 插件自有业务表可以在受控外键关系下引用核心实体，但不会反向让删除插件破坏核心业务真相。

### Migration & Governance

- [ ] **GOV-01**: 平台维护者可以通过主仓库统一的 Drizzle migration 流程演进插件 schema，而不是依赖运行时动态建表或插件自带 SQL。
- [ ] **GOV-02**: 系统可以强制插件表、索引和唯一约束遵循统一的前缀 / namespace 命名规则。
- [ ] **GOV-03**: 平台维护者可以为 JSON -> 结构化插件数据迁移定义可审查的 backfill 与 cutover 流程。
- [ ] **GOV-04**: 插件启用、停用或安装流程不会在运行时执行未审查的 DDL 或任意 SQL migration。

### DAL, Auth, Cache & Audit Consistency

- [ ] **SAFE-01**: 插件数据读写继续强制通过 DAL + Server Actions，而不是开放插件直连数据库。
- [ ] **SAFE-02**: 插件数据写入在执行时同时校验插件声明权限与当前 actor 的真实能力，而不是只校验 manifest 自声明权限。
- [ ] **SAFE-03**: 插件数据读写默认带学校范围约束，防止跨学校读取或写入污染。
- [ ] **SAFE-04**: 插件数据 mutation 会同时失效插件自身 cache tag 与受影响核心实体的 cache tag。
- [ ] **SAFE-05**: 插件安装、生命周期切换和关键数据写入会进入统一审计 / governance 轨迹。

### Lifecycle & Uninstall Semantics

- [ ] **LIFE-01**: 学校操作员可以区分 install、enable、disable、suspend / kill switch 与 uninstall 五种插件生命周期语义。
- [ ] **LIFE-02**: 停用插件会停止其运行时能力，但默认保留该插件已拥有的数据。
- [ ] **LIFE-03**: 系统可以在卸载插件前执行 preflight 检查，明确该插件是否仍被核心实体、已发布内容或历史记录依赖。
- [ ] **LIFE-04**: 默认插件保持“可启用 / 停用、不可删除”的产品语义，同时仍复用正式生命周期模型。

### Default Plugin Exemplars

- [ ] **DFLT-01**: 教学步骤 built-ins 通过正式默认插件模型提供，而不是继续仅依赖硬编码 built-in 定义。
- [ ] **DFLT-02**: 课表 / 提醒助手默认插件可以通过正式的插件自有业务表保存规则、建议稿或冲突批注等数据。
- [ ] **DFLT-03**: 资源处理 / 知识入库默认插件可以通过正式的 extension 或 plugin-owned table 保存其业务所需的结构化数据。
- [ ] **DFLT-04**: 默认插件安装 / reconcile / bootstrap 过程具备幂等性，重复执行不会生成重复数据或重复附属对象。
- [ ] **DFLT-05**: 如果默认插件样板依赖 `v2.3` 的 accepted gap，则本 milestone 只补齐样板直接依赖的最小产品闭环，而不是重开整轮 `v2.3` closeout。

## Future Requirements

### Additional Plugin Samples

- **FUT-01**: 课堂侧辅助模块成为下一批默认插件样板，验证课堂运行面也能复用同一插件数据模型。
- **FUT-02**: 更多系统模块逐步迁入默认插件模型，减少 built-in hard-coded 特例。

### Governance Expansion

- **FUT-03**: 插件 ownership registry 提供更完整的对象清单、导出与报表能力。
- **FUT-04**: 更自动化的 uninstall cleanup / archive policy 覆盖所有插件家族，而不仅是 preflight 与最小策略。

## Out of Scope

| Feature | Reason |
|---------|--------|
| Runtime DDL / manifest 自带 SQL migration | 破坏主仓库 migration truth 与插件安全边界 |
| PostgreSQL schema-per-plugin 或 database-per-plugin | 当前项目明确 SQLite-first，本 milestone 不偷跑未来多数据库架构 |
| 通用 low-code entity engine / arbitrary plugin schema builder | 会把本轮从插件数据治理做成范围失控的平台项目 |
| 持续向核心表追加插件专属 nullable columns | 会污染 core schema，并让默认插件变成特权通道 |
| 把全部 `v2.3` accepted gaps 一起纳入 | 本 milestone 只补样板插件直接依赖的最小闭环，避免 scope 扩散 |
| 把课堂侧辅助模块也纳入首批 committed 样板 | 本轮先聚焦教学步骤、课表/提醒、资源处理三类，控制样板数量 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 44 | Pending |
| PLUG-02 | Phase 44 | Pending |
| PLUG-03 | Phase 44 | Pending |
| PLUG-04 | Phase 44 | Pending |
| EXT-01 | Phase 45 | Pending |
| EXT-02 | Phase 45 | Pending |
| EXT-03 | Phase 45 | Pending |
| EXT-04 | Phase 45 | Pending |
| OWN-01 | Phase 45 | Pending |
| OWN-02 | Phase 45 | Pending |
| OWN-03 | Phase 45 | Pending |
| GOV-01 | Phase 46 | Pending |
| GOV-02 | Phase 46 | Pending |
| GOV-03 | Phase 46 | Pending |
| GOV-04 | Phase 46 | Pending |
| SAFE-01 | Phase 47 | Pending |
| SAFE-02 | Phase 47 | Pending |
| SAFE-03 | Phase 47 | Pending |
| SAFE-04 | Phase 47 | Pending |
| SAFE-05 | Phase 47 | Pending |
| LIFE-01 | Phase 48 | Pending |
| LIFE-02 | Phase 48 | Pending |
| LIFE-03 | Phase 48 | Pending |
| LIFE-04 | Phase 48 | Pending |
| DFLT-01 | Phase 49 | Pending |
| DFLT-02 | Phase 49 | Pending |
| DFLT-03 | Phase 49 | Pending |
| DFLT-04 | Phase 49 | Pending |
| DFLT-05 | Phase 49 | Pending |

**Coverage:**
- v2.4 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-20*  
*Last updated: 2026-05-20 after roadmap creation for milestone v2.4*
