---
phase: 61-ai-provider-abstraction-layer
plan: 03
subsystem: ai
tags: [ai-sdk, openai-compatible, registry, language-model, server-only, vitest, tdd]

# Dependency graph
requires:
  - phase: 61-00
    provides: "ai@~6.0.193 / @ai-sdk/openai-compatible@~2.0.48 依赖、零网络测试夹具"
  - phase: 61-01
    provides: "getProviderConfig（server-only env 收口，返回 baseURL/apiKey/modelId/providerName）"
provides:
  - "getLanguageModel(modelId?)：config → createOpenAICompatible → LanguageModel 的唯一装配收口（PROV-01）"
  - "provider 模块级 memoize（同 config 不重复 new，resetModules 间可重置）"
affects: [facade, lesson-agent, server-action-ai]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "单 provider 模型工厂：getLanguageModel(modelId?) + 模块级惰性 memoize（刻意收敛，N=1 强样板优先；待 N>1 再升级为 Map-based registry）"
    - "createOpenAICompatible 唯一调用点收口于 registry.ts（D-02 禁用 @ai-sdk/openai，换 provider 调用方不变）"
    - "vi.hoisted 创建跨 resetModules 持久 mock 句柄，配 vi.mock('@ai-sdk/openai-compatible')/vi.mock('./config') 零网络注入"

key-files:
  created:
    - src/server/ai/providers/registry.ts
    - src/server/ai/providers/registry.test.ts
  modified: []

key-decisions:
  - "按 CONTEXT Discretion 条款刻意收敛为单 provider getLanguageModel(modelId?)，不实现 D-03/PATTERNS 的 Map-based AiProviderAdapter（有意简化而非范围削减）"
  - "provider memoize 用模块级单例 + 惰性装配，测试间 vi.resetModules() 重置"
  - "导出面仅 getLanguageModel（Test 4 断言 Object.keys），apiKey 只在 createOpenAICompatible 调用点消费"

patterns-established:
  - "模型工厂分层：registry（装配/memoize）与 facade（编排 generate/限流/错误映射）解耦，仿 seams contract/adapter 切分"

requirements-completed: [PROV-01]

# Metrics
duration: ~6min
completed: 2026-05-31
---

# Phase 61 Plan 03: 模型工厂 / registry（PROV-01）Summary

**`getLanguageModel(modelId?)` 把 server-only `getProviderConfig` 装配成 AI SDK 可用的 LanguageModel，收口 `createOpenAICompatible` 唯一调用点并对 provider 做模块级 memoize，导出面仅 `getLanguageModel`、不外泄 apiKey/原始 provider 客户端。**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-31T12:29:00Z (approx)
- **Completed:** 2026-05-31T12:31:00Z
- **Tasks:** 1 (TDD)
- **Files modified:** 2 created

## Accomplishments
- `registry.ts`：`config → createOpenAICompatible({name,baseURL,apiKey}) → provider(modelId)` 的装配收口；首行 `import "server-only"`，未引入 `@ai-sdk/openai`（D-02 校验 grep=0）。
- `getLanguageModel(modelId?)`：缺省取 `getProviderConfig().modelId`，可由入参覆盖。
- provider 模块级惰性 memoize（同 config 不重复 new），测试间 `vi.resetModules()` 重建。
- 导出面仅 `getLanguageModel`（Test 4 断言），apiKey 仅在装配点消费，mitigate T-61-key-leak。

## Task Commits

Each task committed atomically (TDD test → feat):

1. **Task 1: registry.ts 装配（PROV-01）** — `c8ef497` (test) → `698f8da` (feat)

_REFACTOR 阶段未触发（实现已清晰，无需重构提交）。_

## Files Created/Modified
- `src/server/ai/providers/registry.ts` - config → OpenAI-compatible LanguageModel 装配收口，导出 `getLanguageModel`
- `src/server/ai/providers/registry.test.ts` - 4 例：装配调用正确 / modelId 可覆盖 / provider memoize+重置 / 导出面仅 getLanguageModel（vi.hoisted + resetModules + 动态 import）

## getLanguageModel 签名与装配链（供 Plan 04 facade 调用）
- `getLanguageModel(modelId?: string)` → AI SDK LanguageModel handle，喂给 `ai` 的 `generateText`/`generateObject`。
- 装配链：`getProviderConfig()`（env 收口）→ `createOpenAICompatible({ name: providerName, baseURL, apiKey })`（memoize）→ `provider(modelId ?? config.modelId)`。
- 换 provider 只改 `registry.ts` 装配点，调用方（facade）不变（PROV-01 load-bearing 判据成立）。

## Decisions Made
- 按 CONTEXT「N=1 强样板优先，不过度设计」Discretion 条款，**刻意**收敛为单 provider `getLanguageModel(modelId?)` + 模块级 memoize，不实现 D-03/PATTERNS 的 `AiProviderAdapter` + `Map` + `setProvider`/`__resetRegistry`。有意简化，待真有 N>1 需求再向后兼容升级为 Map-based registry。
- 测试注入走 `vi.mock("@ai-sdk/openai-compatible")` + `vi.mock("./config")` + `vi.mock("server-only")`，零网络。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- LSP 噪音：编辑器对 `./registry`、`./config`、`./errors` 等同级模块报 "Cannot find module"（pnpm hoisting + LSP 解析伪报，与 61-00/61-01 记录的 `skipLibCheck` 噪音同源）。经 `npx tsc --noEmit` 校验 registry 无真实类型错误，vitest 36/36 全绿，无害。

## Known Stubs
None — registry 为完整可用装配实现，无占位/mock 数据流向运行期。

## User Setup Required
None — 运行期 `OPENAI_COMPAT_*` env 将由 facade/调用方接入时通过 `.env.local`（server-only）配置。

## Next Phase Readiness
- `getLanguageModel` 就绪，供 Plan 04 facade 编排 `generateText`/`generateObject` + 限流（`enforceRateLimit`）+ 错误映射（`mapProviderError`）。
- 完整 providers 套件 36/36 通过，无回归。

---
*Phase: 61-ai-provider-abstraction-layer*
*Completed: 2026-05-31*

## Self-Check: PASSED
- FOUND: src/server/ai/providers/registry.ts, registry.test.ts
- FOUND commits: c8ef497 (test), 698f8da (feat)
- Tests: registry 4/4 pass; providers suite 36/36 pass
- Verify: grep `@ai-sdk/openai"` in registry.ts = 0 (D-02 satisfied)
