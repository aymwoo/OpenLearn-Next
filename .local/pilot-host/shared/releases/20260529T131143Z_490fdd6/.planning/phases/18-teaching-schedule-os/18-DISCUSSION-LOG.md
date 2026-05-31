# Phase 18: Teaching schedule OS - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 18-teaching-schedule-os
**Areas discussed:** 首发导入流程, 日程主视图, 调课生效规则, 提醒与AI边界

---

## 首发导入流程

| Option | Description | Selected |
|--------|-------------|----------|
| 审核台两阶段 | 先上传进入 staging，展示结构化校验与冲突，再由人工批准写入 normalized model。 | ✓ |
| 向导式直达 | 上传后按步骤确认并直接导入。 | |
| 双模式并存 | 同时提供快速导入和审核台。 | |

**User's choice:** 审核台两阶段
**Notes:** 首发导入必须以人工审核台为核心，不直接跳过 staging。

| Option | Description | Selected |
|--------|-------------|----------|
| 按行审核 | 每条课表记录都展示校验、映射和冲突信息。 | ✓ |
| 按文件审核 | 只展示整份文件结果。 | |
| 文件加重点行 | 展示整体结果并展开异常行。 | |

**User's choice:** 按行审核
**Notes:** 生产级课表导入首发必须支持 row-level review。

---

## 日程主视图

| Option | Description | Selected |
|--------|-------------|----------|
| 教师个人日程 | 先围绕教师当天上课安排生成主视图。 | ✓ |
| 班级日程 | 先围绕班级当日课表生成主视图。 | |
| 教师与班级并列 | 两种视图首发都做。 | |

**User's choice:** 教师个人日程
**Notes:** 首发 runtime agenda engine 先服务教师视角。

| Option | Description | Selected |
|--------|-------------|----------|
| 时间、班级、地点、状态 | 先讲清楚什么时候、给谁上、在哪上、是否有变更。 | ✓ |
| 课程内容与教案链接 | 把 lesson/教案入口放在第一层。 | |
| 两者同等强调 | 调度信息和教学内容同等强调。 | |

**User's choice:** 时间、班级、地点、状态
**Notes:** 教案联动可有，但不能压过运行时调度信息。

---

## 调课生效规则

| Option | Description | Selected |
|--------|-------------|----------|
| 单次覆盖 | 针对某一天某一节做 override。 | ✓ |
| 整周替换 | 一次改一整周同节次。 | |
| 单次与整周都支持 | 首发同时支持两套模式。 | |

**User's choice:** 单次覆盖
**Notes:** 先把单次 override 和审计链路做稳定，不扩到整周级替换。

| Option | Description | Selected |
|--------|-------------|----------|
| 代课 | 换授课教师，但保留原课次 lineage。 | ✓ |
| 停课 | 当前课次取消。 | ✓ |
| 换时间/教室 | 调整到其他 bell slot 或地点。 | ✓ |
| 补课新建 | 从 override 层直接新增补课。 | |

**User's choice:** 代课, 停课, 换时间/教室
**Notes:** 首发 override 动作覆盖高价值运行时变更，不扩到补课新建。

---

## 提醒与AI边界

| Option | Description | Selected |
|--------|-------------|----------|
| 只产出建议 | 只给映射建议、冲突解释、调课建议。 | ✓ |
| 可生成待审批草案 | 生成可审批 reschedule proposal。 | |
| 直接代用户执行 | AI 直接改课表。 | |

**User's choice:** 只产出建议
**Notes:** AI 首发停留在建议层，不直接执行任何 schedule-affecting mutation。

| Option | Description | Selected |
|--------|-------------|----------|
| 开课前提醒 | 提前提醒即将开始的课程。 | ✓ |
| 调课变更提醒 | 针对代课、停课、换时间/教室的变更通知。 | ✓ |
| 每日晨间摘要 | 汇总今日 agenda。 | |
| 家长/学生外发通知 | 面向更广泛对象的通知。 | |

**User's choice:** 开课前提醒, 调课变更提醒
**Notes:** 首发 reminder 优先覆盖教师侧运行提醒，不扩到外部通知对象。

---

## the agent's Discretion

- normalized schedule 的具体表拆分
- daily agenda DTO 结构
- reminder trigger window
- AI suggestion payload 细节
- teacher-facing schedule surface 的具体布局

## Deferred Ideas

- 每日晨间摘要
- 家长/学生外发通知
- 学校级总调度大盘优先于教师主视图
