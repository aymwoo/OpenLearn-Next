# Domain Pitfalls — v3.1 单校试点生产可用 / 插件能力先行

**Domain:** 在现有课堂闭环、WebSocket-first transport、SQLite + DAL durable truth、插件治理与 command/event 基础上，把系统推进到“单校试点可生产使用”，并以**课堂互动插件**与**教师设计 → 学生课堂完成**真实链路作为样板。  
**Researched:** 2026-05-24  
**Confidence:** HIGH

## 本 milestone 的判断前提

- v3.0 已把 platform core 第一阶段打底完成；v3.1 不应再把主要价值写成抽象平台升级。
- v3.1 的成败，不看“又补了多少内核名词”，而看**单校试点是否真能跑、真有人能用、真有 operator 能守住**。
- 因此本 milestone 最危险的坑，不是“技术做不出来”，而是**方向做偏**：只做 infra、不做样板；只做 happy path、不做恢复；只谈生产化、不交付生产可操作性。

## Recommended phase buckets referenced below

| Phase Bucket | Focus |
|---|---|
| Phase A | 试点目标收敛与样板链路冻结 |
| Phase B | 课堂互动插件 contract + authoring/runtime integration |
| Phase C | 教师设计 → 发布/开课 → 学生参与/提交 → 课堂完成真实样板 |
| Phase D | 恢复、回退、operator、support surfaces |
| Phase E | Rollout、runbook、容量假设、试点验收 |

## Critical Pitfalls

| Pitfall | Why It Hurts | Prevention | Where To Address |
|---|---|---|---|
| 把“生产可用”写成泛化口号，而不是单校试点可验证标准 | 最常见结果是 roadmap 上全是 reliability、security、ops、governance、scale 等正确废话，但没人能回答：哪所学校、哪类课堂、哪种插件、哪条链路必须先跑通。范围会无限膨胀，最后既不生产，也不可验收。 | 把“生产可用”改写成**单校试点判定条件**：目标用户、日活课堂量、并发假设、允许的人工介入比例、必须可恢复的故障类型、必须出具的 operator/runbook/proof artifact。每个 phase 都绑定试点验收口径。 | Phase A |
| 只做 infra，不做真实样板链路 | v3.0 已经证明 platform 内核可以持续推进。v3.1 如果继续主要交付 registry、contracts、capabilities、host seam，而不把“教师设计 → 学生课堂完成”打穿，就会再次得到“平台更完整，但学校仍不能试点”的结果。 | 把**真实样板链路**设成 milestone 主线，不是 demo 附件。要求每个基础设施任务都明确挂靠到样板链路上的一个具体节点，否则 defer。优先交付课堂互动插件的 authoring、launch、student runtime、evidence、operator visibility 全链路。 | Phase A / Phase C |
| 只做 happy path，不做恢复/补偿/回退 | 教育场景最怕课上出错：教师误操作、学生断线、插件半安装、课堂状态漂移、提交重复、浏览器刷新、WebSocket 抖动。如果只验证“第一次顺利跑通”，试点时会直接在真实课堂暴露。 | 对每条主链路补齐恢复设计：断线重连、重复提交幂等、插件启停失败恢复、课堂锁定/解锁回放、发布后回滚、任务失败可重试、operator 可手动干预。验收必须包含故障注入，不接受只跑 happy path。 | Phase C / Phase D |
| 把 Redis / WebSocket / worker memory 误当 durable truth | 当前项目已经反复强调 SQLite + DAL 才是业务真相源。v3.1 如果为了“更实时”“更快”而把课堂状态、插件运行态、任务结果、在线名单只留在 Redis/WebSocket/in-memory，会在重启、断连、多实例、回放时出现不可恢复分叉。 | 继续坚持：Redis/WebSocket 只做 delivery / fanout / ephemeral session state；canonical classroom truth、plugin state、submission/evidence、operator audit 必须可从 SQLite + DAL 重建。任何“实时状态”都要回答掉线后如何按 durable truth 恢复。 | Phase B / Phase C / Phase D |
| 把插件先行理解成“先做插件框架”，而不是“先做插件价值样板” | 插件先行若落成纯框架工作，会继续堆 lifecycle、manifest、registry、diagnostics，却没有证明学校真正需要的互动插件能稳定上课、收证据、被教师理解。结果是架子更漂亮，插件能力更抽象，产品价值更远。 | 定义 1 个强样板插件类型，并按产品价值倒推能力：例如课堂互动问答/投票/抢答/即时反馈插件。先做它真正需要的 authoring schema、runtime contract、evidence read model、operator hooks，再回抽成通用能力。 | Phase B / Phase C |
| operator 面只对研发友好，不对校内运营/实施友好 | 如果 operator surface 只暴露 command ids、event timelines、raw diagnostics、internal reason codes，研发能看懂，学校实施、教研管理员、客服 support 看不懂，试点就会高度依赖开发介入，无法称为生产可用。 | operator 面必须区分角色：研发诊断视图保留技术细节；试点运营视图提供“发生了什么、影响哪些课堂、现在建议做什么”的业务语言与可执行恢复动作。所有关键错误都要有面向非研发角色的 next step。 | Phase D |
| 不做 rollout / runbook / oncall-like 操作手册 | 单校试点不是本地 demo。没有 rollout plan、回滚条件、灰度策略、课堂前检查单、故障应对步骤、值守分工，就会把每次上线都变成现场赌博。 | milestone 明确交付：pilot rollout plan、课前 checklist、插件启用/停用流程、降级矩阵、回滚路径、值守 runbook、验收 runbook。没有 runbook，不算 close。 | Phase D / Phase E |
| 忽略 load / capacity 假设，只说“先单校，不会有量” | 单校不等于低压。真实试点可能同一节次几十个班并发、多个教师同时 launch、学生同时进课、插件同时广播/提交。若不预设容量模型，就会把性能问题留到试点当天。 | 明确最小容量假设：同时在线课堂数、单课堂人数、峰值提交频率、插件广播频次、operator 可接受延迟。基于这些假设做 targeted load test，而不是等以后“更大规模再说”。 | Phase E |

