# Phase 75: 第二个 External 插件 + Marketplace 泛化验证 - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

基于 v4.0 marketplace 闭环 + v4.1 quiz 多题型基线，构建第二个非 quiz 类型的 external 插件 **homework（作业）**，把它推过 marketplace 完整生命周期（install → authoring → classroom runtime → semver upgrade → retain/cleanup uninstall → 同 pluginKey 重装恢复），在过程中发现并修复 quiz-only 隐式假设（allowlist/DTO/编译链优先），让 marketplace 从「被 quiz 验证过」升级为「多插件类型可重复使用」的通用基础设施。

**Scope anchor:** PROJECT.md v4.2 target features（MKT-EXT-03 插件样板 + 全链路验证 + 泛化修复 + close gate 扩展），Phase 编号从 75 开始。不做跨 pluginKey 数据恢复、不做商店运营层、不重做 marketplace 架构。
</domain>

<decisions>
## Implementation Decisions

### Plugin Type & Domain Model
- **D-01:** 第二个 external 插件类型选 **homework（作业）**，pluginKey = `"homework"`，走与 quiz 完全相同的受治理路径（`dataModel` 声明 → Drizzle 编译 → `dispatchPluginDataAccess` facade）。
- **D-02:** 行为模型：**布置 + 提交 + 批改**。教师创建作业 → 学生提交 → 教师打分 + 评语。
- **D-03:** 数据模型采用 **三表结构**：`plugin_owned_homework_assignments`（作业定义：标题、描述、教师ID、创建时间）、`plugin_owned_homework_submissions`（学生提交：内容、可选附件链接、提交时间、isLatest）、`plugin_owned_homework_grades`（分数、评语、批改时间、isLatest）。submissions 和 grades 均走 append-only/isLatest 写入路径。
- **D-04:** Classroom 行为：课堂内同步完成——教师在 classroom step 中布置作业，学生在课堂流程中的 homework step 提交，与 quiz 保持相同的实时同步模式。

### Generalization Strategy（泛化修复）
- **D-05:** 采用 **边建边修** 策略：先构建 homework 最小可用版本（dataModel + install），每一步遇到 quiz 假设时立即修复，修复完继续推进。以 homework 作为每个修复的验证目标。
- **D-06:** 修复范围限定为 **阻断性 + 命名性**：必须修——阻断 homework 运行的假设（allowlist 只认 quiz key、DTO 默认值假设 quiz 题型）、硬编码的 `"quiz"` 字符串引用、`plugin_owned_*` 表的通用性假设。可保留——quiz 特有的业务逻辑（5 题型枚举、答题统计算法），这些不是泛化问题。
- **D-07:** **优先审查入口**：`pluginDataAccessAllowlist` → DTO schema → `compile-plugin-data-model.ts`。这三层是 plugin 接入的第一道关卡，最可能包含 quiz 硬编码。
- **D-08:** 跨插件回归验证：在 homework 开发过程中维护一组跨插件回归用例，每次修复后同时跑 quiz + homework 的 vitest 测试。在关键里程碑节点（install 通过后、classroom runtime 通过后、upgrade 通过后）设置对照检查点，确保 quiz 回归全绿。

### Marketplace Lifecycle Verification
- **D-09:** 全链路五阶段覆盖：**install**（manifest 校验 + preflight + namespace 唯一性）→ **authoring**（教师创建作业 + 发布 lesson）→ **classroom runtime**（学生课堂提交）→ **semver upgrade**（backfill→verify→cutover，有真实 homework 数据）→ **uninstall**（retain 软禁用 + cleanup 确认 token）→ **同 pluginKey 重装恢复**。
- **D-10:** Upgrade 迁移验证对标 quiz 标准：**零丢失 + schema change**。homework upgrade 必须包含一个真实的 schema change（如新增列或表），验证 backfill→verify→cutover 三阶段在非 quiz 表结构上的迁移正确性，已有数据（assignments + submissions + grades）零丢失。
- **D-11:** Uninstall 验证对标 quiz + **重装恢复**：retain 软禁用 → cleanup 确认 token 删除数据 → 同 pluginKey 重装后数据从零开始但功能正常（可创建作业+提交），证明 uninstall 清理彻底且不影响 pluginKey 复用。
- **D-12:** 对照方式：**阶段性对照检查点**——在关键里程碑节点同时跑 quiz + homework 测试套件确保双绿，不要求每次修改都同步对照。

