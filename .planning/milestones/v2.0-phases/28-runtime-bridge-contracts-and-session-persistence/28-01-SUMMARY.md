---
phase: 28-runtime-bridge-contracts-and-session-persistence
plan: 01
subsystem: contracts
tags: [runtime-platform, contracts, zod, lesson-authoring, bridge]
requires:
  - phase: 27-03
    provides: shared runtime contracts root for descriptors, bridge, and events
provides:
  - versioned runtime descriptor fields on existing lesson step payloads
  - typed TeachingBridge request and result envelopes for runtime host actions
  - canonical runtime event types and published snapshot freeze coverage
affects: [phase-28, phase-29, runtime-host, lesson-publish, runtime-contracts]
tech-stack:
  added: []
  patterns: [runtime descriptor as optional payload block, typed bridge envelopes, frozen runtime snapshot contract]
key-files:
  created: []
  modified:
    - src/features/runtime-platform/contracts/descriptors.ts
    - src/features/runtime-platform/contracts/bridge.ts
    - src/features/runtime-platform/contracts/events.ts
    - src/features/runtime-platform/contracts/index.ts
    - src/lib/dto/lesson-authoring.ts
    - src/lib/dal/lesson-authoring.ts
    - src/features/runtime-platform/contracts/contracts.test.ts
    - src/lib/dal/lesson-authoring.test.ts
key-decisions:
  - "runtime descriptor 继续挂在现有 content/task/quiz payload.runtime 上，不新增 runtime 专用 step family。"
  - "submitTarget 使用 primary + additional 表达 one-to-many bridge 语义，确保 classroom evidence 与 task/quiz truth 可同时桥接。"
patterns-established:
  - "Pattern: shared runtime bridge contracts use Zod discriminated unions plus typed result payloads instead of record-only payload bags."
  - "Pattern: published lesson snapshots freeze the full runtime descriptor so runtime bootstrap never depends on mutable registry lookups."
requirements-completed: [BRDG-01, BRDG-02, BRDG-04]
duration: not-recorded
completed: 2026-05-16
---

# Phase 28 Plan 01: Runtime descriptor and TeachingBridge summary

**Versioned runtime descriptors on existing lesson payloads plus typed TeachingBridge request, result, and event contracts**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 为 `RuntimeDescriptorSchema` 补齐 `runtimeVersion`、`stateSchemaVersion`、`bootstrap`、`submitTarget`、`requestedCapabilities` 等 versioned contract 字段。
- 将 bootstrap、ready、interaction、save、submit、teacher-control 六类 TeachingBridge 请求与结果收敛成 typed envelope，而不是通用 `payload: record`。
- 让现有 `content`、`task`、`quiz` payload 通过可选 `runtime` block 携带 descriptor，并用回归测试锁住 publish snapshot 冻结完整 descriptor 的行为。

## Task Commits

No task commits recorded yet. 本计划产物当前仍在工作树中；若后续需要提交，应只精确提交 Phase 28 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/features/runtime-platform/contracts/descriptors.ts` - 定义 runtime descriptor、bootstrap metadata 与复合 `submitTarget` 语义。
- `src/features/runtime-platform/contracts/bridge.ts` - 定义 runtime host 请求和 typed result envelope。
- `src/features/runtime-platform/contracts/events.ts` - 扩展 canonical runtime event types。
- `src/lib/dto/lesson-authoring.ts` - 为现有三类 step payload 增加可选 `runtime` block。
- `src/lib/dal/lesson-authoring.ts` - 继续沿现有 publish snapshot 链冻结完整 runtime descriptor。
- `src/features/runtime-platform/contracts/contracts.test.ts` - 覆盖 descriptor、bridge、event 最小 parse 样例。
- `src/lib/dal/lesson-authoring.test.ts` - 锁住 runtime descriptor publish freeze 行为。

## Decisions Made

- runtime contract 必须继续沿用现有 lesson payload 和 published snapshot truth，不新增平行 step 模型。
- host/runtime contract 采用 discriminated union + typed result payload，避免后续 runtime host 回到 ad hoc JSON 交换。
- publish snapshot 必须保存完整 descriptor 对象，而不是只存 `runtimeId` 或 registry 引用。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 收紧 submit result envelope 后补齐 contract sample 字段**
- **Found during:** Task 1 verification
- **Issue:** `RuntimeSubmitResultSchema` 收紧后，contracts test 里的 submit sample 缺少 `lessonId` 与 `actorId`，导致最小 parse 样例不再代表真实 contract。
- **Fix:** 在 `src/features/runtime-platform/contracts/contracts.test.ts` 中补齐 submit result sample 的 `lessonId` 与 `actorId`。
- **Files modified:** `src/features/runtime-platform/contracts/contracts.test.ts`
- **Verification:** `pnpm exec vitest --run src/features/runtime-platform/contracts/contracts.test.ts src/lib/dal/lesson-authoring.test.ts`
- **Committed in:** pending (working tree)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅收紧回归样例以匹配最终 contract；未扩展计划范围。

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 可以直接基于 frozen runtime descriptor 与 typed bridge contracts 建 runtime session/state/bootstrap durability。
- 后续 runtime host 不需要再回查可变 registry 才能决定 bootstrap 或 submit 行为。

## Self-Check: PASSED

- Found `src/features/runtime-platform/contracts/descriptors.ts`
- Found `src/features/runtime-platform/contracts/bridge.ts`
- Found `src/lib/dto/lesson-authoring.ts`
- Found `src/lib/dal/lesson-authoring.test.ts`

---

*Phase: 28-runtime-bridge-contracts-and-session-persistence*
*Completed: 2026-05-16*
