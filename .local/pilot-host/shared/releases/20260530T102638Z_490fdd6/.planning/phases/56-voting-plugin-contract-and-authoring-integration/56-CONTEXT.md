# Phase 56: Voting Plugin Contract & Authoring Integration - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责让“课堂投票插件”在教师 lesson editor 与 publish 路径中成为正式可配置、可校验、可冻结的样板插件能力，
并把它接到既有 plugin governance、lesson authoring、publish snapshot 流程上。

Phase 56 的职责不是实现课堂运行期的投票互动、学生提交、teacher result aggregation、operator recovery、deploy/backup/load。
这些分别属于 Phase 57-60。

本阶段的核心是：
- 教师能在现有 editor 中配置课堂投票插件步骤。
- 课堂投票插件配置有正式 schema、默认值、错误回显与学校范围内的可见性门禁。
- publish / republish 会冻结可执行的投票插件配置，并执行 preflight / compatibility gate。

本阶段建立在当前真实代码基线上：
- lesson authoring 只支持 `content` / `task` / `quiz` 三类核心 step type。
- built-in teaching steps 当前通过 `lesson.sidebar` hook + template proposal 注入 authoring workspace。
- publish readiness 当前只校验 lesson 基础字段、step payload 合法性与 built-in plugin availability。
- Phase 45 已锁定插件扩展应走独立 extension tables，而不是继续污染 core table payload。

</domain>

<decisions>
## Implementation Decisions

### Authoring model
- **D-56-01:** Phase 56 不新增第四种核心 `lessonStep.type`。课堂投票插件必须复用现有 `content` / `task` / `quiz` step model 之一，并通过 plugin-owned contract 表达其投票语义。
- **D-56-02:** 课堂投票插件的 authoring UI 必须建立在现有 teacher editor surface 与 `lesson.sidebar` plugin slot / built-in template 注入模式之上，而不是另起第二套 authoring shell。
- **D-56-03:** 教师可见的课堂投票插件列表必须受学校范围、enabled state、lifecycle state、版本兼容与 kill-switch posture 共同约束。

### Data and snapshot posture
- **D-56-04:** 课堂投票插件的结构化 authoring 配置不应继续污染核心 `lessonStep.payloadJson`；若需要 plugin-scoped config，应优先走已存在的 `plugin_ext_lesson_step` / extension-table pattern。
- **D-56-05:** publish / republish 必须把课堂投票插件的可执行配置冻结进 published snapshot 或等价 publish-bound contract，而不能在课堂运行期回读草稿态 extension。
- **D-56-06:** 任何 publish-time assembly 都必须继续以 SQLite + DAL 为 authoritative write path；plugin config 不得只存在于 UI state、WebSocket payload 或 memory cache。

### Preflight and compatibility
- **D-56-07:** 当前 `getLessonPublishReadinessDTO()` 只覆盖 built-in plugin availability；Phase 56 必须把课堂投票插件的 schema validity、enablement、compatibility 与 missing config 纳入 publish preflight。
- **D-56-08:** publish blocked 必须返回 teacher/operator 可解释的问题分类，而不是 generic `PUBLISH_BLOCKED`。
- **D-56-09:** 重复敏感的 authoring / publish writes 必须保持幂等或 dedupe posture，避免重复点击造成 snapshot 不一致。

### the agent's Discretion
- 课堂投票插件最终映射到 `task` 还是 `quiz` step，可由 planner 以“最小 blast radius + 最好契合课堂投票语义”为准做最小正确收敛，但不能引入新的核心 step type。
- publish snapshot 内 plugin config 的具体 shape 可以通过 `snapshotJson` 扩展区块、step-level plugin block、或等价 publish-bound contract 承载，只要满足“冻结后不读草稿态”与“沿用 SQLite + DAL truth”两个硬约束。
- teacher editor 中的 plugin config 入口可以是 built-in template + step editor 扩展，也可以是 plugin sidebar 辅助 authoring，只要不分裂成第二套 lesson model。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 56 的正式 goal、requirements、success criteria。
- `.planning/REQUIREMENTS.md` — `PLUG-01`、`PLUG-02`、`CHAIN-01`、`CHAIN-02`、`SAFE-01`、`SAFE-02` requirement truth。
- `.planning/PROJECT.md` — `v3.1` scope fence、baseline truths、out-of-scope。
- `.planning/STATE.md` — 当前 queued phase 与 milestone planning posture。

