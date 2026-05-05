---
phase: 04-student-player-progress-submissions-and-feedback
reviewed: 2026-05-05T03:49:51Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - package.json
  - scripts/verify-phase4-learning.ts
  - src/actions/learning-actions.test.ts
  - src/actions/learning-actions.ts
  - src/app/(student)/student/page.tsx
  - src/app/(student)/student/player/page.tsx
  - src/app/(teacher)/teacher/review/page.tsx
  - src/components/learning/feedback-composer.test.ts
  - src/components/learning/feedback-composer.tsx
  - src/components/learning/quiz-step-card.tsx
  - src/components/learning/student-step-cards.test.ts
  - src/components/learning/task-step-card.tsx
  - src/components/learning/teacher-review-surface.test.ts
  - src/components/learning/teacher-review-surface.tsx
  - src/components/surfaces/player-surface.tsx
  - src/components/surfaces/student-dashboard-surface.tsx
  - src/components/surfaces/student-player-surfaces.test.ts
  - src/db/schema.learning.test.ts
  - src/db/schema.ts
  - src/lib/cache-policy.test.ts
  - src/lib/cache-policy.ts
  - src/lib/dal/learning.test.ts
  - src/lib/dal/learning.ts
  - src/lib/dto/learning.test.ts
  - src/lib/dto/learning.ts
findings:
  critical: 11
  warning: 4
  info: 0
  total: 15
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-05T03:49:51Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Phase 04 learning schema、DTO、DAL、Server Actions、学生播放器、教师复盘 UI、验证脚本和测试已按标准深度审查。实现存在多处会导致权限绕过、错误页面、错误学习状态、反馈无法完成、历史记录缺失和数据一致性破坏的问题，当前不应发布。

## Critical Issues

### CR-01: BLOCKER — 普通 `stepId` URL 参数被当作“老师指定”强制步骤

**File:** `src/app/(student)/student/player/page.tsx:15-17`, `src/lib/dal/learning.ts:321-349`, `src/components/surfaces/player-surface.tsx:169-178`

**Issue:** 播放器把学生点击步骤链接产生的 `stepId` 直接作为 `forcedStepId` 传入 DAL。结果是任何学生自主导航都会被标记为 `老师指定`，`runtime.locked` 也变成 `true`，与 Phase 04 “仅预留老师指定显示、Phase 05 才接入 SSE 强制步骤”相冲突。

**Fix:** 将学生当前选中步骤与教师强制步骤拆成两个字段，例如：

```ts
const player = lessonId
  ? await getStudentPlayerDTO({ lessonId, selectedStepId: params?.stepId ?? null, forcedStepId: null })
  : null;
```

并在 DTO 中用 `selectedStepId` 决定当前步骤，只允许可信 classroom runtime 来源设置 `forcedStepId`。

### CR-02: BLOCKER — 学习写入未校验 `publishedVersionId` / `stepId` 属于已授权课时

**File:** `src/lib/dal/learning.ts:363-396`, `src/lib/dal/learning.ts:440-445`

**Issue:** `markStepProgress()`、`submitTaskAttempt()`、`submitQuizAttempt()` 只校验 `lessonId` 可访问，却信任客户端传入的 `publishedVersionId` 和 `stepId`。攻击者可构造跨版本、跨课时或错误 step type 的写入，污染进度/提交表。

**Fix:** `assertStudentCanAccessLesson()` 返回当前 published version 后，强制比较 `payload.publishedVersionId === published.id`，并从 published snapshot 解析步骤，确认 `step.id === payload.stepId` 且 step type 匹配当前 mutation。

### CR-03: BLOCKER — 重试和正确答案揭示策略被硬编码为允许

**File:** `src/lib/dal/learning.ts:108`, `src/lib/dal/learning.ts:125-126`, `src/lib/dal/learning.ts:351-354`, `src/lib/dal/learning.ts:454`

**Issue:** `canRetryTask`、`canRetryQuiz` 固定为 `true`，`showCorrectAnswer` 只要存在正确答案就为 true。这绕过了 Phase 决策中“重试策略和正确答案揭示由教师配置、服务端 DTO 控制”的要求，学生会获得无限重试和不应公开的正确答案。

