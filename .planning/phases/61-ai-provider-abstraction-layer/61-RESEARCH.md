# Phase 61: AI Provider Abstraction Layer - Research

**Researched:** 2026-05-31
**Domain:** Server-side LLM provider 抽象层（facade + registry + 限流 + typed 错误），底层 Vercel AI SDK
**Confidence:** HIGH（版本/包/错误模型已对 npm registry 与已发布 type 声明逐一核实；端点结构化行为为 MEDIUM）

## Summary

本 phase 是 v3.2 的第一块机制层：在 `src/server/ai/providers` 建立一个 content-agnostic 的 provider facade，对外只暴露 `aiGenerateText()` 与 `aiGenerateObject(schema)` 两个入口，把「读 key / 限流 / 调 LLM / 错误归一」四件事全部收口在这一层。底层引擎锁定 Vercel **AI SDK v6**（`ai` 包），国内 OpenAI 兼容端点（DeepSeek/通义/智谱）通过 **`@ai-sdk/openai-compatible`** 的 `createOpenAICompatible({ baseURL, apiKey })` 接入——**不是** `@ai-sdk/openai`（后者锁定 `api.openai.com`）。

四个核心机制都已有现成可复用的项目资产：`server-only` + `.env.local` 密钥模式（沿用 Auth.js 先例）、ioredis 共享连接（沿用 BullMQ `connection.ts` 的 `lazyConnect` 单例模式）、Zod 4.4.3 边界校验、`runtime-platform/seams/` 的 contract + default-adapter 分层（provider registry 直接对齐其风格）。错误归一依赖 AI SDK 提供的 `APICallError.isRetryable` / `NoObjectGeneratedError` 等带 `static isInstance()` 的错误类，可稳定映射为 4 类 discriminated union。

**Primary recommendation:** 锁定 `ai@6.0.x`（实测 latest `6.0.193`）+ `@ai-sdk/openai-compatible@2.0.x`（实测 `2.0.48`）；facade 用 `generateText` / `generateObject`；registry 仿 `seams` contract/adapter 分层但 N=1；限流用 ioredis 固定窗口（INCR+EXPIRE，Lua 保证原子）双 key（teacher + global）；错误用 `.isInstance()`（非 `instanceof`）映射；瞬时重试交给 AI SDK `maxRetries`，RateLimit 我层前置拦截不重试；全程 `import "server-only"`；测试用 `ai/test` 的 `MockLanguageModelV3` 注入，零真实 LLM 调用。

## User Constraints (from CONTEXT.md)

### Locked Decisions（研究「如何实现」，不再论证「是否」）
- **D-01 底层引擎:** Vercel AI SDK（`ai` 包），版本本研究已锁定（见 Standard Stack）。
- **D-02 调用表面:** facade `aiGenerateText()` + `aiGenerateObject(schema)`，调用方拿不到 SDK 原生句柄；key/限流/错误映射全部收口此层。
- **D-03 配置形态:** 现在就建 provider registry（结构可扩展），实际 N=1 单默认 provider。
- **D-04 首接 provider:** 国内 OpenAI 兼容端点（DeepSeek/通义/智谱），openai-compatible adapter + 自定义 `baseURL`；env 需 `baseURL` + key + 默认 model name。
- **D-05 计数后端:** 复用现有 Redis(ioredis) 做跨进程共享计数；不用进程内内存。
- **D-06 限流粒度:** 按教师 + 全局安全上限双层；不按学校。
- **D-07 超限行为:** typed `RateLimitError`（含 `retryAfter` 秒 + 中文消息），限额 env/config 可调。
- **D-08 错误建模:** discriminated union typed errors（`TimeoutError`/`UpstreamError`/`ParseError`/`RateLimitError`），每类带 `retryable`。
- **D-09 重试归属:** 混合——provider 层自动重试瞬时（超时/5xx）带指数退避+上限；`RateLimitError` 不自动重试直接上抛；`ParseError` 上抛。自动重试只针对只读 generation（与 DRAFT-02 幂等协同）。
- **D-10 结构化保证层:** provider 层用 AI SDK `generateObject` 保证结构化，解析/校验失败归一为 `ParseError`；Phase 62 只传领域 schema。
- **D-11 prompt 归属:** provider content-agnostic，无任何教学 prompt/模板/安全前置。

### the agent's Discretion
- 限流算法/窗口（固定 vs 滑动）、重试退避参数（次数/基数/上限）、超时默认值——实现细节，planner/executor 决定。
- provider 层失败的 server-side 结构化日志（沿用 `server-only` + `console`）由 executor 落地；**event bus 事件发射属 Phase 62（AGENT-04），本 phase 不做。**
- registry 注册/解析 API 形状（参考 `runtime-platform/seams/`）由 planner 定。
- facade 与错误类的最终命名（语义须为「文本」「结构化对象」两条 + 4 类错误带 `retryable`/`retryAfter`）。

