# Phase 63: AI Draft Chain into Draft Lesson Version - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

把 Phase 62 LessonAgent 产出的、经 Zod 校验的步骤包，经 Command Bus **写入一个持久化的 draft lesson version**，闭合「AI 起草 → 落库草稿」链路。写入必须**幂等且 replay-safe**（同一起草请求重试不产生重复 draft），draft 必须在**数据上标注 AI 来源**、可与教师手工编辑区分，且**绝不自动发布给学生**。covers DRAFT-01~03，依赖 Phase 62（已完成）。

**核心张力（已由用户拍板解决）：** 代码库现状无任何 draft-version 实体——「草稿」就是 live `lessons`+`lessonSteps`（教师手工编辑工作面），唯一版本化实体是不可变的 `publishedLessonVersions` 快照表，且无任何 AI 来源标记列。Phase 63 通过**新建对称的 `draftLessonVersions` 快照表**承接 AI 起草，**不写入 live `lessonSteps`、不污染教师工作副本、不建第二真相源**（draftLessonVersions 是 publish/version 快照模型的对称扩展，是 AI 提案存储，而非 live 课时的第二真相源）。

**本 phase 不做 UI。** 教师审校 / 接受 / apply draft → live lesson 的界面与交互归 Phase 64（REVIEW，Stitch `5322129002350954765` + DESIGN.md）。本 phase 只做服务端写入链路 + 数据模型 + 可追溯/幂等保证。

</domain>

<decisions>
## Implementation Decisions

### DRAFT-01 草稿持久化目标（不建第二真相源）
- **D-01 新建 `draftLessonVersions` 快照表:** 镜像 `publishedLessonVersions` 的 snapshot 模式，存**不可变的 AI 起草提案**。draft **永不就地触碰** live `lessonSteps`，直到 Phase 64 教师接受才 apply。这是 publish/version 快照模型的对称扩展，**不是 live 课时的第二真相源**（live 真相仍是 lessons+lessonSteps；publishedLessonVersions 是已发布快照；draftLessonVersions 是 AI 提案快照）。
  - 表归属一节目标 `lessonId`（FK，`onDelete: cascade`，遵循项目「所有 FK cascade」约束）。
  - snapshot 形状复用既有步骤模型（`lessonStepPayloadSchema` content/task/quiz discriminated union），**不造第二套步骤 schema**。
  - **不复用 `agentProposals` 表**：它与 lesson 版本模型脱节，diff/accept 链路要另接；用对称的版本快照表更贴合「draft lesson version」语义与 Phase 64 整课 diff 前提。

### DRAFT-01 草稿粒度（整课多步）
- **D-02 整课多步草稿版本:** 一个 draft version = **一节课的完整步骤序列**（可含多个 content/task/quiz，带 lexorank 排序），而非单步追加。最贴合「draft lesson **version**」语义，也是 Phase 64 做整课 diff/accept 的前提。
  - Phase 62 的 `lesson.draft.run` 每次只产出**一个**步骤包；Phase 63 需把单步产出**累积/编排成整课草稿版本**（容器化：draft version 是容器，被一次或多次起草填充）。单步如何聚合进整课快照（一次性整课起草 vs 多次 draft.run 累积进同一 version）由 planner 依幂等 key 模型定。

### DRAFT-02 幂等 / replay-safe
- **D-03 客户端显式 idempotencyKey + dedupe:required:** 新增的**持久化 command** 由调用方（教师触发起草的已鉴权 Server Action）传入一个**稳定的 idempotencyKey**（如 `lessonId + 一次起草会话/意图 ID`），command 设 `dedupe:"required"`。Command Bus 命中既有 dedupeKey 时**直接返回先前结果**，不重复写 draft。最可控、replay-safe。
  - 与 Phase 62 现状对照：`lesson.draft.run` 当前是 `dedupe:"optional"`，每次 dispatch 生成唯一 key、**非幂等**——这是「生成」语义可接受。Phase 63 的「写入」语义必须升级为 required-dedupe。
  - **写入幂等点**：相同 idempotencyKey 的重试，要么命中 command dedupe 直接短路，要么在 draftLessonVersions 落地用确定性键保证不产生重复行（planner 对齐 bus dedupe 与表唯一约束，二选一或叠加）。

