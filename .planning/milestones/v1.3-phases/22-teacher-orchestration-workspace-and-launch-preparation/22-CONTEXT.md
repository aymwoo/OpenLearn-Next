# Phase 22: Teacher orchestration workspace and launch preparation - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段把现有 `/teacher/editor` 与 `/teacher/launch` 之间的链路，升级成教师真正可用于开课前准备的 orchestration workspace。

交付重点不是新建第二套 session draft/config 系统，而是在既有 teacher-owned lesson flow、published lesson snapshot、launch path 和 Stitch teacher shell 语言之上，补齐三类能力：

1. 让教师能在开课前看到 class-facing 的 run sheet 主舞台，明确本节课的关键步骤、材料与采证提醒。
2. 让教师能基于已发布课时和整班名册完成 launch preparation，而不是只做最薄的“选课时 + 选班级”。
3. 让教师在 launch 前看到 readiness gate，把真正不能开课的阻断项和仅需关注的缺口区分开。

本阶段不重做 `/teacher/editor` 的 teacher-owned 入口纪律，不允许 launch 页写入 session-specific 临时配置，不开放小组/子集 roster scope，也不把 `/teacher/launch` 改成 utilitarian admin flow 或独立的新壳层。

</domain>

<decisions>
## Implementation Decisions

### Launch workspace structure
- **D-01:** Phase 22 的 `/teacher/launch` 必须升级为“三段工作台”，不是继续保留当前轻量 launch panel，也不是改成清单式向导。
- **D-02:** 三段工作台中，class-facing `run sheet` 必须成为单一主舞台；配置区与 readiness 区都是次级信息层。
- **D-03:** `run sheet` 的主呈现方式固定为“节奏卡片流”，继续复用当前 preview/card 语言，不切成表格或重时间线视图。

### Roster scope and launch scope
- **D-04:** Phase 22 的 launch scope 只允许“整班启动”，不开放小组、子集或多班混合。
- **D-05:** 即使本期只允许整班启动，教师在 launch 前也只能查看 roster 摘要与异常提示，不允许在该页临时排除学生或直接编辑名册。
- **D-06:** `/teacher/launch` 继续保持“从 published lesson + linked class 启动 classroom session”的单一路径，不新增第二套 session draft/config 持久化模型。

### Runtime emphasis and run-sheet information
- **D-07:** Phase 22 要显式强化的“运行时强调”是课堂节奏与关注点，而不是优先暴露 locked/unlocked 等课堂运行参数配置。
- **D-08:** `run sheet` 卡片上必须正式突出三类信息层：关键步骤、材料提示、采证提醒；不能只依赖正文描述。
- **D-09:** 上述课堂节奏/关注点在本阶段固定为“只读准备摘要”，不允许在 launch 页形成 session-specific 改写或临时备注系统。

### Readiness gate posture
- **D-10:** Phase 22 的 readiness gate 采用“少量硬阻断 + 明确提醒”，而不是几乎不阻断，也不是把所有缺口都收成严格 gate。
- **D-11:** 本阶段的硬阻断仅包括：没有可启动班级、没有已发布课时。
- **D-12:** teaching design、materials、evidence 等准备缺口不会直接阻止开课，而是分成“需关注 / 建议完善”两级提醒。

### Existing constraints to preserve
- **D-13:** `/teacher/launch` 继续是唯一课堂准备入口；live classroom 恢复区仍保持次级呈现，不压过新开课堂主动作。
- **D-14:** launch preview / run sheet 继续只读取已发布课时快照与其服务端 fallback，不回退到 draft lesson 或客户端拼装。
- **D-15:** `/teacher/editor` 继续保持显式 `courseId + lessonId` 的 teacher-owned 入口纪律；Phase 22 只能扩展其 orchestration/readiness 可见性，不能改成全局入口或模糊回退。
- **D-16:** 现有 `PUBLISH_BLOCKED`、`getLessonPublishReadinessDTO()`、teacher-owned DAL + Server Actions + explicit cache invalidation 边界继续保留；Phase 22 的 readiness 只能在其上扩展，不能另起直连 DB 或前端推断路径。
- **D-17:** 页面实现继续遵守现有 Stitch teacher shell 与 route metadata 体系：单主舞台、tonal cards、简体中文、无额外新壳层。

