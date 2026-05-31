# Phase 13: Course center foundation - UI Spec

**Created:** 2026-05-09  
**Status:** Ready for planning

## Overview

Phase 13 的 UI 目标是把教师侧“课程管理”从占位课程库升级为真实可操作的
课程中心。界面必须保持 Stitch `课程中心` 的高密度卡片节奏，同时沿用
`DESIGN.md` 的 no-line、tonal layering、glass/gradient CTA 与简体中文规范。

## Route contract

### `/teacher/courses`

- 页面类型：课程总览页
- 主视觉：单一课程中心 hero + 下方课程卡片网格
- 主 CTA：`新建课程`
- 默认视图：非归档课程卡片网格
- 列表行为：按最近更新时间排序，但先按状态优先级分组

### `/teacher/courses/[courseId]`

- 页面类型：独立课程详情页
- 页面职责：
  - 展示课程基础信息
  - 支持页内编辑课程标题、学科、年级、状态
  - 提供页内成功反馈
  - 提供进入课程课时/教案管理的主 CTA

### `/teacher/courses/[courseId]/lessons`

- 页面类型：course-aware 课时入口页
- 页面职责：
  - 展示当前课程已有课时列表
  - 无课时时展示 calm empty state
  - 主 CTA 为 `新建第一个课时`
  - 已有课时时提供 `继续编辑` / `新建课时`

## Locked decision translation

| Decision | UI translation |
|----------|----------------|
| D-01 | 使用总览页 + 独立详情页两级结构 |
| D-02 | 总览页主体是卡片网格，不切成后台表格 |
| D-03 | 每张课程卡显式展示状态 badge |
| D-05 | 新建课程使用右侧抽屉，而非独立 `new` 页面 |
| D-06 | 课程编辑放在详情页内完成 |
| D-07 | 保存成功反馈必须是页内可见的 success region，不是只有 toast |
| D-09~D-12 | 从课程详情先进入课程内课时入口，再进入具体 editor |
| D-18 | 全部界面继续遵守 Lexend / tonal surfaces / no-line |

## Surface and component guidance

### Course center surface

- 头部使用 `surface-container-low` 大容器，内部信息卡使用
  `surface-container-lowest`
- 课程卡使用白色 action card，圆角与 shadow 继承当前 library surface 节奏
- 状态 badge 位置固定在卡片头部可见区
- 搜索/筛选区保持 ghost field 交互合同

### Course detail surface

- 顶部展示课程名、状态、学科/年级摘要
- 中段为基础信息编辑区
- 成功保存后在编辑区上方出现 success panel，包含“已保存”与当前字段摘要
- 底部或右侧提供进入课时管理的主 CTA

### Course lessons entry surface

- 有课时时：列表卡片展示课时标题、状态、修订号、步骤数
- 无课时时：主文案强调“从这门课程开始编排第一个课时”
- CTA 优先级：
  1. `新建第一个课时` / `新建课时`
  2. `继续编辑已有课时`

## Empty and feedback states

- 总览空态：说明当前还没有课程，并保留 `新建课程` 主 CTA
- 详情空 lessons 状态：说明课程已创建，可从这里开始建立课时
- 保存成功：页内 success region，文案示例 `课程信息已更新，并已同步到当前课程视图`
- 校验失败：字段级错误 + 表单顶部简短错误摘要

## Visual guardrails

- 不使用 1px divider line
- 不使用后台表格主视图
- 不把课程状态弱化为正文末尾字符串
- 不把主流程拆成多 hero 或多重强渐变舞台
