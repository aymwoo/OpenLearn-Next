---
phase: 22
slug: teacher-orchestration-workspace-and-launch-preparation
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-13
---

# Phase 22 — UI Design Contract

> 面向 Phase 22 的 launch-preparation / orchestration workspace UI 合同。目标不是
> 新建第二套后台工具页，而是在现有 teacher shell 中，把 `/teacher/editor` 与
> `/teacher/launch` 升级成可真实支撑开课前准备的单主舞台工作流。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | custom UI primitives + Radix patterns |
| Icon library | lucide-react |
| Font | Lexend |

来源：`DESIGN.md`、`src/components/surfaces/classroom-launch-surface.tsx`、
`src/components/classroom/classroom-launch-preview.tsx`、
`src/components/surfaces/lesson-editor-surface.tsx`、
`src/components/surfaces/teacher-lesson-preview-surface.tsx`。

---

## Source Decisions Used

| Source | Decisions translated into UI contract |
|--------|---------------------------------------|
| `22-CONTEXT.md` | `/teacher/launch` 三段工作台、run sheet 为主舞台、整班 launch、只读准备摘要、少量硬阻断 + 明确提醒、继续沿用 teacher shell 语言 |
| `22-RESEARCH.md` | orchestration summary 先加在现有 editor/launch DTO 与 surface 上，不新建 second system |
| `ROADMAP.md` | 本阶段覆盖 editor preparation summary、launch workspace、regression/verifier |
| `REQUIREMENTS.md` | 对齐 ORCH-02 / ORCH-03，先解决开课前准备与 readiness，而不是 runtime 控课 |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | badge 内小间距、icon 与文字贴合 |
| sm | 8px | 标签组、状态行、简短 meta cluster |
| md | 16px | 默认内容间距、card 内正文块 |
| lg | 24px | section 内部留白、主次信息分组 |
| xl | 32px | 主舞台与侧栏分隔、page section 间距 |
| 2xl | 48px | hero 与 orchestration workspace 主体之间 |
| 3xl | 64px | 大块主次区之间呼吸感 |

规则：`/teacher/launch` 是高频工作页，信息密度可以高于 marketing hero，但仍需
保持单主舞台 + tonal section，不得退回到 utilitarian admin grid。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.6 |
| Label | 14px | 600 | 1.4 |
| Heading | 24px | 600 | 1.2 |
| Display | 40px | 600 | 1.1 |

规则：

1. run sheet 卡片标题与步骤名称使用 Heading 或 strong body，不做后台表格小字。
2. readiness 标签、roster 摘要、材料/采证提醒使用 Label/Body 组合。
3. 中文保持简洁、教师工作流语气，不使用 marketing slogan。

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #f5f7f9 | page floor、主背景、tonal shell |
| Secondary (30%) | #eef1f3 | secondary cards、run sheet inset、readiness panels |
| Accent (10%) | #0050d4 / #7b9cff | 主 CTA、当前主舞台强调、选中态 |
| Attention | #8a6200 / #fff4cc | `需关注`、`待完善`、默认推断说明 |
| Destructive | #b31b25 / #fff1f2 | 真正 launch blocker、危险/不可执行状态 |

规则：

1. `需关注` 和 `建议完善` 不能抢占 destructive 红。
2. destructive 只用于根本无法开课的阻断项。
3. 继续遵守无 1px divider、以 tonal layer 分层的现有视觉语言。

---

## Launch Workspace Contract

### Overall structure

`/teacher/launch` 固定采用三段工作台：

1. **主舞台：class-facing run sheet**
2. **次级左/下区：launch controls + class summary**
3. **次级右栏：readiness panel + live session recovery**

要求：

1. run sheet 必须是视觉主角，不是下方附属 preview。
2. live session recovery 保持次级，不得与新开课堂并列成双主任务。
3. 不使用 wizard/stepper，把教师带入线性后台流程。

### Run sheet requirements

run sheet 必须以节奏卡片流呈现，并且每张步骤卡正式包含：

