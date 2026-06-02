# Feature Research

**Domain:** v4.0 声明式第三方插件 marketplace + 插件自有数据 + 互动答题样板 + 题目统计复盘（K-12 课堂编排系统的受治理插件生态）
**Researched:** 2026-06-02
**Confidence:** HIGH（对既有 baseline 与项目约束的判定）/ MEDIUM（对互动答题与统计的“典型期望行为”判定，参照 Kahoot/Mentimeter/Wooclap/Plickers 类课堂答题工具的成熟形态）

---

## 研究范围与方法

本研究只聚焦 v4.0 的**新增价值**，不重研已交付 baseline。下列能力已是 validated baseline，作为依赖前提而非待研功能：

- 教师教案编辑器、学生播放器、课堂运行/锁定/证据闭环、评价分析页面（v1–v2）。
- Command Bus、governed action registry、event bus、plugin lifecycle/governance audit、WebSocket-first classroom、SQLite + DAL truth（v2.2/v2.3/v3.0）。
- 受控 marketplace surface（`/settings/plugins`）、课堂投票样板插件全链路（authoring → publish → launch → student → teacher/operator verify，v3.1）。
- LessonAgent AI 起草闭环（v3.2）。

**关键发现 — 大量插件数据原语已作为冻结脚手架存在（源自被冻结的 v2.4）**，v4.0 的真实工作量更多是「把已有原语组装成可重复跑通的端到端样板 + 治理可见行为 + 统计面」，而不是从零造数据层。已存在于代码：

| 已存在原语 | 位置 | v4.0 中的角色 |
|-----------|------|--------------|
| `pluginRegistrations`（含 `dbNamespace`、`lifecycleState`、`sourceType`、`uninstallRetentionMode: retain\|cleanup`、`enabled`、`killSwitch`） | `src/db/schema.ts` | marketplace 生命周期 + 卸载保留/清理的存储底座 |
| extension tables：`plugin_ext_lesson` / `plugin_ext_lesson_step` / `plugin_ext_resource`（`schoolId+pluginId+entityId` 唯一，`payloadJson`） | `src/db/schema.ts` | 插件挂接核心实体的扩展数据 |
| 插件自有表：`plugin_owned_business_data`（`schoolId+pluginId+key`，`payloadJson`） | `src/db/schema.ts` | 互动答题作答记录的候选承载 |
| DAL：`upsert/getPluginExtension`、`upsert/getPluginOwnedBusinessData`、`listPluginStepExtensions` | `src/lib/dal/plugin-data.ts` | 插件数据读写边界（已带 teacher scope 鉴权 + 实体归属校验） |
| 迁移工具：`backfillPluginJsonToSchema` / `verifyBackfillData` / `cutoverPluginJsonToSchema` | `src/lib/dal/plugin-migration.ts` | 升级时的数据迁移/回填/校验 |
| lifecycle/hook/action/governance audit 表 | `src/db/schema.ts` | 治理可见行为的审计真相源 |

> 结论：v4.0 不是「能不能做数据层」，而是「把这套数据治理模型用一个真实插件（互动答题）走通，并补齐 marketplace 生命周期可见行为与统计复盘面」。**默认/样板插件必须复用正式插件数据治理模型，而非 built-in 特例**（已是 Key Decision）。

---

## Feature Landscape

> 复杂度口径：LOW = 复用既有原语小幅组装；MEDIUM = 新链路/新 UI 但有可复用底座；HIGH = 跨层新行为、迁移正确性或治理边界硬约束。
> 依赖列标注对既有 baseline 的依赖（哪些已 validated）。

### 功能域 1：声明式插件数据模型

#### Table Stakes（用户/operator 默认期望）

