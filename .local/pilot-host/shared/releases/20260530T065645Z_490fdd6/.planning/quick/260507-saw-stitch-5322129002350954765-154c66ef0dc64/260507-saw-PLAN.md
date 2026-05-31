---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(teacher)/teacher/layout.tsx
  - src/app/(teacher)/teacher/classes/page.tsx
  - src/components/shell/sidebar.tsx
  - src/components/surfaces/class-management-surface.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "教师左侧导航新增班级管理入口，并在 /teacher/classes 路由高亮。"
    - "班级管理页的主视觉、信息层级、操作区与学生名册结构严格对齐 Stitch 屏幕 154c66ef0dc643a7a3edd7ed520fc999。"
    - "新页面继续复用当前教师端 shell、Button/Badge/Card 设计 token，而不是引入独立视觉体系。"
  artifacts:
    - path: "src/app/(teacher)/teacher/classes/page.tsx"
      provides: "教师端班级管理路由页面包装器"
    - path: "src/components/surfaces/class-management-surface.tsx"
      provides: "按 Stitch 屏幕实现的班级概览、筛选条、学生名册与分页界面"
    - path: "src/app/(teacher)/teacher/layout.tsx"
      provides: "教师侧边栏新增班级管理导航项"
    - path: "src/components/shell/sidebar.tsx"
      provides: "班级管理导航图标映射与激活态支持"
  key_links:
    - from: "src/app/(teacher)/teacher/classes/page.tsx"
      to: "src/components/surfaces/class-management-surface.tsx"
      via: "ClassManagementSurface render"
      pattern: "ClassManagementSurface"
    - from: "src/app/(teacher)/teacher/layout.tsx"
      to: "src/components/shell/sidebar.tsx"
      via: "Sidebar items[] entry for /teacher/classes"
      pattern: "/teacher/classes"
---

<objective>
新增教师端班级管理页面，并把它接入左侧导航；页面内容以 Stitch 项目
`5322129002350954765` 的屏幕
`154c66ef0dc643a7a3edd7ed520fc999` 为唯一实现基准。

Purpose: 补齐教师端班级管理入口，让班级总览与学生名册具备与 Stitch
设计一致的主舞台与操作节奏。
Output: 新增 class management surface 与 page，更新 sidebar 导航与图标映射。
</objective>

<context>
@.planning/STATE.md
@AGENTS.md
@src/app/(teacher)/teacher/layout.tsx
@src/app/(teacher)/teacher/page.tsx
@src/app/(teacher)/teacher/students/page.tsx
@src/components/shell/sidebar.tsx
@src/components/surfaces/students-management-surface.tsx
@src/components/surfaces/teacher-dashboard-surface.tsx
@src/components/ui/button.tsx
@src/components/ui/badge.tsx
@src/components/ui/card.tsx
@src/app/globals.css
@/tmp/opencode/stitch-class-management-154c66ef.html

<interfaces>
From src/components/shell/sidebar.tsx:
```ts
type SidebarItem = {
  label: string
  href: string
  icon?: string
  emphasis?: string
}
```

From src/components/ui/button.tsx:
```ts
type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
export function Button({ asChild, variant = 'primary', className, ...props }: ButtonProps)
```

Existing page wrapper pattern:
```ts
export default function TeacherStudentsPage() {
  return (
    <div className="p-6 lg:p-8 min-h-full">
      <StudentsManagementSurface />
    </div>
  )
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 新建与 Stitch 对齐的班级管理页面主体</name>
  <files>src/app/(teacher)/teacher/classes/page.tsx,src/components/surfaces/class-management-surface.tsx</files>
  <action>新增 `/teacher/classes` 页面与 `ClassManagementSurface`，严格以 `/tmp/opencode/stitch-class-management-154c66ef.html` 为唯一视觉与内容来源实现：保留班级概览 hero、Student Roster 标题与操作按钮、筛选搜索条、三条学生行卡片、分页区块及对应信息层级；使用现有 `Button`、`Badge`、`Card`、主题色和圆角 token 落地，不要复用 `StudentsManagementSurface` 的布局文案，不要补充 Stitch 中不存在的教师业务模块，也不要引入数据库读取或 Server Action。</action>
  <verify>
    <automated>pnpm exec eslint "src/app/(teacher)/teacher/classes/page.tsx" "src/components/surfaces/class-management-surface.tsx"</automated>
    <automated>pnpm exec tsc --noEmit</automated>
  </verify>
  <done>访问 `/teacher/classes` 时可看到与 Stitch 屏幕结构一致的班级管理页面，且代码通过 scoped eslint 与 typecheck。</done>
</task>

<task type="auto">
  <name>Task 2: 将班级管理接入教师端左侧导航</name>
  <files>src/app/(teacher)/teacher/layout.tsx,src/components/shell/sidebar.tsx</files>
  <action>在教师端 `Sidebar` items 中新增“班级管理”导航，路由指向 `/teacher/classes`，排序放在“工作台”之后、“课程管理”之前，使其与 Stitch 侧栏信息架构一致；同时扩展 `sidebar.tsx` 的 icon 映射以支持班级管理所需图标，并保持当前 active 判断、圆角 pill、高亮和 hover 行为不变。</action>
  <verify>
    <automated>pnpm exec eslint "src/app/(teacher)/teacher/layout.tsx" "src/components/shell/sidebar.tsx"</automated>
    <automated>pnpm exec tsc --noEmit</automated>
  </verify>
  <done>教师端左侧栏出现“班级管理”入口，进入 `/teacher/classes` 时导航高亮正常，且未破坏现有其他菜单项。</done>
</task>

</tasks>

<verification>
- `/teacher/classes` 页面包装层与现有教师端页面保持一致的 `p-6 lg:p-8 min-h-full` 容器模式。
- 班级 hero、筛选条、名册行卡片、分页区来自 Stitch 参考，而不是学生档案页旧结构的轻微改写。
- 左侧导航新增入口后，`/teacher`、`/teacher/courses`、`/teacher/students` 等原有高亮逻辑保持可用。
</verification>

<success_criteria>
教师用户可以从左侧栏进入新的班级管理页，并看到与 Stitch 参考屏幕一致的班级概览和学生名册界面；实现仅触及路由、surface 与导航，不扩展额外业务范围。
</success_criteria>
