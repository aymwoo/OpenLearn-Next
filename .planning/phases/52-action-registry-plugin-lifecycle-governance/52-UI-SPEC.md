---
phase: 52
slug: action-registry-plugin-lifecycle-governance
status: draft
shadcn_initialized: true
preset: b1l00bw
created: 2026-05-21
---

# Phase 52 — UI Design Contract

> 面向 Action Registry 与 Plugin Lifecycle Governance 的视觉与交互合同。
> 生成依据：`52-CONTEXT.md`、`ROADMAP.md`、`REQUIREMENTS.md`、
> `components.json`、`DESIGN.md` 与现有 operator surfaces。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn（source: `components.json` + `npx shadcn info`, 2026-05-21） |
| Preset | `b1l00bw` / `radix-nova` / `mist`（source: `npx shadcn info`, 2026-05-21） |
| Component library | Radix primitives via shadcn（source: `components.json`，项目当前已安装 `badge` / `button` / `card`） |
| Icon library | `lucide`（source: `components.json`） |
| Font | Lexend（source: `DESIGN.md` + `src/app/globals.css`；覆盖 shadcn preset 默认 geist） |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | reason code 内边距微调、icon 与文案极小间距（source: `src/app/globals.css`） |
| sm | 8px | metadata badge 间距、inline action 组间距（source: `src/app/globals.css`） |
| md | 16px | 默认卡片内边距、正文区块间距（source: `src/app/globals.css`） |
| lg | 24px | section padding、治理摘要块间距（source: `src/app/globals.css`） |
| xl | 32px | 主内容栈间距、双栏布局 gap（source: `src/app/globals.css`） |
| 2xl | 48px | catalog 与 diagnostic view 的主分段间距（source: `src/app/globals.css`） |
| 3xl | 64px | 页面级顶部/底部留白（source: `src/app/globals.css`） |

Exceptions: 交互控件最小触达高度统一 44px（default，治理型按钮与确认动作优先可点击性）；桌面卡片可保留 40px 视觉高度，但命中区必须补足到 44px。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px（default，匹配 `DESIGN.md` Body lg） | 400 | 1.5 |
| Label | 14px（source: 现有 surface `text-sm` 模式） | 600 | 1.4 |
| Heading | 20px（default，用于插件卡片标题与分区标题） | 600 | 1.2 |
| Display | 28px（default，用于 governance 页面主标题） | 600 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f5f7f9`（source: `src/app/globals.css`） | 页面背景、治理工作台底板 |
| Secondary (30%) | `#eef1f3`（source: `src/app/globals.css` + `DESIGN.md`） | section shell、diagnostic rail、filter/nav 容器；嵌套重点卡片可上浮到白色 |
| Accent (10%) | `#0050d4`（source: `src/app/globals.css`） | 主 CTA、active 状态强调、选中 tab、focus ring；主 CTA 允许渐变到 `#7b9cff` |
| Destructive | `#b31b25`（source: `src/app/globals.css`） | suspend、uninstall、cleanup 这类破坏性动作 |

Accent reserved for: `查看治理诊断` 入口、`active` 生命周期徽标、主 catalog 当前选中项、明确可继续的恢复动作、焦点态。禁止把 accent 用在全部 badge、普通 metadata、次级按钮或分隔用途。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 查看治理诊断（source: `D-52-01` ~ `D-52-03`，用于进入 operator-only blocked diagnostics） |
| Empty state heading | 还没有可治理的插件 |
| Empty state body | 完成插件注册或默认插件 reconcile 后，这里会显示可执行 actions、生命周期状态与阻塞原因。下一步先安装插件，或运行默认插件同步。（body 基于现有 empty state 文案收敛） |
| Error state | 暂时无法读取治理诊断。先刷新页面；如果问题仍存在，请记录 `pluginKey`、`commandId` 或 `reason code` 后重试恢复动作。 |
| Destructive confirmation | `紧急挂起`：无需二次 modal，按钮即刻执行，但必须紧邻“保留数据与历史记录”说明。<br>`停用插件`：无需 destructive modal，使用次级按钮 + inline 解释“停用 ≠ 卸载”。<br>`卸载插件（retain）`：必须先完成 preflight，再在确认弹窗中显示插件名、影响总数、retain posture。<br>`卸载并清理数据`：必须在 preflight 中列出数据类别/资源影响，并通过显式勾选确认后才可继续。 |

