# Phase 22: teacher-orchestration-workspace-and-launch-preparation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 22-teacher-orchestration-workspace-and-launch-preparation
**Areas discussed:** 准备区主结构, 名册作用域, 运行时强调, 阻断规则

---

## 准备区主结构

### 主结构

| Option | Description | Selected |
|--------|-------------|----------|
| 三段工作台 | 用一个主舞台 + 两个次级区组织 launch preparation | ✓ |
| 双栏准备页 | 用左右双栏承载准备信息与 launch 动作 | |
| 清单驱动页 | 先列 checklist，再逐项进入准备动作 | |

**User's choice:** 三段工作台
**Notes:** 用户明确不希望 Phase 22 仍停留在轻量面板，也不想把它做成 utilitarian checklist flow。

### 主舞台归属

| Option | Description | Selected |
|--------|-------------|----------|
| Run sheet 主舞台 | class-facing run sheet 占最大主区域 | ✓ |
| 配置区主舞台 | 以 launch 配置为第一主任务 | |
| Readiness 主舞台 | 以 readiness gate/检查面板为第一主任务 | |

**User's choice:** Run sheet 主舞台
**Notes:** 用户希望准备页首先回答“这节课将如何带着学生走”，而不是先看配置表或警告列表。

### Run sheet 呈现方式

| Option | Description | Selected |
|--------|-------------|----------|
| 节奏卡片流 | 按课堂推进顺序展示步骤卡片 | ✓ |
| 时间线视图 | 用更强的 timeline 方式展示节奏 | |
| 表格式 run sheet | 用表格集中展示步骤与字段 | |

**User's choice:** 节奏卡片流
**Notes:** 用户倾向延续现有 teacher-facing preview/card 语言，而不是切成表格或更重的运营视图。

---

## 名册作用域

### Launch scope 粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 整班 + 小组/子集 | 允许整班之外再缩小范围 | |
| 只允许整班 | 启动课堂时只允许整班名册 | ✓ |
| 多班混合 | 允许跨班组合一节课 | |

**User's choice:** 只允许整班
**Notes:** 用户明确把 launch scope 控制在最小复杂度，不让本阶段扩成名册编排系统。

### Launch 前对名册可做的事

| Option | Description | Selected |
|--------|-------------|----------|
| 只看摘要 | 只能看 roster 摘要和异常提示 | ✓ |
| 临时排除少数学生 | 可在 launch 前临时移除个别学生 | |
| 可直接编辑名册 | 在 launch 页直接管理班级名单 | |

**User's choice:** 只看摘要
**Notes:** 用户不希望 `/teacher/launch` 变成班级管理延伸页；名册编辑仍应留在班级相关页面。

---

## 运行时强调

### 最值得显式强调的运行时信息

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂节奏与关注点 | 重点突出本节课如何推进、教师应关注什么 | ✓ |
| 锁定模式等运行参数 | 优先让教师配置 locked/unlocked 等控制参数 | |
| 都要，但以节奏为主 | 两类都上，但节奏更重要 | |

**User's choice:** 课堂节奏与关注点
**Notes:** 用户认为 Phase 22 应优先服务“开课前的教学准备”，不是提前进入 runtime control 配置面。

### Run sheet 必须显式突出哪些信息

| Option | Description | Selected |
|--------|-------------|----------|
| 关键步骤 + 材料 + 采证提醒 | 把三类信息做成正式信息层 | ✓ |
| 关键步骤 + 课堂模式提醒 | 强调步骤与 lock mode 等运行方式 | |
| 只突出关键步骤 | 材料和采证仍放正文或次级说明 | |

**User's choice:** 关键步骤 + 材料 + 采证提醒
**Notes:** 这是用户希望 Phase 22 最终 surface 正式承载的开课前重点，不只是说明文案。

### 这些强调信息的性质

| Option | Description | Selected |
|--------|-------------|----------|
| 只读准备摘要 | 只做 launch 前准备摘要，不写 session-specific 配置 | ✓ |
| 允许少量临时备注 | 允许教师补一点 session note | |
| 允许完整 session 配置 | 在 launch 页形成完整课堂配置系统 | |

**User's choice:** 只读准备摘要
**Notes:** 用户明确不希望本阶段引入第二套 session draft/config 模型。

---

## 阻断规则

### Readiness gate 姿态

| Option | Description | Selected |
|--------|-------------|----------|
| 少量硬阻断 + 明确提醒 | 只有少数硬阻断，其余缺口明确分级提醒 | ✓ |
| 严格阻断 | 缺口较多时直接不允许开课 | |
| 几乎不阻断 | 尽量不阻止开课 | |

**User's choice:** 少量硬阻断 + 明确提醒
**Notes:** 用户希望 readiness 更诚实，但不希望本期对教学设计不完整做过度 gatekeeping。

### 哪些问题属于硬阻断

| Option | Description | Selected |
|--------|-------------|----------|
| 没有可启动班级 | lesson 没有关联到可用班级，无法带入 roster | ✓ |
| 没有已发布课时 | 没有 published lesson，不能从 snapshot 启动课堂 | ✓ |
| 关键教学设计仍是待完善 | teaching design fallback 仍存在 | |
| 缺少材料摘要或采证提醒 | launch preview 信息不完整 | |

**User's choice:** 没有可启动班级；没有已发布课时
**Notes:** 用户明确把教学设计/材料/证据缺口留在提醒层，不在本期升格成不能开课的硬阻断。

### 非阻断缺口如何呈现

| Option | Description | Selected |
|--------|-------------|----------|
| 分成“需关注 / 建议完善”两级 | 让提醒有轻重层级 | ✓ |
| 统一提醒列表 | 所有缺口放在一个 list 里 | |
| 嵌入每张步骤卡 | 不再单列 readiness 区 | |

**User's choice:** 分成“需关注 / 建议完善”两级
**Notes:** 用户希望 readiness 仍是独立可扫读的信息层，而不是分散到每张卡片中难以建立总览。

---

## the agent's Discretion

- orchestration workspace 三段区域的精确命名
- run sheet 卡片的版式密度与 badge/summary 组合方式
- readiness 两级提醒的 DTO 命名与排序规则

## Deferred Ideas

- 小组/子集 launch scope
- launch 前的 session-specific 临时备注或完整配置系统
- 更复杂的 runtime control 参数预设
- 将 teaching design / materials / evidence 缺口升级成更严格的 launch 阻断
