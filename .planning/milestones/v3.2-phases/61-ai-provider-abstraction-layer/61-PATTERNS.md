# Phase 61: AI Provider Abstraction Layer - Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 11 new files (5 source + 6 test) + 1 modified (`.env.example`)
**Analogs found:** 11 / 11 (every new file has a verified in-repo analog)
**Mode:** Read-only analysis. No source code written. Only this file (`61-PATTERNS.md`) created.

> Greenfield phase: target dir `src/server/ai/providers/` (import alias `@/server/ai/providers`). Every analog path/line below was opened and verified. Inaccurate RESEARCH citations are corrected in the "Citation Corrections" section.

---

## File Classification

| New File | Role | Data Flow | Closest Analog (verified path) | Match Quality |
|----------|------|-----------|-------------------------------|---------------|
| `config.ts` | config | request-response (env read) | `src/lib/dal/classroom.ts:1` (server-only header) + RESEARCH `config.ts` example | role-match |
| `registry.ts` | registry/provider | factory + resolve seam | `src/features/runtime-platform/seams/event-bus/{contract,default-adapter}.ts` + `seams/index.ts` | exact (contract/adapter seam) |
| `facade.ts` | service (orchestration) | request-response (LLM call) | `src/lib/dal/classroom.ts` (server-only + named exports) | role-match |
| `errors.ts` | model (typed errors) | n/a (data shape) | `seams/event-bus/contract.ts` (discriminated/Zod typed boundary) | partial |
| `error-mapping.ts` | utility (mapping) | transform | RESEARCH `error-mapping.ts` example (no exact analog — new) | no-analog |
| `rate-limit.ts` | service (rate limiter) | event-driven (Redis INCR) | `src/features/async-tasks/infra/connection.ts` (Redis usage) | role-match |
| `redis-client.ts` | infra (Redis singleton) | connection mgmt | `src/features/async-tasks/infra/connection.ts:111-166` (lazyConnect memoized promise) | exact |
| `config.test.ts` | test | unit | `src/lib/dal/classroom.test.ts:39` (`vi.mock("server-only")`) | exact |
| `error-mapping.test.ts` | test | unit | `src/features/.../seams.test.ts` + TESTING.md error pattern | role-match |
| `registry.test.ts` | test | unit | `connection.test.ts` (module re-import + env reset) | exact |
| `facade.test.ts` | test | unit | `connection.test.ts:33-80` (`await import()` per-test) + `ai/test` MockLanguageModelV3 | role-match |
| `rate-limit.test.ts` | test | unit | `src/features/async-tasks/infra/connection.test.ts:8` (`vi.mock("ioredis")`) | exact |
| `no-leak.test.ts` | test | static | `classroom.test.ts:1` (`readFileSync` for source-text assertions) | partial |

---

## Pattern Assignments

### `redis-client.ts` (infra, Redis lazyConnect singleton)

**Analog:** `src/features/async-tasks/infra/connection.ts` (227 lines) — **VERIFIED, exact match for the singleton mechanism.**

**Server-only + import order** (lines 1-3):
```typescript
import "server-only";

import Redis from "ioredis";
```

**Memoized connection promise singleton** (lines 43, 153-166) — copy this exact shape:
```typescript
const connectionPromises: Partial<Record<BullmqConnectionRole, Promise<Redis>>> = {};

async function getBullmqConnection(role: BullmqConnectionRole) {
  // ...
  if (!connectionPromises[role]) {
    connectionPromises[role] = createBullmqConnection(role).catch((error) => {
      // ...reset state...
      delete connectionPromises[role];   // ← critical: clear on failure so retry can reconnect
      throw error;
    });
  }
  return connectionPromises[role]!;
}
```
> RESEARCH's `redis-client.ts` example (lines 379-391) uses `let promise: Promise<Redis> | null` and `promise = r.connect().then(...).catch((e)=>{promise=null;throw e;})`. This is a **simplified, correct** version of the same pattern. The repo analog additionally `delete`s the key on failure — copy that failure-reset discipline.

**Connection options** (lines 111-118) — copy `lazyConnect`, `maxRetriesPerRequest`, `connectionName`:
```typescript
return {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: role === "producer" ? 1 : null,
  connectionName: `openlearn-${role}-${getBullmqInstanceId()}`,
} as const;
```
> For rate-limit, use `maxRetriesPerRequest: 1` (fail-fast → enables fail-closed per D-05/Missing-deps).

**Env URL resolution** (lines 178-189): reads `process.env.BULLMQ_REDIS_URL?.trim()`. New file should resolve `AI_REDIS_URL ?? BULLMQ_REDIS_URL ?? REDIS_URL` (RESEARCH A3). Throw a stable error code string (e.g. `AI_REDIS_URL_NOT_CONFIGURED`) — matches repo convention of throwing `UPPER_SNAKE` codes (`BULLMQ_ENV_NOT_READY`, line 126).

