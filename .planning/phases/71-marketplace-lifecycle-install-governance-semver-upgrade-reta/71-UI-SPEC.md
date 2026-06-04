---
phase: 71
slug: marketplace-lifecycle-install-governance-semver-upgrade-retain-cleanup-uninstall
status: draft
shadcn_initialized: true
preset: radix-nova
created: 2026-06-04
---

# Phase 71 — UI Design Contract

> 面向 Phase 71 的 external plugin marketplace 生命周期 UI 契约。目标是把 `/settings/plugins` 扩展成同页双分区的受治理 marketplace：发现、安装、升级预检、分阶段升级反馈、retain/cleanup 卸载、retain 后恢复提示、active classroom 阻断说明。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | radix-nova（来源：`components.json`） |
| Component library | Radix primitives + 项目自定义 `ui/*` |
| Icon library | lucide |
| Font | Lexend（来源：`DESIGN.md` + `src/app/globals.css`） |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | badge 内 icon 与文字微间距、状态点 |
| sm | 8px | 紧凑按钮内容、标签组、内联错误说明 |
| md | 16px | 卡片主体内容默认间距 |
| lg | 24px | 卡片分区、detail panel 段落间距 |
| xl | 32px | 分区之间主间距、hero 到内容区过渡 |
| 2xl | 48px | 安装/升级/卸载 detail 容器大段留白 |
| 3xl | 64px | 页面级 section break |

Exceptions: 所有主操作按钮与切换控件最小高度 44px；插件卡主操作区最小高度 48px；危险确认 token 输入区最小高度 52px；三阶段升级步骤行最小高度 56px。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 28px | 600 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f5f7f9` | 页面背景、外层工作区、section 底色 |
| Secondary (30%) | `#eef1f3` / `#ffffff` | plugin cards、detail panel、影响面 tiles、治理摘要容器 |
| Accent (10%) | `#0050d4` + `#7b9cff` | 安装按钮、升级预检入口、升级阶段当前态、恢复成功态、retain 恢复提示 |
| Destructive | `#b31b25` | cleanup、active-blocked 危险提示、破坏性确认 |

Accent reserved for: `安装插件`、`查看升级预检`、`开始升级`、三阶段进度中的当前/完成状态、`已接管保留数据` 恢复 badge、当前可执行推荐动作。不得把 accent 用于普通 metadata badge、插件来源说明、全部交互按钮或整页大面积铺底。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 安装插件 |
| Empty state heading | 当前还没有可安装的 external 插件 |
| Empty state body | 等待新的 external manifest 进入受治理目录后，这里会显示来源、权限、声明数据与安装入口。 |
| Error state | 当前操作未通过治理校验，请先处理卡片中的具名阻断原因后再重试。 |
| Destructive confirmation | 清理卸载：将删除真实插件数据，请输入确认 token 后继续。 |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none declared for this phase | not required |
| third-party | none | not applicable |

---

## Scope Locks

- 本 phase 只覆盖 `MKT-01` ~ `MKT-05`：发现/安装、semver 升级预检与执行、retain/cleanup 卸载、retain 后重装接管提示、active classroom 阻断说明。
- `/settings/plugins` 继续是唯一 marketplace 入口；built-in 与 external 必须同页双分区展示。
- 不新增 external 独立 route，不扩成商店运营层，不做计费/评论/开发者门户。
- 升级默认入口必须先看预检，不能把 `直接升级` 做成首按钮。
- active classroom 下升级/卸载统一硬阻断；仅提供 `查看受影响课堂` 与 `稍后重试`，不提供排队或 override。

来源：`71-CONTEXT.md`、`ROADMAP.md`、`REQUIREMENTS.md`。

---

## Information Architecture

### 页面级结构

`/settings/plugins` 固定为 4 层：

1. **Marketplace Hero**
   - 标题：`插件市场`
   - 副标题强调“可发现 + 可安装 + 风险透明”
   - 顶部 metrics 仅显示：built-in 数量、external 可安装数、external 已安装数、需处理升级数

2. **Built-in Section**
   - 延续现有 built-in cards
   - 只保留启用/停用语义
   - 视觉弱于 external 分区，不抢本 phase 主线

3. **External Section**
   - 本 phase 主舞台
   - 卡片先展示治理摘要，再展示主操作
   - 支持 4 种卡片态：未安装、已安装可用、可升级、已卸载但可恢复

4. **Detail / Confirmation Layer**
   - 同页 detail panel 或抽屉承载安装预检、升级预检、升级执行、卸载确认
   - 不跳转到单独结果页

### External 插件卡片信息顺序

每张 external 卡片固定按以下顺序展示：