---

## Interaction Contract

### Information architecture

1. 默认主视图只显示 **当前可执行的 action catalog**；不得混入 blocked actions（source: `D-52-01`、`D-52-04`）。
2. blocked actions 必须放在单独的 **operator/governance diagnostic view**；不得作为普通调用方默认列表的一部分（source: `D-52-02`、`D-52-03`）。
3. 主视图与诊断视图至少使用 **明确 tab 或 segmented control** 区分，默认落在“可执行 actions”，次级入口为“治理诊断”。
4. 诊断卡片必须同时显示：`action key`、owner/plugin、外部 lifecycle state、stable `reason code`、推荐恢复动作。

### Lifecycle presentation

| External state | Badge label | Visual tone | Primary row action |
|----------------|-------------|-------------|--------------------|
| installed | 已安装 | 中性 tonal badge | 启用插件 |
| enabled | 已启用 | 中性偏强调 | 激活中不可直接当作 active；显示治理允许但未必可执行 |
| active | 运行中 | accent badge | 紧急挂起 |
| suspended | 已挂起 | destructive / warning badge | 解除挂起 |
| uninstalled | 已卸载 | 仅审计视图出现 | 无主动作 |

- 内部 `mounted`、`ready`、`failed` 只允许出现在 secondary diagnostic 文案中；主 badge 一律收敛为五态外部 vocabulary（source: `D-52-05` ~ `D-52-08`）。
- `mounted` 与 `ready` 在主界面统一映射成 `active`，不得继续当作两个对外长期状态。
- 激活失败必须显示 plugin 级别失败归因与 `reason code`，但不暴露完整堆栈（source: `D-52-10`）。

### Dependency and failure handling

1. 当依赖缺失、循环依赖或激活失败时，只高亮受影响插件及其下游；无关插件保持可操作（source: `D-52-09`）。
2. blocked diagnostic row 必须提供 **为什么不可用** 与 **下一步恢复动作**，例如 `retry`、`enable`、`reconcile`。
3. 系统不得在 UI 上暗示“自动恢复”；所有恢复都必须通过显式治理动作触发（source: `D-52-11`）。

### Uninstall flow

1. `查看卸载影响` 是 preflight 入口，先展示 lessons / lesson steps / resources / plugin-owned data 四类统计。
2. `打开卸载确认` 只有在 preflight 完成且未 blocked 时才出现。
3. retain 是默认 posture；cleanup 只能作为显式 opt-in 分支出现，且视觉上必须比 retain 更危险。
4. built-in / default plugin 显示同一 lifecycle 卡片样式，但卸载区只展示只读阻断说明，不显示 destructive CTA（source: `D-52-15`）。

---

## Surface Composition

- 页面宽度使用 `max-w-[1360px]`，hero 标题宽度使用 `max-w-[52rem]`（source: `src/components/surfaces/surface-widths.ts`）。
- 大容器圆角使用 `2rem`，插件卡片与内嵌摘要卡使用 `1.5rem`（source: `src/app/globals.css` + `teacherSurfaceRhythm.ts`）。
- 继续执行 **No-Line Rule**：不用 1px divider；列表分隔仅靠 tonal surface 与垂直留白（source: `DESIGN.md`）。
- 主要治理卡片使用 `surface-container-lowest` 白卡浮于 `surface-container-low` 背景；诊断块与 preflight summary 使用一层更深或更浅的 tonal nesting。
- 顶层主 CTA 可用蓝色渐变；行内治理动作全部使用 tonal secondary button，避免每个动作都抢主视觉。

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `badge`, `button`, `card` | not required — local official registry only, verified via `components.json` + `npx shadcn info` on 2026-05-21 |
| none | none | not applicable — `components.json.registries` 为空，未声明 third-party registry（2026-05-21） |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
