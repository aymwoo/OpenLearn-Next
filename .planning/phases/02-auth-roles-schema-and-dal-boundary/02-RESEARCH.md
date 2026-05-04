# Phase 02: Auth, roles, schema, and DAL boundary - Research

**Researched:** 2026-05-04
**Domain:** Authentication, RBAC/ABAC, DAL, SQLite Schema
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 首发登录方式以邮箱密码为主。OAuth/provider login 可以在架构上保持可扩展，但不是 Phase 2 的必交付入口。
- **D-02:** Phase 1 首页中的 `教师登录`、`学生登录` 等 CTA 进入真实 auth 后应携带 `roleIntent=teacher` 或 `roleIntent=student` 之类的角色意图。该意图只能用于登录页提示和登录后落点辅助，不能授予权限。
- **D-03:** 首发不开放公开注册。学校、管理员、教师、学生账号和成员关系由管理员预置流程或 seed/dev setup 创建，避免 K-12 场景下开放注册带来的学校归属和滥用问题。
- **D-04:** 登录后的默认落点由真实 membership 决定。若用户没有匹配 `roleIntent` 的 membership，应显示清晰提示并回到其可访问的默认工作区。
- **D-05:** Phase 2 首发真实可登录角色为 admin、teacher、student。parent、developer、AI Agent 等未来角色可在 schema/enum 中预留，但默认无 UI 入口、不可用或无可访问工作区。
- **D-06:** 学校归属采用 `schools` + `memberships` 模型，而不是把 school/role 直接挂在 `users` 上。一个 user 可以有多个 school membership，每个 membership 有 role、status 和必要的显示/排序信息。
- **D-07:** Phase 2 建立最小 `classes` / `classMembers` 关系，为 Phase 3/4 的课程、班级、学生进度打基础。不要在 Phase 2 实现完整课程/课时/选课功能。
- **D-08:** RBAC 和 ABAC 必须共同存在：role 决定可访问工作区和基础 capability；school/class membership、ownership、enrollment/resource scope 决定资源级访问。
- **D-09:** `/teacher`、`/student`、`/classroom`、`/admin` 及对应受保护 API/Actions 路径必须要求登录。`/` 保持公开；`/courses` 和 `/resources` 可保持公开静态/预览壳，后续数据和操作按权限细化。
- **D-10:** 未登录访问受保护路径时保留 `callbackUrl`。登录成功后优先回原路径；如果真实 membership 无权限访问原路径，则进入权限页或默认工作区。
- **D-11:** 已登录但角色不匹配时，显示无权限/角色不匹配页面。若用户有其他可用 membership，提供切换或返回默认工作区的路径；不要静默把用户重定向到无解释页面。
- **D-12:** `proxy.ts` 只做轻量保护：判断是否有会话、粗粒度角色路径是否可能访问。资源级授权、school/class membership、ownership、enrollment、DTO 清洗必须在 DAL 和 Server Actions 中完成。
- **D-13:** Phase 2 DAL 首发覆盖 auth/session context、user profile、school membership、class membership、role/capability 查询。课程、课时、步骤、进度、提交、课堂、AI/RAG/MCP/plugin/theme 的业务 DAL 留给后续相应阶段。
- **D-14:** UI/RSC/client components 只能接收最小安全 DTO：例如 `id`、`displayName`、role、active school/class summary、capabilities、safe navigation state。严禁把 raw database rows、password/hash、provider tokens、session internals、credentials、internal prompts、private plugin data 传给 UI。
- **D-15:** Server Actions 首发负责 active school/role context、基础 profile 更新、admin 预置成员/成员状态等必要写入。Auth.js 自身的 sign-in/sign-out/session 写入应由 Auth.js/adapter 负责，避免 Actions 重写 adapter 职责。
- **D-16:** 使用 `server-only` 模块边界、目录隔离和 lint/verify guard 共同防止 UI 直连数据库。`app/**` 与 `components/**` 不得导入 db client、Drizzle schema、raw DAL internals 或 server-only auth helpers；只能通过 Server Components/Actions 获取 DTO。

### the agent's Discretion
Planner/researcher 可以决定具体文件名、table column 命名、Zod schema 拆分、seed 脚本组织、测试文件组织和错误码细节，但不得改变以上业务边界、角色范围、route protection 责任划分和 DTO 安全规则。