1. 插件名 + 当前 lifecycle badge
2. 版本信息（当前版本 / 可升级版本）
3. 治理摘要 badges：权限、声明数据、namespace、sourceType
4. 核心说明文案（这是什么插件、为何需要治理）
5. 内联阻断区或成功区
6. 主操作区

禁止把 `安装插件` 放在卡片最顶端，导致 operator 先点再看风险信息。

---

## External Card State Contract

| Card State | Primary CTA | Secondary CTA | 必须显示的信息 |
|-----------|-------------|---------------|----------------|
| 未安装 | `安装插件` | `查看治理摘要` | 版本、权限、声明数据、namespace、source |
| 已安装可用 | `查看详情` | `停用插件` 或 `查看生命周期` | 当前版本、启用状态、最近治理状态 |
| 可升级 | `查看升级预检` | `稍后处理` | 当前版本 → 新版本、blockers 摘要、真实数据影响 |
| 已卸载但可恢复 | `重新安装并恢复` | `查看保留数据` | `已卸载但可恢复` badge、保留数据接管说明 |
| 被 active classroom 阻断 | 无主 destructive CTA | `查看受影响课堂` + `稍后重试` | 哪些 classroom/session 正在占用、阻断原因 |

补充规则：

- `未安装` 卡片若预检失败，错误必须内联显示在卡片中部，不能只 toast。
- `可升级` 卡片的默认视觉焦点是“风险与阻断”，不是 changelog。
- `已卸载但可恢复` 不得伪装成普通 disabled；必须显式标记“可恢复”。

---

## Install Flow Contract

### 安装前摘要

external 卡片未安装态必须先展示治理摘要 5 项：

1. `Version`
2. `Permissions`
3. `Data Model`
4. `Namespace`
5. `Source`

### 安装反馈

- 成功：卡片原位切换为已安装态，并显示 `已安装，可继续启用课堂使用`。
- 失败：具名拒因内联展示，优先顺序固定为：manifest 校验失败 → dataModel 校验失败 → `pluginKey` 冲突 → `dbNamespace` 冲突 → 其他治理失败。
- 不允许把失败态挪到独立 error page。

### 安装视觉

- 治理摘要使用次级 tonal badges，不使用红黄绿交通灯式杂色。
- 主安装按钮使用 gradient primary。
- 冲突错误区使用 `error-container` 浅底，不做全红卡片。

---

## Upgrade Flow Contract

### 预检第一屏

升级 detail panel 第一屏固定展示顺序：

1. 当前版本 → 目标版本
2. 是否存在真实 owned data
3. 将执行的迁移阶段：`backfill → verify → cutover`
4. blocker 列表：active classroom / verify 风险 / 身份冲突 / 其他治理阻断
5. 影响说明
6. changelog（若有，放最后）

### 执行中状态

升级执行必须用 3 行分阶段状态，而非单一模糊进度条：

| Stage | Label | 状态文案 |
|------|-------|---------|
| 1 | Backfill | 正在回填新版本所需数据 |
| 2 | Verify | 正在核对行数、校验和与统计一致性 |
| 3 | Cutover | 正在切换到新版本 |

状态颜色规则：

- 当前阶段：accent tonal + 强标题
- 已完成阶段：secondary tonal + `已完成`
- 失败阶段：destructive tonal + 具名错误
- 未开始阶段：弱化 secondary

### 升级失败

- verify 失败时固定文案：`升级未完成，系统已保持旧版本继续可用。`
- 卡片态保留在旧版本，并叠加 `升级失败` 状态 badge。
- 不允许出现“半升级中、请联系管理员”式模糊中间态。

---

## Uninstall / Recovery Contract

### 默认姿态

- 所有 destructive 入口默认落在 `retain`。
- 主按钮不得直接命名为 `卸载并清理`。
- `cleanup` 必须降级为 detail panel 内第二选择。

### Cleanup 确认区

cleanup 确认第一屏固定包含：

1. 影响面 summary：`将删除 N 条作答、影响 M 个复盘`
2. confirmation token
3. token 输入框
4. 危险说明
5. `确认 cleanup` 按钮

禁止只显示“此操作不可恢复”的抽象警告而不显示真实计数。

### Retain 后重装

- 同 `pluginKey` 重装成功后，卡片顶部必须显示 `已接管保留数据` badge。
- 说明文案固定传达：这是一次重新安装，但历史保留数据已被恢复接管。
- 不得把这次操作描述成普通 enable。

### 已卸载但可恢复态

- 目录中继续可见。
- badge 固定：`已卸载但可恢复`。
- 主 CTA：`重新安装并恢复`。
- 次文案：`历史数据仍保留，重新安装后将按新 pluginId 接管。`

---

## Active Classroom Blocking Contract

### 阻断展示优先级

一旦 destructive 操作被 active classroom 阻断，UI 第一优先展示：

