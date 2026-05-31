---
status: complete
---

完成 `/teacher/classes` 班级管理批量能力与学生登录规则收口。

- 学生登录改为支持 `studentNumber + password`，教师登录继续使用 `email + password`。
- 学生名册导入时会同步把 `email` 设置为 `studentNumber`，避免现有认证链路出现空账号字段。
- 学生列表补充了筛选、列表模式多选、浮动操作面板、批量重置密码、批量删除。
- 班级列表补充了搜索、状态筛选、多选与批量删除。
- 新增 Server Action + DAL 真正写库，并补了最小必要的集成/字符串守卫测试。

验证：

- `pnpm typecheck`
- `pnpm vitest run "src/actions/class-management-actions.integration.test.ts" "src/components/surfaces/class-management-surface.test.tsx" "src/components/home/home-login-card.test.tsx"`
