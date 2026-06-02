# Architecture Research — OpenLearn Next v4.0

**主题：** 插件市场（Plugin Marketplace）与插件自有数据（Plugin-Owned Data）—— 声明式插件数据模型、市场化安装/升级/卸载生命周期、安装态数据治理（保留/清理/迁移），并以「考试插件」作为端到端样板。
**Researched:** 2026-06-02
**Confidence:** HIGH（结论基于对现有代码库的直接核验，而非训练数据）

## 关键判断（先于细节）

v4.0 **不是从零搭建市场，而是把已经冻结的 v2.4 脚手架收尾、泛化、并补上市场 UX + 考试持久化 + 统计读路径**。代码库核验显示：扩展表、插件自有表、完整生命周期命令处理器、迁移/清理 DAL、运行时宿主写路径、市场 surface 均已存在。真正的增量集中在三处缺口（见下文 Gap 标注）：

1. **声明式 per-plugin 结构化表** —— 当前只有通用 `plugin_owned_business_data(key + payloadJson)`，缺少「声明 → 集中编译进 Drizzle migration」的链路。
2. **市场化外部插件生命周期 UX** —— 当前 `PluginMarketplaceSurface` 只 `.filter(builtIn)` 展示内置环节，只有启停语义，无安装/升级/卸载/清理确认的市场化界面。
3. **考试插件持久化 + 统计** —— 当前 `scoreExam` 是纯函数，未落库、未接入运行时 submit 链路、无统计读路径。

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         UI / Surface 层 (RSC + Server Actions)         │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐ │
│  │ Marketplace     │  │ Lifecycle       │  │ Classroom Runtime Player │ │
│  │ Surface         │  │ Operator Surface│  │ (exam iframe runtime)    │ │
│  │ (装/升/卸/清理) │  │ (治理/恢复)     │  │                          │ │
│  └───────┬────────┘  └───────┬────────┘  └────────────┬─────────────┘ │
│          │                   │                          │              │
├──────────┴───────────────────┴──────────────────────────┴─────────────┤
│                    平台内核 (platform-core, 已存在)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Command Bus │  │ Event Ledger │  │ Action       │  │ Runtime Host│ │
│  │ + handlers  │→ │ + subscribers│  │ Registry     │  │ (guarded)   │ │
│  │ /plugins    │  │ (governance) │  │ (静态白名单) │  │             │ │
│  └──────┬──────┘  └──────────────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                                   │                 │        │
├─────────┴───────────────────────────────────┴─────────────────┴───────┤
│                       DAL 层（唯一写真相入口，已存在）                 │
│  ┌──────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ plugins.ts    │ │ plugin-data.ts   │ │ plugin-      │ │ runtime-   │ │
│  │ install/      │ │ ext + owned      │ │ migration.ts │ │ session.ts │ │
│  │ uninstall/    │ │ (scope-asserted) │ │ backfill/    │ │ save/submit│ │
│  │ lifecycle/    │ │                  │ │ verify/      │ │ (append-   │ │
│  │ killswitch    │ │                  │ │ cutover      │ │  only)     │ │
│  └──────┬───────┘ └────────┬─────────┘ └──────┬───────┘ └─────┬──────┘ │
├─────────┴──────────────────┴──────────────────┴────────────────┴───────┤
│            SQLite + Drizzle（集中式 migration，唯一 durable truth）     │
│  ┌─────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐ │
│  │ pluginRegistra- │ │ plugin_ext_lesson /   │ │ plugin_owned_*       │ │
│  │ tions + lifecyc-│ │ step / resource       │ │ (通用 KV → v4 声明式 │ │
│  │ le/hook/action  │ │ (FK cascade)          │ │ 结构表)              │ │
│  │ audit tables    │ │                       │ │ + runtime/task 提交  │ │
│  └─────────────────┘ └──────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility（拥有什么） | 现状 / Implementation |
|-----------|----------------------------|------------------------|
| Marketplace Surface | 外部插件目录的发现、安装、升级、卸载/清理确认入口 | **已存在但需扩展**：`src/components/surfaces/plugin-marketplace-surface.tsx` 当前仅展示 `builtIn` 内置环节且仅启停，无外部插件市场语义 |
| Lifecycle Operator Surface | 治理态可视化与恢复动作（confirm_cleanup 等） | **已存在**：`plugin-lifecycle-operator-surface.tsx` |
| Command Bus + plugin handlers | 接收 `plugin.install/enable/disable/reconcile/retry/suspend/resume/uninstall/kill_switch` 命令，编排事务 | **已存在**：`src/features/platform-core/commands/handlers/plugins.ts` |
| Governance projection / lifecycle-contracts | 对外生命周期态（installed/enabled/active/suspended/uninstalled）、reason code、recovery action 枚举 | **已存在**：`plugins/lifecycle-contracts.ts`（含 `cleanup_confirmation_required` / `confirm_cleanup`） |
| `plugins.ts` DAL | 安装/卸载/预检/生命周期迁移/killswitch + 清理确认 token | **已存在**：`installOrReconcilePluginWithTx` / `uninstallPluginWithTx` / `preflightUninstallPluginWithTx` / `transitionPluginLifecycleWithTx` / `buildCleanupConfirmationToken` |
| `plugin-data.ts` DAL | 核心实体扩展（lesson/step/resource ext）+ 插件自有 KV 数据的 scope-asserted 读写 | **已存在**：`upsertPluginExtension` / `getPluginExtension` / `upsertPluginOwnedBusinessData` |
| `plugin-migration.ts` DAL | JSON → schema 的 backfill / verify / cutover（DML-only，教师范围） | **已存在**：`backfillPluginJsonToSchema` / `verifyBackfillData` / `cutoverPluginJsonToSchema` |
| Runtime Host + runtime-session | 插件 iframe 运行时的 ready/save/submit 守卫式写入（append-only, isLatest） | **已存在**：`runtime-host.ts` → `saveRuntimeState` / `submitRuntimeState` → `taskSubmissions` |
| Exam 样板插件 | 声明式数据模型 + 持久化 + 课堂提交 + 统计的端到端示范 | **部分存在**：`src/plugins/exam/`（manifest + 纯函数 `scoreExam`，**无持久化、无统计**）|