| Feature | Why Expected | Complexity | 依赖 baseline | Notes |
|---------|--------------|------------|---------------|-------|
| 插件 manifest 声明自有数据形状（owned table / 字段 schema / 关联实体） | 「声明式插件」承诺的前提；没有声明就只能动态 DDL（红线） | MEDIUM | `manifestJson` 字段、Zod 校验、governance audit 已存在 | manifest 增加 `dataModel` 段（owned entities + 关联 lesson/step/classroom/student/result 的声明）；用 Zod 在安装/升级时校验 |
| 插件数据由主仓库迁移体系统一管理（无 runtime DDL、无动态建表） | 项目红线，operator 信任前提 | MEDIUM | 已有 extension/owned 物理表 + Drizzle migration | 物理表预置在主 schema，插件只在预置表内按 `pluginId` 分区写 `payloadJson`；声明只是「逻辑形状」，不触发物理 DDL |
| 课堂链路按声明把数据写入/读取插件自有数据 | 数据若不能被课堂写入就没有价值 | MEDIUM | `plugin-data.ts` DAL + action registry + classroom write path | 写入必须经受控 action/DAL，不允许插件直连 DB；写入路径带幂等与 school/plugin scope |
| 数据与课堂/学生/结果的关联可被查询（按 classroom、student、step 维度取数） | 统计与复盘的取数基础 | MEDIUM | extension 表已有 `lessonStepId`/唯一索引；owned 表有 `key` | owned 表的 `key` 需要能编码 `classroomSessionId:studentId:questionId` 之类关联，或新增受治理关联列 |
| 数据隔离：按 `schoolId + pluginId` 严格租户/插件隔离 | 多插件共存、避免越权读他人数据 | LOW | 唯一索引 + DAL scope 校验已存在 | 已有 `school_plugin_*_unique` 约束，复用即可 |
| 卸载时按声明级联清理插件自有数据（cascade delete） | 项目约束「所有关联 cascade delete」 | LOW | 所有插件表已 `onDelete: cascade` 到 `pluginRegistration` | 删除 registration 即清空，已有测试覆盖（`plugin-data.test.ts` 验证 cascade） |

#### Differentiators

| Feature | Value Proposition | Complexity | 依赖 baseline | Notes |
|---------|-------------------|------------|---------------|-------|
| JSON 影子层 → 结构化 schema 的渐进迁移（backfill + verify + cutover） | 让插件先用 `payloadJson` 快速落地，再在升级时收敛为强类型查询，兼顾灵活与可统计性 | HIGH | `plugin-migration.ts` 三件套已存在 | 这是项目区别于「纯 JSON blob 插件」的核心治理优势；用于答题数据从松散 payload 收敛到可统计列 |
| 声明式数据模型 contract 校验（安装即拒绝越界声明） | 把「不污染核心表」从约定变成可执行 gate | MEDIUM | governance audit + Zod | 声明若试图引用核心表写权限/未授权实体 → 安装 preflight 直接拒绝 |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 插件运行时动态建表 / 动态执行 SQL migration | 看起来最灵活、最「真插件」 | 红线；不可审计、迁移不可控、SQLite-first 下灾难 | 主仓库迁移体系预置物理表 + 声明式逻辑形状 |
| 为每个插件在核心表加 nullable 列 | 实现最快 | core schema 被插件污染（已列入 Out of Scope） | extension 表 + owned 表分区承载 |
| 按 school/plugin 动态创建物理表或 schema-per-plugin | 「真正隔离」 | 已列 Out of Scope；SQLite 不支持、运维爆炸 | 单物理表 + `schoolId+pluginId` 分区 + 唯一索引 |
| 通用「插件可自定义任意关系型 schema + 任意 join」 | 想做成 mini-database | 治理/统计/迁移全部失控 | 受限声明（owned entity + 预定义关联键），样板只需答题够用 |

---

### 功能域 2：Marketplace 生命周期（发布 → 安装 → 升级 → 卸载）

#### Table Stakes

| Feature | Why Expected | Complexity | 依赖 baseline | Notes |
|---------|--------------|------------|---------------|-------|
| 浏览/查看可安装插件（catalog surface），展示 manifest 摘要、所需权限、声明的数据 | 没有目录就无法「安装第三方插件」 | LOW | `/settings/plugins` surface + `pluginRegistrations` 已存在 | v3.1 已有受控 marketplace surface，扩展展示 dataModel + 权限 |
| 安装（含安装审核 preflight：权限/数据声明/兼容性检查） | 受治理安装是项目核心承诺 | MEDIUM | install path（`sourceType: external`、`installSource: manual`）+ compatibility check（v3.1 已有 publish preflight 雏形） | 安装前展示「将获得哪些权限 / 将创建哪些数据」，operator 显式确认 |
| 启用/停用 + kill switch（不卸载即可止血） | operator 治理基本动作 | LOW | `enabled`、`killSwitchEnabled`、lifecycleState 已存在 | 复用既有 lifecycle 字段与 governance audit |
| 升级到新版本（含数据迁移：backfill → verify → cutover） | 插件演进必备；迁移错误会丢学生作答 | HIGH | `plugin-migration.ts` 三件套 + lifecycle transitions | **v4.0 close gate 的硬骨头**：迁移正确性必须被 `verify:phase` 守住 |
| 卸载：数据保留 vs 清理两种模式可选并可见 | manifest 已有 `uninstallRetentionMode: retain\|cleanup`，operator 必须能选 | MEDIUM | `uninstalledAt`、`uninstallRetentionMode` 字段已存在 | retain = 软卸载保留作答证据；cleanup = cascade 清空。需明确「保留后能否重装恢复」 |
| 全过程治理审计（谁在何时安装/升级/卸载、授予了哪些能力） | 安装第三方代码进学校，审计是信任底线 | LOW | `governanceAudits`、`pluginLifecycleTransitions`、`pluginActionAudits` 已存在 | 复用既有审计表，补 UI 可见 |
| 升级/卸载的兼容性与依赖检查（被课堂正在使用时阻止破坏性操作） | 防止删掉正在上课用的插件 | MEDIUM | `dependency-graph.ts`、`getPluginUninstallBlockReason`（plugins.ts 已有） | 已有 uninstall block reason 雏形，扩展到「正在进行的课堂会话」 |

