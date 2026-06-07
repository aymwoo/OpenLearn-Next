# Phase 64 Discussion Log

**Date:** 2026-05-31
**Mode:** interactive discuss-phase (default)
**Areas discussed:** 4

---

## Area 1: Diff 视图呈现

### 布局方式
**Question:** AI 草稿 vs 当前课时的步骤级差异如何呈现在界面上？

**Options:**
- 单列 diff 标注 — 一条垂直步骤列表，每步标注状态
- 左右并排对比 — 镜像排列左右两列
- Tab 切换 + 摘要条 — 两个 Tab 分别展示

**Selected:** 单列 diff 标注

---

### 步骤匹配对齐依据
**Question:** 步骤的匹配/对比依据是什么？

**Options:**
- 按步骤索引位置对齐
- 按内容相似度智能匹配
- 不比对——仅展示 AI 稿

**Selected:** 按步骤索引位置对齐（draft steps[n] ↔ live steps[n]）

---

### 编辑模式
**Question:** 点击一个草稿步骤后，进入什么编辑模式？

**Options:**
- 右侧面板/底部抽屉内联编辑
- 弹出现有 LessonStepEditor 模态框
- inline 原地展开编辑

**Selected:** 右侧面板/底部抽屉内联编辑

---

## Area 2: 接受后的落库路径

### 接受后的动作
**Question:** 教师点击「接受」AI 草稿后，执行什么落库动作？

**Options:**
- 接受 = apply 到活跃步骤 → 教师再点发布
- 接受 = 直接发布
- 接受 = 仅标记草稿状态

**Selected:** 接受 = apply 到活跃步骤，教师回到编辑器再点「发布」

---

### 合并策略
**Question:** 活跃 lessonSteps 非空时的合并策略？

**Options:**
- 完全替换（archive 旧步，写入新步）
- 智能合并（按索引逐项比对）
- 追加到末尾

**Selected:** 完全替换

---

### source 标记方式
**Question:** apply 后 source 标记如何处理？

**Options:**
- 仅 lessons 表标回链
- 每个 lessonStep 都标 source='ai'
- 不做 source 标记

**Selected:** 仅 lessons 表标回链（aiDraftAppliedAt / latestDraftVersionId）

---

### 丢弃行为
**Question:** 教师点「丢弃」后 draftLessonVersions 行如何处理？

**Options:**
- 标记丢弃 + 保留行
- 物理删除行
- 软删除 + 隐藏

**Selected:** 标记丢弃 + 保留行（status/archivedAt）

---

## Area 3: 审校入口与布局

### 审校入口
**Question:** 教师从何处进入 AI 草稿审校界面？

**Options:**
- 编辑器内模式切换
- 独立审校页面
- 弹窗/抽屉覆盖

**Selected:** 编辑器内模式切换（/teacher/editor?mode=review，顶部切换开关）

---

### 草稿发现通知
**Question:** 教师如何知道存在待审校的 AI 草稿？

**Options:**
- 编辑器顶部 glass 提示栏
- 课程/课时列表徽章
- 无主动提示

**Selected:** 编辑器顶部 glass 提示栏（可关闭但刷新重现）

---

### 审校界面布局
**Question:** 审校模式下界面如何布局？

**Options:**
- 全宽 diff + 顶部操作栏 + 右侧编辑面板
- 保留侧边面板 + diff 在中间
- 纯 diff 全屏

**Selected:** 全宽 diff + 顶部操作栏 + 右侧编辑面板（左侧资源面板折叠）

---

### URL 模式表达
**Question:** 模式切换是否反映在 URL 上？

**Options:**
- URL 参数 ?mode=review
- 纯客户端 state

**Selected:** URL 参数 ?mode=review（可收藏/分享/后退）

---

### 审校进度保留
**Question:** 切回编辑再切回审校，之前的编辑是否保留？

**Options:**
- 保留审校进度（客户端 state）
- 每次重置

**Selected:** 保留审校进度（客户端 state，刷新清空）

---

## Area 4: 步骤级编辑能力范围

### 可编辑字段
**Question:** 审校侧面板中能编辑草稿步骤的哪些字段？

**Options:**
- 轻量编辑：title + description + content
- 完整复用 LessonStepEditor
- 仅作只读展示

**Selected:** 轻量编辑（title + description + content），type 不可改

---

### 步骤级操作
**Question:** 每个步骤是否有独立的接受/丢弃操作？

**Options:**
- 逐项接受/丢弃 + 全局动作
- 仅全局接受/丢弃
- 接受/跳过/覆盖三步选项

**Selected:** 逐项接受/丢弃 + 全局「接受全部」「丢弃全部」

---

*Discussion completed: 2026-05-31*
