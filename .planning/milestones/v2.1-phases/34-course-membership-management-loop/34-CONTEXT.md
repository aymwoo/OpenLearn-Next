# Phase 34: Course membership management loop - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定在现有课程详情工作流内，补齐课程成员查看、添加、移除与反馈闭环，
让教师可以在已验证的课程 owner / school scope / DAL / DTO / cache contract 上安全
管理课程学生归属。

Phase 34 只交付课程成员 loop 本身：

1. 在课程详情页读出当前课程成员与可添加学生，并且可添加来源只限于当前课程已关联班级中的学生。
2. 通过显式 add/remove 动作维护 `courseEnrollments`，保持 duplicate prevention、页内反馈与 read-your-writes。
3. 继续复用现有 `course-authoring`、Server Actions、Zod、cache invalidation 与详情页内 product surface，
   不新增独立成员管理页面、平行运营台或批量导入链路。

本阶段不扩展到外部 roster 导入、班级管理重构、多选批量 enrollment、按班级分组运营台，
也不放宽到同校所有学生池。

</domain>

<decisions>
## Implementation Decisions

### Eligibility and scope
- **D-01:** 可添加学生来源固定为“当前课程已关联班级中的学生”，不暴露同校其它未关联班级或同校其他教师 roster。
- **D-02:** eligibility read model 必须建立在已有 `courseClasses -> classes -> students` 的 school-scoped 关系上，并继续复用 Phase 33 收紧后的 teacher-owned course scope。
- **D-03:** 课程成员列表只展示当前课程已有 enrollment 的学生，并可附带其班级标签作为上下文；列表本身不按班级分组。

### Mutation posture and feedback
- **D-04:** 添加交互固定为单个学生逐个添加，不做多选批量 enrollment，也不在本阶段引入批量移除。
- **D-05:** add/remove enrollment 成功后继续返回同一个 `TeacherCourseDetailDTO` 或等价详情 read model，沿用详情页内 read-your-writes 与页内成功/失败反馈模式。
- **D-06:** duplicate enrollment 必须被显式拦截或幂等处理，不能在 UI 或数据库层形成静默重复记录。

### Detail-page product behavior
- **D-07:** 成员管理继续内嵌在课程详情页，不新增独立成员管理路由、独立 drawer flow 或平行运营台。
- **D-08:** 成员列表组织方式固定为纯名单列表，可带班级标签帮助教师识别学生来源，但不切成班级分组面板。
- **D-09:** archived 课程上的成员管理固定为只读禁改：教师仍可查看当前成员，但不能继续 add/remove。

### Existing constraints to preserve
- **D-10:** Phase 34 必须直接复用 `course-authoring` 的 DAL + Server Actions + DTO + cache tag contract，不新增 route handler shortcut、component-side DB access 或并行 enrollment 子系统。
- **D-11:** Phase 14 已锁定“课程详情页是课程域显式管理入口”；Phase 34 继续沿用这一入口，只把班级关联之后尚未完成的 enrollment loop 补齐。
- **D-12:** 删除 guardrail 继续以详情 DTO 的 delete eligibility 为真相源，因此 enrollment add/remove 必须实时影响课程删除阻断状态。

### Claude's Discretion
- eligible student 列表是否需要最小搜索、空状态文案、badge 视觉层级，可由 planner 在不改变 D-01 / D-03 / D-08 的前提下收敛。
- archived 课程只读提示的具体文案、样式和信息密度，可按现有课程详情 surface 语言调整。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase truth
- `.planning/ROADMAP.md` — Phase 34 的正式 goal、success criteria 与 3 个计划槽位。
- `.planning/REQUIREMENTS.md` — `COURSE-07` 的 requirement truth。
- `.planning/PROJECT.md` — 当前 milestone 的课程成员闭环目标，以及不继续扩 runtime/platform 的约束。
- `.planning/STATE.md` — 当前 milestone posture，明确 Phase 34 只补 `COURSE-07`。

