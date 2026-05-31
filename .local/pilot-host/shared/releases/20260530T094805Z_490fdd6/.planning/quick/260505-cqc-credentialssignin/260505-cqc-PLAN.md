---
phase: 260505-cqc-credentialssignin
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/login/TestAccountHint.tsx
  - src/actions/auth-actions.ts
  - src/lib/auth/auth.ts
  - scripts/seed-test-accounts.ts
  - package.json
autonomous: true
requirements:
  - QUICK-260505-CQC
must_haves:
  truths:
    - "登录页展示的测试教师和测试学生账号可以通过 Auth.js CredentialsProvider 登录。"
    - "CredentialsSignin 不再以原始运行时错误形式暴露给用户。"
    - "凭据失败时登录页显示中文、可理解的失败提示，并保留测试账号快速填充体验。"
    - "Auth.js Node/Edge split 保持不变：CredentialsProvider、DB、bcrypt 只留在 Node-only auth.ts。"
  artifacts:
    - path: "scripts/seed-test-accounts.ts"
      provides: "测试账号种子脚本，写入与登录页一致的用户和 bcrypt 密码哈希"
      contains: "bcrypt.hash"
    - path: "package.json"
      provides: "可重复执行的测试账号 seed 命令"
      contains: "seed:test-accounts"
    - path: "src/actions/auth-actions.ts"
      provides: "Credentials 登录 Server Action 的安全错误映射"
      contains: "CredentialsSignin"
    - path: "src/app/(auth)/login/page.tsx"
      provides: "使用 signInAction 的登录表单和 failure UX"
      contains: "signInAction"
    - path: "src/app/(auth)/login/TestAccountHint.tsx"
      provides: "与 seed 数据一致的测试账号提示"
      contains: "teacher@example.com"
  key_links:
    - from: "src/app/(auth)/login/TestAccountHint.tsx"
      to: "scripts/seed-test-accounts.ts"
      via: "same email/password credentials"
      pattern: "teacher@example.com[\\s\\S]*student@example.com"
    - from: "src/app/(auth)/login/page.tsx"
      to: "src/actions/auth-actions.ts"
      via: "form action uses signInAction instead of inline raw signIn"
      pattern: "action=\\{signInAction\\}"
    - from: "src/actions/auth-actions.ts"
      to: "src/lib/auth/auth.ts"
      via: "Node-only signIn('credentials') exported by DB-backed Auth.js instance"
      pattern: "signIn\\(\"credentials\""
---

<objective>
修复 `/login` 测试账号登录时报 `CredentialsSignin` 的问题，并让凭据失败显示为
用户可理解的登录失败状态。

Purpose: 当前登录页展示 `teacher@example.com/password` 与
`student@example.com/password`，但代码库没有对应 seed 脚本；同时页面内联
`signIn("credentials", formData)` 会让失败路径更容易暴露 Auth.js 原始错误。此计划
要求测试账号与数据库种子数据对齐，并统一通过现有 Server Action 映射失败 UX。

Output: 可重复执行的测试账号 seed 命令、对齐的登录页测试账号提示、使用
`signInAction` 的登录表单，以及凭据失败提示。
</objective>

<execution_context>
@/home/wuxf/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@src/lib/auth/auth.ts
@src/lib/auth/auth.config.ts
@src/actions/auth-actions.ts
@src/app/(auth)/login/page.tsx
@src/app/(auth)/login/TestAccountHint.tsx
@src/db/schema.ts
@src/db/index.ts
@package.json

<interfaces>
当前 Auth.js 与登录页关键契约：

From src/lib/auth/auth.ts:
```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [CredentialsProvider({ async authorize(credentials) { /* db + bcrypt */ } })],
});
```

From src/actions/auth-actions.ts:
```typescript
export async function signInAction(formData: FormData) {
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/",
  });
  // CredentialsSignin is mapped to { error: "Invalid credentials" }.
}
```

