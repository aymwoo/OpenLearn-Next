---
phase: 43-additional-validation-workloads-and-milestone-proof
plan: 03
subsystem: ui
tags: [async-tasks, resource-processing, reminders, bullmq, business-truth]
requires:
  - phase: 43-01
    provides: scheduled reminder async contract and operator-only recovery posture
  - phase: 43-02
    provides: derived workload registry and worker processor pattern
provides:
  - knowledgeSource-scoped resource ingest task family
  - teacher-visible resource business status fed by knowledgeSources and knowledgeChunks
  - teacher reminder surface with honest async delivery copy and no feature-local recovery
affects: [resource library, schedule reminders, async worker, milestone proof]
tech-stack:
  added: []
  patterns: [business-entity-first async identity, worker-updated resource truth, teacher async honesty without task-center drift]
key-files:
  created: [src/features/async-tasks/worker/processors/resource-knowledge-source.ts, src/features/async-tasks/worker/processors/resource-knowledge-source.test.ts, src/lib/dal/ai-rag.test.ts, src/components/surfaces/library-surface.test.tsx]
  modified: [src/features/async-tasks/server/registry.ts, src/features/async-tasks/worker/registry.ts, src/lib/dal/ai-rag.ts, src/actions/ai-rag-actions.ts, src/lib/dal/resources.ts, src/lib/dto/resource-ai.ts, src/components/surfaces/library-surface.tsx, src/features/schedule/shared/dto/reminders.ts, src/features/schedule/reminders/server.ts, src/features/schedule/reminders/actions.ts, src/features/schedule/reminders/index.ts, src/actions/schedule-reminder-actions.ts, src/lib/dal/schedule-reminders.ts, src/components/surfaces/schedule-reminder-surface.tsx, src/components/surfaces/schedule-reminder-surface.test.tsx, src/lib/help/help-center-content.ts]
key-decisions:
  - "Resource processing async identity fixed to knowledgeSource rows, not resource rows or queue job ids."
  - "Teacher resource surface reads knowledgeSources.status and knowledgeChunks.indexingStatus derived business truth instead of async task internals."
  - "Reminder teacher page keeps rules plus deliveries layout and maps queued/running/retrying from async task truth without reintroducing teacher retry controls."
patterns-established:
  - "Resource ingest pattern: insert knowledgeSource pending -> enqueueAsyncTask with knowledge_source entityRef -> worker updates knowledgeSources and knowledgeChunks."
  - "Reminder honesty pattern: teacher page reads business deliveries and overlays latest async task status as queued/running/retrying copy while operator remains the sole recovery surface."
requirements-completed: [ATP-20, ATP-22]
duration: 19 min
completed: 2026-05-20
---

# Phase 43 Plan 03: Resource ingest and reminder honesty summary

**KnowledgeSource 现在已成为 resource ingest 的唯一 async identity，资源中心直接消费 RAG 业务状态，而教师 reminder 页面继续保持 rules + deliveries 视角并诚实映射 async 投递状态。**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-20T10:34:00+0800 (estimated)
- **Completed:** 2026-05-20T10:53:01+0800
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- 新增 `resource.knowledge_source_ingest` task family、worker processor 与 DAL 执行 helper，把 resource processing 正式接入 shared async platform。
- 扩展 resource DTO / DAL / library surface，让教师在资源中心看到 `RAG 待处理 / 处理中 / 已完成 / 处理失败` 与 chunk 级业务统计，而不是任务中心字段。
- reminder teacher surface 继续保留规则卡片与 delivery 列表，并把 queued/running/retrying/failed 映射为诚实业务文案，删除教师侧 retry / recovery 导出。

## Task Commits

Each task was committed atomically:

1. **Task 1: 以 `knowledgeSource` 为 identity 落 resource ingest/indexing workload，并把业务状态映射回资源中心** - `2e2ca98` (feat)
2. **Task 2: 保持教师 reminder surface 业务实体优先，并把 delivery 状态诚实映射为 async truth** - `15e4527` (feat)

**Plan metadata:** 待本 SUMMARY commit

## Files Created/Modified

