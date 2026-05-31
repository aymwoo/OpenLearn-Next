---
phase: quick
plan: 260517-gnb
status: complete
---

# Quick summary

已完成：对 student runtime host bootstrap 的 capability 误配做最小修复，让 production-like 浏览器链路不再在 bootstrap 阶段返回 `HOST_ACTION_DENIED:capability_missing`，同时保持 runtime contract、proof handoff 与 teacher-control guard 不变。

## What changed

1. 在 `src/features/runtime-platform/host-actions/guards.ts` 中为 trusted student actor 补齐 `runtime:host-action:request` capability。
2. 在 `src/features/runtime-platform/host-actions/guards.test.ts` 中新增 focused regression，锁定 student resolver 会授予浏览器 bootstrap 所需 capability。
3. 保持现有 runtime host action 名称、governance contract、proof handoff 路径与 teacher-only control 分支不变。

## Verification

- `pnpm vitest run "src/features/runtime-platform/host-actions/guards.test.ts"`

## Key decisions

- 只修正 student trusted actor 的 capability 集合，不改 runtime host action contract，也不改 browser bootstrap envelope。
- 不放宽 `runtime-teacher-control` 路径；该路径仍由 teacher resolver + permission gate 单独保护。
