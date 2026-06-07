---
phase: 61-ai-provider-abstraction-layer
reviewed: 2026-05-31T04:47:34Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/server/ai/providers/config.ts
  - src/server/ai/providers/errors.ts
  - src/server/ai/providers/error-mapping.ts
  - src/server/ai/providers/redis-client.ts
  - src/server/ai/providers/rate-limit.ts
  - src/server/ai/providers/registry.ts
  - src/server/ai/providers/facade.ts
  - src/server/ai/providers/index.ts
  - src/server/ai/providers/no-leak.test.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 61: Code Review Report — AI Provider Abstraction Layer

**Reviewed:** 2026-05-31T04:47:34Z
**Depth:** deep（含跨文件调用链分析）
**Files Reviewed:** 9 源文件（+ 配套 test 已逐一阅读）
**Status:** issues_found（无 BLOCKER；5 项 WARNING，5 项 INFO）

## Summary

本次对 `src/server/ai/providers/` 的新增代码做对抗式审查，重点核验四个焦点：API key/secret 外泄、限流正确性（原子性 / fail-closed / 重试放大）、错误归一与可重试分类、是否存在 `eval`/动态执行。

**总体评价：架构方向正确，安全基线扎实，但存在若干会削弱既定威胁缓解（T-61-dos / T-61-retry-amplification）的真实缺口。**

正向确认：
- **无任何 JS `eval` / `new Function` / 远程动态 import**——唯一的 `redis.eval` 是 Redis 服务端 Lua（INCR+EXPIRE 单脚本原子），符合 AGENTS 插件安全红线。
- **key 收口良好**：`config.ts` / `registry.ts` 均 `import "server-only"`，barrel 刻意不导出 `config`/`registry`/`rate-limit`，`no-leak.test.ts` 以静态 import 图 + 行为深 walk 双证不外泄。返回面无 `apiKey`/`Authorization`/`baseURL`。
- **限流 fail-closed 主路径正确**：Redis 连接/eval 异常被 catch 后改抛 `ProviderRateLimitError`，绝不 fall-through 放行；连接失败复位单例 promise 允许重连。
- **限流先行于装配/生成**：facade 在 `enforceRateLimit` 之前不触碰 model，命中限流直接冒泡，单次请求不放大为上游调用。

但以下问题应在该层进入生产前修复——尤其 WR-01/WR-02 直接关系到 phase 自己声称要缓解的 DoS / 重试放大威胁。

---

## Critical Issues

无。未发现可被利用的密钥泄漏、注入或数据丢失风险。

---

## Warnings

### WR-01 [WARNING]: facade 声称做超时保护，实则从未挂载任何 timeout（可被上游挂死）

**File:** `src/server/ai/providers/facade.ts:69` 与 `:94`
**Issue:**
`errors.ts`、`error-mapping.ts` 大量注释围绕 `AbortSignal.timeout` 与 `ProviderTimeoutError` 展开，但 facade 调用 `generateText` / `generateObject` 时 **只传了 `{ model, prompt, maxRetries }`，从未传 `abortSignal`**（已 grep 全目录确认无 `abortSignal`/`AbortSignal.timeout` 出现在实现代码）。AI SDK 默认不对底层 fetch 施加超时。后果：上游 TCP 连接挂起（stalled connection）时，Server Action 会**无限期挂起**，占用 Node 请求资源；`ProviderTimeoutError` 这条归一分支实际上是**死代码**。这也意味着 T-61 的 DoS/资源耗尽缓解并不完整。
**Fix:**
```ts
const TIMEOUT_MS = 30_000; // env 可调
const { text } = await generateText({
  model,
  prompt,
  maxRetries: MAX_RETRIES,
  abortSignal: AbortSignal.timeout(TIMEOUT_MS), // 真正挂载超时
});
```
`generateObject` 同理。否则应删除 timeout 相关注释/错误类以免误导。

### WR-02 [WARNING]: `maxRetries: 2` 使上游调用相对全局成本上限放大最多 3×（T-61-dos 部分落空）

**File:** `src/server/ai/providers/facade.ts:31,69,98` ←→ `src/server/ai/providers/rate-limit.ts:60-91`
**Issue:**
限流在 facade 最外层只对「教师一次请求」计数一次，而 AI SDK 的 `maxRetries: 2` 会在可重试错误时**额外发起最多 2 次上游调用**（共 3 次），这些重试不经过 `enforceRateLimit`。因此 `AI_RL_GLOBAL_MAX`（默认 200/窗口）保护的是「请求数」而非「实际上游调用数」——真实上游调用峰值可达 ~600/窗口，**全局成本护栏被悄悄放大 3 倍**。这与 phase 注释中「全局维度护 provider 成本（T-61-dos / retry-amplification）」的目标相矛盾。
**Fix:** 至少在文档/告警中明确该放大系数；更稳妥的是把全局上限按 `(1+maxRetries)` 折算，或将重试预算纳入成本核算口径。理想方案是在重试回调中对 global key 追加计数。

### WR-03 [WARNING]: 超时分类用 `instanceof Error` 会漏掉 `AbortSignal.timeout` 抛出的 `DOMException`

**File:** `src/server/ai/providers/error-mapping.ts:71`
**Issue:**
```ts
if (err instanceof Error && err.name === "TimeoutError") { ... }
```
`AbortSignal.timeout()` 触发的取消原因在现代 Node 中是 **`DOMException`（name=`"TimeoutError"`）**，而 Node 的 `DOMException` 并不 `instanceof Error`。一旦真接上超时（见 WR-01），该分支会**判不中**，超时错误落到分支 5「未知错误」→ 被归一为 `ProviderUpstreamError(retryable: false)`。结果：本应可重试的超时被错误标记为不可重试，调用方不会提示重试。这是一个真实的可重试分类降级。
**Fix:**
```ts
if (
  (err instanceof Error || (typeof DOMException !== "undefined" && err instanceof DOMException)) &&
  (err as { name?: string }).name === "TimeoutError"
) {
  return new ProviderTimeoutError("AI 调用超时，请重试。", err);
}
```
或直接基于 `(err as any)?.name === "TimeoutError"` 判别，不依赖 `instanceof`。