## Recommended Project Structure

```
src/
├── db/
│   └── schema.ts                          # ★新增 plugin_owned_exam_question / _response 声明式结构表
├── drizzle/                               # 集中式 migration（drizzle-kit generate + migrate）
│   └── 00XX_phase4x_exam_owned_tables.sql # ★新增 migration（绝不运行时 DDL）
├── lib/
│   ├── plugins/
│   │   ├── owned-schema/                   # ★新增：声明式 owned-schema 注册 + 校验（编译期）
│   │   │   ├── registry.ts                 # 插件声明 → 已编译表的映射与校验
│   │   │   └── contracts.ts                # Zod 校验声明式 schema 形状
│   │   └── ranking/                        # 已有约定
│   └── dal/
│       ├── plugins.ts                      # 生命周期（已存在，卸载清理需覆盖 owned 表计数）
│       ├── plugin-data.ts                  # ext + owned KV（已存在）
│       ├── plugin-owned-exam.ts            # ★新增：考试 owned 表的 scope-asserted 读写 + 统计读
│       └── plugin-migration.ts             # JSON→schema 迁移（已存在）
├── features/
│   ├── platform-core/
│   │   ├── commands/handlers/plugins.ts    # 生命周期命令处理（已存在）
│   │   ├── commands/producers/plugin-governance.ts
│   │   └── plugins/lifecycle-contracts.ts  # 治理态契约（已存在）
│   └── runtime-platform/
│       ├── host-actions/runtime-host.ts    # 守卫式宿主动作（已存在）
│       └── classroom/runtime-session.ts    # save/submit append-only（已存在；exam 接入点）
├── plugins/
│   └── exam/
│       ├── manifest.json                   # 已声明 submitTarget=task-submission（已存在）
│       ├── dto/exam-schemas.ts             # Zod schema（已存在）
│       ├── dal/exam.ts                      # 纯函数评分（已存在）
│       └── persistence/                     # ★新增：把答卷写入 owned 表 + 统计聚合
└── components/surfaces/
    ├── plugin-marketplace-surface.tsx       # ★扩展：外部插件装/升/卸/清理 UX
    └── plugin-lifecycle-operator-surface.tsx
```

