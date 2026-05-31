---
phase: quick
plan: 260511-vkw
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dto/class-management.ts
  - src/lib/dal/class-management.ts
  - src/actions/class-management-actions.ts
  - src/components/surfaces/class-management-surface.tsx
  - src/actions/auth-actions.ts
  - src/lib/auth/auth.ts
  - src/components/home/home-login-card.tsx
  - src/actions/class-management-actions.integration.test.ts
  - src/components/surfaces/class-management-surface.test.tsx
  - src/components/home/home-login-card.test.tsx
autonomous: true
requirements:
  - QUICK-class-management-batch-actions
---

<objective>
为 `/teacher/classes` 完成真实可用的筛选与批量操作能力：学生侧支持筛选、多选后的浮动操作面板、批量重置密码、批量删除；班级侧支持筛选、多选与批量删除。同时把学生登录规则切到 `studentNumber + password`，确保教师重置后的密码可以真实生效。
</objective>

<verification>
- `pnpm typecheck`
- `pnpm vitest run "src/actions/class-management-actions.integration.test.ts" "src/components/surfaces/class-management-surface.test.tsx" "src/components/home/home-login-card.test.tsx"`
</verification>
