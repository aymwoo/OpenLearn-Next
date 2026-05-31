# Phase 15: Batch course import - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定在现有教师课程管理工作流内，为 `/teacher/courses` 增加结构化
批量导入能力。教师通过 CSV 模板上传课程行数据，先查看行级校验与重复命中结果，
再显式决定整批应用，并获得 created / updated / skipped / failed 的明确反馈。

本阶段只覆盖课程实体本身的批量导入，不扩展到外部系统同步、学生 enrollment
管理、班级关联自动导入、课程详情以外的平行运营台，也不把课程导入升级成通用
数据集成平台。

</domain>

<decisions>
## Implementation Decisions

### Import file and template contract
- **D-01:** Phase 15 首发导入格式固定为 `CSV`，不同时引入 XLSX 解析路径。
- **D-02:** 课程导入模板最终字段固定为 `标题 + 学科 + 年级 + 课程状态`。
- **D-03:** `标题 + 学科 + 年级` 是课程行的基础业务字段；新增 `课程状态` 列是为了保住真实的 `updated` 结果语义。
- **D-04:** 批量导入模板不包含班级关联列；`COURSE-06` 的 class association 继续留在课程详情页显式处理。

### Matching and duplicate handling
- **D-05:** 同一学校内，导入行命中已有课程的匹配键固定为 `标题 + 学科 + 年级`。
- **D-06:** 当前 `courses` schema 没有 school-scoped unique key，因此 Phase 15 需要在导入预览阶段显式做应用层重复检测，不能依赖数据库唯一约束兜底。
- **D-07:** 当一行命中已有课程时，首发不自动覆盖；预览台必须把它识别为“命中已有课程”，并允许教师逐行选择 `更新` 或 `跳过`。
- **D-08:** 同一份 CSV 内若两行落到同一个匹配键，固定视为批内冲突并阻断该行，不采用“最后一行生效”或“第一行生效”的隐式覆盖规则。

### Update semantics
- **D-09:** 为了保住真实 `updated` 结果，命中已有课程后的首发可更新字段固定为 `课程状态`。
- **D-10:** 如果导入行命中已有课程且 `课程状态` 与现有值一致，则该行结果记为 `skipped`，原因是“已存在且无变更”。
- **D-11:** 如果导入行命中已有课程且教师在预览台选择 `更新`，则仅更新课程状态；不在首发批量覆盖标题、学科或年级。
- **D-12:** 对于全新课程行，即使模板提供 `课程状态` 列，首发创建时也一律按 `draft` 新建；状态列只用于命中已有课程时的更新路径。

### Review and apply workflow
- **D-13:** 上传 CSV 后必须先进入独立导入审核台，再执行应用动作；不能在上传后直接写入课程数据。
- **D-14:** 审核台沿用项目已存在的 `draft -> row-level review -> explicit apply` 心智模型，而不是把 `/teacher/courses` 首页改造成临时审核页。
- **D-15:** 首发应用粒度固定为“整批统一应用”；教师先完成预览与命中行选择，再执行一次整批 apply。
- **D-16:** 整批 apply 允许部分成功：问题行保持 `skipped` 或 `failed`，其余可通过行照常创建或更新。
- **D-17:** 审核台中“命中已有课程”的行虽然是逐行决策，但该决策只用于标记该行在整批 apply 中是 `更新` 还是 `跳过`，不引入逐行单独提交。

### Result feedback and downstream flow
- **D-18:** 应用完成后，首发结果视图固定为“结果概览 + 行级结果页”，不能只用 toast 或仅导出文件替代产品内反馈。
- **D-19:** 结果概览必须显式区分 `created`、`updated`、`skipped`、`failed` 四类行数，并保留逐行原因。
- **D-20:** 结果页的主后续动作固定回到 `/teacher/courses`，继续衔接现有课程中心工作流。

### Existing constraints to preserve
- **D-21:** Phase 15 继续复用 `course-authoring` 的 `DAL + Server Actions` 边界，不新建平行课程导入子系统。
- **D-22:** 所有导入读写继续保持 teacher-owned / school-scoped 权限模型，不能导入同校其他教师的课程，也不能跨学校写入。
- **D-23:** Phase 15 不能绕过 Phase 14 已锁定的显式 lifecycle / delete / class association 语义；导入只处理课程实体与状态，不把独立动作重新混回批量流程。