## Moderate Pitfalls

| Pitfall | Why It Hurts | Prevention | Where To Address |
|---|---|---|---|
| 样板链路定义不完整，只覆盖教师和学生，不覆盖发布/开课/结束/复盘 | 课堂闭环不是“能看到一个插件渲染出来”就算完成。缺发布、launch、课堂结束、证据回看、课后确认，会导致所谓样板只是局部功能拼接。 | 样板链路必须按真实生命周期冻结：教师设计 → 预览 → 发布 → launch/classroom → 学生加入/互动/提交 → 课堂完成 → evidence/summary/operator 可追。 | Phase A / Phase C |
| 把插件 authoring 与 classroom runtime 当两套孤岛 | 很多系统能配插件，但配置结果无法稳定投射到学生课堂；或学生课堂行为回不来教师/评价/证据面。这样插件只是“编辑器里的选项”，不是课堂能力。 | authoring schema、published snapshot、runtime payload、student evidence、teacher review 必须共享同一 canonical contract。发布版本一旦冻结，课堂读取必须可重复重建。 | Phase B / Phase C |
| 只验证单插件 happy case，不验证多插件共存和失败隔离 | 单个互动插件跑通不代表真实课堂可用。实际课堂会混合 content/task/quiz/plugin steps，甚至多个插件订阅同类事件。若没有隔离，单插件失败会拖垮整节课。 | 至少验证：单插件链路、插件与原生 step 混排、插件失败时课堂仍可继续、插件禁用/卸载后历史课堂证据可读。 | Phase B / Phase D |
| 课堂实时体验优化压过正确性 | 为了“看起来快”，容易让前端本地状态、WebSocket event、临时缓存先行，最后教师看到已发布、学生看到未解锁、operator 看到另一套状态。 | 先保证 authoritative write/read path 正确，再做体验优化。所有 optimistic UI 都必须能被 durable truth 校正；关键课堂状态必须可刷新重建。 | Phase C |
| 生产化工作只落在技术面，不落在产品约束面 | 如果只补 tracing、alerts、retries，却不限制教师能做什么、插件能何时启用、课堂前要完成哪些检查，系统仍会在真实使用中失控。 | 生产可用必须同时包含**产品 guardrails**：插件启用前置条件、课堂 readiness 检查、资源缺失提示、风险操作确认、教师端状态可见。 | Phase C / Phase D |
| 缺少试点数据保留与清理边界 | 单校试点会积累真实课堂数据、提交、插件日志、operator 记录。若 retention/cleanup 语义模糊，后续会出现数据过多、隐私风险、试点环境污染。 | 为插件数据、课堂证据、operator audit、临时诊断日志定义 retention policy 与 cleanup 触发条件；cleanup 要保守且可审计。 | Phase D / Phase E |
| 验收标准只看“功能已上线”，不看“support 成本” | 很多功能 technically available，但每次出问题都要研发手工查 DB、重放事件、帮教师恢复。这样的系统不能进入真实试点。 | 增加 supportability 指标：常见故障是否可由 operator/实施同学恢复；是否无需改代码即可定位；是否有用户可理解提示。 | Phase D / Phase E |

