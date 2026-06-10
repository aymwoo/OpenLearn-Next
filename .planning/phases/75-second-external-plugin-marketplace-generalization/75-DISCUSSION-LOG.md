# Phase 75: 第二个 External 插件 + Marketplace 泛化验证 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 75-second-external-plugin-marketplace-generalization
**Areas discussed:** 插件类型选择, 泛化修复策略, Marketplace 验证深度, Authoring & Runtime 模式

---

## 插件类型选择

| Option | Description | Selected |
|--------|-------------|----------|
| homework（作业） | 教师布置作业→学生提交→教师查看批改。与 quiz 核心差异：提交周期、批改工作流、异步提交模式。 | ✓ |
| resource（知识源） | 教师上传/管理学习资源→学生浏览。对 insert/getByIndex 动词覆盖偏向内容管理。 | |
| data-agent（数据代理） | AI Agent 按规则访问插件数据生成报告。复杂度最高，可能触碰跨 pluginKey 约束。 | |

**User's choice:** homework（作业）
**Notes:** 推荐选项，与 quiz 差异足够大，数据模型复杂度适中。

| Option | Description | Selected |
|--------|-------------|----------|
| 布置+提交（MVP） | 最简模型：创建作业→提交→查看列表。 | |
| 布置+提交+批改 | MVP + 教师打分和评语。对 update 动词有更多验证价值。 | ✓ |
| 布置+提交+截止 | MVP + 截止时间管理。增加时间约束概念。 | |

**User's choice:** 布置+提交+批改
**Notes:** 最完整模型，对泛化验证最有力。

| Option | Description | Selected |
|--------|-------------|----------|
| 双表：assignments + submissions | 与 quiz 双表模式类似但语义不同。 | |
| 三表：assignments + submissions + grades | 批改信息独立为 grades 表，多表关联验证更有力。 | ✓ |
| 单表：homework_entries | 作业和提交合并，最简单。 | |

**User's choice:** 三表：assignments + submissions + grades
**Notes:** 对 upgrade/uninstall 迁移验证最有力。

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂布置 + 课后提交 | 异步模式，与 quiz 同步答题差异最大。 | |
| 纯课后独立入口 | 跳过 classroom session 集成验证。 | |
| 课堂内同步完成 | 与 quiz 相同的实时同步模式。 | ✓ |

**User's choice:** 课堂内同步完成
**Notes:** 保持与 quiz 一致的 classroom 模式。

---

## 泛化修复策略

| Option | Description | Selected |
|--------|-------------|----------|
| 边建边修 | 构建 homework 最小可用版本，遇到 quiz 假设时立即修复。 | ✓ |
| 先审后建 | 先全面审查 quiz 硬编码，一次性修复后再构建。 | |
| 只修阻断 | 只修复真正阻断 homework 的假设，其他保留为 known pattern。 | |

**User's choice:** 边建边修（推荐）
**Notes:** 修复有明确触发条件，不会过度工程化。

| Option | Description | Selected |
|--------|-------------|----------|
| 阻断性+命名性 | 必须修：阻断 homework 的假设、硬编码 'quiz' 字符串。可保留：quiz 特有业务逻辑。 | ✓ |
| 全部 quiz 引用 | 搜索替换所有 quiz 硬编码，blast radius 最大。 | |
| 仅 DTO/allowlist 层 | 只修入口层的泛化问题。 | |

**User's choice:** 阻断性+命名性（推荐）
**Notes:** 精准范围，不引入无关变更。

| Option | Description | Selected |
|--------|-------------|----------|
| 跨插件回归测试 | 同时跑 quiz + homework 的 vitest 测试，关键节点双绿。 | ✓ |
| 仅 homework 测试 | 只跑 homework 测试，quiz 回归留给 close gate。 | |
| 手动验证 | 手动跑 quiz 全流程。 | |

**User's choice:** 跨插件回归测试（推荐）
**Notes:** 与 v4.1 verify:phase 组合 alias 模式一致。

| Option | Description | Selected |
|--------|-------------|----------|
| allowlist + DTO + 编译链 | plugin 接入的第一道关卡，最可能硬编码 quiz。 | ✓ |
| marketplace lifecycle | install/upgrade/uninstall 流程的迁移逻辑。 | |
| governance + command bus | 治理审计和命令路由层。 | |