---

### `registry.ts` (registry, contract/adapter seam, N=1)

**Analog:** `src/features/runtime-platform/seams/event-bus/contract.ts` (35 lines) + `default-adapter.ts` (61 lines) + `seams/index.ts` (26 lines) — **VERIFIED, exact match for the seam style cited in D-03.**

**Contract interface shape** (`contract.ts:29-35`) — copy `readonly id` + method seam:
```typescript
export interface RuntimeEventBusAdapter {
  readonly id: string;
  readonly ownership: RuntimeEventBusOwnership;
  describeOwnership(): RuntimeEventBusOwnership;
  publish(event: RuntimeEventEnvelope): Promise<void>;
  subscribe(topic: string, handler: RuntimeEventHandler): () => void;
}
```
→ For provider: `interface AiProviderAdapter { readonly id: string; resolveModel(): LanguageModel; }` (RESEARCH registry.ts:160-163). The `readonly id` + single resolve method mirrors the analog exactly.

**Default adapter as a singleton instance** (`default-adapter.ts:20-21, 61`):
```typescript
class DefaultRuntimeEventBusAdapter implements RuntimeEventBusAdapter {
  readonly id = "event-bus-default-adapter";
  // ...
}
export const defaultRuntimeEventBusAdapter = new DefaultRuntimeEventBusAdapter();
```
> **Deviation for testability seam (VALIDATION requirement):** the analog exports a single frozen instance. Phase 61 registry must expose a **test-overridable seam** (`registry.test.ts` + `facade.test.ts` need to inject `MockLanguageModelV3`). Use the `Map<string, AiProviderAdapter>` + lazy `getProvider(id)` from RESEARCH registry.ts:178-183, and add a `setProvider(id, adapter)` / `__resetRegistry()` test hook. This is the one deliberate divergence from the seam analog — justified by VALIDATION §"provider 注入方式".

**Barrel/registry descriptor** (`seams/index.ts:15-26`): the `runtimePlatformSeams` const-object documents `defaultAdapter`/`supportedAdapters` as a typed record. An `index.ts` for providers may mirror this to declare `DEFAULT_PROVIDER_ID`.

---

### `config.ts` (config, server-only env read)

**Analog:** `src/lib/dal/classroom.ts:1` — **VERIFIED** `import "server-only";` is line 1, followed by blank line then imports (CONVENTIONS.md import order: server-only first).

**Pattern:** server-only header + named-export function reading `process.env`, throwing an `UPPER_SNAKE` code on missing config (mirrors `connection.ts:126` `BULLMQ_ENV_NOT_READY`). RESEARCH config.ts:398-406 already matches repo idiom — throw `AI_PROVIDER_NOT_CONFIGURED` when `baseURL/apiKey/modelId` missing. No DB import (unlike classroom DAL) — config is pure env.

