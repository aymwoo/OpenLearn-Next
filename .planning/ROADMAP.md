# ROADMAP

**Current milestone:** `v2.4 Plugin Data Architecture & Default Plugins`
**Status:** 📋 Planned
**Latest archive:** `.planning/milestones/v2.3-ROADMAP.md`
**Current requirements file:** `.planning/REQUIREMENTS.md`

## Overview

`v2.4` 的目标不是“再加几个插件”，而是先把插件安全拥有结构化数据的正式边界做对：先显式化插件身份与 `dbNamespace`，再落 extension / plugin-owned 两类 schema pattern，再收口 migration governance、DAL/authz/cache/audit、一致的 lifecycle 语义，最后用 2-3 个默认插件样板证明 built-in 不再是数据治理特例。执行顺序遵循研究建议，且如果默认插件样板触达 `v2.3` accepted gap，只补最小依赖闭环，不重开整轮 `v2.3` closeout。

## Milestones

- 📋 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 planned.
- ✅ **v2.3 Async Task Platform** - Phase 39-43 archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Phase 36-38 archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Phase 33-35 archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Phase 27-32 archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Phase 21-26 archived 2026-05-15.

## Phases

- [x] **Phase 44: Plugin Identity & Namespace Contract** - 显式化插件稳定身份、数据库命名空间与默认插件正式安装入口。
- [x] **Phase 45: Extension & Plugin-Owned Schema Patterns** - 落插件扩展核心实体与插件自有业务表两类正式数据模式。
- [x] **Phase 46: Migration Governance & Backfill Safety** - 把插件 schema 演进、命名治理与 JSON→结构化迁移纳入统一迁移流程。
- [x] **Phase 47: DAL/Authz/Cache/Audit Integration** - 让插件数据继续受 DAL、权限、缓存与审计统一约束。
- [ ] **Phase 48: Lifecycle & Uninstall Semantics** - 建立 install/enable/disable/suspend/uninstall 的一致生命周期与卸载前检查。
- [ ] **Phase 49: Default Plugin Exemplars** - 用 2-3 个默认插件样板验证正式插件数据模型与最小依赖闭环。

## Phase Details

### Phase 44: Plugin Identity & Namespace Contract
**Goal**: 平台维护者和学校安装流程都能以稳定的插件身份与数据库命名空间治理插件，而默认插件不再走 built-in 特例安装路径。
**Depends on**: Phase 43
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04
**Success Criteria** (what must be TRUE):
  1. 平台维护者可以在正式插件安装记录中直接看到稳定的 `pluginKey`、`dbNamespace` 与来源类型，而不必依赖展示名或解析 `manifestJson`。
  2. 同一学校内若安装记录的 `pluginKey` 或 `dbNamespace` 重复/冲突，系统会拒绝该安装或 reconcile 结果。
  3. 系统默认插件会通过正式插件安装模型完成注册或 reconcile，而不是继续依赖单独的 built-in 特例路径。
**Plans**: 4 plans

Plans:
- [x] 44-01-PLAN.md — 固化 plugin identity / namespace SQL contract、migration 与 schema push 闸门。
- [x] 44-02-PLAN.md — 建立统一 install/reconcile DAL seam 与 school-scoped conflict 语义。
- [x] 44-03-PLAN.md — 让默认插件 bootstrap / built-in registry 改走正式身份 contract。
- [x] 44-04-PLAN.md — 暴露正式运维元数据并建立 `verify:phase44` close gate。

### Phase 45: Extension & Plugin-Owned Schema Patterns
**Goal**: 插件可以用受治理的结构化表扩展 lesson、lesson step、resource，并为自身业务对象持久化数据，而不会污染核心表或把业务真相塞回 JSON。
**Depends on**: Phase 44
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, OWN-01, OWN-02, OWN-03
**Success Criteria** (what must be TRUE):
  1. 插件可以为 lesson 保存并读取结构化扩展数据，而不需要继续把可查询字段塞进零散 JSON。
  2. 插件可以为 lesson step 与 resource 保存结构化扩展数据，且每条扩展记录都带有学校范围、插件归属、核心实体关联与单插件-单实体唯一性约束。
  3. 插件可以保存自身模板、规则、建议稿、批注或配置等独立业务数据，并按学校与安装记录隔离，同时允许受控引用核心实体而不反向破坏核心真相。
**Plans**: 1 plan

Plans:
- [x] 45-01-PLAN.md — 制定插件扩展及自有数据物理表 Drizzle 规范与 DAL/DTO 抽象设计。


### Phase 46: Migration Governance & Backfill Safety
**Goal**: 插件 schema 的命名、迁移与 JSON→结构化 backfill 都进入主仓库统一治理，而插件运行时不会执行未审查 DDL。
**Depends on**: Phase 45
**Requirements**: GOV-01, GOV-02, GOV-03, GOV-04
**Success Criteria** (what must be TRUE):
  1. 平台维护者只能通过主仓库的 Drizzle migration 流程演进插件 schema，而插件 install/enable/disable 流程不会触发运行时建表或任意 SQL migration。
  2. 新增的插件表、索引和唯一约束都会遵循统一、稳定、可审计的 namespace/prefix 命名规则。
  3. 对 JSON → 结构化插件数据迁移，维护者可以执行并审查清晰的 backfill、验证与 cutover 流程，而不会留下长期 split-brain 真相。
