# Requirements — Milestone v3.2 AI LessonAgent 起草闭环

**Goal:** 把 v3.0 已就绪的 AI-native contract 兑现成一个真正可用的 LessonAgent —— 教师可触发 AI 起草一节课的步骤包，经审校后通过既有发布链路落地，全程经 Command Bus / 工具层治理，不破坏 SQLite-first、DAL-only、no-arbitrary-code 约束。

**Scope rule:** 本轮只打穿单个 Agent 的单条起草链路（强样板优先，N=1 先跑通）。复用 v3.0 Command Bus / action registry / event bus，不重建平台内核。

## v3.2 Requirements

### AI Provider 抽象层 (PROV)

- [x] **PROV-01**: 系统能通过统一的 provider 接口调用 LLM 完成一次文本/结构化生成，provider 实现可替换而不影响调用方。
- [x] **PROV-02**: provider 密钥只在服务端 Node runtime 读取，绝不出现在客户端、Edge runtime、插件 manifest 或返回给浏览器的响应中。
- [x] **PROV-03**: 教师触发的 AI 调用受限流/配额保护，超限时返回明确的可读错误而非静默失败或卡死。
- [x] **PROV-04**: provider 调用失败（超时、上游错误、解析失败）时返回 typed 错误，调用链能区分可重试与不可重试。

### LessonAgent 工具层 (AGENT)

- [ ] **AGENT-01**: LessonAgent 暴露一组 Zod 校验的 typed tools，所有输入输出在边界处被校验，非法 payload 被拒绝。
- [ ] **AGENT-02**: Agent 工具只能通过 DAL / Command Bus 读写数据，不能直连数据库、不能访问 provider key、不能执行任意代码。
- [x] **AGENT-03**: 教师能针对一节目标课时触发 LessonAgent 起草，Agent 产出符合 `content`/`task`/`quiz` 原子步骤 schema 的步骤包。
- [x] **AGENT-04**: Agent 起草过程的关键节点（开始、工具调用、完成、失败）作为 typed platform events 写入 v3.0 event bus，可被 operator 追溯。

### AI 起草链路 (DRAFT)

- [x] **DRAFT-01**: Agent 起草结果通过 Command Bus 写入 draft lesson version，复用既有 publish/version 模型，不新建第二真相源。
- [x] **DRAFT-02**: 起草写入是幂等且 replay-safe 的：同一起草请求重试不会产生重复 draft 或污染已有课时内容。
- [x] **DRAFT-03**: draft lesson version 与教师手工编辑的课时在数据上可区分（标注 AI 来源），且不会自动发布给学生。

### 教师审校面 (REVIEW)

- [ ] **REVIEW-01**: 教师能在审校界面看到 AI 起草内容与当前课时的 diff（新增/修改/删除的步骤）。
- [ ] **REVIEW-02**: 教师能逐项或整体编辑 AI 起草的步骤后再决定去留。
- [x] **REVIEW-03**: 教师能接受 AI 起草并使其进入既有发布链路，或丢弃起草且不影响原课时。
- [ ] **REVIEW-04**: 审校界面对齐 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA）。

### Eval + Guardrails + Close Gate (EVAL)

- [x] **EVAL-01**: 存在一组可重复运行的 eval，验证 LessonAgent 起草输出在 schema 合法性与基本教学结构上达标。
- [x] **EVAL-02**: 存在 guardrails 阻止 Agent 输出越界（非法 step 类型、超长、注入既有约束禁止的内容），越界输出被拦截并记录。
- [x] **EVAL-03**: 提供 `verify:phase` close gate，对 AI 起草链路做端到端回归校验，作为里程碑 close 的单一权威闸门。

## Future Requirements (Deferred)

- 多 Agent 协作编排（HomeworkAgent / DataAgent / TutorAgent / ParentAgent）。
- RAG / 向量库（Qdrant）驱动的教材资源检索增强起草。
- MCP 外部工具接入与第三方上下文协议。
- 插件触达 AI（plugin 调用 Agent / tools）。
- AI 起草的多语言、多学科 prompt 体系化与模板库。
- provider 多模型路由、成本优化与 A/B。

## Out of Scope

- 让插件直接访问 provider key、Agent 或 tools。
- 在 Edge runtime 执行 provider / DB / Agent 逻辑。
- 把 AI 起草结果绕过 DAL / Command Bus 直接写库。
- 新建独立于既有 lesson/publish/version 模型的第二套课时真相源。
- 任意第三方代码执行、`eval()`、远程动态 import。
- 多校多租户、PostgreSQL/pgvector cutover、重型 observability 平台迁移（延续既有 deferred）。
- 一次性把 v3.0 之后所有 Agent/Skill/Capability 扩张打包进本里程碑。

## Traceability

Every v3.2 requirement maps to exactly one phase. Coverage: 18/18.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | Phase 61 | Complete |
| PROV-02 | Phase 61 | Complete |
| PROV-03 | Phase 61 | Complete |
| PROV-04 | Phase 61 | Complete |
| AGENT-01 | Phase 62 | Pending |
| AGENT-02 | Phase 62 | Pending |
| AGENT-03 | Phase 62 | Complete |
| AGENT-04 | Phase 62 | Complete |
| DRAFT-01 | Phase 63 | Complete |
| DRAFT-02 | Phase 63 | Complete |
| DRAFT-03 | Phase 63 | Complete |
| REVIEW-01 | Phase 64 | Pending |
| REVIEW-02 | Phase 64 | Pending |
| REVIEW-03 | Phase 64 | Complete |
| REVIEW-04 | Phase 64 | Pending |
| EVAL-01 | Phase 65 | Complete |
| EVAL-02 | Phase 65 | Complete |
| EVAL-03 | Phase 65 | Complete |
