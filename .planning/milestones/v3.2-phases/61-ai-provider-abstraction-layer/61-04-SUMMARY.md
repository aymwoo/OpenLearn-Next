---
phase: 61-ai-provider-abstraction-layer
plan: 04
subsystem: ai
tags: [ai-sdk, facade, rate-limit, error-mapping, server-only, zod, no-leak]

# Dependency graph
requires:
  - phase: 61-ai-provider-abstraction-layer (Plan 01)
    provides: mapProviderError / ProviderError 联合错误类（错误归一）
  - phase: 61-ai-provider-abstraction-layer (Plan 02)
    provides: enforceRateLimit 双层固定窗口限流（fail-closed）
  - phase: 61-ai-provider-abstraction-layer (Plan 03)
    provides: getLanguageModel 模型工厂 / OpenAI-compatible 装配收口
provides:
  - aiGenerateText / aiGenerateObject —— 教师侧 AI 调用唯一公共入口（限流→装配→生成→归一）
  - src/server/ai/providers/index.ts —— 公共 barrel（generate 入口 + typed errors，零内部泄漏）
  - no-leak.test.ts —— PROV-02 可证明手段：import 图静态隔离 + 返回面深 walk 无凭证
affects: [62-ai-prompt-orchestration, ai-server-actions, lesson-agent, homework-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Facade 编排：限流先行短路 → 装配 → AI SDK generate → mapProviderError 归一"
    - "barrel 收窄公共面：只 re-export generate 入口 + typed error 类，刻意不导出 config/registry/rate-limit"
    - "no-leak 静态证：fs 递归扫 src，按 use-client/proxy-edge/plugins 三集合断言零 import provider"
    - "no-leak 行为证：mock generate 返回掺凭证污染包，深 walk 断言 facade 只外发 text/object"

key-files:
  created:
    - src/server/ai/providers/facade.ts
    - src/server/ai/providers/facade.test.ts
    - src/server/ai/providers/index.ts
    - src/server/ai/providers/no-leak.test.ts
  modified: []

key-decisions:
  - "maxRetries 显式封顶为 2 并禁止本层叠加自定义重试（缓解 T-61-retry-amplification）"
  - "限流在装配/生成之前 await，命中直接冒泡，断言 getLanguageModel/generate 均未被调用"
  - "facade.test.ts mock \"ai\" 用 importActual 透传，保留真实 NoObjectGeneratedError/APICallError 使归一 isInstance 命中"
  - "index.ts 用具名 re-export（非 export *），杜绝内部模块意外外泄"

patterns-established:
  - "AI 调用门面：唯一入口 + 错误归一 + 零泄漏，供 Phase 62 直接接入 prompt 编排"
  - "可证明不泄漏：静态 import 图 + 运行期返回面深 walk 双证（PROV-02）"

requirements-completed: [PROV-01, PROV-02]

# Metrics
duration: 20min
completed: 2026-05-31
---

# Phase 61 Plan 04: Facade 编排入口 + 公共 barrel + 可证明不泄漏 Summary

**aiGenerateText/aiGenerateObject 教师侧唯一入口（限流先行→装配→AI SDK generate→错误归一，maxRetries 封顶 2），index barrel 收窄公共面，no-leak.test.ts 以静态 import 图 + 返回面深 walk 双证 PROV-02 零泄漏**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-05-31
- **Tasks:** 2
- **Files modified:** 4（全部新建）

## Accomplishments
- `facade.ts`：`aiGenerateText` / `aiGenerateObject` 把 Wave 1/2 零件串成固定流水线 —— `enforceRateLimit` → `getLanguageModel` → AI SDK `generate*` → `mapProviderError`；限流命中短路、不进入上游（retry-amplification 防护），`maxRetries: 2` 封顶。
- `index.ts`：公共 barrel 仅暴露两个 generate 入口 + 4 个 typed error 类 + `ProviderError` 类型；刻意不导出 config(apiKey)/registry(model 工厂)/rate-limit/redis-client。
- `facade.test.ts`：6 例覆盖两入口成功路径（含调用顺序与 maxRetries 断言）、限流短路不触发 generate、NoObjectGeneratedError→ParseError、APICallError(503)→UpstreamError、barrel 导出面校验。
- `no-leak.test.ts`：5 例 —— A 组静态扫 src 证明 client/proxy/edge/plugins 三集合零 import provider（含防呆非空断言）；B 组令 generate 返回掺 apiKey/baseURL/Authorization 的污染包，深 walk 证 facade 只外发纯 text/object。

## Task Commits

1. **Task 1 (RED): facade 失败测试** - `a7e8016` (test)
2. **Task 1 (GREEN): facade.ts + index.ts** - `7c018b2` (feat)
3. **Task 2: no-leak 静态 + 行为证** - `b29f885` (test)

**Plan metadata:** （见下方最终提交）

_Task 1 为 TDD（test → feat）；Task 2 为纯测试文件，按提交类型表归为 `test`。_

## Files Created/Modified
- `src/server/ai/providers/facade.ts` - 教师侧 AI 调用唯一入口编排（限流+装配+生成+归一）。
- `src/server/ai/providers/index.ts` - 公共 barrel，收窄可见面至 generate 入口 + typed errors。
- `src/server/ai/providers/facade.test.ts` - facade 编排 6 例（PROV-01）。
- `src/server/ai/providers/no-leak.test.ts` - import 图静态 + 返回面深 walk 双证（PROV-02）。

## Decisions Made
- **maxRetries=2 封顶**：AI SDK 单次调用重试上限显式设小，本层不叠加自定义重试，避免单次教师请求放大为多次上游 + 多次限流计数（T-61-retry-amplification）。
- **限流先行 await**：在 `getLanguageModel`/`generate` 之前执行，命中即冒泡，测试断言下游未被调用 —— 把「限流 = 真省上游成本」做成可验证不变量。
- **mock "ai" 用 importActual 透传**：仅覆盖 generateText/generateObject，保留真实错误类，使 facade→error-mapping 的 `*.isInstance()` 在测试中命中真实标记符号。
- **具名 re-export（非 `export *`）**：barrel 显式列举公共面，从语法层杜绝内部模块意外外泄。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 编辑器 LSP 一度对 provider 目录内 `./config`/`./errors` 等相对 import 报 "Cannot find module"，但 `pnpm typecheck`（真实 tsc）与 vitest 均无报错 —— 确认为 LSP 解析噪音，非真实问题，未做改动。

## No-Leak 覆盖的文件集合（供 Phase 62 参考）
- **A 组静态隔离**：① 所有含 `"use client"` 指令文件（当前 37 个）；② `src/proxy.ts` + 任意 `runtime = "edge"` route（当前仅 proxy.ts，含防呆非空断言）；③ 所有 `plugins/` 目录下模块。三集合**均零 import** `server/ai/providers`。
- **B 组返回面**：`aiGenerateText` 返回纯 `text` 字符串、`aiGenerateObject` 返回纯 `object`；深 walk（key+value）断言不含 `sk-` / `apiKey` 字面值 / `Authorization` / 带密钥的 `baseURL`。

## Verification
- `pnpm vitest run src/server/ai/providers` — 7 文件 / 47 测试全绿。
- `pnpm typecheck` — 通过（无报错）。
- `pnpm lint` — 0 errors（64 warnings 均为预存无关文件，providers/ 零告警）。
- `pnpm vitest run` 全仓回归 — 192 文件 / 1235 测试全绿，无回退。

## Next Phase Readiness
- Phase 62 可直接 `import { aiGenerateText, aiGenerateObject } from "@/server/ai/providers"` 接入 prompt 编排；门面已限流、已归一错误、已证零泄漏。
- 调用方按 `ProviderError.kind` / `instanceof` 决策重试与用户提示；prompt 内容逻辑（D-11）属 Phase 62 范畴，本 phase 不含。

---
*Phase: 61-ai-provider-abstraction-layer*
*Completed: 2026-05-31*

## Self-Check: PASSED

- 4 个交付文件 + SUMMARY 均存在于磁盘。
- 3 个 task 提交（a7e8016 / 7c018b2 / b29f885）均在 git 历史中。
