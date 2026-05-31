# Phase 17: Teacher flow editor enhancement - UI Spec

**Created:** 2026-05-10  
**Status:** Ready for planning

## Overview

Phase 17 的 editor 不是继续堆更多表单卡片，而是把教师编排体验收敛成一个真正的
“流程编辑器”：左侧/上方负责组合课堂环节，中部呈现流程主线，右侧呈现结构化属性、
发布准备与预览入口。视觉上继续遵守 `DESIGN.md` 与 Stitch 项目 `5322129002350954765`。

## Editor composition contract

### Flow composition area

- 教师必须能在同一工作区看到：
  - 普通步骤入口：`内容` / `任务` / `测验`
  - 内置教学环节入口：教师讲授、问卷调查、学生探究、课堂测验、评价
- 内置教学环节不能退回到“隐藏二级选择器”；它们要和普通步骤一起被理解为课堂流程组件。
- 流程主线需要清楚展示顺序、类型、来源、预计节奏或摘要，避免只剩一列基础按钮。

### Step property editor

- 当前选中步骤要进入统一的属性编辑器区域，而不是分散在多个割裂卡片里。
- built-in teaching-step 来源信息应以 badge / label 形式可见，但不能让教师误以为能执行任意插件代码。
- 引用材料编辑保持结构化、低干扰、中文界面。

## Preview requirements

- `预览课堂` 必须有真实可进入的 teacher preview route。
- editor 内部还应有一个简短 preview panel / summary，让教师不离开编排页也能预判课堂顺序。
- preview 看到的是当前草稿 lesson flow，而不是学生端 progress/runtime。
- preview 需要呈现：
  - 步骤顺序
  - 步骤类型
  - built-in 环节标签
  - 引用材料摘要
  - readiness / publish warning 提示（如果有）

## Publish-readiness panel

- 发布前检查必须是结构化列表，不是单句提示。
- blocking issues 需要有清晰分组，例如：
  - 缺失标题或教学目标
  - 步骤 payload 不完整
  - 内置教学环节插件当前不可用
  - 没有有效步骤
- publish CTA 在 blocking issues 存在时禁用，并显示原因。

## Layout and hierarchy

- 保持 editor 的大圆角主舞台与 tonal layers，不加 1px divider。
- 不要把 preview / readiness 做成后台式表格。
- 主舞台优先突出流程本身，属性编辑和 readiness 面板作为二级支持区域。
- 所有用户可见文案保持简体中文；技术名或 plugin id 仅在必要时保留英文。

## Visual guardrails

- 不使用 border-heavy split panes。
- 不让多个 hero 同时竞争注意力。
- 不使用 placeholder CTA 冒充真实功能。
- 不让 preview route 进入学生运行时心智；它属于教师 authoring 流程。

## Interaction notes

- `新增步骤` 与 built-in teaching-step 的按钮需要保持快速可达。
- reorder、duplicate、archive 等现有动作保留，但要在流程主线中表达得更自然。
- preview 与 publish-readiness 的反馈必须与当前 lesson revision 绑定，避免教师误读旧状态。
