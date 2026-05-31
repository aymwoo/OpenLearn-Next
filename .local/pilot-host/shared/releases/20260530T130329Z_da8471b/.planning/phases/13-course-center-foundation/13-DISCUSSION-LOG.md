# Phase 13: Course center foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09T11:37:56+00:00
**Phase:** 13-Course center foundation
**Areas discussed:** 课程中心形态, 新建编辑流程, 进入教案管理, 列表排序状态

---

## 课程中心形态

| Option | Description | Selected |
|--------|-------------|----------|
| 总览列表+详情页 | 课程中心先展示教师课程总览，点进单独的 course detail 页；和 roadmap/architecture 建议一致，也更利于后续 Phase 14/15 扩展。 | ✓ |
| 列表页内联展开 | 留在同一页展开编辑和入口，切换更快，但后续叠加关联/生命周期操作会更拥挤。 | |
| 课程中心三栏布局 | 左侧课程列表，中间详情，右侧快捷操作；信息密度高，但实现和移动端收缩更复杂。 | |

**User's choice:** 总览列表+详情页
**Notes:** 同 area 内进一步确认了总览采用卡片网格、显式状态标签、点击课程先进入详情页。

---

## 新建编辑流程

| Option | Description | Selected |
|--------|-------------|----------|
| 列表页弹出抽屉 | 在 `/teacher/courses` 点击“创建课程”后右侧抽屉填写基础信息，创建后回到列表并可继续点进详情。 | ✓ |
| 独立新建页 | 跳到单独的 `/teacher/courses/new` 页面，空间更充足，但对基础信息表单来说略重。 | |
| 列表页弹窗 | 实现最轻，但字段一多容易拥挤，后续扩展不如抽屉自然。 | |

**User's choice:** 列表页弹出抽屉
**Notes:** 同 area 内进一步确认：编辑放在课程详情页内；保存后需要页内成功反馈和立即刷新，而不是只给轻提示。

---

## 进入教案管理

| Option | Description | Selected |
|--------|-------------|----------|
| 该课程的课时列表入口 | 先展示该课程下的课时概况和“新建课时/继续编辑”入口，再进入具体编辑器；更符合 course-aware workflow。 | ✓ |
| 直接跳编辑器 | 直接带着 `courseId` 进 `/teacher/editor`，再在编辑器内选择或创建课时；路径短，但上下文容易混。 | |
| 课程详情内嵌课时区 | 课程详情页下半部分直接列出课时并操作；连贯，但会让详情页变重。 | |

**User's choice:** 该课程的课时列表入口
**Notes:** 同 area 内进一步确认：Phase 13 先建课程详情里的 course-aware 课时入口页；没有课时时主 CTA 为“新建第一个课时”。

---

## 列表排序状态

| Option | Description | Selected |
|--------|-------------|----------|
| 最近更新优先 | 按 `updatedAt` 倒序，教师总是先看到最近在处理的课程，最贴近日常使用。 | ✓ |
| 状态优先再按更新时间 | 先把草稿放前面，再按更新时间排；更强调推进中的课程。 | |
| 按学科/年级分组 | 更便于静态浏览，但不一定符合高频运营节奏。 | |

**User's choice:** 最近更新优先
**Notes:** 同 area 内进一步确认：状态优先级为“草稿 -> 已发布 -> 已归档”；归档课程默认隐藏，需手动查看。

---

## the agent's Discretion

- 课程卡片字段排布、详情页模块顺序和状态 badge 的具体视觉实现，可由后续 planner/implementer 在现有设计系统内自行收敛。

## Deferred Ideas

- 无。讨论保持在 Phase 13 边界内。
