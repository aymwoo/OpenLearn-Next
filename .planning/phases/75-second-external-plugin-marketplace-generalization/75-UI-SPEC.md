---
phase: 75
slug: second-external-plugin-marketplace-generalization
status: approved
shadcn_initialized: true
preset: radix-nova
created: 2026-06-10
---

# Phase 75 — UI Design Contract

> Visual and interaction contract for homework plugin + marketplace generalization.
> Generated from existing DESIGN.md, CONTEXT.md, RESEARCH.md, and codebase patterns.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (radix-nova) |
| Preset | radix-nova — `mist` base, CSS variables, Lucide icons |
| Component library | Radix (via shadcn) |
| Icon library | Lucide |
| Font | Lexend |

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-text gaps, inline chips padding |
| sm | 8px | Compact element spacing, badge padding |
| md | 16px | Default element spacing, card padding |
| lg | 24px | Section padding, form field gaps |
| xl | 32px | Layout gaps, major content breaks |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: 
- Touch targets (buttons, tab triggers): min-height 44px for accessibility
- Classroom tab list: `gap-2` (8px) between triggers

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 1rem (16px) | 400 (regular) | 1.5 |
| Label | 0.875rem (14px) | 400 (regular) | 1.4 |
| Heading (card title) | 1.25rem (20px) | 600 (semibold) | 1.3 |
| Display (page title) | 1.5rem (24px) | 600 (semibold) | 1.2 |

