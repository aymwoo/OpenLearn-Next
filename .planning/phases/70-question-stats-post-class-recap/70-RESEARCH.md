# Phase 70: Question Stats & Post-Class Recap - Research

**Researched:** 2026-06-03
**Domain:** Plugin-owned quiz stats aggregation, recap DTO integration, and Stitch/DESIGN-aligned teacher recap UI
**Confidence:** HIGH (phase boundary, DAL seams, DTO shapes, cache seams, and existing recap surface all inspected in-repo)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STATS-01 | 基于插件自有作答数据计算每题正确率、各选项分布、作答/未作答人数，统计是只读投影，不回写核心 analytics 表 | Fact 1, 2, 3, 4 + Pattern 1, 2 |
| STATS-02 | 教师能在课后复盘界面查看题目统计，界面对齐 Stitch `5322129002350954765` 与 `DESIGN.md` | Fact 5, 6 + Pattern 3 |

</phase_requirements>

## Summary

Phase 70 不是“再做一个统计页”，而是把 quiz sample plugin 真正接入仓库现有的课后复盘主链：

1. **统计真相源** 必须收口到 `plugin_owned_quiz_questions` + `plugin_owned_quiz_responses(isLatest)`，因为 Phase 69 已经把题面 freeze 和 latest-only submit 打通。
2. **聚合接缝** 应落在 `src/lib/dal/classroom.ts` 的 recap 读模型体系，而不是复用当前受限的 generic aggregate read verb，也不是在组件里 map/filter 现算。
3. **界面接缝** 已经存在于 `ClassroomSessionRecapSurface`；最佳路径是在这个 surface 中加入 quiz sample question recap section，而不是再发明一个 analytics route。

结论：

- **只读投影** 应在 DAL 中用 SQL `GROUP BY` 直接从 plugin-owned tables 生成。
- **DTO** 应扩到 `ClassroomSessionRecapDTO` 的 quiz stats section，但**不要**把这部分写入 `classroomSessionSummary` 持久化 artifact。
- **cache freshness** 需要新 `cacheTags.quizStats(sessionId)`，并在 `submitQuizSampleAnswerAction` 成功后刷新。

## Verified Codebase Facts

### Fact 1: Phase 69 已经准备好了 Phase 70 的两张唯一统计表
- `src/db/schema/generated/plugin-owned/quiz.ts` 的 `plugin_owned_quiz_questions` 现在包含 `prompt`、`optionAText`...`optionDText`、`correctOption`。
- 同文件里的 `plugin_owned_quiz_responses` 已包含 `(classroomSession, student, question, attemptNo, isLatest, selectedOption)` 的 latest seam 与索引。
- 结论：Phase 70 不需要再回读 lesson step / plugin extension，也不需要新建统计中间表。

### Fact 2: 当前仓库的 generic plugin-data aggregate 不能直接满足 Phase 70
- `.planning/phases/68-governed-declarative-data-access-verbs/68-04-SUMMARY.md` 已明确：当前 `aggregate` 只做受限 `{ key, count }`，latest-only counting / correctness distribution 留到 Phase 70。
- 结论：Phase 70 不该硬挤 generic verb，而应交付专用 DAL 聚合函数。

### Fact 3: 现有 recap 读模型已经有最适合的承载 seam
- `src/lib/dal/classroom.ts#getClassroomSessionRecapDTO` 只允许 ended session 进入复盘路径。
- 同文件 `computeClassroomSessionRecap` 已是老师课后复盘的现有单一 read seam。
- `src/lib/dto/classroom.ts#ClassroomSessionRecapDTOSchema` 已定义了 recap 输出边界。
- 结论：Phase 70 最小风险路径是扩这条 seam，而不是新建 `getQuizAnalyticsPageDTO` 一类旁路。

### Fact 4: 当前 recap 计算仍只看 core task/quiz latest rows
- `src/lib/dal/classroom.ts` 在 recap 相关逻辑中查询的是 core `taskSubmissions` 和 `quizAttempts` 的 `isLatest=true` 行。
- 这条路径对 quiz sample plugin 是不完整的，因为 quiz sample 不写 core `quizAttempts`。
- 结论：Phase 70 必须显式补 plugin-owned quiz sample 统计分支，否则 STATS-01 不成立。

### Fact 5: 已有 recap UI 就是正确的产品壳层
- `src/components/classroom/classroom-session-recap-surface.tsx` 已经是 `/classroom` 的课后复盘主舞台：hero、workload、student recap、step diagnostics 都在这一个 surface 内。
- 它已使用 Lexend、tonal surfaces、无 1px divider 的视觉语言。
- 结论：STATS-02 应直接在这个 surface 内扩 question recap section，而不是做新的 BI 模板页。

### Fact 6: 当前 cache seam 缺少 dedicated quiz stats tag
- `src/lib/cache-policy.ts` 目前没有 `quizStats` tag。
- `src/actions/classroom-actions.ts#submitQuizSampleAnswerAction` 当前只刷新 `classroom / progress / submission / teacherReview`。
- 结论：如果 Phase 70 读模型要缓存，就必须引入 `quizStats(sessionId)` 并在 quiz sample submit 后更新。

