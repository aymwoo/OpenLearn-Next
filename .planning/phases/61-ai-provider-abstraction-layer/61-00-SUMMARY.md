---
phase: 61-ai-provider-abstraction-layer
plan: 00
subsystem: ai
tags: [ai-sdk, openai-compatible, vitest, test-fixtures, llm, rate-limit]

# Dependency graph
requires:
  - phase: async-tasks
    provides: ioredis class-mock test pattern (connection.test.ts) reused for mock-redis fixture
provides:
  - ai@~6.0.193 + @ai-sdk/openai-compatible@~2.0.48 installed and minor-pinned
  - .env.example AI provider + rate-limit env block (keys empty, server-only)
  - Shared zero-network test fixtures: MockLanguageModelV3 factories + in-memory ioredis LUA mock
affects: [ai-provider-facade, ai-error-mapping, ai-rate-limiter, ai-agents]

# Tech tracking
tech-stack:
  added: [ai@6.0.193, "@ai-sdk/openai-compatible@2.0.48", "@ai-sdk/provider@3.0.10 (transitive)"]
  patterns:
    - "Shared __fixtures__ dir under src/server/ai/providers for cross-test reuse"
    - "doGenerate injected as direct result object (not async fn) to avoid PromiseLike then-generic literal artifact"
    - "mock-redis as factory returning minimal typed shape implementing fixed-window eval([count, ttl])"

key-files:
  created:
    - src/server/ai/providers/__fixtures__/mock-model.ts
    - src/server/ai/providers/__fixtures__/mock-redis.ts
    - src/server/ai/providers/__fixtures__/fixtures.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - .env.example

key-decisions:
  - "Pin ai/openai-compatible to ~minor (~6.0.193 / ~2.0.48); minor/major upgrades go via dedicated PR"
  - "Constructed result fixtures against ACTUAL @ai-sdk/provider@3.0.10 shapes (structured finishReason/usage), not PLAN interfaces block (older flat shape)"
  - "Excluded prior-phase @fontsource/lexend working-tree change from Task 1 commit via lockfile-only regen + backup/restore"

patterns-established:
  - "AI test fixtures: makeOkTextModel / makeOkObjectModel / makeThrowingModel / makeApiCallError + makeMockRedis"
  - "All AI tests inject mocks — zero real network, no provider keys in tests"

requirements-completed: [PROV-01, PROV-02, PROV-03, PROV-04]

# Metrics
duration: ~25min
completed: 2026-05-31
---

# Phase 61 Plan 00: AI Provider Abstraction Layer — Foundation Summary

**Installed and minor-pinned `ai@6.0.193` + `@ai-sdk/openai-compatible@2.0.48`, registered the server-only AI provider + rate-limit env block, and shipped reusable zero-network test fixtures (MockLanguageModelV3 factories + in-memory fixed-window ioredis LUA mock).**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-31
- **Tasks:** 2
- **Files modified/created:** 6 (3 created, 3 modified)

## Accomplishments
- LLM SDK deps installed and pinned to `~6.0.193` / `~2.0.48` (lockfile updated; transitive `@ai-sdk/provider@3.0.10` is the error-class source).
- `.env.example` gained an AI provider block (`OPENAI_COMPAT_*`, `AI_RL_*`, `AI_REDIS_URL`) with empty keys and an explicit `server-only, never NEXT_PUBLIC_` comment (mitigates T-61-key-leak; bounded rate-limit defaults mitigate T-61-dos).
- Shared fixtures usable by every downstream AI test, injecting `MockLanguageModelV3` and a mock ioredis with **zero real network**; self-check `fixtures.test.ts` is green (7 tests).

## Task Commits

Each task was committed atomically:

1. **Task 1: Install + pin LLM SDK deps, register .env.example AI block** — `9fb53cb` (feat)
2. **Task 2: Shared test fixtures (mock model + mock redis)** — `1843c7c` (test)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified
- `package.json` — added `ai: ~6.0.193`, `@ai-sdk/openai-compatible: ~2.0.48`
- `pnpm-lock.yaml` — resolved ai SDK tree (+ `@opentelemetry/api` transitive re-resolution)
- `.env.example` — AI provider + rate-limit env block (keys empty, server-only)
- `src/server/ai/providers/__fixtures__/mock-model.ts` — `makeOkTextModel`, `makeOkObjectModel`, `makeThrowingModel`, `makeApiCallError`
- `src/server/ai/providers/__fixtures__/mock-redis.ts` — `makeMockRedis` (fixed-window `eval` → `[count, ttl]`, `connect()` fail-sim, `quit()`)
- `src/server/ai/providers/__fixtures__/fixtures.test.ts` — self-check (mock model + mock redis), `vi.mock("server-only")`

## Fixture Export API
- `makeOkTextModel(text = "hello"): MockLanguageModelV3`
- `makeOkObjectModel(obj: unknown): MockLanguageModelV3` (JSON text for generateObject)
- `makeThrowingModel(err: unknown): MockLanguageModelV3`
- `makeApiCallError({ status, retryAfter?, retryable? }): APICallError`
- `makeMockRedis({ counts?, ttl?, failConnect? }): MockRedis` — `eval(lua, numKeys, key, windowSec) => [count, ttl]`

