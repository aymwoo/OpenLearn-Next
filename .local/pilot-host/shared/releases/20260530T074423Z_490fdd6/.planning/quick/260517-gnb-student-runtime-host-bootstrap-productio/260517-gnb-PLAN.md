---
phase: quick
plan: 260517-gnb
type: execute
wave: 1
depends_on: []
files_modified:
  - src/features/runtime-platform/host-actions/guards.ts
  - src/features/runtime-platform/host-actions/guards.test.ts
autonomous: true
requirements:
  - QUICK-student-runtime-bootstrap-capability
---

<objective>
修复 student runtime host bootstrap 在 production-like 浏览器链路中被 governance 误拒绝为 `HOST_ACTION_DENIED:capability_missing` 的问题；保持 runtime contract、proof handoff 与 teacher-control 路径不变。
</objective>

<verification>
- `pnpm vitest run "src/features/runtime-platform/host-actions/guards.test.ts"`
</verification>

<success_criteria>
- [ ] student actor 能通过 browser runtime host bootstrap 所需 capability 校验
- [ ] 不改 runtime contract 与 proof handoff 路径
- [ ] host action guard focused tests 通过
</success_criteria>