**User's choice:** allowlist + DTO + 编译链（推荐）
**Notes:** 优先审查入口层。

---

## Marketplace 验证深度

| Option | Description | Selected |
|--------|-------------|----------|
| 全链路五阶段 | install → authoring → classroom runtime → upgrade → uninstall → 重装恢复。 | ✓ |
| 核心三阶段 | install → authoring → classroom runtime，跳过 upgrade/uninstall。 | |
| install + upgrade 重点 | 重点验证最可能暴露 quiz 假设的环节。 | |

**User's choice:** 全链路五阶段（推荐）
**Notes:** 与 v4.0 quiz 全链路对标。

| Option | Description | Selected |
|--------|-------------|----------|
| 对标 quiz：零丢失 + schema change | 包含真实 schema change，验证 backfill→verify→cutover。 | ✓ |
| 仅 verify：无 schema change | 只做 version bump 验证。 | |
| dry-run only | 只做 dry-run，不执行真实 cutover。 | |

**User's choice:** 对标 quiz：零丢失 + schema change
**Notes:** 对 quiz-only 迁移逻辑的最强验证。

| Option | Description | Selected |
|--------|-------------|----------|
| 对标 quiz + 重装恢复 | retain → cleanup → 重装后数据清零但功能正常。 | ✓ |
| 对标 quiz 即可 | retain + cleanup + active-session blocker。 | |
| 仅 retain | 只验证软禁用。 | |

**User's choice:** 对标 quiz + 重装恢复
**Notes:** 额外验证 pluginKey 复用不影响新安装。

| Option | Description | Selected |
|--------|-------------|----------|
| 阶段性对照检查点 | 关键里程碑双绿，不要求每次修改都同步对照。 | ✓ |
| 全程同步对照 | 每次修改后都跑完整双插件测试。 | |
| 最终对照即可 | 只在 close gate 阶段做跨插件回归。 | |

**User's choice:** 阶段性对照检查点
**Notes:** 平衡安全与效率。

---

## Authoring & Runtime 模式

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 step editor + 差异化字段 | 新增 homework 步骤类型，复用 LexoRank、step type 选择器。 | ✓ |
| 独立 homework 创作面板 | 创建独立作业池，lesson step 中引用。 | |
| 与 quiz 完全相同的 editor | 最小泛化验证价值。 | |

**User's choice:** 复用 step editor + 差异化字段
**Notes:** 平衡复用与差异化。

| Option | Description | Selected |
|--------|-------------|----------|
| 文本提交 + 可选附件 | 文本输入 + 可选文件/链接，append-only/isLatest。 | ✓ |
| 仅文本提交 | 最简模式。 | |
| 文件上传为主 | 涉及文件存储，增加新集成复杂度。 | |

**User's choice:** 文本提交 + 可选附件
**Notes:** 与 quiz 选项点击模式形成足够差异。

| Option | Description | Selected |
|--------|-------------|----------|
| /classroom 新增 tab | 在控制室新增「作业提交」sibling tab，与 v4.1 模式一致。 | ✓ |
| 独立批改页面 | 创建 /teacher/homework/review 新路由。 | |
| 仅列表查看 | 只看到提交列表，不批改。 | |

**User's choice:** /classroom 新增 tab（推荐）
**Notes:** 复用 classroom 布局和访问控制。

| Option | Description | Selected |
|--------|-------------|----------|
| 自动评分 + 人工评语 | 系统给基础分，教师可覆盖并加评语。 | ✓ |
| 教师手动逐条批改 | 纯人工批改，与 quiz 自动判分对比最大。 | |
| 仅评语无分数 | 只给文字反馈，不打分。 | |

**User's choice:** 自动评分 + 人工评语
**Notes:** 保持人工在环的批改模式。

---

## Claude's Discretion

- homework 插件的 `dataModel.ts` 具体字段设计（列名、类型、约束）
- 自动评分的具体算法（字数比例、完整性检查）
- homework 步骤在 lesson step type 枚举中的注册方式
- 泛化修复时具体代码改动范围

## Deferred Ideas

- homework 异步提交模式（课堂布置、课后提交）
- 批改工作流增强（批量批改、rubric 评分标准）
- 文件上传功能（真正的文件存储）
- QUIZ-EXT-03（AI 出题）
- MKT-EXT-01/02（marketplace extras）
- STORE-01（商业 storefront）
- 第三插件类型泛化验证
