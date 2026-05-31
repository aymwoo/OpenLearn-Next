# Phase 34: Course membership management loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 34-course-membership-management-loop
**Areas discussed:** 可添加学生来源, 添加交互粒度, 成员列表组织, archived 课程成员管理

---

## 可添加学生来源

| Option | Description | Selected |
|--------|-------------|----------|
| 仅已关联班级中的学生 | 复用现有 course-class 关系，避免泄漏同校其它 roster | ✓ |
| 同校所有 eligible 学生 | 范围更宽，但更容易越过课程详情当前边界 | |
| 其它范围 | 由用户自由描述 | |

**User's choice:** 仅已关联班级中的学生
**Notes:** 锁定 scope-safe read model，不能暴露 same-school foreign rosters。

---

## 添加交互粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 单个添加 | 最贴近现有详情页 add/remove 动作模型，反馈语义简单 | ✓ |
| 多选批量添加 | 需要新的批量输入、反馈与部分成功语义 | |
| 其它方式 | 由用户自由描述 | |

**User's choice:** 单个添加
**Notes:** 本阶段不引入批量 enrollment mutation。

---

## 成员列表组织

| Option | Description | Selected |
|--------|-------------|----------|
| 纯名单列表，可带班级标签 | 保持详情页信息密度稳定，同时提供来源上下文 | ✓ |
| 按班级分组 | 更强运营视图，但会把详情页推向分组管理面板 | |
| 其它组织方式 | 由用户自由描述 | |

**User's choice:** 纯名单列表，可带班级标签
**Notes:** 锁定为 list-first，不做 grouped panel。

---

## archived 课程成员管理

| Option | Description | Selected |
|--------|-------------|----------|
| 只读禁改 | 与 archived 课程当前“可查看但不继续推进流程”的语义一致 | ✓ |
| 继续允许 add/remove | 归档后仍可调整成员，语义更宽 | |
| 其它策略 | 由用户自由描述 | |

**User's choice:** 只读禁改
**Notes:** archived 课程仍显示成员，但所有 enrollment mutation 入口关闭。

---

## Claude's Discretion

- 可在不改变已锁定决策的前提下，自行收敛搜索、空状态和标签样式等 UI 细节。

## Deferred Ideas

- 批量 enrollment add/remove
- 按班级分组的成员运营视图
- 放宽到同校所有学生池
- 独立成员管理页面或平行运营台