### Locked upstream context
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PILOT-CONTRACT.md` — 样板插件、样板链路、容量口径、deferred wall。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md` — Phase 56 必须交付的 proof expectation。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md` — authoring / publish 相关 failure taxonomy 与 recovery posture。

### Research decisions that lock this phase
- `.planning/research/SUMMARY.md` — v3.1 整体 framing 与 phase sequencing。
- `.planning/research/FEATURES.md` — sample-chain must-haves 与 plugin-first 边界。
- `.planning/research/ARCHITECTURE.md` — authoritative write path、feature root 挂接位与 plugin sample chain integration。
- `.planning/research/PITFALLS.md` — 不要只做框架、不做真实样板；不要只做 happy path；不要污染 durable truth。

### Existing code anchors
- `src/lib/dal/lesson-authoring.ts` — lesson editor DTO、publish readiness、publish snapshot freeze、step payload contract。
- `src/actions/lesson-authoring-actions.ts` — authoring / publish Server Action entrypoints。
- `src/components/authoring/lesson-authoring-workspace.tsx` — built-in template 注入与现有 step composer。
- `src/components/authoring/lesson-step-editor.tsx` — 当前 step editor 对 `content/task/quiz` 的编辑边界。
- `src/app/(teacher)/teacher/editor/page.tsx` — `lesson.sidebar` plugin slot 与 built-in template injection。
- `src/lib/dal/plugins.ts` — built-in teaching template resolution 与 plugin hook execution。
- `src/lib/dto/resource-ai.ts` — PluginManifestSchema、PluginActionSchema、built-in teaching definitions。
- `src/lib/dal/plugin-data.ts` — plugin extension table DAL seam。
- `.planning/phases/45-extension-and-plugin-owned-schema-patterns/45-01-SUMMARY.md` — extension-table pattern freeze。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lessonStepPayloadSchema` 当前严格限定 `content/task/quiz` 三类 payload；这说明课堂投票插件若要快速接入，必须优先复用现有 step shell，而不是扩成新的 core type。
- `LessonAuthoringWorkspace` 已有 built-in template quick add 与 `lesson.sidebar` plugin slot；这为课堂投票插件 authoring 提供了真实挂接位。
- `getLessonPublishReadinessDTO()` 和 `publishLesson()` 已提供 publish preflight 与 published snapshot freeze 路径，只是当前 preflight 还不认识样板插件级 contract。
- `plugin_ext_lesson_step` 与 `upsertPluginExtension/getPluginExtension` 已提供 step-level plugin config 的物理存储模式。

### Established Patterns
- authoring mutation 通过 Server Actions -> DAL -> SQLite -> cache invalidation 进入统一写路径。
- built-in template resolution 当前通过 enabled built-ins + manifest-declared action + `lesson.sidebar` hook 进入 authoring workspace。
- publish 时会从 `getLessonEditorDTO()` 组装 snapshotJson，并冻结步骤、materials 与 lesson/course DTO。
- 历史 Phase 45 已明确插件扩展数据应走 dedicated extension tables，而不是继续污染 core schema。

### Integration Points
- 如果课堂投票插件需要进入 authoring workspace，优先挂接在 `LessonAuthoringWorkspace` 的 built-in/plugin template 区域或 `lesson.sidebar` plugin slot。
- 如果课堂投票插件需要 teacher-side config persistence，优先落到 `plugin_ext_lesson_step` 对应的 DAL seam。
- 如果 publish 需要冻结 plugin-bound config，优先扩展 `publishLesson()` 的 snapshot assembly，而不是让课堂运行期读 draft extension。

</code_context>

<specifics>
## Specific Ideas

- 用“投票模板插入 + step-level plugin config editor + publish snapshot freeze”作为最小样板路线。
- 把 Phase 56 拆成三步：authoring contract、publish preflight/assembly、proof + verifier。
- 让 publish blocked issue codes 对 teacher/operator 可解释，例如 config missing、plugin disabled、plugin incompatible、schema invalid。
- 如果要新增 plugin action，优先沿用现有 `PluginActionSchema` / manifest pattern，而不是另造私有执行入口。

</specifics>

<deferred>
## Deferred Ideas

- 投票 runtime 触发、学生提交、结果聚合、teacher result view。
- operator recovery UI、deploy/backup/load 工程。
- 新增第四种核心 step type 或重写整个 authoring shell。

</deferred>

---

*Phase: 56-Voting Plugin Contract & Authoring Integration*
*Context gathered: 2026-05-24*
