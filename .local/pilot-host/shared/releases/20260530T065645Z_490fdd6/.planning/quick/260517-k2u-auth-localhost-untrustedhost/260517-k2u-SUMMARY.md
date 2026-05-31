---
phase: quick
plan: 260517-k2u
status: complete
---

# Quick summary

已完成：修复 `next start` 下 Auth.js `UntrustedHost` 导致的本地 production-like 登录 500，通过标准 `trustHost` 配置恢复本地登录链路。

## What changed

1. 更新 `src/lib/auth/auth.config.ts`，直接开启 `trustHost: true`。
2. 更新 `src/lib/auth/auth.ts`，恢复标准 `NextAuth(nodeAuthConfig)` 初始化，保留现有 credentials / JWT / session 逻辑。
3. 更新 `src/proxy.ts`，恢复标准 `NextAuth(authConfig).auth` 用法。
4. 更新 `src/lib/auth/auth.config.test.ts`，把 focused test 收敛为对 `authConfig.trustHost` 的断言。

## Verification

- `pnpm vitest run src/lib/auth/auth.config.test.ts src/lib/auth/auth.test.ts src/actions/auth-actions.test.ts src/app/login/page.test.tsx`
- `npm run build`
- `npm run start` + Playwright teacher login to `/teacher`

## Key decisions

- 使用 Auth.js 标准 `trustHost: true` 配置，和文档里的 `AUTH_TRUST_HOST=true` 行为保持一致。
- 不改 `CredentialsProvider`、JWT/session roles、`authorized` callback、登录 redirect 与角色鉴权逻辑。
- `next start` 的本地 production-like 可用性继续通过现有 route handlers 和 proxy 统一生效，不额外引入 request-based 分叉逻辑。
