# Technology Stack

**Analysis Date:** 2026-05-24

## Languages

**Primary:**
- TypeScript 6.0.3 - 全栈开发
- JavaScript (ES2017+) - 运行时

**Secondary:**
- CSS - 样式 (Tailwind CSS 4)

## Runtime

**Environment:**
- Node.js (latest) - 服务端运行
- React 19.2.5 - UI 框架

**Package Manager:**
- pnpm - 包管理
- Lockfile: `pnpm-lock.yaml`

## Frameworks

**Core:**
- Next.js 16.2.4 (App Router) - React 全栈框架
  - Turbopack 构建 (dev/build)
  - 路由: Route Groups (`(public)`, `(teacher)`, `(student)`, `(classroom)`, `(library)`, `(admin)`, `(auth)`)
- React 19.2.5 - UI 库

**Testing:**
- Vitest 4.1.5 - 测试运行器
- @vitest/coverage-v8 4.1.6 - 覆盖率
- @testing-library/react 16.3.2 - React 组件测试
- jsdom 29.1.1 - DOM 模拟
- Playwright 1.59.1 - E2E 测试

**Build/Dev:**
- tsx (latest) - TypeScript 执行
- drizzle-kit 0.31.10 - 数据库迁移
- Tailwind CSS 4.2.4 + @tailwindcss/postcss 4.2.4 - 样式
- ESLint 9.39.1 + eslint-config-next - 代码检查

## Key Dependencies

**Critical:**
- next-auth 5.0.0-beta.31 - 认证 (Auth.js v5)
- @auth/drizzle-adapter 1.11.2 - Auth.js + Drizzle ORM 集成
- drizzle-orm 0.45.2 - ORM
- @libsql/client 0.17.3 - libSQL (SQLite) 客户端
- zod 4.4.3 - 数据验证

**Infrastructure:**
- bullmq 5.76.10 - 任务队列 (Redis-backed)
- ioredis 5.10.1 - Redis 客户端
- bcryptjs 3.0.3 - 密码 hashing
- ws 8.20.1 - WebSocket (课堂实时通信)
- sharp 0.33.4 - 图片处理

**UI/Content:**
- lucide-react 1.14.0 - 图标库
- react-markdown 10.1.0 + remark-gfm 4.0.1 - Markdown 渲染
- reveal.js 6.0.1 - 幻灯片
- mermaid 11.15.0 - 图表
- papaparse 5.5.3 - CSV 解析
- @radix-ui/react-slot 1.2.4 - Headless UI 组件

## Configuration

**TypeScript:**
- 路径别名: `@/*` → `./src/*`
- 严格模式启用
- `moduleResolution: bundler`

**Next.js:**
- `cacheComponents: true` - 组件缓存
- `reactStrictMode: false` - 关闭严格模式提升开发速度
- `typescript.ignoreBuildErrors: true` - 构建时跳过类型错误
- 图片: `unoptimized: true` (开发模式绕过 sharp)
- 远程图片: `lh3.googleusercontent.com`

**Vitest:**
- 路径别名: `@` → `src/`
- 测试文件: `src/**/*.{test,spec}.{ts,tsx}`
- 覆盖率: `src/actions/**`

**Database:**
- Drizzle ORM + libSQL (SQLite)
- Schema: `./src/db/schema.ts`
- Migration: `./drizzle/`

## Platform Requirements

**Development:**
- Node.js (latest)
- pnpm

**Production:**
- Node.js 服务器 (`server.ts` 自定义入口)
- SQLite/libSQL 数据库
- Redis (BullMQ 队列)

---

*Stack analysis: 2026-05-24*