**Plans**: 1 plan

Plans:
- [x] 46-01-PLAN.md — 制定插件命名治理规范、运行时 DDL 预防和数据安全割接 DAL 服务层。

### Phase 47: DAL/Authz/Cache/Audit Integration
**Goal**: 插件数据在读写、授权、缓存和审计上继续服从主系统纪律，而不是形成新的数据库特权通道。
**Depends on**: Phase 46
**Requirements**: SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05
**Success Criteria** (what must be TRUE):
  1. 插件数据读写只能通过 DAL + Server Actions 完成，产品与运行时路径不会绕过这条边界直接访问插件表。
  2. 当插件声明权限、当前 actor 能力或学校范围任一不满足时，插件数据写入会被拒绝。
  3. 插件数据 mutation 会同时刷新插件自身相关缓存与受影响核心实体缓存，避免页面继续展示旧 DTO。
  4. 插件安装、生命周期切换与关键插件数据写入都会进入统一 governance/audit 轨迹。
**Plans**: 1 plan

Plans:
- [x] 47-01-PLAN.md — 制定插件数据读写双层安全鉴权、缓存级联失效以及物理事务审计日志设计。

### Phase 48: Lifecycle & Uninstall Semantics
**Goal**: 学校操作员可以安全区分插件生命周期动作，并在不误删数据或破坏核心真相的前提下停用、挂起或卸载插件。
**Depends on**: Phase 47
**Requirements**: LIFE-01, LIFE-02, LIFE-03, LIFE-04
**Success Criteria** (what must be TRUE):
  1. 学校操作员可以清楚区分 install、enable、disable、suspend/kill switch 与 uninstall 五种生命周期语义。
  2. 停用或挂起插件会停止其运行时能力，但默认保留该插件已拥有的数据与历史记录。
  3. 卸载插件前，系统会给出 preflight 结果，明确是否仍被核心实体、已发布内容或历史记录依赖。
  4. 默认插件可以沿用同一生命周期模型被启用或停用，但不能被删除。
**Plans**: TBD
**UI hint**: yes

### Phase 49: Default Plugin Exemplars
**Goal**: 默认插件通过正式插件数据模型交付真实样板，证明 built-in 系统模块也必须遵守同一治理边界，并且只补齐样板直接依赖的最小闭环。
**Depends on**: Phase 48
**Requirements**: DFLT-01, DFLT-02, DFLT-03, DFLT-04, DFLT-05
**Success Criteria** (what must be TRUE):
  1. 教学步骤 built-ins 会作为正式默认插件被安装、reconcile 与读取，而不是继续只依赖硬编码 built-in 定义。
  2. 课表 / 提醒助手默认插件可以通过正式 plugin-owned business tables 保存规则、建议稿或冲突批注，并通过正式安装/启动路径工作。
  3. 资源处理 / 知识入库默认插件可以通过 extension 或 plugin-owned table 保存结构化业务数据；若触达 `v2.3` accepted gap，只补齐该样板直接依赖的最小入口。
  4. 默认插件 bootstrap / reconcile 可重复执行且保持幂等，不会生成重复安装记录、重复 seed 数据或重复附属对象。
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 44. Plugin Identity & Namespace Contract | 4/4 | Completed | 2026-05-20 |
| 45. Extension & Plugin-Owned Schema Patterns | 1/1 | Completed | 2026-05-20 |
| 46. Migration Governance & Backfill Safety | 1/1 | Completed | 2026-05-20 |
| 47. DAL/Authz/Cache/Audit Integration | 1/1 | Completed | 2026-05-20 |
| 48. Lifecycle & Uninstall Semantics | 3/3 | Complete   | 2026-05-20 |
| 49. Default Plugin Exemplars | 0/TBD | Not started | - |

## Archived Milestones

<details>
<summary>✅ v2.3 Async Task Platform (Phases 39-43) - ARCHIVED 2026-05-20</summary>

- Archived at `.planning/milestones/v2.3-ROADMAP.md`.
- Delivered typed async task registry, unified enqueue boundary, SQLite durable task ledger, BullMQ worker posture, operator visibility/retry, and multiple real workloads.
- Closure accepted known gaps: `ATP-22` unsatisfied, `ATP-23` partial, and proof-chain gaps for Phases 39-41.

</details>

<details>
<summary>✅ v2.2 WebSocket Classroom Transport Cutover (Phases 36-38) - ARCHIVED 2026-05-18</summary>

- Archived at `.planning/milestones/v2.2-ROADMAP.md`.
- Scope remained limited to `ws + ioredis` classroom transport cutover, fallback posture, and canonical close artifacts.

</details>
