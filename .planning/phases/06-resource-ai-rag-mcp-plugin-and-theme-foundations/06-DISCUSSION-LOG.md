# Phase 06: Resource, AI/RAG/MCP, plugin, and theme foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 6-Resource, AI/RAG/MCP, plugin, and theme foundations
**Areas discussed:** 资源入口与范围, RAG 检索边界, AI Agent 边界, MCP 信任模型, Plugin 与主题

---

## 资源入口与范围

| Question | Options Presented | User's choice |
|----------|-------------------|---------------|
| Phase 6 的最小资源中心应该实际支持哪种资源保存方式？ | 链接+元数据; 本地文件上传; 两者都支持 | 链接+元数据 |
| 资源在 v1 里应该如何归属和可见？ | 教师创建，校内/课程可见; 课程内资源为主; 学校公共资源库 | 教师创建，校内/课程可见 |
| 最小资源类型要锁定到什么粒度？ | 少量枚举类型; 自由文本类型; 完整教材类型体系 | 完整教材类型体系 |
| 完整教材类型体系在 Phase 6 里要落到哪一层？ | 分类元数据体系; 教材目录结构; 完整教材库 | 分类元数据体系 |
| 资源中心首屏应该更像哪种工作台？ | 教师资源卡片库; 开发者配置台; 双入口分区 | 教师资源卡片库 |

**Notes:** “完整教材类型体系”被收敛为分类元数据体系，避免进入生产级教材库、PDF 解析、自动切块和知识图谱范围。

---

## RAG 检索边界

| Question | Options Presented | User's choice |
|----------|-------------------|---------------|
| Phase 6 的 RAG 要做到哪一层才算完成？ | Qdrant-ready 合约; 本地可查 demo; 真实 Qdrant 查询 | Qdrant-ready 合约 |
| RAG metadata 和默认检索过滤必须包含哪些隔离维度？ | 学校+课程+可见性; 学校+年级+学科; 资源级 ACL | 学校+课程+可见性 |
| 既然 Phase 6 不做真实解析，chunk 合约应该如何表达？ | 预留 chunk 元数据; 手工录入片段; 不建 chunk 表 | 预留 chunk 元数据 |
| 默认情况下，哪些资源可以被标记为 RAG eligible？ | 默认关闭，教师显式开启; 课程可见资源默认开启; 只开发者开启 | 默认关闭，教师显式开启 |

---

## AI Agent 边界

| Question | Options Presented | User's choice |
|----------|-------------------|---------------|
| Phase 6 的 AI Agent 要做到哪一层？ | 接口+审计合约; 一个最小模型调用; LessonAgent beta | 接口+审计合约 |
| AI 或 MCP 产生的内容如何进入课堂/课时/学生可见区域？ | 全部需要教师审批; 低风险自动写入; 按 agent 类型决定 | 全部需要教师审批 |
| 五类 Agent 在 Phase 6 里应该都同等建模，还是分层？ | 统一注册，分能力开关; 只实现 Lesson/Homework; 五类完整表结构 | 统一注册，分能力开关 |
| Agent structured output 在 Phase 6 要保存到什么形态？ | proposal + audit log; 只保存 audit log; 直接保存为草稿实体 | proposal + audit log |

---

## MCP 信任模型

| Question | Options Presented | User's choice |
|----------|-------------------|---------------|
| Phase 6 的 MCP 要做到哪一层？ | 注册合约+凭据占位; 可配置真实连接; 内置一个 connector | 注册合约+凭据占位 |
| MCP credential 在 Phase 6 应如何存储？ | 只存引用不存密文; 加密后存 DB; 明文仅本地开发 | 只存引用不存密文 |
| MCP capability 暴露给 AI/插件时应该默认怎么处理？ | 默认禁用，显式授权; 按 server 一键启用; 开发者角色全可见 | 默认禁用，显式授权 |
| MCP audit log 要记录到什么粒度？ | 请求级审计; 只记录失败/拒绝; 完整输入输出 | 请求级审计 |

---

## Plugin 与主题

| Question | Options Presented | User's choice |
|----------|-------------------|---------------|
| Phase 6 插件 manifest 最小范围应该是什么？ | 声明式 JSON manifest; Manifest + 本地代码模块; 只建 schema 不暴露 UI | Manifest + 本地代码模块 |
| 本地代码模块在 Phase 6 里应如何安全落地？ | 系统内置 action handlers; 可信开发者本地模块; 延后代码插件 | 系统内置 action handlers |
| Phase 6 最小 UI hook anchors 应该有哪些？ | dashboard + lesson sidebar; 再加资源卡片; 广泛 anchor 列表 | dashboard + lesson sidebar |
| Phase 6 action allowlist 先开放哪些动作？ | 低风险内部动作; 包含 addPoints; 只做 denied audit | 低风险内部动作 |
| 主题系统在 Phase 6 的最小可用范围是什么？ | 安全 token registry; 完整主题编辑器; 只存 JSON 不应用 | 安全 token registry |

**Notes:** “本地代码模块”被收敛为核心系统内置 allowlisted action handlers；插件 manifest 不允许加载第三方代码、`eval()` 或 remote import。

---

## the agent's Discretion

- Exact table names, DTO names, component splits, audit table organization, and verification script structure are left to downstream agents as long as the locked behavior in `06-CONTEXT.md` is preserved.

## Deferred Ideas

- Production file upload/storage, PDF parsing, automatic chunking, embedding generation, real Qdrant search, real MCP connector calls, real LLM provider calls, third-party plugin code execution, plugin marketplace, broad hook anchors, and full visual theme editor.