#### Differentiators

| Feature | Value Proposition | Complexity | 依赖 baseline | Notes |
|---------|-------------------|------------|---------------|-------|
| 升级 dry-run / 迁移预演（先 verify 再 cutover，可回滚） | operator 敢点「升级」的关键；区别于「升级即赌博」 | HIGH | `verifyBackfillData` 已存在 | backfill 后 verify 通过才允许 cutover；失败不影响旧数据 |
| 卸载保留态下的「重装恢复」可见承诺 | retain 模式的实际价值兑现 | MEDIUM | `uninstalledAt` + 唯一索引（school+pluginKey） | 重装同 pluginKey 时识别保留数据并复用 |
| operator 端生命周期可观测（与课堂/command/task 关联的恢复动作） | v3.1 operator recovery posture 的自然延伸 | MEDIUM | operator read-model（v3.1 已有） | 复用既有 operator 观测面，挂插件生命周期事件 |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 付费/计费/订阅 | 「marketplace」联想 | 明确 Out of Scope（商店运营层 deferred） | 只做受治理发布→安装→升级→卸载核心闭环 |
| 评分/评论/排行榜 | 商店感 | Out of Scope；引入社交/审核负担 | 不做；catalog 只展示 manifest 事实 |
| 公开开发者门户 + 自动化审核流水线 | 想做开放生态 | Out of Scope；安全/运营成本巨大 | 受控安装 + 人工 operator 审核（manual install source） |
| 一键安装任意外部 URL/包 | 「真 marketplace」 | 触碰任意代码执行红线 | 声明式 manifest 注册，无远程代码加载 |
| 自动后台静默升级 | 省心 | 静默迁移可能毁学生数据、不可审计 | operator 显式触发 + dry-run + 审计 |
| 同时支持多种插件类型的完整生命周期矩阵 | 想一次做全 | 稀释样板验证、放大迁移风险 | 只用「互动答题」一种样板打穿，复用投票链路经验 |

---

### 功能域 3：互动答题样板插件

> 参照成熟课堂答题工具（Kahoot/Mentimeter/Wooclap/Plickers）的最小成熟形态，但裁剪到「证明数据治理模型成立」所需。

#### Table Stakes

| Feature | Why Expected | Complexity | 依赖 baseline | Notes |
|---------|--------------|------------|---------------|-------|
| 老师配置题目（题干 + 选项 + 正确答案标记） | 「答题」的最小定义 | MEDIUM | 教案编辑器 + extension 表（挂 lesson step）+ 投票插件 authoring 经验 | 题目配置写入插件自有数据/扩展，复用 v3.1 投票 authoring 模式 |
| 单选题型（至少一种成熟题型走通） | 统计正确率/选项分布的最小题型 | LOW | 投票插件已证明单选交互 | 单选是统计面成立的最小集；其余题型 defer |
| 学生课堂作答并提交 | 主链路核心动作 | MEDIUM | 学生播放器 + classroom runtime + WebSocket transport | 复用投票插件的 student completion 链路 |
| 作答记录写入插件自有数据（带 classroom/student/question 关联） | v4.0 要证明的核心：插件数据被课堂写入 | MEDIUM | `plugin_owned_business_data` + `plugin-data.ts` + action registry | append-only 作答记录，幂等（同一 student×question 一次有效），replay-safe（复用 v3.1 提交语义） |
| 课堂内基本作答反馈（已交/未交、是否锁定后可改） | 学生/老师即时确认 | LOW | classroom locked/unlocked 语义已存在 | 复用既有锁定模式 |
| 作答与课堂会话生命周期一致（开课才可答、结束即定格） | 数据完整性 | LOW | `classroomSessions`/`classroomParticipants` | 复用既有会话边界 |

