---
phase: 61-ai-provider-abstraction-layer
plan: 02
subsystem: ai
tags: [rate-limit, ioredis, redis, fixed-window, fail-closed, lua, server-only, vitest, tdd]

# Dependency graph
requires:
  - phase: 61-01
    provides: "ProviderRateLimitError（kind=rate_limit, 携 retryAfter + 中文文案）"
  - phase: 61-00
    provides: "providers 目录骨架、makeMockRedis 测试夹具（eval [count,ttl] 契约）"
provides:
  - "getAiRedis：限流专用 ioredis lazyConnect 单例（失败复位以便重连，与 BullMQ 连接隔离）"
  - "enforceRateLimit(teacherId)：teacher+global 双层固定窗口限流，超限抛 ProviderRateLimitError"
  - "Redis 不可达 fail-closed 语义（拒绝放行，绝不 fall-through）"
affects: [facade, lesson-agent, server-action-ai, registry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "限流专用 ioredis 单例：memoized promise + 连接失败复位（对齐 connection.ts 纪律，N=1 简化）"
    - "原子固定窗口计数：INCR + 首次 EXPIRE + TTL 经单 Lua 脚本（无遗留无 TTL key）"
    - "fail-closed：计数后端不可用时拒绝放行（限额命中原样上抛，其余包装为 ProviderRateLimitError）"
    - "resetModules + 动态 import 下用 kind 判别断言错误（跨 realm instanceof 失效的替代）"

key-files:
  created:
    - src/server/ai/providers/redis-client.ts
    - src/server/ai/providers/rate-limit.ts
    - src/server/ai/providers/rate-limit.test.ts
  modified: []

key-decisions:
  - "不 vi.mock('./redis-client')：两 describe 均跑真实 redis-client + rate-limit，仅 class-mock ioredis（connectShouldFail + evalDelegate 控制）"
  - "rate-limit eval 委派到 makeMockRedis 实例（统一 [count,ttl] 契约，零真实网络）"
  - "URL 解析顺序 AI_REDIS_URL → BULLMQ_REDIS_URL → REDIS_URL；三缺抛 AI_REDIS_URL_NOT_CONFIGURED"
  - "fail-closed 文案：限额命中『AI 请求过于频繁，请稍后再试。』；Redis 不可达『AI 服务暂时不可用，请稍后再试。』"

patterns-established:
  - "限流 key 命名空间 openlearn:ai:rl:teacher:<id>:<bucket> 与 openlearn:ai:rl:global:<bucket>（与 openlearn:async-tasks 隔离）"
  - "bucket = Math.floor(now_sec / windowSec)，固定窗口"
  - "maxRetriesPerRequest:1 fail-fast 缩短 Redis 失联探测，支撑 fail-closed"

requirements-completed: [PROV-03]

# Metrics
duration: ~30min
completed: 2026-05-31
---

# Phase 61 Plan 02: AI 限流（双层固定窗口 + fail-closed）Summary

**`getAiRedis` 限流专用 ioredis 单例 + `enforceRateLimit(teacherId)` 教师/全局双层固定窗口限流：任一超限抛 `ProviderRateLimitError`（retryAfter=key 剩余 TTL），INCR+EXPIRE 经 Lua 原子计数，Redis 不可达时 fail-closed 拒绝放行。**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-05-31T04:12:00Z (approx)
- **Completed:** 2026-05-31T04:21:00Z
- **Tasks:** 2 (均 TDD)
- **Files modified:** 3 created

## Accomplishments
- `getAiRedis`：限流专用 ioredis lazyConnect 单例，URL 解析 `AI_REDIS_URL → BULLMQ_REDIS_URL → REDIS_URL`，三缺抛 `AI_REDIS_URL_NOT_CONFIGURED`；连接失败复位 memoized promise 以便重连；`maxRetriesPerRequest:1` fail-fast。与 BullMQ 连接（`features/async-tasks/infra/connection.ts`）隔离。
- `enforceRateLimit(teacherId)`：先教师维度（默认 20/60s）后全局维度（默认 200/60s），任一超限抛 `ProviderRateLimitError`，`retryAfter` = 该 key 剩余 TTL（>0，否则回退 windowSec），中文文案。
- 原子计数：`INCR` + 仅首次 `EXPIRE` + `TTL` 经单条 Lua 执行，杜绝「先 INCR 后 EXPIRE 之间崩溃 → 永久无 TTL key」的窗口泄漏。
- **fail-closed（T-61-dos）**：Redis 不可达（连接/eval 异常）时拒绝放行，包装为 `ProviderRateLimitError('AI 服务暂时不可用，请稍后再试。')` 上抛——杜绝「计数失效 = 无限放行」的成本失控。
- 限额/窗口经 env 可调（`AI_RL_TEACHER_WINDOW_SEC/MAX`、`AI_RL_GLOBAL_WINDOW_SEC/MAX`），非法值回退默认。

## Task Commits

Each task committed atomically (TDD test → feat):

1. **Task 1: redis-client.ts 限流单例** — `05662d0` (test) → `ca5ccb6` (feat)
2. **Task 2: rate-limit.ts 双层固定窗口 + fail-closed (PROV-03)** — `9acee78` (test) → `bb40526` (feat)

_REFACTOR 阶段未触发（实现已清晰，无需重构提交）。_

## Files Created/Modified
- `src/server/ai/providers/redis-client.ts` - 导出 `getAiRedis`，限流专用 ioredis lazyConnect 单例
- `src/server/ai/providers/rate-limit.ts` - 导出 `enforceRateLimit`，双层固定窗口 + 原子 Lua + fail-closed
- `src/server/ai/providers/rate-limit.test.ts` - 9 例：redis-client 单例/URL 回退/缺失抛错/重连（4）+ enforceRateLimit teacher 超限/global 独立/双未超 resolve/fail-closed/env 可调（5）

## Decisions Made
- **不 `vi.mock('./redis-client')`**：两 describe 块均运行**真实** redis-client + 真实 rate-limit，仅 class-mock `ioredis`，由模块级 `connectShouldFail`（控制 connect reject）+ `evalDelegate`（路由计数到 `makeMockRedis` 实例）驱动。这样 redis-client 单例/重连逻辑被真实覆盖，rate-limit 计数走统一 `[count,ttl]` 契约，零真实网络。
- **URL 三级回退**与 fail-closed 文案如上 frontmatter；`bucket = Math.floor(now_sec / windowSec)` 固定窗口。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 限流断言改用 `kind` 判别，修正跨 realm `instanceof` 失效**
- **Found during:** Task 2（GREEN 阶段首次跑全量测试）
- **Issue:** 测试顶部静态 `import { ProviderRateLimitError }`，而 `enforceRateLimit` 经 `vi.resetModules()` 后 `await import('./rate-limit')` 拉到**新一份** `./errors` 模块副本，类标识不同 → `toBeInstanceOf(ProviderRateLimitError)` 对正确抛出的限流错误仍判 false（4 例红）。
- **Fix:** 限流相关 4 处断言改用稳定的 `kind === 'rate_limit'` 判别（try/catch 取 `.kind`/`.retryAfter`/`.message` 或 `rejects.toMatchObject({ kind: 'rate_limit' })`），与 61-01「跨打包边界用静态判型而非 instanceof」的既定 pattern 一致。
- **Files modified:** src/server/ai/providers/rate-limit.test.ts
- **Verification:** `pnpm vitest run src/server/ai/providers/rate-limit.test.ts` → 9/9 通过
- **Committed in:** `bb40526`（Task 2 GREEN 提交，与实现同提交）

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 仅为 resetModules + 动态 import 模式下的测试断言必要修正，实现逻辑未变，无范围蔓延。

## Issues Encountered
- LSP 噪音：providers 目录下 `.ts` 互引报「Cannot find module './xxx'」（含已存在的 config.ts/errors.ts），与 61-01 同源（pnpm hoisting / LSP moduleResolution 缓存），无害——`pnpm vitest` 解析正常，9/9 绿。

## Known Stubs
None — getAiRedis 与 enforceRateLimit 均为完整可用实现；唯一「占位」是 teacherId 由上游（Phase 62 鉴权后）传入，本层仅作限流维度，符合 threat_model 设计。

## Threat Flags
None — 本层不读 apiKey/baseURL，仅操作 Redis 计数 key；T-61-dos 已由双层限额 + fail-closed mitigate（Test 1/2/4/5 覆盖），无新增信任边界。

## User Setup Required
None（运行期）— 生产部署需配置 `AI_REDIS_URL`（或复用 `BULLMQ_REDIS_URL`/`REDIS_URL`）指向限流计数 Redis；限额/窗口 env 可选（有默认）。facade 接入时一并在部署清单标注。

## Next Phase Readiness
- `enforceRateLimit(teacherId)` 就绪，供 Plan 04 facade 在 generateText/generateObject 前置调用（超限/不可达均抛 `ProviderRateLimitError`，与 61-01 错误模型同源，上层按 `kind=rate_limit` + `retryAfter` 决策回退/提示）。
- env 名与默认值、key 命名约定、fail-closed 语义见本 SUMMARY frontmatter 与 Accomplishments。

---
*Phase: 61-ai-provider-abstraction-layer*
*Completed: 2026-05-31*

## Self-Check: PASSED
- FOUND: redis-client.ts, rate-limit.ts, rate-limit.test.ts, 61-02-SUMMARY.md
- FOUND commits: 05662d0 (test), ca5ccb6 (feat), 9acee78 (test), bb40526 (feat), b6bc062 (docs)
- Tests: 9/9 rate-limit.test.ts pass (4 redis-client + 5 enforceRateLimit)
