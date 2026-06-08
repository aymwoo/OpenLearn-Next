# v4.1 ROADMAP — Multi-Question Types & Teacher Live Dashboard

**Status:** planning (started 2026-06-07)
**Milestone:** v4.1 (extends v4.0 baseline; no kernel rebuild)
**Phases:** 73–74 (2 phases, hard cap 3)
**Total Plans (planned):** 7 (73: 2 plans; 74: 5 plans)
**N (committed scope):** 2 — QUIZ-EXT-01 + QUIZ-EXT-02 bundle, both bound to `pluginKey = "quiz"`, both reusing the v4.0 single-choice quiz sample + v2.2 WebSocket-first classroom transport

## Milestone Goal

v4.1 extends the v4.0 single-choice quiz sample (`pluginKey = "quiz"`) and the v2.2 classroom WebSocket-first transport to deliver **(a)** a multi-type interactive answer data model (single/multi/true_false/fill_blank/ordering) that flows end-to-end through the same governed verbs (insert/upsert/getByIndex/count/aggregate) and same append-only/`isLatest` response schema used in v4.0, with post-class recap stats per questionType; and **(b)** a **teacher-only, read-only** live answer-flow dashboard tab inside the existing `/classroom` control room, fed by a new `quiz.answer.received` event published on the existing v2.2 `classroom-ws` transport (no new WS endpoint, no second source of truth — SQLite + DAL remain the durable truth, Redis fanout is delivery-only). v4.1 explicitly does **not** redefine the marketplace, governance, or data-access verbs; the close gate extends the v4.0 72.1 authoritative pattern to assert the new multi-type schema, the new WS event schema, the new dashboard tab, and the write-isolation posture of that tab.

## Phases

### Phase 73: Multi-Type Quiz Schema, Live WS Event & Teacher Live Dashboard

- **Goal:** 把 v4.0 `quiz` 样板的题型从「单选」扩到 5 种（`single_choice` / `multi_choice` / `true_false` / `fill_blank` / `ordering`），题型可经 D-72.1-04 append-only/`isLatest` 写入插件自有表（`plugin_owned_quiz_questions.questionType` 列 + 对应 payload 子集），并把学生作答事件经 v2.2 `classroom-ws` 通路以 `quiz.answer.received` 推送到教师端 `/classroom` 控制室的一个新增「作答实时」tab（read-only、零写 Server Action、按题聚合的选项分布 + 最近 N 条作答流水 + 填空题 top answers）。
- **Depends on:** Phase 72.1 (v4.0 close gate baseline) — reuses `dispatchPluginDataAccess` facade + Command Bus producer (write verbs) + governed read verbs + `cacheTags.quizStats(...)` cache tag + `classroom-ws` v2.2 transport contract.
- **Sub-IDs covered:**
  - **QUIZ-EXT-01-A — Schema 扩展**：`plugin_owned_quiz_questions` 新增 `questionType TEXT NOT NULL` (枚举 5 种) + 向前迁移兼容旧 `single_choice` 行。
  - **QUIZ-EXT-01-B — Data model 声明**：`src/plugins/quiz-sample/data-model.ts` 扩展 `fields` + 类型化 payload union；`src/lib/dto/plugin-data-model.ts` 与 `src/lib/dto/plugin-data-access-allowlist.ts` 同步 allowlist。
  - **QUIZ-EXT-01-C — DAL 访问**：`dispatchPluginDataAccess` 5 动词 × 5 题型 insert / getByIndex / count / aggregate 测试 (20 用例)。
  - **QUIZ-EXT-01-D — 学生端提交**：5 题型 payload 经 v4.0 append-only/`isLatest` 写入 `plugin_owned_quiz_responses`，`updateTag(cacheTags.quizStats(sessionId))` 触发 read-your-writes。
  - **QUIZ-EXT-01-E — 课后统计**：`buildQuizSampleRecapStats` 扩展：`countByOptionSet` (多选) / `countByBool` (判断) / `topAnswers` (填空) / `topOrderings` (排序) + `countByOption` (单选，复用 v4.0)，并按 `questionType` 分组渲染。
  - **QUIZ-EXT-02-A — WebSocket 事件接入**：v2.2 `classroom-ws` 新增 `quiz.answer.received` 事件（teacher-only channel），payload `{ questionId, studentId, responseType, payload, receivedAt, classroomSessionId }`，DAL 写入后由 server action 触发。
  - **QUIZ-EXT-02-B — 可选 Redis fanout**：`process.env.REDIS_URL` 存在 → 复用 v2.2 Redis fanout 作 delivery layer；不存在 → 进程内总线（与 v4.0 recap 等价 contract test）。
  - **QUIZ-EXT-02-C — 教师控制台 tab**：`/classroom` 控制室加「作答实时」tab（不创建新路由，与现有 recap / control tab 并列），访问控制 `userProfiles.role = 'teacher' && classroomSessionId 拥有者`。
  - **QUIZ-EXT-02-D — 实时视图**：按题聚合选项分布（单选/多选/判断/排序）+ 填空题 top answers + 最近 N 条作答流水（默认 N=20，可配 5/20/50），数据源 = WS 事件客户端临时聚合（下课切 v4.0 recap）。
  - **QUIZ-EXT-02-E — 只读姿势**：`grep` 校验 dashboard surface 无 `update*` / `delete*` / `grade*` Server Action 调用；写操作全部走 v4.0 command-bus 路径（D-72.1-09）。