### WR-04 [WARNING]: 限流在 eval 返回非预期结构时 fail-OPEN（与 fail-closed 意图相悖）

**File:** `src/server/ai/providers/rate-limit.ts:49-52`
**Issue:**
```ts
const result = (await redis.eval(LUA, 1, key, String(windowSec))) as [number, number];
const count = result[0];
...
if (count > limit) { throw ... }
```
这里只对「eval reject（连接/脚本异常）」做了 fail-closed。但若 eval **resolve 出非预期值**（如 Redis 返回 nil、空数组、或类型变化），`result[0]` 为 `undefined`，`undefined > limit` 恒为 `false`，于是**静默放行**——即出现一条 fail-OPEN 缝隙，违背 PROV-03 的 fail-closed 主张。虽然当前 Lua 稳定返回二元组，但缺少结果形状校验使该保证依赖于不变量而非显式断言。
**Fix:**
```ts
if (!Array.isArray(result) || typeof result[0] !== "number") {
  throw new ProviderRateLimitError("AI 服务暂时不可用，请稍后再试。", windowSec);
}
const count = result[0];
const ttl = typeof result[1] === "number" ? result[1] : windowSec;
```

### WR-05 [WARNING]: `teacherId` 未校验即拼入 Redis key（空值塌缩 / 无长度上限）

**File:** `src/server/ai/providers/rate-limit.ts:76`（及 `facade.ts:65,90` 入口）
**Issue:**
```ts
const teacherKey = `openlearn:ai:rl:teacher:${teacherId}:${teacherBucket}`;
```
`teacherId` 直接插值进 key，facade 也未对其做非空/格式校验。注释假定「已鉴权」，但缺少防御：
- `teacherId === ""` → 所有空标识共享同一桶 `...:teacher::<bucket>`，互相挤占配额。
- 无长度上限 → 超长 id 产生超大 key（内存/带宽）。
- 若上游某处误传未净化值，存在跨教师桶碰撞的可能。
**Fix:** 在 facade 入口断言 `teacherId` 为非空且符合预期格式（如 UUID/cuid 白名单字符），否则抛配置/参数错误；或对 id 做哈希后再入 key。

---

## Info

### IN-01 [INFO]: `retry-after` 头的 HTTP-date 形式未处理

**File:** `src/server/ai/providers/error-mapping.ts:53`
**Issue:** `Number(err.responseHeaders?.["retry-after"])` 仅支持「秒数」形式；HTTP-date 形式（`Wed, 21 Oct 2025 07:28:00 GMT`）会得到 `NaN` 而回退 30 秒。属优雅降级，但会忽略上游给出的精确等待时间。
**Fix:** 增加 date 分支：`const d = Date.parse(raw); if (!Number.isNaN(d)) ra = Math.ceil((d - Date.now())/1000);`

### IN-02 [INFO]: fail-closed 路径 `console.warn` 打印完整 redis error 对象

**File:** `src/server/ai/providers/rate-limit.ts:89`
**Issue:** `console.warn("[ai/rate-limit] fail-closed: ...", error)` 直接输出 ioredis 错误对象，可能携带连接 host/端口等部署信息（一般不含密码，但视 URL 形态而定）。日志面应尽量收敛敏感连接细节。
**Fix:** 仅记录 `error instanceof Error ? error.message : String(error)`，或接入结构化脱敏日志。

### IN-03 [INFO]: `getLanguageModel` 每次调用读取 `getProviderConfig()` 两次

**File:** `src/server/ai/providers/registry.ts:43-44`
**Issue:** `getLanguageModel` 先 `getProviderConfig().modelId`，随后 `provider()` 内再次 `getProviderConfig()`。每次解析模型都做两次 env 读取/校验，且两次读取理论上可不一致（运行期 env 变更时）。功能无误，属可优化点。
**Fix:** 在 `getLanguageModel` 内只取一次 config，将 `modelId` 与装配所需字段一并传下。

### IN-04 [INFO]: `OPENAI_COMPAT_NAME=""` 会产生空 provider 名

**File:** `src/server/ai/providers/config.ts:32`
**Issue:** `process.env.OPENAI_COMPAT_NAME ?? "openai-compatible"` 中 `??` 仅拦 `null`/`undefined`；显式空串 `""` 会原样透传为空 provider 名。
**Fix:** 用 `process.env.OPENAI_COMPAT_NAME?.trim() || "openai-compatible"`（与 `redis-client.ts` 的 `||` 风格一致）。

### IN-05 [INFO]: teacher 桶在 global 超限/部分失败时被多计数

**File:** `src/server/ai/providers/rate-limit.ts:81-82`
**Issue:** `hit(teacherKey)` 先于 `hit(globalKey)`。当 global 超限或第二跳 redis 异常时，teacher 计数已自增，但请求被拒；客户端重试会再次自增 teacher 桶。固定窗口语义下属可接受偏差，但会让被拒请求也消耗教师配额。
**Fix:** 可接受现状；如需精确，可改为单 Lua 脚本一次性原子处理 teacher+global 两个 key（同时也消除两跳之间的非原子缝隙）。

---

_Reviewed: 2026-05-31T04:47:34Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
