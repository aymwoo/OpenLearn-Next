# Phase 13: Course center foundation - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付教师可用的课程中心基础闭环：教师可以打开 ` /teacher/courses ` 查看自己学校范围内可见的课程总览，手动新建课程、编辑课程基础信息，并从课程详情继续进入该课程的课时/教案管理入口。

本阶段不包含批量导入、真实外部系统导入、课程发布/下线/归档/删除动作、班级/学生关联管理，这些仍属于后续 Phase 14 与 Phase 15。

</domain>

<decisions>
## Implementation Decisions

### 课程中心形态
- **D-01:** ` /teacher/courses ` 采用“课程总览页 + 独立课程详情页”的两级结构，不做列表页内联展开或三栏工作台。
- **D-02:** 课程总览默认使用卡片网格，而不是后台式表格列表；视觉语言继续沿用现有 Stitch `课程中心` 与 `LibrarySurface` 的高密度卡片节奏。
- **D-03:** 每张课程卡必须显式展示课程状态 badge，状态是教师识别课程阶段的主要信息之一，不能弱化到副文案。
- **D-04:** 教师在课程总览点击一门课程时，默认进入 ` /teacher/courses/[courseId] ` 详情页，而不是直接跳到教案编辑器。

### 新建与编辑流程
- **D-05:** 课程新建从课程总览页触发，采用右侧抽屉表单完成，不新增独立 `new` 页面。
- **D-06:** 课程基础信息编辑放在课程详情页内完成，不要求跳回列表页或额外再开一层编辑弹层。
- **D-07:** 保存课程后要提供明确的页内成功反馈，并立即呈现 read-your-writes 结果；不能只依赖轻量 toast。
- **D-08:** Phase 13 的课程基础信息至少围绕现有 `createCourseAction` 已支持的标题、学科、年级和课程状态组织，后续生命周期扩展在 Phase 14 继续深化。

### 进入教案管理
- **D-09:** 从课程详情进入教案管理时，默认先落到“该课程的课时列表入口”，而不是直接跳到当前全局 ` /teacher/editor `。
- **D-10:** Phase 13 需要先建立课程详情里的 course-aware 课时/教案入口页或等价结构，让教师先在课程上下文中看到该课程已有课时及其入口，再进入具体编辑器。
- **D-11:** 当课程下尚无任何课时时，课程详情页的主 CTA 是“新建第一个课时”，课程详情本身就是进入教案管理的起点。
- **D-12:** 后续进入编辑器的路径必须变成 course-aware，不能继续沿用当前“直接打开 overview 中第一条课时”的全局默认逻辑。

### 列表排序与状态可见性
- **D-13:** 课程总览默认按最近更新时间倒序展示，优先把教师最近正在处理的课程放在前面。
- **D-14:** 当不同状态课程同时出现时，状态优先级采用“草稿 -> 已发布 -> 已归档”，再在各状态组内按最近更新时间排序。
- **D-15:** 归档课程默认不在主总览中直接展示，需要教师通过显式筛选或切换才能查看，避免归档内容干扰日常运营。

### 沿用的既有约束
- **D-16:** 本阶段继续沿用 teacher-scoped / school-scoped 权限模型，课程读取与写入都必须复用现有 DAL 授权边界。
- **D-17:** 所有课程读写继续走 `DAL + Server Actions`，并在变更后显式执行 `updateTag()` / `revalidateTag()` 保证 read-your-writes。
- **D-18:** 课程中心页面继续遵守现有视觉约束：简体中文、Lexend、tonal surfaces、无 1px 分割线、与 Stitch `课程中心` 同一设计语言。

### the agent's Discretion
- 课程卡片中的字段排版、卡片网格列数、状态 badge 视觉细节、详情页内部模块顺序，可以在不违背上述已锁定决策的前提下由 planner 和 implementer 根据现有设计系统自行收敛。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and scope
- `.planning/PROJECT.md` — v1.2 目标、约束、课程导入范围，以及课程管理继续沿用 DAL + Server Actions + school-scoped 授权边界的锁定决策。
- `.planning/REQUIREMENTS.md` — `COURSE-01`、`COURSE-02`、`COURSE-03`、`COURSE-10` 的正式需求与 Phase 13 边界。
- `.planning/ROADMAP.md` — Phase 13 目标、成功标准、计划拆分与 UI hint。
- `.planning/research/ARCHITECTURE.md` — v1.2 推荐集成点、构建顺序与“课程中心应扩展现有 teacher authoring 架构”的规则。