### Deferred Ideas (OUT OF SCOPE)
- Public self-registration and invitation management are deferred unless a later phase explicitly scopes them.
- OAuth/SAML/SSO provider setup is deferred; keep the architecture compatible but do not make it the Phase 2 primary path.
- Parent/developer/AI Agent workspaces and real UI are deferred; Phase 2 only reserves schema/enum space.
- Full course, lesson, progress, submission, classroom runtime, AI/RAG, MCP, plugin, and theme data access remains in later phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in and maintain a session through Auth.js v5 with Drizzle-backed auth tables. | Auth.js v5 beta setup + Drizzle adapter with SQLite |
| AUTH-02 | Admin, teacher, and student roles can access role-appropriate workspaces after sign-in. | `memberships` table and DAL contextual verification |
| AUTH-03 | Server code models future super admin, school admin, parent, developer, and AI Agent roles without exposing unfinished workflows in the UI. | Zod schemas and SQLite enums pre-defined |
| AUTH-04 | `proxy.ts` redirects unauthenticated users away from protected teacher, student, classroom, admin, and API route families. | Next.js 16 `proxy.ts` with edge-safe Auth.js config |
| AUTH-05 | Server Actions and DAL functions verify actor identity, role, school membership, ownership, enrollment, and resource scope before returning or mutating data. | DAL boundary pattern checking `auth()` and session membership |
| AUTH-06 | UI receives sanitized DTOs only and never receives raw database rows, credentials, provider tokens, internal prompts, or private plugin data. | Explicit DTO mapping in Server Actions and Server Components |
| DATA-01 | Developer can use a SQLite-first Drizzle database with migrations and table groups for auth, schools, courses, lessons, steps, progress, submissions, classroom sessions, AI/RAG metadata, MCP metadata, plugins, and themes. | Drizzle ORM schemas structured by domain |
| DATA-02 | Developer can rely on `onDelete: cascade` or equivalent cascade behavior for all parent-owned child records. | Drizzle schema foreign key `.onDelete('cascade')` |
| DATA-03 | Developer can access all persistent data only through DAL modules under a server-only boundary. | `server-only` package and strict imports |
| DATA-04 | Developer can validate all user, AI, MCP, plugin, step payload, and submission inputs with Zod before persistence. | Zod usage in Server Actions before DAL calls |
| DATA-05 | Developer can use documented indexes and unique constraints for high-frequency reads and writes, including lesson step order, progress identity, latest submissions, classroom sessions, and scoped permissions. | Drizzle `.index()` and `.unique()` mappings |
</phase_requirements>

## Summary

Phase 2 establishes the core authentication, database schema, and data access boundary. It implements Auth.js v5 with a Drizzle SQLite adapter, defining the physical database schema for roles, schools, and memberships. It enforces that all UI interactions happen through a secure Data Access Layer (DAL) returning Data Transfer Objects (DTOs), rather than raw database reads.

**Primary recommendation:** Use `next-auth@beta` with a split configuration (edge-safe for `proxy.ts`, Node-only for the DAL) and structure the Drizzle schema to separate Auth.js core tables from the OpenLearn Next `schools` and `memberships` RBAC/ABAC model.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route Protection | Frontend Server (Proxy) | — | `proxy.ts` checks sessions quickly before rendering. |
| Identity & Session | Frontend Server (Node) | DB (SQLite) | Auth.js manages cookies and sessions; DB persists them. |
| Role & Membership Authz | API / Backend (DAL) | — | DAL enforces contextual rules (which school is active, what role). |
| Data Sanitization | API / Backend (DAL) | — | Converts raw DB entities to clean DTOs before RSC/Client receives them. |
| Input Validation | API / Backend (Actions) | Client | Zod checks payloads before passing to DAL mutations. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-auth` | 5.0.0-beta.31 | Authentication | Required for Auth.js v5 features like App Router support and `proxy.ts`. |
| `@auth/drizzle-adapter` | 1.11.2 | Auth.js DB Adapter | Officially integrates Auth.js sessions/users with Drizzle ORM. |
| `drizzle-orm` | 0.45.2 | Type-safe ORM | Project constraint, native SQLite focus, easy schema inference. |
| `drizzle-kit` | 0.31.10 | Schema Migrations | Generates and runs SQLite schema migrations cleanly. |
| `@libsql/client` | 0.17.3 | SQLite Driver | Recommended by Drizzle for local and cloud (Turso) compatibility. |
| `zod` | 4.4.3 | Data Validation | Canonical choice for DTOs and Server Action input validation. |

**Installation:**
```bash
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm @libsql/client zod server-only
npm install -D drizzle-kit tsx
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── proxy.ts             # Lightweight edge-safe route protection
│   ├── (auth)/...           # Login and error pages
│   └── ...                  # Protected workspaces
├── db/
│   ├── index.ts             # Drizzle client initialization
│   └── schema.ts            # Drizzle SQLite schema definitions
├── lib/
│   ├── auth/
│   │   ├── auth.config.ts   # Edge-safe config (providers, callbacks)
│   │   ├── auth.ts          # Full Auth.js config with DrizzleAdapter
│   │   └── dal.ts           # Role/Membership verification logic
│   └── dto/                 # Types and Zod schemas for sanitized data
└── actions/                 # Server Actions validating Zod inputs and calling DAL
```

### Pattern 1: Edge-Safe Auth Split
**What:** Auth.js config split to support edge runtimes in Next.js.
**When to use:** Required because `proxy.ts` (Next.js middleware) cannot use Node APIs or the Drizzle adapter.
**Example:**
```typescript
// lib/auth/auth.config.ts
export const authConfig = {
  providers: [/* ... */],
  callbacks: { /* ... */ }
};