### Deferred Ideas（OUT OF SCOPE）
- 多模型路由 / 成本优化 / A-B（registry 预留结构，不写路由逻辑）。
- provider 调用的 event bus 事件发射（Phase 62 AGENT-04）。
- 按学校 / 多租户限流（v3.2 单校）。
- 教学 prompt 模板库、多语言/多学科 prompt 体系（Phase 62+）。
- AI SDK v7 Agent API、多 Agent 编排、RAG/Qdrant、MCP 外部工具。

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROV-01 | 统一 provider 接口完成文本/结构化生成，实现可替换 | Standard Stack（AI SDK facade）+ Pattern 1（registry）+ Pattern 2（facade 双接口）|
| PROV-02 | provider key 只在服务端 Node runtime 读取，不泄漏到 client/Edge/插件/浏览器响应 | Pattern 4（`server-only` + env 收口）+ Validation Architecture（泄漏检测测试）+ Security Domain |
| PROV-03 | 教师 AI 调用受限流/配额保护，超限返回可读错误 | Pattern 3（ioredis 双层固定窗口）+ Code Examples（Lua INCR+EXPIRE）|
| PROV-04 | 调用失败返回 typed 错误，区分可重试/不可重试 | Pattern 5（错误映射 + 混合重试）+ Code Examples（`.isInstance()` 映射）|

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 读取 provider key / baseURL / model | API / Backend (Node runtime) | — | D-04/PROV-02：key 只能在 Node 服务端 `process.env` 读；禁 Edge、禁 client。沿用 Auth.js `auth.ts`（Node）隔离先例。|
| 调用 LLM 端点（文本/结构化） | API / Backend (Node runtime) | — | AI SDK provider 走 Node fetch；属服务端模块，调用方为 Phase 62 工具层（同 server-side）。|
| 限流计数（teacher + global） | Database / Storage (Redis) | API / Backend | 计数后端是 Redis（跨进程一致 D-05）；判定逻辑在 Node provider 层。复用 BullMQ 的 ioredis 基建。|
| 错误归一 / 重试 | API / Backend (Node runtime) | — | discriminated union 在 facade 内构造；瞬时重试由 AI SDK provider 层内做。|
| provider registry 注册/解析 | API / Backend (Node runtime) | — | 纯服务端模块导出，仿 `seams` default-adapter。|

**注意（tier 误配防范）:** 本 phase 任何模块都**不得**被 Edge runtime（`src/proxy.ts`、classroom SSE `route.ts`）或 client component 导入。provider facade 必须 `import "server-only"`，并确保 import 图不触达 `proxy.ts` 路径（类比 `auth.config.ts` 无 DB 依赖的隔离）。

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | `6.0.193`（latest 实测 2026-05-28）| `generateText` / `generateObject` 引擎、错误类、provider registry helpers、测试 mock | D-01 锁定；v6 是 npm `latest`，稳定线。`generateObject` 原生保证 Zod 结构化输出（D-10）。`[VERIFIED: npm view ai version]` |
| `@ai-sdk/openai-compatible` | `2.0.48`（latest 实测 2026-05-26）| `createOpenAICompatible({ baseURL, apiKey })` 接国内 OpenAI 兼容端点 | D-04：DeepSeek/通义/智谱 走自定义 `baseURL`，必须用 openai-compatible 而非 `@ai-sdk/openai`。`[VERIFIED: npm pack + d.ts 导出含 createOpenAICompatible]` |

### Supporting（已在项目内，复用）
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `4.4.3`（已装）| `aiGenerateObject(schema)` 的 schema 与错误 payload 校验 | D-10。AI SDK v6 peer dep 为 `^3.25.76 \|\| ^4.1.8`，4.4.3 **兼容**。`[VERIFIED: npm view ai peerDependencies]` |
| `ioredis` | `5.10.1`（已装）| 限流共享计数后端 | D-05。复用 `src/features/async-tasks/infra/connection.ts` 的 `lazyConnect` 单例模式。|
| `server-only` | `0.0.1`（已装）| 编译期阻止 provider 模块进入 client bundle | PROV-02。沿用 `src/lib/dal/*.ts` 先例。|

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@ai-sdk/openai-compatible` | `@ai-sdk/openai` 的 `createOpenAI({ baseURL })` | `@ai-sdk/openai`（实测 `3.0.67`）也支持 `baseURL`，但它面向真正的 OpenAI API（会注入 OpenAI 专属 header/参数，对国内兼容端点可能产生不被支持的字段）。`openai-compatible` 是 SDK 官方为「第三方 OpenAI 兼容端点」准备的最小适配，更契合 D-04。**推荐 openai-compatible。** |
| AI SDK v6 | AI SDK v7（Agent API） | v6 暴露的 `Agent`/`ToolLoopAgent` 已够用，且 v7 不在 npm `latest`。本 phase 只做 provider 机制，不碰 Agent（deferred）。锁 v6 风险最低。|
| 固定窗口限流 | 滑动窗口 / token bucket | 滑动窗口更平滑但实现复杂、Redis 操作更多。单校 N=1 场景固定窗口足够，retryAfter 用 key TTL 直接得出。planner 可定（discretion）。|
| 自研指数退避 | AI SDK `maxRetries`（内置指数退避）| AI SDK `generateText`/`generateObject` 自带 `maxRetries`（默认 2）+ 指数退避，覆盖瞬时错误。无需自研。我层只负责 RateLimit 前置拦截。|

**Installation:**
```bash
pnpm add ai@6.0.193 @ai-sdk/openai-compatible@2.0.48
```

**Version verification（已执行）:**
- `ai`：`npm view ai version` → `6.0.193`（modified 2026-05-28）`[VERIFIED]`
- `@ai-sdk/openai-compatible`：`npm view @ai-sdk/openai-compatible version` → `2.0.48`（modified 2026-05-26）`[VERIFIED]`
- `@ai-sdk/provider`（错误类来源，传递依赖）：`3.0.10` `[VERIFIED]`
- 三者 zod peer dep 均为 `^3.25.76 || ^4.1.8`，与项目 `zod@4.4.3` 兼容 `[VERIFIED]`
- **建议 pin 策略:** 用 `~6.0.193` / `~2.0.48`（锁 minor），避免 AI SDK 快速迭代引入 breaking。planner 落 `package.json` 时复核当日 `npm view`。

## Architecture Patterns

### System Architecture Diagram

```
Phase 62 工具层 (server-side caller)
        │  只 import facade，拿不到 SDK 句柄
        ▼
