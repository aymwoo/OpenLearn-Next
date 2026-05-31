# Phase 41: First real product slice - batch import async workflow - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段建立在 Phase 39-40 已完成的 async platform 基础之上，把现有课程批量导入从
“上传生成草稿 -> 审核 -> 同步 apply”升级为 teacher/staff 真正可触发、可观察、可解释的
异步产品链路。

Phase 41 的职责固定为三件事：

1. 把 batch import 挂到已有 typed task registry、统一 enqueue boundary、worker
   processor 与 durable task truth 上。
2. 让 teacher/staff 在产品面看到 honest 的 queued、running、completed /
   partially completed、failed 状态，以及与课程导入语义对齐的进度与结果摘要。
3. 证明 batch import 在 retries / duplicate trigger / rerun 情况下不会把业务写入变成
   不诚实或重复污染。

本阶段不新增 operator dashboard、operator retry UI、通用任务中心，不把上传解析阶段也扩成
 第二个 async workflow，也不在结果页里做逐行就地补救流。这些要么属于 Phase 42，
要么属于后续单独能力。

</domain>

<decisions>
## Implementation Decisions

### 异步触发时点
- **D-41-01:** 课程导入继续保持现有 `上传 CSV -> 生成草稿批次 -> 审核命中/阻断 -> 点击“应用本批导入”` 的主链路；真正的 async task 只在审核完成后创建，不在上传阶段直接入队。
- **D-41-02:** 用户在审核页点击“应用本批导入”并成功创建任务后，当前批次页直接切换为该任务的运行/结果承载面，而不是跳去另一套新页面。
- **D-41-03:** 一旦任务成功创建，当前批次的逐行 `更新 / 跳过` decisions 立即冻结并转为只读；运行中的任务不允许继续修改该批次决策。
- **D-41-04:** 如果任务在 platform dispatch 阶段失败到连队列都没有成功进入，页面必须留在当前批次详情/审核面并明确呈现 failed / 未入队状态，允许用户重新触发；不能伪装成任务已经开始运行。

### 用户看到的状态承载面
- **D-41-05:** batch import 的单一事实页面仍然是当前批次详情页；无论从上传流、审核流还是课程中心进入，最终都回到同一个 batch import detail/result surface。
- **D-41-06:** 课程中心需要增加一个轻量的“最近导入任务”入口，但它只是辅助承载面，不替代批次详情页作为主真相源。
- **D-41-07:** 这个课程中心入口采用顶部任务卡片形态，放在课程中心上方信息区/hero 附近，展示最近一次 batch import 的状态、进度或结果摘要。
- **D-41-08:** 最近导入任务卡片在任务完成后仍然保留最近一次结果摘要，而不是完成即消失；这样用户离开审核页后仍能找回结果。

### 部分成功与结果表达
- **D-41-09:** 当 batch import 同时出现 `created / updated / skipped / failed` 时，终态必须采用显式 partial success 语义，不把它压缩成纯 completed 或纯 failed。
- **D-41-10:** 结果页的信息层级固定为“先汇总计数，后逐行明细”；顶部先展示 `created / updated / skipped / failed` 汇总，再往下展示每行结果和原因。
- **D-41-11:** 对失败行的主引导是“保留明确失败原因，并提示修正 CSV / 处理冲突后重新导入创建新任务”；Phase 41 不在当前结果页里做失败行就地重跑或局部补救。
- **D-41-12:** 当任务处于 partial success 时，课程中心最近导入卡片的主语气必须是“已完成，但有失败项”这一类 honest copy，既承认成功落库部分，也不掩盖失败项。

### 幂等与重复触发用户语义
- **D-41-13:** 同一个 course import batch 在 `queued / running / retrying` 等 active 状态下，产品层只允许存在一个 active task；不能为同一批次同时挂多个运行实例。
- **D-41-14:** 如果用户对同一批次重复点击“应用本批导入”，而该批次已有 active task，系统应复用当前任务并把用户直接带回该任务/批次详情页，同时明确提示“这批导入已在处理中”。
- **D-41-15:** 已经进入 terminal 状态的任务（`completed`、`partially_completed`、`failed`）不再复用；用户再次触发时应创建新的任务尝试。
- **D-41-16:** 即使 terminal 后允许重新创建新任务，底层业务写入仍必须保持幂等与 honest result，不允许因为 rerun 或 duplicate delivery 导致重复创建/重复更新污染。

### the agent's Discretion
- course import task 的精确 `taskType`、`entityRefKind`、`labelKey`、`summaryKey` 命名，可由 planner 结合现有 async registry 命名风格收敛，但必须明确归属 `course_import` feature area。
- 课程中心最近导入任务卡片是挂在 hero metrics 区、hero 下方单独 section，还是同层 card inset，可由 planner 按现有 `teacher-course-center-surface.tsx` 布局最小改动收敛；但必须保持“顶部、轻量、可回详情”的产品定位。
- 批次详情页运行态/结果态的精确 copy、badge variant、summary card 排布可由 planner 结合现有 `CourseImportReviewSurface` 与 async task DTO 细化；但信息层级和 honest posture 已锁定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 41 的正式 goal、requirements、success criteria 与 3 个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `ATP-11`、`ATP-12`、`ATP-13`、`ATP-14`、`ATP-19` 的 requirement truth。
- `.planning/PROJECT.md` — v2.3 async platform 的总体边界，以及 SQLite + DAL truth、非 big-bang rewrite 等非协商约束。
- `.planning/STATE.md` — 当前 milestone 状态与上游 Phase 39/40 已完成的事实。

