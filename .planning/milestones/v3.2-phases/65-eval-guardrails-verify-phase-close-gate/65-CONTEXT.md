# Phase 65: Eval, Guardrails & verify:phase Close Gate - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

为 AI 起草链路（Phase 61 facade → 62 typed tool → 63 draft persist → 64 review/accept-publish）建立质量与闭环闸门，收口里程碑 v3.2「AI LessonAgent 起草闭环」。三件交付物：

1. **可重复 eval（EVAL-01）：** 一组 fixture 驱动的 Vitest eval 套件，对 `LessonAgent` / `draftLessonStepTool` 的起草输出在 **schema 合法性**（`lessonStepPayloadSchema`）与**基本教学结构**（content/task/quiz 必备字段、结构不变量）上达标做确定性回归。用 mock model 回放固定输出，进 CI、可重复、无网络。
2. **越界 guardrails（EVAL-02）：** 在 `draftLessonStepTool` 的 `execute` 内、生成之后新增**专门 guardrail 层**，在 `lessonStepPayloadSchema` 之上叠加越界检查（非法 step 类型、超长字段、跨字段非法如 `correctOptionIndex` 越界、注入既有约束禁止内容）。越界输出被**拦截**（抛出 typed rejection，不落库、不返回给上层）并经**事件总线记录**（新增 `lesson.draft.rejected` past-tense 事件，summary-only，无 `*Json` 快照，复用 v3.0 event infra，**不新建表**）。
3. **`verify:phase` close gate（EVAL-03）：** 新增 `scripts/verify-phase65-*.ts` + `verify:phase` npm script，作为**聚合编排器**对 v3.2（Phase 61–65）AI 起草链路做端到端回归——运行 build + 针对性测试子集 + EVAL-01 eval 套件 + 61–65 静态契约检查，任一失败即非零退出。作为里程碑 close 的**单一权威闸门**。

**本 phase 不做：** 多 Agent（Homework/Data/Tutor/Parent，deferred）、RAG 增强起草（deferred）、plugin 触达 AI（deferred）、起草质量的人工/LLM-as-judge 主观评分（本 phase 只做确定性 schema/结构 eval）、新的 guardrail 持久化审计表（仅事件记录）、修改 Phase 61–64 已定的 facade/tool/draft/review 契约（只在其上叠加，不重做）。
</domain>

<decisions>
## Implementation Decisions

### EVAL-01 — 可重复 eval 形态
- **D-01 Fixture 驱动的 Vitest eval 套件:** 以 co-located `*.eval.test.ts`（或 `src/server/ai/eval/` 下集中）实现，用 Phase 61 mock model（`src/server/ai/providers/__fixtures__/mock-model.ts`）回放一组固定 intent → 录制输出，断言 `lessonStepPayloadSchema.safeParse` 通过 + 教学结构不变量。确定性、进 `npm test`、无网络、无 provider key。**不**采用独立 tsx 脚本或 LLM-as-judge。
- **D-02 教学结构不变量集合:** eval 至少校验——content 步骤 `title`+`body` 非空；task 步骤 `prompt` 非空且 `submissionType` 合法；quiz 步骤 `options.length >= 2` 且 `correctOptionIndex`（若存在）落在 options 索引范围内；`type` ∈ {content,task,quiz}。具体不变量清单由 planner 依 `lessonStepPayloadSchema` 现状补全。
- **D-03 fixture 语料覆盖三类 step + 至少一个越界反例:** eval 语料同时承担 EVAL-01（正例达标）与 EVAL-02（反例被 guardrail 拦截）的回归输入来源，避免两套 fixture 漂移。

