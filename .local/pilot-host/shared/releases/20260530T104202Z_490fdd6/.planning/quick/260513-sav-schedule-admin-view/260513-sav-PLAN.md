---
phase: quick
plan: 260513-sav
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/seed-test-accounts.ts
  - src/features/schedule/runtime/server.ts
  - src/features/schedule/shared/dto/runtime.ts
  - src/components/surfaces/teacher-schedule-surface.tsx
  - src/features/schedule/runtime/server.test.ts
  - src/components/surfaces/teacher-schedule-surface.test.tsx
autonomous: true
requirements:
  - QUICK-schedule-admin-view
---

<objective>
修复 `/teacher/schedule` 在测试教师账号下只能看到本人课表的问题，让测试教师账号具备管理员视角，并把主课表改成更紧凑、现代、可同时容纳多位教师课程的展示。
</objective>

<context>
- 当前测试教师账号是 `teacher@example.com`
- 该账号需要保留 teacher 身份，同时增加同校 admin 身份
- 管理员视角只用于 `/teacher/schedule` 主页面，不扩散到整个 schedule 域共享权限入口
</context>

<verification>
- `pnpm vitest run "src/features/schedule/runtime/server.test.ts" "src/components/surfaces/teacher-schedule-surface.test.tsx"`
- `pnpm exec tsx scripts/seed-test-accounts.ts`
</verification>

<success_criteria>
- [x] `teacher@example.com` seed 后同时具备 active teacher/admin memberships
- [x] `/teacher/schedule` 可在管理员身份下聚合同校教师课表
- [x] 同一节次支持显示多张课程卡，不再丢失并发课程
- [x] 管理员视角在 UI 中显示授课教师姓名与“全校教师”标识
- [x] 管理员视角逻辑只收口在 `/teacher/schedule` 主页面读模型
</success_criteria>