### Existing implementation to extend
- `src/lib/dal/lesson-authoring.ts` — 现有 teacher scope、课程 DTO、课程创建、authoring overview 与 lesson editor DTO 模式，是 Phase 13 最直接的复用基础。
- `src/actions/lesson-authoring-actions.ts` — 已有 `createCourseAction`、课时草稿 action 和 `updateTag()` 用法，应作为课程 action 设计的基线。
- `src/db/schema.ts` — `courses`、`courseClasses`、`courseEnrollments`、`lessons` 等 schema 与状态字段定义。

### UI and route references
- `src/components/surfaces/library-surface.tsx` — 当前 `课程中心` 占位视觉与卡片语言；需要从 demo surface 升级为 teacher-scoped course center，而不是重起一套设计。
- `src/app/(library)/courses/page.tsx` — 当前公开/占位课程页入口，帮助识别现有 ` /courses ` 与新 ` /teacher/courses ` 的职责差异。
- `src/app/(teacher)/teacher/layout.tsx` — 教师左侧导航已经包含 ` /teacher/courses ` 入口。
- `src/app/(teacher)/teacher/editor/page.tsx` — 当前 editor 直接打开全局第一条课时，是 Phase 13 需要修正的非 course-aware 入口。
- `src/components/surfaces/lesson-editor-surface.tsx` — 当前 editor 的课程/课时呈现方式，为后续从课程详情衔接课时管理提供 UI 上下文。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assertActiveTeacher()` / `assertSchoolAccess()` in `src/lib/dal/lesson-authoring.ts`：已经提供教师身份和 school scope 校验，可直接复用到课程中心读写。
- `getCourseDTO()` in `src/lib/dal/lesson-authoring.ts`：已经会聚合课程的课时数、班级标签、报名人数和更新时间，是课程总览/详情 DTO 的直接基础。
- `getTeacherAuthoringOverview()`：已经能在教师 school scope 下汇总 courses / classes / lessons，可作为 course-aware authoring handoff 的过渡数据源。
- `createCourseAction()` in `src/actions/lesson-authoring-actions.ts`：已经有手动建课的验证和 `updateTag()` 模式，可扩展为完整课程 create/edit flow。
- `LibrarySurface`：已有课程卡片的视觉基调与 hero 区块，可复用其中的 card language，但不能继续使用 demo data。

### Established Patterns
- 现有 teacher authoring 读写全部放在 `src/lib/dal/lesson-authoring.ts` 与 `src/actions/lesson-authoring-actions.ts`，说明课程中心应该继续扩展同一 authoring 边界，而不是新建平行 admin 子系统。
- 现有 Action 层统一使用 Zod 校验、`ActionResult` 返回结构、`updateTag(cacheTags.*)` 触发缓存更新，Phase 13 应继续保持这个 contract。
- 现有编辑器默认使用 `overview.lessons[0]` 作为 active lesson，这是一种临时全局默认，不满足 course-aware workflow；Phase 13 需要显式收口到课程上下文。
- 视觉上现有 teacher surfaces 均使用 tonal card、rounded shell、中文 copy、低对比分层，Phase 13 必须继续沿用。

### Integration Points
- `src/app/(teacher)/teacher/courses`：Phase 13 的主课程中心 route。
- `src/app/(teacher)/teacher/courses/[courseId]`：Phase 13 的课程详情与 lesson handoff route。
- `src/actions/lesson-authoring-actions.ts` 或相邻 course action 文件：承接课程创建、编辑等 Server Actions。
- `src/lib/dal/lesson-authoring.ts` 或相邻 course DAL 文件：承接 teacher-scoped course list/detail/create/edit DTO 和查询逻辑。
- `src/app/(teacher)/teacher/editor/page.tsx`：后续从课程详情进入具体课时编辑时需要接入的现有编辑器入口。

</code_context>

<specifics>
## Specific Ideas

- 课程中心总览页延续 Stitch `课程中心` 的卡片式内容库语言，但内容从 demo `courseCards` 替换成真实 teacher-scoped course DTO。
- 课程详情页应成为课程基础信息与“进入课时/教案管理”的统一枢纽，而不是把教师直接扔进全局 editor。
- 课程详情里的课时入口要显式区分“继续已有课时”和“新建第一个课时”，确保空态与已有内容态都自然。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-Course center foundation*
*Context gathered: 2026-05-09*
