---
phase: 34
slug: course-membership-management-loop
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-17
reviewed_at: 2026-05-17T00:00:00Z
---

# Phase 34 — UI Design Contract

> 面向 Phase 34 的课程成员管理 UI 合同。目标是在不新建独立 roster 页面、
> 不绕开既有课程详情工作流的前提下，把 `COURSE-07` 收口为同页可理解、
> 可安全操作、可立即反馈的 course membership loop。

---

## Design system

| Property | Value |
|---|---|
| Component library | existing repo surfaces + local UI primitives |
| Icon library | `lucide-react` |
| Font | Lexend |
| Visual language | tonal course-management surfaces, no-line layering, restrained gradient CTA |

来源：`DESIGN.md`、`src/components/surfaces/teacher-course-detail-surface.tsx`、
`src/components/courses/course-detail-form.tsx`、`src/components/surfaces/teacher-course-center-surface.tsx`。

---

## Source decisions used

| Source | Decisions translated into UI contract |
|---|---|
| `ROADMAP.md` | Phase 34 必须补完 `COURSE-07`，且保持在 existing course detail experience 内完成 |
| `REQUIREMENTS.md` | 课程成员管理必须属于 course management workflow，不是独立花名册子系统 |
| `STATE.md` | 成员管理必须建立在 Phase 33 已完成的 auth or DAL or DTO baseline 之上 |
| `14-02-PLAN.md` | Phase 14 明确只做班级关联，不触及 enrollment；Phase 34 需要在同一详情页心智内补齐该缺口 |
| current course detail surface | 已有课程 hero、详情编辑区、班级关联区、删除阻断区，说明成员管理应作为同页新增 section，而不是新 route |

---

## Route and surface contract

Phase 34 不新增一级 route。成员管理固定作为
`/teacher/courses/[courseId]` 课程详情页中的独立 section，位于：

1. 基础信息编辑区之后
2. 班级关联管理区同一侧或相邻位置
3. 删除危险操作区之前

原因：

1. 教师在一个上下文里同时看到课程信息、班级关联、学生成员与删除资格
2. `课程成员记录会阻断删除` 这一关系需要在同页被解释清楚
3. 保持“课程详情页就是 course management 主工作台”的既有心智

禁止：

1. 新增独立 `/teacher/courses/[courseId]/members` 作为主用户流
2. 跳转到 `/teacher/classes` 再回推课程成员变更
3. 在课程详情页只显示人数，不给明确查看或维护入口

---

## Membership section structure

课程成员 section 固定拆成四层：

1. **Section header**
2. **Current members list**
3. **Eligible students add panel**
4. **Action feedback region**

### 1. Section header

必须显示：

1. 标题：`课程成员管理` 或等价短句
2. 简短说明：强调这里只维护“属于这门课程的学生”，不等于修改班级花名册
3. 当前摘要：已关联人数、可添加人数或当前筛选结果数

推荐说明文案：

- `在课程详情页内维护这门课程的学生范围，不会改动班级原始名册。`

### 2. Current members list

当前成员使用 tonal chip list 或 compact member cards，不用后台表格作为主视图。

每个成员项必须至少显示：

1. 学生姓名
2. 学号或另一个稳定识别字段
3. 所属班级摘要
4. 次级动作 `移出课程`

如果学生有多班级歧义或来自不同可见 class context，允许附带轻量 meta，
但不能挤成 dense admin table。

### 3. Eligible students add panel

可添加学生区固定服务于“从 teacher and school scoped eligible pool 中挑人加入课程”。

允许的交互形态：

1. searchable picker
2. combobox + candidate list
3. 轻量搜索后结果卡片列表

要求：

1. 默认先展示 calm empty or guidance，不一次性倾倒全校名单
2. 搜索结果只返回当前 teacher 可操作、且不在该课程中的学生
3. 同校但不在教师作用域内的 foreign roster 不得出现
4. 已在课程中的学生不得再次显示为可添加候选，或必须呈现已在课程中的禁用态

### 4. Action feedback region