- `src/features/async-tasks/server/registry.ts` - 注册 `resource.knowledge_source_ingest` task family。
- `src/features/async-tasks/worker/processors/resource-knowledge-source.ts` - 解析 payload、记录 progress、委托 DAL 执行 ingest/indexing。
- `src/lib/dal/ai-rag.ts` - 资源登记后立即按 `knowledgeSource.id` 入队，并在 worker helper 中推进 `knowledgeSources` / `knowledgeChunks` 业务状态。
- `src/lib/dal/resources.ts` - 聚合 latest knowledge source 与 chunk 统计，返回 teacher-facing resource business DTO。
- `src/lib/dto/resource-ai.ts` - 增补 resource card business status 字段与 resource async payload/result schema。
- `src/components/surfaces/library-surface.tsx` - 展示 teacher-facing RAG 状态 badge、chunk 统计与 operator-only 恢复提示。
- `src/features/schedule/shared/dto/reminders.ts` - 扩展 queued/running/retrying honest reminder status vocabulary。
- `src/features/schedule/reminders/server.ts` - 读取 reminder delivery 关联 task 的最新 async truth，并投影回 teacher-visible status。
- `src/components/surfaces/schedule-reminder-surface.tsx` - 保留 rules + deliveries 布局，替换为诚实 async status copy，移除本地恢复入口。

## Decisions Made

- reminder 的 queued/running/retrying 采用“读取 async task detail 后映射到业务 DTO”的方式实现，而不是扩写 `scheduleReminderDispatch` 表状态 enum。
- resource chunking 保持单 task family 内部稳定切分，直接写 `knowledgeChunks.indexingStatus = indexed/failed`，不再拆出第二个 indexing family。
- resource teacher surface 只展示 business truth 与 operator-only 提示，不暴露 `taskId`、`queueJobId` 或重试按钮。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修正 knowledge source DTO 时间戳与空资源正文判断**
- **Found during:** Task 1
- **Issue:** `registerKnowledgeSourceForResource()` 直接返回 `Date` 字段导致 DTO parse 失败；同时 chunk builder 把标题当正文，无法对无 URL/无 content 的资源诚实失败。
- **Fix:** 将 `createdAt/updatedAt` 统一转成 number，并改为只从 `resources.content` / `resources.url` 构造 source text。
- **Files modified:** `src/lib/dal/ai-rag.ts`
- **Verification:** `pnpm exec vitest --run src/lib/dal/ai-rag.test.ts`
- **Committed in:** `2e2ca98`

**2. [Rule 1 - Bug] 修正 reminder honest copy 仍含“重试”语义并补齐 queued/running/retrying DTO vocabulary**
- **Found during:** Task 2
- **Issue:** 新文案仍带“本地重试”措辞，且 teacher surface test 暴露 DTO 无法表达 queued/running/retrying honest async truth。
- **Fix:** 扩展 reminder status schema，改为从 async task detail 读取最新状态并映射为“排队中 / 正在投递 / 正在恢复 / 需 operator 处理”，同时移除 feature-local retry 导出。
- **Files modified:** `src/features/schedule/shared/dto/reminders.ts`, `src/features/schedule/reminders/server.ts`, `src/components/surfaces/schedule-reminder-surface.tsx`, `src/features/schedule/reminders/actions.ts`, `src/features/schedule/reminders/index.ts`, `src/actions/schedule-reminder-actions.ts`, `src/lib/dal/schedule-reminders.ts`
- **Verification:** `pnpm exec vitest --run src/components/surfaces/schedule-reminder-surface.test.tsx`
- **Committed in:** `15e4527`

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** 两项修复都直接服务于计划要求的 business truth / honest status 目标，没有引入额外 scope。

## Issues Encountered

- GitNexus 索引在执行前处于 stale 状态；已先运行 `npx gitnexus analyze` 再做 impact analysis / detect-changes。
- 仓库本身是 dirty worktree，且当前分支为 `main`；本次执行通过逐文件 `git add` 只提交计划相关改动，没有触碰用户已有脏改。

## Known Stubs

- `src/components/surfaces/library-surface.tsx:179` - `年级/学科: (暂无数据)`；原因：本 plan 目标是接入 knowledgeSource 业务状态，不负责补完资源教学元数据。
- `src/components/surfaces/library-surface.tsx:180` - `教材/版本: (暂无数据)`；原因同上。
- `src/components/surfaces/library-surface.tsx:181` - `册/章/节: (暂无数据)`；原因同上。
- `src/components/surfaces/library-surface.tsx:182` - `知识标签: (暂无数据)`；原因同上。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- shared async platform 现在已覆盖 manual（batch import）、scheduled（reminder delivery）、derived（classroom summary）与 resource processing 四类真实 workload 的前三块代码面事实。
- `43-04` 可以直接复用本 summary 的 resource/reminder evidence，为 milestone proof / coverage matrix 收尾。

## Self-Check: PASSED

- FOUND: `.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-03-SUMMARY.md`
- FOUND: task commit `2e2ca98`
- FOUND: task commit `15e4527`

---
*Phase: 43-additional-validation-workloads-and-milestone-proof*
*Completed: 2026-05-20*
