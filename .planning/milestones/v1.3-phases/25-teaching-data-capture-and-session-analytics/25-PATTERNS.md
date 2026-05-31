# Phase 25: Teaching data capture and session analytics - Patterns

## 1. DTO and schema declaration patterns

### Analog: `src/lib/dto/classroom.ts`

- 模式：先声明小粒度 schema（summary、participant、detail entry、tab），再组合成 route 级 DTO。
- 适用于：`ClassroomSessionRecapDTO`、student recap summary、step diagnostic summary、history session entry、workload split DTO。

### Analog: `src/lib/dto/resource-ai.ts`

- 模式：输入 schema 与输出 DTO 明确分开，最终统一导出 `type` 供 DAL、page、surface 共用。
- 适用于：`getClassroomSessionRecapDTO({ sessionId, studentId?, stepId?, detailTab? })` 的 input contract，避免 UI 自己拼 query 语义。

## 2. Session-first DAL read model patterns

### Analog: `src/lib/dal/classroom.ts`

- 模式：teacher-scoped session read 在一处函数内完成聚合，UI 只消费 DTO，不在 client 重算事实。
- 适用于：Phase 25 recap summary、student-first drill-down、step diagnostics、history reopen list。

### Analog: `src/lib/dal/learning.ts`

- 模式：lesson-domain truth 保持原 owner，不迁移真相源；新场景通过 helper 只读桥接其统计语义。
- 适用于：`待反馈提交` 继续基于 latest `taskSubmissions` / `quizAttempts` + `attemptFeedback` 推导，不回写 `classroomEvidence`。

## 3. Route and surface takeover patterns

### Analog: `src/app/(classroom)/classroom/page.tsx`

- 模式：route page 保持很薄，按 `searchParams` 和 session 状态决定读取哪份 DTO，再交给 surface。
- 适用于：live session 继续走 `getClassroomSnapshotDTO()`，ended/history session 改走 `getClassroomSessionRecapDTO()`。

### Analog: `src/components/surfaces/classroom-console-surface.tsx`

- 模式：单一主舞台承接 route 主叙事，其余结构退回 tonal secondary panels，不并列两个 hero。
- 适用于：ended 后由 recap hero 接管 `/classroom` 主舞台，而不是在 live control 旁边补一个 analytics widget。

## 4. Student-first detail workflow patterns

### Analog: `src/components/classroom/classroom-student-detail-panel.tsx`

- 模式：先给单个学生的可读摘要，再给 grouped evidence / evaluation 细节，不先抛原始日志流。
- 适用于：recap 下的 student summary、`完成情况 / 提交与反馈 / 过程评价 / 课堂时间线` 四组证据结构。

### Analog: `src/components/classroom/classroom-roster-panel.tsx`

- 模式：列表优先回答“谁需要看”，而不是只展示抽象统计。
- 适用于：student recap summaries 中的 follow-up 标签、`需要关注 / 未评价 / 待反馈` 等教师行动信号。

## 5. History and same-domain navigation patterns

### Analog: `src/lib/dal/classroom.ts#getClassroomConsoleDTO`

- 模式：console 级 DTO 统一提供 route 所需的 session selector 数据，避免页面再查第二次 session list。
- 适用于：在 `/classroom` 下加入最近 ended/history sessions 列表，支持同域 reopen。

### Analog: Phase 24 same-route student detail

- 模式：状态通过 `sessionId`、`studentId`、`detailTab` 之类显式 query 参数保持可刷新、可分享、可服务端读取。
- 适用于：Phase 25 的 history reopen、selected student、selected step diagnostic 入口。

## 6. Cache and invalidation patterns

### Analog: `src/lib/dal/course-authoring.ts`

- 模式：只有稳定、低频、可明确失效的读模型才用 `"use cache" + cacheLife() + cacheTag()`；高频 teacher-scoped summary 保持 request-fresh。
- 适用于：Phase 25 外层 recap DTO 优先 request-fresh；如需缓存，仅局部缓存 published step metadata 或纯静态 step shell。

### Analog: `src/actions/classroom-actions.ts` and `src/actions/learning-actions.ts`

- 模式：写路径只负责 mutate + `updateTag()`，不让 UI 假设刷新时机。
- 适用于：若 Phase 25 引入新的 recap helper 依赖 classroom tag，则 formative evaluation / end session / feedback action 都必须在计划中明确失效矩阵。

## 7. Verification script patterns

### Analog: `scripts/verify-phase18-schedule.ts`

- 模式：phase verifier 先做静态 invariant checks，再跑 focused `pnpm test --run ...`；不用人工 checklist 作为完成证明。
- 适用于：`verify:phase25`，验证同域 `/classroom` recap、无第二真相源、未评价显式 bucket、bridged workload 口径、empty state 行为。

### Analog: `scripts/verify-phase16-theme-layout.ts`

- 模式：除了 required file checks，还要检查 anti-pattern，例如禁用 route migration、禁用新的 analytics snapshot table、禁用 `/teacher/review` 反客为主。
- 适用于：Phase 25 的静态边界守卫。

## 8. Phase 25 implementation rules derived from patterns

1. `src/lib/dto/classroom.ts` 应一次性补齐 recap DTO 族，避免 25-01/25-02/25-03 反复争抢同一 contract。
2. `src/lib/dal/classroom.ts` 必须成为 session recap 的唯一聚合 owner；`src/lib/dal/learning.ts` 只提供 lesson-domain feedback bridge 语义。
3. `/classroom` 继续是唯一 session recap 主域；历史回看也必须留在这个 route family 内。
4. student-first 是 recap 主路径；step diagnostics 只能作为次级辅助诊断，不得抢占首屏或默认 drill-down。
5. `待反馈提交` 与 `待跟进课堂信号` 必须明确拆开建模、渲染和验证，不允许后续在 UI 层再合成一个模糊总数。
6. participation 必须强制保留 `未评价` bucket，并在 verifier 中静态守卫，不允许因为展示需要而默认归入 `正常参与`。
7. 若 completion / submission 指标无法做到严格 session-owned immutable，计划必须在 DTO 字段和 copy 中诚实标注其 bridge/current-state 语义。
8. Phase 25 需要专属 `verify:phase25`，收口 DAL 聚合、surface 路由分支、scoping 与 empty states，避免后续 Phase 26 产品化时静默破坏 recap 边界。