## Env Vars Added
`OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, `OPENAI_COMPAT_MODEL`, `OPENAI_COMPAT_NAME=openai-compatible`, `AI_RL_TEACHER_WINDOW_SEC=60`, `AI_RL_TEACHER_MAX=20`, `AI_RL_GLOBAL_WINDOW_SEC=60`, `AI_RL_GLOBAL_MAX=200`, `AI_REDIS_URL`.

## Version Recheck (RESEARCH valid-until 2026-06-14)
- `npm view ai version` → **6.0.193** (== research-locked, no drift)
- `npm view @ai-sdk/openai-compatible version` → **2.0.48** (== research-locked, no drift)
- Installed exactly the research-locked pins; no minor bump needed.

## Decisions Made
- Pinned both packages to `~minor` to block AI-SDK patch/minor drift; upgrades go through a dedicated PR (per plan).
- Built ok-result fixtures against the **actual installed `@ai-sdk/provider@3.0.10` types**, not the PLAN `<interfaces>` block — see Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PLAN `<interfaces>` LanguageModelV3 result shape was stale vs installed @ai-sdk/provider@3.0.10**
- **Found during:** Task 2 (mock-model.ts authoring) — `pnpm typecheck` rejected the plan's flat shapes.
- **Issue:** PLAN interfaces block specified `finishReason: "stop"` (string) and `usage: { inputTokens, outputTokens, totalTokens }` (flat). The installed `@ai-sdk/provider@3.0.10` defines `LanguageModelV3FinishReason` as an **object** `{ unified: 'stop'|…, raw: string|undefined }` and `LanguageModelV3Usage` as **structured** `{ inputTokens: { total, noCache, cacheRead, cacheWrite }, outputTokens: { total, text, reasoning } }`.
- **Fix:** Constructed `okFinish = { unified: "stop", raw: undefined }` and `okUsage` with the structured nested shape; updated the self-check assertion to `result.finishReason.unified === "stop"`.
- **Files modified:** src/server/ai/providers/__fixtures__/mock-model.ts, fixtures.test.ts
- **Verification:** `tsc --noEmit` clean for fixtures; `vitest run` 7/7 green.
- **Committed in:** `1843c7c`

**2. [Rule 3 - Blocking] doGenerate injected as direct result object instead of `async () => result`**
- **Found during:** Task 2 — passing an async fn triggered a spurious PromiseLike `then`-generic literal reverse-narrowing TS error.
- **Issue:** `MockLanguageModelV3.doGenerate` accepts `fn | result | result[]`; the function form forced a contravariant `then` comparison producing a false `finishReason` mismatch.
- **Fix:** Pass the result object directly for ok models (covariant check passes); kept the async-fn form only for `makeThrowingModel` (needs to throw).
- **Files modified:** src/server/ai/providers/__fixtures__/mock-model.ts
- **Verification:** `tsc --noEmit` clean; tests green.
- **Committed in:** `1843c7c`

**3. [Rule 3 - Blocking] Isolated Task 1 commit from unrelated prior-phase working-tree change**
- **Found during:** Task 1 commit — working tree carried an uncommitted prior-phase `@fontsource/lexend` package.json + lockfile change.
- **Issue:** `git add package.json pnpm-lock.yaml` would have swept in unrelated dependency work.
- **Fix:** Removed the fontsource line, ran `pnpm install --lockfile-only` to regenerate an ai-only lockfile, staged the ai-only files, then restored full working files from `/tmp` backups — leaving the fontsource change unstaged for its own phase.
- **Files modified:** package.json, pnpm-lock.yaml (staged content scoped to ai deps only)
- **Verification:** `git diff --cached package.json` contains no fontsource; unstaged diff contains only fontsource.
- **Committed in:** `9fb53cb`

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking)
**Impact on plan:** No scope change. Fixtures match the real installed SDK contract; commit hygiene preserved. The PLAN `<interfaces>` block should be treated as illustrative — downstream waves must target `@ai-sdk/provider@3.0.x` structured shapes.

## Issues Encountered
- `node_modules/ai/dist/test/index.d.ts` reports "Cannot find module '@ai-sdk/provider'" under pnpm hoisting. Suppressed by `skipLibCheck: true`; runtime resolution is correct (symlinked under ai's own `.pnpm` node_modules). No action needed.

## User Setup Required
None — `.env.example` keys are intentionally empty templates; real provider keys are supplied later via `.env.local` (server-only), not in this wave.

## Next Phase Readiness
- `import { generateText } from "ai"` and `import { createOpenAICompatible } from "@ai-sdk/openai-compatible"` resolve; fixtures ready for facade/error-mapping/rate-limiter waves.
- Downstream waves: use structured `@ai-sdk/provider@3.0.x` result shapes (not the PLAN flat interfaces block).

---
*Phase: 61-ai-provider-abstraction-layer*
*Completed: 2026-05-31*
