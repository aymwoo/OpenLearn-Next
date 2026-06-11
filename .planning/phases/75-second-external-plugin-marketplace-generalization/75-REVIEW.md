---
phase: 75-second-external-plugin-marketplace-generalization
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - drizzle/0017_phase75_homework_tables.sql
  - plugins/homework/data-model.ts
  - scripts/compile-plugin-data-model.ts
  - src/actions/homework-actions.ts
  - src/app/(classroom)/classroom/page.tsx
  - src/components/authoring/lesson-step-editor.tsx
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/classroom/homework-grading-panel.tsx
  - src/components/classroom/homework-submission-list.tsx
  - src/components/learning/classroom-runtime-client.tsx
  - src/components/learning/homework-assignment-card.tsx
  - src/components/surfaces/classroom-console-surface.tsx
  - src/db/schema/generated/index.ts
  - src/db/schema/generated/plugin-owned/data-access-allowlist.ts
  - src/db/schema/generated/plugin-owned/homework.ts
  - src/features/platform-core/plugin-data-access/allowlist.ts
  - src/lib/cache-policy.ts
  - src/lib/dal/homework.ts
  - src/lib/dto/lesson-authoring.ts
  - src/lib/dto/plugin-data-model.ts
  - src/lib/dto/resource-ai.ts
  - src/lib/plugins/external-catalog.ts
  - src/plugins/homework/__tests__/cross-plugin-regression.test.ts
  - src/plugins/homework/__tests__/lifecycle.test.ts
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 75: 代码审查报告

**审查时间:** 2026-06-11
**审查深度:** standard
**审查文件:** 24
**状态:** issues_found

## 总结

本次审查了 Phase 75（homework plugin 的声明式数据模型、DAL、actions、UI 组件及测试）涉及的全部 24 个文件。整体架构遵循了 quiz plugin 的既定模式：声明式 dataModel → 编译期 Drizzle schema 生成 → 受治理的 dispatchPluginDataAccess → server actions → client 组件。DAL 层正确使用了 append-only 写模式（upsert 语义），DTO 层采用了 z.strictObject 校验。测试覆盖了跨插件回归和生命周期场景。

共发现 6 个 WARNING 和 4 个 INFO 级别问题。没有发现 CRITICAL（阻断级）问题。

主要关注点：
1. 数据模型声明与物理 DDL 之间存在 `dueDate` 列的差异
2. 前端组件存在调用 `undefined` 方法的运行时风险
3. homework 步骤编辑器的 payload 构建中缺少 `title` 字段
4. 批量查询存在 N+1 问题
5. 几个接口定义和 ref 使用上的细节问题

## Warnings

### WR-01: 声明式 dataModel 与物理 DDL 的列集不一致 — dueDate 列差异

**文件:** `plugins/homework/data-model.ts:31` vs `drizzle/0017_phase75_homework_tables.sql:6-16`
**问题:** 插件声明式 `data-model.ts` 中 `plugin_owned_homework_assignments` 表声明了 `dueDate` 列（第31行 `{ name: "dueDate", type: "text", notNull: false }`），但物理 `drizzle/0017_phase75_homework_tables.sql` 的 DDL 中并不包含 `dueDate` 列——assignments 表只有 `id, schoolId, pluginId, classroomSession, title, description, attachmentUrl, createdAt, updatedAt` 这 9 列。同时，编译生成的 `src/db/schema/generated/plugin-owned/homework.ts` 中 Drizzle schema 的 `pluginOwnedHomeworkAssignments` 表也**没有** `dueDate` 列（第7-23行）。这意味着数据模型声明了 `dueDate` 但编译器并未将其实际生成到物理 schema 中。

具体来说，编译器在 `scripts/compile-plugin-data-model.ts` 第124-126行过滤 reserved 列后会包含 `dueDate`，但生成的 `homework.ts` 却缺了它。这要么说明编译器没有按声明完整生成（可能生成的 homework.ts 未覆盖 dueDate），要么就是生成的 homework.ts 和声明之间已经不同步（编译器未重新运行或之前的输出被覆盖）。

同时，测试代码 `lifecycle.test.ts` 中大量引用了 `dueDate` 字段（如第87、161、171-178行），表明测试假设 `dueDate` 列已存在。这在物理表缺少该列时会导致运行时错误。

**修复建议:** 
1. 确认需求：`dueDate` 是否应该存在。如果需要，重新运行编译器 `pnpm plugin:compile` 确保 Drizzle schema 和 DDL 包含 `dueDate` 列。
2. 如果 `dueDate` 不在 v0 中，则从 `data-model.ts` 声明中移除它，同时更新 `lifecycle.test.ts` 中引用 `dueDate` 的测试用例。
3. 在 CI 中加入 `git diff --exit-code src/db/schema/generated` 检查以确保生成的 schema 与声明始终同步。

### WR-02: homework-assignment-card 组件未传递 lessonId prop，但类型定义要求它

