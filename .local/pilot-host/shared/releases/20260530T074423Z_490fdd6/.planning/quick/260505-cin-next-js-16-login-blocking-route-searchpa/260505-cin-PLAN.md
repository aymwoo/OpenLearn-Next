---
phase: 260505-cin-next-js-16-login-blocking-route-searchpa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(auth)/login/page.tsx
autonomous: true
requirements:
  - QUICK-260505-CIN
must_haves:
  truths:
    - "访问 /login 不再触发 Next.js 16 blocking route warning"
    - "roleIntent 查询参数仍能在登录卡片中显示教师或学生提示"
    - "Auth.js credentials 登录 Server Action 行为保持不变"
    - "测试账号点击填充邮箱和密码行为保持不变"
  artifacts:
    - path: "src/app/(auth)/login/page.tsx"
      provides: "Suspense 包裹的登录页面和 searchParams 读取边界"
      contains: "<Suspense"
  key_links:
    - from: "src/app/(auth)/login/page.tsx"
      to: "searchParams"
      via: "inner async component awaits searchParams below Suspense boundary"
      pattern: "Suspense[\\s\\S]*await searchParams"
    - from: "src/app/(auth)/login/page.tsx"
      to: "@/lib/auth/auth"
      via: "handleSignIn Server Action calls signIn('credentials', formData)"
      pattern: "signIn\\(\"credentials\", formData\\)"
---

<objective>
修复 Next.js 16 对 `/login` 的 blocking route warning：不要在 route 根组件
顶层读取 `await searchParams`，而是让页面先返回 `<Suspense>` 边界，再在边界内的
async 子组件读取查询参数。

Purpose: 保持登录页可用，同时符合 Next.js 16 Cache Components / PPR 对动态
request 数据的 Suspense 边界要求。

Output: `src/app/(auth)/login/page.tsx` 仅做结构性拆分，保留现有 Auth.js
Credentials Server Action 和 `TestAccountHint` 点击填充体验。
</objective>

<execution_context>
@/home/wuxf/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@src/app/(auth)/login/page.tsx
@src/app/(auth)/login/TestAccountHint.tsx

<interfaces>
当前登录页关键契约：

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ roleIntent?: string }>;
}) {
  const params = await searchParams;
  const roleIntent = params.roleIntent;

  const handleSignIn = async (formData: FormData) => {
    "use server";
    await signIn("credentials", formData);
  };
}
```

当前测试账号组件契约：

```tsx
export function TestAccountHint() {
  // 点击按钮后通过 document.getElementById("email") 和
  // document.getElementById("password") 填充测试账号。
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 将 searchParams 读取移动到 Suspense 边界内</name>
  <files>src/app/(auth)/login/page.tsx</files>
  <action>
    从 `react` 导入 `Suspense`。把当前 `LoginPage` 改成同步外壳组件：它只接收
    `searchParams`，立即返回一个 `<Suspense fallback={...}>`，fallback 使用与当前
    页面一致的居中背景和登录卡片骨架，不能读取 `searchParams`。新增内部 async
    组件（例如 `LoginContent`）接收同一个
    `searchParams: Promise&lt;{ roleIntent?: string }&gt;`，并在该组件内部执行
    `const params = await searchParams`。登录表单、roleIntent 文案、`handleSignIn`
    Server Action、`signIn("credentials", formData)` 调用、input 的 `id="email"`
    和 `id="password"`、`<TestAccountHint />` 都必须保持等价，不要改动登录业务逻辑。
  </action>
  <verify>
    <automated>pnpm typecheck</automated>
    <automated>pnpm lint</automated>
  </verify>
  <done>
    `/login` 根组件不再在返回 Suspense 前 `await searchParams`；roleIntent 提示仍由
    内部 async 组件渲染；Auth.js credentials Server Action 和测试账号点击填充仍可用。
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> login Server Action | 用户提交的邮箱和密码通过表单进入 Auth.js credentials 登录流程。 |
| URL -> login UI | `roleIntent` 查询参数来自用户可控 URL，只能用于显示教师/学生提示。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260505-cin-01 | Tampering | `roleIntent` query param | accept | 仅用于选择教师/学生中文提示，不参与授权、重定向或角色判定。 |
| T-260505-cin-02 | Spoofing | `handleSignIn` Server Action | mitigate | 保留现有 `signIn("credentials", formData)`，继续由 Auth.js 处理凭证校验，不在 UI 层新增鉴权逻辑。 |
</threat_model>

<verification>
整体检查：运行 `pnpm typecheck` 和 `pnpm lint`。如需手动确认，启动开发服务器后访问
`/login?roleIntent=teacher` 和 `/login?roleIntent=student`，确认页面显示对应提示，测试账号
按钮能填充邮箱和密码，提交仍进入原 Auth.js credentials Server Action。
</verification>

<success_criteria>
- `src/app/(auth)/login/page.tsx` 包含 `<Suspense>` 外壳。
- `await searchParams` 只出现在 Suspense 子树内的 async 组件中。
- `signIn("credentials", formData)` 未被移除或替换。
- `TestAccountHint` 仍位于包含 `id="email"` 和 `id="password"` 的表单之后。
- `pnpm typecheck` 和 `pnpm lint` 通过。
</success_criteria>

<output>
完成后创建 `.planning/quick/260505-cin-next-js-16-login-blocking-route-searchpa/260505-cin-SUMMARY.md`。
</output>
