---
phase: quick
plan: 260514-umb
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/auth-actions.ts
  - src/actions/auth-actions.test.ts
  - src/lib/auth/auth.ts
  - src/lib/auth/auth.test.ts
  - src/lib/auth/auth.config.ts
  - src/lib/auth/auth.config.test.ts
  - src/types/next-auth.d.ts
autonomous: true
requirements:
  - QUICK-auth-role-intent-guard
---

<objective>
修复教师/学生登录的角色意图校验漏洞，确保错误角色意图不能穿透到已登录态，并补上认证层与路由层回归测试。

Purpose: 现有实现只在 `signInAction` 做角色意图预检，`CredentialsProvider.authorize` 与 `authorized` 回调未强制校验，已登录用户可能越过角色边界。
Output: 一个在认证边界内完成的最小修复，以及覆盖 `roleIntent` 透传、认证拒绝和路由拒绝的回归测试。
</objective>

<context>
@.planning/STATE.md
@src/actions/auth-actions.ts
@src/lib/auth/auth.ts
@src/lib/auth/auth.config.ts
@src/types/next-auth.d.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 收紧 credentials 登录角色意图校验</name>
  <files>src/actions/auth-actions.ts, src/lib/auth/auth.ts</files>
  <action>把 `roleIntent` 透传到 credentials 登录，并在 `authorize` 内按角色意图选择账号标识、校验 active membership，拒绝错误角色登录。</action>
  <done>教师和学生登录都必须与显式角色意图一致，不能只依赖前端 tab 或 server action 预检。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 收紧受保护路由的角色守卫</name>
  <files>src/lib/auth/auth.ts, src/lib/auth/auth.config.ts, src/types/next-auth.d.ts</files>
  <action>把角色写入 JWT 和 session，并让 `authorized` 针对 `/teacher`、`/student`、`/admin` 按角色拒绝错误访问，保留 `/classroom` 共享访问。</action>
  <done>已登录但角色不匹配的用户不能通过 proxy 进入错误角色工作区。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: 补认证与路由回归测试</name>
  <files>src/actions/auth-actions.test.ts, src/lib/auth/auth.test.ts, src/lib/auth/auth.config.test.ts</files>
  <action>增加 focused tests，锁定 `roleIntent` 透传、缺失 membership 拒绝、学生学号登录路径以及 teacher/student 路由角色拒绝。</action>
  <verify>
    <automated>pnpm vitest run src/actions/auth-actions.test.ts src/lib/auth/auth.test.ts src/lib/auth/auth.config.test.ts src/app/login/page.test.tsx</automated>
    <automated>pnpm typecheck</automated>
  </verify>
  <done>本次漏洞的关键失效路径都有回归测试覆盖。</done>
</task>

</tasks>

<verification>
- `pnpm vitest run src/actions/auth-actions.test.ts src/lib/auth/auth.test.ts src/lib/auth/auth.config.test.ts src/app/login/page.test.tsx`
- `pnpm typecheck`
</verification>

<success_criteria>
- [x] `roleIntent` 被透传到 credentials provider
- [x] `authorize` 按角色意图和 active membership 拒绝错误登录
- [x] session/JWT 持有角色信息供 proxy 使用
- [x] `/teacher` 与 `/student` 路由在已登录状态下也会按角色拒绝错误访问
- [x] 定向测试和 typecheck 通过
</success_criteria>

<output>
After completion, create `.planning/quick/260514-umb-auth-role-intent-guard/260514-umb-SUMMARY.md`
</output>
