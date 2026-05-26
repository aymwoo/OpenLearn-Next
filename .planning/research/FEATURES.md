# Feature Landscape — v3.1 单校试点生产可用 / 课堂互动插件样板

**Milestone:** v3.1  
**主题:** 单校试点生产可用，插件能力先行，围绕“教师设计 → 发布 → 开课 → 课堂互动插件执行 → 学生完成 → 教师/运营验证”主链路交付真实样板  
**Researched:** 2026-05-24  
**Confidence:** HIGH

## Milestone Framing

这一轮不是“泛生产化补全清单”，也不是“把整个平台做成通用插件市场”。

这一轮要解决的是更具体的问题：

> **OpenLearn Next 是否已经能在单校试点场景里，以一个真实可用的课堂互动插件样板，稳定跑通教师端设计到学生端课堂完成的主链路，并且让运维/产品团队敢上线、敢观测、敢回滚、敢恢复。**

因此，本 milestone 的 feature 取舍必须服从下面三个判断：

1. **必须服务真实样板链路**，不是脱离产品主链路的抽象平台能力。
2. **必须服务试点生产可用**，不是只在本地 demo 可跑。
3. **必须优先让插件 action 真正可用**，不是只有 registry / descriptor / mock 调用。

### 本轮真实样板主链路

1. 教师创建/编辑一节课，配置课堂互动插件步骤
2. 教师发布 lesson / classroom-ready 版本
3. 教师发起课堂，会话与学生入班成功
4. 课堂中插件 action 被真实触发，并能影响学生端体验/状态
5. 学生完成互动、提交结果、进度落库
6. 教师看到结果与课堂状态，运营能观测异常并排障
7. 出现失败时，系统可以重试、补偿、恢复，而不是只能人工改库

### 本轮不应误入的方向

- 不做“全平台生产化百科全书”
- 不做完整插件 marketplace 生态
- 不做多校、多租户、大规模 SaaS 运维体系
- 不做完整 workflow engine / agent runtime 扩张
- 不重写课堂实时主链路，只验证它能承载真实插件样板

---

## Table Stakes

下面这些能力不是“锦上添花”，而是 v3.1 要称为“单校试点生产可用”时必须具备的基础面。

| Feature Category | Table Stakes | Why It Is Required | Complexity | Notes |
|---|---|---|---|---|
| 多环境配置 | 本地 / staging / pilot-prod 环境变量分层、插件开关、外部依赖连接策略清晰 | 没有环境分层就无法做试点演练、灰度、回滚 | 中 | 重点不是环境数量，而是配置边界清楚、不会手改常量上线 |
| CI/CD | 最小可用发布流水线：lint/typecheck/test/build/migrate/deploy/health-check | 单校试点也需要可重复发布，不可依赖手工 SSH 发布 | 中 | 要支持数据库迁移前置检查和失败中止 |
| 可观测性与运维 | 课堂会话、插件 action、Command Bus、异步任务、WebSocket/Redis degraded posture 可观测 | 样板能不能跑，不看主观感觉，要看日志、指标、审计与 operator surface | 中-高 | 必须能按 school/classroom/plugin/action 查问题 |
| 备份恢复 | SQLite 文件/数据快照、恢复演练、恢复后最小校验 | 单校试点最怕一次误操作或部署事故直接丢课堂数据 | 中 | 先做可执行 runbook，不追求企业级灾备 |
| 幂等/补偿 | 发布、开课、插件 action、异步后处理具备重复调用保护或补偿动作 | 课堂现场最常见问题不是代码报错，而是“点了两次”“网络抖动”“半成功” | 高 | 本轮至少覆盖样板主链路的关键写操作 |
| 数据校验 | lesson/plugin config/student submission/operator input 都有强校验与错误分类 | 插件样板一旦配置脏数据，课堂现场无法救火 | 中 | 必须区分用户可修复 vs 系统异常 |
| 高并发课堂压测 | 单课堂高并发学生加入、同步、互动提交、教师广播有可重复压测结果 | “单校试点”不等于低并发；一节公开课就能把链路压穿 | 高 | 重点是典型班级峰值与极端峰值，不是互联网级规模 |
| 插件 action 真实可用 | 至少一类课堂互动插件 action 从教师配置到学生执行、结果写回完全真实 | 这是本 milestone 的样板核心，不成立则整轮偏题 | 高 | 不能只停留在 descriptor、catalog、governance UI |

### Table Stakes 的产品/运维拆分

#### 产品侧必须成立