┌─────────────────────────────────────────────────────────┐
│  facade: aiGenerateText() / aiGenerateObject(schema)     │  src/server/ai/providers/index.ts
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │ 1.限流前置   │→ │ 2.解析 provider│→ │ 3.调用+重试   │ │
│  │ (ioredis)    │  │  (registry)    │  │ (AI SDK)      │ │
│  └──────┬───────┘  └───────┬───────┘  └───────┬───────┘ │
│         │超限              │                   │原生错误  │
│         ▼                  ▼                   ▼          │
│  RateLimitError      LanguageModel      4.错误归一       │
│  (retryAfter)        (openai-compat)    (.isInstance)    │
└─────────┼──────────────────┼───────────────────┼─────────┘
          │                  │                   │
          ▼                  ▼                   ▼
   Redis(ioredis)     process.env(key/url)  TimeoutError/
   teacher+global     server-only 收口       UpstreamError/
   固定窗口计数        Node runtime only      ParseError/
                                             RateLimitError
                                              ↑ discriminated union
                                                (每类带 retryable)
                            │
                            ▼
                  国内 OpenAI 兼容端点
                  (DeepSeek/通义/智谱)
```

主链路（aiGenerateObject）：调用方传 `{ teacherId, schema, prompt }` → 限流 check（teacher key + global key 双 INCR）→ 命中上限即 throw `RateLimitError(retryAfter)` → 否则 registry 取默认 provider model → `generateObject({ model, schema, prompt, maxRetries, abortSignal })` → 成功返回 `object`；失败按错误类型归一为 typed union 上抛。

### Recommended Project Structure
```
src/server/ai/providers/
├── index.ts            # 对外唯一出口：aiGenerateText / aiGenerateObject + 错误类型 re-export
├── facade.ts           # 编排：限流→registry→调用→错误归一（import "server-only"）
├── registry.ts         # provider registry（contract + 默认 provider 注册，仿 seams）
├── config.ts           # env 读取（baseURL/key/model/限额），server-only
├── rate-limit.ts       # ioredis 双层固定窗口计数
├── errors.ts           # discriminated union: ProviderError = Timeout|Upstream|Parse|RateLimit
├── error-mapping.ts    # AI SDK 原生错误 → typed union（用 .isInstance）
└── redis-client.ts     # 限流专用 ioredis 连接（lazyConnect 单例，仿 connection.ts）
```

> **目录落点提示（需 planner 确认）:** CONTEXT 写 `server/ai/providers`，但项目根同时存在空的 `server/ai` 与 `src/server/ai`，且活跃约定是 `src/server/*`（worker 在 `src/server/workers/async-task-worker.ts`，path alias `@/* → src/*`）。**推荐落 `src/server/ai/providers`（import 用 `@/server/ai/providers`）**，并清理/忽略根级空 `server/` 残留。`[VERIFIED: ls + tsconfig alias]`

### Pattern 1: Provider Registry（仿 seams contract/default-adapter，N=1）
**What:** 用一个 contract interface + 一个默认 adapter 注册表，运行时按 id 解析；结构可扩展但只注册一个。
**When to use:** D-03。对齐 `src/features/runtime-platform/seams/event-bus/{contract.ts,default-adapter.ts}` 与 `seams/index.ts` 的 `runtimePlatformSeams` 风格。
**Example:**
```typescript
// registry.ts —— 仿 seams/index.ts 的 default-adapter 表
import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getProviderConfig } from "./config";

export interface AiProviderAdapter {
  readonly id: string;
  resolveModel(): LanguageModel;
}

function createDefaultProvider(): AiProviderAdapter {
  const cfg = getProviderConfig(); // 读 env，server-only
  const provider = createOpenAICompatible({
    name: cfg.providerName,        // e.g. "deepseek"
    baseURL: cfg.baseURL,          // OPENAI_COMPAT_BASE_URL
    apiKey: cfg.apiKey,            // OPENAI_COMPAT_API_KEY（仅服务端）
  });
  return {
    id: cfg.providerName,
    resolveModel: () => provider(cfg.modelId), // OPENAI_COMPAT_MODEL
  };
}

const registry = new Map<string, AiProviderAdapter>();
const DEFAULT_PROVIDER_ID = "default";
export function getProvider(id = DEFAULT_PROVIDER_ID): AiProviderAdapter {
  if (!registry.has(id)) registry.set(id, createDefaultProvider());
  return registry.get(id)!;
}
```

### Pattern 2: Facade 双接口（唯一关口）
**What:** 只导出 `aiGenerateText` / `aiGenerateObject`，把 SDK 句柄锁在内部。
**Example:**
```typescript
// facade.ts
import "server-only";
import { generateText, generateObject } from "ai";
import type { z } from "zod";
import { getProvider } from "./registry";
import { enforceRateLimit } from "./rate-limit";
import { mapProviderError } from "./error-mapping";

const DEFAULT_TIMEOUT_MS = 30_000;   // discretion
const MAX_RETRIES = 2;               // AI SDK 默认；瞬时错误指数退避

export async function aiGenerateText(input: { teacherId: string; prompt: string }) {
  await enforceRateLimit(input.teacherId);          // 超限 throw RateLimitError
  const model = getProvider().resolveModel();
  try {
    const { text } = await generateText({
      model, prompt: input.prompt,
      maxRetries: MAX_RETRIES,
      abortSignal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    return { text };                                 // 只回 DTO，不回 model 句柄
  } catch (err) {
    throw mapProviderError(err);                      // 归一为 typed union
  }
}

export async function aiGenerateObject<T>(input: {
  teacherId: string; prompt: string; schema: z.ZodType<T>;
}): Promise<{ object: T }> {
  await enforceRateLimit(input.teacherId);
  const model = getProvider().resolveModel();
  try {
    const { object } = await generateObject({
      model, schema: input.schema, prompt: input.prompt,
      maxRetries: MAX_RETRIES,
      abortSignal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    return { object };
  } catch (err) {
    throw mapProviderError(err);
  }
}
```

### Anti-Patterns to Avoid
- **把 model 句柄/`provider` 实例 return 给调用方** → 破坏 D-02 唯一关口。facade 只回 `{ text }` / `{ object }`。
- **用 `@ai-sdk/openai` 接国内端点** → 会注入 OpenAI 专属字段。用 `@ai-sdk/openai-compatible`。
- **用 `instanceof` 判 AI SDK 错误** → 跨包/打包边界不可靠。一律用 `XxxError.isInstance(err)`（SDK 错误类均提供 static `isInstance`）。`[VERIFIED: @ai-sdk/provider d.ts]`
- **在进程内存计数限流** → 违反 D-05（server.ts 主进程 + BullMQ worker 须共享额度）。用 Redis。
- **在 provider 层写任何教学 prompt** → 违反 D-11。prompt 全归 Phase 62。
- **被 Edge/proxy 路径 import** → 违反 PROV-02。保持 server-only 且不被 `proxy.ts` 触达。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 结构化 JSON 输出 + Zod 校验 | 自己拼 prompt 要 JSON + 手动 parse | AI SDK `generateObject({ schema })` | SDK 处理 response_format/json 模式、容错解析、schema 校验，失败抛 `NoObjectGeneratedError`（D-10）|
| 瞬时错误指数退避 | 自写 retry 循环 | AI SDK `maxRetries`（内置指数退避）| 默认 2 次、对 `isRetryable` 错误退避；自研易漏 abort/jitter |
| OpenAI 兼容协议适配 | 自写 fetch + OpenAI body | `createOpenAICompatible` | 处理 chat/completions 格式、错误结构、streaming |
| 超时控制 | 自写 setTimeout race | `AbortSignal.timeout(ms)` 传 `abortSignal` | 原生、可取消、SDK 一等支持 |
| 错误是否可重试判定 | 自己看 status code | `APICallError.isRetryable` | SDK 已按 4xx/5xx/网络归类 `[VERIFIED]` |
| Redis 连接管理 | 新建连接池 | 复用 `connection.ts` 的 `lazyConnect` 单例模式 | 跨进程一致、已有可观测性 hooks |

**Key insight:** 本 phase 的「难」不在调 LLM（SDK 全包了），而在**边界纪律**——key 收口、限流跨进程一致、错误归一可分支。机制全用 SDK + 现有 Redis 基建，自研的只有 4 类 typed 错误的 mapping 与限流 key 设计。

## Runtime State Inventory

> 本 phase 为 greenfield（新建 `src/server/ai/providers`），无 rename/migration。但新增 env 与 Redis key 命名需登记，避免与现有冲突。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **新增 Redis 限流 key**（如 `openlearn:ai:rl:teacher:<id>:<window>`、`openlearn:ai:rl:global:<window>`）。与 BullMQ prefix `openlearn:async-tasks` / fanout 不冲突。 | code（key 命名约定，建议 prefix `openlearn:ai:rl:`）|
| Live service config | 国内 OpenAI 兼容端点（DeepSeek/通义/智谱）账号、baseURL、可用 model id——**不在 git，需运维在 `.env.local` 配置** | 文档 + `.env.example` 增条目 |
| OS-registered state | None — verified（无 Task Scheduler/pm2 命名涉及）|
| Secrets/env vars | **新增 env**：`OPENAI_COMPAT_BASE_URL` / `OPENAI_COMPAT_API_KEY` / `OPENAI_COMPAT_MODEL` / 限额 `AI_RATE_LIMIT_TEACHER_*` / `AI_RATE_LIMIT_GLOBAL_*`（命名 planner 定）。沿用 `.env.local` + `server-only`，**绝不进 client/`NEXT_PUBLIC_`** | 更新 `.env.example`；key 仅服务端读 |
| Build artifacts | 新增 `ai` / `@ai-sdk/openai-compatible` 进 `pnpm-lock.yaml`；首次需 `pnpm install` | 安装 + lockfile 提交 |

**复用现有 Redis URL:** `connection.ts` 用 `BULLMQ_REDIS_URL`；限流可复用同一 Redis 实例（不同 key prefix）或新增 `AI_REDIS_URL`（planner 定）。推荐复用 `REDIS_URL`/`BULLMQ_REDIS_URL` 实例，单独 key namespace。

## Common Pitfalls

### Pitfall 1: 国内兼容端点不支持 native structured outputs
**What goes wrong:** `generateObject` 默认可能请求 `response_format: json_schema`（OpenAI structured outputs），部分国内端点不支持 → 报错或忽略。
**Why it happens:** openai-compatible 端点对 json schema / tool mode 支持度不一（DeepSeek 支持 `json_object` 但未必支持严格 `json_schema`）。
**How to avoid:** `createOpenAICompatible` 支持通过 provider/model options 调整结构化策略。优先用 **JSON 模式**（schema 注入 + 容错解析）而非严格 tool/json_schema；planner 在接入时对目标端点实测 `generateObject` 一次。若端点完全不支持，降级为 `generateText` + `schema.parse(JSON.parse(text))`，解析失败仍归 `ParseError`。**置信度 MEDIUM**（端点行为依实际供应商）。
**Warning signs:** 上游返回「unsupported parameter response_format」类错误；object 为空但无解析报错。

### Pitfall 2: `retry-after` 头未读 → RateLimitError.retryAfter 不准
**What goes wrong:** 上游 429 自带 `Retry-After`，但我层只用本地窗口 TTL，二者可能不一致。
**How to avoid:** 区分两种 429——(a) **我层**限流（teacher/global 超限）：`retryAfter` = 本地 key 剩余 TTL；(b) **上游**限流（`APICallError` statusCode 429）：优先读 `error.responseHeaders['retry-after']`，缺省回退到指数退避。两者都归 `RateLimitError` 但来源不同。`APICallError` 暴露 `responseHeaders`/`statusCode` `[VERIFIED]`。

### Pitfall 3: 自动重试触发副作用写入
**What goes wrong:** 若未来 facade 被包进有写库副作用的链路，自动重试会重复写。
**How to avoid:** D-09 明确——本层自动重试**只针对只读 generation**。facade 不做任何 DAL/Command Bus 写入（那是 Phase 62/63）。保持 provider 层纯函数式（输入 prompt → 输出 text/object），副作用与幂等由 DRAFT-02 在写入层处理。

### Pitfall 4: server-only 模块被测试/脚本环境直接 require 报错
**What goes wrong:** `import "server-only"` 在非 webpack/Node 直跑（tsx 脚本、vitest）会抛。
**How to avoid:** 已有现成方案——脚本用 `scripts/server-only-node-shim.cjs`（`node --require`），vitest 用 `vi.mock("server-only", () => ({}))`（`src/lib/dal/classroom.test.ts:39` 先例）。`[VERIFIED: 代码库]`

### Pitfall 5: AI SDK 版本漂移引入 breaking
**What goes wrong:** AI SDK v6 高频发版（6.0.193 已是 patch 级），范围安装可能拉入行为变更。
**How to avoid:** pin `~6.0.x` / `~2.0.x`，CI lockfile 固定；升级走独立 PR + 回归。

## Code Examples

### 错误 mapping：AI SDK 原生 → 4 类 discriminated union（PROV-04）
```typescript
// errors.ts
export type ProviderError =
  | { kind: "timeout"; retryable: true; message: string; cause?: unknown }
  | { kind: "upstream"; retryable: boolean; status?: number; message: string; cause?: unknown }
  | { kind: "parse"; retryable: false; message: string; cause?: unknown }
  | { kind: "rate_limit"; retryable: false; retryAfter: number; message: string };

export class ProviderTimeoutError extends Error { readonly kind = "timeout"; readonly retryable = true; }
export class ProviderUpstreamError extends Error { readonly kind = "upstream"; constructor(msg: string, readonly status?: number, readonly retryable = true){ super(msg);} }
export class ProviderParseError extends Error { readonly kind = "parse"; readonly retryable = false; }
export class ProviderRateLimitError extends Error { readonly kind = "rate_limit"; readonly retryable = false; constructor(msg: string, readonly retryAfter: number){ super(msg);} }
```
```typescript
// error-mapping.ts
import { APICallError, NoObjectGeneratedError, JSONParseError, TypeValidationError } from "ai";
import { ProviderTimeoutError, ProviderUpstreamError, ProviderParseError, ProviderRateLimitError } from "./errors";

export function mapProviderError(err: unknown): Error {
  // 我层限流错误原样上抛
  if (err instanceof ProviderRateLimitError) return err;

  // 解析/校验失败 → ParseError（D-10）
  if (NoObjectGeneratedError.isInstance(err) || JSONParseError.isInstance(err) || TypeValidationError.isInstance(err)) {
    return new ProviderParseError("AI 返回内容无法解析为目标结构，请重试或换用更强模型。");
  }

  // 上游 API 错误
  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    if (status === 429) {
      const ra = Number(err.responseHeaders?.["retry-after"]) || 30;
      return new ProviderRateLimitError("AI 服务暂时繁忙，请稍后再试。", ra);
    }
    // isRetryable 由 SDK 判定（超时/5xx/网络 → true）
    if (err.isRetryable) return new ProviderUpstreamError("AI 上游服务暂时不可用，请稍后重试。", status, true);
    return new ProviderUpstreamError("AI 调用被上游拒绝。", status, false);
  }

  // AbortSignal.timeout 触发的取消
  if (err instanceof Error && err.name === "TimeoutError") {
    return new ProviderTimeoutError("AI 调用超时，请重试。");
  }
  return new ProviderUpstreamError("AI 调用发生未知错误。", undefined, false);
}
```
> `APICallError`/`NoObjectGeneratedError`/`JSONParseError`/`TypeValidationError` 均从 `ai` 包导出，且都提供 `static isInstance()`。`[VERIFIED: ai@6.0.193 d.ts 导出 + @ai-sdk/provider d.ts isInstance]`

### 限流：ioredis 双层固定窗口（PROV-03，原子 Lua）
```typescript
// rate-limit.ts
import "server-only";
import { getAiRedis } from "./redis-client";
import { ProviderRateLimitError } from "./errors";

// INCR + 首次设 EXPIRE，原子返回 {count, ttl}
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local t = redis.call('TTL', KEYS[1])
return {c, t}
`;

async function hit(redis: any, key: string, limit: number, windowSec: number) {
  const [count, ttl] = (await redis.eval(LUA, 1, key, String(windowSec))) as [number, number];
  if (count > limit) throw new ProviderRateLimitError("AI 请求过于频繁，请稍后再试。", ttl > 0 ? ttl : windowSec);
}

export async function enforceRateLimit(teacherId: string) {
  const redis = await getAiRedis();
  const now = Date.now();
  const tWin = Number(process.env.AI_RL_TEACHER_WINDOW_SEC ?? 60);
  const tMax = Number(process.env.AI_RL_TEACHER_MAX ?? 20);
  const gWin = Number(process.env.AI_RL_GLOBAL_WINDOW_SEC ?? 60);
  const gMax = Number(process.env.AI_RL_GLOBAL_MAX ?? 200);
  const tBucket = Math.floor(now / 1000 / tWin);
  const gBucket = Math.floor(now / 1000 / gWin);
  // 先教师后全局；任一超限即抛（retryAfter = 该 key TTL）
  await hit(redis, `openlearn:ai:rl:teacher:${teacherId}:${tBucket}`, tMax, tWin);
  await hit(redis, `openlearn:ai:rl:global:${gBucket}`, gMax, gWin);
}
```
```typescript
// redis-client.ts —— 仿 connection.ts 的 lazyConnect 单例
import "server-only";
import Redis from "ioredis";
let promise: Promise<Redis> | null = null;
export async function getAiRedis(): Promise<Redis> {
  if (!promise) {
    const url = process.env.AI_REDIS_URL ?? process.env.BULLMQ_REDIS_URL ?? process.env.REDIS_URL;
    if (!url) throw new Error("AI_REDIS_URL_NOT_CONFIGURED");
    const r = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectionName: "openlearn-ai-ratelimit" });
    promise = r.connect().then(() => r).catch((e) => { promise = null; throw e; });
  }
  return promise;
}
```
> 固定窗口足够单校场景；planner 若选滑动窗口可换 sorted-set ZADD/ZREMRANGEBYSCORE 实现。Lua 保证 INCR+EXPIRE 原子（避免无 TTL 永久 key）。

### env 读取收口（PROV-02）
```typescript
// config.ts
import "server-only";
export function getProviderConfig() {
  const baseURL = process.env.OPENAI_COMPAT_BASE_URL;
  const apiKey = process.env.OPENAI_COMPAT_API_KEY;
  const modelId = process.env.OPENAI_COMPAT_MODEL;
  const providerName = process.env.OPENAI_COMPAT_NAME ?? "openai-compatible";
  if (!baseURL || !apiKey || !modelId) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  return { baseURL, apiKey, modelId, providerName };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `instanceof APICallError` | `APICallError.isInstance(err)` | AI SDK v4+ 统一 | 跨打包边界可靠判错 |
| AI SDK v4 `mode: 'json'/'tool'` 显式参数 | v6 `generateObject` 自动选模式 + `experimental_repairText` | v5→v6 | 多数情况无需手动指定 mode；端点不支持时才介入 |
| `openai` 官方 SDK 直连 | `@ai-sdk/openai-compatible` provider | AI SDK 生态成熟 | 统一 facade、统一错误、易替换 provider（PROV-01）|
| 进程内 rate limit | Redis 共享计数 | 多进程部署（server.ts + worker）| 跨进程一致额度（D-05）|

**Deprecated/outdated:**
- AI SDK v3 的 `experimental_` 前缀 API（`experimental_generateObject` 等）——v6 已正式化为 `generateObject`。
- 训练知识里的 `MockLanguageModelV2`——本版本 `ai/test` 实际导出 `MockLanguageModelV3`。`[VERIFIED: ai@6.0.193 dist/test d.ts]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 国内 OpenAI 兼容端点（DeepSeek/通义/智谱）可被 `createOpenAICompatible` + `generateObject` 正确驱动结构化输出 | Pitfall 1 / Standard Stack | 若某端点完全不支持 json/schema 模式，需降级 `generateText`+手动 parse。接入时对目标端点实测一次即可证伪/证实。MEDIUM。|
| A2 | `generateObject` 失败统一抛 `NoObjectGeneratedError`（或 `JSONParseError`/`TypeValidationError`）而非裸 `APICallError` | error-mapping | mapping 分支顺序需先判 parse 类再判 APICall；已在示例中 parse 类优先。LOW 风险（顺序已防御）。|
| A3 | 复用 `BULLMQ_REDIS_URL`/`REDIS_URL` 同一 Redis 实例做限流 key 无冲突 | Runtime State Inventory | key prefix `openlearn:ai:rl:` 与 `openlearn:async-tasks` 隔离即可；若运维分离 Redis，加 `AI_REDIS_URL`。LOW。|
| A4 | 根级 `server/` 为残留，活跃落点是 `src/server/ai/providers` | Recommended Project Structure | 若团队约定用根 `server/`，调整 import；planner 一句确认即可。LOW。|

**置信度小结:** 包版本/导出/错误类/peer dep/mock = HIGH（已对 npm + d.ts 核实）；端点结构化兼容性 = MEDIUM（依实际供应商）。

## Open Questions

1. **目标兼容端点确定哪一个（DeepSeek vs 通义 vs 智谱）及其 model id**
   - What we know：均为 OpenAI 兼容，走 `createOpenAICompatible`。
   - What's unclear：具体端点的 structured output 支持度与默认 model id。
   - Recommendation：planner/运维在 `.env.local` 定一个默认端点；接入任务里加一条「对该端点跑通 `generateObject` 一次」的验收。

2. **限流 key 用固定窗口 bucket 还是滑动窗口**
   - Recommendation：默认固定窗口（示例已给）；discretion 归 planner。retryAfter 用 TTL。

3. **限流 Redis 复用 BullMQ 实例 vs 独立 `AI_REDIS_URL`**
   - Recommendation：默认复用 + 独立 key namespace；env 留 `AI_REDIS_URL` 覆盖位。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `ai` (npm) | facade 引擎 | ✗（未装）| 目标 `6.0.193` | 无——必装 |
| `@ai-sdk/openai-compatible` | provider 接入 | ✗（未装）| 目标 `2.0.48` | 无——必装 |
| `ioredis` | 限流计数 | ✓ | 5.10.1 | 无需 |
| `zod` | schema 校验 | ✓ | 4.4.3 | 无需 |
| `server-only` | key 隔离 | ✓ | 0.0.1 | 无需 |
| Redis 实例 | 限流后端 | ✓（BullMQ 已用）| — | 限流降级策略需 planner 定（见下）|
| 国内兼容 LLM 端点 + key | 实际生成 | ✗（运维配置）| — | 无 key 时 facade 抛 `AI_PROVIDER_NOT_CONFIGURED`；测试用 MockLanguageModelV3 |

**Missing dependencies with no fallback:**
- `ai` / `@ai-sdk/openai-compatible`：必须 `pnpm add`。
- 兼容端点 baseURL/key/model：必须运维在 `.env.local` 配置（生产路径），测试路径用 mock。

**Missing dependencies with fallback:**
- Redis 不可达：限流无法计数。planner 须决定降级姿态——**建议 fail-closed**（Redis 不可达时拒绝 AI 调用并返回可读错误），避免无保护刷爆 provider 成本；与现有 `connection.ts` degraded 语义保持一致。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @vitest/coverage-v8 4.1.6（已装）|
| Config file | `vitest.config.*`（alias `@`→`src/`；测试 glob `src/**/*.{test,spec}.{ts,tsx}`）|
| Quick run command | `pnpm vitest run src/server/ai/providers` |
| Full suite command | `pnpm vitest run` |
| Close gate（里程碑级）| `verify:phase`（Phase 65 建，本 phase 不做）|

### 核心策略：零真实 LLM 调用
**注入点（DI）:** facade/registry 用 `MockLanguageModelV3`（`ai/test` 导出）替换 provider 的 `resolveModel()`，即可在不打网络的情况下覆盖文本/结构化/错误三条路径。`[VERIFIED: ai@6.0.193 dist/test 导出 MockLanguageModelV3, mockId, simulateReadableStream]`

```typescript
// 文本/结构化成功路径
import { MockLanguageModelV3 } from "ai/test";
const okModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    content: [{ type: "text", text: JSON.stringify({ title: "x" }) }],
    warnings: [],
  }),
});
// 错误映射路径：让 doGenerate 抛 APICallError(429 / 5xx / isRetryable)
```

**provider 注入方式:** 让 `getProvider()`/`resolveModel()` 可被测试覆写（registry 注册一个测试 adapter，或 facade 接受可选 model 参数）。planner 设计 registry 时预留这个 seam（与 `runtime-platform/seams` 风格一致：contract 可换 adapter）。

**Redis 限流测试:** 用 `vi.mock("ioredis")`（`src/features/async-tasks/infra/connection.test.ts:8` 先例）或 `ioredis-mock` 提供内存 `eval` 实现，断言：第 N+1 次调用抛 `ProviderRateLimitError` 且 `retryAfter > 0`；teacher 与 global 两层各自触发。

**server-only:** `vi.mock("server-only", () => ({}))`（`src/lib/dal/classroom.test.ts:39` 先例）。

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| PROV-01 | facade 文本/结构化成功；换 adapter 不改调用方 | unit | `pnpm vitest run src/server/ai/providers/facade.test.ts` | ❌ Wave 0 |
| PROV-01 | registry 解析默认 provider | unit | `... registry.test.ts` | ❌ Wave 0 |
| PROV-02 | key 不出现在返回 DTO；config 读 env 缺失即抛 | unit | `... config.test.ts` | ❌ Wave 0 |
| PROV-02 | provider 模块 import 图不触达 Edge/client（静态检查）| static/verify | `... no-leak.test.ts`（grep import + 断言 facade 返回无 key 字段）| ❌ Wave 0 |
| PROV-03 | 超限抛 RateLimitError(retryAfter)；teacher+global 双层 | unit | `... rate-limit.test.ts` | ❌ Wave 0 |
| PROV-04 | 4 类错误映射 + retryable 标记正确 | unit | `... error-mapping.test.ts` | ❌ Wave 0 |

### PROV-02「密钥不泄漏」可证明手段（Success Criteria #2）
1. **编译期:** 每个 provider 模块首行 `import "server-only"`——被 client component import 即 build 报错。
2. **返回面:** 单测断言 `aiGenerateText`/`aiGenerateObject` 返回对象只含 `text`/`object`，深度遍历无 `apiKey`/`baseURL`/`Authorization`。
3. **import 图静态检查:** verify 脚本断言 `src/proxy.ts`、`src/app/api/classroom/**/route.ts`（Edge）、任何 `"use client"` 文件均不 import `@/server/ai/providers`。
4. **bundle 检查（可选强校验）:** 构建后 grep client chunk 不含 env key 字面值（运维侧；planner 可定是否纳入）。

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/server/ai/providers`
- **Per wave merge:** `pnpm vitest run`（全量）
- **Phase gate:** 全量 green + `pnpm typecheck` + `pnpm lint` 通过后再 `/gsd-verify-work`。

