# Phase 13: Course center foundation - Research

**Researched:** 2026-05-09  
**Confidence:** HIGH

## Executive summary

Phase 13 应扩展现有 teacher authoring 架构，而不是另起一套课程管理子系统。
课程中心、课程详情、课程基础信息写入和从课程进入课时管理，都应继续走
`DAL + Server Actions + DTO + cache tags` 这条既有路径。

## Existing code facts

- `src/lib/dal/lesson-authoring.ts` 已有 `assertActiveTeacher()`、
  `assertSchoolAccess()`、`getCourseDTO()`、`getTeacherAuthoringOverview()`，
  说明 teacher/school scope 与课程聚合字段已经有可靠基线。
- `src/actions/lesson-authoring-actions.ts` 已有 `createCourseAction()` 和
  `updateTag(cacheTags.course(...))` 模式，适合复用到课程新建/编辑。
- `src/app/(teacher)/teacher/editor/page.tsx` 仍然读取
  `overview.lessons[0]` 作为默认入口，这与 D-09~D-12 的 course-aware handoff
  冲突，必须在 Phase 13 收口。
- `src/components/surfaces/library-surface.tsx` 是现成的课程卡片视觉基调，
  但当前依赖 `courseCards` demo data，不能继续沿用假数据。

## Recommended implementation shape

### 1. Read model

新增相邻模块而不是继续把所有逻辑堆进 `lesson-authoring.ts`：

- `src/lib/dto/course-authoring.ts`
- `src/lib/dal/course-authoring.ts`
- `src/actions/course-authoring-actions.ts`

这样可以复用现有 teacher authoring 边界，同时避免 lesson 编辑逻辑与课程中心
读写继续膨胀到同一个文件。

### 2. Route structure

- `/teacher/courses` —— 课程总览页
- `/teacher/courses/[courseId]` —— 课程详情页
- `/teacher/courses/[courseId]/lessons` —— course-aware 课时入口页
- `/teacher/editor` —— 保留现有编辑器，但改成只接受显式课程/课时入口，
  不再自动回退到全局第一条课时

### 3. Sorting and visibility rules

课程总览必须实现 CONTEXT.md 锁定排序：

1. 默认隐藏 `archived`
2. 默认按状态组排序：`draft -> published -> archived`
3. 同状态组内按 `updatedAt desc`
4. 仅当显式筛选归档时才展示 `archived`

### 4. Cache strategy

新增课程中心列表 tag，并继续使用课程详情 tag：

- `cacheTags.teacherCourses(actorId)` —— `/teacher/courses`
- `cacheTags.course(courseId)` —— 课程详情与课程内课时入口

所有 create / edit / create lesson draft 路径都必须 `updateTag()` 对应 list/detail
tag，保证 read-your-writes。

## Architecture patterns to preserve

- 所有鉴权只放在 server side；UI 可见性不等于授权。
- 所有表单输入先经 Zod，再进入 DAL。
- UI 只消费 DTO，不直连 DB row。
- 继续保持简体中文、Lexend、tonal surfaces、无 1px 分割线。
- 课程进入课时管理必须先进入 course-aware 列表或空态，而不是跳到全局 editor。

## Common pitfalls

1. **错误复用公开 `/courses` 页面**
   - Phase 13 必须建立 teacher route group 下的真实课程中心，不能把公开课程页直接
     改造成教师工作流。
2. **只更新 `cacheTags.course(courseId)`**
   - 新建课程后如果不失效课程中心列表 tag，总览页不会立刻出现新课程。
3. **继续保留 editor 的全局第一课时回退**
   - 这会违反 D-12，并让 COURSE-10 的 dedicated entry point 失真。
4. **把成功反馈只做成 toast**
   - D-07 要求页内明确成功反馈，且要和最新结果一起出现。

## Testing guidance

- DAL 测试验证 teacher/school scope、排序、归档过滤与 DTO 字段齐全。
- Action 测试验证 create / update 成功与 validation error。
- Route / surface 测试验证：
  - 课程中心显示状态 badge
  - 课程详情可见 inline 成功反馈
  - 课程内无课时时主 CTA 为“新建第一个课时”
  - editor 不再使用 `overview.lessons[0]`

## Architectural responsibility map

| Layer | Responsibility |
|------|----------------|
| `src/lib/dto/course-authoring.ts` | 课程中心/详情/课时入口 DTO 与表单 schema |
| `src/lib/dal/course-authoring.ts` | teacher-scoped 课程查询、编辑、课程内课时入口读取 |
| `src/actions/course-authoring-actions.ts` | 课程 create/edit server actions 与 cache invalidation |
| `src/app/(teacher)/teacher/courses/**` | 课程总览、详情、课时入口路由 |
| `src/components/surfaces/*course*` | 与 Stitch / DESIGN 对齐的教师课程 UI |
| `src/app/(teacher)/teacher/editor/page.tsx` | 接受显式 course-aware handoff，不再做全局默认回退 |