### DRAFT-03 AI 来源标记（可与人工区分、不自动发布）
- **D-04 draft version 行上 `source` 枚举 + `sourceCommandId` 回链:** 在 `draftLessonVersions` 行加 `source`（`'ai' | 'human' | 'ai_edited'` 之类，最终取值由 planner 定）+ `sourceCommandId`（回链产出它的 `lesson.draft.run` / 持久化 command，做 provenance 审计）。版本级 provenance，干净、可查询、**不动 lessonSteps**。
  - **不内嵌进 step payload JSON**：provenance 散在每步、查询弱，且违背 events/DTO 的 summary-only 取向。
  - **不自动发布**：draft 永远不进入学生可见路径——学生可见性走既有 `status` 过滤，draftLessonVersions 不参与发布；apply→publish 由 Phase 64 教师显式动作触发。

### Phase 62 边界继承（强约束，非灰区）
- **D-05 新增写 command，draft.run 保持纯生成:** Phase 62 已定 `lesson.draft.run` summary-only、**不落库**。Phase 63 **新增一个独立的持久化 command**（如 `lesson.draft.version.write` / `lesson.draft.persist`，命名由 planner 对齐 registry 风格），承接已校验步骤包 + idempotencyKey 写 draftLessonVersions。`lesson.draft.run` 维持纯生成不变。
  - 写入仍只经 Command Bus（`dispatchPlatformCommand`），事件经父 command 落账（`platformEvents.commandId` notNull+FK，唯一路径 dispatch）。
  - 写入成功/失败发 typed platform events，沿用 Phase 62 三 AI 域事件体系 + summary-only 守卫；是否新增 `draft.persisted` / `draft.version.written` 事件变体由 planner 定。

### the agent's Discretion
- 表列细节（snapshot 存法：内联 stepsJson 快照 vs 子表 `draftLessonStepVersions`）、`source` 枚举确切取值、idempotencyKey 确切组成、新持久化 command 命名、是否新增专属事件变体——由 planner/executor 依既有 schema/registry/contracts 风格定。
- 单步 draft.run 产出**聚合成整课 version** 的确切机制（一次性整课起草，还是多次累积进同一 draft version 容器）——planner 依 D-03 幂等模型定。
- 乐观锁 / `revision` / `isLatest` 是否引入 draftLessonVersions（参照 lessons.revision、taskSubmissions.isLatest 先例）——planner 定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与里程碑
- `.planning/REQUIREMENTS.md` §DRAFT-01~03 原文（line 25–27）+ 覆盖矩阵（75–77）—— 经 Command Bus 写 draft lesson version·复用既有 publish/version 模型不建第二真相源 / 写入幂等且 replay-safe / draft 标注 AI 来源·与人工编辑可区分·不自动发布给学生。
- `.planning/ROADMAP.md` §Phase 63（line 69–73）—— Goal + depends Phase 62 + 3 条 Success Criteria。

### 上游 phase（必读，避免重复决策）
- `.planning/phases/62-lessonagent-typed-tool-layer/62-CONTEXT.md` + `62-04-SUMMARY.md` + `VERIFICATION.md` —— Phase 62 已交付：`lesson.draft.run` command（summary-only 不落库、dedupe:optional）、`createDraftLessonStepTool` factory、三 AI 域 typed events + summary-only 守卫、`draftLessonStep` server-only 编排入口、`assertActiveTeacher`→facade→只读 DAL 链路、teacherId 闭包注入不进 payload。**Phase 63 在此之上加写入层，不重做生成层。**
- `.planning/phases/61-ai-provider-abstraction-layer/61-CONTEXT.md` —— provider facade 边界（间接相关）。

### 架构与约束（项目根 AGENTS.md 内联）
- `AGENTS.md` §Technology Stack Non-Negotiable Constraints —— **Database: SQLite-first，所有关联必须 `onDelete: cascade`**；**Data Access: UI 禁直连 DB，全走 DAL + Server Actions**；**Caching: 写入后必须 `updateTag()`/`revalidateTag()` 失效 draft 相关 tag**（如 `lesson:${id}` / 新增 `draft:${lessonId}`）；append-only / isLatest 写入先例（taskSubmissions）。
- `DESIGN.md` —— 本 phase 无 UI（草稿审校界面归 Phase 64），仅备查。

