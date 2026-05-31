---
phase: 19
slug: teacher-shell-route-metadata-system
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-11
---

# Phase 19 — UI Design Contract

> 面向 Phase 19 的教师端壳层 UI 合同。目标是把 shell 行为改为
> route metadata 驱动，同时严格保持当前视觉结果不变。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | 自定义 UI primitives + Radix patterns |
| Icon library | lucide-react |
| Font | Lexend |

来源：`DESIGN.md`、`src/app/globals.css`、现有 shell 组件实现。

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon 与紧凑 inline gap |
| sm | 8px | 小型控件内边距、紧凑组间距 |
| md | 16px | 默认内容间距 |
| lg | 24px | section padding、header 内部节奏 |
| xl | 32px | shell 区块间距 |
| 2xl | 48px | 大块 section 分隔 |
| 3xl | 64px | 页面级呼吸感留白 |

Exceptions: `/teacher` 首页允许 shell/header/main-content 使用 0 radius 与 full-width；
导航和 CTA 仍需保持不少于 44px 触达高度。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 32px | 600 | 1.2 |
| Display | 40px | 600 | 1.15 |

约束：仅允许 `400` 与 `600` 两档字重；shell 重构不得新增第三套标题体系。

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #f5f7f9 | app floor、shell 背景、整体页面基底 |
| Secondary (30%) | #eef1f3 | sidebar、top-nav 容器、section layer |
| Accent (10%) | #0050d4 / #7b9cff | 主 CTA、当前导航激活态、focus outline、品牌型 hero/玻璃导航高亮 |
| Destructive | #b31b25 | 仅危险动作与高风险提醒 |

Accent reserved for: `开启新课堂`、当前激活导航项、focus-visible、品牌性
导航高亮、明确的 primary action。禁止因为本阶段重构把 accent 扩散到普通
卡片、分割、背景描边或全部按钮。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 开启新课堂 |
| Empty state heading | 暂无壳层内容 |
| Empty state body | 当前路由暂未注册独立 surface metadata，继续按默认教师壳层渲染；如需特殊行为，请补充 metadata，而不是在 JSX 中追加 route 判断。 |
| Error state | 壳层元数据解析失败，已回退到默认教师壳层。请检查 route metadata、resolver 输出与 theme runtime 是否一致。 |
| Destructive confirmation | none |

约束：本阶段不得新增 marketing 文案、不得改写现有 `/teacher`、`/settings`、
`/resources` 主标题语气，仅允许把已有标题/说明迁移到 metadata/resolver。

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party | none | not applicable |

---

## Shell behavior contract

本阶段的 UI 合同核心不是新视觉，而是把现有视觉语义正式收敛为
metadata/resolver contract。

### Route metadata 最低字段

| Field | Contract |
|-------|----------|
| `routeKey` | 继续使用 allowlisted route surface key，禁止自由 pathname 直传 UI 组件。 |
| `label` | 页面语义标题来源，可被 layout header 复用。 |
| `shell.radius` | 至少支持 `rounded`、`square`；未来可扩展但本阶段仅落地现有行为。 |
| `shell.width` | 至少支持 `default`、`full-width`；用于表达 `/teacher` 当前铺满行为。 |
| `shell.chrome` | 至少支持 `default`、`immersive`、`minimal`、`presentation`、`fullscreen`、`focus` 的枚举预留。 |
| `shell.mode` | 继续沿用 `left-nav`、`top-nav`、`top-nav-secondary-rail`。 |
| `surface summary` | 继续为 page-header / footer / context-panel 提供稳定说明来源。 |

### Resolver 输出语义

| Output | Must mean |
|--------|-----------|
| `shellVariant` | 供壳层决定结构分支，不包含业务 route 判断。 |
| `shellConfig.radius` | 只表达视觉半径语义，不在组件内再推导 `/teacher` 特判。 |
| `shellConfig.width` | 只表达内容铺满或标准版心语义。 |
| `shellConfig.chrome` | 只表达导航/沉浸/极简 chrome 级别。 |
| `surfaceMetadata` | 供 header/sidebar/top-nav/main-content 读取标题、摘要、route identity。 |

---

## Current route behavior invariants