#### Differentiators

| Feature | Value Proposition | Complexity | 依赖 baseline | Notes |
|---------|-------------------|------------|---------------|-------|
| 多题型（多选/判断/简答） | 课堂表达更丰富 | MEDIUM-HIGH | 单选走通后扩展 | **v4.0 建议只做单选样板，多题型 defer 到 v4.x**；否则放大统计/迁移面 |
| 实时作答进度广播（老师看到实时答题人数曲线） | 课堂掌控感（Kahoot 招牌体验） | MEDIUM | WebSocket fanout 已存在 | 可作为 differentiator，但非证明数据模型所必需；可后置 |
| LessonAgent 辅助生成题目 | 复用 v3.2 起草闭环 | MEDIUM | LessonAgent draft loop | 诱人但属另一条价值线，建议 defer 避免里程碑膨胀 |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 插件自带任意前端 JS 渲染答题 UI | 「灵活答题体验」 | 任意代码执行红线 | 声明式题目 schema + 宿主渲染受控题型组件 |
| 计时/抢答/积分排行榜/游戏化 | Kahoot 既视感 | 过度做，偏离「证明数据治理」目标 | 只做作答 + 统计；游戏化 defer |
| 富媒体题目（图片/视频/公式编辑器） | 教学丰富度 | 引入资源/渲染复杂度，拖慢样板 | 纯文本题干 + 文本选项起步 |
| 自适应/分支答题逻辑 | 智能教学 | 复杂度爆炸，超出样板目标 | 线性单题序列 |

---

### 功能域 4：题目统计与课后复盘

> 项目明确「先做题目统计」：每题正确率、选项分布、作答/未作答人数。

#### Table Stakes

| Feature | Why Expected | Complexity | 依赖 baseline | Notes |
|---------|--------------|------------|---------------|-------|
| 每题正确率统计 | 项目点名的核心指标 | MEDIUM | 作答数据（owned table）+ DAL 聚合 + 评价分析页面框架 | 从插件自有数据聚合，DAL 出 DTO，不让 UI 直连 DB |
| 选项分布（每个选项被选人数/比例） | 项目点名指标；看错误集中在哪 | MEDIUM | 同上 | 单选下直接 group by option |
| 作答 / 未作答人数（按课堂名册对账） | 项目点名指标；覆盖率 | MEDIUM | `classroomParticipants` 名册 + 作答记录左连接 | 需要「应答名册」与「实际作答」对账，注意缺答 = 名册有人但无记录 |
| 课后复盘入口（教师在课后查看统计面） | 「课后复盘」主链路终点 | LOW | 既有评价/分析页面 + Stitch/DESIGN 对齐 | 复用评价分析页面 IA，新增题目统计视图 |
| 统计基于插件自有数据（而非核心表） | 证明「插件数据驱动统计」闭环 | MEDIUM | `plugin-data.ts` 读路径 | 这是 v4.0 要证明的：插件数据 → 自动统计，无需核心表改造 |
| 统计数据缓存与失效（写入后 tag 失效） | 项目缓存约束；复盘数据要准 | LOW | `cacheTag`/`revalidateTag`（`plugin-data.ts` 已用 revalidateTag） | 作答写入后失效统计 tag，避免陈旧复盘 |

#### Differentiators

| Feature | Value Proposition | Complexity | 依赖 baseline | Notes |
|---------|-------------------|------------|---------------|-------|
| 学生维度复盘（某生答了哪些、错在哪） | 因材施教 | MEDIUM | 作答记录已带 studentId | 题目维度走通后扩展；可后置 |
| 跨课堂/历史趋势统计 | 长期教学洞察 | HIGH | 需跨会话聚合 | defer；v4.0 只做单次课堂题目统计 |
| 统计结果导出（CSV/打印） | 教师存档 | LOW | DTO 已成形即可导出 | 低成本 differentiator，可选 |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 实时大屏统计动画/排行榜直播 | Kahoot 体验 | 偏离「课后复盘」核心，增前端复杂度 | 课后静态统计面优先 |
| AI 自动生成「教学诊断报告/建议」 | 智能复盘 | 属 AI 价值线，膨胀里程碑 | 先出准确的数字统计，诊断 defer |
| 通用 BI/自定义图表 dashboard | 「数据平台」 | 严重过度做 | 固定三类指标（正确率/分布/作答数）够样板 |
| 把统计结果回写核心 analytics 表 | 「统一分析」 | 污染核心表，违反插件数据边界 | 统计是插件数据上的读模型/投影，不回写核心 |