- **Plans:**
  - **Plan 73-01 — Multi-type quiz data model + DAL + student submit + post-class stats.** Schema 迁移 (QUIZ-EXT-01-A) + data-model 声明 + allowlist (QUIZ-EXT-01-B) + 5×4 DAL 用例 (QUIZ-EXT-01-C) + 学生端 5 题型 append-only/`isLatest` 提交 (QUIZ-EXT-01-D) + `buildQuizSampleRecapStats` 5 题型扩展 (QUIZ-EXT-01-E)。Wave 1，自治，与 Phase 74 独立可跑。
  - **Plan 73-02 — WS event wiring + teacher live dashboard tab + read-only posture.** `quiz.answer.received` 事件 schema (QUIZ-EXT-02-A) + 可选 Redis fanout (QUIZ-EXT-02-B) + `/classroom` 控制室「作答实时」tab (QUIZ-EXT-02-C) + 客户端实时聚合 (QUIZ-EXT-02-D) + 写操作隔离 grep 断言 (QUIZ-EXT-02-E)。Wave 1，依赖 Plan 73-01 提供的 DAL 写入 hook 点。
- **Success criteria (3-5 observable truths, must all be true for phase completion):**
  1. 老师在 5 种题型（单选/多选/判断/填空/排序）上各能 insert 一道题，并在课后 recap 上看到对应分布（多选 `countByOptionSet`、判断 `countByBool`、填空 `topAnswers`、排序 `topOrderings`、单选 `countByOption`）。
  2. 学生在 5 种题型上反复提交 → 旧 `isLatest` 翻转为 `false`、新行 `isLatest = true`（D-72.1-04 跨 5 题型全部成立），并触发 `updateTag(cacheTags.quizStats(sessionId))` 强制 read-your-writes。
  3. 老师打开 `/classroom` 控制室「作答实时」tab，30 个并发学生提交 → 30 条 `quiz.answer.received` 事件按 `receivedAt` 顺序到达（毫秒级抖动可接受），tab 渲染按题聚合分布 + 最近 N 条作答流水。
  4. `REDIS_URL` 存在/缺失两种环境下，行为等价（contract test 覆盖）；Redis 仍是 delivery，SQLite + DAL 仍是真相源（D-72.1-15）。
  5. 「作答实时」tab 的 dashboard surface 零写操作：`grep` 校验 surface 文件不含 `update*` / `delete*` / `grade*` Server Action 调用（写操作全部走 v4.0 command-bus 路径）。