### Authoring & Runtime Design
- **D-13:** 教师创作界面：**复用 lesson step editor**，新增 homework 步骤类型。复用 LexoRank 排序、step type 选择器、发布流程。差异化字段：作业标题、描述（富文本）、可选附件。提交区和批改区在学生端/教师端各自渲染。
- **D-14:** 学生端交互：**文本提交 + 可选附件**。学生在播放器中看到作业描述 → 输入文本回答 → 可选上传文件/链接 → 提交。走 append-only/isLatest 写入 submissions 表。学生可多次提交（保留历史），教师看到最新版本。
- **D-15:** 教师批改界面：在 **/classroom 控制室新增「作业提交」sibling tab**，列出学生提交列表（学生名、提交时间、内容预览、当前分数/评语）。点击进入批改面板：打分 + 评语。与 v4.1「作答实时」tab 模式一致，复用 classroom 布局和访问控制。
- **D-16:** 批改流程：**自动评分 + 人工评语**。系统根据提交内容给出基础分（可基于字数/完整性），教师可覆盖分数并添加文字评语。grades 表走 append-only/isLatest。

### Cross-Phase Discipline
- **D-17:** 继续继承 D-72.1-16（conclusion never leads evidence）：Phase 75 的产出顺序固定为先实现、再验证、最后总结。任何让结论先于证据的捷径都视为 forbidden shortcut。
- **D-18:** v4.1 `verify:phase` 组合 alias（`pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate`）在 Phase 75 开发期间保持不变，Phase 76 close gate 阶段再扩展。

### Claude's Discretion
- homework 插件的 `dataModel.ts` 具体字段设计（列名、类型、约束）——参考 quiz 的 `data-model.ts` 结构
- 自动评分的具体算法（字数比例、完整性检查）——保持简单，可后续迭代
- homework 步骤在 lesson step type 枚举中的注册方式——遵循既有 step type 注册模式
- 泛化修复时具体代码改动范围——以不破坏 quiz 回归为前提
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope & Locked Decisions
- `.planning/PROJECT.md` — v4.2 milestone 目标、target features、key context、constraints
- `.planning/ROADMAP.md` — v4.2 Phase 75/76 目标、milestone 结构
- `.planning/STATE.md` — 当前 milestone 运行状态

### Quiz Plugin Baseline（必须对照的样板）
- `src/plugins/quiz-sample/data-model.ts` — quiz 的 dataModel 声明，homework 的直接类比
- `src/db/schema/generated/plugin-owned/quiz.ts` — quiz 的编译生成 Drizzle schema
- `scripts/compile-plugin-data-model.ts` — 编译脚本，homework 需接入同一链路
- `src/lib/dto/plugin-data-model.ts` — quiz 的 DTO 声明
- `src/lib/dto/plugin-data-access-allowlist.ts` — allowlist，泛化修复的首要目标

### Marketplace Lifecycle（必须复用的治理路径）
- `src/features/runtime-platform/` — `dispatchPluginDataAccess` facade + governance audit
- `src/actions/plugin-actions.ts` — install/upgrade/uninstall Server Actions
- `.planning/milestones/v4.0-ROADMAP.md` — v4.0 marketplace lifecycle 的完整 phase 分解（Phase 67-72.1）
- `.planning/milestones/v4.1-ROADMAP.md` — v4.1 多题型扩展的 phase 结构和 decision 记录

### Prior Phase Context
- `.planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-CONTEXT.md` — quiz 多题型数据模型、WS 事件、dashboard 的已锁定决策
- `.planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md` — close gate 拓扑、manual sign-off、verification artifact 模式

### Codebase Architecture
- `.planning/codebase/ARCHITECTURE.md` — 分层数据访问、plugin lifecycle、governance 审计、runtime platform 结构
- `.planning/codebase/STACK.md` — 技术栈（Next.js 16、Drizzle、Auth.js v5、WebSocket、Zustand）
- `.planning/codebase/INTEGRATIONS.md` — 外部集成（Auth.js、Redis、BullMQ）

### Classroom & Step System
- `src/actions/classroom-actions.ts` — classroom Server Actions（submit、save step）
- `src/app/(teacher)/classroom/` — /classroom 路由，homework tab 的新增位置
- `src/components/classroom/` — 现有 classroom 组件（live-answer-dashboard、recap surface）
- `src/lib/ranking/lexorank.ts` — LexoRank 步骤排序

