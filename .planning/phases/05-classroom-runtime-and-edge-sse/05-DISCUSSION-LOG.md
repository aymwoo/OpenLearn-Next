# Phase 05: Classroom runtime and Edge SSE - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution
> agents. Decisions are captured in `05-CONTEXT.md`; this log preserves the
> alternatives considered.

**Date:** 2026-05-05
**Phase:** 05-classroom-runtime-and-edge-sse
**Areas discussed:** 启动与名单, 锁定语义, 冲突恢复, 重连快照

---

## 启动与名单

| Question | Options presented | Selected |
|----------|-------------------|----------|
| 课堂启动入口应该以哪种路径为主？ | 教师控制台启动; 课时页启动; 两处都支持; 你决定 | 教师控制台启动 |
| 启动课堂时，学生名单默认怎么来？ | 课程班级名单; 教师手动选择; 最近课堂名单; 你决定 | 教师选择班级名单，因为一个课程可能有多个班级都在进行 |
| 一次课堂 session 应该绑定几个班级？ | 单班级 session; 多班级合并; 先单班后扩展; 你决定 | 单班级 session |
| 如果课时未发布或班级名单为空，启动时应该怎么处理？ | 阻止并解释; 允许空课堂; 创建草稿课堂; 你决定 | 阻止并解释 |

**Notes:** 课堂启动从 `/classroom` 控制台开始。教师需要选择一个班级
名单，每个 session 只绑定一个班级。未发布课时或空 roster 不创建课堂。

---

## 锁定语义

| Question | Options presented | Selected |
|----------|-------------------|----------|
| 锁定跟随时，学生是否还能提交当前步骤的任务/测验？ | 允许当前提交; 全部只读; 按步骤类型; 你决定 | 允许当前提交 |
| 锁定跟随时，学生能否点开非当前步骤？ | 完全禁止导航; 允许看已完成; 允许看已开放; 你决定 | 完全禁止导航 |
| 自由浏览时，教师当前步骤对学生应是什么效果？ | 软推荐提示; 每次自动跳转; 只更新状态条; 你决定 | 软推荐提示 |
| 老师切换到一个学生尚未完成前置步骤的 step 时，学生端怎么处理？ | 仍然跟随老师; 要求补完前置; 只对 content 跟随; 你决定 | 仍然跟随老师 |

**Notes:** Locked mode 限制导航，不限制当前步骤提交。Unlocked mode 保留
教师当前步骤作为软推荐。教师强制步骤优先，但不自动修改个人进度。

---

## 冲突恢复

| Question | Options presented | Selected |
|----------|-------------------|----------|
| 教师控课操作发生版本冲突时，系统应该怎么处理本次尝试？ | 保留但不重放; 自动重试; 直接丢弃; 你决定 | 保留但不重放 |
| 版本冲突或旧面板出现后，教师还能继续点切步骤/切模式吗？ | 阻塞控课动作; 允许继续排队; 只阻塞相同类型; 你决定 | 阻塞控课动作 |
| 同一位教师快速连续切换多个步骤时，应该采用哪种语义？ | 一次只允许一个 pending; 最后一次优先; 全部顺序执行; 你决定 | 一次只允许一个 pending |
| 教师“刷新课堂快照”后，之前保留的操作应该怎么呈现？ | 提示重新确认; 刷新后自动执行; 只作为历史提示; 你决定 | 提示重新确认 |

**Notes:** 冲突恢复采用确认优先策略。系统保留教师意图但不自动重放，
并在快照刷新前阻塞进一步控课动作。

---

## 重连快照

| Question | Options presented | Selected |
|----------|-------------------|----------|
| 学生断线后，页面应先显示什么？ | 保留当前内容; 切到加载页; 立即刷新页面; 你决定 | 保留当前内容 |
| 学生重连后发现教师当前 locked step 已变化，何时跳转？ | 快照确认后跳转; SSE 一来就跳; 提示学生确认; 你决定 | 快照确认后跳转 |
| 迟到学生进入一个已运行课堂时，默认进入哪里？ | locked 到当前步; 个人进度优先; 选择加入位置; 你决定 | locked 到当前步 |
| SSE 长时间失败但 SQLite 快照可读时，学生端应该如何降级？ | 快照轮询兜底; 只显示错误; 退出课堂模式; 你决定 | 快照轮询兜底 |

**Notes:** 学生端断线不清空当前内容或草稿。重连后先以 SQLite 快照确认
状态，再处理 locked step 跳转。SSE 不可用时使用快照刷新兜底。

## the agent's Discretion

- Exact schema, DTO, route handler, and component names remain up to the planner.
- Exact SSE event names and payload shape remain up to the planner, provided
  they reconcile with durable classroom session versions or snapshots.
- Polling interval and preserved-attempt storage location remain implementation
  details.

## Deferred Ideas

- Multi-class merged classroom sessions.
- Class roster management, search, invitations, and ad hoc student adding.
- Full notifications, AI classroom control, gradebook behavior, WebSocket
  collaboration, and offline/mobile-native classroom mode.
