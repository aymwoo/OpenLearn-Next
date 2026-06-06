---
phase: 70
slug: question-stats-post-class-recap
status: draft
shadcn_initialized: true
preset: radix-nova
created: 2026-06-03
---

# Phase 70 — UI Design Contract

> 面向 Phase 70 的 quiz sample 题目统计与课后复盘 UI 契约。目标是在现有 `/classroom` 复盘面内加入题目复盘 section，而不是另做 BI 页面。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | radix-nova |
| Component library | Radix primitives + 项目自定义 `ui/*` |
| Icon library | lucide |
| Font | Lexend |

---

## Scope Locks

- 本 phase 只覆盖 quiz sample plugin 的题目统计与课后复盘呈现。
- 入口仍在现有 `/classroom` 复盘页；不新增单独 route。
- 统计 section 只展示：题目、正确答案、正确率、选项分布、作答/未作答人数。
- 不展示班级趋势图、跨 session 对比、游戏化排行、自动讲评。

---

## Information Architecture

题目复盘 section 挂在现有 `ClassroomSessionRecapSurface` 内，位于 hero/workload 之后、student recap 之前或同级，不抢占“学生复盘”主路径。

### Section Structure

1. **Section header**
   - eyebrow：`题目复盘`
   - title：`看清这道题答得怎样，再决定该回看谁`
   - helper copy：`正确率按已作答人数计算；作答/未作答人数相对本次课堂参与者名单。`

2. **Question cards**
   - 每道题一张主卡
   - 卡内固定包含：题干、正确答案 badge、正确率、作答人数、未作答人数、4 个选项分布行

3. **Distribution rows**
   - 每个选项一行：字母 token、选项文案、人数、占比条
   - 正确答案行要被明确高亮，但不喧宾夺主

4. **Follow-up CTA**
   - 次按钮：`回到学生复盘`
   - 可选按钮：`查看班级趋势`

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Section eyebrow | 题目复盘 |
| Section title | 看清这道题答得怎样，再决定该回看谁 |
| Correct-rate label | 正确率 |
| Answered label | 已作答 |
| Unanswered label | 未作答 |
| Correct answer badge | 正确答案 |
| Empty heading | 这节课还没有单选题统计 |
| Empty body | 当前课堂没有 quiz sample 题目，或还没有可用于复盘的作答记录。 |
| Helper copy | 正确率按已作答人数计算；作答/未作答人数相对本次课堂参与者名单。 |

---

## Visual Contract

- 整个题目复盘 section 继续使用 `surface-container-low` / `surface-container-lowest` 的 tonal layering；禁止 1px divider。
- 每道题卡是白色或浅 tonal 主卡，圆角与现有 recap cards 一致。
- 正确率用大号数字 + 轻说明文案，不做夸张仪表盘。
- 选项分布用横向进度条或 tonal fill 条，条体圆角，不使用表格线或柱状图栅格。
- 正确答案行用轻 primary/tertiary tonal 高亮；错误选项不用危险红大面积填充，避免过度惩罚感。
- CTA 继续遵守 `DESIGN.md`：Primary CTA 渐变，Secondary CTA 无边框 tonal button。

---

## State Contract

| State | UI Behavior |
|------|-------------|
| 有题且有统计 | 展示 question cards + distribution rows + denominator helper copy |
| 有题但 0 人作答 | 仍展示 question cards；正确率显示 `--` 或 `0%` 的明确空态，并标明 `0/本次参与者` |
| 无 quiz sample 题 | 展示 section empty state，不影响其他 recap sections |

补充规则：
- 正确率必须与作答/未作答口径说明同时出现，避免教师误读。
- 未作答人数必须可见，不能只给一个 submissionCount。
- 不在本 phase 展示“公布答案正确与否到学生端”的任何 UI。

---

## Acceptance Criteria

- [ ] 题目复盘 section 在现有 `/classroom` recap surface 内呈现，不新增页面。
- [ ] 每题都能展示题干、正确答案、正确率、作答/未作答人数、选项分布。
- [ ] 明确标注“正确率按已作答人数计算；作答/未作答相对课堂参与者名单”。
- [ ] 全界面继续遵守 Lexend、无 1px divider、tonal depth、glass/gradient CTA。
- [ ] 视觉上像教育产品复盘面，而不是通用 BI 仪表盘。

---

## Sources

| Source | Decisions Used |
|--------|----------------|
| `DESIGN.md` | Lexend、no-line、tonal depth、glass/gradient CTA |
| `src/components/classroom/classroom-session-recap-surface.tsx` | 现有复盘壳层与 section rhythm |
| `.planning/REQUIREMENTS.md` | STATS-01 / STATS-02 |
| `.planning/ROADMAP.md` | Phase 70 goal and success criteria |
| `.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-UI-SPEC.md` | 与 quiz sample 既有视觉语言保持连续性 |
