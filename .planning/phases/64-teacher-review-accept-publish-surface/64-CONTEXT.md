# Phase 64: Teacher Review & Accept-Publish Surface - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

交付教师审校面：在现有编辑器内嵌入 diff 审校模式，教师看到 AI 草稿（`draftLessonVersions.snapshotJson`）与当前活跃步骤（`lessonSteps`）的单列步骤级 diff（新增/修改/删除标注），可逐项或整体编辑草稿后再决定去留。接受时将草稿步骤完全替换活跃 `lessonSteps` 并回链 `lessons` 表 source 标记，教师随后通过既有「发布课时」按钮走 `publishLesson()` 链路；丢弃时仅标记 draft 行状态，不影响活跃课时。全程界面对齐 Stitch `5322129002350954765` + DESIGN.md（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA）。覆盖 REVIEW-01~04，依赖 Phase 63（已交付 `draftLessonVersions` 表 + `lesson.draft.persist` command）。

**本 phase 不做：** Eval/guardrails（Phase 65）、多 Agent（deferred）、RAG 增强起草（deferred）、plugin 触达 AI（deferred）。
</domain>

<decisions>
## Implementation Decisions

### Diff 视图呈现（REVIEW-01）
- **D-01 单列 diff 标注:** 一条垂直步骤列表，每步标注差异状态——新增（绿色 accent 徽章）、修改（蓝色 primary 徽章）、删除（红色划线 + 弱化）、无变化（无标记）。紧凑、对齐现有 `FlowStepCard` 垂直时间线模式。
- **D-02 按步骤索引位置对齐:** draft steps[n] ↔ live steps[n] 按原生顺序比对。新增 = AI 稿有对应索引但活跃无对应步骤；删除 = 活跃有对应索引但 AI 稿无对应步骤；修改 = 索引位置一致但 title/payload 不同。
- **D-03 右侧面板内联编辑:** 点击步骤后右侧滑出轻量编辑面板（title + description + content markdown），不弹出模态框、不离开 diff 视图。type 字段不可改（AI 生成的步骤类型不应在审校中篡改）。

### 接受→发布路径（REVIEW-03）
- **D-04 接受 = apply 到活跃步骤:** 教师点「接受全部」后，草稿步骤完全替换 `lessonSteps`（archive 旧步骤 + 写入新步骤，还原 LexoRank 顺序）。接受后不自动发布——教师回到编辑器，看到已填充的步骤，点击既有的「发布课时」按钮走 `publishLesson()` 链路。保持教师对发布的最终控制。
- **D-05 lessons 表 source 回链:** apply 后在 `lessons` 表新增列回链（如 `aiDraftAppliedAt` timestamp + `latestDraftVersionId` 外键），lessonSteps 行不做 source 标记。步骤级 provenance 留存在 `draftLessonVersions` 中查询。Phase 63 预留的 `source` 枚举仅用于 draft 表，活跃表保持清洁。
- **D-06 apply 前确认:** 如果当前活跃 `lessonSteps` 非空（教师已手写了步骤），apply 会完全覆盖。需在 UI 中显式提示：「接受 AI 草稿将覆盖当前步骤，此操作不可撤销。」
- **D-07 接受后 draft 行状态:** apply 成功的 draft 行标记为 `status: 'applied'`，保留历史供审计。

### 丢弃行为（REVIEW-03）
- **D-08 标记丢弃 + 保留行:** 教师点「丢弃」后，`draftLessonVersions` 行加 `status: 'discarded'` 和 `archivedAt` 时间戳——物理保留行、不删数据。不影响活跃 `lessonSteps`。DRAFT-03「丢弃不影响原课时」得以保证。