- **Verify (`pnpm verify:phase73` → new script `scripts/verify-phase73-quiz-ext.ts`):**
  - Schema/allowlist 静态断言：`plugin_owned_quiz_questions.questionType` 存在 + 5 题型 enum 完整 + `src/lib/dto/plugin-data-model.ts` 类型化 payload union 存在 + `plugin-data-access-allowlist.ts` `quiz.questions` / `quiz.responses` 接受 `questionType`。
  - DAL 单元测试：4 verb × 5 questionType = 20 用例（`dispatchPluginDataAccess` smoke）+ append-only/`isLatest` 翻转跨 5 题型测试。
  - WS 事件 schema 断言：`ws-envelope.ts` 含 `quiz.answer.received` 事件类型 + `ws-server.ts` teacher-only 路由不暴露给学生 + `ws-auth.ts` 鉴权保留 `memberships.status === "active"` + `classMembers.userId` + `classroomSessions.teacherId` 推导 actor scope。
  - 集成测试：30 个并发学生 → 30 个 teacher-only 事件按 `receivedAt` 顺序到达（毫秒级抖动）。
  - Redis fanout contract test：env 存在/缺失两种配置下行为等价。
  - Dashboard tab 路由 + 访问控制：访问控制单元测试 + 渲染测试 + 「作答实时」tab 是 `/classroom` 已存在 control room 内的 sibling tab，不创建新路由。
  - 写操作隔离 grep：`src/components/classroom/live-answer-dashboard-surface.tsx` (新建) / 同名目录不含 `update*` / `delete*` / `grade*` Server Action 引用。
  - Recap 渲染：`ClassroomSessionRecapSurface` 按 `questionType` 分组渲染 5 题型 stats（vitest 表格断言 + RSC snapshot）。
  - DTO 契约：`ClassroomSessionRecapDTOSchema` 接受 5 题型 `quizSampleStats` 段，`cacheTags.quizStats(sessionId)` 仍能 invalidate 新段。
- **Pattern reuse:**
  - **D-72.1-04 append-only/`isLatest`**：学生提交跨 5 题型复用 v4.0 同一写入路径；`pluginOwnedQuizResponses` 表 schema 不变，新增 payload 字段语义不破坏旧唯一索引 `(classroomSession, student, question, attemptNo)` 与 `(classroomSession, student, question, isLatest)`。
  - **v2.2 WebSocket-first transport**：`classroom-ws` (`src/features/runtime-platform/seams/transport/ws-server.ts` + `ws-envelope.ts` + `ws-auth.ts` + `redis-fanout-manager.ts` + `redis-fanout-recovery.ts`) — `quiz.answer.received` 是新事件 kind，遵循 v2.2 contract `transport.keepalive` / `teacher.control` / `runtime.command` / `classroom.snapshot` / `runtime.event` 同款 envelope（`kind` / `correlationId` / `truthRef`）；`ws-server.ts` teacher-only 路由不暴露给学生。
  - **v4.0 phase 69 quiz sample baseline**：`pluginKey = "quiz"` 走 `dispatchPluginDataAccess` facade（非 built-in registration id），`saveQuizSampleLessonStepAction` / `submitQuizSampleAnswerAction` 路径只增不改。
  - **v4.0 phase 70 recap surface**：`getClassroomSessionRecapDTO` + `ClassroomSessionRecapSurface` + `buildQuizSampleRecapStats` (latest-only) + `cacheTags.quizStats(sessionId)` cache tag 全部保留；`quizSampleStats` DTO 段按 `questionType` 扩展。
  - **v4.0 phase 72/72.1 close gate discipline**：`updateTag` 在 `submitQuizSampleAnswerAction` (`src/actions/classroom-actions.ts:328`) 写成功后失效，与 v4.0 一致。
- **Status:** planning

### Phase 74: v4.1 Authoritative Close Gate (Multi-Type + Live Dashboard)

- **Goal:** 沿用 v4.0 phase 72.1 单一权威 close gate 范式 (D-72.1-16: conclusion never leads evidence；D-72.1-08: 课堂产品链 + 治理生命周期链同覆盖)，把 v4.1 多题型 + 实时仪表盘两层验证合并进 `pnpm verify:phase` 闸门，并补齐 Manual Surface Sign-Off Ledger 2 行新增（`/classroom` 实时仪表盘 tab + 多题型课后 recap 表面）与 CLOSEOUT / PROOF-MAPPING / VERIFICATION 三件套。
- **Depends on:** Phase 73 (executable `verify:phase73` 已落库)。
- **Sub-IDs covered:**
  - **QUIZ-EXT-CLOSE-01 — verify:phase 脚本扩展**：`scripts/verify-phase72-close-gate.ts` 复制为 `scripts/verify-phase73-v41-close-gate.ts`；stage 数 5 → 7（保留 v4.0 5 stage + 新增多题型 stage + 新增实时仪表盘 stage）；`pnpm verify:phase73-v41-close-gate` 顺序接在 `verify:phase72` 之后。
  - **QUIZ-EXT-CLOSE-02 — Manual Surface Sign-Off Ledger**：仿 v4.0 `72.1-PROOF-MAPPING.md` ledger schema（`proof artifact` + `status: passed` + `executed_by` + `executed_at` + `evidence note`），新增 2 行：`/classroom` 实时仪表盘 tab + 多题型课后 recap 表面。
  - **QUIZ-EXT-CLOSE-03 — Retro / 归档就绪**：phase 73/74 (本 roadmap) 配齐 CLOSEOUT / PROOF-MAPPING / VERIFICATION 三件套；D-72.1-16 锁定 conclusion 永远不先于 evidence；milestone close gate `pnpm verify:phase` alias 仍指向 v4.0 + v4.1 顺序串联，单一权威入口不破。
