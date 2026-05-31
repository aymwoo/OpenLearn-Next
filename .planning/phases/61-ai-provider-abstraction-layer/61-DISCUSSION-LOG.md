# Phase 61: AI Provider Abstraction Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 61-AI Provider Abstraction Layer
**Areas discussed:** 抽象形态与 provider 选型, 限流/配额落点与粒度, typed 错误模型与重试归属, 结构化输出的边界切分

---

## 抽象形态与 provider 选型

### 底层引擎
| Option | Description | Selected |
|--------|-------------|----------|
| 底层用 Vercel AI SDK | 内建 provider 抽象、结构化输出、与 62 工具调用衔接；STACK 已推荐 | ✓ |
| 自建薄接口包裹 raw fetch | 零依赖，但要自造结构化/重试/多 provider | |
| 自建接口 + AI SDK 做实现(adapter) | 调用方只依赖自有接口 | |

### 调用表面
| Option | Description | Selected |
|--------|-------------|----------|
| 包裹为 OpenLearn facade | 调用方拿不到 SDK 句柄，密钥/限流/错误统一归口 | ✓ |
| 只导出预配 model，调用方直用 SDK | 更薄但限流/密钥/错误难统一 | |

### 配置形态
| Option | Description | Selected |
|--------|-------------|----------|
| 单 provider + 配置驱动 | N=1 强样板优先 | |
| 现在建多 provider registry | 多 provider 注册 + 运行时选择，结构可扩展 | ✓ |

### 首接 provider
| Option | Description | Selected |
|--------|-------------|----------|
| OpenAI 兼容 | 生态成熟 | |
| Anthropic | 工具调用结构化 | |
| 国内 OpenAI 兼容端点 | DeepSeek/通义/智谱，openai-compatible + 自定义 baseURL | ✓ |
| 先 mock provider | 跑通抽象再接真 provider | |

**User's choice:** AI SDK 底层 + OpenLearn facade + provider registry + 国内 OpenAI 兼容端点
**Notes:** registry 选择超出 N=1 默认推荐，用户主动要结构可扩展；实际仍只跑一个默认 provider。

---

## 限流/配额落点与粒度

### 落点
| Option | Description | Selected |
|--------|-------------|----------|
| 复用现有 Redis 共享计数 | 跨进程一致，ioredis 已部署 | ✓ |
| 进程内内存计数 | 零依赖但多进程/重启不一致 | |
| 抽象 limiter，v1 先内存 | 可换 Redis | |

### 粒度
| Option | Description | Selected |
|--------|-------------|----------|
| 按教师 + 全局上限 | 双层兼顾公平与总量 | ✓ |
| 只按教师 | 简单但极端并发成本不可控 | |
| 按学校 | 多租户预备，但 v3.2 单校 | |

### 超限行为
| Option | Description | Selected |
|--------|-------------|----------|
| typed RateLimitError + retryAfter | 限额 env 可调，教师端可提示 | ✓ |
| 通用错误 + 硬编码限额 | 简单但提示弱 | |

**User's choice:** Redis 共享计数 + 按教师&全局双层 + typed RateLimitError(retryAfter) + env 可调限额
**Notes:** 与错误模型区衔接。

---

## typed 错误模型与重试归属

### 错误建模
| Option | Description | Selected |
|--------|-------------|----------|
| discriminated union typed errors | 各类独立类型 + retryable，类型安全分支 | ✓ |
| 单一 AiError + code 字段 | 更轻但靠字符串判断 | |

### 重试归属
| Option | Description | Selected |
|--------|-------------|----------|
| 混合：瞬时自动重试、其余上抛 | 超时/5xx 自动退避；限流/解析上抛 | ✓ |
| provider 层全揽重试 | 调用方只处理最终结果 | |
| 只返回错误，调用方重试 | provider 不重试 | |

**User's choice:** discriminated union typed errors + 混合重试
**Notes:** 注意与 DRAFT-02 幂等协同 —— 自动重试只针对只读 generation。

---

## 结构化输出的边界切分

### 结构化保证层
| Option | Description | Selected |
|--------|-------------|----------|
| provider 保证结构化 | aiGenerateObject(schema)，解析失败→ParseError | ✓ |
| provider 只返文本，62 解析 | provider 更瘦 | |

### prompt 归属
| Option | Description | Selected |
|--------|-------------|----------|
| provider 内容无关 | 无教学 prompt，可被其他 Agent 复用 | ✓ |
| provider 内置通用 prompt | 耦合更高 | |

**User's choice:** provider 保证结构化（text+object 双接口）+ 内容无关（prompt 归 62）
**Notes:** 清晰切分 61(机制) / 62(领域 schema + prompt)。

---

## the agent's Discretion

- 限流算法/窗口、重试退避具体参数、超时默认值 —— 实现细节。
- provider 层失败的 server-side 结构化日志落地方式（event bus 发射属 62）。
- registry 注册/解析 API 具体形状（参考 runtime-platform/seams/）。
- env 变量具体命名。

## Deferred Ideas

- 多模型路由 / 成本优化 / A-B（registry 结构预留）。
- provider 调用 event bus 事件发射（Phase 62 AGENT-04）。
- 按学校 / 多租户限流。
- 教学 prompt 模板库、多语言/多学科 prompt 体系（Phase 62+）。
- AI SDK v7 Agent API 评估（后续里程碑）。
