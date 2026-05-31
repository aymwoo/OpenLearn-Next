---
status: complete
---

完成 `/teacher/schedule` 管理员视角与紧凑课表展示修复。

- `scripts/seed-test-accounts.ts` 现在会为 `teacher@example.com` 同时写入 `teacher` 和 `admin` membership，且 membership upsert 改成按 `userId + schoolId + role` 精确更新，支持多角色共存。
- `src/features/schedule/runtime/server.ts` 将“是否启用全校教师视角”的判断收口到 `getTeacherDailyAgendaDTO()`，只影响 `/teacher/schedule` 主页面，不修改整个 schedule 域的共享权限入口。
- `src/features/schedule/shared/dto/runtime.ts` 把周课表 cell 从单项改成数组，并新增 `teacherLabel` 与 `viewMode`，允许同一时段展示多位教师课程。
- `src/components/surfaces/teacher-schedule-surface.tsx` 改成更紧凑的 stacked card 网格；管理员视角会显示教师姓名与“全校教师”标识，空态与说明文案也同步更新。
- `src/features/schedule/runtime/server.test.ts` 与 `src/components/surfaces/teacher-schedule-surface.test.tsx` 已同步覆盖新的 DTO 结构和管理员视角 UI。

验证：

- `pnpm vitest run "src/features/schedule/runtime/server.test.ts" "src/components/surfaces/teacher-schedule-surface.test.tsx"`
- `pnpm exec tsx scripts/seed-test-accounts.ts`