### Locked upstream decisions
- `.planning/phases/33-project-level-auth-data-and-classroom-durability-closure/33-CONTEXT.md` — Phase 34 只能建立在已收紧的 auth/data contract 上。
- `.planning/phases/14-course-lifecycle-and-associations/14-02-SUMMARY.md` — 班级关联已固定在课程详情页内，且与 student enrollment 管理显式分离。
- `.planning/phases/15-batch-course-import/15-CONTEXT.md` — 课程域继续避免把成员管理、班级关联和其他平行流程混入非详情页工作流。

### Existing course implementation to extend
- `src/lib/dto/course-authoring.ts` — 当前课程详情 DTO、class association 输入 contract，以及后续 membership DTO 的落点。
- `src/lib/dal/course-authoring.ts` — 当前 teacher-owned course detail、class association、delete eligibility 与 enrollment count 聚合边界。
- `src/actions/course-authoring-actions.ts` — 当前课程域 action 包装、Zod 校验和 cache invalidation contract。
- `src/components/courses/course-detail-form.tsx` — 当前课程详情页内的 lifecycle、class association、delete guard 交互基线。
- `src/components/surfaces/teacher-course-detail-surface.tsx` — 课程详情 surface 的 product integration 入口。
- `src/db/schema.ts` — `courseEnrollments`、`courseClasses`、`classes` 与相关 FK/index truth。

### Related read models using enrollments
- `src/lib/dal/learning.ts` — 学生学习域已消费 active course enrollments，后续 membership 写入不能破坏其 scope 语义。
- `src/lib/dal/classroom.ts` — 课堂域已有基于 enrollment 的 participant / monitoring truth，Phase 34 要保持 contract 一致。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getTeacherCourseDetailDTO()`：已经是课程详情页的单一读模型，包含 `classLinks`、`availableClasses`、`enrollmentCount` 与 `deleteEligibility`，适合继续扩成 membership-aware DTO。
- `addCourseClassAssociationAction()` / `removeCourseClassAssociationAction()`：提供了当前课程详情页内 add/remove、tag 失效和页内反馈的现成 action 形状。
- `CourseDetailForm`：已实现“同页提交、同页反馈、同页只读/可写状态切换”的交互骨架。

### Established Patterns
- 课程域当前所有显式管理动作都留在详情页内完成，而不是跳转到独立子系统或运营台。
- mutation 成功后统一失效 `teacherCourses(actorId)` 与 `course(courseId)` tags，保持详情页和列表页同步。
- 课程详情 DTO 由服务端直接提供可操作列表，例如 `availableClasses`；客户端不自行拼接作用域数据。
- archived 课程详情仍可读，但 lessons entry 已禁入，说明“可查看但不可继续推进流程”已经是现有语义基线。

### Integration Points
- `src/lib/dto/course-authoring.ts`：新增成员列表、eligible student、只读状态等字段或子 DTO 的第一落点。
- `src/lib/dal/course-authoring.ts`：新增 membership read model、single-student add/remove mutation、archived 只读 enforcement。
- `src/actions/course-authoring-actions.ts`：新增 enrollment add/remove action，并继续复用统一错误映射与 tag invalidation。
- `src/components/courses/course-detail-form.tsx`：成员列表、单个添加控件、archived 只读提示与删除阻断联动的直接承载面。

</code_context>

<specifics>
## Specific Ideas

- 用户已明确锁定：可添加学生只来自已关联班级，不向同校更宽 roster 扩口。
- 用户已明确锁定：添加交互为单个添加，不做多选批量。
- 用户已明确锁定：成员区采用纯名单列表，可带班级标签，但不做班级分组视图。
- 用户已明确锁定：archived 课程成员管理为只读禁改。

</specifics>

<deferred>
## Deferred Ideas

- 批量 enrollment add/remove。
- 在课程详情外新增独立成员管理页面或平行运营台。
- 放宽可添加学生来源到同校所有学生或同校所有班级 roster。
- 按班级分组的成员运营视图、班级级批量 enrollment、外部 roster 导入。

</deferred>

---

*Phase: 34-course-membership-management-loop*
*Context gathered: 2026-05-17*