---

## Feature Dependencies

```
[功能域1 声明式数据模型]
    └──requires──> [既有: pluginRegistrations / extension+owned 表 / plugin-data DAL]
    └──requires──> [既有: governance audit + Zod manifest 校验]

[功能域3 互动答题样板]
    └──requires──> [功能域1 数据模型]（作答必须有处可写）
    └──requires──> [既有: classroom runtime + WebSocket + 学生播放器 + v3.1 投票链路]

[功能域4 题目统计复盘]
    └──requires──> [功能域3 作答数据]（无数据则无统计）
    └──requires──> [既有: 评价分析页面 + cacheTag 失效]

[功能域2 Marketplace 生命周期]
    ├──requires──> [既有: 受控 marketplace surface + lifecycle 字段 + governance audit]
    ├──升级──requires──> [功能域1 数据模型 + plugin-migration backfill/verify/cutover]
    └──卸载保留/清理──requires──> [功能域1 cascade + uninstallRetentionMode]

[功能域2 升级数据迁移] ──conflicts──> [功能域3 进行中的课堂作答]
    （正在上课时不允许破坏性升级/卸载 → 需 uninstall/upgrade block reason 扩展到 active session）

[v4.0 close gate verify:phase] ──gates──> [迁移正确性 + 治理边界 + 样板链路可重复跑通]
```

### Dependency Notes

- **域3 依赖 域1：** 作答记录是插件自有数据的写入证明；数据模型不成立则样板无意义。
- **域4 依赖 域3：** 统计是作答数据的读模型/投影；必须能按 classroom×student×question 取数对账。
- **域2 升级依赖 域1 迁移工具：** 升级最危险的是数据迁移；`backfill→verify→cutover` 三段必须串成可回滚链路，是 close gate 的硬骨头。
- **域2 升级/卸载 与 域3 进行中课堂冲突：** 必须扩展既有 `getPluginUninstallBlockReason` 到「active classroom session 正在使用该插件」场景，否则会破坏正在进行的课堂。
- **样板复用约束（Key Decision）：** 互动答题样板**必须复用正式插件数据治理模型**，不得退化为 built-in 特例——否则插件架构未被真实证明。

---

## MVP Definition

### Launch With (v4.0 committed)

样板主链路必须端到端可重复跑通：**老师配置答题 → 学生课堂作答 → 数据入插件自有表 → 课后题目统计复盘**。

- [ ] 域1：manifest 声明式数据模型（owned entity + 关联声明）+ 安装时 Zod/治理校验 + cascade 清理 — 证明「不污染核心表、无 runtime DDL」。
- [ ] 域1：课堂链路按声明把作答写入插件自有数据（受控 action/DAL，幂等、scope 隔离）。
- [ ] 域2：发布→安装（含 preflight 审核：权限+数据声明+兼容性）→ 升级（backfill→verify→cutover 可回滚）→ 卸载（retain/cleanup 可选）的受治理闭环 + 全程审计。
- [ ] 域2：升级/卸载对「进行中课堂」的破坏性保护（block reason）。
- [ ] 域3：互动答题样板插件 — 单选题配置 + 学生课堂作答 + append-only 作答记录入插件自有数据。
- [ ] 域4：题目统计面 — 每题正确率 / 选项分布 / 作答·未作答人数（基于插件数据，DAL 出 DTO，写后失效缓存）+ 课后复盘入口（Stitch/DESIGN 对齐）。
- [ ] close gate：`verify:phase` 守住迁移正确性 + 治理边界（红线不破）+ 样板链路可重复跑通。

### Add After Validation (v4.x)

- [ ] 多题型（多选/判断/简答）— 单选样板验证统计模型成立后扩展。
- [ ] 实时作答进度广播（老师看实时答题曲线）— 体验增强，非数据模型必需。
- [ ] 学生维度复盘 / 统计导出 — 题目维度统计稳定后追加。
- [ ] 卸载保留态的重装恢复兑现 — retain 模式价值的完整闭环。

### Future Consideration (v5+)