### Claude's Discretion
- 审核台采用独立页面还是课程域下的独立子路由，只要保持“独立审核台”而不是首页内嵌，可由 planner 按现有课程路由结构收敛。
- 行级结果页采用 card list、table-like rows 还是 grouped sections，可由 planner 按现有 teacher surface 语言与导入行密度自行收敛。
- `failed` 与 `skipped` 的中文文案细节、badge 视觉层级和统计卡布局，可由 planner/implementer 基于现有 design system 调整，但必须保留四类结果语义。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — 项目级 carry-over backlog、课程导入仍只做本地结构化导入、不得扩展成外部系统同步的锁定边界。
- `.planning/ROADMAP.md` — Phase 15 的正式 goal、success criteria 与 3 个计划槽位。
- `.planning/REQUIREMENTS.md` — `COURSE-08`、`COURSE-09` 的正式需求来源。
- `.planning/STATE.md` — 当前 backlog planning 状态与前序课程域锁定决策。

### Upstream course-domain decisions
- `.planning/phases/13-course-center-foundation/13-CONTEXT.md` — 课程中心、课程详情、course-aware workflow，以及继续沿用 teacher-scoped course authoring 边界的基础决策。
- `.planning/phases/14-course-lifecycle-and-associations/14-01-SUMMARY.md` — 课程生命周期动作继续走显式 action，不新增平行 contract。
- `.planning/phases/14-course-lifecycle-and-associations/14-02-SUMMARY.md` — 班级关联只管理 `courseClasses`，并继续留在课程详情页内显式处理。
- `.planning/phases/14-course-lifecycle-and-associations/14-03-SUMMARY.md` — 删除 guardrail 已并入课程详情 DTO，说明课程域倾向显式结构化反馈而不是隐式批处理。

### Existing course implementation to extend
- `src/db/schema.ts` — 现有 `courses` schema 只有 `title`、`subject`、`grade`、`status` 等基础字段，且没有 school-scoped unique key；Phase 15 的重复检测必须走应用层逻辑。
- `src/lib/dto/course-authoring.ts` — 当前课程中心 / 详情 DTO 与 create/update/lifecycle/class association/delete input contracts。
- `src/lib/dal/course-authoring.ts` — 现有 teacher-owned course read/write、详情 DTO 聚合、状态更新与 class association/delete guard 的真实边界。
- `src/actions/course-authoring-actions.ts` — 当前课程域 Server Actions、Zod 校验和 cache invalidation contract。
- `src/app/(teacher)/teacher/courses/page.tsx` — 当前课程中心入口。
- `src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — 当前课程详情入口。
- `src/components/surfaces/teacher-course-center-surface.tsx` — 课程中心的现有 surface 语言与后续返回落点。

### Import workflow patterns to reuse
- `src/db/schema.ts` — `scheduleImportBatch` / `scheduleImportRow` 证明仓库里已有“批次 + 行级审核状态”表结构模式可参考。
- `src/features/schedule/shared/dto/import.ts` — 现有导入批次、行级状态、validation/conflict summary DTO 设计，可作为课程导入审核台 contract 的基线。
- `src/features/schedule/import/server.ts` — 现有 `draft -> classify rows -> review -> approve` 导入流程与部分成功逻辑，是 Phase 15 最直接可复用的后端模式。
- `src/features/schedule/import/actions.ts` — 导入 action 包装、FormData 规范化、Zod 校验、tag invalidation 的现成实现模式。
- `src/features/schedule/import/template.ts` — 模板列、中文表头、示例行与 CSV 生成 helper 的可复用做法。
- `src/components/surfaces/schedule-import-modal.tsx` — 上传 CSV、客户端解析、错误反馈与导入入口交互模式。
- `src/components/surfaces/schedule-import-review-surface.tsx` — 独立审核台、结果统计、逐行审核信息展示的现成 UI 基线。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/dal/course-authoring.ts`：已经提供 `getTeacherCourseCenterDTO()`、`getTeacherCourseDetailDTO()`、`createCourseForTeacherScoped()`、`updateCourseStatusForTeacherScoped()` 等 teacher-owned 课程边界，Phase 15 应直接接入这些路径。
- `src/actions/course-authoring-actions.ts`：现有 `normalizeInput -> safeParse -> assertActiveTeacher -> DAL -> updateTag` 的 action shape 可直接复用到课程导入 action。
- `src/components/surfaces/teacher-course-center-surface.tsx`：已固定 `/teacher/courses` 的 CTA、卡片语言和“回课程中心”主心智，是结果页返回落点的直接基线。
- `src/features/schedule/import/template.ts`：现成的“模板列定义 + 中文表头 + 样例行 + CSV 构建”模式可以平移到课程导入模板。
- `src/features/schedule/import/server.ts` 与 `src/components/surfaces/schedule-import-review-surface.tsx`：已有导入批次、行状态、冲突摘要、整批 apply、部分成功和审核台展示模式，适合直接借鉴。