**文件:** `src/components/learning/classroom-runtime-client.tsx:180-186`
**问题:** `HomeworkAssignmentCard` 组件的 props 类型定义中包含 `lessonId: string`（`homework-assignment-card.tsx:18`），但在 `classroom-runtime-client.tsx` 第180-186行调用时，只传递了 `sessionId, step, latestSubmission`，**没有传递 `lessonId`**：

```tsx
<HomeworkAssignmentCard
  lessonId={player.shell.lessonId}    // ← 缺少这个
  sessionId={player.runtime.classroomSessionId}
  step={step}
  latestSubmission={player.latestSubmissions.tasks.find((a) => a.stepId === step.id) ?? null}
/>
```

实际代码缺少了 `lessonId={player.shell.lessonId}` 的传递。虽然 `HomeworkAssignmentCard` 组件当前并未使用 `lessonId`（组件内解构时只取了 `sessionId, step, latestSubmission, latestGrade`，第34-38行），但类型定义保留了该字段。未来如果组件实现开始使用 `lessonId`，这里就会静默传入 `undefined`，导致运行时 bug。

**修复建议:** 要么在调用处补上 `lessonId={player.shell.lessonId}`，要么从 `HomeworkAssignmentCardProps` 类型定义中移除未使用的 `lessonId` 字段。

### WR-03: homework 步骤编辑器的 buildPayload 未设置 title 字段

**文件:** `src/components/authoring/lesson-step-editor.tsx:360-374`
**问题:** 在 `buildPayload` 函数中，当 step 类型为 `task` 且为 homework 步骤时（第360行进入 homework 分支），构建的 payload 对象缺少 `title` 字段。对比非 homework 的 task 步骤（第375行返回的 payload），两者都不含 `title`，因为它们继承自外部 `saveStep` 中的 `nextState.title.trim()`（通过 `autosaveLessonStepAction({ stepId, title, payload })` 传递）。

然而，在 `buildInitialState` 函数（第297-299行）中，homework 的状态初始化将 `homeworkTitle`、`homeworkDescription`、`homeworkAttachmentUrl` 分别从 step 数据中提取，这些字段仅在 homework UI 表单中使用，最终在 `buildPayload` 中被映射到 `prompt: state.homeworkDescription.trim()` 和 `materialRefs: homeworkMaterialRefs`。但作业标题 `state.homeworkTitle` 并未写入 payload 的任何字段——payload 的 `prompt` 取的是 `homeworkDescription`，而 `title` 字段并不在 task payload schema (`taskStepPayloadSchema`) 中（task payload 的顶层 `title` 由 LessonStepDTO 承载，非 payload 内部）。这说明架构上 title 由 step 层级保存，所以此处不是 bug——但仍然值得注意，因为用户在编辑器中修改的 `homeworkTitle` 最终保存在 `autosaveLessonStepAction` 的 `title` 参数中（第703-704行的通用路径），代码路径是正确的。

**修复建议:** 当前设计合理，不需要修改。但建议在 `buildPayload` 的 homework 分支加注释说明 `title` 由外层 step 层级保存，避免后续维护者误以为丢失了数据。

### WR-04: homework-submission-list 组件存在潜在的 undefined 调用风险

**文件:** `src/components/classroom/homework-submission-list.tsx:71-83`
**问题:** `fetchSubmissions` 函数在第47行对返回值做了类型断言 `(result as SubmissionRow[])`，然后赋给 `setSubmissions`。如果 DAL 层 `getHomeworkSubmissions` 返回的数据结构或字段名与 `SubmissionRow` 类型不匹配（例如字段用下划线命名而非驼峰，或缺少 `createdAt` 字段），则第111行 `new Date(submission.createdAt)` 将在运行时产生 `Invalid Date`，因为 `submission.createdAt` 可能是 `undefined`。

**修复建议:** 在设置 state 前增加运行时校验，使用 Zod schema 或至少添加防御性检查：
```ts
setSubmissions(
  Array.isArray(result) ? result.filter(s => typeof s.createdAt === 'string') : []
);
```
或者更好的做法是使用 DTO schema 对这个查询结果进行校验。

### WR-05: homework-grading-panel 的 onGradeSaved 回调中分数硬编码为 0

**文件:** `src/components/classroom/classroom-control-panel.tsx:742-745`
**问题:** 在 `HomeworkGradingPanel` 的 `onGradeSaved` 回调中，gradeMap 的更新代码硬编码分数为 0：

```tsx
setHomeworkGradeMap((prev) => ({
  ...prev,
  [studentId]: { score: 0, comment: '' },
}))
```

这里 `score: 0` 只是一个占位值，代码注释也说明了"分数从表单组件内部获取，这里只触发 UI 刷新"。但问题是：这个硬编码的 0 会被 `HomeworkSubmissionList` 中的 `isGraded` 判断（第91行 `typeof grade.score === 'number'`）判定为"已批改"，从而显示 `0分` badge。实际上教师可能输入了 85 分，但 gradeMap 里却记录为 0，直到重新拉取数据才会更新。