// lib/auth/auth.ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "database" }
});
```

### Pattern 2: DTO-Enforced DAL
**What:** Data Access Layer modules return typed DTOs, not DB schemas.
**When to use:** Every time UI reads data.
**Example:**
```typescript
import "server-only";
import { db } from "@/db";
import { auth } from "@/lib/auth/auth";

export async function getCurrentUserDTO() {
  const session = await auth();
  if (!session?.user) return null;
  
  // Fetch from DB, sanitize, return DTO
  return { id: session.user.id, name: session.user.name };
}
```

### Anti-Patterns to Avoid
- **Raw DB queries in `app/` components:** Violates separation of concerns and risks leaking sensitive data to the client payload. Use DAL modules.
- **Putting Drizzle Adapter in `proxy.ts`:** Will cause a runtime crash because standard database drivers are not Edge-compatible.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route Guarding | Custom cookie checks | `next-auth` + `proxy.ts` | Handles token refreshing, CSRF, and Edge compatibility. |
| Session DB Sync | Custom token tables | `@auth/drizzle-adapter` | Maintains the exact schema Auth.js expects. |
| Schema Evolution | Manual SQL scripts | `drizzle-kit` | Guarantees type safety and repeatable drift detection. |

## Common Pitfalls

### Pitfall 1: Next.js Proxy/Middleware Edge Crash
**What goes wrong:** `proxy.ts` throws `unsupported module` or DB connection errors.
**Why it happens:** Importing Node.js-specific modules (like `@libsql/client` or `drizzle-orm`) into the middleware.
**How to avoid:** Keep `auth.config.ts` isolated from the adapter and database imports. Use it exclusively in `proxy.ts`.

### Pitfall 2: Missing Cascade Deletes
**What goes wrong:** Deleting a user fails or leaves orphaned `memberships` or `sessions`.
**Why it happens:** SQLite requires explicit foreign key behaviors.
**How to avoid:** Always use `.references(() => users.id, { onDelete: 'cascade' })` in Drizzle schemas.

### Pitfall 3: Accidental Leak of password/hashes
**What goes wrong:** API or RSC sends full user row to the client.
**Why it happens:** Directly querying Drizzle and passing the result to a client component.
**How to avoid:** Strictly define Zod DTOs and enforce them at the boundary of `server-only` DAL functions.

## Code Examples

### Safe Drizzle SQLite Schema Fragment
```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const memberships = sqliteTable("membership", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: text("schoolId").notNull(),
  role: text("role").notNull(), // 'admin', 'teacher', 'student'
});
```

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 (`next-auth@beta`) |
| V3 Session Management | yes | Auth.js database strategy + CSRF protection |
| V4 Access Control | yes | DAL membership & role verification |
| V5 Input Validation | yes | Zod Server Action validation |

### Known Threat Patterns for Next.js App Router

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure Direct Object Reference (IDOR) | Information Disclosure | DAL explicitly queries `where(eq(memberships.userId, currentUser.id))` |
| Unintended Client Payload Leak | Information Disclosure | Map to strict DTO interfaces in DAL; `server-only` boundary |
| Server Action CSRF | Tampering | Next.js host header checks; ensure inputs are fully Zod-validated |
