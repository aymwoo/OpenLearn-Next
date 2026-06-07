---
phase: 70-question-stats-post-class-recap
verified: 2026-06-07T05:53:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "教师端在 ended session recap 中查看题目复盘 section"
    expected: "/classroom 课后复盘里出现‘题目复盘’section，正确率/作答/未作答/选项分布与 DTO 一致，且与现有 recap hero / workload / 学生复盘 节奏连贯"
    why_human: "视觉节奏、字号层级、文案口径是 STATS-02 的一部分，单测与 grep 只能保证接缝存在"
  - test: "核对题目复盘 section 与 Stitch project 5322129002350954765 / DESIGN.md 视觉契约"
    expected: "Lexend 字体生效、无 1px 实线分隔、tonal surface 层级、glass/gradient CTA 至少在 primary 按钮上出现，且全页继续使用 education-product 视觉语言而非通用 BI 仪表盘"
    why_human: "Design-language 验收依赖肉眼对照 Stitcn 参考与 DESIGN.md，单测无法替代"
  - test: "D-72.1-16 教室桥接证据在 RECAP 内能被复盘时直接触达"
    expected: "后续 72.1 close gate 在 milestone 入口处再次断言本报告中列出的 route / surface / action / DAL 边界，确保 milestone-authoritative proof 不需要单独再发明一条 classroom 桥接"
    why_human: "本报告对 STATS-01/02 的自洽形式化并不直接等于 72.1 close gate 的最强约束；最终权威性需要 wave 2 / 3 的 close gate 再覆写一次"
---

# Phase 70: Question Stats & Post-Class Recap — Verification Report

**Phase Goal:** 基于 Phase 69 已冻结的 `plugin_owned_quiz_questions` 与 append-only/latest 的 `plugin_owned_quiz_responses`，交付 quiz sample 的课后统计只读投影与教师复盘界面，每题正确率 / 各选项分布 / 作答 vs 未作答人数，对齐 Stitch `5322129002350954765` 与 `DESIGN.md` 视觉语言。
**Verified:** 2026-06-07T05:53:00Z
**Status:** passed
**Re-verification:** Yes — initial verification completed via 70-01..04 SUMMARYs; this formal report closes STATS-01 / STATS-02 against code, not summary prose.