| Route group | Required shell behavior | Visual invariant |
|-------------|-------------------------|------------------|
| `/teacher` | `radius: square` + `width: full-width` + `chrome: immersive` | sidebar 无圆角；main 无圆角；page-header 无额外包裹且铺满；main-content 保持 full-width、无局部窄版心。 |
| `/settings` | 共享教师壳层，保持非首页 rounded content contract | header、main-content、footer/context-panel 继续复用共享圆角语义，不变更信息层级。 |
| `/resources` | 共享教师壳层，保持现有 teacher shell 语义 | 不新增新的 hero 版式，不脱离共享 shell。 |
| future teacher-facing routes | 必须通过 metadata 明确声明 shell 行为 | 禁止 `routeA || routeB || routeC` 回流到 UI 组件。 |

说明：`square/full-width/immersive` 是当前 `/teacher` 已上线表现，Phase 19
只能“声明化”，不能“重新设计”。

---

## Structural semantics and ownership

| Region | Required semantic role | Regression constraint |
|--------|-------------------------|-----------------------|
| `primary-nav` | 教师主导航承载区；可由 `Sidebar` 或 `GlassNav` 渲染 | 只允许位置切换，不允许改变 IA、品牌入口或主导航文案集合。 |
| `secondary-nav` | 辅助导航/二级工作流 rail | 仍为可选区；显隐只能由 runtime/resolver 决定。 |
| `page-header` | 路由级标题、说明、headerActions 的唯一主容器 | 禁止新增额外 header wrapper；保持真实 header block 即 region 本体。 |
| `main-content` | 页面业务内容唯一承载区 | 不得因 metadata 重构新增内层宽度限制、圆角回退或额外装饰容器。 |
| `context-panel` | 主题/结构说明或上下文辅栏 | 仍为可选辅助区，不能变成业务主内容承载区。 |
| `page-footer` | 结构摘要与低优先信息反馈区 | 仅在 runtime 标记可见时出现，不新增营销或冗余解释文案。 |

补充约束：

- `header/sidebar/top-nav/main-content` 的 DOM 责任边界必须保持稳定。
- `TeacherSidebarShell` 只消费 resolver 结果，不直接消费业务 route 规则。
- `Sidebar` 与 `GlassNav` 继续是 nav renderer，不是 route 决策器。

---

## Visual invariants and forbidden changes

### 必须保持不变

1. `/teacher` 首页 square shell 行为。
2. `/teacher` header 与 main-content full-width 表现。
3. 共享 teacher shell 的 tonal layering、无 1px divider、Lexend、glass nav
   与 gradient CTA 设计语言。
4. `page-header`、`main-content`、`primary-nav` 的稳定结构与当前层级顺序。
5. 现有 header actions、导航信息架构与中文文案基调。

### 明确禁止

1. 禁止借 Phase 19 引入任何新的视觉改版。
2. 禁止新增局部 max-width、narrow wrapper、额外 section 壳或说明条。
3. 禁止把 `/teacher` 的 square/full-width 恢复成 rounded card shell。
4. 禁止新增边框分割线来表达 route metadata 差异。
5. 禁止把未来能力预留实现成当前可见 UI 开关。

---

## Future extension boundaries

以下能力本阶段只定义扩展边界，不落地新的可见视觉：

| Future mode | Boundary |
|-------------|----------|
| `presentation` | 可弱化管理 chrome、强化主舞台，但必须另开 UI phase 决定具体视觉。 |
| `focus` | 可降低侧栏存在感，但不能破坏 required regions contract。 |
| `fullscreen` | 允许压缩 shell chrome 到最小，但 route metadata 仍需可回退到标准 teacher shell。 |
| `minimal chrome` | 仅代表 chrome 密度语义，不代表自动删除 header/main-content。 |
| `immersive` | 延续当前 `/teacher` 的沉浸式壳层语义；未来 route 可复用，但不得反向改写当前首页表现。 |

约束：未来新 mode 必须新增 metadata 枚举与 resolver regression test，不能在
`TeacherSidebarShell` 中追加 route 条件分支。

---

## Regression contract for planner and executor

计划与实现必须至少验证以下回归点：

1. `teacher-sidebar-shell.tsx` 不再出现 `routeKey === "/teacher"`、
   `pathname.startsWith(...)` 或等价业务 route 判断。
2. `/teacher` 仍然保持 square sidebar、square main、square page-header、
   full-width main-content。
3. `/settings` 与 `/resources` 继续走共享 teacher shell path。
4. `page-header` region 仍直接落在真实 header block，不新增包装层。
5. shell resolver 可为未来 `presentation/focus/fullscreen/minimal chrome`
   输出结构化结果，但这些模式在本阶段默认不改变现有可见 UI。
6. 主题 runtime、route metadata、shell renderer 三者的职责边界清晰：
   compile/resolve/render 分层，不相互越界。

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