- 教师能理解并完成插件步骤配置
- 课堂前存在 readiness/preflight，能提前发现插件未启用、依赖缺失、配置非法
- 学生端交互结果能形成明确完成态，而不是“看起来点过了”
- 教师端能看到互动是否开始、是否完成、是否失败、失败了多少人

#### 运维侧必须成立

- 能知道当前发布的是哪个版本、哪个 migration、哪个 plugin build
- 能快速判断故障在配置、插件 action、课堂 transport、异步任务还是外部依赖
- 能在不改库的前提下做 retry / reconcile / suspend / fallback
- 能在试点学校现场提供最小可执行 runbook

---

## Sample-Chain Must-Haves

这部分不是通用 table stakes，而是**为了让真实样板链路成立**必须交付的功能簇。它们应该优先于泛化能力进入 roadmap。

### 1. 教师设计链路必须具备的能力

#### Must-Haves

- **互动插件步骤可插入 lesson editor**，且与现有 step model 正常共存
- **插件步骤配置表单**：有 schema 驱动校验、默认值、必填提示、错误回显
- **插件能力可见性**：教师只能看到本校可用、已启用、当前版本兼容的插件 action
- **预览/模拟执行**：教师在发布前至少能做最小预检，而不是上课才发现不能用
- **发布前 preflight**：检查 plugin enabled state、action resolvable、配置合法、依赖完备

#### Why must ship

如果教师配置环节不稳，后面所有“生产可用”都只是运维替教师兜底。

### 2. 发布与版本切换必须具备的能力

#### Must-Haves

- lesson publish 必须把插件配置固化进可执行版本，而不是课中读草稿态
- publish / republish 必须具备 **幂等性**，避免重复发布产生多份模糊状态
- 版本失败要有 **可解释错误**，不是统一的“发布失败”
- migration 与 plugin compatibility 有最小门禁，避免旧配置上线后在运行期爆炸

#### Why must ship

试点阶段最危险的问题不是“不能发布”，而是“发布成功但课堂时才发现版本不一致”。

### 3. 开课与课堂运行必须具备的能力

#### Must-Haves

- 教师发起课堂时，系统能验证本节课涉及的插件样板已 ready
- classroom session 启动时，插件 runtime state 与 lesson version 对齐
- 课堂中教师触发插件 action 时，有明确的 command/result/audit 记录
- 插件 action 触发失败时，教师 UI 必须收到可理解反馈，operator 能看到失败原因
- 课堂 transport 继续以既有 WebSocket-first posture 为主，但要验证插件样板不会破坏实时链路

#### Why must ship

“插件能力先行”的含义不是后台能装插件，而是**课堂里真的能用，而且不会把既有课堂链路打穿**。

### 4. 学生完成链路必须具备的能力

#### Must-Haves

- 学生端能接收并渲染插件交互状态
- 学生动作提交有输入校验、重复提交保护、超时/失败反馈
- 插件结果能回写 canonical progress / submission / evidence 体系
- 学生刷新、掉线、重连后，能恢复到合理状态，不因插件步骤直接丢失上下文
- 教师可看到学生完成率、失败率、未响应名单或聚合结果

#### Why must ship

只有学生端真的完成并写回真相源，这条样板链路才有产品价值；否则只是教师端的“插件演示”。

### 5. 运营与故障处理必须具备的能力

#### Must-Haves

- operator 可以看到：school、classroom、lesson version、plugin、action、command、task 的关联视图
- 对可恢复故障提供显式动作：retry、reconcile、resume、suspend、fallback
- 有最小告警/异常汇总面：例如 action failure spike、classroom join failure、submission timeout
- 关键日志与审计信息可追溯到具体课堂与插件步骤
- 有备份、恢复、试点现场排障 runbook

#### Why must ship

单校试点不是开发团队坐在本地盯控制台；它要求现场出问题时别人也能处理。

---

## Deferred / Future

下面这些不是“不重要”，而是**不应该抢走 v3.1 对真实样板主链路的火力**。

