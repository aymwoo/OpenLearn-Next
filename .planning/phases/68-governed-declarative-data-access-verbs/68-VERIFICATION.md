---
phase: 68-governed-declarative-data-access-verbs
verified: 2026-06-03T03:39:45Z
status: passed
score: 3/3 must-haves verified
re_verification:
  previous_status: none
  note: initial verification
---

# Phase 68: Governed Declarative Data-Access Verbs — Verification Report

**Phase Goal:** 插件只能经白名单具名、Zod 校验、参数化的受治理动词（`insert`/`upsert`/`getByIndex`/`count`/`aggregate`）读写自有表，全部经 Command Bus + governed action registry 带审计；禁止直连 DB、禁止传原始 SQL/where/字段名；写路径 replay-safe 且不产生第二真相源。
**Verified:** 2026-06-03T03:39:45Z
**Status:** PASSED
**Re-verification:** No — initial verification
**Method:** Goal-backward. Each roadmap Success Criterion / ACCESS requirement traced to concrete code at file:line, then both gates executed live.

---

## Commands Run (Live Evidence)

| Command | Result |
| ------- | ------ |
| `pnpm plugin:compile` then `git diff --exit-code -- src/db/schema/generated/` | ✓ `ZERO_DRIFT_OK` — codegen idempotent, checked-in allowlist matches source-of-truth |
| `pnpm verify:phase68` | ✓ **PASSED** — 52/52 unit tests; 5 legal verbs with **zero** denied audits; all **10** D-08 reasons each thrown with exact reason code + exactly **+1** `decision='denied'` governanceAudits row; reason-coverage guard complete (10/10) |

Working-tree drift at verify time: only `local.db-shm/-wal` (documented out-of-scope dev-DB drift) and untracked Phase-66 PNG/`verify66*.db` artifacts. **No Phase-68 source or generated-allowlist drift.**

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria = ACCESS contract)

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| SC1 / ACCESS-01 | 访问只能经固定具名动词；原始 SQL / 自由 `where` / 自由字段名 / 任意表列名被拒（无注入面），表/列名来自服务端常量映射 | ✓ VERIFIED | `contracts.ts` discriminated union exposes only 5 verbs with flat eq/index/value maps — **no** `tenant`/`predicate`/`where`/`rawSql`/`schoolId` field is even typeable. `.strict()` on insert/upsert payloads (`commands/contracts.ts:175,188,194`) rejects smuggled keys. Table/column names resolve **only** from compile-time `pluginDataAccessAllowlist` (`generated/plugin-owned/data-access-allowlist.ts`); `allowlist.ts` `resolvePluginTable`/`assertIndexAllowed` reject `unknown_table_rejected`/`unknown_column_rejected`/`unindexed_column_rejected`. Live gate drove `raw_sql_rejected`, `free_where_rejected`, `unknown_column_rejected`, `unknown_table_rejected`, `unindexed_column_rejected` — each thrown + audited. |
| SC2 / ACCESS-02 | drizzle-zod 同源校验；越权/跨校/非法 payload 被拒并写 governance audit；`schoolId` 由 session 推导，绝不接受插件/前端传入 | ✓ VERIFIED | Insert payload validated by `createInsertSchema(...).strict()` (drizzle-zod, same compiled table) → extra field = `invalid_payload_rejected`. `governance-gate.ts` `assertActionExecutable` derives `schoolId` from authenticated `assertActiveTeacher` session — **gate signature takes no schoolId param**. `read-verbs.ts` forces `eq(table.schoolId, derivedSchoolId)` and rejects any client-supplied `schoolId` key as `cross_school_rejected`. Denials audited to `governanceAudits` (`audit.ts`, no 2nd audit table). Live gate proved `cross_school_rejected`, `invalid_payload_rejected`, `non_school_actor_rejected`, `lifecycle_not_executable`, `kill_switch_rejected` — exact reason + exactly +1 denied row each. |
| SC3 / ACCESS-03 | 写路径 Command Bus → DAL → SQLite (append-only/isLatest) replay-safe；不产生第二 durable 真相源 | ✓ VERIFIED | Writes route through Command Bus: `commands/contracts.ts` + `registry.ts:115-128` register `plugin.data.insert`/`plugin.data.upsert` with `dedupe: "required"` (replay-safe). `handlers/plugin-data.ts`: insert appends (`attemptNo=max+1, isLatest=true`); upsert supersedes prior `isLatest=false` then appends — both inside the execute tx (single SQLite durable truth). Reads bypass Command Bus (correctly) via guarded direct DAL. Live legal pass: insert+upsert+3 reads succeeded against seeded tables with zero denied audits. |

