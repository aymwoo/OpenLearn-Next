# Phase 69: Interactive Single-Choice Quiz Sample Plugin - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

以单选互动答题样板，用与第三方完全相同的受治理路径打通「老师配置一道单选题 -> 学生在课堂运行链路作答 -> 作答经 append-only + isLatest 写入插件自有结构表」。

本 phase 只交付 QUIZ-01 / QUIZ-02 / QUIZ-03：老师能配置单题单选、学生能在课堂中提交答案、样板插件全程复用 v4.0 的声明式数据模型和受治理数据访问，不允许 built-in 后门。

固定边界（来自 ROADMAP / REQUIREMENTS / Phase 67 / 68，不在本 phase 重新讨论）：
- 运行时零 DDL，插件自有表只能来自 compile-time `dataModel` + checked-in migration。
- 所有插件数据动作走 Phase 68 的 `dispatchPluginDataAccess` / Command Bus / governed read-verbs，`schoolId` 只由 session 派生。
- 写入语义保持 append-only + `isLatest`，SQLite + DAL 仍是唯一 durable truth。
- 不做：题目统计与课后复盘（Phase 70）、marketplace install/upgrade/uninstall 治理（Phase 71）、端到端 close gate（Phase 72）、多题型/游戏化/实时大屏。

</domain>

<decisions>
## Implementation Decisions

### 配置真相源与冻结时机
- **D-01:** 老师在备课阶段继续通过现有 lesson step / plugin extension 路径编辑题目；**不**在备课阶段直接写 `plugin_owned_quiz_questions`。
- **D-02:** 真正的课堂题目在**每次开课时按 `classroomSession` 冻结**，已开课堂不受后续改题影响；不采用“发布即全局冻结”或“始终共享最新配置”。
- **D-03:** 开课冻结时，`plugin_owned_quiz_questions` 必须保存**完整题面快照**：题干、启用选项文本、正确答案都进入插件自有结构表，不能继续回读 lesson/plugin extension 才拿到选项文本。
- **D-04:** 为满足 D-03，research/planning 必须把当前 `plugin_owned_quiz_questions` 仅有 `prompt` / `correctOption` 的结构扩成能承载 A-D 选项文本的结构化字段；不要引入双真相源，也不要为 Phase 69 拆额外 options 子表。

### 选项数量与作者侧校验
- **D-05:** 单选样板首发允许老师配置 **2 到 4 个选项**；不固定死为 4 项，也不收窄成 3 项。
- **D-06:** 底层仍沿用 **A-D 四个槽位**；当老师只配 2 或 3 个选项时，未使用槽位为空并视为禁用，前后端都不展示、不可作答。
- **D-07:** 作者侧硬性校验至少包括：题干非空、至少 2 个非空选项、正确答案必须落在已启用选项内。不要把坏配置延后到 publish / launch 才拦。

### 重复作答与 latest 口径
- **D-08:** 学生在题目仍开放时**允许改答**，作答历史 append-only 保留，当前有效答案以 `isLatest` 为准。
- **D-09:** 改答权限在**题目关闭或课堂切走该环节**时结束；不延长到整节课结束，也不新增短时 grace window 配置。
- **D-10:** 后续统计口径从 Phase 69 起就固定为：**每个学生每题只按 latest 一票计数**。历史 attempts 只用于审计与回溯，不进入分母膨胀。

### 课堂交互形态
- **D-11:** Phase 69 不走“复用旧课堂投票壳子，仅替换真相源”；而是采用**独立插件 UI**。
- **D-12:** 这里的独立 UI 指：老师端配置表单、学生端作答视图都由 quiz sample plugin 自己定义，但**仍嵌在现有 authoring 页面壳和 classroom/player 容器内**，不重写整页框架。
- **D-13:** 老师侧体验要让人明确感知这是**插件专属配置卡**，不是伪装成普通 quiz step 编辑器。
- **D-14:** 学生侧体验应更像**正式答题卡**，而不是即时投票；要强化“这是有标准答案的课堂题”而非 polling。

### the agent's Discretion
- 独立插件 UI 的具体组件拆分、文件落点、状态管理方式由 planner / executor 自定，只要满足 D-11 至 D-14，且继续复用现有页面壳。
- A-D 选项文本落库的具体 schema 形状（例如 `optionAText`...`optionDText` 或等价的固定槽位列名）由 research / planner 决定，只要保持单表结构化、无第二真相源、无 runtime DDL。
- launch 时把 lesson/plugin extension 配置冻结进 `plugin_owned_quiz_questions` 的具体接缝（publish preflight、classroom launch、runtime bootstrapping 中哪一层落库）由 planner 结合现有课堂启动链路决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 里程碑契约
- `.planning/ROADMAP.md` — Phase 69 goal, success criteria, phase dependency, and pitfall notes.
- `.planning/REQUIREMENTS.md` — QUIZ-01, QUIZ-02, QUIZ-03 requirement text and current v4.0 scope boundaries.
- `.planning/PROJECT.md` — v4.0 milestone goal, red lines, and project-wide constraints.