### Structure Rationale

- **`lib/plugins/owned-schema/`：** 声明式数据模型的核心新增点。插件「声明」结构 → 编译期校验 → 集中生成 Drizzle migration。把「声明」与「物理表」解耦，但**编译产物仍是主仓库 migration**，杜绝运行时 DDL。
- **`lib/dal/plugin-owned-exam.ts`：** owned 结构表必须经 DAL 出入，复用 `plugin-data.ts` 已有的 `assertTeacherManagerScope` / `assertPluginBelongsToSchool` 跨校边界与 manifest 权限校验模式，禁止插件直连 DB。
- **`plugins/exam/persistence/`：** 把现有纯函数评分与运行时 submit 链路缝合，作为「声明式数据 → 运行时写入 → 统计读出」的可复制样板。
- **集中式 `drizzle/`：** 所有 owned 表 DDL 只能以生成的 migration 文件存在，由 `pnpm db:migrate`（`scripts/prepare-dev-db.ts`）应用，受 `verify:phase46` 的 `sqlite-migration-proof` 守护。

## Architectural Patterns

### Pattern 1: 声明式 Owned-Schema → 集中编译为 Migration

**What:** 插件以声明（Zod 校验的 schema 描述）表达需要的结构化表；构建期把声明编译进主仓库 Drizzle schema 与生成的 migration，运行期只做 DML。
**When to use:** 插件需要结构化、可查询、可统计的自有数据（如考试题目/答卷），而通用 `key+payloadJson` 无法支撑聚合统计时。
**Trade-offs:** ✅ 类型安全、可索引、可统计、无运行时 DDL 风险；❌ 新增 owned 表需走一次 migration 发布周期，无法「插件即时自助建表」——这是安全权衡的有意取舍。

**Example:**
```typescript
// lib/plugins/owned-schema/registry.ts — 声明只产出"待编译"描述，不触碰 DB
export const examOwnedSchema = definePluginOwnedSchema({
  pluginKey: "exam-plugin",
  tables: {
    response: {
      physicalName: "plugin_owned_exam_response", // 强制 plugin_owned_ 前缀命名治理
      columns: { /* studentId, examId, payloadJson, totalScore, isLatest ... */ },
      // 编译期生成 schema.ts 片段 + migration；运行期只 INSERT/UPDATE
    },
  },
});
```

### Pattern 2: 命令总线驱动的生命周期事务（已落地）

**What:** 所有装/升/卸/启停经 Command Bus → `handlers/plugins.ts` → DAL `*WithTx` 在单事务内完成迁移 + 审计 + 生命周期跃迁。
**When to use:** 任何改变 `pluginRegistrations.lifecycleState` 的操作。
**Trade-offs:** ✅ 原子性、可审计（`pluginLifecycleTransition` / `governanceAudits`）、幂等 reconcile；❌ 调用方不能绕过命令直接改表。

**Example:**
```typescript
// 卸载必须带 cleanup 确认 token，token 由预检按各类数据计数派生
// cleanup:{pluginId}:{lessonExt}:{stepExt}:{resourceExt}:{ownedBusiness}:{total}
if (retentionMode === "cleanup" && input.confirmationToken !== preflight.cleanupConfirmationToken) {
  throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
}
```

### Pattern 3: 运行时 append-only 提交桥接（exam 复用 voting 路径）

**What:** 学生端 iframe 运行时经守卫宿主 `runtime-submit` → `submitRuntimeState` 追加 `isLatest` 状态 → 桥接到 `taskSubmissions`。考试插件 manifest 已声明 `submitTarget.targets: ["task-submission"]`。
**When to use:** 学生在课堂中产生需留痕、可重试、可统计的提交（答卷）。
**Trade-offs:** ✅ 追加式留痕、读最新、与既有课堂链路一致；❌ 统计需对 `isLatest` 做聚合读，不能就地覆盖历史。

