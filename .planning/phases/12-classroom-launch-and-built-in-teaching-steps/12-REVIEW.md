---
phase: 12-classroom-launch-and-built-in-teaching-steps
reviewed: 2026-05-08T22:32:32Z
depth: deep
files_reviewed: 26
files_reviewed_list:
  - package.json
  - scripts/bootstrap-dev-db.ts
  - scripts/verify-phase12-launch-and-builtins.ts
  - src/actions/plugin-actions.ts
  - src/app/(classroom)/classroom/page.tsx
  - src/app/(teacher)/teacher/launch/page.tsx
  - src/app/(teacher)/teacher/layout.tsx
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/classroom/classroom-launch-panel.tsx
  - src/components/classroom/classroom-launch-preview.tsx
  - src/components/learning/student-step-cards.test.ts
  - src/components/learning/teacher-review-surface.test.ts
  - src/components/plugins/plugin-renderer.tsx
  - src/components/plugins/widgets/built-in-teaching-step-suggestion-widget.tsx
  - src/components/plugins/widgets/built-in-teaching-step-template-widget.tsx
  - src/components/plugins/widgets/index.tsx
  - src/components/shell/sidebar.tsx
  - src/components/surfaces/classroom-console-surface.tsx
  - src/components/surfaces/classroom-launch-surface.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/components/surfaces/student-player-surfaces.test.ts
  - src/lib/dal/classroom.ts
  - src/lib/dal/plugins.ts
  - src/lib/dto/classroom.ts
  - src/lib/dto/resource-ai.ts
  - src/server/plugins/registry.ts
findings:
  critical: 4
  warning: 1
  info: 0
  total: 5
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-08T22:32:32Z
**Depth:** deep
**Files Reviewed:** 26
**Status:** issues_found

## Summary

本次审查覆盖了 Phase 12 全量变更源码，并重点追查了 12-04 的 launch / built-in teaching step 链路、权限边界和回归风险。

结论：**存在 4 个 BLOCKER 与 1 个 WARNING**。其中包含一个明确的数据越权问题、两个 built-in 插件链路失效/绕过配置问题，以及一个会把教师带回错误 live classroom 的回归 bug。当前不应按“可发布”判定。

## Critical Issues

### CR-01: `getClassroomConsoleDTO()` 未按教师学校范围过滤已发布课时与班级

**Classification:** BLOCKER

**File:** `src/lib/dal/classroom.ts:259-295`
**Issue:** 该函数先通过 `assertActiveTeacher()` 取得教师 scope，但随后直接读取全部 `published` lessons、全部 `classes`、全部 `courseClasses`，没有任何 `schoolId`/teacher scope 过滤。结果是 `/teacher/launch` 和 `/classroom` 可向当前教师暴露其他学校的已发布课时与班级名称，属于跨学校数据泄露。
**Fix:** 只查询 `scope.schoolIds` 内的数据，至少按 `courses.schoolId` / `classes.schoolId` 做 join 过滤，再生成 `publishedLessons`。

```ts
const scopedCourses = await db.query.courses.findMany({
  where: inArray(courses.schoolId, scope.schoolIds),
});

const scopedCourseIds = scopedCourses.map((course) => course.id);
const publishedLessonsRows = scopedCourseIds.length
  ? await db.query.lessons.findMany({
      where: and(eq(lessons.status, "published"), inArray(lessons.courseId, scopedCourseIds)),
    })
  : [];

const classesRows = await db.query.classes.findMany({
  where: inArray(classes.schoolId, scope.schoolIds),
});
```

### CR-02: 开课成功后固定跳转 `/classroom`，多 live session 时会落到错误课堂

**Classification:** BLOCKER