From src/db/schema.ts:
```typescript
export const users = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  password: text("password"),
});

export const memberships = sqliteTable("membership", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
});
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Seed 与登录页测试账号对齐</name>
  <files>scripts/seed-test-accounts.ts, package.json, src/app/(auth)/login/TestAccountHint.tsx</files>
  <behavior>
    - `pnpm seed:test-accounts` 会向 SQLite DB 写入 `teacher@example.com` 和 `student@example.com`。
    - 两个用户的 `users.password` 必须是 `bcrypt.hash("password", ...)` 生成的哈希，不是明文。
    - seed 脚本重复执行不能因唯一邮箱报错；存在用户时更新姓名和密码哈希，缺失用户时插入。
    - `TestAccountHint` 展示的邮箱和密码必须与 seed 脚本完全一致。
  </behavior>
  <action>新增 `scripts/seed-test-accounts.ts`，导入 `bcryptjs`、`eq`、`db`、`users`，定义 `TEST_ACCOUNTS = [{ name: "测试教师", email: "teacher@example.com", password: "password" }, { name: "测试学生", email: "student@example.com", password: "password" }]`。脚本逐个查询 `users.email`：存在则更新 `name` 和 bcrypt 哈希后的 `password`；不存在则插入 `name/email/password`。不要在 UI 组件或 RSC 中导入 `db`；seed 脚本可以直接访问 DB。给 `package.json` 增加 `"seed:test-accounts": "tsx scripts/seed-test-accounts.ts"`。检查 `TestAccountHint` 中的测试账号，保持与脚本常量一致；如要避免重复硬编码，可只改文案/结构，不要引入服务端 seed 文件到 client component。</action>
  <verify>
    <automated>pnpm seed:test-accounts</automated>
    <automated>node -e "const { createClient } = require('@libsql/client'); const bcrypt = require('bcryptjs'); (async () => { const db = createClient({ url: process.env.DB_FILE_NAME || 'file:local.db' }); for (const email of ['teacher@example.com','student@example.com']) { const rs = await db.execute({ sql: 'select password from user where email = ?', args: [email] }); if (rs.rows.length !== 1) throw new Error(email + ' missing'); const hash = String(rs.rows[0].password || ''); if (hash === 'password') throw new Error(email + ' stores plaintext password'); if (!(await bcrypt.compare('password', hash))) throw new Error(email + ' hash mismatch'); } })();"</automated>
  </verify>
  <done>两个登录页测试账号在 SQLite `user` 表中存在，密码字段为可通过 `bcrypt.compare("password", hash)` 的哈希；seed 命令可重复执行；登录页快速填充账号与 seed 数据一致。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 统一 CredentialsSignin 失败 UX</name>
  <files>src/actions/auth-actions.ts, src/app/(auth)/login/page.tsx</files>
  <behavior>
    - 登录表单必须调用 `signInAction`，不再在页面内联调用 `signIn("credentials", formData)`。
    - `signInAction` 对 `CredentialsSignin` 返回稳定的错误状态，不把 Auth.js 原始运行时错误抛给 UI。
    - `/login?error=CredentialsSignin` 或 Server Action 返回错误时，页面显示中文失败提示。
    - 成功登录仍由 Auth.js redirect 到 `/`。
  </behavior>
  <action>在 `src/actions/auth-actions.ts` 中保留 `"use server"` 和 Node-only `signIn` 导入；把错误返回文案改成中文，例如格式错误返回 `请输入有效邮箱和密码。`，`CredentialsSignin` 返回 `邮箱或密码不正确。`。确保判断兼容 Auth.js v5 抛出的 error：优先检查对象上的 `type === "CredentialsSignin"`，也可兼容 `code === "credentials"` 或 `message` 包含 `CredentialsSignin`，但不要吞掉非认证类错误。修改 `src/app/(auth)/login/page.tsx`：移除页面内对 `@/lib/auth/auth` 的 `signIn` 直接导入和内联 `handleSignIn`，改用 `import { signInAction } from "@/actions/auth-actions"` 并设置 `<form action={signInAction}>`。在 Suspense 内的 `LoginContent` 读取 `searchParams.error`，当值为 `CredentialsSignin` 时渲染中文失败提示；如果 Server Action 通过 `useActionState` 实现失败提示，则把表单抽为 client component 也可以，但必须保持 DB/Auth 仍只在 Server Action 与 `auth.ts` 中。不要把 DB 查询、bcrypt 或 CredentialsProvider 移入页面组件。</action>
  <verify>
    <automated>pnpm typecheck</automated>
    <automated>pnpm lint</automated>
  </verify>
  <done>登录页不直接调用 DB-backed `signIn`；凭据失败有中文提示；非 `CredentialsSignin` 错误仍会抛出以便暴露真实服务端问题；成功登录 redirect 行为保持。</done>
</task>

<task type="auto">
  <name>Task 3: 加固认证边界与回归检查</name>
  <files>src/lib/auth/auth.ts, src/lib/auth/auth.config.ts, src/app/(auth)/login/page.tsx, src/app/(auth)/login/TestAccountHint.tsx</files>
  <action>检查 `src/lib/auth/auth.ts` 中 `authorize` 仍使用 `db.select().from(users).where(eq(users.email, emailStr)).limit(1)` 和 `bcrypt.compare`，且 `session: { strategy: "jwt" }` 未回退。检查 `src/lib/auth/auth.config.ts` 没有导入 `@/db`、`@auth/drizzle-adapter`、`bcryptjs`、`next-auth/providers/credentials` 或 `@/lib/auth/auth`。检查登录页和 `TestAccountHint` 没有导入 `@/db` 或 `bcryptjs`。如发现违反，恢复 Node/Edge split 与 DAL/server-only 边界。</action>
  <verify>
    <automated>python - <<'PY'
from pathlib import Path
auth = Path('src/lib/auth/auth.ts').read_text()
assert 'session: { strategy: "jwt" }' in auth
assert 'CredentialsProvider' in auth and 'bcrypt.compare' in auth and 'db.select()' in auth
edge = Path('src/lib/auth/auth.config.ts').read_text()
for token in ['@/db', '@auth/drizzle-adapter', 'bcryptjs', 'next-auth/providers/credentials', '@/lib/auth/auth']:
    assert token not in edge, f'auth.config.ts imports Node-only dependency: {token}'
for file in ['src/app/(auth)/login/page.tsx', 'src/app/(auth)/login/TestAccountHint.tsx']:
    text = Path(file).read_text()
    for token in ['@/db', 'bcryptjs', 'next-auth/providers/credentials']:
        assert token not in text, f'{file} imports forbidden auth/db dependency: {token}'
PY</automated>
  </verify>
  <done>Credentials authorize 仍在 Node-only `auth.ts`；edge-safe config 不加载 Node-only 依赖；登录 UI 不直连 DB 或 bcrypt。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser login form → Server Action | 用户可控邮箱和密码进入服务端登录动作。 |
| Server Action → Auth.js CredentialsProvider | `signInAction` 调用 Node-only Auth.js credentials provider。 |
| Seed script → SQLite user table | 本地开发命令写入测试账号和密码哈希。 |
| Proxy → authConfig | 受保护路由请求只加载 edge-safe 认证配置。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260505-cqc-01 | Spoofing | `src/lib/auth/auth.ts` | mitigate | `authorize` 仅在 DB 用户存在且 `bcrypt.compare` 通过时返回 `{ id, name, email }`。 |
| T-260505-cqc-02 | Information Disclosure | `src/actions/auth-actions.ts` | mitigate | `CredentialsSignin` 映射为通用中文失败提示，不暴露用户是否存在、哈希状态或 Auth.js 原始错误。 |
| T-260505-cqc-03 | Tampering | `scripts/seed-test-accounts.ts` | accept | seed 脚本是本地开发命令，只写入固定测试账号；不用于生产认证流程。 |
| T-260505-cqc-04 | Elevation of Privilege | `src/lib/auth/auth.config.ts` | mitigate | edge-safe config 不导入 DB-backed auth，授权仍在 Server Action/DAL/Auth.js Node 路径校验。 |
</threat_model>

<verification>
整体自动化检查：

```bash
pnpm seed:test-accounts
pnpm typecheck
pnpm lint
python - <<'PY'
from pathlib import Path
auth = Path('src/lib/auth/auth.ts').read_text()
assert 'session: { strategy: "jwt" }' in auth
assert 'CredentialsProvider' in auth and 'bcrypt.compare' in auth and 'db.select()' in auth
edge = Path('src/lib/auth/auth.config.ts').read_text()
for token in ['@/db', '@auth/drizzle-adapter', 'bcryptjs', 'next-auth/providers/credentials', '@/lib/auth/auth']:
    assert token not in edge, f'auth.config.ts imports Node-only dependency: {token}'
PY
```

可选手动确认：启动 `pnpm dev`，访问 `/login`，点击测试教师或测试学生，提交后应成功登录；输入错误密码时显示中文失败提示，不显示原始 `CredentialsSignin` runtime error。
</verification>

<success_criteria>
- `pnpm seed:test-accounts` 创建或更新 `teacher@example.com/password` 与 `student@example.com/password`，且数据库中密码为 bcrypt 哈希。
- `/login` 上展示的测试账号与 seed 数据一致。
- 登录页通过 `signInAction` 处理 credentials 登录，失败时展示中文错误提示。
- `src/lib/auth/auth.ts` 保持 CredentialsProvider + DrizzleAdapter + JWT session；`auth.config.ts` 保持 edge-safe。
- `pnpm typecheck`、`pnpm lint` 和认证边界检查通过。
</success_criteria>

<output>
After completion, create `.planning/quick/260505-cqc-credentialssignin/260505-cqc-SUMMARY.md`
</output>