### Locked upstream decisions
- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-CONTEXT.md` — worker 独立进程、QueueEvents durable projection、retry/idempotency/recovery posture 已锁定。
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md` — typed registry、durable task ledger、honest enqueue posture、visibility/entityRef contract 已锁定。
- `.planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-CONTEXT.md` — Redis/BullMQ 不升级为业务真相源的上游 truth。

### Existing batch import anchors
- `src/actions/course-import-actions.ts` — 当前 upload draft / apply 的 server action 边界；Phase 41 需要把同步 apply 收口到 async trigger。
- `src/lib/dal/course-import.ts` — 现有导入批次真相、逐行结果、summary 计算与同步 apply 逻辑；worker 执行要复用其业务语义而不是重写一套。
- `src/lib/dto/course-import.ts` — 现有 batch / row / apply summary vocabulary，是 async result mapping 的直接来源。
- `src/components/courses/course-import-modal.tsx` — 当前上传入口；明确 upload 仍只生成草稿批次，不直接触发真实导入任务。
- `src/components/surfaces/course-import-review-surface.tsx` — 当前审核与结果 surface；Phase 41 的主产品面要在这里延伸运行态/结果态，而不是另开第二套 truth page。
- `src/components/surfaces/teacher-course-center-surface.tsx` — 课程中心 hero / CTA / metric 结构，最近导入任务卡片需要对齐这里的表面语言。

### Async platform anchors
- `src/features/async-tasks/server/enqueue.ts` — canonical enqueue seam；Phase 41 触发 batch import 时必须复用它。
- `src/features/async-tasks/server/registry.ts` — typed registry 入口；需要增加 course import task definition。
- `src/features/async-tasks/shared/contract.ts` — `featureArea=course_import`、`partially_completed`、progress/result/reliability vocabulary 的平台 truth。
- `src/features/async-tasks/shared/dto.ts` — task list/detail DTO；课程中心卡片和批次详情页的 async 状态读取必须基于这些 DTO 组织。
- `src/features/async-tasks/server/mapper.ts` — async task durable row/event 到 product DTO 的映射层。
- `src/lib/dal/async-tasks.ts` — actor/entity-scoped task list 与 detail 读取面，可直接支撑课程中心卡片和 batch detail 上的最近任务读取。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/surfaces/course-import-review-surface.tsx`：已经有 hero、summary card、逐行分组、命中课程决策按钮与结果态框架，是 Phase 41 最适合继续扩展的主 surface。
- `src/lib/dal/course-import.ts`：已有 `buildReviewSummary()`、`buildApplySummary()`、逐行 `resultReason` 与批次状态更新逻辑，可直接映射为 async progress/result summary。
- `src/lib/dto/course-import.ts`：已有 `created / updated / skipped / failed` 与 `partially_applied` 词汇，适合和 async task 的 `partially_completed` 做语义对齐。
- `src/components/surfaces/teacher-course-center-surface.tsx`：现有 hero + metrics + CTA 布局已经预留顶部轻量信息区，适合挂最近导入任务卡片。
- `src/lib/dal/async-tasks.ts`：已有 `getActorAsyncTaskListDTO()`、`getEntityAsyncTaskListDTO()`、`getAsyncTaskDetailDTO()`，足以支撑 actor 视角与 batch entity 视角的任务读取。

### Established Patterns
- 项目固定采用“先有 durable batch / row truth，再执行真实业务写入”的导入模式；Phase 41 只是把同步 apply 换成 async execution，不重做 upload/draft truth。
- async platform 的产品面必须读 SQLite durable DTO，而不是直接读 BullMQ / Redis 状态。
- teacher surface 采用顶部 hero、tonal card、摘要先行的表达方式，Phase 41 的任务状态卡和结果摘要应延续这套节奏。
- 单一事实页面优先于多入口多真相页面；相同实体从不同入口进入时，最终应回到同一个 detail surface。

### Integration Points
- `applyCourseImportAction()` 很可能从“同步 apply”改为“校验 + enqueue batch import task”，而真正的业务写入迁到 worker processor / domain helper。
- `src/lib/dal/course-import.ts` 的同步 apply 主循环需要被提炼为 worker-safe 的执行 helper，供 async processor 调用。
- `src/features/async-tasks/server/registry.ts` 与 `src/features/async-tasks/worker/*` 需要增加 course import task definition 与 processor。
- `CourseImportReviewSurface` 需要同时承载审核态、运行态、完成态、partial success 态与 dispatch failure 态。
- `TeacherCourseCenterSurface` 需要接入最近导入任务卡片，并从 batch/detail route 回流到同一批次详情页。

</code_context>

<specifics>
## Specific Ideas

- 保持“上传生成草稿批次”与“审核后触发真实任务”这两个阶段的职责分离，不把上传阶段也扩成长任务。
- 当前批次详情页既是审核页，也是运行态与结果态页面，避免再造一个通用任务详情页抢事实来源。
- 课程中心顶部新增最近导入任务卡片，展示最近一次任务的状态、进度或结果摘要，并可一键返回对应批次详情页。
- partial success 的产品口径固定为“已完成，但有失败项”，顶部先看汇总计数，再看逐行原因。
- 同一批次 active task 只能有一个；重复点击时不报死错，而是直接带用户回当前任务。
- terminal 后允许再次创建新任务，但底层业务写入必须继续保持幂等与 honest summary。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 41-First real product slice - batch import async workflow*
*Context gathered: 2026-05-18*
