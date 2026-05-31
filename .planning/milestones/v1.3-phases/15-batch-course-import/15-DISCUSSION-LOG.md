# Phase 15: Batch course import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 15-batch-course-import
**Areas discussed:** 模板与字段, 匹配与重复, 预览与应用, 结果反馈

---

## 模板与字段

| Option | Description | Selected |
|--------|-------------|----------|
| CSV 首发 | 复用现有 schedule import 的模板下载、CSV 解析和 action 包装模式 | ✓ |
| CSV+XLSX | 同时兼容两种文件格式 | |
| Excel 优先 | 以 Excel 为首发主格式 | |

**User's choice:** CSV 首发
**Notes:** 用户明确优先复用现有 CSV 导入链路，不为首发引入第二套解析能力。

| Option | Description | Selected |
|--------|-------------|----------|
| 标题+学科+年级 | 最小课程基础信息字段 | |
| 再加课程状态 | 允许导入时直接携带状态列 | ✓ |
| 保留扩展列 | 预留更多字段先不生效 | |

**User's choice:** 在最小模板基础上最终补入 `课程状态` 列
**Notes:** 最初先选了“标题+学科+年级”，后续为保住真实 `updated` 结果语义，明确追加 `课程状态` 作为唯一可更新字段。

| Option | Description | Selected |
|--------|-------------|----------|
| 不包含班级关联 | 继续留在课程详情页显式处理 | ✓ |
| 包含班级名称列 | 导入时顺带做 class association | |
| 只做备注列 | 只显示目标班级说明 | |

**User's choice:** 不包含班级关联
**Notes:** 用户明确不把 Phase 14 的 `COURSE-06` 独立动作重新揉回导入模板。

| Option | Description | Selected |
|--------|-------------|----------|
| 新建一律 draft | 状态列只用于命中已有课程时更新 | ✓ |
| 新建也按状态列创建 | 新课程可直接创建为 published/archived | |
| 新建时忽略状态并提示 | 提示但不应用状态列 | |

**User's choice:** 新建一律 draft
**Notes:** 用户接受模板里保留状态列，但要求它只服务命中已有课程的更新语义。

---

## 匹配与重复

| Option | Description | Selected |
|--------|-------------|----------|
| 标题+学科+年级 | 同校内按三字段匹配已有课程 | ✓ |
| 只看标题 | 以标题单字段命中已有课程 | |
| 显式导入键 | 新增专门导入 key 字段 | |

**User's choice:** 标题+学科+年级
**Notes:** 用户希望匹配尽量稳定，不引入新的导入键，也不放宽到只看标题。

| Option | Description | Selected |
|--------|-------------|----------|
| 更新现有课程 | 命中即直接更新 | |
| 跳过并提示 | 命中后默认跳过 | |
| 预览时逐行选择 | 在预览台决定更新还是跳过 | ✓ |

**User's choice:** 预览时逐行选择
**Notes:** 用户明确要求命中已有课程时保留教师决策感，不做隐式覆盖。

| Option | Description | Selected |
|--------|-------------|----------|
| 视为冲突并阻断 | 同批次撞车时不做隐式覆盖 | ✓ |
| 最后一行生效 | 以后出现的行为准 | |
| 第一行生效 | 以前出现的行为准 | |

**User's choice:** 视为冲突并阻断
**Notes:** 用户不接受同批次内部靠顺序决定覆盖结果。

| Option | Description | Selected |
|--------|-------------|----------|
| 更新或跳过 | 命中行可二选一 | ✓ |
| 只允许更新 | 命中即必须更新 | |
| 只允许跳过 | 首发不提供批量更新已有课程 | |

**User's choice:** 更新或跳过
**Notes:** 用户要求预览台的逐行选择首发就保留这两个动作。

---

## 预览与应用

| Option | Description | Selected |
|--------|-------------|----------|
| 独立导入审核台 | 上传后进入单独 review surface | ✓ |
| 课程中心页内嵌预览 | 在 `/teacher/courses` 里直接预览 | |
| 上传后直接应用 | 省去 review 步骤 | |

**User's choice:** 独立导入审核台
**Notes:** 用户明确要求复用现有 schedule import 的独立审核台心智，不把首页改造成审核页。

| Option | Description | Selected |
|--------|-------------|----------|
| 按整批统一应用 | 先看完整批，再一次 apply | ✓ |
| 逐行勾选应用 | 每行独立决定是否写入 | |
| 自动应用所有可通过行 | 上传后默认写入通过行 | |

**User's choice:** 按整批统一应用
**Notes:** 用户认为课程导入的批量价值高于逐行提交的灵活性。

| Option | Description | Selected |
|--------|-------------|----------|
| 允许部分成功 | 问题行保留 failed/skipped，其余正常写入 | ✓ |
| 有一行问题就整批阻断 | 全批次必须全绿 | |
| 只允许重复行跳过 | 只对部分问题放宽 | |

**User's choice:** 允许部分成功
**Notes:** 用户明确接受 batch apply 后的部分成功结果，只要逐行原因清楚即可。

---

## 结果反馈

| Option | Description | Selected |
|--------|-------------|----------|
| 结果概览 + 行级结果页 | 同时保留统计和逐行原因 | ✓ |
| 只回课程中心 toast | 只做轻量反馈 | |
| 直接导出结果文件 | 以文件为主反馈方式 | |

**User's choice:** 结果概览 + 行级结果页
**Notes:** 用户要求产品内就能看清 created / updated / skipped / failed 及每行原因。

| Option | Description | Selected |
|--------|-------------|----------|
| 回课程中心 | 结果页后返回 `/teacher/courses` | ✓ |
| 留在结果页 | 停留在导入结果页面 | |
| 跳第一条课程详情 | 直接进入某个受影响课程 | |

**User's choice:** 回课程中心
**Notes:** 用户希望导入完成后继续回到课程运营主入口，而不是分散到局部详情。

---

## 冲突补充决策

| Option | Description | Selected |
|--------|-------------|----------|
| 完全命中记为 skipped | 已存在且无变化 | ✓ |
| 仍记为 updated | 命中即算更新 | |
| 回退并加可更新字段 | 调整模板以保住 updated | |

**User's choice:** 完全命中记为 skipped
**Notes:** 用户同意“无实际变更就不应伪装成 updated”。

| Option | Description | Selected |
|--------|-------------|----------|
| 加一列可更新字段 | 为 updated 提供真实变更载体 | ✓ |
| 改匹配键 | 让身份字段本身可更新 | |
| 接受无 updated 首发 | 首发只保留 created/skipped/failed | |

**User's choice:** 加一列可更新字段
**Notes:** 后续明确锁定该字段就是 `课程状态`。

| Option | Description | Selected |
|--------|-------------|----------|
| 可以，锁定课程状态 | 模板最终包含状态列 | ✓ |
| 不行，改成无 updated 首发 | 放弃 updated 语义 | |
| 不行，改匹配规则 | 调整命中逻辑 | |

**User's choice:** 可以，锁定课程状态
**Notes:** 这条决定解决了 Phase 15 首发 `updated` 结果与最小模板之间的矛盾。

---

## Claude's Discretion

- 审核台和结果页的具体 route 命名、结果视图布局、badge 文案细节可在 planning 阶段按课程域现有结构继续收敛。

## Deferred Ideas

- XLSX 首发支持。
- 模板内一并导入班级关联。
- 外部系统课程导入或同步。
- 批量覆盖课程标题、学科、年级等身份字段。