### 审校入口与布局
- **D-09 编辑器内模式切换:** 审校界面嵌入现有 `/teacher/editor` 页面，通过 URL search param `?mode=review` 切换。编辑器顶部加模式切换开关（「编辑」↔「审校」），有未审校草稿时显示提示徽章。
- **D-10 glass 顶部发现提示:** 编辑模式下，有未审校的 AI 草稿时，编辑器顶部出现一条 glass 半透明提示条：「AI 已生成草稿，点击审校 →」。可关闭，但下次刷新页面时重新出现（草稿未处理则持续提示）。
- **D-11 审校模式布局:** 切换后左侧资源面板折叠，主区域全宽渲染 diff 步骤列表。顶部固定操作栏放「接受全部」（primary 渐变按钮）、「丢弃」（secondary）、「返回编辑」（tertiary）。右侧面板仅在点击步骤后滑出编辑表单。
- **D-12 审校进度保留:** 从审校切回编辑再切回时，保留 diff 中的已标注/已编辑状态（客户端 state，刷新清空）。未提交的编辑不落库。

### 步骤级编辑能力（REVIEW-02）
- **D-13 轻量编辑字段:** 右侧面板仅暴露 title、description、content（markdown）三个字段。不暴露 type（AI 生成类型不应审校篡改）、不暴露插件/投票配置（高级配置归正常编辑器）。
- **D-14 逐项 + 全局接受/丢弃:** 每个步骤 card 上有独立的「接受此步」（inline primary 小按钮）和「丢弃此步」（inline tertiary 小按钮）。顶部操作栏同时有全局「接受全部」「丢弃全部」。逐项精确控制，教师可挑着用 AI 的步骤。

### Claude's Discretion
- 新增 DAL 读方法（`getDraftLessonVersions(lessonId)` / `getLatestDraftVersion(lessonId)`）的函数签名——planner 对齐 `src/lib/dal/lesson-authoring.ts` 风格。
- 新增 command 命名（`lesson.draft.accept` / `lesson.draft.discard` / `lesson.draft.apply` 分别还是合一）——planner 对齐 `registry.ts` 既有 `lesson.draft.*` 风格。
- `lessons` 表新增列命名（`aiDraftAppliedAt` / `latestDraftVersionId`）——planner 对齐 schema 现有命名惯例。
- apply 到活跃步骤时 LexoRank 的还原策略（draft 中存的是原始 rank 值还是相对顺序）——planner 依 `snapshotJson` 实际存储内容决定。
- 新增 event 变体（`lesson.draft.accepted` / `lesson.draft.discarded` / `lesson.draft.applied`）——planner 依 events/contracts.ts 既有风格定。
- diff 计算逻辑（客户端 vs 服务端）——planner 定。若服务端，需考虑缓存 tag；若客户端，需 DTO 同时返回 draft 和 live 步骤。
- cache tag 新增与失效策略——planner 定，参考既有 `draftLesson(lessonId)` tag。

### Folded Todos
无 —— todo.match-phase 64 零匹配。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与里程碑
- `.planning/REQUIREMENTS.md` §REVIEW-01~04 原文（line 31–34）+ 覆盖矩阵（line 78–81）—— diff 展示 / 逐项编辑 / 接受或丢弃 / Stitch + DESIGN.md 对齐。
- `.planning/ROADMAP.md` §Phase 64（line 83–96）—— Goal + depends Phase 63 + 4 Success Criteria + UI hint: yes。

### 上游 phase（必读，避免重复决策）
- `.planning/phases/63-ai-draft-chain-into-draft-lesson-version/63-CONTEXT.md` + `63-04-SUMMARY.md` —— Phase 63 已交付：`draftLessonVersions` 表（snapshotJson、source、sourceCommandId）、`lesson.draft.persist` command（dedupe:required）、`persistDraftLessonVersion` DAL。**Phase 64 在此之上建 UI 层，不重做写入层。**
- `.planning/phases/62-lessonagent-typed-tool-layer/62-CONTEXT.md` —— steps payload schema（content/task/quiz discriminated union）来源。

### 设计系统（必读，UI 组件对齐基线）
- `DESIGN.md`（repo root）—— 全部设计规则：无 1px 分隔线、surface 层级、Lexend 字体、glass/gradient CTA、按钮变体、卡片规范、阴影规范。
- `src/app/globals.css` —— 已定义 Tailwind v4 CSS 设计令牌（surface、primary、on-surface、shadow-ambient、radius-shell/card 等）。