### the agent's Discretion
- orchestration workspace 的三段具体命名、卡片信息密度、warning 文案分级、以及 editor 与 launch 间哪些 teaching-design cue 复用同一 DTO，可由 planner 在不违背上述边界的前提下收敛。
- readiness “需关注 / 建议完善” 两级在 DTO 中的精确字段名与排序规则，可由 planner / researcher 收敛，但必须保持 typed 且可被测试。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.3 里程碑目标、技术与设计硬约束，以及 teacher orchestration 不能偏离 classroom flow 主线的项目级边界。
- `.planning/ROADMAP.md` — Phase 22 的正式 goal、success criteria、3 个计划槽位，以及它对 `ORCH-02` / `ORCH-03` 的范围定义。
- `.planning/REQUIREMENTS.md` — `ORCH-02` 与 `ORCH-03` 的正式需求来源，以及与后续 `ACT-*`、`EVAL-*` 的责任边界。
- `.planning/STATE.md` — 已锁定的 `/teacher/launch` 唯一入口、teacher shell、editor、published snapshot、中文界面与 design constraints。

### Prior phase decisions that carry forward
- `.planning/phases/17-teacher-flow-editor-enhancement/17-CONTEXT.md` — `/teacher/editor` 继续保持 `courseId + lessonId` teacher-owned 入口、真实 preview route 与 publish-readiness contract。
- `.planning/phases/18-teaching-schedule-os/18-CONTEXT.md` — 继续沿用 `DAL + Server Actions + explicit cache invalidation` 的强边界，避免 orchestration/workspace 侧滑到 UI 推断或越权写入。
- `.planning/phases/19-teacher-shell-route-metadata-system/19-CONTEXT.md` — teacher-facing shell 已走 route metadata + centralized resolver，Phase 22 不能另起独立壳层。
- `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-CONTEXT.md` — teachingDesign / evidenceExpectation / published snapshot fallback 已落地，且 readiness 阻断升级明确留给 Phase 22 处理。

### Existing teacher launch and preview contracts
- `src/app/(teacher)/teacher/launch/page.tsx` — `/teacher/launch` 当前只通过 `getClassroomConsoleDTO()` 读取 teacher console 数据，是 Phase 22 的主入口。
- `src/components/surfaces/classroom-launch-surface.tsx` — 当前 launch 页的 hero、主次区布局与“新课堂主动作 + live classroom 次级恢复区”语言。
- `src/components/classroom/classroom-launch-panel.tsx` — 当前选课时 / 选班级 / 启动 classroom session 的交互入口与客户端状态机。
- `src/components/classroom/classroom-launch-preview.tsx` — 当前 launch preview 卡片流，是 Phase 22 `run sheet` 的最近邻实现。
- `src/lib/dal/classroom.ts` — `getClassroomConsoleDTO()`、`buildLaunchPreview()`、published snapshot 解析与 launch data assembly 的权威实现。
- `src/lib/dto/classroom.ts` — `ClassroomConsoleDTO`、`ClassroomLaunchPreviewDTO`、`materialCues`、`teachingDesignStatus` 等 typed contract 的真实来源。
- `src/actions/classroom-actions.ts` — launch classroom session 的 Server Action 边界与现有 classroom write path。

### Existing teacher editor and readiness contracts
- `src/components/surfaces/lesson-editor-surface.tsx` — 当前 editor 主壳与 header metrics，决定 Phase 22 不能另起第二个 teacher workspace。
- `src/components/authoring/authoring-status-panel.tsx` — 当前 publish readiness panel，已经消费结构化 `blockingIssues` 与 `warnings`。
- `src/components/authoring/lesson-editor-header-actions.tsx` — preview / publish / save 的现有 header action contract。
- `src/components/surfaces/teacher-lesson-preview-surface.tsx` — teacher preview 已展示默认推断、步骤顺序与材料摘要，可复用其信息层策略到 orchestration workspace。
- `src/lib/dal/lesson-authoring.ts` — `getLessonEditorDTO()`、`getLessonPublishReadinessDTO()`、`PUBLISH_BLOCKED` 路径与 teacher-owned lesson flow 约束。
- `src/actions/lesson-authoring-actions.ts` — publish path 如何复用 readiness contract 与 `updateTag()` 写后失效。

