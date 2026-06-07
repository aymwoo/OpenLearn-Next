# Phase 70: Question Stats & Post-Class Recap - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

基于 Phase 69 已冻结的 `plugin_owned_quiz_questions` 与 append-only/latest 的 `plugin_owned_quiz_responses`，交付 quiz sample 的课后统计只读投影与教师复盘界面。

本 phase 只交付 STATS-01 / STATS-02：
- 每题正确率
- 各选项分布
- 作答 / 未作答人数
- 对齐 Stitch `5322129002350954765` + `DESIGN.md` 的课后复盘呈现

固定边界：
- 不回写 core analytics 表，不把 quiz sample 统计塞进新的 durable analytics 真相源。
- 不回读 lesson step / plugin extension 补题面；题面只来自 `plugin_owned_quiz_questions` 的 session freeze snapshot。
- 统计只看 `isLatest=true` 的当前有效答案；历史 attempts 仅用于审计与回溯。
- 不做 marketplace install/upgrade/uninstall（Phase 71），不做 milestone 级 end-to-end close gate（Phase 72）。

</domain>

<decisions>
## Locked Decisions

- **D-70-01 (统计真相源):** 统计只能来自 `plugin_owned_quiz_questions` + `plugin_owned_quiz_responses`，不拼 lesson shell / plugin extension / core `quizAttempts`。
- **D-70-02 (latest 口径):** 每个学生每题只按 `isLatest=true` 记一票；重复改答不能膨胀分布与分母。
- **D-70-03 (分母口径):** 作答 / 未作答人数相对当前 `classroomSession` 的参与者名单计算，避免课后 course enrollment 漂移影响旧 session 复盘。
- **D-70-04 (正确率展示):** 正确率默认以“已作答人数”为分母；同时显式展示作答 / 未作答人数，避免把缺席/未答混进正确率语义。
- **D-70-05 (页面接缝):** 不新开独立 analytics 页面；quiz sample 统计必须挂入现有 `/classroom` 的 recap seam 和 `ClassroomSessionRecapSurface`。
- **D-70-06 (读模型边界):** 统计由单一 DAL 聚合函数输出 DTO；UI 不直接聚合、不自己算百分比口径。
- **D-70-07 (缓存策略):** 新增 session-scoped `quizStats` cache tag；学生提交 quiz sample 答案后必须刷新该 tag，保证复盘读模型新鲜。
- **D-70-08 (summary artifact 边界):** 现有 `classroomSessionSummary` 仍保持核心课堂 summary 角色；quiz sample 统计不写入其持久化 artifact，避免形成 core analytics 污染。

### Agent's Discretion
- quiz sample 统计是作为 `ClassroomSessionRecapDTO` 的新 section，还是独立但被 recap DTO 引用的子 DTO，可由 planner 决定。
- 正确率、分布条、正确答案标记的具体 UI 呈现方式可按 UI-SPEC 细化，只要不退化成通用 BI dashboard。
- 统计聚合可以落在 `src/lib/dal/classroom.ts` 内部 helper，也可以抽成同目录私有 helper；前提是外部公开面仍收口到单一 DAL seam。

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 70 goal, success criteria, pitfall notes.
- `.planning/REQUIREMENTS.md` — STATS-01 / STATS-02 原始需求文本。
- `.planning/STATE.md` — current milestone focus and the note that Phase 70 is a UI phase.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-CONTEXT.md` — Phase 69 locked truths, especially latest-only and session freeze.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-RESEARCH.md` — confirms Phase 70 must read plugin-owned question/response tables only.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-UI-SPEC.md` — teacher/student quiz sample UI contract that Phase 70 should extend, not contradict.
- `DESIGN.md` — Lexend, no-line rule, tonal depth, glass/gradient CTA.
- `src/lib/dto/classroom.ts` — existing recap DTO seam.
- `src/lib/dal/classroom.ts` — existing recap computation and classroom scope seam.
- `src/components/classroom/classroom-session-recap-surface.tsx` — existing recap UI shell.
- `src/lib/cache-policy.ts` — cache tag single source.
- `src/actions/classroom-actions.ts` — current quiz sample submit invalidation seam.
- `plugins/quiz-sample/data-model.ts` and `src/db/schema/generated/plugin-owned/quiz.ts` — plugin-owned quiz table truth.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/classroom/classroom-session-recap-surface.tsx` 已经是教师课后复盘主舞台，视觉语言与 `DESIGN.md` 一致，适合承接 quiz sample 统计 section。
- `src/lib/dal/classroom.ts#getClassroomSessionRecapDTO` 已经是 ended session 的权威 recap read seam，适合扩展 quiz sample stats DTO。
- `src/lib/cache-policy.ts` 已集中维护 tag 命名；Phase 70 应把 `quizStats(sessionId)` 放在这里，而不是散落硬编码字符串。
- `src/actions/classroom-actions.ts#submitQuizSampleAnswerAction` 已经是学生作答成功后的 cache invalidation 接缝，只差补上 dedicated quiz stats tag。
- `plugin_owned_quiz_questions` 已有完整 prompt + option A-D + correctOption；`plugin_owned_quiz_responses` 已有 indexed `(classroomSession, student, question, isLatest)` latest seam。

### Established Constraints
- 当前 `computeClassroomSessionRecap` 仍只聚合 core `taskSubmissions` / `quizAttempts` latest rows；quiz sample 统计必须新增 plugin-owned 分支，不能假装 core quiz path 已覆盖。
- Phase 68 的通用 `aggregate` read verb 只支持受限 `{ key, count }` 投影，且 68 文档已明确“latest-only correctness stats”留到 Phase 70，不能直接把 generic verb 当最终答案。
- 现有 `classroomSessionSummary` artifact 是“课堂总结”而非 quiz analytics 存储；把 plugin stats 写进去会越过 STATS-01 的 no core analytics red line。

### Integration Points
- DAL 层：在 `getClassroomSessionRecapDTO` 或其私有 helper 中读取 session participants、question snapshot、latest responses，构建 session-scoped stats DTO。
- Action 层：在 quiz sample submit 成功后 `updateTag(cacheTags.quizStats(sessionId))`。
- UI 层：在 `ClassroomSessionRecapSurface` 内增加“题目复盘” section，与现有 hero/workload/student recap 同层，不新建 route。

</code_context>

<deferred>
## Deferred Ideas

- 把 quiz sample 统计沉淀到跨 session 趋势分析或班级趋势图：留到未来 phase，不并入 Phase 70。
- 把 quiz sample 统计写入 `classroomSessionSummary`、外部 analytics warehouse、Redis projection：全部 deferred。
- 公布答案、大屏、游戏化、AI 讲评：不在本 phase。

</deferred>

---

*Phase: 70-question-stats-post-class-recap*
*Context gathered: 2026-06-03*