### Design System
- `DESIGN.md` — Stitch 对齐的设计规范（Lexend、tonal surface、glass/gradient CTA、cn() 工具）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`dispatchPluginDataAccess` facade** (`src/features/runtime-platform/`): 5 个受治理动词，homework 的所有 DAL 操作经此 facade。需要确认 allowlist 对 `"homework"` pluginKey 的支持。
- **`compile-plugin-data-model.ts`**: 编译脚本，homework 需提供自己的 `data-model.ts` 并接入同一条编译链路。
- **Quiz `data-model.ts`** (`src/plugins/quiz-sample/data-model.ts`): homework `data-model.ts` 的直接模板。三表声明（assignments/submissions/grades）参考 quiz 的双表模式（questions/responses）。
- **Quiz sample plugin lifecycle**: install → authoring → classroom submit → upgrade → uninstall 的完整流程代码，homework 的逐环节对照。
- **`/classroom` tab 模式**: v4.1 的「作答实时」sibling tab 是 homework「作业提交」tab 的直接模板（路由、访问控制、Zustand store 模式）。
- **Step editor** (`src/app/(teacher)/teacher/editor/`): 现有的 step type 注册和编辑界面，homework 步骤类型需在此注册。
- **Zustand** (`zustand@5.0.x`): 已在 stack 中，用于客户端状态管理（homework 提交列表的实时聚合）。

### Established Patterns
- **Append-only/isLatest**: `plugin_owned_*` 表的事务模式（`UPDATE SET isLatest = false` → `INSERT isLatest = true`），homework 的 submissions 和 grades 表严格遵循。
- **DTO + Zod 验证**: `src/lib/dto/` 定义 schema → `src/lib/dal/` 消费，UI 不直连 DB。
- **Compile-don't-execute**: dataModel 声明在源码 → Zod meta-schema 校验 → Drizzle 生成 → checked-in 迁移，运行时零 DDL。
- **Command Bus 解耦**: `dispatchPlatformCommand` 统一写操作入口，homework 提交事件如需实时推送，遵循 quiz 的 Command Bus 解耦模式。
- **Migration-first**: Drizzle migration 管理 schema 变更，不依赖 `drizzle-kit push`。

### Integration Points
- **Plugin allowlist** (`src/lib/dto/plugin-data-access-allowlist.ts`): homework 的三表 + 5 动词需注册到 allowlist，这是泛化修复的第一个接缝。
- **DTO layer** (`src/lib/dto/plugin-data-model.ts`): 需新增 homework 的 DTO schema（assignments/submissions/grades），验证非 quiz 结构的通用性。
- **Step type registry**: lesson step 的 type 枚举需新增 `"homework"` 类型，关联 editor UI 和 player 渲染。
- **`/classroom` 路由**: 新增「作业提交」sibling tab，复用现有 tab 切换和访问控制模式。
- **Auth split** (`src/lib/auth/`): homework 的 Server Actions 需通过 auth split 鉴权，教师/学生角色区分。
- **Cache tags** (`src/lib/cache-policy.ts`): homework 数据如需缓存，复用 cache tag 体系。

### Creative Options
- homework 的自动评分逻辑可以作为独立的纯函数模块，方便后续迭代和测试。
- 「作业提交」tab 的实时更新可以复用 v4.1 dashboard 的 Zustand store 模式，也可以保持简单（手动刷新）——取决于是否需要 WS 推送。
- homework 的附件功能可以先做链接输入（不涉及文件上传），后续迭代再扩展为真正的文件上传。
</code_context>

<specifics>
## Specific Ideas

- 用户明确选择 homework 作为第二插件类型，因为与 quiz 差异足够大（异步提交 vs 实时答题、人工批改 vs 自动判分、三表 vs 双表）。
- 用户偏好边建边修策略：homework 遇到 quiz 假设时立即修复，不预先做全面代码审查。
- 用户希望 homework 走与 quiz 完全相同的受治理路径，不复用 built-in 特例。
- 自动评分 + 人工评语的批改模式：系统给基础分，教师可覆盖，保持人工在环。
- `/classroom` 新增 sibling tab 作为批改入口，保持与 v4.1 一致的布局模式。
- 对标 quiz 的全生命周期验证标准（零丢失 upgrade、retain+cleanup+重装 uninstall）。
</specifics>

<deferred>
## Deferred Ideas

- homework 插件的异步提交模式（课堂布置、课后提交）——当前选择课堂内同步完成，异步模式可留到后续迭代
- homework 的批改工作流增强（批量批改、rubric 评分标准）——属于 homework 插件自身的功能迭代
- 文件上传功能（真正的文件存储）——当前只做文本提交 + 可选附件链接
- `QUIZ-EXT-03`（AI 出题 / post-class interactive review）——v4.1 已暂缓，仍在 backlog
- `MKT-EXT-01`（upgrade dry-run）、`MKT-EXT-02`（跨 pluginKey 数据恢复）——v4.2 明确排除
- `STORE-01`（商业 storefront）——明确排除
- 非 homework 的第三插件类型——v4.2 只验证 quiz + homework 双插件

</deferred>

---

*Phase: 75-第二个 External 插件 + Marketplace 泛化验证*
*Context gathered: 2026-06-10*
