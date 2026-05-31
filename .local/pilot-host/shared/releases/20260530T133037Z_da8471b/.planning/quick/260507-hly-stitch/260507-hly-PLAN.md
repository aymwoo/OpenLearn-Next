---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/home-surface.tsx
  - src/components/home/home-login-card.tsx
  - src/actions/auth-actions.ts
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/login/LoginForm.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "访客进入首页后能一眼区分学生入口与教师入口"
    - "首页登录卡默认落在学生入口，不需要先跳到单独登录页再选角色"
    - "提交登录后会按所选角色直接跳转到对应首页"
  artifacts:
    - path: "src/components/surfaces/home-surface.tsx"
      provides: "遵循 Stitch 方向的首页舞台与入口布局"
    - path: "src/components/home/home-login-card.tsx"
      provides: "学生/教师双入口登录卡，默认学生"
    - path: "src/actions/auth-actions.ts"
      provides: "基于 roleIntent 的登录校验与角色首页跳转"
  key_links:
    - from: "src/components/home/home-login-card.tsx"
      to: "src/actions/auth-actions.ts"
      via: "form action={formAction} + hidden roleIntent"
      pattern: "roleIntent|signInAction"
    - from: "src/actions/auth-actions.ts"
      to: "/student,/teacher"
      via: "signIn redirectTo"
      pattern: "redirectTo"
---

<objective>
把首页改成 Stitch 首页方向下的双入口登录首页：学生/教师入口明确分离、默认学生入口、在首页直接提交登录，并在认证成功后跳到对应学生或教师首页。

Purpose: 用最小改动把“首页样式 + 入口选择 + 登录跳转”收敛成一个完整首屏体验，避免继续依赖分散的 CTA 跳转与额外角色选择。
Output: 更新首页舞台、首页登录卡，以及认证动作/登录页对 roleIntent 的承接。
</objective>

<context>
@.planning/STATE.md
@AGENTS.md
@DESIGN.md
@.planning/quick/260506-04q-stitch-stitch-project-id-532212900235095/260506-04q-SUMMARY.md
@src/components/surfaces/home-surface.tsx
@src/components/home/home-login-card.tsx
@src/actions/auth-actions.ts
@src/app/(auth)/login/page.tsx
@src/app/(auth)/login/LoginForm.tsx

<interfaces>
From src/components/home/home-login-card.tsx:
```tsx
export function HomeLoginCard()
```

From src/actions/auth-actions.ts:
```ts
export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData
): Promise<SignInActionState>
```
```ts
type SignInActionState = {
  error?: string;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 将首页首屏收敛为 Stitch 风格的双入口登录舞台</name>
  <files>src/components/surfaces/home-surface.tsx, src/components/home/home-login-card.tsx</files>
  <action>在不新增抽象层的前提下，直接改现有首页舞台与首页登录卡：保留 STATE.md 已锁定的“单一 justified gradient stage + 次级模块回到 tonal cards”方向，把首页主视觉改为一个主舞台配一个登录卡；在登录卡中明确区分学生/教师两个入口，默认激活 student，文案、按钮与辅助说明都随入口切换；继续复用 ghost-focus field contract 和 remember-me 的 aria-pressed + hidden input 方案，不退回 checkbox，也不要再保留首页 hero 中仅做跳转的重复登录 CTA。</action>
  <verify>
    <automated>npx eslint src/components/surfaces/home-surface.tsx src/components/home/home-login-card.tsx</automated>
  </verify>
  <done>首页首屏视觉与 Stitch 方向一致，学生/教师入口在同一登录卡中清晰可见，默认学生入口，且没有多余抽象或重复入口。</done>
</task>

<task type="auto">
  <name>Task 2: 打通首页登录提交到角色首页的认证链路</name>
  <files>src/actions/auth-actions.ts, src/app/(auth)/login/page.tsx, src/app/(auth)/login/LoginForm.tsx</files>
  <action>把认证入口对齐到“默认学生、按角色直达首页”的规则：将 signInAction 的默认 roleIntent 改为 student，成功登录后 student 跳转到 `/student`、teacher 跳转到 `/teacher`；同时让 `/login` 页继续承接 `roleIntent` 查询参数并传给 LoginForm，避免首页和独立登录页行为分叉。保持现有成员角色校验逻辑，只改最小必要代码，不新增新的 auth helper、wrapper 或 route。</action>
  <verify>
    <automated>npx eslint src/actions/auth-actions.ts "src/app/(auth)/login/page.tsx" "src/app/(auth)/login/LoginForm.tsx" && npm run typecheck</automated>
  </verify>
  <done>首页登录卡和 `/login?roleIntent=...` 都能提交同一套 roleIntent，认证成功后直接进入 `/student` 或 `/teacher`，默认未指定角色时按学生入口处理。</done>
</task>

<task type="auto">
  <name>Task 3: 做一轮最小回归，确认首页入口与跳转语义闭环</name>
  <files>src/components/surfaces/home-surface.tsx, src/components/home/home-login-card.tsx, src/actions/auth-actions.ts, src/app/(auth)/login/page.tsx, src/app/(auth)/login/LoginForm.tsx</files>
  <action>检查并修正实现中的语义断点：确认首页默认高亮 student、教师入口仍可切换；确认提交按钮、辅助文案、测试账号提示与当前入口一致；确认没有任何路径仍把教师成功登录送去 `/teacher/editor`。如验证命令暴露类型或 lint 问题，直接在上述文件内收口修复，不扩大改动范围。</action>
  <verify>
    <automated>npm run lint && npm run typecheck</automated>
  </verify>
  <done>首页视觉、入口状态、表单提交和角色跳转形成闭环，且通过项目现有 lint/typecheck。</done>
</task>

</tasks>

<verification>
- 打开首页时默认看到学生入口处于激活态。
- 切换到教师入口时，登录按钮与辅助说明同步变化。
- 提交学生登录进入 `/student`；提交教师登录进入 `/teacher`。
- `/login?roleIntent=teacher` 与首页教师入口使用同一套 roleIntent 语义。
</verification>

<success_criteria>
首页已经从“展示 + 跳转登录页”变成“展示 + 角色选择 + 直接登录”的单屏入口；视觉继续符合 Stitch / DESIGN.md；实现只触及首页与最小认证承接点，没有引入不必要抽象。</success_criteria>
