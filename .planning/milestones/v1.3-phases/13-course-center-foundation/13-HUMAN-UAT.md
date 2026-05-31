---
status: complete
phase: 13-course-center-foundation
source: [13-VERIFICATION.md]
started: 2026-05-09T13:40:34+00:00
updated: 2026-05-14T15:02:01Z
---

## Current Test

已于 2026-05-14 使用真实浏览器完成 `/teacher/courses` 相关人工 UAT。

## Tests

### 1. 课程中心范围与学校选择器
expected: 只能看到当前教师本人拥有的课程；单学校教师默认学校正确，多学校教师可见且可切换真实学校选项。
result: [passed]
evidence: `teacher@example.com/password` 登录后只能看到 `开发测试课程`，看不到 `非本人课程-作用域校验`；建课抽屉显示两个学校选项，默认值为 `OpenLearn 测试学校`。`other-teacher@example.com` 登录后只能看到 `非本人课程-作用域校验`，建课抽屉不再显示学校下拉，而是显示只读学校文案 `OpenLearn 第二测试学校`。

### 2. 建课与编辑的 read-your-writes
expected: 新课程立即出现在课程卡片网格；详情页出现持久成功反馈，且刷新后仍显示最新字段。
result: [passed]
evidence: 在课程中心创建 `Phase13-UAT-<timestamp>` 后，课程卡片立即可见；进入详情页保存为 `Phase13-UAT-<timestamp>-已更新` 后，页面显示 `课程信息已更新，并已同步到当前课程视图`，刷新后标题仍保持更新值。

### 3. 从课程进入课时/教案管理
expected: 空课程通过“新建第一个课时”进入 editor；已有课时课程可继续编辑，不出现脱离课程上下文的跳转。
result: [passed]
evidence: 新建空课程进入 `/teacher/courses/[courseId]/lessons` 后显示 `新建第一个课时`，点击后进入 `/teacher/editor?courseId=<new>&lessonId=<new>`；现有 `开发测试课程` 通过 `进入课时管理 -> 继续编辑` 进入 `/teacher/editor?courseId=d2659c6a-0a5d-4505-8c28-32a7507d09f5&lessonId=1efc3dd3-ebd2-4c5d-b7bf-7ec80783808c`。

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