### EVAL-02 — guardrail 拦截点与记录
- **D-04 guardrail 层落在 tool execute 内:** 在 `src/server/ai/tools/lesson-draft.ts` 的 `execute` 中、`aiGenerateObject` 返回之后、`return step` 之前插入 guardrail 校验。保持「唯一生成通道」权威性——所有经 tool 产出的草稿都必过 guardrail。**不**放在 agent 层或 Server Action/command handler 层（那些是下游消费，越界应在生成边界即被拦）。
- **D-05 guardrail 在 schema 之上叠加越界检查:** `lessonStepPayloadSchema` 已保证基础合法性；guardrail 追加 schema 难以表达的约束——字段长度上限（body/prompt/question/option 超长）、跨字段（`correctOptionIndex < options.length`）、禁止注入内容（既有约束禁止的标记/脚本片段）、step 类型白名单二次确认。
- **D-06 拦截 = 抛 typed rejection，不落库不返回:** 越界时抛出 typed 错误（对齐 `lesson-draft.ts`/handler 既有 `throwDraftFailure` 风格），execute 不返回 step、调用链中止，草稿绝不进入 draft 持久化或返回 UI。
- **D-07 记录 = 事件总线 summary-only:** 新增 `lesson.draft.rejected` 事件（past-tense，对齐既有 `produced`/`persisted`/`accepted` 命名约定），payload 仅含 summary（lessonId、stepType、违规原因码、teacherId），**不含** step 快照 / `*Json`。复用 v3.0 event bus，不新建 SQLite 表。
- **D-11 拦截在 command 层建模为「成功的 rejected 业务结果」（reconciles D-06 × D-07 × D-53-08）:** tool `execute` 仍按 D-06 抛出 typed `DraftGuardrailRejection`（生成边界即拦，不返回 step）；但下游 `executeLessonDraftRun` 命令处理器 **catch** 该 typed rejection 后，将其解析为命令的**成功业务结果**（rejected outcome）并 emit `lesson.draft.rejected`，**不**走 `platform.command.failed` 失败路径。理由：guardrail 拦截是合法业务结果而非系统故障，故满足 D-53-08（失败路径不发 domain event）。处理器须以 `instanceof DraftGuardrailRejection` 区分 guardrail 拦截（→ rejected 成功结果 + 事件）与真实系统错误（→ `platform.command.failed`，无 domain event）。

### EVAL-03 — verify:phase close gate
- **D-08 聚合编排器脚本:** 新增 `scripts/verify-phase65-<slug>.ts`，对齐既有 `scripts/verify-phaseN-*.ts` 风格（参照 `verify-phase54-ai-contracts.ts` 的 `read`/`listFiles`/`StaticCheck` 工具函数），编排运行：(a) `npm run build`，(b) v3.2 针对性测试子集（AI tool/agent/provider/draft/review），(c) EVAL-01 eval 套件，(d) Phase 61–65 静态契约检查（关键文件/导出/约束存在性），任一失败 `process.exit(1)`。
- **D-09 注册为 `verify:phase` npm script:** 在 `package.json` 同时加 `verify:phase65`（指向脚本）与权威别名 `verify:phase`（= 当前里程碑 close gate 单一入口）。`verify:phase` 是里程碑 close 的**唯一权威闸门**，CI 与人工 close 都走它。
- **D-10 静态契约检查覆盖 v3.2 不可越界约束:** close gate 静态校验至少断言——tool `inputSchema` 不含 `teacherId`（闭包注入）、tool 只经 `aiGenerateObject` 生成（不直连 `ai` 的 generateObject/Text）、无 `eval()`/DB client/provider key import、guardrail 层存在、`lesson.draft.rejected` 事件契约存在。

### Claude's Discretion
- eval 套件落点（co-located `lesson-draft.eval.test.ts` vs 集中 `src/server/ai/eval/`）—— planner 依 TESTING.md 既有约定定。
- guardrail 实现形态（独立 `guardLessonStepPayload()` 纯函数 vs inline 校验块）—— planner 定；倾向独立纯函数便于 eval 直接单测。
- guardrail 各字段长度上限的具体数值 —— planner 依 DESIGN/教学合理性定，集中为常量。
- `lesson.draft.rejected` 违规原因码枚举值集合 —— planner 依 guardrail 检查项定。
- `verify-phase65` slug 命名 —— planner 对齐既有脚本命名（如 `verify-phase65-eval-close-gate.ts`）。
- close gate 中「针对性测试子集」的精确 vitest filter / 是否直接跑全量 `npm test` —— planner 权衡时长与覆盖定。
- eval 是否同时驱动 `LessonAgent`（多 step 链）还是仅 `draftLessonStepTool`（单 step）—— planner 依 N=1 单链约束定，倾向覆盖 tool + agent 入口各一。

### Folded Todos
无 —— todo.match-phase 65 零匹配。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与里程碑
- `.planning/REQUIREMENTS.md` §EVAL-01~03 原文（line 38–40）+ 覆盖矩阵（line 82–84）—— 可重复 eval / 越界 guardrails 拦截并记录 / `verify:phase` 单一权威 close gate。
- `.planning/ROADMAP.md` §Phase 65（Goal + Depends Phase 64 + 3 Success Criteria）—— 质量与闭环闸门、收口 v3.2。