**New env vars** (register in `.env.example`, see Shared Patterns): `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, `OPENAI_COMPAT_MODEL`, optional `OPENAI_COMPAT_NAME`, plus `AI_RL_*` limits and optional `AI_REDIS_URL`.

---

### `facade.ts` (service, orchestration — the only public surface)

**Analog:** `src/lib/dal/classroom.ts` (server-only, named-exports-only, no default export — CONVENTIONS.md "Module Design"). No direct LLM analog exists in repo (greenfield), so copy *conventions* not logic:
- Line 1 `import "server-only";`
- Named exports only (`export async function aiGenerateText` / `aiGenerateObject`)
- Return DTO-only objects (`{ text }` / `{ object }`) — never the model handle (D-02). Mirrors DAL's "return typed DTO" rule (CONVENTIONS.md:84-86).
- `try/catch` wrapping the SDK call, re-throwing typed errors via `mapProviderError` (RESEARCH facade.ts:201-231).

---

### `errors.ts` (model, discriminated-union typed errors)

**Analog (partial):** `seams/event-bus/contract.ts` — closest repo example of a **typed discriminated boundary** (Zod enum + `z.infer` types). The repo has no existing custom `Error` subclass hierarchy, so this is largely new. Follow CONVENTIONS.md:
- PascalCase class names with a literal `kind` discriminant + `readonly retryable` (RESEARCH errors.ts:298-307).
- `UPPER_SNAKE` not needed here (these are classes, not codes).

**Shape to build** (from RESEARCH, aligns D-08):
```typescript
export class ProviderRateLimitError extends Error {
  readonly kind = "rate_limit";
  readonly retryable = false;
  constructor(msg: string, readonly retryAfter: number) { super(msg); }
}
```

---

### `error-mapping.ts` (utility, transform — NO repo analog)

**No analog exists.** Planner should use RESEARCH §Code Examples (lines 310-340) directly. Key non-negotiable convention from RESEARCH/AGENTS: use `XxxError.isInstance(err)` (static), **never `instanceof`** for AI SDK error classes (cross-bundle reliability). Map order: own `ProviderRateLimitError` → parse-class (`NoObjectGeneratedError`/`JSONParseError`/`TypeValidationError`) → `APICallError` (429 vs `isRetryable`) → `TimeoutError` name → fallback upstream.

---

### `rate-limit.ts` (service, Redis fixed-window)

**Analog:** `connection.ts` for Redis access discipline (server-only + `getAiRedis()` from `redis-client.ts`). The Lua INCR+EXPIRE logic is new (RESEARCH rate-limit.ts:344-377). Convention to copy: server-only header, `UPPER_SNAKE` constants, throw typed `ProviderRateLimitError` (not generic Error). Fail-closed on Redis unreachable (RESEARCH Missing-deps → matches `connection.ts` degraded semantics).

---

## Test File Patterns

### `vi.mock("ioredis")` — for `rate-limit.test.ts` / `redis-client.test.ts`

**Analog:** `src/features/async-tasks/infra/connection.test.ts:8-31` — **VERIFIED at line 8.** Copy the class-mock shape:
```typescript
vi.mock("server-only", () => ({}));            // line 6
vi.mock("ioredis", () => ({
  default: class MockRedis {
    constructor(url, options) { redisInstances.push({ url, options }); }
    on() { return this; }
    async connect() { return this; }
    async quit() { return quit(); }
  },
}));
```
> For rate-limit you must also mock `.eval()` (the Lua call) to return `[count, ttl]` tuples. Add an `eval` method to the MockRedis class returning a controllable counter. Alternatively `ioredis-mock` (RESEARCH/VALIDATION offer both).

### `vi.mock("server-only", () => ({}))` — for ALL provider tests

**Analog:** `src/lib/dal/classroom.test.ts:39` — **VERIFIED at line 39.** Also present in `connection.test.ts:6`. Every `*.test.ts` in this phase must declare this (modules start with `import "server-only"`).

### Per-test dynamic `await import()` + env reset — for `config.test.ts` / `registry.test.ts`

**Analog:** `connection.test.ts:34-45` — **VERIFIED.** Pattern for env-driven singleton modules:
```typescript
beforeEach(() => {
  vi.resetModules();          // ← critical: reset memoized singleton between tests
  vi.clearAllMocks();
  process.env.OPENAI_COMPAT_API_KEY = "test-key";
  // ...set env...
});
it("...", async () => {
  const { getProviderConfig } = await import("./config");  // import AFTER env set
});
```
> `vi.resetModules()` is mandatory because `redis-client.ts` and `registry.ts` hold module-level memoized state.

### `MockLanguageModelV3` injection — for `facade.test.ts` / `registry.test.ts`

**No repo analog** (greenfield). Source: `ai/test` (VERIFIED in RESEARCH: ai@6.0.193 exports `MockLanguageModelV3`, not V2). Inject via the registry's test-override seam (`setProvider`). See RESEARCH/VALIDATION lines 479-490 for the `doGenerate` stub shape. **Zero real network** is the hard rule.

### Source-text static assertion — for `no-leak.test.ts`

**Analog (partial):** `classroom.test.ts:1` — **VERIFIED** uses `import { readFileSync } from "node:fs"`. Same technique: read provider source files / proxy.ts / client files as text and assert import-graph isolation + that returned DTOs contain no `apiKey`/`baseURL`/`Authorization` keys (deep-walk). This is the repo-idiomatic way to do static checks inside Vitest.

---

## Shared Patterns

### Server-only header + import order
**Source:** CONVENTIONS.md:39-47 + `classroom.ts:1` + `connection.ts:1-3` (all VERIFIED)
**Apply to:** every source file (`config/registry/facade/errors/error-mapping/rate-limit/redis-client`)
```typescript
import "server-only";          // 1. always first, own line, blank line after

