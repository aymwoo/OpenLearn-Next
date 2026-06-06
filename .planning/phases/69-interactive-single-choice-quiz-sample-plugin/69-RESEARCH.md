# Phase 69: Interactive Single-Choice Quiz Sample Plugin - Research

**Researched:** 2026-06-03
**Domain:** Built-in sample quiz plugin authoring, classroom-session freeze, governed append-only answer persistence
**Confidence:** HIGH (phase boundary, current code seams, schema baseline, and verification stack all inspected in-repo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (备课配置真相源):** 老师继续通过现有 `lesson step + plugin step extension` 路径编辑单选题；备课期**不**直接写 `plugin_owned_quiz_questions`。
- **D-02 (冻结时机):** authoritative question snapshot 在**每次开课**时随 `classroomSession` 冻结；已开课堂不受后续改题影响。
- **D-03 (冻结内容):** 冻结时必须把题干、启用选项文本、正确答案全部写入 `plugin_owned_quiz_questions`，Phase 70 不再回读 lesson/plugin extension 补题面。
- **D-04 (schema 方向):** 当前 `plugin_owned_quiz_questions` 只有 `prompt` + `correctOption`，Phase 69 必须扩成单表结构化 A-D 选项文本槽位；**不**拆第二张 options 表、**不**保留双真相源。
- **D-05 (选项数量):** 老师可配置 2 到 4 个选项。
- **D-06 (槽位表达):** 底层继续沿用 A-D 固定槽位；未启用槽位为空并禁用，不展示、不可作答。
- **D-07 (作者侧校验):** 保存前即拦题干为空、有效选项不足 2 个、正确答案未命中启用选项；不推迟到 publish / launch。
- **D-08 (重复作答):** 学生在题目开放时允许改答；历史 append-only 保留，当前有效答案以 `isLatest` 为准。
- **D-09 (改答截止):** 题目关闭或课堂切走该环节后停止改答；不新增 grace window。
- **D-10 (统计口径前置锁定):** 后续统计每个学生每题只按 latest 一票；历史 attempts 仅用于审计与回溯。
- **D-11 (交互形态):** 不复用旧课堂投票壳子做薄替换；要交付 quiz sample plugin 的独立 UI。
- **D-12 (壳层边界):** 独立 UI 只指老师配置卡、学生答题卡独立；仍嵌在现有 authoring 页面壳和 classroom/player 容器内。
- **D-13 (老师感受):** 老师应明确感知这是插件专属配置卡，不是普通 quiz step 轻改版。
- **D-14 (学生感受):** 学生端应像正式答题卡，而不是即时投票。

### Agent's Discretion
- A-D 文本字段的具体列名可由 planner 决定，但必须保持单表、结构化、compile-time schema。
- 开课冻结是落在 `launchClassroomSession` 内同步完成，还是抽 helper 供 launch 调用，由 planner 决定；前提是 authoritative snapshot 与 session 一起建立。
- quiz sample plugin 采用“built-in plugin registration + plugin step extension + governed data facade”的既有宿主模式，不需要凭空发明新的插件安装系统。

### Deferred Ideas (OUT OF SCOPE)
- 统计分布、正确率、课后复盘 UI：Phase 70。
- marketplace install/upgrade/uninstall 治理：Phase 71。
- 端到端 close gate：Phase 72。
- 多题型、游戏化、实时结果大屏、AI 出题：未来 phase。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUIZ-01 | 老师能通过样板插件配置一道单选互动答题（题干 + 选项 + 正确答案），配置经声明式受治理路径持久化 | Pattern 1（沿用 plugin step extension authoring）+ Pattern 2（独立插件配置卡替换 voting authoring UI）+ Pattern 6（built-in template / plugin registration compatibility） |
| QUIZ-02 | 学生能在课堂运行链路中提交作答，作答记录经受治理动词写入插件自有结构表（append-only / isLatest） | Pattern 3（launch-time question freeze）+ Pattern 4（governed answer submit via `dispatchPluginDataAccess`）+ Pattern 5（teacher open/close semantics mapped from existing voting/runtime control） |
| QUIZ-03 | 样板插件完全复用 v4.0 声明式数据模型 + 受治理访问 + 生命周期，不引入绕过治理的后门或 built-in 特例 | Architectural Responsibility Map + Pattern 6（reuse built-in plugin registration/governance path） + What NOT to Build |
</phase_requirements>

## Summary

Phase 69 不是“给现有 quiz step 补一条写表逻辑”，而是把现有宿主里已经成熟的三条链路真正接起来：

1. **老师侧**：沿用 `saveVotingLessonStepConfig` 的 lesson step + plugin step extension 保存模式，但把 `classroomVoting` 的内置配置卡替换为 quiz sample plugin 的专属配置卡，并把 step payload 从“投票 shell”切到“正式单选题 shell”。
2. **开课侧**：`launchClassroomSession` 目前只校验 built-in voting plugin 是否可运行，然后直接创建 session；它**还没有**把 plugin-owned quiz question snapshot 冻结到 `plugin_owned_quiz_questions`。Phase 69 需要把这一步补进 launch 事务或其紧邻 helper 中，使 session 创建与题目快照建立成为同一 authoritative 边界。
3. **学生侧**：当前 quiz submit 有两条路径。普通 `QuizStepCard` 走 core `submitQuizAttemptAction`/`quizAttempts`；runtime voting 走 runtime host + `recordRuntimeClassroomEvidence`/`recordRuntimeQuizAttempt`。Phase 69 的样板插件必须新增自己的独立答题卡，并在课堂提交时走 **Phase 68 的 `dispatchPluginDataAccess`** 把作答 append-only + `isLatest` 写入 `plugin_owned_quiz_responses`，而不是继续写 core `quizAttempts`。

核心结论：

- **authoring true source** 仍是 lesson step + plugin step extension，不提前创造 session-scoped question rows。
- **durable runtime truth** 从开课后起切换为 `plugin_owned_quiz_questions` + `plugin_owned_quiz_responses`；这两张表成为 quiz sample plugin 的唯一持久真相源。
- **plugin governance** 不需要新造系统；仓库已经有 built-in plugin manifest/registration/governance 路径，Phase 69 只需要给 quiz sample plugin 补进这一套，而不是直接 hardcode 一个“伪插件”。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 作者侧配置表单与保存 | `src/components/authoring/*` + `src/actions/lesson-authoring-actions.ts` | `src/lib/dal/lesson-authoring.ts` | UI 仍在 authoring shell 内；持久化必须经 Server Action + DAL，保持现有 lesson/step revision 规则 |
| 备课配置 durable truth | lesson step payload + `pluginLessonStepExtensions` | — | 符合 D-01；开课前不产生 session-scoped question snapshot |
| 开课冻结 question snapshot | `src/lib/dal/classroom.ts` launch path | Phase 68 `dispatchPluginDataAccess` write facade | authoritative snapshot 必须跟随 `classroomSession` 创建，之后不再回读备课配置 |
| 学生提交答案 durable truth | `dispatchPluginDataAccess` → Command Bus → `plugin_owned_quiz_responses` | — | Phase 68 已提供 append-only/isLatest 受治理写路径；不能再走 core `quizAttempts` |
| 课堂开放/关闭控制 | `classroom-control-panel.tsx` / runtime teacher control / classroom evidence | plugin quiz DTO on classroom snapshot | open/close 语义已有 voting round 模式，Phase 69 只需要把 quiz sample plugin 接进去 |
| 插件治理 / 生命周期 / built-in 身份 | `pluginRegistrations` + `PluginManifestSchema` + governance projection | `src/lib/dal/plugins.ts` | QUIZ-03 要求样板无后门，故必须走既有 built-in plugin registration compatibility path |

## Verified Codebase Facts

### Fact 1: quiz sample data model 目前只够写“题干 + 正确答案”，不够支撑 session 快照
- `plugins/quiz-sample/data-model.ts` 当前 `plugin_owned_quiz_questions` 只有 `schoolId / classroomSession / question / prompt / correctOption`。
- `drizzle/0005_lean_sage.sql` 已建 `plugin_owned_quiz_questions`；`drizzle/0006_worried_wallow.sql` 只升级了 responses 的 `attemptNo / isLatest`，questions 表还没扩列。
- 结论：Phase 69 必须修改 `quizDataModel`、重跑 `plugin:compile`、生成新的 question table schema/migration/backfill plan，才能满足 D-03/D-04。

### Fact 2: 当前已存在“老师配置 + plugin step extension”成熟写法，可直接类比
- `saveVotingLessonStepConfig` 在同一事务里更新 `lessonSteps.payloadJson`，同时 `upsertPluginStepExtensionWithTx(...)` 写 `pluginLessonStepExtensions`。
- 该函数还执行 optimistic concurrency（`expectedUpdatedAt`）和 lesson revision bump。
- 结论：QUIZ-01 最小风险路径是复用这条 authoring persistence seam，新增 quiz sample plugin 的 config schema / DTO / UI，而不是发明新的 lesson authoring 存储模型。

### Fact 3: 当前 authoring UI 强耦合 `classroomVoting`，但壳层可复用
- `lesson-step-editor.tsx` 已有 voting 特判：`isClassroomVotingStep`、`ClassroomVotingAuthoringConfigSchema`、专用 validation、专用保存 action。
- `lesson-authoring-workspace.tsx` 和 step editor 外层布局已经提供 modal / 左右栏 / 预览壳。
- 结论：Phase 69 的插件专属配置卡应当复用页面壳和保存机制，但需要从 `classroomVoting` 特判抽象/扩展到 quiz sample plugin，而不是继续把 quiz sample UI 塞进 voting 分支。

### Fact 4: launch 流程已具备“校验 plugin runtime readiness”的骨架，但尚未冻结 plugin-owned question snapshot
- `launchClassroomSession` 会解析 published snapshot steps，并在遇到 voting contract 时检查 plugin 是否 enabled / kill-switch off / manifest v2 contract compatible。
- 事务内当前只创建 `classroomSessions` / `classroomParticipants` / `classroomEvents`；没有向 `plugin_owned_quiz_questions` 写任何 session-scoped question rows。
- 结论：开课冻结的最佳接缝就在 `launchClassroomSession` 或其下游 helper。因为这里同时持有 teacher scope、published snapshot、classroomSession id、step 列表和 plugin registry readiness。

### Fact 5: runtime submit 现有 core quiz path 与 plugin-owned governed path尚未接通
- `QuizStepCard` 仍调用 `submitQuizAttemptAction`，结果写 core `quizAttempts`。
- runtime host 的 `submitRuntimeState` 对 quiz step 也只会桥接到 `recordRuntimeQuizAttempt`（core 表）和 `classroomEvidence`。
- `dispatchPluginDataAccess` 已经能对 `plugin_owned_quiz_responses` 做 `insert/upsert/getByIndex/count/aggregate`，且写路径是 append-only/isLatest。
- 结论：Phase 69 需要新增 quiz sample plugin submit boundary，不能继续复用 core quiz submit，否则 QUIZ-02/QUIZ-03 都不成立。

### Fact 6: 教师控课 open/close 语义已有现成模式
- `recordClassroomVotingRoundControl` 与 runtime `recordTeacherControlEvent` 都能写 `voting-round-opened` / `voting-round-closed` artifact。
- `classroom-control-panel.tsx` 已有 `start-voting-round` / `end-voting-round` socket + fallback action 模式。
- 结论：Phase 69 不需要重新发明 open/close 控制协议；只需让 quiz sample plugin 的课堂 DTO 能消费同样的 round state，并把学生端“可改答/已关闭”行为映射到这套状态。

### Fact 7: built-in plugin 宿主形态真实存在，quiz sample 目前缺的是 manifest/registration 对接
- `PluginManifestSchema`、`installOrReconcilePlugin`、`listBuiltInTeachingStepTemplates` 等路径已经支撑 built-in teaching step 插件。
- `BUILT_IN_TEACHING_STEP_DEFINITIONS` 里目前有 `classroomVoting`、`inClassQuiz` 等 built-in definitions，但没有 quiz sample plugin 对应定义。
- `plugins/quiz-sample/` 目录当前只有 `data-model.ts`，没有 manifest、template definition、seed/bootstrap hook、UI runtime registration 文件。
- 结论：Phase 69 必须显式补齐 quiz sample plugin 的 built-in registration / template / compatibility 接缝，否则所谓“样板插件”只是数据模型存在，宿主里不可达。

## Recommended Project Structure

```
plugins/quiz-sample/
├── data-model.ts                        # 现有，需扩 question A-D 文本列
└── (manifest/template metadata or mapped built-in definition via DTO layer)

src/lib/dto/
├── lesson-authoring.ts                  # quiz sample authoring config / frozen contract DTO
└── resource-ai.ts                       # built-in teaching step definition / template metadata if quiz sample is exposed like built-in step

src/lib/dal/
├── lesson-authoring.ts                  # 保存 quiz sample step config + publish readiness + editor hydration
├── classroom.ts                         # launch freeze + classroom snapshot DTO + open/close read model
└── plugin-data.ts                       # 继续承载 plugin step extension 持久化

src/actions/
├── lesson-authoring-actions.ts          # save quiz sample config server action
└── classroom-actions.ts                 # teacher control / student submit server actions if not going through runtime host

src/components/
├── authoring/lesson-step-editor.tsx     # quiz sample config card entry
├── classroom/classroom-control-panel.tsx# quiz sample open/close control surface
└── learning/                            # quiz sample answer card / runtime rendering

scripts/
└── verify-phase69-*.ts                  # launch freeze + governed writes + no-core-backdoor close gate
```

## Architecture Patterns

### Pattern 1: Reuse plugin step extension as authoring durable truth
**Source:** `src/lib/dal/lesson-authoring.ts:1064-1137`, `src/lib/dal/plugin-data.ts:183-219`

**What:** Save quiz sample config by updating the lesson step shell and the plugin step extension in one transaction.

**Why:** This preserves optimistic concurrency, lesson revision bump, existing authoring DTO hydration, and D-01's “do not create session-scoped question rows before launch”.

### Pattern 2: Replace voting-specific editor branch with plugin-specific configuration card inside same shell
**Source:** `src/components/authoring/lesson-step-editor.tsx:80-151, 184-214, 245-303`

**What:** Keep the existing editor shell, but split out a quiz-sample-specific authoring sub-tree instead of overloading the current `classroomVoting` branch.

**Why:** D-11 to D-14 require visibly plugin-specific UX while keeping current authoring page structure.

### Pattern 3: Freeze session-scoped plugin-owned question rows during launch
**Source:** `src/lib/dal/classroom.ts:3692-3807`

**What:** After parsing published snapshot steps and validating plugin readiness, write one `plugin_owned_quiz_questions` row per quiz sample step into the current `classroomSession` scope before returning the launched snapshot.

**Why:** launch already has all required data and is the authoritative session creation boundary. Freezing later in runtime bootstrapping risks delayed/missing durable truth.

### Pattern 4: Submit answers through Phase 68 facade, not core quiz tables
**Source:** `src/features/platform-core/plugin-data-access/facade.ts`, `src/features/platform-core/commands/handlers/plugin-data.ts:133-209`

**What:** Student answer submit should call `dispatchPluginDataAccess({ verb: "upsert", ... })` against `plugin_owned_quiz_responses` with session-derived scope, letting Phase 68 enforce governance and append-only/isLatest semantics.

**Why:** QUIZ-02 and QUIZ-03 explicitly forbid built-in backdoors and core-table writes.

### Pattern 5: Map open/close semantics onto existing voting-round artifacts
**Source:** `src/lib/dal/classroom.ts:1311-1339`, `src/features/runtime-platform/classroom/runtime-session.ts:1145-1196`

**What:** Reuse `voting-round-opened` / `voting-round-closed` artifacts and teacher control commands to determine whether quiz sample answers are editable.

**Why:** Existing classroom control already handles socket fallback, timeline artifacts, and round state recovery. Phase 69 only needs a plugin-specific presentation and submit gate.

### Pattern 6: Put quiz sample on the existing built-in plugin governance path
**Source:** `src/lib/dto/resource-ai.ts:547-589, 671-710`, `src/lib/dal/plugins.ts:1287-1366`

**What:** Model quiz sample as a real built-in plugin-compatible teaching step, with manifest/governance metadata and template discoverability comparable to current built-ins.

**Why:** Otherwise the sample plugin remains an unreachable schema artifact and fails QUIZ-03's “same path as third-party plugin” constraint.

## What NOT to Build

| Avoid | Why | Use Instead |
|------|-----|-------------|
| 直接把学生提交继续写 core `quizAttempts` | 违反 QUIZ-02 / QUIZ-03；形成 built-in backdoor | `dispatchPluginDataAccess` → `plugin_owned_quiz_responses` |
| 备课期双写 step extension 和 `plugin_owned_quiz_questions` | 形成双真相源，且 session 尚不存在 | 只写 lesson step + plugin extension；launch 时冻结 |
| 为选项文本新增独立 options 子表 | 超出 D-04，增加 join / migration 成本 | 在 `plugin_owned_quiz_questions` 单表增加 A-D 文本列 |
| 把 quiz sample 当成 `classroomVoting` 的视觉小改版 | 违背 D-11 至 D-14 | 复用壳层，重做 plugin-specific config/answer cards |
| 发明新的 plugin lifecycle / installation path | 仓库已有 built-in governance / template 路径 | 补齐 quiz sample 对既有 built-in/plugin registration 宿主的接入 |
| 在 runtime host 里偷偷 special-case core DB 写入 | 绕过 Phase 68 治理、审计不可见 | 明确的 server action / runtime submit bridge 调 facade |

## Validation Targets

- Authoring save blocks invalid configs before persistence.
- `launchClassroomSession` creates question snapshots for quiz sample steps and does not require later lazy freeze.
- Student submit writes `plugin_owned_quiz_responses` with append-only + `isLatest`, and no core `quizAttempts` row is created by the quiz sample path.
- Governance audit visibility remains intact through `dispatchPluginDataAccess` and plugin lifecycle checks.
- Teacher open/close controls immediately switch student card between editable and read-only states.

## Sources

- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-CONTEXT.md` — phase boundary and locked decisions. Confidence: HIGH.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-UI-SPEC.md` — UI contract for teacher/student surfaces. Confidence: HIGH.
- `.planning/ROADMAP.md` — Phase 69 goal and success criteria. Confidence: HIGH.
- `.planning/REQUIREMENTS.md` — QUIZ-01 / QUIZ-02 / QUIZ-03 requirement text. Confidence: HIGH.
- `plugins/quiz-sample/data-model.ts` — current quiz plugin-owned schema source of truth. Confidence: HIGH.
- `drizzle/0005_lean_sage.sql`, `drizzle/0006_worried_wallow.sql` — current migration baseline for quiz owned tables. Confidence: HIGH.
- `src/features/platform-core/plugin-data-access/facade.ts` — governed single public data-access entry. Confidence: HIGH.
- `src/features/platform-core/commands/handlers/plugin-data.ts` — append-only / isLatest write behavior. Confidence: HIGH.
- `src/lib/dal/lesson-authoring.ts` — voting authoring save path, publish compatibility, editor hydration seams. Confidence: HIGH.
- `src/actions/lesson-authoring-actions.ts` — voting config server action boundary. Confidence: HIGH.
- `src/components/authoring/lesson-step-editor.tsx` — current voting-specific authoring UI branch. Confidence: HIGH.
- `src/lib/dal/classroom.ts` — launch flow, classroom snapshot assembly, voting round control. Confidence: HIGH.
- `src/features/runtime-platform/classroom/runtime-session.ts` — runtime submit/control bridge and current quiz/voting persistence behavior. Confidence: HIGH.
- `src/components/classroom/classroom-control-panel.tsx` — teacher control surface and voting open/close interaction. Confidence: HIGH.
- `src/components/learning/quiz-step-card.tsx` — current student quiz card still targeting core `quizAttempts`. Confidence: HIGH.
- `src/lib/dto/resource-ai.ts`, `src/lib/dal/plugins.ts` — built-in teaching step/plugin governance host path. Confidence: HIGH.