成员 add 或 remove 后，必须在 section 内保留页内反馈，而不是只弹 toast。

反馈区位置固定在 membership section 内顶部或成员列表上方，且支持：

1. 添加成功
2. 移除成功
3. 重复添加被拒绝
4. 作用域不足或候选已失效
5. 无可添加学生

---

## Membership read-model contract

UI 只消费经过 DTO 清洗的两类视图：

1. `current members`
2. `eligible students`

UI 合同要求这些 DTO 至少提供：

| DTO slice | Required fields | Notes |
|---|---|---|
| current member | `studentId`, `studentName`, `studentNumber or stable label`, `classLabels`, `enrollmentStatus` | 状态默认围绕 active enrollment 语义，不能让 UI 猜数据库字段 |
| eligible student | `studentId`, `studentName`, `studentNumber or stable label`, `classLabels`, `isAlreadyEnrolled` | 已关联学生要么不返回，要么明确禁用 |
| section summary | `memberCount`, `eligibleCount`, `lastMutationResult?` | 供同页摘要与 read-your-writes 反馈使用 |

禁止 UI 直接依赖：

1. raw user row
2. membership internals
3. course enrollment raw timestamps 作为主要用户文案
4. 通过客户端拼接“谁属于哪个班级 or 学校”

---

## Interaction contract

### Add member

教师添加课程成员时：

1. 先通过搜索 or 选择命中候选学生
2. 点击主动作 `加入课程`
3. 成功后该学生立即从候选区移除，并进入当前成员区
4. 顶部反馈区显示成功文案
5. 课程详情 hero 或 metric 中的 `学生数` 同步更新

推荐成功文案：

- `已将 {学生名} 加入当前课程。`

### Remove member

教师移除课程成员时：

1. 操作入口保留在成员项内，不跳转二级确认页
2. 若需要确认，只能使用轻量 inline confirm 或 modal，不得进入新 route
3. 成功后该成员从当前成员区移除，并回到可添加候选池或从搜索结果可再次命中
4. 删除阻断说明随之变化

推荐成功文案：

- `已将 {学生名} 移出当前课程。`

### Duplicate and stale guard

当教师重复添加、候选过期或作用域已变化时：

1. 在当前 section 内显示明确失败原因
2. 不清空教师刚刚的搜索上下文
3. 提供下一步提示，而不是只返回通用错误

推荐失败文案：

- `该学生已经在当前课程中，无需重复添加。`
- `当前候选已失效，请重新搜索可添加学生。`
- `你当前无法管理这名学生的课程关联。`

---

## Empty and boundary states

### No members yet

当课程还没有任何成员时：

1. 当前成员区显示 calm empty state
2. 继续保留添加入口
3. 文案要强调“这不会修改班级名册，只是定义课程参与范围”

推荐文案：

- 标题：`这门课程还没有学生成员`
- 正文：`先从可管理的学生范围中添加成员，之后课堂启动和课程删除校验都会基于这里的课程成员记录。`

### No eligible students

当不存在更多可添加学生时：

1. 说明当前课程已覆盖全部可操作学生，或当前筛选无结果
2. 不把这类状态渲染成 error

推荐文案：

- `当前没有更多可添加的学生，或该课程已覆盖你可管理的学生范围。`

### Search empty

当搜索没有命中时：

1. 说明未找到符合条件的学生
2. 引导教师调整关键词或先检查班级关联范围

推荐文案：

- `未找到符合条件的学生，请调整关键词，或先确认这门课程已关联正确班级。`

### Scope-protected state

如果服务端因为 school or teacher scope 拒绝返回候选或拒绝写入：

1. UI 显示温和但明确的阻断文案
2. 不暴露内部权限实现细节

推荐文案：

- `当前课程成员范围已变化，请刷新后重试。`

---

## Delete eligibility coupling

课程删除区必须与成员管理形成明确联动。

要求：

1. 如果课程仍有成员记录，删除阻断区继续显示这一原因
2. 在阻断文案附近可读出“请先在课程成员管理中清理学生关联”
3. 当最后一名学生被移出后，删除资格可即时更新