import Redis from "ioredis";   // 2. node builtins → 3. external → 4. @/ → 5. relative
```
> `error-mapping.ts` and `errors.ts` are pure (no env/IO) — `server-only` still recommended for import-graph isolation (PROV-02), but only files that touch `process.env`/Redis strictly require it. Keep all 5 source files server-only for uniform leak protection.

### Naming conventions (CONVENTIONS.md:7-27)
- Files: **kebab-case** (`rate-limit.ts`, `error-mapping.ts`, `redis-client.ts`) — matches `plugin-migration.ts`.
- Functions: camelCase, verb-prefixed (`getProviderConfig`, `getAiRedis`, `enforceRateLimit`, `mapProviderError`, `resolveModel`).
- Constants: `UPPER_SNAKE_CASE` (`DEFAULT_TIMEOUT_MS`, `MAX_RETRIES`, `DEFAULT_PROVIDER_ID`).
- Error codes thrown as strings: `UPPER_SNAKE` (`AI_PROVIDER_NOT_CONFIGURED`, `AI_REDIS_URL_NOT_CONFIGURED`) — matches `BULLMQ_ENV_NOT_READY`.
- Types/classes/interfaces: PascalCase (`AiProviderAdapter`, `ProviderRateLimitError`).

### Module exports (CONVENTIONS.md:191-199)
**Named exports only. No default export.** Re-export public surface via `index.ts` barrel (like `seams/index.ts`). Facade + error types re-exported from `index.ts`; SDK handles never re-exported (D-02).

### Test colocation (TESTING.md:22-41)
Tests **co-located** with source in the same dir, `{module}.test.ts`. Glob already covers `src/**/*.{test,spec}.ts` (vitest.config.mts:14 VERIFIED). No config change needed.

### Env declaration (`.env.example` — VERIFIED, 32 lines)
**Apply to:** add a commented section block (like lines 13-20 BullMQ block):
```
# AI provider — OpenAI-compatible endpoint (server-only, never NEXT_PUBLIC_)
OPENAI_COMPAT_BASE_URL=
OPENAI_COMPAT_API_KEY=
OPENAI_COMPAT_MODEL=
# AI rate limit (optional overrides)
AI_REDIS_URL=
```
> `.env.example` is the ONE non-provider file this phase modifies. Convention: grouped, commented sections; secrets left blank with a comment; never `NEXT_PUBLIC_` for keys.

### server-only test shim (`scripts/server-only-node-shim.cjs` — VERIFIED, 14 lines)
For any `tsx` node script (not Vitest) that imports provider modules, use `node --require scripts/server-only-node-shim.cjs`. Vitest path uses `vi.mock("server-only")` instead — both already exist, no new shim needed.

---

## No Analog Found

| New File | Role | Reason | Planner Guidance |
|----------|------|--------|------------------|
| `error-mapping.ts` | utility | No existing AI-SDK error mapping in repo | Use RESEARCH §Code Examples 310-340 verbatim; enforce `.isInstance()` not `instanceof` |
| `facade.ts` (logic) | service | No LLM call site exists yet | Conventions from `classroom.ts`; logic from RESEARCH Pattern 2 |
| `MockLanguageModelV3` fixtures | test fixture | First AI test in repo | From `ai/test`; build shared factory (VALIDATION Wave-0 "共享夹具") |

---

## Citation Corrections (RESEARCH inaccuracies)

| RESEARCH Claim | Reality (VERIFIED) | Impact |
|----------------|--------------------|--------|
| "项目根同时存在空的 `server/ai` 与 `src/server/ai`" (line 147) | **Root `server/` does NOT exist** (`ls server/` → empty/absent). Only `src/server/ai/` exists, containing just `agents/`. | LOW — conclusion (use `src/server/ai/providers`) is still correct; there is simply no root residual to "clean up". Planner: drop the "清理根级空 server/" sub-task. |
| `src/lib/dal/classroom.test.ts:39` `vi.mock("server-only")` | **CONFIRMED exact at line 39.** | None — accurate. |
| `connection.test.ts:8` `vi.mock("ioredis")` | **CONFIRMED exact at line 8.** | None — accurate. |
| `classroom.ts:1` `import "server-only"` | **CONFIRMED at line 1.** | None — accurate. |
| seams `contract.ts`/`default-adapter.ts` + `seams/index.ts` | **CONFIRMED all three exist** at `seams/event-bus/` and `seams/index.ts`. | None — accurate. |
| `redis-client.ts` lazyConnect via `let promise \| null` | Repo analog (`connection.ts`) uses a `Record` of memoized promises and **`delete`s the key on failure**. RESEARCH's `null`-reset is a valid simplification. | LOW — adopt the repo's failure-reset discipline. |
| TESTING.md says "Vitest v1.x" (line 8) | VALIDATION/RESEARCH say Vitest **4.1.5**; `vitest.config.mts` confirms modern config. TESTING.md (dated 2026-05-24) is stale on the version number. | LOW — use 4.1.5; patterns still valid. |

---

## Metadata

**Analog search scope:** `src/features/async-tasks/infra/`, `src/features/runtime-platform/seams/`, `src/lib/dal/`, `src/server/`, repo root config (`vitest.config.mts`, `.env.example`, `scripts/`), `.planning/codebase/{CONVENTIONS,TESTING}.md`
**Files opened & verified:** 11 (connection.ts, connection.test.ts, classroom.ts, classroom.test.ts, event-bus/contract.ts, event-bus/default-adapter.ts, seams/index.ts, vitest.config.mts, server-only-node-shim.cjs, .env.example, CONVENTIONS.md, TESTING.md) + dir listing of `src/server`
**Pattern extraction date:** 2026-05-31