**Score:** 3/3 truths verified.

### Negative-Sample Reason Matrix (D-08 — all driven through the single public facade `dispatchPluginDataAccess`)

| Reason | Thrown | +1 denied audit | Status |
| ------ | ------ | --------------- | ------ |
| raw_sql_rejected | ✓ | ✓ | ✓ |
| free_where_rejected | ✓ | ✓ | ✓ |
| unknown_column_rejected | ✓ | ✓ | ✓ |
| unknown_table_rejected | ✓ | ✓ | ✓ |
| cross_school_rejected | ✓ | ✓ | ✓ |
| invalid_payload_rejected | ✓ | ✓ | ✓ |
| unindexed_column_rejected | ✓ | ✓ | ✓ |
| lifecycle_not_executable | ✓ | ✓ | ✓ |
| kill_switch_rejected | ✓ | ✓ | ✓ |
| non_school_actor_rejected | ✓ | ✓ | ✓ |

Coverage guard asserts `covered.size === PLUGIN_DATA_ACCESS_REASONS.length` (10/10) — anti-drift: a new reason without a negative sample fails the gate.

### Required Artifacts

| Artifact | Provides | Status |
| -------- | -------- | ------ |
| `plugin-data-access/facade.ts` | Single public entry `dispatchPluginDataAccess`; gate runs first | ✓ VERIFIED |
| `plugin-data-access/contracts.ts` | Discriminated-union verb schema, no injection surface | ✓ VERIFIED |
| `plugin-data-access/allowlist.ts` | 10 named reasons + resolve/validate guards | ✓ VERIFIED |
| `plugin-data-access/read-verbs.ts` | getByIndex/count/aggregate, forced schoolId eq, denied-only audit | ✓ VERIFIED |
| `plugin-data-access/governance-gate.ts` | Session-derived schoolId gate | ✓ VERIFIED |
| `commands/handlers/plugin-data.ts` | Append-only insert/upsert | ✓ VERIFIED |
| `commands/registry.ts` | Both write verbs registered (dedupe required) | ✓ VERIFIED |
| `generated/plugin-owned/data-access-allowlist.ts` | Compiled single source, zero-drift | ✓ VERIFIED |
| `scripts/verify-phase68-data-access-verbs.ts` | Close gate (legal + 10 negatives + coverage) | ✓ VERIFIED (executed) |

### Anti-Patterns Found

None blocking. No stubs, no hardcoded table/column names (all from compiled allowlist), no second audit/truth source.

### In-Scope Gaps

None. All 3 ACCESS requirements and all 3 roadmap Success Criteria pass against executed code.

### Out-of-Scope (correctly not flagged)

Runtime DDL, free queries, Phase 69 quiz-answer persistence, Phase 70 stats projection / append-only aggregate double-counting of superseded rows, Phase 71 semver, documented `local.db` dev-DB drift.

---

## Gaps Summary

No gaps. Phase goal is observably achieved: plugins can reach their own tables **only** through 5 allowlist-named, drizzle-zod-validated, parameterized verbs; every injection vector (raw SQL, free where, unknown/ unindexed column, unknown table, cross-school schoolId, illegal payload, non-school actor, disabled/kill-switched lifecycle) is rejected with a named reason and a single denial audit; writes are Command-Bus replay-safe append-only with SQLite as the sole durable truth. Both gates run green with zero codegen drift.

---

_Verified: 2026-06-03T03:39:45Z_
_Verifier: gsd-verifier (goal-backward, gates executed live)_
