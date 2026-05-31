# Phase 41: First real product slice - batch import async workflow - Research

**Researched:** 2026-05-19
**Status:** Ready for planning
**Confidence:** HIGH

## Executive Summary

Phase 41 不需要重新选择 queue、worker、或 product surface 技术路线。Phase 39-40 已经把
typed registry、canonical enqueue seam、BullMQ worker、QueueEvents durable projection、
以及 actor/entity-scoped task DTO 固定下来。本阶段真正要研究的，是如何把现有课程导入
`apply` 主链路从同步写入，升级成 teacher/staff 真正可触发、可观察、可解释的 async 产品面。

结论很明确：

- upload 仍然只生成 draft batch，不进入 async queue。
- async trigger 必须发生在审核完成后的“应用本批导入”动作上。
- batch detail page 必须继续做唯一事实页面；不能另外发明通用 task detail 页面。
- 当前同步 `applyCourseImport()` 必须拆成“触发/冻结”与“worker 执行”两层，避免 web 请求继续承担真实业务写入。
- 平台级 `task_id` job identity 还不够，Phase 41 必须增加 **同一 batch active task 唯一** 的业务语义。
- `completed` / `partially_completed` 的 async platform vocabulary，必须与课程导入现有
  `applied` / `partially_applied` 结果词汇做显式映射，不能让 partial success 在 UI 中被压扁。

## Phase-Specific Findings

### 1. Trigger point stays after review, not at upload

现有 `CourseImportModal` + `draftCourseImportAction()` 已经形成稳定的“上传 CSV -> 生成草稿批次
-> 跳转审核页”链路，这条链路和 D-41-01 完全一致，应保留不动。

真正需要替换的是：

- `applyCourseImportAction()` 目前直接调用 `applyCourseImport()`
- `applyCourseImport()` 目前在 web request 内同步循环写课程、更新行结果、回写 batch summary

Phase 41 应把这里改成：

1. 校验 batch 仍可触发
2. 持久化 matched row decisions，并冻结当前批次决策
3. 检查该 batch 是否已有 active task
4. 若无 active task，则走 `enqueueAsyncTask()` 创建 `course_import` task
5. 只在 dispatch 成功后返回 durable task id + honest queued posture
6. 如果 dispatch 失败，保留在当前批次页并显示 failed / 未入队状态

这正好满足 D-41-03 / D-41-04 / ATP-11 / ATP-14。

### 2. Batch detail page must stay the single truth surface

`src/app/(teacher)/teacher/courses/import/[batchId]/page.tsx` 现在只读取 `getCourseImportBatchDTO()`，
再渲染 `CourseImportReviewSurface`。这正是最合适的单一事实页面。

因此 Phase 41 不应新建另一条 `/tasks/[id]` 或 `/teacher/courses/import/tasks/[taskId]` 主路径；
而应扩展现有 batch DTO / review surface，使它同时承载：

- dispatch_failed
- queued
- running
- retrying
- completed
- partially_completed
- failed

关键点：

- **batch domain status** 与 **async task runtime status** 不应混成一个枚举
- batch 仍表达“草稿/审核/已应用”这类领域状态
- task DTO 负责表达 queue/runtime 进度与结果

也就是说，`CourseImportBatchDTO` 更适合新增 `asyncTask` / `latestTask` 摘要字段，而不是直接把
`CourseImportBatchStatusSchema` 改写成 BullMQ runtime 枚举。

### 3. Current course center DTO lacks the recent import task card data

`TeacherCourseCenterSurface` 已有 hero + metrics + CTA 结构，且 D-41-06/07/08 明确要求顶部轻量
“最近导入任务”卡片。因此最自然的路径不是客户端自拼，而是：

- 扩展 `getTeacherCourseCenterDTO()`
- 在 DAL 内读取当前 actor 最近一个 `featureArea=course_import` 的 task DTO
- 再把对应 batch label / status / progress / terminal summary 组合成 hero card 所需字段

当前仓库已有：

- `getActorAsyncTaskListDTO()`
- `getEntityAsyncTaskListDTO()`
- `getAsyncTaskDetailDTO()`

所以课程中心卡片不需要直连 BullMQ，也不需要新建 operator-style task list。

### 4. Synchronous apply logic should become a worker-safe execution helper

`src/lib/dal/course-import.ts` 当前的 `applyCourseImport()` 做了三件事：

1. 读取 batch + row truth
2. 按行决定 created / updated / skipped / failed
3. 回写 row result 与 batch summary

这套业务语义本身是正确的，但执行位置不对。Phase 41 的最小正确改法不是重写一遍，而是提炼出：

- `prepare/enqueue` path：负责鉴权、冻结决策、active-task dedupe、enqueue
- `execute` path：worker 内部调用的 server-only helper，复用现有逐行 apply 业务语义

这样可以保持：

- DAL/teacher scope 校验不丢
- 既有 `created / updated / skipped / failed` 结果词汇不丢
- worker 仍走 server-side helper，不直接裸写 DB

这符合 ATP-10 与 Phase 40 已锁定的执行边界。