### 上游 phase 决策
- `.planning/phases/67-declarative-plugin-owned-data-model-migration-proof/67-CONTEXT.md` — compile-time plugin-owned schema, zero-DDL posture, and generated-table contract.
- `.planning/phases/68-governed-declarative-data-access-verbs/68-CONTEXT.md` — governed data-access facade, append-only / `isLatest`, and audit-visible write path.

### 样板插件与生成产物
- `plugins/quiz-sample/data-model.ts` — current quiz sample plugin data model source of truth.
- `src/db/schema/generated/plugin-owned/quiz.ts` — generated `plugin_owned_quiz_questions` / `plugin_owned_quiz_responses` schema consumed by Phase 69.
- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — current allowlist / insertable columns / group-by columns for quiz owned tables.

### 既有实现接缝
- `src/features/platform-core/plugin-data-access/facade.ts` — the single governed entrypoint for plugin-owned reads/writes.
- `src/features/platform-core/commands/handlers/plugin-data.ts` — append-only write handler and `isLatest` semantics.
- `src/lib/dal/lesson-authoring.ts` — existing authoring save path, current voting/quiz shell handling, and lesson-step persistence seams.
- `src/actions/lesson-authoring-actions.ts` — teacher-side authoring server actions and current voting config action boundary.
- `src/actions/lesson-agent-actions.ts` — recent pattern for feature-gated, server-derived action boundaries.
- `src/components/authoring/lesson-authoring-workspace.tsx` — existing teacher authoring shell that the plugin-specific config UI should live inside.
- `src/lib/dal/classroom.ts` — classroom runtime DTO assembly and current voting-runtime patterns that Phase 69 may borrow while replacing the interaction UI.
- `src/actions/plugin-actions.ts` — plugin lifecycle/governance action patterns already established in the project.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `plugins/quiz-sample/data-model.ts`: 已有样板插件声明源，可继续作为 Phase 69 的 schema 单一真相源，只需按 D-03 / D-04 扩充题面字段。
- `src/features/platform-core/plugin-data-access/facade.ts`: 已有受治理五动词单入口，Phase 69 的配置冻结与学生作答都应经它或其写 producer 进入 plugin-owned 表。
- `src/features/platform-core/commands/handlers/plugin-data.ts`: 已落地 append-only + `attemptNo` + `isLatest` 写语义，正好承接“允许改答、latest 生效”。
- `src/components/authoring/lesson-authoring-workspace.tsx`: 已有 teacher authoring page shell，可承载新的插件专属配置卡，而不必重写外层页面框架。
- `src/lib/dal/classroom.ts`: 已有课堂 runtime / voting contract 组织方式，可复用其课堂 session 与 step/runtime 组装思路。

### Established Patterns
- UI 不直连 DB，必须经 Server Actions + DAL / command facade。
- 插件数据写入必须经受治理路径，不能走 core 表，也不能回到 JSON/KV 袋子真相源。
- 课堂相关数据倾向按 session 冻结 authoritative snapshot；这与用户选择的“每次开课冻结”一致。
- 项目已经有 append-only latest 模式（core submissions 与 Phase 68 plugin-owned writes），Phase 69 不应发明另一套重复作答规则。

### Integration Points
- 老师侧：现有 lesson authoring page shell 内嵌 quiz sample plugin 专属配置卡，保存时仍先写 lesson/plugin extension 正式配置。
- 开课侧：在 classroom launch / runtime bootstrap 的权威接缝上，把老师配置冻结成 `plugin_owned_quiz_questions` session snapshot。
- 学生侧：在现有 classroom/player 容器内挂入 quiz sample plugin 的独立答题卡视图，提交走受治理写路径落 `plugin_owned_quiz_responses`。
- 后续 Phase 70 统计直接读取 `plugin_owned_quiz_questions` + `plugin_owned_quiz_responses`，不再回头拼 lesson/plugin extension 配置。

</code_context>

<specifics>
## Specific Ideas

- 老师平时仍在熟悉的 authoring 页面里工作，但看到的应是**明显的插件专属配置卡**，而不是普通 quiz step 的轻微变体。
- 学生作答面希望更像**正式答题卡**，而不是课堂投票；这会影响按钮文案、视觉节奏、答案确认感。
- 单选题首发口径固定为 **2-4 个选项**，底层仍按 A-D 槽位承载，未使用槽位空置并禁用。
- 课堂数据口径固定为：题目按 session 冻结，学生可在开放窗口内改答，统计只看 latest 一票。

</specifics>

<deferred>
## Deferred Ideas

- 题目统计与课后复盘展示留到 **Phase 70**，Phase 69 只锁定 future stats 必须依赖 latest 口径。
- install / upgrade / uninstall / active-session blocking 等 marketplace 生命周期治理留到 **Phase 71**。
- 端到端 close gate (`verify:phase`) 串起声明 -> 配置 -> 作答 -> 统计 -> 生命周期留到 **Phase 72**。
- 多题型、游戏化、实时大屏、AI 出题等增强能力仍属于 future phase，不并入当前样板闭环。

None of the above changes Phase 69 scope — discussion stayed within the current phase boundary.

</deferred>

---

*Phase: 69-interactive-single-choice-quiz-sample-plugin*
*Context gathered: 2026-06-03*
