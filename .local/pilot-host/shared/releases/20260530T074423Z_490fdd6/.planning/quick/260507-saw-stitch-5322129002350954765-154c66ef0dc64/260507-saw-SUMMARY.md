---
phase: quick
plan: 1
subsystem: "teacher-class-management"
tags:
  - "ui"
  - "teacher"
  - "stitch"
  - "navigation"
dependencies:
  requires:
    - "existing teacher shell"
    - "existing sidebar component"
  provides:
    - "teacher class management route"
    - "sidebar entry for class management"
  affects:
    - "src/app/(teacher)/teacher/classes/page.tsx"
    - "src/components/surfaces/class-management-surface.tsx"
    - "src/app/(teacher)/teacher/layout.tsx"
    - "src/components/shell/sidebar.tsx"
tech-stack:
  added: []
  patterns:
    - "stitch-aligned teacher management surface"
    - "existing shell plus tokenized ui primitives"
key-files:
  created:
    - "src/app/(teacher)/teacher/classes/page.tsx"
    - "src/components/surfaces/class-management-surface.tsx"
  modified:
    - "src/app/(teacher)/teacher/layout.tsx"
    - "src/components/shell/sidebar.tsx"
key-decisions:
  - "班级管理页严格按 Stitch 屏幕的信息层级实现，但仍复用现有 Button、Badge 和主题 token。"
  - "班级管理入口加入教师左侧栏第二位，位于工作台之后、课程管理之前。"
  - "本次仅实现静态班级概览与名册界面，不额外引入数据库查询或班级编辑动作。"
metrics:
  tasks-completed: 2
  files-modified: 4
  date-completed: "2026-05-07"
status: complete
---

# Phase quick Plan 1: Class management page summary

新增教师端班级管理页面 `/teacher/classes`，并把入口接入教师左侧导航；页面结构、文案层级与操作区以 Stitch 屏幕 `154c66ef0dc643a7a3edd7ed520fc999` 为唯一实现基准。

## Completed Tasks

1. **Task 1: 新建与 Stitch 对齐的班级管理页面主体** (Commit: `aeef097`)
   - 新增 `ClassManagementSurface` 和 `/teacher/classes` 页面包装器。
   - 按 Stitch 实现班级概览 hero、Student Roster、筛选搜索条、三条学生行卡片和分页区。
   - 复用现有 `Button`、`Badge` 和主题 token，而不是引入新的视觉体系或数据访问层。

2. **Task 2: 将班级管理接入教师端左侧导航** (Commit: `aeef097`)
   - 在教师端左侧栏中新增“班级管理”入口，并放在工作台之后。
   - 在 `Sidebar` 里扩展 `GraduationCap` 图标映射，使 `/teacher/classes` 高亮正常。
   - 保持原有工作台、课程管理、学生档案、教学资源、批改中心和数据报表入口不变。

## Deviations from Plan

1. 顶部工具条沿用教师端现有 shell，没有额外按 Stitch 单独重做。
   - 原因：当前教师端所有子页面都挂在统一 `TeacherLayout` 下，本次只实现班级管理页主体和左侧导航接入，保持既有 shell 一致性。

## Known Stubs

1. 班级信息编辑、课表查看、导入、搜索、筛选、批量操作和更多菜单目前仅为静态 UI，没有接业务逻辑。

## Threat Flags

None.