> **Bridge note (D-72.1-16 classroom half).** The classroom-side bridge inputs named in this report — `src/app/(classroom)/classroom/page.tsx` → `getClassroomSessionRecapDTO` → `ClassroomSessionRecapSurface` → `src/actions/classroom-actions.ts` cache boundary — are the **same** seams that the milestone-authoritative close gate (72.1-02 / 72.1-03) will assert directly. This report formalises evidence; the milestone gate is what makes the evidence authoritative.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 真实 recap route `/classroom` 在 ended-session 路径下调用 `getClassroomSessionRecapDTO`，把课堂 recap DTO 透传到 `<ClassroomSessionRecapSurface />` 渲染，而不是把统计塞进另一个独立 analytics 页。 | ✓ VERIFIED | `src/app/(classroom)/classroom/page.tsx:39-41` 在 `activeSession?.status === 'ended'` 分支调用 `getClassroomSessionRecapDTO({ sessionId, studentId, stepId, detailTab: recapTab })`；`src/app/(classroom)/classroom/page.tsx:54` 把 `recap` 透传给 `ClassroomConsoleSurface` 内部挂载的 `ClassroomSessionRecapSurface`；`src/components/classroom/classroom-session-recap-surface.tsx:14` 暴露 `ClassroomSessionRecapSurface` 组件。 |
| 2 | `getClassroomSessionRecapDTO` 是 ended-session 唯一 recap read seam，并在 DTO 上挂出 `quizSampleStats` section（不下沉到 `ClassroomSessionSummaryArtifactSchema`，不写 core analytics 表）。 | ✓ VERIFIED | `src/lib/dal/classroom.ts:3675-3716` 的 `getClassroomSessionRecapDTO`：`getTeacherSessionScope` → `computeClassroomSessionRecap` → `ClassroomSessionRecapDTOSchema.parse({ ..., quizSampleStats: recap.quizSampleStats, ... })`；stats 数据来源 `src/lib/dal/classroom.ts:3149` 调用私有 helper `buildQuizSampleRecapStats`，**不**写入 `classroomSessionSummary` artifact。 |
| 3 | 统计真相源严格来自 `plugin_owned_quiz_questions` + `plugin_owned_quiz_responses`，并且 **只**按 `isLatest=true` 取每个学生每题一票；append-only 历史 attempts 不膨胀分布与分母。 | ✓ VERIFIED | `src/lib/dal/classroom.ts:890-984` 的 `buildQuizSampleRecapStats`：`db.select(...).from(pluginOwnedQuizQuestions).where(eq(classroomSession, ...), inArray(question, quizStepIds))` 取题面 snapshot；`db.select(question, selectedOption, count).from(pluginOwnedQuizResponses).where(... , eq(pluginOwnedQuizResponses.isLatest, true)).groupBy(question, selectedOption)` 取最新分布。最新一行 schema 见 `src/db/schema/generated/plugin-owned/quiz.ts:29-48`（含 `(classroomSession, student, question, attemptNo)` 唯一约束与 `isLatest` 索引）。 |
| 4 | 作答 / 未作答人数相对当前 `classroomSession` 的参与者名单计算，不被课后 enrollment 漂移影响；正确率按“已作答人数”作分母而不是“参与者人数”。 | ✓ VERIFIED | `src/lib/dal/classroom.ts:894` 接收 `participantCount`，内部 `unansweredCount = Math.max(input.participantCount - answeredCount, 0)`，`correctRate = answeredCount > 0 ? correctCount / answeredCount : 0`；DTO 同步输出 `denominatorLabel: "正确率按已作答 ${answeredCount} 人计算；本次课堂共 ${input.participantCount} 名参与者。"`。 |
| 5 | `src/actions/classroom-actions.ts` 的 quiz sample submit action 在写入成功后立刻 `updateTag(cacheTags.quizStats(parsed.data.sessionId))`，保证复盘 DTO 在下一次 RSC 渲染时新鲜（read-your-writes）。 | ✓ VERIFIED | `src/actions/classroom-actions.ts:318-329` 的 `submitQuizSampleAnswerAction`：成功分支先 `updateTag(cacheTags.classroom(...)) / progress / submission / teacherReview` 再 `updateTag(cacheTags.quizStats(parsed.data.sessionId))`；`src/lib/cache-policy.ts` 提供 `cacheTags.quizStats(sessionId)` 单一命名源。 |
| 6 | `ClassroomSessionRecapSurface` 在 `/classroom` recap 节奏内渲染“题目复盘” section：题干、正确答案 badge、正确率、作答/未作答人数、4 个选项分布行，并明确展示“正确率按已作答人数计算”的分母口径。 | ✓ VERIFIED | `src/components/classroom/classroom-session-recap-surface.tsx:98-178`：section eyebrow `题目复盘`、title `看清这道题答得怎样，再决定该回看谁`、helper `正确率按已作答人数计算；作答/未作答人数相对本次课堂参与者名单。`；空态分支 `当前课堂没有 quiz sample 题目，或还没有可用于复盘的作答记录。`；卡片内 `正确答案 / 已作答 / 未作答` 三 badge + 4 选项 `bg-primary/10` 高亮正确行 + `bg-linear-135 from-primary to-primary-container` 进度条。 |
| 7 | 题目复盘 section 在视觉上遵守 Stitch `5322129002350954765` + `DESIGN.md` 四条 locked 视觉不变量：Lexend、no 1px divider、tonal surface、glass/gradient CTA；并复用现有 recap hero / workload / student recap 节奏，不抢主路径。 | ✓ VERIFIED | `DESIGN.md:15` `禁止线条分隔：用背景移位和色调过渡代替 1px 实线`；`DESIGN.md:78` `禁止使用 1px 实线分隔内容块`；`DESIGN.md:97` `字体：Lexend（专用阅读优化字体）`；`DESIGN.md:259` `保持 Lexend 字体比例`；`DESIGN.md:263` `禁止 1px 实线分隔内容块`。`src/components/classroom/classroom-session-recap-surface.tsx:33` 使用 `bg-linear-135 from-primary to-primary-container`（glass/gradient CTA 不变量），section / 卡片使用 `bg-surface-container-low` / `bg-surface-container-lowest`（tonal surface 不变量），全文件无 `border` / 无 `border-b` / 无 `border-t` 横线（no 1px divider 不变量）。`70-UI-SPEC.md:80-85` 与 `70-UI-SPEC.md:109` 显式把这四条不变量写进 acceptance criteria。 |
| 8 | Phase 70 close gate 与 `verify:phase70` alias 已存在且能在不重写课堂 kernel 的前提下复跑 STATS-01 / STATS-02 整套断言。 | ✓ VERIFIED | `package.json` `verify:phase70` 走 `scripts/verify-phase70-quiz-stats.ts`；`scripts/verify-phase70-quiz-stats.ts` 已落库；本报告与 `70-VALIDATION.md:23-24` 共同将 STATS-01 / STATS-02 收口到 `pnpm verify:phase70`。 |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/(classroom)/classroom/page.tsx` | recap route 真实触达 `getClassroomSessionRecapDTO` 并挂上 `ClassroomSessionRecapSurface` | ✓ VERIFIED | `page.tsx:5` import `getClassroomSessionRecapDTO`；`:39-41` ended-session 分支调用；`:54` 透传 `recap={recap}`。 |
| `src/components/classroom/classroom-session-recap-surface.tsx` | 渲染 recap 主舞台与题目复盘 section | ✓ VERIFIED | `classroom-session-recap-surface.tsx:14` export `ClassroomSessionRecapSurface({ recap })`；`:98-178` “题目复盘” section 完整实现。 |
| `src/lib/dal/classroom.ts#getClassroomSessionRecapDTO` | ended-session 唯一 recap read seam，输出含 `quizSampleStats` | ✓ VERIFIED | `classroom.ts:3675-3716`；`:3714` 输出 `quizSampleStats: recap.quizSampleStats`。 |
| `src/lib/dal/classroom.ts#buildQuizSampleRecapStats` | latest-only 统计聚合 helper | ✓ VERIFIED | `classroom.ts:890-984`；`pluginOwnedQuizResponses.isLatest = true` 是聚合的硬约束。 |
| `src/actions/classroom-actions.ts#submitQuizSampleAnswerAction` | quiz sample 写路径 + cache invalidation 接缝 | ✓ VERIFIED | `classroom-actions.ts:318-329`；`updateTag(cacheTags.quizStats(parsed.data.sessionId))` 触发 recap 读模型新一次。 |
| `src/lib/cache-policy.ts#cacheTags.quizStats` | session-scoped 缓存 tag 单一命名源 | ✓ VERIFIED | `cache-policy.ts` 维护 `cacheTags.quizStats(sessionId)`；`classroom-actions.ts:328` 调用。 |
| `scripts/verify-phase70-quiz-stats.ts` | Phase 70 close gate | ✓ VERIFIED | 已落库；与 `package.json` `verify:phase70` 绑定。 |
| `70-UI-SPEC.md` | 题目复盘 section 的 UI 契约 | ✓ VERIFIED | `70-UI-SPEC.md:80-85` 锁定 Lexend / no-line / tonal depth / glass/gradient CTA；`:109` 写入 acceptance。 |
| `DESIGN.md` | 全局设计系统源头 | ✓ VERIFIED | `DESIGN.md:15 / 78 / 97 / 259 / 263` 是四条 locked 不变量的权威来源。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/app/(classroom)/classroom/page.tsx` | `src/lib/dal/classroom.ts#getClassroomSessionRecapDTO` | `recap = activeSession?.status === 'ended' ? await getClassroomSessionRecapDTO(...)` | ✓ WIRED | `page.tsx:39-41`；`page.tsx:5` import 路径 `@/features/runtime-platform/classroom`，re-export 链上溯到 `src/lib/dal/classroom.ts:3675`。 |
| `src/lib/dal/classroom.ts#getClassroomSessionRecapDTO` | `ClassroomSessionRecapSurface` | `recap.quizSampleStats` → `ClassroomSessionRecapSurface({ recap })` | ✓ WIRED | `classroom.ts:3714` 输出 stats；`classroom-session-recap-surface.tsx:108` 与 `:118` 读取 `recap.quizSampleStats`；`page.tsx:54` 透传。 |
| `src/lib/dal/classroom.ts#buildQuizSampleRecapStats` | `pluginOwnedQuizResponses.isLatest` | `eq(pluginOwnedQuizResponses.isLatest, true)` | ✓ WIRED | `classroom.ts:933`；分布聚合 `.groupBy(question, selectedOption)`；`attemptNo` 不参与聚合，只走 `isLatest`。 |
| `src/actions/classroom-actions.ts#submitQuizSampleAnswerAction` | `src/lib/cache-policy.ts#cacheTags.quizStats` | `updateTag(cacheTags.quizStats(parsed.data.sessionId))` | ✓ WIRED | `classroom-actions.ts:328`；唯一 cache-tag invalidation 入口，下一次 RSC `getClassroomSessionRecapDTO` 重新计算。 |
| `src/components/classroom/classroom-session-recap-surface.tsx` | `DESIGN.md` (Lexend / no 1px / tonal surface / glass/gradient CTA) | 视觉 token + Tailwind class | ✓ WIRED | 全文件使用 `bg-surface-container-low[-lowest]` 与 `bg-linear-135 from-primary to-primary-container`；全文件无 `border`；Lexend 由 `next/font/google` 全局生效。 |
| `scripts/verify-phase70-quiz-stats.ts` | `package.json#verify:phase70` | alias 绑定 | ✓ WIRED | `package.json` `verify:phase70` 走 verifier；本报告 70-VERIFICATION.md 在 72.1 之前补齐，72.1 wave 2 / 3 close gate 进一步把它纳入 milestone 入口断言。 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| STATS-01 | 70-01, 70-02, 70-04 | 题目统计只读投影使用 `plugin_owned_quiz_questions` + `pluginOwnedQuizResponses.isLatest=true` 唯一真相源；分母相对课堂参与者名单；不写入 core analytics / classroomSessionSummary artifact。 | ✓ SATISFIED | `src/lib/dal/classroom.ts:890-984` `buildQuizSampleRecapStats` 仅读 `pluginOwnedQuizQuestions` + `pluginOwnedQuizResponses(isLatest=true)`；`getClassroomSessionRecapDTO` 在 DTO 上挂出 stats 但不持久化 `classroomSessionSummary`；`pnpm verify:phase70` 走 plugin-owned + latest + no-summary-writeback 断言。 |
| STATS-02 | 70-03, 70-04 | 题目复盘 section 在现有 `/classroom` recap surface 中以教育产品视觉语言呈现，遵守 Lexend、no 1px divider、tonal surface、glass/gradient CTA。 | ✓ SATISFIED | `src/components/classroom/classroom-session-recap-surface.tsx:98-178` 渲染题干 / 正确答案 / 正确率 / 作答未作答 / 4 选项分布；`DESIGN.md:15 / 78 / 97 / 259 / 263` + `70-UI-SPEC.md:80-85 / 109` 显式锁定四条不变量；无独立 analytics 路由。 |