## Data Flow

### 安装 / 升级 / 卸载治理数据流

```
[教师在 Marketplace 点击 安装/升级/卸载]
    ↓ (Server Action)
[Command Bus] → [handlers/plugins.ts] → [plugins.ts DAL *WithTx]
    ↓                                          ↓
  install/reconcile:  upsert pluginRegistrations(dbNamespace 唯一) + lifecycle transition
  upgrade:            reconcile manifest + （如需）backfill/verify/cutover JSON→owned 表
  uninstall(retain):  enabled=false, lifecycleState=disabled, uninstalledAt, retentionMode=retain
  uninstall(cleanup): 预检派生 cleanupConfirmationToken → 校验 → cascade delete pluginRegistrations
    ↓
[Event Ledger / governance subscribers] ← 审计 + 生命周期投影
```

### 数据治理：保留 / 清理 / 迁移

```
保留 (retain，默认):  软禁用，owned/ext 数据原样保留 → 重装可复用
清理 (cleanup):        FK cascade 删除 plugin_ext_* 与 plugin_owned_*（需确认 token，计数防误删）
迁移 (migrate/升级):    backfillPluginJsonToSchema → verifyBackfillData → cutoverPluginJsonToSchema
                       (DML-only，教师范围鉴权，绝不运行时 DDL)
```

### 考试插件读 / 写路径（端到端样板）

```
[学生作答 (iframe runtime)]
    ↓ runtime-submit (capability: runtime:submission:create)
[runtime-host guards] → [submitRuntimeState] → append runtime state (isLatest)
    ↓                                              ↓
[scoreExam 纯函数评分] ──★新增──→ [plugin-owned-exam DAL] → plugin_owned_exam_response
    ↓                                              ↓
[bridge → taskSubmissions]              [统计读: 聚合 isLatest 答卷 → 教师统计面板]
```

### Key Data Flows

1. **声明式表落地：** 插件声明 → 编译期校验 → 主仓库 schema + 生成 migration → `db:migrate` 应用（无运行时 DDL）。
2. **卸载安全：** 预检按 `lessonExt/stepExt/resourceExt/ownedBusiness/total` 计数派生确认 token，UI 回显数量，教师确认后才 cascade delete。

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k 用户（单校试点） | 当前 SQLite 单体足够；owned 表加 `(schoolId, pluginId, isLatest)` 复合索引即可支撑统计读 |
| 1k-100k 用户 | 统计聚合从「请求时实时聚合」转为「事件订阅增量物化」到统计快照表；考虑 libSQL/Turso 远程 SQLite |
| 100k+ 用户 | owned 数据按 schoolId 分片或迁移 Postgres；统计走独立读模型，运行时提交走队列削峰 |

### Scaling Priorities

1. **首个瓶颈：统计读** —— 大班并发提交后实时聚合 `isLatest` 会变慢；先加复合索引，再上物化快照。
2. **次个瓶颈：migration 发布节奏** —— owned 表多了后集中 migration 成为协调点；用 owned-schema registry 自动生成片段缓解，但保持单一 migration 真相源。

## Anti-Patterns

### Anti-Pattern 1: 插件运行时自助建表 / 动态 DDL

**What people do:** 让插件在安装时执行 `CREATE TABLE` 或动态 SQL 迁移以「自由」管理自有数据。
**Why it's wrong:** 违反 K-12 安全约束与集中迁移治理，无法审计、易 schema 漂移、`verify:phase46` 会拒绝。
**Do this instead:** 声明式 owned-schema → 编译进主仓库 migration（`drizzle-kit generate`），运行期仅 DML。

### Anti-Pattern 2: 用通用 `plugin_owned_business_data(KV)` 硬塞结构化统计数据

**What people do:** 把考试答卷整包塞进通用 `key + payloadJson`，再在应用层 JSON 解析做统计。
**Why it's wrong:** 无法索引/聚合，统计随数据量退化；跨答卷查询要全表扫 JSON。
**Do this instead:** 为需要统计的数据声明 per-plugin 结构表（`plugin_owned_exam_response`），保留通用 KV 仅用于非统计型零散配置。