### 5. Partial success needs explicit dual-vocabulary mapping

现有课程导入领域里：

- batch terminal status: `applied` / `partially_applied`
- row result summary: `created / updated / skipped / failed`

async task 平台里：

- task terminal status: `completed` / `partially_completed` / `failed`
- result summary: `outcome + counts + detail`

这两套词汇不能互相覆盖。最稳妥的做法是：

- batch truth 继续保留 `applied` / `partially_applied`
- async task result summary 显式产出 `completed` / `partially_completed`
- UI 层做一对一文案映射：
  - `completed` + failed=0 -> “已完成”
  - `partially_completed` -> “已完成，但有失败项”

特别要注意：`infra/queue-events.ts` 当前在 `completed` 事件上会写一个通用 `latestResultJson`，
只含 generic completed summary。Phase 41 若要让课程中心卡片和 batch detail 顶部看到真实 counts，
规划时必须确保 **worker returnvalue 能被投影成 richer result summary**，或者在 task 完成前由
worker-side helper 先把 `latestResultJson` 写成 batch-import-specific summary，再由 completed
事件保持一致。否则 ATP-13 会只剩 generic “done” posture。

### 6. Platform task-id idempotency is not enough; batch-level dedupe is required

Phase 40 的 `buildAsyncTaskJobOptions()` 解决的是“同一个 durable task 不重复派发 job”，
但 D-41-13/14/15 需要的是更高一层的业务语义：

- 同一个 batch active task 只能有一个
- duplicate click 时应复用现有 active task，并返回“这批导入已在处理中”
- terminal task 不复用；允许新尝试

因此 Phase 41 需要新增 **batch-level active task lookup**，优先基于：

- `entityType = course_import_batch`
- `entityId = batchId`
- active statuses = `queued | running | retrying | stalled_recovery | dispatching | pending_enqueue`

如果查到 active task，触发动作应直接返回该 task DTO/ID，而不是新建第二个 durable task。

### 7. Worker retries and duplicate deliveries still need business-write honesty

即使 terminal 后允许重新创建新任务，worker retry / duplicate delivery 仍不能污染课程写入。
当前同步 apply 已有一些天然保护：

- 匹配到同一状态时会 `skipped`
- 已有 owner mismatch 会 `failed`

但在 async world 中仍要额外确保：

- 同一次 task attempt 重放不会重复创建同一门课程
- 同一 row 若已成功写入，应能在 retry 时被识别为已完成/可跳过
- batch summary 重算必须诚实反映最新 durable row truth

规划上不一定要新增复杂表，但至少要明确：worker processor 读取 durable row state，而不是仅信任内存中的
初始 payload。这样 retries 才能以数据库里已写入的 row/result 为基础继续收敛。

### 8. Cache invalidation must cover both async task and course import surfaces

当前 `course-import-actions.ts` 只失效：

- `teacherCourses(actorId)`
- `courseImportSchool(schoolId)`
- `courseImportBatch(batchId)`

而 async task 平台会失效：

- `asyncTask(taskId)`
- `asyncTaskList(actorId)`
- `asyncTaskEntity(entityType, entityId)`

Phase 41 的 worker/result path 必须同时顾及这两组 tags。否则会出现：

- task status 已更新，但 batch page 仍旧缓存旧 summary
- batch result 已更新，但课程中心最近任务卡还在旧状态

因此规划时应把 cache-safe state update 视为 Phase 41 的一等内容，而不是测试附属项。

## Constraints Carried into Planning

### Must implement exactly per roadmap and context

- **ATP-11:** teacher/staff 能把 batch import 作为 async task 触发，而不是等待同步请求完成
- **ATP-12:** teacher/staff 能在产品面看到 queued/running/completed/failed/retrying 状态
- **ATP-13:** teacher/staff 能看到结果摘要、partial-result、failure feedback
- **ATP-14:** 产品面不能把 queued 伪装成 done
- **ATP-19:** 至少一条 batch import workflow 在 async platform 上跑通 durable progress + partial-result reporting
- **D-41-01 ~ D-41-04:** async trigger only after review，当前页切换为运行/结果面，决策冻结，dispatch failure 留在当前页
- **D-41-05 ~ D-41-08:** batch detail 仍是主真相页，课程中心顶部增加轻量最近导入任务卡
- **D-41-09 ~ D-41-12:** partial success 必须显式表达，先汇总后逐行，失败项只引导重新导入创建新任务
- **D-41-13 ~ D-41-16:** 同 batch active task 唯一；重复点击复用；terminal 后可新建；底层写入仍需幂等诚实

### Must not appear in plans

- 把上传解析阶段也扩成第二条 async workflow
- 新建 operator dashboard / operator retry UI / 通用任务中心
- 在结果页做失败行就地重跑、局部补救、或人工 patch 流
- 让产品面直接读取 BullMQ / Redis job state
- 为了 Phase 41 重新发明第二套课程导入页面真相源

## Codebase Patterns to Reuse

### Pattern 1: canonical enqueue seam + durable intent first

参考：`src/features/async-tasks/server/enqueue.ts`

可复用做法：