### Shell and visual integration
- `src/lib/theme-layout/route-surface-registry.ts` — `/teacher/launch` 与 `/teacher/editor` 的 route metadata、shell mode、radius、width、chrome 约束。
- `docs/teacher-classroom-flow-review.md` — editor → publish → launch → runtime 的全链路回顾，帮助避免 Phase 22 打破现有职责边界。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/dal/classroom.ts`：`buildLaunchPreview()` 已基于 published snapshot 产出步骤顺序、时长、evidenceSummary 与 `materialCues`，非常接近 Phase 22 的 `run sheet` 数据底座。
- `src/components/classroom/classroom-launch-preview.tsx`：已经是“节奏卡片流”形态，并且内置 `默认推断` / `待完善` / `材料` 等 badge 语言，可直接演进而不是重写。
- `src/lib/dal/lesson-authoring.ts`：`getLessonPublishReadinessDTO()` 与 `getLessonEditorDTO().publishState` 已提供结构化 readiness gate，适合作为 launch readiness 的上游输入。
- `src/components/authoring/authoring-status-panel.tsx`：已形成“阻断项 / 提醒项”分层消费模式，Phase 22 可以保持同一 readiness 心智。
- `src/components/surfaces/teacher-lesson-preview-surface.tsx`：已有 teacher-facing 的步骤摘要、默认推断提示和材料信息层，是 orchestration workspace 可复用的视觉参考。

### Established Patterns
- `/teacher/launch` 当前是“新课堂主动作 + live classroom 次级恢复区”的明确双层结构，说明 Phase 22 应强化主舞台，而不是把恢复区和新开课并列成两个主任务。
- launch preview 继续只读已发布课时快照，这是 Phase 21 已锁定的事实来源；Phase 22 不能为了做 orchestration 而退回 draft lesson。
- teacher editor 与 preview 已经把 `teachingDesignStatus` / `needsTeachingDesignRefinement` 暴露到 DTO，说明 launch readiness 可以消费这些服务端 cue，而不是重新在 UI 做文本推断。
- teacher-facing shell 已由 route metadata 管理，`/teacher/launch` 和 `/teacher/editor` 都处于同一 shell 语言内，Phase 22 不能引入 utilitarian admin-only 页风。

### Integration Points
- `src/lib/dal/classroom.ts` / `src/lib/dto/classroom.ts`：最可能新增 orchestration workspace DTO、roster summary、readiness issue 分级与 run-sheet summary 聚合。
- `src/components/surfaces/classroom-launch-surface.tsx` / `src/components/classroom/classroom-launch-panel.tsx` / `src/components/classroom/classroom-launch-preview.tsx`：Phase 22 主要 UI 改动集中区。
- `src/lib/dal/lesson-authoring.ts` / `src/components/authoring/authoring-status-panel.tsx`：launch readiness 和 editor readiness 之间的共享 contract 集成点。
- `/teacher/editor` 相关 surface 与 header actions：如果 Phase 22 需要暴露更多 orchestration summary，应在现有 editor shell 内扩展，而不是新起页面体系。

</code_context>

<specifics>
## Specific Ideas

- orchestration workspace 的核心应是一个面向“马上要带着学生上的这节课”的 class-facing `run sheet`，而不是又一个配置表单页。
- `run sheet` 卡片必须正式承载“关键步骤 + 材料 + 采证提醒”，让教师在开课前快速扫一遍课堂节奏与关注点。
- readiness gate 要诚实，但不要过度阻断：硬阻断只处理“根本开不了课”的情况，其余缺口留在 `需关注 / 建议完善`。
- 名册在本期只作为“整班 launch + 摘要检查”的对象，不扩展成 launch 前的 roster operations center。

</specifics>

<deferred>
## Deferred Ideas

- 小组/子集 roster scope 或多班混合 launch — 更适合后续课堂编排与运行 phase。
- launch 前的 session-specific 临时备注、运行参数草稿或完整 session config 系统 — 超出本阶段“只读准备摘要”边界。
- 把 locked/unlocked、课堂控制面更复杂的实时交互前移到 launch workspace — 更适合 `Phase 23-24`。
- 把 readiness 缺口直接升级成全面严格阻断或正式评价 contract — 超出本阶段范围，应留给后续 evaluation / operations phases。

</deferred>

---

*Phase: 22-teacher-orchestration-workspace-and-launch-preparation*
*Context gathered: 2026-05-13*