**Fix:** 从已发布 snapshot 的 step payload 中读取显式配置，例如 `retryPolicy` / `allowRetry` / `revealCorrectAnswer`，并在 DAL 写入前校验尝试次数；默认应保守为不允许重试、不揭示答案。

### CR-04: BLOCKER — 不可访问课时会抛到 Next error page，而不是统一不可学习状态

**File:** `src/app/(student)/student/player/page.tsx:15-17`, `src/app/(teacher)/teacher/review/page.tsx:23`

**Issue:** DAL 对未发布、缺失或未授权课时会 throw，但页面没有 catch。学生打开非法 `lessonId` 时不会看到 `课时暂不可学习`，而是进入框架错误页；教师复盘非法 `lessonId` 同样会崩溃。

**Fix:** 在 route 层捕获 DAL 错误并返回安全 DTO/null：

```ts
let player = null;
try {
  player = lessonId ? await getStudentPlayerDTO({ lessonId, forcedStepId: null }) : null;
} catch {
  player = null;
}
```

教师页面也应渲染复盘空状态，而不是让错误泄漏到 error boundary。

### CR-05: BLOCKER — 学生可通过 Server Action 直接写入 `skipped` 状态

**File:** `src/lib/dto/learning.ts:141-146`, `src/lib/dal/learning.ts:363-382`

**Issue:** `MarkProgressInputSchema` 允许所有 `ProgressState`，包括 `skipped`。UI 暂未暴露跳过按钮，但 Server Action 可被直接调用，学生可自行跳过步骤，违反“`已跳过` only when server permits”。

**Fix:** 对学生进度动作使用更窄 schema，例如只允许 `in_progress | completed`；若未来支持跳过，必须由服务端根据课堂/教师策略判定。

### CR-06: BLOCKER — 教师学生详情未校验学生属于该课时/课程范围

**File:** `src/lib/dal/learning.ts:607-612`, `src/lib/dal/learning.ts:544-546`

**Issue:** `getTeacherStudentReviewDTO()` 在校验教师可访问课时后，直接用任意 `studentId` 查询 `users` 和学习记录，没有确认该学生在课程或关联班级中。知道用户 ID 的教师可探测不属于该课时的学生姓名和可能的学习数据。

**Fix:** 在构建详情前复用 `getLessonStudentIds(course.id)`，拒绝不在 roster 中的 `studentId`。

### CR-07: BLOCKER — 教师反馈 UI 固定优先任务，导致测验待反馈无法处理

**File:** `src/components/learning/teacher-review-surface.tsx:45-51`, `src/components/learning/teacher-review-surface.tsx:116-120`

**Issue:** 如果学生既有任务又有测验，`feedbackTarget` 永远选择最新任务；即使测验缺反馈、任务已反馈，composer 仍指向任务，教师无法对测验提交反馈，`needsFeedback` 可能永远无法清掉。

**Fix:** 为每条 latest evidence 单独渲染反馈入口，或优先选择第一个缺反馈的 latest task/quiz。

### CR-08: BLOCKER — 教师“历史尝试”实际只展示 latest 记录

**File:** `src/lib/dal/learning.ts:547-552`, `src/components/learning/teacher-review-surface.tsx:100-109`, `src/lib/dto/learning.ts:150-158`

**Issue:** Teacher review DTO 只包含 `latestTaskSubmissions` 和 `latestQuizAttempts`，DAL 查询也过滤 `isLatest = true`。UI 的“历史尝试”把 latest 数组当历史展示，无法满足“attempt history preserved and visible”的需求。

**Fix:** DTO 增加 `taskSubmissionHistory` / `quizAttemptHistory`，DAL 查询不带 `isLatest` 的历史列表并按 `attemptNo` 排序；UI 历史区使用完整历史。

### CR-09: BLOCKER — 客户端提交/反馈成功后不刷新或合并返回数据，UI 立即陈旧

**File:** `src/components/learning/task-step-card.tsx:45-48`, `src/components/learning/quiz-step-card.tsx:58-60`, `src/components/learning/feedback-composer.tsx:28-30`

**Issue:** Client component 调用 Server Action 后只设置 status/清空输入，没有 `router.refresh()`，也没有把返回的 attempt/feedback 合并到本地 latest/history。页面会继续显示旧的“最近一次尝试”或“老师还没有留下反馈”，与“成功后立即可见”冲突。

