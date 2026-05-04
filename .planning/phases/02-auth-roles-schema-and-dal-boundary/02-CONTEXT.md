# Phase 2: Auth, roles, schema, and DAL boundary - Context

**Gathered:** 2026-05-04T23:03:03+08:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the real authentication, role, school membership, SQLite/Drizzle schema, protected route, DAL, Server Action, and sanitized DTO boundary required before course, lesson, student progress, classroom runtime, AI, MCP, plugin, or theme data becomes dynamic. It connects the Phase 1 static route shells to real login and role-aware access, but it does not implement course authoring, lesson persistence, student submissions, classroom SSE, AI/RAG workflows, or production plugin execution.

</domain>

<decisions>
## Implementation Decisions

### 登录方式与入口

- **D-01:** 首发登录方式以邮箱密码为主。OAuth/provider login 可以在架构上保持可扩展，但不是 Phase 2 的必交付入口。
- **D-02:** Phase 1 首页中的 `教师登录`、`学生登录` 等 CTA 进入真实 auth 后应携带 `roleIntent=teacher` 或 `roleIntent=student` 之类的角色意图。该意图只能用于登录页提示和登录后落点辅助，不能授予权限。
- **D-03:** 首发不开放公开注册。学校、管理员、教师、学生账号和成员关系由管理员预置流程或 seed/dev setup 创建，避免 K-12 场景下开放注册带来的学校归属和滥用问题。
- **D-04:** 登录后的默认落点由真实 membership 决定。若用户没有匹配 `roleIntent` 的 membership，应显示清晰提示并回到其可访问的默认工作区。

### 角色与学校模型

- **D-05:** Phase 2 首发真实可登录角色为 admin、teacher、student。parent、developer、AI Agent 等未来角色可在 schema/enum 中预留，但默认无 UI 入口、不可用或无可访问工作区。
- **D-06:** 学校归属采用 `schools` + `memberships` 模型，而不是把 school/role 直接挂在 `users` 上。一个 user 可以有多个 school membership，每个 membership 有 role、status 和必要的显示/排序信息。
- **D-07:** Phase 2 建立最小 `classes` / `classMembers` 关系，为 Phase 3/4 的课程、班级、学生进度打基础。不要在 Phase 2 实现完整课程/课时/选课功能。
- **D-08:** RBAC 和 ABAC 必须共同存在：role 决定可访问工作区和基础 capability；school/class membership、ownership、enrollment/resource scope 决定资源级访问。

### 路由保护策略

- **D-09:** `/teacher`、`/student`、`/classroom`、`/admin` 及对应受保护 API/Actions 路径必须要求登录。`/` 保持公开；`/courses` 和 `/resources` 可保持公开静态/预览壳，后续数据和操作按权限细化。
- **D-10:** 未登录访问受保护路径时保留 `callbackUrl`。登录成功后优先回原路径；如果真实 membership 无权限访问原路径，则进入权限页或默认工作区。
- **D-11:** 已登录但角色不匹配时，显示无权限/角色不匹配页面。若用户有其他可用 membership，提供切换或返回默认工作区的路径；不要静默把用户重定向到无解释页面。
- **D-12:** `proxy.ts` 只做轻量保护：判断是否有会话、粗粒度角色路径是否可能访问。资源级授权、school/class membership、ownership、enrollment、DTO 清洗必须在 DAL 和 Server Actions 中完成。

### DAL/DTO 边界

- **D-13:** Phase 2 DAL 首发覆盖 auth/session context、user profile、school membership、class membership、role/capability 查询。课程、课时、步骤、进度、提交、课堂、AI/RAG/MCP/plugin/theme 的业务 DAL 留给后续相应阶段。
- **D-14:** UI/RSC/client components 只能接收最小安全 DTO：例如 `id`、`displayName`、role、active school/class summary、capabilities、safe navigation state。严禁把 raw database rows、password/hash、provider tokens、session internals、credentials、internal prompts、private plugin data 传给 UI。
- **D-15:** Server Actions 首发负责 active school/role context、基础 profile 更新、admin 预置成员/成员状态等必要写入。Auth.js 自身的 sign-in/sign-out/session 写入应由 Auth.js/adapter 负责，避免 Actions 重写 adapter 职责。
- **D-16:** 使用 `server-only` 模块边界、目录隔离和 lint/verify guard 共同防止 UI 直连数据库。`app/**` 与 `components/**` 不得导入 db client、Drizzle schema、raw DAL internals 或 server-only auth helpers；只能通过 Server Components/Actions 获取 DTO。

### the agent's Discretion

Planner/researcher 可以决定具体文件名、table column 命名、Zod schema 拆分、seed 脚本组织、测试文件组织和错误码细节，但不得改变以上业务边界、角色范围、route protection 责任划分和 DTO 安全规则。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/PROJECT.md` — Project vision, locked stack, DAL/Server Actions constraint, Auth.js v5/Drizzle/SQLite decisions, RBAC/ABAC context, and out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` — Phase 2 requirements `AUTH-01` through `AUTH-06` and `DATA-01` through `DATA-05`.
- `.planning/ROADMAP.md` — Phase 2 goal, dependency on Phase 1, success criteria, and UI hint.
- `.planning/STATE.md` — Current project state, Phase 1 decisions carried forward, and session continuity.