- [ ] LessonAgent 辅助生成题目 — 属 AI 价值线，避免与 marketplace 里程碑耦合。
- [ ] 跨课堂/历史趋势统计、AI 教学诊断报告 — 数据平台/AI 扩张方向。
- [ ] 多种插件类型的完整生命周期矩阵 — 先用单样板打穿再泛化。
- [ ] 商店运营层（付费/评分/公开开发者门户/自动化审核流水线）— 明确 Out of Scope。

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 声明式数据模型 + 安装校验 + cascade（域1） | HIGH | MEDIUM | P1 |
| 课堂链路写入插件自有数据（域1） | HIGH | MEDIUM | P1 |
| 安装 preflight 审核 + 启停/killswitch（域2） | HIGH | LOW-MEDIUM | P1 |
| 升级数据迁移 backfill→verify→cutover（域2） | HIGH | HIGH | P1 |
| 卸载 retain/cleanup + 进行中课堂保护（域2） | HIGH | MEDIUM | P1 |
| 互动答题单选样板 + 作答入库（域3） | HIGH | MEDIUM | P1 |
| 题目统计三指标 + 课后复盘入口（域4） | HIGH | MEDIUM | P1 |
| 生命周期治理审计可见（域2） | MEDIUM | LOW | P1（复用既有审计） |
| 升级 dry-run / 卸载重装恢复（域2） | MEDIUM | HIGH/MEDIUM | P2 |
| 实时作答进度广播（域3） | MEDIUM | MEDIUM | P2 |
| 多题型（域3） | MEDIUM | MEDIUM-HIGH | P2 |
| 学生维度复盘 / 统计导出（域4） | MEDIUM | MEDIUM/LOW | P2 |
| LessonAgent 出题、跨课堂趋势、AI 诊断 | MEDIUM | HIGH | P3 |
| 商店运营层（付费/评分/门户/自动审核） | LOW（本里程碑） | HIGH | P3（Out of Scope） |

**Priority key:** P1 = v4.0 必须；P2 = 验证后追加；P3 = 后续/明确不做。

---

## Competitor Feature Analysis

参照课堂答题工具的成熟形态，对照本项目的受治理插件取舍（Confidence MEDIUM）。

| Feature | Kahoot / Mentimeter | Wooclap / Plickers | Our Approach (v4.0) |
|---------|---------------------|--------------------|--------------------|
| 题目配置 | 富题型 + 媒体 + 游戏化 | 多题型 + LMS 集成 | 单选样板、纯文本、声明式 schema、宿主渲染（无插件任意 JS） |
| 学生作答 | 实时抢答/计时/积分 | 实时 + 异步 | 课堂内作答 + 锁定语义，无游戏化，append-only 幂等入库 |
| 统计 | 实时大屏 + 课后报告 + 导出 | 题目/学生报告 | 课后题目统计三指标（正确率/分布/作答数），插件数据驱动，导出 P2 |
| 扩展生态 | 闭源 SaaS | 闭源 SaaS | 开源 + 声明式受治理插件 + 插件自有数据 + 主仓库统一迁移（差异化核心） |
| 数据所有权 | 厂商托管 | 厂商托管 | 学校自托管 SQLite，cascade 清理，retain/cleanup 可选（信任/合规优势） |

> 本项目的真正差异化不在答题体验丰富度，而在**「声明式受治理插件 + 插件自有数据 + 统一迁移 + 课堂数据所有权」**。答题只是证明这套模型成立的样板，因此答题体验应刻意克制，把复杂度投入到数据治理与迁移正确性。

---

## Sources

- `.planning/PROJECT.md` — v4.0 milestone goal、target features、约束、Out of Scope、Key Decisions（HIGH）。
- `src/db/schema.ts` — `pluginRegistrations`、extension 表、`plugin_owned_business_data`、lifecycle/audit 表（HIGH，一手代码）。
- `src/lib/dal/plugin-data.ts` / `plugin-migration.ts` / `plugins.ts` — 既有插件数据读写、迁移三件套、uninstall block reason（HIGH，一手代码）。
- `src/app/settings/plugins/page.tsx` — 既有受控 marketplace surface（HIGH）。
- v3.1 课堂投票样板链路、v3.2 LessonAgent 闭环 — validated baseline（HIGH，来自 PROJECT.md 归档记录）。
- 课堂答题工具成熟形态（Kahoot/Mentimeter/Wooclap/Plickers）作为「典型期望行为」参照系（MEDIUM，行业通识，未逐一抓取当前文档）。

---
*Feature research for: v4.0 Plugin Marketplace & Plugin-Owned Data（互动答题样板 + 题目统计复盘）*
*Researched: 2026-06-02*