- **Plans:**
  - **Plan 74-01 — Proof mapping first + independent `verify:phase73` product truth lane.** 先写 `.planning/phases/73-.../73-PROOF-MAPPING.md`（4-row ledger：承接 v4.0 两行 + v4.1 新增两行 pending-human-signoff）再新增 `scripts/verify-phase73-quiz-ext.ts` 与 `package.json#verify:phase73`；inner verifier 只覆盖 multi-type recap / live dashboard / zero-write / transport product seams，不碰 close artifacts，不改 `verify:phase`。Wave 1。
  - **Plan 74-02 — Thin outer close gate wiring without alias cutover.** 新增 `scripts/verify-phase73-v41-close-gate.ts` 与 `package.json#verify:phase73-v41-close-gate`；outer gate 只消费 `pnpm verify:phase73` 作为 upstream proof lane，并补 close-truth checks：artifact dependencies、proof-chain wording、manual ledger parser、alias readiness；`verify:phase` 继续保持 `pnpm verify:phase72`。Wave 2，依赖 Plan 74-01。
  - **Plan 74-03 — Write user-flow-first `73-VERIFICATION.md`.** 形式化报告按两条用户链路组织：multi-type recap chain 与 live dashboard chain；文末附显式 `user flow -> gate stages` crosswalk，并覆盖 `QUIZ-EXT-CLOSE-01/02/03`。Wave 3，依赖 Plan 74-02。
  - **Plan 74-04 — Human-observed manual sign-off checkpoint.** 在真实 `/classroom` 路径上人工观察 live-answer tab 与 multi-type recap surface，回传 `executed_by` / `executed_at` / `evidence_note` 两组 payload；本 plan 不自动把 rows 标成 passed。Wave 4，依赖 Plan 74-03。
  - **Plan 74-05 — Final closeout + conditional alias cutover.** 用 74-04 的真实 payload 回填 `73-PROOF-MAPPING.md` 两条 v4.1 rows，最后写 `73-CLOSEOUT.md`，并仅在 D-04 条件全部满足时把 `verify:phase` 改为 `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate`；否则明确保持 phase72 alias。Wave 5，依赖 Plan 74-04。
- **Success criteria (3-5 observable truths, must all be true for milestone close):**
  1. `pnpm verify:phase73-v41-close-gate` 7 stage 全绿，stage 6 (多题型) + stage 7 (实时仪表盘) 静态断言全部 PASS。
  2. `pnpm verify:phase` alias 顺序串接 `verify:phase72` + `verify:phase73` 全绿，CLI exit 0。
  3. Manual Surface Sign-Off Ledger 含 4 行（v4.0 既有 2 行 + v4.1 新增 2 行），全部 `status: passed` + `executed_by` + `executed_at` + `evidence note` 字段非空；新增 2 行是 `/classroom` 实时仪表盘 tab + 多题型课后 recap 表面。
  4. `73-VERIFICATION.md` / `73-PROOF-MAPPING.md` / `73-CLOSEOUT.md` 三件套全部存在；PROOF-MAPPING 显式收录 QUIZ-EXT-01/02/CLOSE 全部 sub-IDs；CLOSEOUT 引用 verify:phase67..72 + verify:phase73 proof chain wording。
  5. v4.1 archive posture 满足 D-72.1-16：三个 lighter shortcut (doc-only closure / missing manual sign-off / final-gate wiring without artifact dependency checks) 任一出现 → final gate hard-fail。
