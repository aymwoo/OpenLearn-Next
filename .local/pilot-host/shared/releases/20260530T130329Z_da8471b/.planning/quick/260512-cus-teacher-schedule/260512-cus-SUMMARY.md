---
phase: quick
plan: 260512-cus
status: complete
---

# Quick summary

已完成：teacher schedule 已具备持久化主课表状态、切换 action，以及主课表与历史导入批次的稳定呈现逻辑。这个 quick 的目标已经被后续课表导入链路吸收。

## What changed

1. `src/features/schedule/import/server.ts` 提供 `setPrimaryScheduleImportBatch()`，通过学校范围内的持久化状态切换当前主课表。
2. `src/features/schedule/import/actions.ts` 暴露 `setPrimaryScheduleImportBatchAction()`，主课表页可直接把历史批次设为当前主课表。
3. `src/components/surfaces/teacher-schedule-surface.tsx` 优先读取持久化 primary batch，并在主视图与历史列表中稳定展示当前主课表、历史导入和切换入口。

## Verification

- `./node_modules/.bin/vitest run src/lib/dal/schedule-import.test.ts src/components/surfaces/teacher-schedule-surface.test.tsx src/components/surfaces/schedule-import-modal.test.tsx`