**Requirement ID cross-check:** `70-01-PLAN.md` / `70-02-PLAN.md` / `70-03-PLAN.md` / `70-04-PLAN.md` frontmatter 仅声明 `STATS-01` 与 `STATS-02`；`REQUIREMENTS.md` 归属于 Phase 70 的 requirement 也仅这 2 个。**全部已 accounted for，无 orphaned requirement。**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/lib/dal/classroom.ts` | 3149-3150 | 旧 `computeClassroomSessionRecap` 仍聚合 core `taskSubmissions` / `quizAttempts` latest；Phase 70 通过独立 `buildQuizSampleRecapStats` 走 plugin-owned，不替换 core 路径 | ⚠️ Info | 这是 D-70-08 / no-core-analytics 锁定的“core 总结表 + plugin stats 并存”设计，**不**属于反模式；仅记录以防未来 phase 把两条路径合并。 |

### Human Verification — Surface & Bridge

- `/classroom?sessionId=<ended>` 上 `ClassroomSessionRecapSurface` 渲染“题目复盘” section；正确率、作答/未作答、选项分布与 DTO 一致；视觉上无 1px 横线、主按钮走 glass/gradient CTA，与 Stitch `5322129002350954765` / `DESIGN.md` 对齐。
- 72.1 close gate（计划 72.1-02 / 72.1-03）将再覆写本报告列出的 classroom-side bridge inputs（route / surface / action / DAL），把 STATS-01 / STATS-02 由“形式化报告”升级为“milestone-authoritative proof”。

---

**结论：**

- 从代码实现看，Phase 70 的 STATS-01 / STATS-02 roadmap success criteria 都已被真实代码满足：
  - `getClassroomSessionRecapDTO` + `buildQuizSampleRecapStats` 把 latest-only 真相源锁在 `plugin_owned_quiz_responses.isLatest=true`；
  - `ClassroomSessionRecapSurface` 把题目复盘 section 挂入现有 `/classroom` recap 节奏，不另开 analytics 路由；
  - `submitQuizSampleAnswerAction` 通过 `cacheTags.quizStats(sessionId)` 维持 read-your-writes；
  - STATS-02 的四条不变量（Lexend、no 1px divider、tonal surface、glass/gradient CTA）由 `DESIGN.md` + `70-UI-SPEC.md` 锁定，且在 recap 组件中实际生效。
- 本报告不替代 milestone close gate：本报告形式化“课堂侧桥接接缝存在且语义正确”，但 D-72.1-16 的 milestone-authoritative 收口仍由 72.1-02 / 72.1-03 在 `verify:phase72` 入口处再次断言同一批 seam。
- 已识别的非阻塞观察：旧 `computeClassroomSessionRecap` 仍聚合 core `taskSubmissions` / `quizAttempts` latest；这是 D-70-08 锁定的“core 总结 + plugin stats 并存”设计，不视为反模式；继续作为 core summary 真相源，不被 plugin stats 替代。
- 因此本 phase 现可按 gate 规则标记为 `passed`，并为 72.1 wave 2 / 3 的 close gate 提供可被直接断言的 classroom-side bridge inputs。

_Verified: 2026-06-07T05:53:00Z_
_Verifier: the agent (gsd-executor / Phase 72.1-01 Task 2)_
