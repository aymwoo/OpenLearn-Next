---
phase: quick
plan: 1
subsystem: "home"
tags:
  - "ui"
  - "layout"
  - "home"
dependencies:
  requires:
    - "existing stitch-aligned home page"
  provides:
    - "2/3 and 1/3 home layout"
    - "wider home hero content"
  affects:
    - "src/components/surfaces/home-surface.tsx"
tech-stack:
  added: []
  patterns:
    - "wider hero stage"
    - "explicit desktop split layout"
key-files:
  created: []
  modified:
    - "src/components/surfaces/home-surface.tsx"
key-decisions:
  - "桌面端首页主舞台改成明确的左 2/3、右 1/3 分配，而不是依赖 flex 自动分配。"
  - "优先放宽 home-surface 中的说明文本和 featured image 宽度，不额外扩大登录卡内部结构。"
metrics:
  tasks-completed: 2
  files-modified: 1
  date-completed: "2026-05-07"
status: complete
---

# Phase quick Plan 1: Home width adjustment summary

对刚完成的 Stitch 首页做一次小幅布局修正，把桌面端主舞台调整为左侧约三分之二、右侧约三分之一，同时放宽原本偏窄的文案区和图片容器宽度。

## Completed Tasks

1. **Task 1: 调整首页主舞台为左 2/3、右 1/3 的桌面双栏比例** (Commit: `4f66729`)
   - 将首页主容器最大宽度从 `1440px` 放宽到 `1520px`。
   - 在 `lg` 断点下把左侧内容区设为 `basis-2/3`，右侧登录区设为 `basis-1/3`。
   - 同步增大桌面端两栏间距，让布局更接近左宽右窄的目标视觉。

2. **Task 2: 放宽左侧文案与图片的过窄宽度限制** (Commit: `4f66729`)
   - 将标题文案容器放宽到 `max-w-[52rem]`，说明文本放宽到 `max-w-[44rem]`。
   - 将 featured image 容器从 `max-w-md` 放宽到 `max-w-[48rem]`，并提升图片渲染尺寸与桌面高度。
   - 保持 `HomeLoginCard` 登录交互和 Stitch 风格不变。

## Deviations from Plan

1. 登录卡组件文件本身未修改。
   - 宽度问题主要来自外层 `HomeSurface` 包装布局，修正包装层后右栏已能自然展开，因此没有扩大 `HomeLoginCard` 的内部样式范围。

## Known Stubs

None.

## Threat Flags

None.