| Deferred / Future Item | Why Defer | What To Do Instead In v3.1 |
|---|---|---|
| 通用插件 marketplace、安装评分、商店工作流 | 会把样板验证变成生态建设 | 只交付受控内置/试点插件安装与启停治理 |
| 多校多租户完整运营体系 | 当前目标是单校试点，不是 SaaS 扩张 | 把 school scope、数据隔离、operator 查询边界做干净 |
| 全量平台生产化清单 | 范围太散，会淹没样板主链路 | 只围绕课堂互动插件样板所需的生产能力建设 |
| 完整灾备/跨地域恢复 | 超出 SQLite-first 单校试点合理投入 | 做可执行备份恢复与恢复校验演练 |
| 全面 OTel/Tracing 平台、复杂可视化运维中台 | 实施成本高，收益超前 | 先把 command/action/classroom/task 级日志、指标、审计打通 |
| 通用工作流引擎/审批引擎 | 会把插件 action 样板拖入平台泛化 | 只保留最小 retry/reconcile/compensation 语义 |
| Agent Runtime / Skill Runtime 真执行 | 与当前主题不匹配，风险高 | 仅保留 agent-callable descriptor 与审计位 |
| 任意第三方插件远程执行 | 安全边界不可控 | 继续坚持声明式、受控 action、无 arbitrary code execution |
| 大规模互联网级压测体系 | 与单校试点容量不匹配 | 做“单课堂峰值 + 多课堂有限并发”的定向压测 |

### 本轮明确不该做的 anti-features

- 以“生产化”为名重开数据库、实时链路、插件执行沙箱三条大改造
- 以“插件先行”为名交付一套只有 operator 能看懂、教师不会用的系统
- 以“样板”为名只做 happy path，不做失败恢复、重复提交、重试补偿
- 以“可观测性”为名只堆原始日志，不提供 classroom/plugin/action 维度定位能力

---

## Notes For Requirement Categories

为了后续写 REQUIREMENTS / ROADMAP，建议按下面的 requirement categories 切，而不是按技术组件散写。

### 1. `SAMPLE-CHAIN`：样板主链路需求

关注教师设计 → 发布 → 开课 → 插件互动 → 学生完成 → 教师验证这条链路本身。

建议包含：

- 插件步骤 authoring
- lesson versioning / publish preflight
- classroom runtime readiness
- student interaction completion
- teacher evidence / summary visibility

**判断标准：** 没有它，样板链路就断。

### 2. `PLUGIN-PROD`：插件真实可用需求

关注“插件 action 真能在产品里工作”，不是 registry 演示。

建议包含：

- action resolve / dispatch / result contract
- plugin enabled/install/version compatibility
- action input/output schema validation
- action failure reason taxonomy
- operator recovery actions

**判断标准：** 没有它，插件只是平台能力，不是产品能力。

### 3. `ENV-RELEASE`：多环境与发布安全需求

关注从开发到试点环境的交付稳定性。

建议包含：

- env layering / secrets discipline
- migration gate
- build artifact/version traceability
- staged deployment / rollback posture
- release checklist / health-check

**判断标准：** 没有它，就不该叫试点生产可用。

### 4. `OPS-OBS`：可观测性与运维需求

关注现场能否看得见、查得出、处理得了。

建议包含：

- command / plugin / classroom / task 关联观测
- degraded posture honesty
- operator diagnostics
- runbook / alert surface
- school/classroom/plugin/action drill-down

**判断标准：** 没有它，出问题只能靠开发者猜。

### 5. `DATA-SAFETY`：数据安全与恢复需求

关注配置、课堂结果、提交真相源的正确性与可恢复性。

建议包含：

- schema/input validation
- backup / restore / post-restore checks
- append-only 或 canonical write discipline
- idempotency key / dedupe / compensation
- replay-safe mutation semantics

**判断标准：** 没有它，试点越真实，风险越高。

### 6. `PERF-LOAD`：课堂峰值与压测需求

关注真实课堂容量，而不是理论扩展性。

建议包含：

- 单课堂加入峰值
- 课堂内互动 action fanout
- 学生提交高峰
- reconnect / retry 行为
- 压测基线与通过阈值

**判断标准：** 没有它，样板一到公开课或年级演示就可能失真。

---

## MVP Recommendation

v3.1 的 MVP 不是“插件平台更完整”，而是：

> **一所学校里，教师能稳定配置并发布一节含课堂互动插件的课；课堂中教师能真实触发插件 action；学生能完成互动并写回结果；运营能观测、重试、恢复并完成一次真实试点交付。**

优先顺序建议：

1. **样板主链路打通**：教师设计 → 学生完成
2. **插件 action 真可用**：不是 registry demo
3. **上线/回滚/恢复能力**：试点生产可用底线
4. **课堂峰值验证**：证明样板不是只适合小范围演示
5. **再做泛化整理**：将经验沉淀回平台 contract

---

## Sources

- `/home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md` — 当前产品定位、约束、既有能力、下一 milestone 边界。Confidence: HIGH.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/MILESTONES.md` — 已归档 milestone 的交付面与 deferred 边界，帮助识别 v3.1 不应重开的范围。Confidence: HIGH.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/STATE.md` — 当前处于 milestone planning 状态、遗留 tech debt 与 deferred items。Confidence: HIGH.