### Anti-Pattern 3: 卸载即物理删除而不计数确认

**What people do:** 卸载直接 cascade delete，或保留模式也不区分。
**Why it's wrong:** 误删不可逆的学生答卷/教学数据。
**Do this instead:** 默认 `retain` 软禁用；`cleanup` 必须匹配按真实计数派生的 `cleanupConfirmationToken`，UI 显式回显将删除的数据量。

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| 外部插件来源（市场） | manifest（Zod 校验）→ install 命令 → registry | `sourceType` 区分 `default`(builtIn) / `external`；v4 市场 UX 需放开 `external` 展示 |
| 插件 iframe 运行时 | sandbox=iframe，bootstrap `/runtime/exam`，能力快照 session-scoped | 经 `runtime-host` 守卫，禁止直连 DB/Core API |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Marketplace Surface ↔ 生命周期 | Server Action → Command Bus | 不直接调 DAL，统一经命令以保审计与原子性 |
| 命令 handlers ↔ DAL | 直接调 `*WithTx`，共享事务 | DAL 是唯一写真相入口 |
| 插件 ↔ 自有数据 | 经 `plugin-owned-*` DAL（scope + manifest 权限断言） | 禁止插件直连 DB；命名前缀 `plugin_owned_` / `plugin_ext_` 治理 |
| 运行时提交 ↔ taskSubmissions | append-only + isLatest | exam 复用 voting 已验证的桥接路径 |

## Build Order（按依赖排序，供 roadmap 参考）

1. **声明式 owned-schema 注册 + 校验**（`lib/plugins/owned-schema/`）—— 无依赖，定义编译契约。
2. **考试 owned 结构表 + migration**（`schema.ts` + 生成 migration + `verify` 扩展）—— 依赖 1。
3. **考试持久化 DAL + 统计读**（`plugin-owned-exam.ts`、`exam/persistence/`）—— 依赖 2，复用 `plugin-data.ts` 鉴权模式。
4. **考试运行时 submit 接入**（缝合 `runtime-session` submit → 持久化）—— 依赖 3。
5. **卸载清理覆盖 owned 表计数**（扩展 `preflightUninstallPluginWithTx` token 计数纳入 exam owned 行）—— 依赖 2/3。
6. **市场化外部插件 UX**（扩展 `plugin-marketplace-surface` 放开 external + 装/升/卸/清理确认）—— 依赖 1-5 的治理语义。

## Sources

- 代码库直接核验（HIGH）：`src/lib/dal/plugins.ts`（卸载/预检/清理 token，行 973-1077、buildCleanupConfirmationToken ~399）、`src/lib/dal/plugin-data.ts`（ext+owned 读写鉴权）、`src/lib/dal/plugin-migration.ts`（backfill/verify/cutover）、`src/features/platform-core/commands/handlers/plugins.ts`、`src/features/platform-core/plugins/lifecycle-contracts.ts`。
- 运行时链路（HIGH）：`src/features/runtime-platform/host-actions/runtime-host.ts`、`src/features/runtime-platform/classroom/runtime-session.ts`（`saveRuntimeState`/`submitRuntimeState`，taskSubmissions、isLatest）。
- 样板插件（HIGH）：`src/plugins/exam/{manifest.json,dal/exam.ts,actions/exam-actions.ts,dto/exam-schemas.ts}` —— 确认仅纯函数评分、无持久化。
- 市场 surface（HIGH）：`src/components/surfaces/plugin-marketplace-surface.tsx` —— 确认当前仅 `.filter(builtIn)`、仅启停语义。
- 迁移治理（HIGH）：`drizzle.config.ts`、`scripts/prepare-dev-db.ts`、`scripts/verify-phase4{4,5,6,7}-*.ts`、`scripts/lib/sqlite-migration-proof`。
- 约束来源（HIGH）：`.planning/PROJECT.md`、`AGENTS.md`（DAL-only 写路径、无运行时 DDL、SQLite-first、cascade delete、命名前缀治理）。

---
*Architecture research for: v4.0 Plugin Marketplace & Plugin-Owned Data*
*Researched: 2026-06-02*