### 上游 phase（必读，避免重复决策）
- `.planning/phases/62-lessonagent-typed-tool-layer/62-CONTEXT.md` —— typed tool 层结构约束（teacherId 闭包注入、边界 Zod、唯一生成通道、纯内存返回）。**guardrail 在此约束之上叠加，不重做边界。**
- `.planning/phases/63-ai-draft-chain-into-draft-lesson-version/63-CONTEXT.md` —— `lesson.draft.persist`/`produced`/`persisted` 事件与 draft 落库链路；rejection 路径是其「不落库」分支。
- `.planning/phases/64-teacher-review-accept-publish-surface/64-CONTEXT.md` —— `lesson.draft.accept`/`accepted`/`applied`/`discard`/`discarded` 事件集合（line 127–128）；close gate 端到端回归覆盖 accept→publish 链路。

### 架构与约束（项目根 AGENTS.md 内联）
- `AGENTS.md` §Technology Stack Non-Negotiable Constraints —— **No arbitrary code**（guardrail/eval 禁 `eval()`、禁动态执行）；**provider-key-server-only**（eval 用 mock model，不触真 key）；**DAL-only**（记录走 event bus，不在 UI/eval 直连 DB）；**SQLite-first cascade**（若 planner 反悔选持久化需 cascade —— 本 phase 决定不建表）。
- `AGENTS.md` §Safe Plugin —— 「Plugin actions are predefined verbs」「No arbitrary JS / eval」，guardrail 是 AI 输出侧的对应防线。

### 代码地图
- `.planning/codebase/TESTING.md` —— Vitest co-located `*.test.ts`、`import "server-only"` 首行、`vi.mock("@/db")`、`vi.clearAllMocks()` in beforeEach；eval 套件遵循同约定。
- `.planning/codebase/CONVENTIONS.md` —— Zod 边界、`server-only` 隔离、typed failure 抛错风格。

### 代码参照（写 CONTEXT 时已完成 scout）
- `src/server/ai/tools/lesson-draft.ts`（66 行）—— **guardrail 插入点**：`execute` 内 `aiGenerateObject` 返回后、`return step` 前（line 56–63）。已有 `draftStepInputSchema`（入口边界）+ `lessonStepPayloadSchema`（输出 schema）。
- `src/server/ai/tools/lesson-draft.test.ts` / `no-leak.test.ts` —— tool 既有测试模式；eval/guardrail 单测对齐。
- `src/server/ai/agents/lesson-agent.ts` + `lesson-agent.test.ts` —— agent 入口；eval 若覆盖多 step 链在此。
- `src/server/ai/providers/__fixtures__/mock-model.ts` —— **eval 回放数据源**：mock model，确定性输出，无网络。
- `src/lib/dto/lesson-authoring.ts` line 114–154 —— `contentStepPayloadSchema` / `taskStepPayloadSchema`（`options.min(2)`）/ `quizStepPayloadSchema` / `lessonStepPayloadSchema`（`discriminatedUnion("type")`）—— guardrail 越界检查的 schema 基线；注意 `correctOptionIndex` 跨字段约束 schema 未覆盖。
- `src/features/platform-core/commands/handlers/lesson-draft.ts` + `lesson-draft.events.ts` / `lesson-draft.events.test.ts` —— 既有 `lesson.draft.*` 事件契约注册位置；新增 `lesson.draft.rejected` 在此相邻注册。
- `src/features/platform-core/commands/registry.ts` —— 既有 `lesson.draft.run`/`persist`/`accept`/`discard` 命名与 dedupe 风格。
- `scripts/verify-phase54-ai-contracts.ts` —— **close gate 脚本模板**：`read()`/`listFiles()`/`StaticCheck` 工具函数、静态契约断言、非零退出模式。
- `package.json` §scripts —— 既有 `verify:phaseN` → `tsx scripts/verify-phaseN-*.ts` 模式（phases 1,3,4,5,6,11,12,15–25,54 等），无聚合 `verify:phase`；本 phase 新增 `verify:phase` 权威别名。
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`draftStepInputSchema` + `lessonStepPayloadSchema`**（`lesson-draft.ts` / `lesson-authoring.ts`）：guardrail 的基线校验，越界检查在其上做增量，不重复造轮子。
- **mock model fixtures**（`providers/__fixtures__/mock-model.ts`）：eval 确定性回放的现成数据通道。
- **`verify-phase54-ai-contracts.ts` 静态检查工具集**：`read`/`listFiles`/`StaticCheck` 可直接复制改造为 phase65 close gate 编排骨架。
- **v3.0 event bus + `lesson.draft.*` 事件契约**：rejection 记录复用，新增一个 past-tense 事件即可，无需 schema/表迁移。
- **既有 `throwDraftFailure` typed 抛错模式**（`lesson-draft.ts` handler）：guardrail 拦截抛错对齐此风格。

