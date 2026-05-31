# Phase 56: Voting Plugin Contract & Authoring Integration - Research

**Researched:** 2026-05-24  
**Domain:** voting plugin authoring contract, publish preflight, publish snapshot freeze  
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | 课堂投票插件必须具备正式的 action resolve / dispatch / result contract，而不是只停留在 descriptor 或 registry 展示。 | 现有 plugin hook/template 体系已能把 enabled built-in plugin capability 注入 authoring，但课堂投票样板还没有正式 action/contract；需要沿用既有 manifest/action pattern 扩展，而不是发明第二套执行入口。[VERIFIED: src/lib/dal/plugins.ts][VERIFIED: src/lib/dto/resource-ai.ts] |
| PLUG-02 | 教师只能在 authoring 与 publish 路径中使用当前学校可用、已启用、版本兼容的课堂投票插件能力。 | 当前 built-in template 注入已受 enabled + manifest action 约束；Phase 56 需要把同样的 school/lifecycle/compatibility 限制应用到课堂投票样板。[VERIFIED: src/lib/dal/plugins.ts][VERIFIED: src/app/(teacher)/teacher/editor/page.tsx] |
| CHAIN-01 | lesson editor 必须支持课堂投票插件步骤的正式配置、schema validation、默认值与错误回显。 | 当前 editor 只支持 `content/task/quiz`，且 step editor 会严格按 `lessonStepPayloadSchema` 校验；这要求 Phase 56 采用“复用现有 step shell + plugin-scoped config”而不是新增 core step type。[VERIFIED: src/lib/dto/lesson-authoring.ts][VERIFIED: src/components/authoring/lesson-step-editor.tsx] |
| CHAIN-02 | publish / republish 必须冻结课堂投票插件配置到可执行版本，并执行 preflight / compatibility gate。 | 当前 publish readiness 只覆盖 built-in plugin availability，publish snapshot 只冻结 lesson/course/steps/materials；Phase 56 需要把 voting plugin config 纳入 readiness 和 snapshot assembly。[VERIFIED: src/lib/dal/lesson-authoring.ts] |
| SAFE-01 | SQLite + DAL 必须继续作为唯一 durable truth；Redis、WebSocket、BullMQ 只能作为 delivery 或 orchestration substrate。 | 研究和现有 codepath 都明确 snapshot/publish/readiness 必须经由 DAL + SQLite；plugin config 不应只存在于 UI state 或 transport memory。[VERIFIED: .planning/research/ARCHITECTURE.md][VERIFIED: src/lib/dal/lesson-authoring.ts] |
| SAFE-02 | 样板链路中的关键写操作必须具备强校验、幂等/去重、补偿或 replay-safe 语义。 | 当前 authoring/save/publish 已有 parse + conflict posture；Phase 56 需要把 voting config persistence / publish freeze 也纳入这一 discipline。[VERIFIED: src/actions/lesson-authoring-actions.ts][VERIFIED: src/lib/dal/plugin-data.ts] |

</phase_requirements>

## Summary

Phase 56 的核心现实约束非常清晰：当前系统并不存在“通用插件步骤”这一独立 lesson model，teacher editor 与 step editor 只认识 `content`、`task`、`quiz` 三类核心 step shell。[VERIFIED: src/lib/dto/lesson-authoring.ts][VERIFIED: src/components/authoring/lesson-step-editor.tsx] 因此课堂投票插件若想最小 blast radius 落地，不能先新增第四种 core step type；正确方向是**复用现有 step shell，并把插件特有的 authoring config 放到 plugin-scoped contract 中**。[VERIFIED: .planning/phases/45-extension-and-plugin-owned-schema-patterns/45-01-SUMMARY.md][VERIFIED: src/lib/dal/plugin-data.ts]

现有 authoring 侧已经有两条可复用的入口：

1. `LessonAuthoringWorkspace` 的 built-in template quick add，允许把 manifest/action 可发现的插件模板注入 editor；
2. `teacher/editor/page.tsx` 的 `lesson.sidebar` plugin slot，允许 plugin 以 sidecar 方式参与 lesson authoring surface。

这说明 Phase 56 不需要造新的 authoring shell，而应在当前 editor 里完成“投票模板插入 + plugin config 编辑 + publish preflight”的闭环。[VERIFIED: src/components/authoring/lesson-authoring-workspace.tsx][VERIFIED: src/components/plugins/plugin-renderer.tsx][VERIFIED: src/app/(teacher)/teacher/editor/page.tsx]

publish 侧也有清楚的锚点：`getLessonPublishReadinessDTO()` 当前会校验 lesson 基础字段、step payload 合法性与 built-in plugin availability；`publishLesson()` 会通过 `getLessonEditorDTO()` 组装 `snapshotJson` 并冻结 lesson/course/steps/materials。[VERIFIED: src/lib/dal/lesson-authoring.ts] 这意味着 Phase 56 的最小正确路线不是重造 publish pipeline，而是：

