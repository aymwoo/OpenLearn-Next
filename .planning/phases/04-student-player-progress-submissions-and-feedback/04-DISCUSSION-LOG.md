# Phase 04: Student player, progress, submissions, and feedback - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 04-student-player-progress-submissions-and-feedback
**Areas discussed:** 续播规则, 提交与重试, 教师反馈范围, 教师查看粒度, 空状态错误, 移动端优先, 测验结果, 反馈可见性

---

## 续播规则

| Question | Selected |
|----------|----------|
| 学生点击“继续学习”时，默认应该进入哪个步骤？ | 第一个未完成 |
| 如果 Phase 5 之后老师正在课堂里指定某个步骤，学生再次打开播放器时谁优先？ | 老师指定优先 |
| 学生完成当前步骤后，播放器应该如何推进？ | 提示后手动继续 |
| 学生 dashboard 的多个课时排序，最相关的课时怎么定义？ | 进行中优先 |

---

## 提交与重试

| Question | Selected |
|----------|----------|
| task 提交后，学生是否可以再次提交新的尝试？ | 教师配置决定 |
| quiz 作答后是否允许重试？ | 教师配置决定 |
| 历史尝试在学生端应该怎么展示？ | 展示摘要入口 |
| 提交时如果网络或 Server Action 失败，界面应该怎么处理？ | 保留本地草稿 |

---

## 教师反馈范围

| Question | Selected |
|----------|----------|
| 教师可以对哪些学习证据留下短反馈？ | task 和 quiz |
| 一个提交/作答应该允许几条教师反馈？ | 一条可更新 |
| 教师反馈发送后，学生端应该在哪里看到？ | 当前步骤卡片 |
| 教师反馈长度和语气怎么约束？ | 短反馈 200 字 |

---

## 教师查看粒度

| Question | Selected |
|----------|----------|
| 教师进入学习反馈页时，默认视角应该是什么？ | 课时总览 |
| 教师下钻到学生时，最重要的信息排序是什么？ | 进度再提交 |
| 教师 review surface 是否需要筛选器？ | 基础状态筛选 |
| 教师反馈入口应该放在哪里？ | 学生详情内 |

---

## 空状态错误

| Question | Selected |
|----------|----------|
| 学生没有任何已发布/可学习课时时，页面主动作是什么？ | 查看课程列表 |
| 如果学生打开了一个未发布、无权限或不存在的 lesson，应该如何处理？ | 统一不可访问页 |
| 提交成功后进度刷新失败，UI 应该如何表达？ | 提交成功优先 |
| 教师 review 中没有提交或没有学生时，主引导是什么？ | 解释等待状态 |

---

## 移动端优先

| Question | Selected |
|----------|----------|
| Phase 4 学生端主要优化哪个课堂设备场景？ | 桌面优先 |
| 小屏时 step rail 应该如何呈现？ | 顶部横向 pills |
| task 文本输入在移动端应该如何处理？ | 页面内输入 |
| 桌面/移动的信息密度应该如何取舍？ | 桌面完整移动精简 |

---

## 测验结果

| Question | Selected |
|----------|----------|
| 学生提交 quiz 后，是否立即展示正确答案？ | 按教师配置 |
| quiz 结果展示到什么程度？ | 对错与解析 |
| 学生重试 quiz 时，历史结果如何处理？ | 保留历史最新突出 |
| 教师 review 中 quiz outcome 应该如何呈现？ | 状态加最近结果 |

---

## 反馈可见性

| Question | Selected |
|----------|----------|
| 教师反馈编辑是否需要草稿状态？ | 不需要草稿 |
| 教师发送反馈后，学生端何时可见？ | 发送后立即可见 |
| 教师更新已有反馈时，学生端如何表达？ | 显示最新反馈 |
| 反馈失败时，教师端应该怎么处理？ | 保留输入重试 |

---

## the agent's Discretion

- Exact schema names, DTO field names, component split, and route placement.
- Concrete persistence location for retry/reveal teacher-configured fields.

## Deferred Ideas

- Live classroom SSE, full gradebook, rubric builder, notifications, feedback threads, edit history, and AI-generated feedback remain out of Phase 04.