推荐补充文案：

- `当前课程仍有学生成员，请先在上方课程成员管理区清理关联。`

---

## Visual hierarchy and layout

成员管理区应延续课程详情页的双栏结构和 tonal card 节奏：

1. section 外层使用 `surface-container-low`
2. 当前成员区与可添加候选区使用 `cardInset` 或同级 tonal inset
3. 当前成员列表优先使用 wrap chips 或 compact cards，而非线框表格
4. 搜索框、下拉和选择器继续复用 ghost field contract

桌面端建议：

1. 左侧为当前成员
2. 右侧为搜索和添加面板

移动端建议：

1. 上下堆叠
2. 先显示当前成员，再显示添加入口

---

## Spacing and sizing

| Token | Value | Usage |
|---|---|---|
| sm | 8px | member meta、chip gap、inline actions |
| md | 16px | form controls、feedback block、member item spacing |
| lg | 24px | section internal grouping |
| xl | 32px | membership section 与相邻课程区块的分隔 |

规则：

1. 成员项操作按钮最小高度 40px，主添加按钮最小高度 44px
2. 搜索输入与候选列表之间保留至少 `md` 间距
3. 空态、反馈态、成员态使用同一 inset 容器尺寸语言

---

## Typography

| Role | Size | Weight | Usage |
|---|---|---|---|
| Section title | 24-28px | 600 | `课程成员管理` 主标题 |
| Member name | 16px | 600 | 成员主信息 |
| Body | 14-16px | 400 | 说明文案、反馈正文 |
| Label | 12-14px | 600 | 成员状态、所属班级、计数标签 |

规则：

1. 成员姓名始终强于班级和学号摘要
2. 不使用后台 admin table 常见的 dense 12px 主正文
3. 成功或阻断反馈标题要短句、直接、中文优先

---

## Color

| Role | Value | Usage |
|---|---|---|
| Dominant | existing `surface` / `surface-container-lowest` family | page floor and neutral cards |
| Secondary | existing `surface-container-low` family | membership section、候选面板、empty state |
| Accent | existing primary tokens / gradient CTA | `加入课程` 主动作、当前搜索命中态 |
| Success | semantic green already used in repo | add or remove success feedback |
| Warning | semantic amber | stale candidate、scope changed、需要刷新 |
| Destructive | semantic red | `移出课程` 确认态、真正失败反馈 |

规则：

1. 不把所有成员动作都染成 destructive red
2. `移出课程` 可以是次级或风险色，但不能抢过整页主 CTA
3. 颜色服务于课程管理产品语言，不切到纯后台运维风格

---

## Copywriting contract

| Element | Copy |
|---|---|
| Section title | 课程成员管理 |
| Primary CTA | 加入课程 |
| Search placeholder | 搜索学生姓名或学号 |
| Empty state heading | 这门课程还没有学生成员 |
| Empty state body | 先从可管理的学生范围中添加成员，课程删除校验和后续课堂参与范围都会基于这里的成员记录。 |
| Duplicate feedback | 该学生已经在当前课程中，无需重复添加。 |
| Scope warning | 当前课程成员范围已变化，请刷新后重试。 |
| Remove confirmation | 移出课程：确认将该学生移出当前课程？这不会删除学生账号或班级名册。 |

补充规则：

1. 始终说“课程成员”或“加入课程”，不用数据库术语 `enrollment record`
2. 始终解释“不会修改班级名册”，避免教师误解 blast radius
3. 错误文案优先给下一步动作，例如刷新、重试、重新搜索

---

## Visual guardrails

1. 不新建独立成员管理 route 作为主流程
2. 不把当前成员做成重边框后台表格
3. 不一次性暴露全校学生长列表作为默认界面
4. 不把重复添加或作用域失败退化成无文案静默失败
5. 不让删除阻断区继续只说“有课程成员记录”而不给教师可操作入口
6. 继续遵守 no-line rule，不新增 1px divider lines

---

## Checker sign-off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-17