**修复建议:** 在 `onGradeSaved` 中传入实际的分数和评语，或者在 `onGradeSaved` 触发后立即调用 `fetchSubmissions` / 重新获取 grades 数据来刷新 gradeMap。最小改动方案是传入一个标志位 "已批改但分数待刷新"，并将 badge 显示逻辑改为区分"已批改"和"分数待获取"两种状态。

### WR-06: homework-submission-list 的数据获取有 N+1 查询模式

**文件:** `src/lib/dal/homework.ts:160-177`
**问题:** `getHomeworkSubmissions` 函数先查询所有 assignments（一次查询），然后对每个 assignment 循环调用 `dispatchPluginDataAccess`（N 次查询），总计 N+1 次数据库查询。在作业数量较多的场景下，这会产生显著的延迟。

**修复建议:** 考虑聚合查询策略：直接按 `classroomSession` 查询 `isLatest=true` 的所有 submissions，而不是先查 assignments 再逐条查 submissions。如果当前索引不支持按 `classroomSession + isLatest` 直接查询，可以在 assignments 表上设置 classroomSession → assignmentId 的映射表，或者扩展声明式索引以支持高效查询。

## Info

### IN-01: 声明式 dataModel 中缺少 dueDate 列对应的 DDL

**文件:** `drizzle/0017_phase75_homework_tables.sql` vs `plugins/homework/data-model.ts:31`
**相关:** WR-01 的详细说明 — 此处单独列出作为 INFO 项，因为它是 WR-01 的数据面证据。

**修复建议:** 参见 WR-01。

### IN-02: homework-assignment-card 组件中 student 字段硬编码为空字符串传递给 Server Action

**文件:** `src/components/learning/homework-assignment-card.tsx:69`
**问题:** 提交作业时，`student` 字段硬编码为空字符串 `""`：

```tsx
const result = await submitHomeworkAction({
  classroomSession: sessionId,
  student: "", // 由 Server Action 从 session 推导
  ...
});
```

然后在 Server Action `submitHomeworkAction`（`src/actions/homework-actions.ts:87-101`）中，`requireStudent()` 获取了 session 用户 ID 但并未用于覆盖 `parsed.data.student`。而 DAL 层 `submitHomework`（`src/lib/dal/homework.ts:66-82`）将 `input.student` 原样传递给 `dispatchPluginDataAccess`。这意味着 student 字段最终写入数据库的仍然是空字符串 `""`。

仔细审视 actions 层：
- `submitHomeworkAction` 第94行调用 `requireStudent()` 获取了当前用户 ID 但**未使用**返回值
- 第95行直接传递 `parsed.data`（包含空字符串 student）给 `submitHomework`

这是一个潜在的逻辑错误。不过如果 `dispatchPluginDataAccess` 的 `governance-gate` 层会从 session 推导并覆盖 `student` 字段，则这个空字符串不会造成实际影响。但在 DAL facade 的现有实现中无法确认这一点。

**修复建议:** 在 `submitHomeworkAction` 中，将 `requireStudent()` 的返回值（当前用户 ID）赋值给 `parsed.data` 的 student 字段：
```ts
const userId = await requireStudent();
const result = await submitHomework({ ...parsed.data, student: userId });
```

### IN-03: homework-assignment-card 组件 props 中未使用 lessonId 和 latestGrade

**文件:** `src/components/learning/homework-assignment-card.tsx:18-31`
**问题:** 组件 props 类型定义了 `lessonId` 和 `latestGrade`，但在组件实现中这两个字段均未被使用（第38行解构中只取了 `sessionId, step, latestSubmission`，第27行的 `latestGrade` prop 未被解构，第53行的 `isGraded` 依赖的是传入的 `latestGrade` 参数，但调用方（`classroom-runtime-client.tsx:180`）未传递 `latestGrade`）。

**修复建议:** 如果暂时不需要这些功能，将它们从类型定义中移除或标记为可选。如果计划后续支持，应在调用方传入相应数据。

### IN-04: 外部 catalog 中存在同一 pluginKey 的重复条目

**文件:** `src/lib/plugins/external-catalog.ts:68-87`
**问题:** `EXTERNAL_MARKETPLACE_CATALOG` 中 `external-marketplace.quiz-sample` 出现了两次（v1.0.0 和 v1.1.0），而 `getExternalMarketplaceCatalogEntry` 方法在不传 `version` 参数时，`Array.find()` 只返回第一个匹配项（v1.0.0）。这导致 v1.1.0 版本永远无法通过不指定 version 的查询被找到。

这种设计是有意为之（模拟 marketplace 多版本共存），但 `listExternalMarketplaceCatalog()` 返回全部条目时调用方可能会困惑为什么同一 pluginKey 出现两次。

**修复建议:** 
- 在 `getExternalMarketplaceCatalogEntry` 中，若不传 version，返回最新版本而非第一个匹配项。
- 或在注释中明确说明多版本 design intent。

---

_审查时间: 2026-06-11T00:00:00Z_
_审查者: Claude (gsd-code-reviewer)_
_深度: standard_