- **Verify (`pnpm verify:phase` → `pnpm verify:phase72` + `pnpm verify:phase73-v41-close-gate`):**
  - 5 stage (v4.0 复用) + 2 新增 stage (多题型 + 实时仪表盘) = 7 stage。
  - 新增 stage 6 静态断言：`plugin_owned_quiz_questions.questionType` schema 存在 + 5 题型 enum 完整 + DTO payload union 类型化 + allowlist 接受 `questionType` + 5 题型 × 4 verb DAL 测试 + `cacheTags.quizStats(sessionId)` 在 5 题型 stats DTO 段上仍生效。
  - 新增 stage 7 静态断言：`ws-envelope.ts` 含 `quiz.answer.received` + `ws-server.ts` teacher-only 路由 + dashboard tab 路由 + 访问控制 + 写操作隔离 grep (`grep -q "update.*=\|delete.*=\|grade.*=" src/components/classroom/live-answer-*.tsx` 不命中) + Redis fanout contract test (env 存在/缺失等价)。
  - final-artifact 依赖：`73-CLOSEOUT.md` / `73-PROOF-MAPPING.md` / `73-VERIFICATION.md` 必须存在；缺一 hard-fail。
  - Manual sign-off parser：deterministic `\| status \| \`status: passed\` \|` 行 ≥ 4 行（v4.0 2 行 + v4.1 2 行）+ `executed_by` / `executed_at` / `evidence note` 字段每行非空。
  - 5 stage (v4.0 复用) 回归：lifecycle bridge (Stage 3) + recap bridge (Stage 4) 仍绿 — v4.1 不破 v4.0 既有产品接缝。
- **Pattern reuse:**
  - **v4.0 72.1 close gate**：5 stage → 7 stage，结构 discipline 完全复用（script wiring + upstream VERIFICATION + lifecycle bridge + recap bridge + final-artifact dependencies + manual sign-off ledger 解析）。
  - **D-72.1-16 conclusion never leads evidence**：先写 `73-PROOF-MAPPING.md` → 强化 7 stage gate wiring → 写 `73-VERIFICATION.md` → 最后 `73-CLOSEOUT.md`。
  - **D-72.1-08 auditability (lifecycle + classroom product chain 同覆盖)**：v4.1 不动 lifecycle，新增 stage 6 (多题型) + stage 7 (实时仪表盘) 均为 classroom product chain 端接缝断言。
  - **D-72.1-06 proof chain wording**：v4.1 必须在 final-artifact 内容里显式写 `verify:phase67` + `verify:phase68` + `verify:phase72` + `verify:phase73` proof chain wording；stage 6/7 final-artifact grep 双 named。
  - **v4.0 72.1-PATTERNS.md verification scaffold**：73-VERIFICATION.md 复刻 69-VERIFICATION.md 的 observable truths / required artifacts / key link / data-flow / behavioral / requirements coverage / anti-patterns / human verification / 结论 9 段结构。
- **Status:** planning

## Cross-Phase Considerations