All text uses Lexend font family. Color: `on-surface` (#2c2f31) for primary content, `on-surface-variant` (#595c5e) for secondary/label text.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `surface` (#f5f7f9) | App background, page base |
| Secondary (30%) | `surface-container-low` (#eef1f3) / `surface-container-lowest` (#ffffff) | Cards, sidebar, tabs, panels |
| Accent (10%) | `primary` (#0050d4) → `primary-container` (#7b9cff) at 135° | Primary CTAs only (submit, save, publish) |
| Destructive | `error` (#b31b25) / `error-container` (#fbe7e8) | Delete/uninstall confirmations only |

Accent reserved for: 
- Primary submit/save buttons (gradient fill)
- Active tab indicator
- Focus rings (2px ghost-border on inputs)
- NOT for: badges, icons, decorative elements, secondary buttons

---

## Copywriting Contract

### Homework Plugin — Authoring (Teacher)

| Element | Copy |
|---------|------|
| Step type label | "作业" |
| Step type badge | "课堂作业" |
| Title field placeholder | "输入作业标题" |
| Description field placeholder | "描述作业要求…" |
| Attachment field label | "附件链接（可选）" |
| Save CTA | "保存作业" |
| Empty state (no homework steps) | "尚未添加作业步骤" / "从步骤建议中添加一个作业步骤开始" |
| Error state (save failed) | "保存未能完成" / "请检查网络连接后重试，你的编辑内容已保留在本地" |

### Homework Plugin — Student Player

| Element | Copy |
|---------|------|
| Submission card badge | "课堂作业" |
| Description label | "作业要求" |
| Answer textarea placeholder | "输入你的答案…" |
| Attachment link placeholder | "附件链接（可选）" |
| Submit CTA | "提交作业" |
| Resubmit CTA | "更新提交" |
| Status — submitted | "已提交 · 等待批改" |
| Status — graded | "已批改 · 得分：{score}" |
| Status — not started | "尚未提交" |
| Empty state (no submission yet) | "你还没有提交作业" / "阅读作业要求后在下方提交你的答案" |
| Error state (submit failed) | "提交暂时失败" / "请保留你的答案后重试" |

### Homework Plugin — Grading (Teacher, Classroom Tab)

| Element | Copy |
|---------|------|
| Tab label | "作业提交" |
| Empty state (no submissions) | "暂无学生提交" / "学生提交后将在此处显示" |
| Student list item | "{studentName} · {submissionTime} · {status}" |
| Grade input label | "分数" |
| Comment textarea placeholder | "添加评语…" |
| Save grade CTA | "保存批改" |
| Auto-score badge | "系统建议：{score}分" |
| Destructive action | 无 destructive action（批改可覆盖） |

### Classroom Control Panel Tabs

| Element | Copy |
|---------|------|
| Tab: Control | "主控" |
| Tab: Live Answer | "作答实时" |
| Tab: Homework Submissions (NEW) | "作业提交" |

---

## Component Inventory

### New Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `HomeworkAssignmentCard` | `src/components/learning/homework-assignment-card.tsx` | 学生端：显示作业描述 + 提交表单 |
| `HomeworkSubmissionList` | `src/components/classroom/homework-submission-list.tsx` | 教师端 classroom tab：提交列表 |
| `HomeworkGradingPanel` | `src/components/classroom/homework-grading-panel.tsx` | 教师端：批改面板（分数 + 评语） |

### Existing Components to Extend

| Component | Change |
|-----------|--------|
| `lesson-step-editor.tsx` | 新增 homework 步骤编辑区（title + description + attachmentUrl） |
| `classroom-control-panel.tsx` | TabsList 新增 "作业提交" TabTrigger + TabsContent |
| `classroom-runtime-client.tsx` | CurrentStepRenderer 新增 homework 分支 |

### Existing Components to Reuse (No Change)

| Component | Usage |
|-----------|-------|
| `Badge` | 步骤类型标签（"课堂作业"、"已批改"） |
| `Button` | 提交/保存按钮（primary gradient） |
| `Card` | 作业描述卡片、批改面板容器 |
| `Tabs / TabsList / TabsTrigger / TabsContent` | classroom 控制面板 tab 切换 |
| `Skeleton` | 加载态占位 |
| `MarkdownRenderer` | 作业描述富文本渲染 |

---

## Interaction Patterns

### 1. Homework Step Editor (Authoring)

```
┌──────────────────────────────────────────┐
│  [Badge: 课堂作业]                        │
│  ┌──────────────────────────────────────┐│
│  │ 作业标题 (text input)                 ││
│  ├──────────────────────────────────────┤│
│  │ 作业描述 (textarea / markdown)        ││
│  │                                      ││
│  ├──────────────────────────────────────┤│
│  │ 附件链接 (text input, optional)       ││
│  └──────────────────────────────────────┘│
│  [保存作业] (primary gradient CTA)        │
└──────────────────────────────────────────┘
```
- Step type selector 中新增 "作业" 选项
- 保存时调用 lesson step 更新逻辑
- 遵循现有的 LexoRank 排序

### 2. Student Homework Submission (Player)

```
┌──────────────────────────────────────────┐
│  [Badge: 课堂作业]                        │
│  ## 作业标题                              │
│  作业要求正文...                           │
│  [附件链接] (if present)                  │
│  ─────────────────────────────────────── │
│  你的答案                                 │
│  ┌──────────────────────────────────────┐│
│  │ (textarea, min-h-[120px])            ││
│  └──────────────────────────────────────┘│
│  附件链接（可选）                          │
│  ┌──────────────────────────────────────┐│
│  │ (text input)                         ││
│  └──────────────────────────────────────┘│
│  [提交作业] (primary gradient CTA)        │
│  已提交 · 等待批改                         │
└──────────────────────────────────────────┘
```
- 支持多次提交（resubmit），历史保留
- 提交后显示状态："已提交 · 等待批改"
- 批改完成后显示分数和评语

### 3. Teacher Grading (Classroom Tab)

```
Tabs: [主控] [作答实时] [作业提交]  ← NEW TAB
       ─────────────────────────────────
       ┌─────────────┬──────────────────┐
       │ 学生列表     │ 批改面板          │
       │             │                  │
       │ 张三        │ 作业标题          │
       │ 5分钟前     │ 学生答案...       │
       │ 待批改  →   │                  │
       │             │ 系统建议: 85分    │
       │ 李四        │ 分数: [__]        │
       │ 12分钟前    │ 评语: [________]  │
       │ 已批改 85   │                  │
       │             │ [保存批改]        │
       └─────────────┴──────────────────┘
```
- 左侧：学生提交列表（student name, submit time, status badge）
- 右侧：选中学生的批改详情（答案内容、分数输入、评语输入）
- 点击学生 → 右侧面板切换
- 新 tab 与 "作答实时" tab 样式一致

### 4. Tab Pattern (classroom-control-panel.tsx)

Existing tabs: `"control"` | `"live-answer"`
New: `"control"` | `"live-answer"` | `"homework-submissions"`

Tab trigger 样式（与现有一致）:
- `rounded-[1.1rem]` 
- Active: `bg-surface-container-lowest text-on-surface shadow-ambient`
- Inactive: `text-on-surface-variant hover:bg-surface-container-low`

---

## States

### Homework Step Card (Student)
- **Loading**: Skeleton placeholders for title + description + form
- **Not submitted**: 空白输入区 + "提交作业" CTA enabled
- **Submitting**: CTA 显示 "正在提交..." + disabled
- **Submitted**: 答案内容保留在 textarea（disabled），状态显示 "已提交 · 等待批改"，"更新提交" CTA enabled
- **Graded**: 分数 + 评语显示在卡片底部，答案内容保留
- **Error**: Toast/内联错误 "提交暂时失败 — 请保留你的答案后重试"
- **Empty**: "你还没有提交作业" + 指引文案

### Homework Grading Tab (Teacher)
- **Loading**: Skeleton list items
- **Empty**: "暂无学生提交" + 指引文案
- **With submissions**: 学生列表，点击切换
- **Grading**: 选中学生 → 显示详情 + 评分表单
- **Saving grade**: "正在保存..." + button disabled
- **Grade saved**: 列表 badge 更新为分数

### Classroom Tab
- **Active tab**: URL query param `?tab=homework-submissions`
- **Inactive**: tab 保持挂载但不可见（与现有 behavior 一致）

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | badge, button, card, tabs, skeleton, toast | not required |
| Third-party | none | not applicable |

---

## Design Compliance Checklist

- [x] No 1px solid borders for sectioning — tonal surface layering only
- [x] Primary CTAs use gradient fill (`primary` → `primary_container`) at 135°
- [x] Floating elements use glassmorphism with `backdrop-blur` (if applicable)
- [x] Lexend font exclusively for all text
- [x] `cn()` for all class composition
- [x] 8-point spacing scale (4, 8, 16, 24, 32, 48, 64)
- [x] Cards use `surface-container-lowest` (#ffffff) background
- [x] Surface hierarchy: `surface` → `surface-container-low` → `surface-container-lowest`
- [x] Touch targets minimum 44px

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — 所有 CTA 使用具体动词+名词，空状态/错误状态完整
- [x] Dimension 2 Visuals: PASS — 组件清单、交互模式、ASCII 线框图完整
- [x] Dimension 3 Color: PASS — 60/30/10 分割明确，accent reserved-for 列表具体
- [x] Dimension 4 Typography: PASS — 4 级字号（14/16/20/24），2 种字重（400/600），line-height 完整
- [x] Dimension 5 Spacing: PASS — 全部为 4 的倍数，用途文档化
- [x] Dimension 6 Registry Safety: PASS — 仅 shadcn official，无第三方注册表

**Approval:** 2026-06-10