### Established Patterns
- **唯一生成通道权威性：** 所有草稿必经 `draftLessonStepTool.execute` → guardrail 是该通道的强制出口校验，无旁路。
- **server-only 隔离：** eval/guardrail/事件均 `import "server-only"` 首行，禁泄漏到客户端。
- **事件 summary-only：** `lesson.draft.rejected` payload 不含 `*Json` 快照，对齐 62/63/64 事件惯例。
- **No arbitrary code：** eval 与 guardrail 实现禁 `eval()`、禁动态执行、禁直连 provider key —— 这本身也是 close gate 静态断言项。
- **verify 脚本非零退出：** close gate 任一子检查失败 `process.exit(1)`，CI 可消费。

### Integration Points
- 上游：Phase 61 facade（`aiGenerateObject` + mock model）、62 tool（guardrail 宿主）、63 draft persist（rejection 的「不落库」对立分支）、64 accept→publish（close gate 端到端回归覆盖对象）。
- 本 phase：eval 套件 + tool execute 内 guardrail 层 + `lesson.draft.rejected` 事件契约 + `scripts/verify-phase65-*.ts` + `package.json` `verify:phase` 别名。
- 下游：里程碑 v3.2 close —— `verify:phase` 绿灯是 close 的单一权威前置。后续多 Agent / RAG 里程碑复用本 phase 的 eval + guardrail + close-gate 模式。
</code_context>

<specifics>
## Specific Ideas

- **eval 套件命名意向：** `src/server/ai/tools/lesson-draft.eval.test.ts`（或集中 `src/server/ai/eval/lesson-draft.eval.test.ts`），表名以 `*.eval.test.ts` 区分常规单测，便于 close gate 单独 filter。
- **guardrail 纯函数意向：** `guardLessonStepPayload(step): LessonStepPayload`（通过返回原值，越界 throw typed `DraftGuardrailRejection`），集中长度上限常量于同文件顶部。
- **越界原因码意向：** `invalid_step_type` / `field_too_long` / `quiz_correct_index_out_of_range` / `quiz_too_few_options` / `forbidden_content`，作为 `lesson.draft.rejected` payload 的 `reason` 枚举。
- **`lesson.draft.rejected` 事件意向：** payload `{ lessonId, stepType, reason, teacherId }`，并入 62/63/64 事件集合，past-tense 命名对齐 `produced`/`persisted`/`accepted`。
- **close gate 脚本命名意向：** `scripts/verify-phase65-eval-close-gate.ts`，`package.json` 加 `"verify:phase65"` + `"verify:phase": "npm run verify:phase65"`（权威别名）。
- **close gate 子步骤意向：** ① build → ② AI 链针对性 vitest → ③ EVAL-01 eval 套件 → ④ 61–65 静态契约断言；每步打印 `[PASS]/[FAIL]` label，末尾汇总非零退出。
- **静态断言意向：** 断言 `lesson-draft.ts` 不出现 `generateObject(`/`generateText(`（非经 facade）、不 `import` DB client / `process.env` provider key、含 guardrail 调用；断言 `lesson.draft.rejected` 契约注册存在。
</specifics>

<deferred>
## Deferred Ideas

- **LLM-as-judge / 主观教学质量评分**：本 phase eval 只做确定性 schema/结构校验。主观质量（讲解清晰度、难度适配）评估 deferred to future milestone。
- **guardrail 拦截的持久化审计表**：本 phase 仅事件记录（summary-only）。可查询的审计表（cascade delete）deferred —— 若未来需运营侧排查越界趋势再建。
- **多 Agent（Homework/Data/Tutor/Parent）的 eval/guardrail**：本 phase 仅 LessonAgent 单链（N=1）。其余 Agent 的质量闸门 deferred to future milestone。
- **RAG 增强起草的 eval（检索质量/引用正确性）**：RAG 尚未接入，deferred。
- **注入检测的语义级防护（prompt injection 深度检测）**：本 phase guardrail 做禁止内容标记/结构级拦截；语义级 prompt-injection 防护 deferred。
- **跨里程碑统一 `verify:milestone` 聚合**：本 phase 交付 `verify:phase` 单里程碑 close gate；跨里程碑全量回归编排 deferred。
- **eval 报告的人类可读输出 / 趋势仪表盘**：本 phase eval 仅 CI pass/fail 门禁，富报告 deferred。

无 reviewed-but-deferred todos —— cross_reference_todos 零匹配。
</deferred>

---

*Phase: 65-Eval, Guardrails & verify:phase Close Gate*
*Context gathered: 2026-06-01*