- 把课堂投票插件 config 加入 publish preflight；
- 把 plugin-bound executable config 加入 published snapshot 或等价 publish-bound contract；
- 确保课堂运行期不会回读草稿态 plugin extension。

## Recommended Approach

1. **先建立 voting plugin authoring contract。**
   - 选择最小 blast radius 的核心 step shell。
   - 定义 voting plugin 的 config schema、默认值、teacher-facing labels、validation reasons。
   - 让它通过现有 authoring surface 进入 lesson。

2. **再补 publish preflight 与 snapshot freeze。**
   - extend readiness DTO / issue taxonomy。
   - 把 enabled/lifecycle/compatibility/config-validity 纳入 publish gate。
   - 把 voting plugin executable config 冻结进 published snapshot。

3. **最后补 proof 与 verifier。**
   - focused tests 覆盖 schema validity、visibility gate、publish blocked、publish snapshot freeze。
   - repo-local verifier 锁定“不新增 core step type”“不回读草稿态 config”“不把 plugin config 留在 runtime-only memory”。

## Architecture Patterns

### Pattern 1: Reuse the existing step shell
- **What:** classroom voting reuses `content` / `task` / `quiz` step shell rather than introducing a new step kind.
- **Why:** 当前 editor、preview、publish、classroom snapshot、learning/classroom DTO 全部围绕这三种核心 step type；新增 core type 会扩大 blast radius 到 lesson/classroom 全链。

### Pattern 2: Plugin extension over core payload pollution
- **What:** plugin-scoped config uses `plugin_ext_lesson_step` / dedicated extension tables or equivalent DAL-owned contract.
- **Why:** Phase 45 已经锁定“dedicated extension tables instead of core-table field pollution”；继续往 `lessonStep.payloadJson` 塞 plugin private config 会违反既有决策。

### Pattern 3: Publish-bound executable contract
- **What:** runtime should consume voting plugin config that was frozen during publish, not draft-time extension state.
- **Why:** 课堂运行必须对 published snapshot 负责；否则 teacher 修改草稿态会造成 session 与 published version 脱节。

### Pattern 4: Lifecycle-aware authoring visibility
- **What:** voting plugin only appears in authoring when school-scoped install + enable + compatibility posture is green.
- **Why:** 这与 built-in template resolution 的既有策略一致，也能减少“课上才发现插件不可用”的风险。

## Anti-Patterns to Avoid

- **新增第四种 core step type**：会把 Phase 56 扩成 editor/classroom/schema 全链重构。
- **把 voting config 直接塞进 `lessonStep.payloadJson`**：违反 Phase 45 的 extension-table 决策。
- **只在 plugin sidebar 里暂存 config，不进 publish snapshot**：课堂运行时会回读草稿态或丢失配置。
- **只做模板插入，不做 publish preflight**：这样课堂投票仍然只是 editor demo，不是正式样板能力。

## Suggested Plan Split

1. **56-01**: 定义 voting plugin authoring contract 与 teacher-facing config surface。
2. **56-02**: 把 voting plugin config 接入 publish preflight、compatibility gate 与 snapshot freeze。
3. **56-03**: 补 focused proof / regression gate，锁定 phase boundary。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| 1 | 课堂投票样板可在不新增 core step type 的前提下完成 authoring integration。 | Recommended Approach | 如果错误，会导致 Phase 56 scope 扩大到 lesson/classroom schema 主链重构。 |

## Sources

### Primary (HIGH confidence)
- `src/lib/dto/lesson-authoring.ts` — 核心 step payload / readiness / publish DTO 约束。
- `src/lib/dal/lesson-authoring.ts` — editor DTO、publish readiness、publish snapshot freeze。
- `src/actions/lesson-authoring-actions.ts` — authoring/publish Server Action 写路径。
- `src/components/authoring/lesson-authoring-workspace.tsx` — built-in template injection 和现有 teacher editor surface。
- `src/components/authoring/lesson-step-editor.tsx` — 当前 step editor 的可编辑边界。
- `src/app/(teacher)/teacher/editor/page.tsx` — `lesson.sidebar` plugin slot 与 built-in template loading。
- `src/lib/dal/plugins.ts` — built-in teaching template resolution。
- `src/lib/dal/plugin-data.ts` — plugin extension table DAL seam。
- `.planning/phases/45-extension-and-plugin-owned-schema-patterns/45-01-SUMMARY.md` — extension-table pattern freeze。
- `.planning/research/ARCHITECTURE.md` — v3.1 authoritative write path 与 sample chain anchor。
- `.planning/research/PITFALLS.md` — plugin-first 不能只做框架建设的风险提醒。

---

*Phase: 56-Voting Plugin Contract & Authoring Integration*
*Research completed: 2026-05-24*