**File:** `src/components/classroom/classroom-launch-panel.tsx:57-60`
**Issue:** `launchClassroomSessionAction()` 成功后已经返回新 session 的 snapshot，但组件忽略 `sessionId`，始终 `router.push(successHref)`。而 `/classroom` 页在没有 query 参数时会回退到第一条 live session（`src/app/(classroom)/classroom/page.tsx:12-15`），因此教师在已有 live classroom 时，新开课堂后可能被带回旧课堂，属于直接的流程错误回归。
**Fix:** 跳转时携带新建 sessionId，而不是裸跳 `/classroom`。

```tsx
if (result.ok) {
  const sessionId = (result.data as { sessionId?: string })?.sessionId;
  if (successHref && sessionId) {
    router.push(`${successHref}?sessionId=${sessionId}`);
    return;
  }
}
```

### CR-03: built-in 插件 seed 仍声明旧 action，12-04 的 typed built-in proposal 链路实际不可达

**Classification:** BLOCKER

**File:** `scripts/bootstrap-dev-db.ts:78-80,91-93,104-106,117-119,130-132`
**Issue:** 五个 built-in teaching step 的 manifest 仍只声明 `actions: ["addStepSuggestion"]`，但 12-04 新增的安全链路实际依赖 `suggestBuiltInTeachingStep` / `insertBuiltInTeachingStepTemplate`。`runPluginHook()` 会校验 manifest.actions，导致 `getBuiltInTeachingStepTemplateForSchool()` 中的模板 action 在真实 seeded records 上被直接拒绝（见 `src/lib/dal/plugins.ts:449-461`）。这意味着 12-04 声称新增的 typed built-in widget/template 通路在真实数据上并不工作。
**Fix:** 把 built-in manifests 升级为显式声明新的 first-party actions，并补一个执行级测试而不是只改 DTO/registry 常量。

```ts
actions: [
  "suggestBuiltInTeachingStep",
  "insertBuiltInTeachingStepTemplate",
],
```

### CR-04: 作者编排区直接硬编码 built-in 定义，绕过插件启停控制

**Classification:** BLOCKER

**File:** `src/components/authoring/lesson-authoring-workspace.tsx:16-19,80-84,120-128,208-218`
**Issue:** 作者编排页直接从 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 静态导入并渲染五个按钮，点击后直接调用 `addLessonStepAction()`。这完全绕过了 plugin registry / DAL / enabled state，因此即使实验室里把某个系统内置环节停用，教师仍然可以继续插入该环节。Phase 12-03 明确建立了“可停用但不可删除”的 built-in contract，这里被前端硬编码直接绕过了。
**Fix:** 按学校从 DAL/Server Action 拉取“当前启用”的 built-in templates，再据此渲染按钮；禁用项不得出现在 quick-add 中。

```tsx
const templates = await listBuiltInTeachingStepTemplatesAction({ schoolId });

{templates.map((template) => (
  <Button key={template.pluginId} onClick={() => addBuiltInStep(template)}>
    {template.pluginName}
  </Button>
))}
```

## Warnings

### WR-01: Phase 12 回归测试基本都是字符串匹配，无法拦截本次发现的真实行为问题

**Classification:** WARNING

**File:** `src/lib/dal/classroom.test.ts:10-45`, `src/actions/classroom-actions.test.ts:8-26`, `src/lib/dal/plugins.test.ts:8-61`, `scripts/verify-phase12-launch-and-builtins.ts:44-101`
**Issue:** 当前测试与 verifier 主要验证“源码里是否出现某段字符串”，不会真实执行 DAL / Server Action / route 逻辑，因此无法发现：跨学校数据泄露、launch 后跳错 session、built-in manifest/action 不匹配、禁用 built-in 仍可插入等问题。测试存在明显可靠性缺口。
**Fix:** 至少补 4 类行为测试：

```ts
// 1. getClassroomConsoleDTO 只返回 scope.schoolIds 内的数据
// 2. launchClassroomSessionAction 成功后返回的 sessionId 会被用于跳转
// 3. disabled built-in plugin 不出现在 authoring quick-add
// 4. seeded built-in plugin 能真实通过 insertBuiltInTeachingStepTemplate hook
```

---

_Reviewed: 2026-05-08T22:32:32Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