- **Sequencing (no parallelism within phase; phases are sequential):** Phase 73 wave 1 内部 Plan 73-01 与 Plan 73-02 不并行 — Plan 73-02 依赖 Plan 73-01 落地的 DAL 写入 hook 点（DAL `submitQuizSampleAnswerAction` 写成功后触发 `quiz.answer.received` 事件推送）。Phase 74 wave 1/2 内部 Plan 74-01 与 Plan 74-02 不并行 — Plan 74-02 依赖 Plan 74-01 落地的 73-VERIFICATION.md 与强化后 executable verifier。
- **Reuse over re-build:** v4.1 不创建新 WS endpoint（沿用 v2.2 `classroom-ws`）— 任何 v4.1 plan 触碰 v2.2 transport 必须先跑 GitNexus `gitnexus_impact` 上游分析，blast radius 在 `ws-server.ts` / `ws-envelope.ts` / `ws-auth.ts` 范围内。`plugin_owned_quiz_responses` 表 schema 不变（避免破坏 v4.0 唯一索引）；新增 `plugin_owned_quiz_questions.questionType` 列是 additive migration，D-67 forward + D-68 allowlist 同步。
- **Risk — DTO schema drift:** 5 题型 payload union 引入可能让 Zod schema 在 strict mode 下拒绝旧 `single_choice` payload。Mitigation: Plan 73-01 Task 1 显式断言旧 `single_choice` payload 仍合法（D-67 backward compat），用 vitest 负样本覆盖 `payloadMulti` / `payloadTrueFalse` / `payloadFillBlank` / `payloadOrdering` 4 新 payload 子集。
- **Risk — WS event ordering at scale:** 30 并发学生提交要求事件按 `receivedAt` 顺序到达，毫秒级抖动可接受。Plan 73-02 Task 3 集成测试必须用 libSQL + 真实 `ws-server.ts` (非 mock) 跑出 30 并发；不可降级为 in-memory bus 单元测试。
- **Risk — Redis fanout config drift:** v2.2 Redis fanout 在 `REDIS_URL` 存在时启用。Plan 73-02 Task 2 contract test 必须在 CI 跑 env 存在/缺失两个分支；env 缺失不能 fake "存在"。
- **Risk — read-only posture erosion:** dashboard tab 可能误加 `grade*` / `update*` / `delete*` Server Action。Plan 73-02 Task 5 grep 静态断言必须在 `src/components/classroom/live-answer-*` 与 surface 文件上运行；任何命中 → fail。
- **Risk — close gate regression on v4.0 既有断言:** Phase 74 stage 6/7 强化不能让 v4.0 stage 3 (lifecycle bridge 11) / stage 4 (recap bridge 9) 失绿。Plan 74-01 显式跑 v4.0 stage 3/4 回归；任一失绿 → 不能进入 Plan 74-02。
- **No UX/UI research gap pre-added:** v4.1 task 描述里说"optional Phase 3: only if a UX/UI research gap emerges during planning — do not pre-add it"。当前 REQUIREMENTS + v4.0 phase 70 UI-SPEC + v4.0 72.1 close gate 都已涵盖 dashboard 视觉契约；plan 73-02 需对照 v4.0 UI-SPEC 复用 4 locked invariants (Lexend / no 1px / tonal surface / glass/gradient CTA)。如 plan 阶段发现真实 UX gap，再决定是否插 phase 73.1。
- **Operator observation points (handed off to Phase 74 ledger):**
  - `/classroom` 实时仪表盘 tab — 新增 manual sign-off row。
  - 多题型课后 recap 表面 — 新增 manual sign-off row（沿用 v4.0 `ClassroomSessionRecapSurface`，5 题型 stats DTO 段按 `questionType` 分组渲染）。
  - `scripts/verify-phase73-v41-close-gate.ts` — 7 stage 闸门，milestone close 唯一入口（与 v4.0 stage 3/4 顺序串联）。
  - `.planning/phases/73-multi-type-quiz-and-live-dashboard/73-{PROOF-MAPPING,VERIFICATION,CLOSEOUT}.md` — archive-ready 三件套。

## Excluded from v4.1

以下 REQ-IDs 在 `.planning/REQUIREMENTS.md` v4.1 段中明确排除；plan 阶段不得越界：

- **`QUIZ-EXT-03` — post-class interactive review** (AI 出题 / 题库复用) — 暂缓，等 v4.1 用户使用情况决定。
- **`MKT-EXT-01/02/03` — marketplace extras** (upgrade dry-run / 跨 pluginKey 完整恢复 / 非答题类插件二次泛化) — 暂缓，等 v4.2 之后。
- **`STORE-01` — 商业 storefront** (付费/计费/评分评论/公开开发者门户/自动化审核流水线) — 暂缓。
- **任何非 quiz 类插件** (lesson / homework / data agent 等) — 明确排除。
- **任何插件升级 dry-run / 跨 pluginKey 恢复 / 商店运营层** — 明确排除。
- **任何教师批改 / 评分 / 排名 / 竞争机制** — 明确排除：v4.1 实时仪表盘是只读的，不引入 write-side 特性。
- **新建 WS endpoint / 第二 transport runtime** — 明确排除：v4.1 沿用 v2.2 `classroom-ws`。
- **`plugin_owned_quiz_responses` 表 schema 变更** — 明确排除：v4.1 仅扩展 `plugin_owned_quiz_questions.questionType`，不破坏 v4.0 唯一索引与 append-only 写入契约。
- **真实 LLM / 第三方 AI 集成** — 明确排除：v4.1 不在 scope。

---

_For current milestone status, see `.planning/STATE.md` (will be updated by `/gsd:execute-phase 73` first wave)._
