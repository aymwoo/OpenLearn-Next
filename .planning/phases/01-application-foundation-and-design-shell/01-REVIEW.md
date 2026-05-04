---
phase: 01-application-foundation-and-design-shell
reviewed: 2026-05-04T13:00:42Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - package.json
  - next.config.ts
  - tsconfig.json
  - postcss.config.mjs
  - eslint.config.mjs
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/(public)/page.tsx
  - src/app/(public)/loading.tsx
  - src/app/(teacher)/teacher/layout.tsx
  - src/app/(teacher)/teacher/page.tsx
  - src/app/(teacher)/teacher/editor/page.tsx
  - src/app/(teacher)/teacher/loading.tsx
  - src/app/(student)/student/layout.tsx
  - src/app/(student)/student/page.tsx
  - src/app/(student)/student/player/page.tsx
  - src/app/(student)/student/loading.tsx
  - src/app/(classroom)/classroom/layout.tsx
  - src/app/(classroom)/classroom/page.tsx
  - src/app/(classroom)/classroom/loading.tsx
  - src/app/(library)/courses/page.tsx
  - src/app/(library)/courses/loading.tsx
  - src/app/(library)/resources/page.tsx
  - src/app/(library)/resources/loading.tsx
  - src/app/(admin)/admin/layout.tsx
  - src/app/(admin)/admin/page.tsx
  - src/app/(admin)/admin/loading.tsx
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/skeleton.tsx
  - src/components/shell/glass-nav.tsx
  - src/components/shell/sidebar.tsx
  - src/components/shell/role-preview.tsx
  - src/components/shell/route-shell.tsx
  - src/components/surfaces/home-surface.tsx
  - src/components/surfaces/teacher-dashboard-surface.tsx
  - src/components/surfaces/lesson-editor-surface.tsx
  - src/components/surfaces/student-dashboard-surface.tsx
  - src/components/surfaces/player-surface.tsx
  - src/components/surfaces/classroom-console-surface.tsx
  - src/components/surfaces/library-surface.tsx
  - src/components/surfaces/admin-surface.tsx
  - src/lib/cache-policy.ts
  - src/lib/navigation.ts
  - src/lib/demo-data.ts
  - src/lib/utils.ts
  - scripts/verify-phase1-shell.ts
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-04T13:00:42Z  
**Depth:** standard  
**Files Reviewed:** 48  
**Status:** issues_found

## Summary

审查覆盖 Phase 01 应用骨架、App Router 页面/布局/loading 外壳、共享 UI/shell/surface 组件、静态数据、缓存边界元数据和 `verify:phase1` 脚本。未发现 DB 直连、`eval()`、动态执行、危险 HTML 注入或明显安全漏洞；Next.js 16 `cacheComponents: true`、Lexend 根布局与静态 Phase 1 外壳基本成立。

主要问题集中在可访问性语义、无效动作控件和依赖版本可复现性。另有一个验证脚本规则质量问题，可能导致未来误报/漏报。

## Warnings

### WR-01: 活跃导航项缺少 `aria-current`，屏幕阅读器无法识别当前位置

**File:** `src/components/shell/glass-nav.tsx:22-33`, `src/components/shell/sidebar.tsx:26-36`  
**Issue:** 顶部导航和侧边栏只通过视觉样式表达 active 状态，没有给当前页面链接设置 `aria-current="page"`。这会让使用辅助技术的用户无法可靠知道当前路由，违反 Phase 1 对 accessible focus/navigation shell 的要求。  
**Fix:** 在 active 链接上添加 `aria-current`。

```tsx
<Link
  key={item.href}
  href={item.href}
  aria-current={active ? 'page' : undefined}
  className={cn(/* existing classes */)}
>
  {item.label}
</Link>
```

### WR-02: 角色切换按钮缺少 pressed 状态语义

**File:** `src/components/shell/role-preview.tsx:22-29`  
**Issue:** `RolePreview` 使用一组按钮切换“教师/学生/课堂/管理”演示视角，但只通过颜色标记当前选中项，没有 `aria-pressed` 或等价语义。键盘和屏幕阅读器用户无法获知哪个角色已选中。  
**Fix:** 为每个 toggle button 设置 `aria-pressed`，必要时给按钮组添加可访问标签。

```tsx
<div role="group" aria-label="角色预览切换" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
  {rolePreviewItems.map((item) => {
    const selected = activeRole === item.label

    return (
      <button
        key={item.label}
        type="button"
        aria-pressed={selected}
        onClick={() => setActiveRole(item.label)}
        className={cn(
          'min-h-11 rounded-full px-4 text-sm transition',
          selected ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant',
        )}
      >
        {item.label}
      </button>
    )
  })}
</div>
```

### WR-03: 课程/资源主动作按钮是无处理器的可点击控件

**File:** `src/components/surfaces/library-surface.tsx:41-44`  
**Issue:** “创建课程 / 上传资源”渲染为普通 `<button>`，但没有 `onClick`、`href`、`disabled` 或说明性状态。用户点击后没有任何结果，属于 route shell 中的断裂动作；后续接入真实功能前也容易被误认为已可用。  
**Fix:** Phase 1 静态外壳中应明确标记为未启用，或改成指向已有可用路线的链接。

```tsx
<Button className="gap-2 text-base" disabled aria-disabled="true" title="Phase 2/3 接入真实操作">
  {isCourses ? <BookMarked className="size-5" aria-hidden /> : <UploadCloud className="size-5" aria-hidden />}
  {action}（即将开放）
</Button>
```

### WR-04: 多个 devDependency 使用 `latest`，降低构建可复现性

**File:** `package.json:26-35`  
**Issue:** `@types/node`、`@types/react`、`@types/react-dom`、`eslint-config-next`、`tsx` 使用 `latest`，而项目明确要求 Next.js 16 / React 19.2 / TypeScript 与工具链稳定对齐。即使当前 lockfile 固定了安装结果，新的无锁安装或依赖刷新会漂移到未经验证版本，可能破坏 Phase 1 的 `typecheck/lint/build` 质量门。  
**Fix:** 将 `latest` 替换为已验证的精确版本或受控范围，并在后续升级时显式验证。

```json
{
  "devDependencies": {
    "@types/node": "<verified-version>",
    "@types/react": "<verified-version>",
    "@types/react-dom": "<verified-version>",
    "eslint-config-next": "16.2.4",
    "tsx": "<verified-version>"
  }
}
```

## Info

### IN-01: 设计反模式验证依赖简单子串匹配，容易误报/漏报

**File:** `scripts/verify-phase1-shell.ts:27`, `scripts/verify-phase1-shell.ts:94-99`  
**Issue:** `forbiddenDesignTerms` 直接用 `content.includes(term)` 扫描 `border-b`、`border-t` 等子串。该策略已经会把 `box-sizing: border-box` 一类非分割线样式误判为 `border-b`，也可能漏掉换行拼接、任意值类名或 CSS longhand 写法。  
**Fix:** 后续可改为基于 Tailwind class token / CSS declaration 的规则解析，只禁止真实的 1px 分割线、`divide-*` 和纯黑文本，而不是任意子串。

---

_Reviewed: 2026-05-04T13:00:42Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