**Fix:** 成功后调用 `useRouter().refresh()`，或维护本地 optimistic/latest state 并同步 action 返回值。

### CR-10: BLOCKER — latest/progress 写入缺少唯一约束，竞态会产生多个 latest 或重复进度

**File:** `src/db/schema.ts:254-315`, `src/db/schema.ts:318-345`, `src/lib/dal/learning.ts:368-383`, `src/lib/dal/learning.ts:398-431`, `src/lib/dal/learning.ts:457-491`

**Issue:** `lessonStepProgress` 没有 `(publishedVersionId, stepId, studentId)` unique；attempt 表也没有约束每个 `(publishedVersionId, stepId, studentId, attemptNo)` 唯一或同一 identity 只能一个 latest。并发提交会读到相同 previous，插入重复 `attemptNo` 或多个 `isLatest=true`。

**Fix:** 增加数据库唯一约束/唯一索引，并用事务内原子 upsert/冲突处理保证进度 identity 和 latest marker 不被竞态破坏。

### CR-11: BLOCKER — 进度更新未失效教师复盘缓存

**File:** `src/actions/learning-actions.ts:56-61`

**Issue:** `markStepProgressAction()` 只更新 `progress:${lessonId}:${studentId}`，没有更新 `teacher-review:${lessonId}`。教师复盘依赖学生进度计数和状态，学生完成阅读后教师端会保持陈旧。

**Fix:** 成功更新进度后同步调用：

```ts
updateTag(cacheTags.teacherReview(parsed.data.lessonId));
```

## Warnings

### WR-01: WARNING — `attemptFeedback.targetId` 没有真实外键或唯一约束

**File:** `src/db/schema.ts:348-369`

**Issue:** feedback 通过 polymorphic `targetType + targetId` 指向任务/测验尝试，但数据库无法 cascade delete，也无法强制每个 target 只有一条反馈。代码层 `findFirst` 不能防并发重复。

**Fix:** 拆成 `taskSubmissionFeedback` / `quizAttemptFeedback` 两张表并添加外键 cascade 与 target unique；或至少添加唯一索引并实现清理策略。

### WR-02: WARNING — Phase 04 测试和验证大多是源码字符串断言，无法发现行为级缺陷

**File:** `src/lib/dal/learning.test.ts:5-61`, `src/actions/learning-actions.test.ts:5-30`, `scripts/verify-phase4-learning.ts:53-90`

**Issue:** 测试只检查源码包含某些 token，例如 `isLatest: 1`、`safeParse`、中文 copy。上述权限、URL forced step、历史记录缺失、陈旧 UI 都能通过这些测试。

**Fix:** 增加带 mock DB/session 的行为测试：未授权 step/version 写入应拒绝、invalid lesson route 应返回 inaccessible、teacher history 应包含多次 attempt、成功 action 后 UI 应刷新或展示返回数据。

### WR-03: WARNING — 教师学生详情进度未按全部步骤归一化

**File:** `src/lib/dal/learning.ts:544-571`, `src/components/learning/teacher-review-surface.tsx:60-70`

**Issue:** 学生详情只返回已有 progress rows，未开始步骤不会出现在 `progress` 中；UI 可能显示 `0/0 已完成` 和 `暂无学生数据`，而不是该课时全部步骤的 `未开始` 状态。

**Fix:** 像学生播放器一样基于 published snapshot steps 生成完整 progress DTO，缺失记录填充 `not_started`。

### WR-04: WARNING — Server Action 的 FormData 归一化无法承载结构化 task/quiz payload

**File:** `src/actions/learning-actions.ts:28-34`, `src/lib/dto/learning.ts:127-139`

**Issue:** `normalizeInput()` 对 FormData 使用 `Object.fromEntries()`，结构化 `payload` / `answer` 会变成字符串；当前 client 直接传对象所以暂时可用，但一旦改成表单提交，DTO 会保存字符串而不是预期对象。

**Fix:** 为 FormData 明确解析 JSON 字段，或保持 task/quiz 只接受 typed object 调用并为表单 action 单独定义 schema。

---

_Reviewed: 2026-05-05T03:49:51Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
