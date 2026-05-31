---
phase: quick
plan: 260510-oml
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(teacher)/teacher/layout.tsx
  - src/components/shell/teacher-sidebar-shell.tsx
  - src/components/shell/teacher-sidebar-shell.test.tsx
autonomous: true
requirements:
  - QUICK-260510-OML
must_haves:
  truths:
    - "访问 /teacher/editor 不再因为主题 cookie 读取触发 Next.js blocking route warning。"
    - "教师端壳层仍按 active theme runtime 决定 shell mode 与 surface 布局。"
    - "Suspense fallback 本身不再触发 theme cookie / cookies() 读取。"
  artifacts:
    - path: "src/app/(teacher)/teacher/layout.tsx"
      provides: "teacher layout 的 Suspense 安全边界与无 cookie fallback"
    - path: "src/components/shell/teacher-sidebar-shell.tsx"
      provides: "主题运行时 shell 与可选静态 fallback shell 的明确分层"
    - path: "src/components/shell/teacher-sidebar-shell.test.tsx"
      provides: "阻断回归的结构化断言"
  key_links:
    - from: "src/app/(teacher)/teacher/layout.tsx"
      to: "src/components/shell/teacher-sidebar-shell.tsx"
      via: "Suspense fallback uses static shell while async content uses theme runtime shell"
      pattern: "Suspense|TeacherSidebarShell"
    - from: "src/components/shell/teacher-sidebar-shell.tsx"
      to: "src/lib/dal/themes.ts"
      via: "getCurrentActorThemeRuntimeState only inside theme-aware async path"
      pattern: "getCurrentActorThemeRuntimeState"
---

<objective>
修复 `/teacher/editor` 的 blocking route：把主题 cookie 驱动的运行时读取留在
Suspense 内部的异步壳层，fallback 改为不触发 `cookies()` 的静态安全壳层。

Purpose: 符合 Next.js 16 对 request-time 数据必须处于 Suspense 安全边界内的要求，
同时保持教师端主题布局能力不回退。

Output: teacher layout 的 fallback/async shell 分层、theme-aware shell 调整、以及
对应的快速回归测试。
</objective>

<execution_context>
@/home/wuxf/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@src/app/(teacher)/teacher/layout.tsx
@src/components/shell/teacher-sidebar-shell.tsx
@src/lib/theme-cookie.ts

<interfaces>
当前 teacher layout / shell 关键契约：

```tsx
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<TeacherShellFallback />}>
      <TeacherLayoutContent>{children}</TeacherLayoutContent>
    </Suspense>
  );
}

export async function TeacherSidebarShell({
  children,
  routeKey = "/teacher",
  activePath,
  headerTitle,
  headerDescription,
  headerActions,
}: TeacherSidebarShellProps) {
  const { layoutRuntime, themeSource } = await getCurrentActorThemeRuntimeState();
  // ... render shell
}
```

当前 cookie 入口：

```ts
export async function getActiveThemeId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_THEME_COOKIE)?.value ?? null;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 将教师端 fallback 壳层改为无 cookie 的 Suspense 安全边界</name>
  <files>src/app/(teacher)/teacher/layout.tsx, src/components/shell/teacher-sidebar-shell.tsx</files>
  <action>保留当前 `TeacherLayout -> Suspense -> TeacherLayoutContent` 结构，但把 fallback 使用的壳层改成静态、安全、无 `getCurrentActorThemeRuntimeState()` / `getActiveThemeId()` / `cookies()` 读取的版本。可在 `teacher-sidebar-shell.tsx` 中抽出一个同步的基础 shell 渲染函数或显式的 fallback shell 组件，让 async theme-aware shell 只在真正的内容路径中执行主题 runtime 解析。继续沿用 Phase 16 已锁定的单一路径：activeThemeId -> DAL -> theme runtime -> TeacherSidebarShell；不要在 `/teacher/editor` 页面内单独读取主题 cookie，也不要引入第二套 editor 专用 shell。</action>
  <verify>
    <automated>pnpm test --run "src/components/shell/teacher-sidebar-shell.test.tsx"</automated>
  </verify>
  <done>Suspense fallback 渲染 teacher shell 时不再触发主题 cookie 读取；真实内容路径仍能根据 active theme runtime 渲染 left-nav / top-nav / top-nav-secondary-rail。</done>
</task>

<task type="auto">
  <name>Task 2: 为 blocking route 回归补充静态结构断言</name>
  <files>src/components/shell/teacher-sidebar-shell.test.tsx</files>
  <action>扩展现有 shell 测试，增加对“fallback shell 不含 theme runtime 读取、theme-aware async shell 仍保留 `getCurrentActorThemeRuntimeState`”的源码级断言。测试要明确约束：存在一个不依赖 cookie 的 fallback 渲染入口；现有 allowlisted shell mode、`data-theme-layout-source` 和主题运行时路径仍在。不要把断言写成只匹配注释文本，直接约束真实导出、函数名或关键调用关系。</action>
  <verify>
    <automated>pnpm test --run "src/components/shell/teacher-sidebar-shell.test.tsx"</automated>
  </verify>
  <done>测试能阻止未来再次把 theme cookie 读取放回 Suspense fallback 或其他阻塞边界，同时不误伤现有主题壳层能力。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Request cookie -> teacher theme runtime | 用户请求中的 `activeThemeId` cookie 进入教师端主题解析链路。 |
| Suspense fallback -> async shell | fallback 必须可在无请求态动态读取的情况下安全渲染，异步壳层才可读取 request-time 数据。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260510-oml-01 | Denial of service | `src/app/(teacher)/teacher/layout.tsx` | mitigate | 将 theme cookie 读取限制在 Suspense 内部异步壳层，避免 fallback 阻塞导致 `/teacher/editor` 首屏告警或渲染降级。 |
| T-260510-oml-02 | Tampering | `src/components/shell/teacher-sidebar-shell.tsx` | mitigate | 继续仅通过 `getCurrentActorThemeRuntimeState()` 消费经过 DAL 验证的 theme runtime，不在 fallback 引入新的 cookie 直读捷径。 |
|
</threat_model>

<verification>
运行 `pnpm test --run "src/components/shell/teacher-sidebar-shell.test.tsx"`。如需人工 spot check，启动开发服务器后直接进入 `/teacher/editor?courseId=...&lessonId=...`，确认页面正常渲染且终端不再出现该 blocking route warning。
</verification>

<success_criteria>
- teacher layout 的 Suspense fallback 不再间接触发 `cookies()` / `getActiveThemeId()`。
- 主题运行时仍只在 async theme-aware shell 路径执行。
- `src/components/shell/teacher-sidebar-shell.test.tsx` 覆盖 fallback-safe 与 theme-aware 两条路径。
- focused test 通过。
</success_criteria>

<output>
完成后创建 `.planning/quick/260510-oml-teacher-editor-blocking-route-cookie-sus/260510-oml-SUMMARY.md`。
</output>