### Prior phase decisions

- `.planning/phases/01-application-foundation-and-design-shell/01-CONTEXT.md` — Phase 1 decisions for static shells, route entry points, role preview, mobile navigation, and design constraints. Important because Phase 2 must convert static role CTAs into real auth without implying fake sessions.
- `.planning/phases/01-application-foundation-and-design-shell/01-VERIFICATION.md` — Verified Phase 1 shell, route, cache, navigation, and no-DB/no-runtime violation baseline.

### Existing code integration points

- `src/lib/navigation.ts` — Current public, teacher, student, classroom, and admin route navigation arrays that Phase 2 must adapt to auth-aware routing without breaking labels.
- `src/lib/cache-policy.ts` — Existing cache tag and route boundary contract. Phase 2 must preserve static shells and stream/auth-gate user state under Suspense instead of making all shells dynamic by accident.
- `src/components/shell/route-shell.tsx` — Shared shell composition point for protected workspaces.
- `src/components/shell/glass-nav.tsx` and `src/components/shell/sidebar.tsx` — Navigation UI must remain accessible and design-aligned while becoming auth/role aware.
- `src/app/(teacher)/teacher/layout.tsx`, `src/app/(student)/student/layout.tsx`, `src/app/(classroom)/classroom/layout.tsx`, `src/app/(admin)/admin/layout.tsx` — Protected workspace layout entry points.
- `package.json` — Current dependency baseline. Phase 2 planner must add Auth.js v5 beta, Drizzle, SQLite/libSQL, Zod, and related tooling deliberately with pinned versions.
- `next.config.ts` — `cacheComponents: true` is enabled and must remain enabled.

### External docs to research during planning

- Auth.js v5 official docs — Use for `next-auth@beta`, Drizzle adapter, split `auth.config.ts`/`auth.ts`/edge-safe proxy usage.
- Next.js 16 Proxy and Cache Components docs — Use for `proxy.ts`, route protection caveats, `cacheTag`, `updateTag`, `revalidateTag`, and Suspense/PPR boundaries.
- Drizzle SQLite docs — Use for SQLite schema, migrations, cascade delete, indexes, and adapter compatibility.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `RouteShell`, `GlassNav`, and `Sidebar` provide shared workspace chrome. Phase 2 should preserve their visual contract while adding authenticated user/session regions through DTO-fed server components or Suspense slots.
- `navigationItems`, `teacherNavigationItems`, `studentNavigationItems`, `classroomNavigationItems`, and `adminNavigationItems` define the route vocabulary. Phase 2 should not rename labels casually; it should add auth-aware behavior around these routes.
- `cacheTags` and `routeCacheBoundaries` already name future auth toolbar, teacher save status, student progress, classroom live state, and resource filters. Phase 2 should extend this contract rather than bypass it.
- Phase 1 verification established `pnpm verify:phase1`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` as baseline quality gates.

### Established Patterns

- App Router route groups already separate public, teacher, student, classroom, library, and admin areas.
- Phase 1 deliberately kept all business data static. Phase 2 is the first phase allowed to introduce real auth/schema/server-only data boundaries.
- UI design must remain Lexend, Simplified Chinese, no-line tonal surfaces, glass navigation, rounded-full controls, and gradient CTA. Auth pages and permission pages must not regress into generic form layouts.
- `cacheComponents: true` is enabled; any request-specific auth/session reads must stay out of cached static shells unless passed explicitly and streamed behind Suspense.

### Integration Points

- `proxy.ts` does not exist yet and must be introduced carefully, using Auth.js edge-safe configuration only.
- DB/auth/server modules do not exist yet. Planner should create clear directories for DB schema/client, Auth.js config, DAL, actions, DTOs, validation, and tests.
- Existing route layouts are the natural insertion points for protected workspace checks and auth-aware toolbar/user context.
- Home CTA links from Phase 1 should be converted or wrapped so `教师登录` and `学生登录` preserve role intent without creating fake auth.

</code_context>

<specifics>
## Specific Ideas

- Email/password is the first-class sign-in method for v1 self-hosted school deployments.
- Role intent from public CTAs is UX context only. It must never become permission data.
- Admin-precreated users and memberships are preferred over open registration for K-12 safety.
- The first useful post-login experience should be role/membership aware: admin to admin, teacher to teacher workspace, student to student space, with classroom routes only available when membership allows.
- Permission mismatch should be explainable in Simplified Chinese and offer a safe route back to an allowed workspace.

</specifics>

<deferred>
## Deferred Ideas

- Public self-registration and invitation management are deferred unless a later phase explicitly scopes them.
- OAuth/SAML/SSO provider setup is deferred; keep the architecture compatible but do not make it the Phase 2 primary path.
- Parent/developer/AI Agent workspaces and real UI are deferred; Phase 2 only reserves schema/enum space.
- Full course, lesson, progress, submission, classroom runtime, AI/RAG, MCP, plugin, and theme data access remains in later phases.

</deferred>

---

*Phase: 02-auth-roles-schema-and-dal-boundary*
*Context gathered: 2026-05-04T23:03:03+08:00*