1. 正在占用该插件的 classroom / session 名称
2. 当前状态（进行中 / 正在作答）
3. 阻断操作类型（升级 / 卸载）
4. 后续动作：`查看受影响课堂`、`稍后重试`

### 统一策略

- 升级与卸载使用同一套硬阻断视觉和文案结构。
- 不引入“升级可排队、卸载不可排队”的差异策略。
- 不显示 override、强制继续、忽略风险 等按钮。

### 视觉

- 阻断区为浅危险底 + 清晰列表，不要全页弹窗压制。
- 受影响课堂列表用白色内卡承载，便于扫读。

---

## Interaction Constraints

1. 所有 install/upgrade/uninstall 结果优先内联反馈在卡片或 detail panel 内。
2. destructive 操作必须二次确认；`cleanup` 需要 token，不接受单次点击完成。
3. 所有 primary CTA 满足 44px 点击高度；detail panel 中的 stage rows 满足 56px 行高。
4. 外部插件卡片禁止使用表格化 dense layout；保持教育产品的宽松节奏。
5. 无 1px divider；使用 tonal 容器、留白和阴影层级分隔信息。
6. built-in 与 external 分区必须视觉可区分，但属于同一页面体系；external 更强，built-in 更稳。
7. error copy 必须具名，不使用 `操作失败，请稍后再试` 作为唯一反馈。
8. 状态 badge 数量最多 4 个；超出时折叠到 detail panel，避免卡片噪音。

---

## Phase-Specific CTA Labels

| Context | Label |
|--------|-------|
| Install | 安装插件 |
| Upgrade preflight | 查看升级预检 |
| Upgrade execute | 开始升级 |
| Uninstall retain | 卸载并保留数据 |
| Uninstall cleanup | 确认 cleanup |
| Recovery reinstall | 重新安装并恢复 |
| Blocked follow-up | 查看受影响课堂 |

---

## Acceptance Criteria

### A. Marketplace IA
- [ ] `/settings/plugins` 保持单页，包含 built-in 与 external 双分区。
- [ ] external 卡片先展示治理摘要，再展示安装/升级动作。

### B. Install Governance
- [ ] manifest / dataModel / 命名冲突失败时，拒因在卡片内联回显。
- [ ] 安装态不会跳到独立结果页。

### C. Upgrade Experience
- [ ] 升级默认先看预检，不直接升级。
- [ ] 预检第一屏优先展示真实数据影响与 blocker。
- [ ] 执行时明确展示 `backfill → verify → cutover` 三阶段。
- [ ] verify 失败后旧版本继续可用，并可见 `升级失败` 态。

### D. Uninstall / Recovery
- [ ] retain 为默认卸载姿态。
- [ ] cleanup 必须先展示真实影响面计数 + confirmation token。
- [ ] retain 后重装成功时明确显示 `已接管保留数据`。
- [ ] retain 插件在目录中保留 `已卸载但可恢复` 状态。

### E. Active Blocking
- [ ] active classroom 下升级/卸载统一硬阻断。
- [ ] 阻断区优先显示受影响 classroom/session 名单。
- [ ] 被阻断后只提供 `查看受影响课堂` 与 `稍后重试`。

### F. Visual Consistency
- [ ] 全界面使用 Lexend、中文优先、无 1px divider、tonal surfaces、glass/gradient CTA。
- [ ] external marketplace 气质接近应用商店，但保持治理透明，不滑向消费级商店运营层。

---

## Source Notes

| Source | Decisions Used |
|--------|----------------|
| `71-CONTEXT.md` | 双分区、治理摘要优先、预检优先、三阶段升级、retain 默认、cleanup 影响面+token、恢复提示、active block 统一策略 |
| `ROADMAP.md` | Phase 71 范围、success criteria、MKT-01~05 |
| `REQUIREMENTS.md` | MKT-01~05 原始需求边界 |
| `STATE.md` | 当前里程碑位置与 Phase 70 验证衔接 |
| `components.json` | shadcn 已初始化、preset=`radix-nova`、icon=`lucide`、无 third-party registries |
| `DESIGN.md` | Lexend、tonal surfaces、glass/gradient CTA、无 1px divider |
| `src/app/globals.css` | 全局色板、spacing tokens、radius tokens |
| `plugin-marketplace-surface.tsx` | 现有 marketplace shell、hero、metric cards、card rhythm、built-in 目录结构 |
| `plugin-lifecycle-operator-surface.tsx` | 现有卸载确认、影响面 tiles、治理状态、内联错误与 operator 细节面板模式 |
| `plugin-actions.ts` | install/enable/reconcile/uninstall/preflight server-action 边界 |
| `69-UI-SPEC.md` | quiz sample 视觉基调延续 |
| `70-UI-SPEC.md` | recap/statistics 的 tonal 教育产品语言延续 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