- 统一通过 `enqueueAsyncTask()` 创建 durable task + dispatch intent
- dispatch success / failure 都保留 honest latest snapshot
- entity-scoped cache tags 已内建，可直接支撑 batch entity task lookup

### Pattern 2: QueueEvents remains signal source, SQLite remains product truth

参考：`src/features/async-tasks/infra/queue-events.ts`

可复用做法：

- worker runtime 事件投影回 `asyncTasks` / `asyncTaskEvents`
- UI/DAL 只读 SQLite DTO
- product surfaces 不需要也不应直接接触 BullMQ 类

### Pattern 3: course import review/result surface already has the right UI skeleton

参考：`src/components/surfaces/course-import-review-surface.tsx`

可复用做法：

- hero + primary action inset
- summary cards
- 顶部先看汇总，再看逐行原因
- 结果态与审核态已共处同一 surface，非常适合继续扩展 queued/running/partial/failure posture

### Pattern 4: hero-level lightweight cards on teacher surfaces

参考：`src/components/surfaces/teacher-course-center-surface.tsx`

可复用做法：

- hero 区先给轻量摘要，再进入下方主内容区
- tonal card + concise copy 适合承载“最近导入任务”
- 不需要开新 route，也不需要把课程中心做成 operator console

### Pattern 5: phase verifier = static guards + focused suites

参考：`scripts/verify-phase40-bullmq-runtime.ts`

Phase 41 也应继续采用：

- 静态守卫：upload path 不直接 async、apply action 不再同步写业务、surface 不直读 BullMQ
- focused suites：action dedupe、worker processor、batch/detail DTO、course center card、review surface honest copy

## Planning Implications

与 roadmap 当前 3 个 plan 槽位一致，最自然的拆法仍是：

1. **Backend integration plan**
   - 新增 `course_import` task definition / payload / result contract
   - 改造 apply action 为 freeze + dedupe + enqueue
   - 提炼 worker-safe batch import execution helper 与 processor

2. **Product surfaces plan**
   - 扩展 batch DTO + review surface，承载 dispatch failure / queued / running / terminal result
   - 扩展 teacher course center DTO + hero 顶部最近导入任务卡

3. **Verification plan**
   - 锁住 single-active-task 语义、partial success summary、cache invalidation、dispatch honesty
   - 增加 `verify:phase41`

依赖顺序：

- Plan 01 -> Plan 02 -> Plan 03

原因：

- UI surface 依赖 batch import async contracts 与 task lookup
- verifier 依赖前两者的最终 contract 和 copy posture

## Verification Expectations for Planning

规划时应要求最终实现至少能通过以下验证路径：

- `applyCourseImportAction` focused tests：
  - active task 存在时复用
  - dispatch failure 保留在当前 batch truth
  - trigger 后 row decisions 冻结
- worker processor / execution helper tests：
  - created / updated / skipped / failed 汇总正确
  - partial success 映射为 `partially_completed`
  - retry / duplicate delivery 不重复污染写入
- batch detail DTO / surface tests：
  - queued/running/failed/partial/completed 状态诚实渲染
  - 顶部先汇总后逐行
- course center DTO / surface tests：
  - hero 顶部最近导入任务卡显示最近状态或终态摘要
- dedicated verifier：
  - `pnpm verify:phase41`

可接受的自动化命令示例：

- `pnpm test --run src/actions/course-import-actions.test.ts src/lib/dal/course-import.test.ts src/components/surfaces/course-import-review-surface.test.tsx src/components/surfaces/teacher-course-center-surface.test.tsx`
- `pnpm verify:phase41`

## Sources

- `.planning/phases/41-first-real-product-slice-batch-import-async-workflow/41-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-CONTEXT.md`
- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-RESEARCH.md`
- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-03-SUMMARY.md`
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md`
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-03-SUMMARY.md`
- `src/actions/course-import-actions.ts`
- `src/lib/dal/course-import.ts`
- `src/lib/dto/course-import.ts`
- `src/components/courses/course-import-modal.tsx`
- `src/components/surfaces/course-import-review-surface.tsx`
- `src/components/surfaces/teacher-course-center-surface.tsx`
- `src/app/(teacher)/teacher/courses/import/[batchId]/page.tsx`
- `src/lib/dal/course-authoring.ts`
- `src/lib/dto/course-authoring.ts`
- `src/features/async-tasks/server/enqueue.ts`
- `src/features/async-tasks/server/registry.ts`
- `src/features/async-tasks/shared/contract.ts`
- `src/features/async-tasks/shared/dto.ts`
- `src/features/async-tasks/server/mapper.ts`
- `src/lib/dal/async-tasks.ts`
- `src/features/async-tasks/infra/queue-events.ts`
- `src/features/async-tasks/worker/bootstrap.ts`
- `scripts/verify-phase40-bullmq-runtime.ts`
- GitNexus query for `batch import async task workflow course import apply review surface` (processes around `CourseImportReviewPage` and `CourseImportReviewSurface`)

---

*Phase: 41-first-real-product-slice-batch-import-async-workflow*
*Research completed: 2026-05-19*