### 架构与约束（项目根 AGENTS.md 内联）
- `AGENTS.md` §Technology Stack Non-Negotiable Constraints —— **Data Access: UI 禁直连 DB**（审校页面 UI 组件只走 Server Actions → DAL）；**Caching: 写入后 `updateTag()`/`revalidateTag()`**（apply/discard 后失效 `draft:${lessonId}` / `lesson:${lessonId}` / `steps:${lessonId}`）；**Database: SQLite-first，所有 FK cascade**。
- `AGENTS.md` §DAL + Server Actions —— 审校页面通过 Server Action 获取 DTO，不直接 import DAL。

### 代码地图
- `.planning/codebase/ARCHITECTURE.md` §分层数据访问 + §写型 command/event 落账。
- `.planning/codebase/CONVENTIONS.md` —— Drizzle schema 风格、Zod 边界、`server-only` 隔离。

### 代码参照（写 CONTEXT 时已完成 scout）
- `src/db/schema.ts` line 611–635 —— `draftLessonVersions` 表完整定义（内联 snapshotJson、source 枚举、sourceCommandId unique 索引）。
- `src/lib/dal/lesson-authoring.ts` —— `publishLesson()`（line 1375–1455）、`persistDraftLessonVersion()`（line 1457–1496）。accept 时需新增 `applyDraftToLiveLesson()` DAL。
- `src/components/authoring/lesson-authoring-workspace.tsx`（508 行）—— 现有步骤编辑流布局，审校模式需在此组件内条件渲染 diff 视图。
- `src/components/authoring/flow-step-card.tsx`（473 行）—— 步骤卡片渲染模式，diff 标注可复用/适配此组件。
- `src/components/surfaces/course-import-review-surface.tsx`（350 行）—— 行级审校决策模式（创建/更新/跳过），可作为逐项接受/丢弃的交互参考。
- `src/features/platform-core/commands/registry.ts` —— 既有 `lesson.draft.run`（optional dedupe）和 `lesson.draft.persist`（required dedupe），新 accept/discard command 在此注册。
- `src/features/platform-core/commands/handlers/lesson-draft.ts`（239 行）—— handler 模式参照（authorize + execute + successResult/throwDraftFailure）。
- `src/components/ui/button.tsx` —— primary（渐变）/ secondary（surface-container-highest）/ tertiary（透明）三变体。
- `src/components/surfaces/stage-hero.tsx`（56 行）—— 深色 hero 模板，可复用为审校模式顶部 header。
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`FlowStepCard`**（`src/components/authoring/flow-step-card.tsx`）：垂直时间线步骤卡片，带步骤编号圆、标题/描述、类型徽章、操作行。diff 标注视图可直接适配——在现有卡片上叠加状态 badge + 接受/丢弃按钮。
- **`Button` 三变体：** primary（渐变 CTA，`bg-linear-135 from-primary to-primary-container`）、secondary（`surface-container-highest`）、tertiary（透明）。审校操作栏的「接受全部」用 primary、「丢弃」用 secondary、「返回编辑」用 tertiary。
- **`CourseImportReviewSurface`**（350 行）：行级审校决策模式——每行独立创建/更新/跳过 + 顶部「应用所有」全局按钮。交互模式可直接借鉴到步骤级接受/丢弃。
- **`StageHero`**（深色渐变 hero）：可复用为审校模式顶部区域（标题 + draft 元信息 + 草稿创建时间）。
- **`teacher-surface-rhythm.ts`**：共享布局常量（stack、shell、card、hero、section），审校新组件遵循同一视觉节奏。
- **Glass 模式**（`glass-nav.tsx`）：`bg-surface/80 backdrop-blur-xl`——草稿发现提示栏用此模式。
- **`draftLessonVersions` 表：** 已存在且稳定（snapshotJson、source、sourceCommandId、version），需补充 DAL 读方法和 accept/discard 状态列。
- **`publishLesson()` DAL：** 接受链路最终复用此函数，不做新的发布真相源。