### Wave 0 Gaps
- [ ] `src/server/ai/providers/facade.test.ts` — PROV-01
- [ ] `src/server/ai/providers/registry.test.ts` — PROV-01
- [ ] `src/server/ai/providers/config.test.ts` — PROV-02
- [ ] `src/server/ai/providers/no-leak.test.ts` — PROV-02
- [ ] `src/server/ai/providers/rate-limit.test.ts` — PROV-03
- [ ] `src/server/ai/providers/error-mapping.test.ts` — PROV-04
- [ ] 共享测试夹具：`MockLanguageModelV3` 工厂 + ioredis mock helper
- [ ] 框架无需新装（Vitest 已就绪）

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 调用方（Phase 62）已在 Server Action/Command Bus 层鉴权；provider 层只接受 `teacherId` 做限流维度 |
| V4 Access Control | partial | 限流即一种资源滥用控制（PROV-03）；本层不做 RBAC（在调用方）|
| V5 Input Validation | yes | `aiGenerateObject(schema)` 用 Zod 校验输出；prompt 输入由调用方治理（D-11）|
| V6 Cryptography | no | 不自管密钥加密；env + server-only 收口即可（不 hand-roll 加密）|
| V7 Error Handling & Logging | yes | typed 错误 + server-side 结构化日志（discretion）；**日志禁打印 apiKey/Authorization** |
| V14 Secret Management | yes | `OPENAI_COMPAT_API_KEY` 仅 `.env.local`、仅 server-only 读、禁 `NEXT_PUBLIC_`、禁进 client bundle |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| provider key 经响应/错误信息/日志泄漏 | Information Disclosure | server-only + 返回面只含 DTO + 日志脱敏（PROV-02）|
| key 经 client bundle / Edge / 插件 manifest 外泄 | Information Disclosure | import 图隔离（不被 proxy/client/plugin import）+ 静态检查 |
| 单教师刷爆 / 全局成本耗尽 | Denial of Service | ioredis 双层固定窗口限流（PROV-03）+ Redis 不可达 fail-closed |
| prompt injection 通过 AI 输出污染下游 | Tampering | 本层不处理（D-11）；归 Phase 62 guardrails（EVAL-02）。本层只保证结构合法（Zod）|
| 自动重试放大上游负载 / 重复副作用 | DoS / Tampering | `maxRetries` 上限 + 仅只读 generation 重试（D-09）|

