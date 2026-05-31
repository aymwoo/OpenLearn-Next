# Phase 17: Teacher flow editor enhancement - Research

**Created:** 2026-05-10  
**Status:** Complete  
**Confidence:** HIGH

## Executive summary

Phase 17 应该继续沿用现有 `course-aware editor entry -> lesson-authoring DAL ->
lesson-authoring actions -> cache tags` 主链路，而不是新建平行 editor 子系统。
真正缺失的是三类能力：

1. **步骤来源与 readiness contract** —— 当前 built-in teaching-step 进入 lesson 后丢失插件来源，
   导致无法做“插件不可用”阻断检查。
2. **真实 preview path** —— 当前 `预览课堂` 只是按钮文本，没有 teacher-side draft preview route/panel。
3. **结构化 publish gate** —— 当前 `AuthoringStatusPanel` 只做最小字段检查，服务端 publish 也未复用更强的 readiness 规则。

## Existing code facts

- `src/app/(teacher)/teacher/editor/page.tsx` 已经是显式 `courseId` + `lessonId` 的
  course-aware 入口，且会按课程范围读取 lesson 与 built-in templates。
- `src/components/authoring/lesson-authoring-workspace.tsx` 已支持：
  - 新增 `content` / `task` / `quiz`
  - 内置教学环节 quick add
  - 复制 / 归档 / 上移 / 下移
  但仍停留在“资源栏 + 流程卡片 + 基础步骤编辑器”的初级组合。
- `src/components/authoring/lesson-step-editor.tsx` 已能通过
  `autosaveLessonStepAction` 保存结构化 payload，但没有显式的 built-in source
  展示，也没有将 payload validity / publish readiness 与外层状态面板打通。
- `src/components/authoring/authoring-status-panel.tsx` 当前只检查：
  `lesson title`、`objective`、`至少一个未归档步骤`。
- `src/lib/dal/plugins.ts` 已能返回当前学校启用的 built-in teaching-step templates，
  且 built-in plugin 仍然通过安全 hook/action allowlist 产出模板。
- `src/lib/dto/resource-ai.ts` 已定义 `BuiltInTeachingStepTemplatePayload`、
  `builtInKey` 与 `pluginName`，但这些元数据在步骤真正写入 lesson 后没有被保留。

## Recommended implementation shape

### 1. Preserve built-in provenance inside lesson step payloads

在 `src/lib/dto/lesson-authoring.ts` 为 `content` / `task` / `quiz` payload 增加可选的
`builtInSource` 元数据，例如：

- `pluginId`
- `builtInKey`
- `pluginName`

这样 built-in step 一旦加入 lesson flow，后续 preview / readiness / UI badge 都能知道
该步骤来自哪个系统内置插件。

### 2. Add a server-side readiness + preview layer inside lesson authoring DAL

推荐在 `src/lib/dal/lesson-authoring.ts` 新增两类函数：

- `getLessonPublishReadinessDTO()`
- `getTeacherLessonPreviewDTO()`

它们都应复用当前 teacher-owned scope、课程/课时读取与步骤排序，但职责不同：

- **readiness**：检查缺失标题、缺失目标、无有效步骤、payload schema 问题、
  built-in source 对应插件不可用等阻断项。
- **preview**：按当前草稿状态构造一个 teacher preview DTO，供 `/teacher/editor/preview`
  或 editor preview panel 使用，而不是要求先发布再走 student player snapshot。

### 3. Keep publish enforcement on the same server path

`publishLesson()` / `publishLessonAction()` 应在真正生成 published snapshot 之前先运行
readiness helper。这样 Phase 17 的 publish gate 既有 UI 提示，也有服务端硬阻断，满足
“不能只做前端提示”的要求。

### 4. Prefer a dedicated teacher preview route over reusing student runtime directly

不要把 teacher preview 直接绑到 `/student/player`：

- 学生端 player 带有 personal progress、classroom runtime、SSE、权限假设
- Teacher preview 需要渲染**草稿 lesson** 而不是已发布 snapshot

推荐新增：

- `src/app/(teacher)/teacher/editor/preview/page.tsx`
- `src/components/surfaces/teacher-lesson-preview-surface.tsx`

页面读取显式 `courseId` + `lessonId`，通过新的 preview DAL DTO 渲染步骤顺序、
材料引用、built-in 标签与发布前提示。

### 5. Evolve the workspace into a clearer flow-composition contract