## Minor but recurring pitfalls

| Pitfall | Why It Hurts | Prevention | Where To Address |
|---|---|---|---|
| 把 proof artifact 当收尾文档，而不是 phase 设计输入 | 过去 milestone 已多次留下 verification/proof 缺口。若 v3.1 继续先做代码、最后补证明，close 时仍会失真。 | 每个 phase 启动时就定义 proof：要跑哪条样板链路、注入哪些故障、由谁执行、产出什么 artifact。 | Phase A onward |
| 用研发内部词汇命名面向学校的概念 | “command replay”“transport degraded”“plugin reconcile” 这类词直接给学校方，会造成理解负担。 | 学校/教师/operator 面用业务语言；内部术语仅留在工程/诊断层。 | Phase D |
| 过早承诺“可扩到多校/平台化 marketplace” | v3.1 的目标是单校试点生产可用，不是一次性证明多租户插件生态。过早承诺会把 scope 拉回泛平台。 | 所有叙述都加上试点边界：先把单校跑稳，再考虑跨校、多租户、开放 marketplace。 | Phase A |
| 把容量测试做成 synthetic benchmark，不贴近课堂行为 | 单纯压接口 QPS 不能说明课堂是否可用。真实风险来自 join burst、同时提交、课堂广播、教师连续操作。 | 负载验证按课堂场景建模，而不是按裸 API。优先测关键交互序列。 | Phase E |

## Phase-specific warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Phase A 试点定义 | 范围写成“整体生产化升级”，没有单校样板和验收口径 | 先冻结试点学校画像、课堂样板、插件类型、容量假设、close gate |
| Phase B 插件能力 | 只做通用框架，不做课堂互动插件真实能力 | 以样板插件倒推 contract、schema、runtime、evidence |
| Phase C 样板链路 | 只打通设计和展示，不补发布、开课、提交、结束、证据闭环 | 按完整课堂生命周期做集成验证 |
| Phase D 恢复与 operator | 只有研发能恢复，operator 无法处理真实故障 | 建双层 operator surface + runbook + 可执行恢复动作 |
| Phase E rollout 与容量 | 没有灰度、回滚、容量边界，试点靠现场扛 | 上线前完成 rollout rehearsal、负载验证、故障演练 |

## 对 roadmap 的直接含义

1. **先定义样板，不先扩平台。** v3.1 的 phase 1 应该是“试点样板与 close gate 冻结”，不是再开一轮抽象平台规划。  
2. **基础设施必须服务于真实插件链路。** 任何 plugin/runtime/operator 工作，若不能解释它改善了哪一段样板链路，应降级优先级。  
3. **恢复与运营面不是 polish，而是生产定义本身。** 没有恢复、runbook、rollout、capacity 假设，不能称为“单校试点生产可用”。

## Sources

- `.planning/PROJECT.md` — 当前系统 durable truth、WebSocket-first、Redis optional delivery、plugin/platform 边界与下一 milestone 规划 posture。Confidence: HIGH.
- `.planning/MILESTONES.md` — v2.2/v2.3/v3.0 的 close 方式、accepted gaps、proof artifact 缺口与 operator/rollout 经验。Confidence: HIGH.
- `.planning/STATE.md` — 当前 milestone 已归档、下一轮需要重新定义 focus，且已有多项 deferred/proof lessons 可直接吸收。Confidence: HIGH.
- `.planning/research/PITFALLS.md`（旧版 v3.0）— 提供 platform-first 阶段常见坑的历史基线，本次已据 v3.1 目标重写为 trial-production/sample-chain posture。Confidence: HIGH.