### Established Patterns
- **严格分层 + server-only：** UI 组件不 import DAL——审校页面组件通过 Server Action 获取 DTO（{ draftSteps, liveSteps, meta }），DAL 方法开在 `src/lib/dal/lesson-authoring.ts`。
- **FK cascade 强制：** 新增 `latestDraftVersionId` FK → `draftLessonVersions.id` 需 `onDelete: cascade`。
- **事件 summary-only：** 新 accept/discard 事件 payload 不含 `*Json` 快照。
- **显式缓存失效：** apply/discard 后 `updateTag('draft:${lessonId}')` + `revalidateTag('steps:${lessonId}')`。
- **Drizzle migration-first：** 新增列/状态字段走 `pnpm db:generate` + `db:migrate`。
- **Zod 边界校验：** Server Action 入参经 Zod schema 校验，accept/discard action 同样。

### Integration Points
- 上游：Phase 63 `draftLessonVersions` 表 + `lesson.draft.persist` command。Phase 64 读取 draft 做 diff；新增 accept/discard command 相邻注册。
- 本 phase：审校 UI（编辑器内 mode=review）+ accept/discard Server Actions + apply DAL + 新 command types + 新事件变体。
- 下游：Phase 65（eval/guardrails/close gate）——对本 phase 的 accept→publish 链路做端到端验证。
</code_context>

<specifics>
## Specific Ideas

- **diff 状态标注色板：** 新增 → 绿色 accent（`tertiary-container` 系）；修改 → 蓝色 primary（`primary-container` 系）；删除 → 红色弱化（`error-container` + 划线）；无变化 → 无标记。
- **草稿发现提示栏样式：** `bg-surface/85 backdrop-blur-lg rounded-2xl`，内含图标 + 文案 + 「审校 →」链接按钮。位于编辑器内容区顶部，不浮在标题栏上。
- **模式切换开关：** 现有编辑器头部操作行右侧加分段按钮（Segmented Control 风格）：`[编辑] [审校 ⚡1]`——审校段带计数 badge。对齐 glass nav 风格。
- **右侧编辑面板：** `w-96` 固定宽度面板，`bg-surface-container-lowest`，顶部标题栏 + 三个输入字段 + 底部关闭按钮。从右滑入动画。
- **逐项接受/丢弃按钮：** 放在每个 diff step card 的右下角，inline 小尺寸——接受用 `primary` 小图标按钮、丢弃用 `tertiary` 小图标按钮。
- **接受后的教训通知：** apply 成功后顶部 toast：「AI 草稿已应用到课时，你可以在编辑器中继续调整后发布」。
- **新增 command 命名意向：** `lesson.draft.accept`（标记为 applied + apply 到活跃步骤）、`lesson.draft.discard`（标记为 discarded）。两个都在 `registry.ts` 注册，dedupe:required。
- **新增事件意向：** `lesson.draft.accepted`、`lesson.draft.discarded`、`lesson.draft.applied`（apply 成功写入活跃步骤后发），并入 Phase 62/63 事件集合。
</specifics>

<deferred>
## Deferred Ideas

- **教师在 AI 草稿上手工编辑后 source 变为 `ai_edited`**：Phase 63 已预留枚举值，实际写入路径归本 phase（接受时 teacher 编辑了某些步骤）。具体实现由 planner/executor 决定是否在 apply 时区分「纯接受」和「编辑后接受」的 source 值。
- **draft → live 的冲突解决（教师并发手工编辑 + AI 草稿同时存在）**：当前设计为完全替换（D-04），未来可能需要三方合并。deferred to future milestone。
- **多 Agent（Homework/Data/Tutor/Parent）各自的 draft 实体**：本 phase 仅处理 LessonAgent → draftLessonVersions。deferred to future milestone。
- **Eval / guardrails / 起草质量评估**：Phase 65。
- **RAG 增强起草上下文**：future milestone。
- **审校 UI 的移动端/平板适配**：当前仅桌面端，移动端 deferred。
- **draft 版本对比（多个 draft 之间）**：当前仅展示最新 draft vs live，多版本对比 deferred。
- **审校编辑的自动保存**：当前侧面板编辑不自动保存到 draftLessonVersions，切回编辑模式即清空。自动保存 deferred。

无 reviewed-but-deferred todos —— cross_reference_todos 零匹配。
</deferred>

---

*Phase: 64-Teacher Review & Accept-Publish Surface*
*Context gathered: 2026-05-31*