不需要引入新的 drag-and-drop 库。现有 `reorderLessonStepAction` + LexoRank 已足够。
更重要的是让 UI 明确表达三件事：

- 新增普通步骤与 built-in steps 在同一流程组合语境内
- 当前选中步骤的属性编辑是“流程的一部分”，而不是割裂的表单卡片
- 教师可以快速理解每个步骤的类型、来源、顺序、预计节奏

### 6. Status panel must consume structured issues, not derive ad hoc copy

`AuthoringStatusPanel` 不应只用 `Boolean(title && objective && hasSteps)`。
它应该消费 readiness DTO，例如：

- `blockingIssues[]`
- `warnings[]`
- `canPublish`
- `previewHref`

这样 publish-readiness 和 publish action 可以共用同一套判断源。

## Architecture patterns to preserve

1. **DAL + Server Actions only**  
   所有 editor 读写、preview 和 publish gate 必须继续通过 server boundary。

2. **Explicit cache invalidation**  
   lesson / steps / teacherCourses / course tags 继续在 mutation 后显式更新。

3. **Teacher-owned scope**  
   preview 和 readiness 也要复用 `assertActiveTeacher()` 与 scoped lesson/course lookup。

4. **Plugin safety stays declarative**  
   built-in teaching-step 只能通过已启用 plugin registry + safe hook/template path 暴露。

5. **Course-aware entry stays fixed**  
   `/teacher/editor` 继续依赖显式 `courseId` + `lessonId`，不回退为全局入口。

## Common pitfalls

1. **只在 UI 上显示“插件不可用”但不保留 built-in provenance**  
   如果步骤写入后没有 `pluginId` / `builtInKey`，后续无法真正判断 availability。

2. **把 teacher preview 直接建成 student player alias**  
   会把 student progress / classroom runtime 耦合进 teacher draft preview。

3. **只在 status panel 阻断，不在 publish action 阻断**  
   这会让前端绕过 readiness gate。

4. **让 readiness 直接依赖 `getLessonEditorDTO()` 的严格 parse**  
   readiness 应能独立检查 raw step payload，并返回问题列表，而不是先崩掉。

5. **把 preview 或 readiness 做成纯客户端状态推断**  
   会削弱 teacher-owned scope、缓存一致性与服务端 publish contract。

## Testing guidance

- `src/lib/dal/lesson-authoring.test.ts`
  - built-in provenance 保留
  - readiness 能发现 blocking issues
  - preview DTO 保持 teacher-owned scope
- `src/actions/lesson-authoring-actions.test.ts`
  - publish action 在 readiness fail 时返回 blocked result
  - 仍保留 lesson/steps/course cache invalidation
- `src/components/authoring/lesson-authoring-workspace.test.tsx`
  - built-in flow chips / source labels / reorder UI contract
- `src/components/authoring/lesson-step-editor.test.tsx`
  - 结构化字段编辑与 built-in metadata 可见性
- `src/components/authoring/authoring-status-panel.test.tsx`
  - blocking issues、preview entry、publish disabled state
- `src/app/(teacher)/teacher/editor/preview/page.test.tsx`
  - preview route 需要显式 `courseId` + `lessonId`

## Architectural responsibility map

| Layer | Responsibility |
|------|----------------|
| `src/lib/dto/lesson-authoring.ts` | lesson step payload schema、built-in provenance、preview/readiness DTO contracts |
| `src/lib/dal/lesson-authoring.ts` | teacher-owned lesson read/write、preview DTO、publish readiness、publish enforcement prechecks |
| `src/actions/lesson-authoring-actions.ts` | lesson mutations、publish action、cache invalidation、error mapping |
| `src/components/authoring/*` | flow composition UI、step property editing、readiness issue rendering |
| `src/components/surfaces/lesson-editor-surface.tsx` | editor shell、preview CTA/panel、status panel wiring |
| `src/app/(teacher)/teacher/editor/preview/page.tsx` | teacher-side preview route with explicit course/lesson params |

## Recommended plan split

最稳妥的拆分是 4 个 plans：

1. **contract + DAL/action readiness foundation**
2. **integrated flow composition + step property editing UI**
3. **teacher preview route + editor preview wiring**
4. **structured publish-readiness panel + phase verification guard**

这样既能让 preview / publish gate 建立在稳定 contract 上，也能避免单个计划同时触碰
DAL、surface、preview、verification 全部层级导致上下文过载。