### Fact 7: `classroomSessionSummary` 不能成为 quiz stats 的持久化落点
- `src/lib/dto/classroom.ts#ClassroomSessionSummaryArtifactSchema` 和 `src/lib/dal/classroom.ts#executeClassroomSessionSummaryTask` 表明当前 summary artifact 是课堂总结 artifact。
- 路线图和 requirement 要求 quiz sample stats 保持为 plugin data 之上的只读投影，不回写 core analytics 表。
- 结论：Phase 70 应扩 `ClassroomSessionRecapDTO` 的 live read，不扩 `classroomSessionSummary` 的 durable artifact。

## Recommended Project Structure

```text
src/lib/
├── cache-policy.ts                              # add cacheTags.quizStats(sessionId)
├── dto/classroom.ts                             # add quiz sample recap DTO section schemas
└── dal/classroom.ts                             # add single DAL aggregate helper + recap integration

src/actions/
└── classroom-actions.ts                         # updateTag(cacheTags.quizStats(sessionId)) on quiz sample submit

src/components/classroom/
└── classroom-session-recap-surface.tsx          # render quiz sample question recap section

scripts/
└── verify-phase70-quiz-stats.ts                 # close gate for stats truth + UI seam wiring
```

## Architecture Patterns

### Pattern 1: latest-only recap aggregation stays in DAL, not in UI
**Source:** `src/lib/dal/classroom.ts` current recap pipeline.

**What:** Compute per-question stats inside a private DAL helper that receives the ended `classroomSession` scope and returns a DTO-ready section.

**Why:** Existing recap path already owns read-side truth construction. UI should render only, not infer latest semantics.

### Pattern 2: extend recap DTO, not the summary artifact
**Source:** `src/lib/dto/classroom.ts` + `src/lib/dal/classroom.ts#getClassroomSessionRecapDTO`.

**What:** Add a quiz sample stats section to `ClassroomSessionRecapDTO`, but do not store it in `ClassroomSessionSummaryArtifactSchema` or related persistence.

**Why:** STATS-01 forbids core analytics writeback; recap DTO is a read boundary, while summary artifact is a durable core table.

### Pattern 3: add quiz question recap inside the existing recap surface
**Source:** `src/components/classroom/classroom-session-recap-surface.tsx`.

**What:** Keep the current hero/workload/student recap shell and insert a dedicated "题目复盘" section with per-question cards.

**Why:** This preserves current teacher workflow and matches the no-new-route boundary.

## What NOT to Build

| Avoid | Why | Use Instead |
|------|-----|-------------|
| 在组件里 `reduce()` 最新答案、算分布和正确率 | UI 成为第二计算源，难保 latest 口径一致 | 单一 DAL aggregate helper |
| 把 quiz sample stats 写入 `classroomSessionSummary` / 其他 core analytics 表 | 违反 STATS-01 | live recap DTO section |
| 从 lesson step / plugin extension 拼回题面 | 已有 session freeze truth，回读会造成双真相 | `plugin_owned_quiz_questions` |
| 复用 generic `aggregate` verb 强行拼正确率 | 表达力不足，且 68 已明确 deferred | explicit DAL SQL `GROUP BY` |
| 另起一个 `/teacher/analytics` 或 `/classroom/quiz-recap` 页面 | 违背现有 recap seam 和 STATS-02 最小改动原则 | `ClassroomSessionRecapSurface` 扩 section |

## Validation Targets

- latest-only 统计不会把 superseded attempts 计入分布或正确率。
- 未作答人数来自 session participants，而不是当前 course enrollment。
- recap DTO 能在 ended session 返回 quiz sample stats section，且不污染 summary artifact schema。
- submit quiz sample answer 后 dedicated stats cache tag 被刷新。
- `ClassroomSessionRecapSurface` 能展示 question cards、distribution rows、作答/未作答口径说明。

## Sources

- `.planning/ROADMAP.md` — Phase 70 goal and success criteria. Confidence: HIGH.
- `.planning/REQUIREMENTS.md` — STATS-01 / STATS-02 wording. Confidence: HIGH.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-CONTEXT.md` — locked latest/session-freeze decisions. Confidence: HIGH.
- `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-RESEARCH.md` — confirms plugin-owned question/response truth. Confidence: HIGH.
- `.planning/phases/68-governed-declarative-data-access-verbs/68-04-SUMMARY.md` — current aggregate limitations. Confidence: HIGH.
- `src/lib/dto/classroom.ts` — current recap DTO boundary. Confidence: HIGH.
- `src/lib/dal/classroom.ts` — current recap compute seam and summary artifact path. Confidence: HIGH.
- `src/components/classroom/classroom-session-recap-surface.tsx` — recap shell and visual language. Confidence: HIGH.
- `src/actions/classroom-actions.ts` — quiz sample submit invalidation seam. Confidence: HIGH.
- `src/lib/cache-policy.ts` — cache tag single source. Confidence: HIGH.
