---
phase: 29-runtime-host-and-html-courseware-pilot
plan: 03
subsystem: authoring
tags: [runtime-platform, built-in-template, authoring, publish, snapshot]
requires:
  - phase: 28-01
    provides: runtime descriptor on existing lesson step payloads
  - phase: 29-01
    provides: shared Runtime Host and local runtime bootstrap contract
provides:
  - built-in HTML runtime teaching-step definition
  - editor-visible HTML runtime quick-add path
  - publish snapshot freeze proof for full runtime descriptor
affects: [phase-29, editor, built-ins, publish, runtime-descriptor]
tech-stack:
  added: []
  patterns: [built-in template on existing step family, local runtime entry only, snapshot freeze]
key-files:
  created: []
  modified:
    - src/lib/dto/resource-ai.ts
    - src/lib/dto/lesson-authoring.ts
    - src/lib/dal/plugins.builtins.test.ts
    - src/components/authoring/lesson-authoring-workspace.test.tsx
    - src/lib/dal/lesson-authoring.test.ts
key-decisions:
  - "HTML runtime pilot 继续作为现有 built-in teaching-step template 注入，不新增 runtime 专用 step family。"
  - "bootstrap 固定指向本地 `/runtime/html-courseware/pilot` route，不接受 remote source。"
patterns-established:
  - "Pattern: local runtime pilots are introduced by extending built-in template definitions, not by adding new authoring pathways."
requirements-completed: [RHOST-03]
duration: not-recorded
completed: 2026-05-16
---

# Phase 29 Plan 03: Built-in HTML runtime authoring summary

**Editor-visible built-in HTML runtime template with full descriptor freeze on the existing publish path**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 在 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 中新增 `htmlCourseware`，把首个 HTML runtime pilot 作为 built-in teaching-step template 暴露给 editor。
- 新模板继续使用现有 `task` step family，并在 `initialPayload.runtime` 中携带完整 descriptor：`kind: "html-courseware"`、`entry.sandbox: "iframe"`、`bootstrap: "/runtime/html-courseware/pilot"`、`submitTarget` 和最小 capability 集合。
- `lesson-authoring-workspace.test.tsx` 证明该 built-in 模板会出现在现有资源库中，并沿当前 add-step 行为注入 lesson flow。
- `lesson-authoring.test.ts` 持续锁住发布后 `publishedLessonVersions.snapshotJson` 保留完整 `payload.runtime` 对象，而不是退化成引用 id。

## Task Commits

No task commits recorded yet. 当前改动仍在工作树中；若后续需要提交，应只精确提交 Phase 29 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/lib/dto/resource-ai.ts` - 新增 `htmlCourseware` built-in 定义与本地 runtime descriptor。
- `src/lib/dto/lesson-authoring.ts` - 继续把 built-in runtime template 约束在现有 lesson step payload schema 内。
- `src/lib/dal/plugins.builtins.test.ts` - 锁定 built-in HTML runtime 定义及其 local bootstrap descriptor。
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - 锁定 editor 资源库可见性与 add-step 注入路径。
- `src/lib/dal/lesson-authoring.test.ts` - 锁定 publish snapshot freeze 行为。

## Decisions Made

- HTML runtime pilot 首发放在现有 `task` step family 下，确保 editor、publish、player、classroom 都继续消费统一 step truth。
- 本地 route `/runtime/html-courseware/pilot` 是唯一 bootstrap 入口，明确排除 remote bootstrap URL 和第三方 runtime source。
- `requestedCapabilities` 只声明 ready / event / save / submission 最小集合，不提前吞入 governance phase 的更细粒度 capability 模型。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Plan 04 可以直接用该 built-in template 驱动真实本地 HTML runtime pilot proof。
- 后续 Phase 30 可在不改 editor step family 的前提下，把 capability governance 叠加到现有 runtime descriptor 和 host action path 上。

## Self-Check: PASSED

- Found `builtInKey: "htmlCourseware"`
- Found `kind: "html-courseware"`
- Found `bootstrap: "/runtime/html-courseware/pilot"`
- Found runtime descriptor freeze assertions in `src/lib/dal/lesson-authoring.test.ts`

---

*Phase: 29-runtime-host-and-html-courseware-pilot*
*Completed: 2026-05-16*
