---
phase: quick
plan: 260514-umb
status: complete
---

# Quick summary

已完成：修复教师/学生登录角色意图校验漏洞，并补齐认证层与路由层回归测试。

## What changed

1. 更新 `src/actions/auth-actions.ts`，把 `roleIntent` 显式透传给 credentials 登录。
2. 重构 `src/lib/auth/auth.ts` 的 credentials 校验逻辑，在认证层按 `roleIntent` 查找账号并校验 active membership。
3. 将角色写入 JWT 与 session，供 `authorized` 路由守卫复用。
4. 更新 `src/lib/auth/auth.config.ts`，阻止已登录学生进入 `/teacher`，阻止已登录教师进入 `/student`。
5. 新增 `src/actions/auth-actions.test.ts`、`src/lib/auth/auth.test.ts`、`src/lib/auth/auth.config.test.ts` 回归测试。

## Verification

- `pnpm vitest run src/actions/auth-actions.test.ts src/lib/auth/auth.test.ts src/lib/auth/auth.config.test.ts src/app/login/page.test.tsx`
- `pnpm typecheck`

## Key decisions

- 把角色意图校验下沉到 `CredentialsProvider.authorize`，避免只依赖前端 tab 或 server action 预检查。
- `/classroom` 仍保持共享受保护路由，不在本次修复中强行收紧角色。
- 路由守卫只按 session 中的角色拒绝 `/teacher`、`/student`、`/admin`，避免扩大改动面。