### Established Patterns
- 课程域当前没有数据库唯一约束来识别“同一门课”，因此重复判断必须在导入预览阶段通过 teacher-scoped read model 主动完成。
- 当前课程 create contract 可以创建 `draft` 课程，status 默认值也是 `draft`；这与“新建一律 draft，状态列只用于命中已有课程时更新”保持一致。
- Phase 14 已把 lifecycle、class association、delete guard 都做成显式独立 contract，说明 Phase 15 也应继续用结构化结果和显式 apply，而不是隐式批量覆盖。
- 仓库里已经存在 schedule import 的“批次表 + 行表 + review/apply”模式，说明 Phase 15 不需要发明新的导入范式。

### Integration Points
- `src/app/(teacher)/teacher/courses` 及其相邻子路由：Phase 15 的导入入口、审核台、结果页都应挂在现有课程域之下。
- `src/lib/dto/course-authoring.ts`：需要新增课程导入模板行、批次、行结果与审核台相关 typed contracts。
- `src/lib/dal/course-authoring.ts` 或相邻课程导入 DAL：需要承接 CSV 行预览、同校重复检测、命中已有课程标记与整批 apply。
- `src/actions/course-authoring-actions.ts` 或相邻课程导入 actions：需要承接 draft/import/apply 服务器动作，并失效 `teacherCourses` / `course` 相关 tags。
- `src/components/surfaces/teacher-course-center-surface.tsx` 邻近课程 UI：可挂接“下载模板 / 发起导入 / 查看导入结果”的入口。

</code_context>

<specifics>
## Specific Ideas

- 用户明确要求首发格式固定为 CSV，并优先复用现有 schedule import 的上传、审核台和结果反馈模式。
- 用户明确要求课程导入模板以最小闭环为目标，但为了保住真实 `updated` 结果，最终接受模板增加 `课程状态` 列。
- 用户明确要求：全新课程即使模板带状态列，也一律按 `draft` 新建；状态列只用于命中已有课程时做显式更新。
- 用户明确要求：命中已有课程的行必须在预览台里逐行选择 `更新` 或 `跳过`，然后再参加整批统一 apply。
- 用户明确要求：应用完成后优先展示“结果概览 + 行级结果页”，主后续动作返回 `/teacher/courses`。

</specifics>

<deferred>
## Deferred Ideas

- XLSX 首发支持 — 未来若教师确有强需求可再扩展，目前先不引入第二套解析链路。
- 模板内一并导入班级关联 — 超出本阶段边界，继续留在 Phase 14 已完成的课程详情显式关联工作流。
- 外部系统课程导入或同步（Moodle / Notion / connector）— 仍属 v2 / 后续里程碑候选，不并入当前本地结构化导入范围。
- 在批量导入中覆盖课程标题、学科、年级等身份字段 — 首发先锁为 status-only update，避免匹配键与可更新字段混淆。

</deferred>

---

*Phase: 15-batch-course-import*
*Context gathered: 2026-05-15*
