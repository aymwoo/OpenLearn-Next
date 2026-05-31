# External Integrations

**Analysis Date:** 2026-05-24

## MCP Servers & Code Intelligence

**GitNexus:**
- 包: `gitnexus ^1.6.4`
- 用途: 代码智能、影响分析、架构探索
- 技能: `.claude/skills/gitnexus/`
  - `gitnexus-exploring` - 架构理解
  - `gitnexus-impact-analysis` - 影响分析
  - `gitnexus-debugging` - Bug 追踪
  - `gitnexus-refactoring` - 重构
  - `gitnexus-cli` - CLI 命令
- 资源: `gitnexus://repo/OpenLearn-Next/`
- 功能:
  - 8955 symbols, 16174 relationships, 300 execution flows
  - `gitnexus_query` - 按概念查询执行流
  - `gitnexus_context` - 符号 360 度视图
  - `gitnexus_impact` - 爆炸半径分析
  - `gitnexus_detect_changes` - 变更影响检测
  - `gitnexus_rename` - 协调重命名

**MCP Skills:**
- 技能目录: `.claude/skills/`
- 可用技能: ai, commands, get-shit-done, gitnexus, plugins, rag, schedule, themes, web-design-engineer

## Authentication & Identity

**Auth.js v5:**
- 包: `next-auth 5.0.0-beta.31`
- 适配器: `@auth/drizzle-adapter 1.11.2`
- 数据库适配: Drizzle ORM + SQLite/libSQL
- 策略: JWT
- 凭证 Provider: 自定义 (teacher email, student number)
- 路由保护: `/teacher`, `/student`, `/classroom`, `/admin`

**Auth Split Pattern:**
- `src/lib/auth/auth.config.ts` - Proxy 层，无 Drizzle 依赖
- `src/lib/auth/auth.ts` - 完整实例含 DrizzleAdapter
- `src/proxy.ts` - NextAuth wrapper

## Data Storage

**Database:**
- SQLite via libSQL (`@libsql/client 0.17.3`)
- ORM: Drizzle (`drizzle-orm 0.45.2`)
- 迁移工具: drizzle-kit (`drizzle.config.ts`)
- 配置文件: `.env.local` (含 `DB_FILE_NAME`)

**Redis:**
- 客户端: ioredis 5.10.1
- 用途: BullMQ 任务队列后端

## Task Queue

**BullMQ:**
- 包: `bullmq 5.76.10`
- 后端: Redis (ioredis)
- Worker 入口: `src/server/workers/async-task-worker.ts`
- 命令: `pnpm worker:dev`, `pnpm worker:start`

## Image Processing

**Sharp:**
- 包: `sharp 0.33.4`
- 用途: Next.js 图片优化 (开发模式跳过)

## AI/ML Integration

**Contracts 架构:**
- `src/features/runtime-platform/contracts/` - AI 契约定义
- Phase 54 验证: `verify-phase54-ai-contracts`

## Third-Party APIs

**Google OAuth:**
- 远程图片: `lh3.googleusercontent.com` (Google OAuth 用户头像)

**Mermaid & Reveal.js:**
- Mermaid 11.15.0 - 图表渲染
- Reveal.js 6.0.1 - 幻灯片

## CI/CD & Deployment

**Hosting:**
- 自托管 Node.js 服务器
- 自定义入口: `server.ts`

**验证脚本:**
- Phase 验证脚本 (phase1 - phase54)
- 主题验证: `verify-theme-default-regression`
- 测试账户: `seed:test-accounts`

## Environment Configuration

**Required env vars:**
- `DB_FILE_NAME` - 数据库文件路径 (默认 `file:local.db`)
- `AUTH_SECRET` - Auth.js 会话密钥
- `REDIS_URL` - Redis 连接 (BullMQ 使用)

**Secrets location:**
- `.env.local` - 本地环境变量

## Webhooks & Callbacks

**Classroom SSE:**
- 端点: `/api/classroom/[sessionId]/events`
- 运行时: Edge Runtime
- 功能: 课堂实时广播 (2s 轮询 + SSE)

---

*Integration audit: 2026-05-24*