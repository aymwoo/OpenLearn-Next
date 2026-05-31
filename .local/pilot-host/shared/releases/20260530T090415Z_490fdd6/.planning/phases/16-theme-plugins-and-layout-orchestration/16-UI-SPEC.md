# Phase 16: Theme plugins and layout orchestration - UI Spec

**Created:** 2026-05-10  
**Status:** Ready for planning

## Overview

Phase 16 的 UI 目标不是再做一套“换颜色的主题”，而是让教师端主题可以在
 安全 allowlist 内切换导航壳层、页面 region 顺序和模块编排，同时继续保持
 `DESIGN.md` 的简体中文、Lexend、tonal layering、无 1px divider 和单一主舞台原则。

## Shell modes

### `left-nav`

- 主导航位于左侧，内容区保留当前大圆角主容器
- 适用于延续当前教师工作台心智模型

### `top-nav`

- 主导航位于顶部 glass/tonal bar
- 页面 header 与主内容纵向堆叠
- 左侧不再显示 primary nav rail

### `top-nav + left secondary rail`

- 顶部承载 primary nav
- 左侧次级 rail 承载 page-local section navigation / quick actions
- 主内容区保持单一主舞台，不出现多 hero 竞争

## Required regions

以下 region 是 allowlisted contract：

- `primary-nav`
- `secondary-nav`
- `page-header`
- `main-content`
- `context-panel`
- `page-footer`

其中 `primary-nav`、`page-header`、`main-content` 必须始终存在。

## Page-surface contract

所有 teacher-facing routes 必须在 surface registry 中有记录。允许 richer orchestration
的页面包括但不限于：

- `/teacher`
- `/teacher/classes`
- `/teacher/courses`
- `/teacher/courses/[courseId]`
- `/teacher/courses/[courseId]/lessons`
- `/teacher/students`
- `/teacher/review`
- `/teacher/launch`
- `/teacher/editor`
- `/settings`
- `/settings/labs`
- `/settings/plugins`
- `/resources`

未做特化编排的页面也必须通过默认 surface contract 进入 `main-content`，而不是跳过
theme runtime。

## Module orchestration rules

- 主题只可调 page-level module 的 region、顺序和离散比例
- 主题不可修改模块内部字段布局、表单结构或业务交互语义
- 允许的比例使用离散摘要文案，如 `主内容 60:40`、`主内容 50:50`
- `context-panel` 与 `secondary-nav` 可隐藏，但隐藏后仍需保留稳定 fallback

## Fallback behavior

- 非法 region：仅该 region 回退到默认教师布局
- 非法 page override：该页面回退到 workspace default shell
- 非法 module 配置：所在 region 回退，不连带其他合法 region 失效
- 缺失 layout 数据：完整回退到当前默认教师布局

## Settings surface requirements

设置页主题卡片必须展示结构摘要，而不是仅依赖主题名推断。摘要至少包含：

- 壳层模式：`左侧导航` / `顶部导航` / `顶部导航 + 左侧辅栏`
- 主要内容比例：如 `主内容 60:40`
- 辅助区域状态：如 `启用上下文侧栏` / `隐藏页脚`
- 页面覆写提示：如 `课程详情页使用独立壳层`

## Visual guardrails

- 不使用边框分割 page regions
- 不把布局选择做成后台式配置表
- 不新增第二套 settings 主题入口
- 不使用名称彩蛋替代真实结构摘要
- 不把 classroom runtime、launch、editor 做成视觉特例豁免页；它们应通过 surface registry
  使用默认或覆写 contract