### 代码地图
- `.planning/codebase/ARCHITECTURE.md` §分层数据访问 + §写型 command/event 落账。
- `.planning/codebase/CONVENTIONS.md` / `CONCERNS.md` —— Drizzle schema 风格、FK cascade、Zod 边界、`server-only` 隔离。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets / 真相源模型（scout 已确认）
- **`src/db/schema.ts`**：
  - `lessons`（行 530–551）—— live 草稿工作面，`status`（行544，默认 "draft"）、`revision`（行545 乐观锁）、`publishedVersionId`（行546 plain text 非 FK）、`createdById`（行539–541）。
  - `lessonSteps`（行 553–571）—— 子步骤就地编辑，`type`/`title`/`rank`（行564 lexorank）/`payloadJson`，`archivedAt` 软删。
  - `publishedLessonVersions` —— **唯一不可变已发布快照表，是 D-01 新建 `draftLessonVersions` 的对称镜像参照**。
  - **当前无 `draftLessonVersions` 表、无任何 AI-source 标记列** —— D-01/D-04 的落点缺口。
  - command/event `type` 为无约束 text（407/450/452）；`platformEvents.commandId` notNull+FK（443–445），事件无法脱离父 command 独立落账。
- **`src/lib/dto/lesson-authoring.ts` `lessonStepPayloadSchema` / `LessonStepDTOSchema`** —— draft snapshot 步骤形状直接复用，不造第二套。
- **`src/features/platform-core/commands/`（`bus.ts` `dispatchPlatformCommand` / `registry.ts` / `handlers/lesson-draft.ts`）** —— v3.0 Command Bus（typed dispatch + dedupe + persistPlatformEvents）；新写 command 在此注册，参照 `lesson-draft.ts` handler analog。
- **`src/features/platform-core/events/`（`contracts.ts` 三 AI 域事件 / `ledger.ts` `appendPlatformEvents`）** —— 写入事件并入此体系 + summary-only 守卫。
- **`src/server/ai/agents/lesson-agent.ts`（Phase 62，`draftLessonStep` 经 `dispatchPlatformCommand`）** —— 本 phase 写入链路的上游调用点。
- **写入先例**：`taskSubmissions` append-only + `isLatest`、`lessons.revision` 乐观锁 —— draftLessonVersions 幂等/版本策略的最近参照。

### Established Patterns
- **严格分层 + server-only**：写入只经 Command Bus；UI/Edge/插件绝不直达。
- **FK cascade 强制**：draftLessonVersions→lessons 必须 `onDelete: cascade`。
- **事件 summary-only**：payload 不含 `*Json` 快照/对象快照。
- **显式缓存失效**：写后 `updateTag`（read-your-writes），draft 相关 tag 失效。
- **Drizzle migration-first**：新表走 `pnpm db:generate` + `db:migrate`，不靠 push。

### Integration Points
- 上游：Phase 62 `draftLessonStep` / `lesson.draft.run` 产出校验步骤包。
- 本 phase：新持久化 command + `draftLessonVersions` 表 + `source`/`sourceCommandId` provenance。
- 下游：Phase 64 读 draftLessonVersions 做审校 UI + apply→live lesson + publish。

</code_context>

<specifics>
## Specific Ideas

- 新表命名意向：`draftLessonVersions`（对称 `publishedLessonVersions`）；步骤快照存法（内联 JSON vs 子表）由 planner 定。
- 新 command 命名意向：`lesson.draft.version.write` / `lesson.draft.persist`（对齐 registry 既有 `lesson.*` 风格）。
- 事件命名意向：`draft.persisted` / `draft.version.written`（并入 Phase 62 三 AI 域事件集合，最终名对齐 contracts.ts 风格）。
- `source` 枚举意向：`'ai' | 'human' | 'ai_edited'`（为 Phase 64「教师在 AI 草稿上手工编辑」预留 `ai_edited`，但本 phase 只写 `'ai'`）。
- idempotencyKey 意向：`lessonId + 起草会话/意图 ID`，调用方稳定生成；dedupe:required。
- 强调对称性：draftLessonVersions 一切设计向 publishedLessonVersions 看齐，最大化 Phase 64 复用既有 publish 链路。

</specifics>

<deferred>
## Deferred Ideas

- **教师审校 / 接受 / apply draft → live lesson 的 UI 与交互**：Phase 64（REVIEW，Stitch + DESIGN.md）。
- **draft → publish 的整课 diff 可视化、冲突解决（draft 与教师并发手工编辑）**：Phase 64。
- **`ai_edited` 来源的实际写入路径（教师在 AI 草稿上改）**：枚举本 phase 预留，写入路径归 Phase 64。
- **多 Agent（Homework/Data/Tutor/Parent）写各自 draft 实体**：本 phase 仅 LessonAgent→draftLessonVersions。
- **Eval / guardrails / 起草质量评估**：Phase 65。
- **RAG 增强起草上下文**：Future milestone（同 Phase 62 deferred）。

None deferred-from-todos —— todo.match-phase 63 零匹配。

</deferred>

---

*Phase: 63-AI Draft Chain into Draft Lesson Version*
*Context gathered: 2026-05-31*