1. 步骤顺序与名称
2. 活动意图 / 活动方式或 family 摘要
3. 预计时长
4. 材料提示
5. 采证提醒 / evidence summary
6. `默认推断` / `待完善` 状态（如果存在）

禁止：

1. 退回成纯文本说明段落。
2. 改成重表格或 gantt/timeline 管理页。
3. 在该区域加入 session-specific 编辑控件。

### Roster summary requirements

Phase 22 的名册只做摘要，不做操作。

页面应展示：

1. 班级名称
2. 学生总数
3. 简短 roster note / 异常提示（如存在）

页面不得展示：

1. 排除某个学生
2. 小组/子集 launch
3. 多班联合 launch
4. 临时编辑名册

### Readiness panel requirements

readiness 面板必须使用三层结构：

1. `阻断项`：当前不可开课
2. `需关注`：不会阻止开课，但应在开课前看一眼
3. `建议完善`：面向质量提升的软提醒

硬阻断仅允许覆盖：

1. 没有可启动班级
2. 没有已发布课时

教学设计 fallback、材料不充分、evidence expectation 待完善等只进入
`需关注` 或 `建议完善`，不得默认进入阻断项。

---

## Editor Preparation Summary Contract

`/teacher/editor` 继续是课程内课时编辑页，不新增第二个 orchestration route。

本阶段 editor 侧只允许新增：

1. preparation summary / readiness summary
2. 指向 `/teacher/launch` 的更清晰 orchestration cue
3. 与 launch workspace 对齐的简短 materials / evidence / readiness 摘要

不允许：

1. 把 editor 变成另一套 launch surface
2. 在 editor 内直接创建 classroom session
3. 引入不经过 published snapshot 的 launch path

---

## Interaction Contract

### Primary CTA behavior

主 CTA 继续是“开启新课堂”或等价中文文案，语义不变：

- 前置是选择已发布课时 + 班级
- 成功后跳转 `/classroom?sessionId=...`

### Readiness feedback behavior

1. launch CTA 被阻断时，原因必须贴近 readiness 面板与主操作区可见。
2. `默认推断`、`待完善` 不会自动禁用主 CTA。
3. 选择课时后，run sheet 和 readiness 需同步刷新，保持 read-your-selection 感受。

### Copy rules

1. 文案应强调“开课前准备”“课堂节奏”“材料提示”“采证提醒”。
2. 不用系统管理或发布审计口吻压过教师工作流语气。
3. 若引用技术边界，必须是教师可理解文案，如“按已发布版本启动”。

---

## Route and Shell Boundaries

1. `/teacher/editor` 继续依赖显式 `courseId + lessonId`。
2. `/teacher/launch` 继续走现有 teacher shell route metadata，不新增独立壳层。
3. `/teacher/launch` 只消费服务端 DTO，不在 client 侧拼装 lesson readiness truth。
4. launch preview / run sheet 必须继续只读 published snapshot。

---

## Visual Guardrails

1. 不新增第二个 hero 与主舞台竞争注意力。
2. 不把 launch workspace 做成 admin checklist dashboard。
3. 不让 readiness 面板视觉上压过 run sheet 主舞台。
4. 不新增 docs-like side rail 或 heavy table border。
5. 不把“默认推断”渲染成错误态；它是教师提示，不是假故障。

---

## Regression Contract

Phase 22 的计划与实现至少要验证：

1. `/teacher/editor` 仍保持 `courseId + lessonId` teacher-owned 入口。
2. `/teacher/launch` 仍从 published version / snapshot 启动 classroom。
3. launch surface 中 run sheet 是主视觉区，live recovery 保持次级区。
4. readiness 分成 `阻断项 / 需关注 / 建议完善`，且默认推断不阻断开课。
5. 名册只做整班摘要，不出现排除学生或 subgroup controls。
6. `verify:phase22` 能在 route boundary、published-snapshot wording、关键测试回归失败时直接报错。

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visual hierarchy: PASS
- [ ] Dimension 3 Launch workflow clarity: PASS
- [ ] Dimension 4 Readiness grading: PASS
- [ ] Dimension 5 Route boundary safety: PASS
- [ ] Dimension 6 Registry safety: PASS

**Approval:** pending