## Project Constraints (from AGENTS.md)

- **Runtime:** provider/DB/Agent 逻辑一律 Node runtime；Edge 仅 classroom SSE。provider 模块禁被 Edge 导入。
- **provider key 仅服务端:** key 不进 client/Edge/插件/浏览器响应（PROV-02 = 非可协商约束）。
- **DAL-only / Command Bus:** 本 phase 不写库（纯 generation）；写入归 Phase 63。facade 不直连 DB。
- **No `eval` / 无任意代码执行:** 限流 Lua 是 Redis 服务端脚本（非 JS eval），合规；不引入动态代码执行。
- **插件禁触 provider:** registry/facade 不暴露给 plugin（plugin→AI 属 Future deferred）。
- **Zod 边界校验:** `aiGenerateObject` 必经 Zod（已是项目标准）。
- **显式缓存纪律:** 本 phase 无 `"use cache"`（动态、有副作用语义）；不缓存 LLM 调用。

## Sources

### Primary (HIGH confidence)
- `npm view ai version` → `6.0.193`；`peerDependencies` `{ zod: ^3.25.76 || ^4.1.8 }`；`exports` 含 `./test`。`[VERIFIED 2026-05-31]`
- `npm view @ai-sdk/openai-compatible version` → `2.0.48`。`[VERIFIED]`
- `npm pack` 解包 `ai@6.0.193`：`dist/index.d.ts` 导出 `generateText`/`generateObject`/`NoObjectGeneratedError`/`APICallError`/`JSONParseError`/`TypeValidationError`/`RetryError`/`createProviderRegistry`/`customProvider`；`dist/test/index.d.ts` 导出 `MockLanguageModelV3`/`mockId`/`simulateReadableStream`。`[VERIFIED]`
- `npm pack` 解包 `@ai-sdk/openai-compatible@2.0.48`：导出 `createOpenAICompatible`/`OpenAICompatibleProviderSettings`。`[VERIFIED]`
- `npm pack` 解包 `@ai-sdk/provider@3.0.10`：`APICallError { statusCode?, isRetryable, responseHeaders, responseBody }` + 各错误类 `static isInstance()`。`[VERIFIED]`
- 代码库：`src/features/async-tasks/infra/connection.ts`（ioredis lazyConnect 单例）、`seams/event-bus/{contract,default-adapter}.ts` + `seams/index.ts`（registry 先例）、`src/lib/dal/classroom.ts:1`（server-only）、`.env.example`、`scripts/server-only-node-shim.cjs`、测试 mock 先例。`[VERIFIED]`

### Secondary (MEDIUM confidence)
- AI SDK `generateObject` 在 openai-compatible 端点的结构化模式选择与降级——基于 SDK 文档惯例与 provider 设计，未对具体国内端点实测。**接入时须实测。**

### Tertiary (LOW confidence)
- 训练知识中的旧 mock 名 `MockLanguageModelV2` 已被本版本 `V3` 证伪——以 `[VERIFIED]` 为准。

## Metadata

**Confidence breakdown:**
- Standard stack（包/版本/导出/peer dep）: HIGH — 对 npm registry + 已发布 d.ts 逐一核实。
- Architecture（facade/registry/限流/错误映射）: HIGH — 全部对齐已存在的项目模式（seams/connection/auth split）。
- 结构化输出端点兼容性: MEDIUM — 依实际供应商，须接入时实测。
- Pitfalls / Validation: HIGH — 测试基建（Vitest + ai/test mock + ioredis mock + server-only shim）均已在库内验证。

**Research date:** 2026-05-31
**Valid until:** 2026-06-14（AI SDK 高频发版，建议 planner 落 `package.json` 当日复跑 `npm view` 校准版本）
