# Project Research Summary

**Project:** OpenLearn Next
**Milestone:** v4.0 — Plugin Marketplace & Plugin-Owned Data (SUBSEQUENT milestone, builds onto a validated platform)
**Domain:** Declarative, governed third-party plugin data model + marketplace lifecycle (publish → install → upgrade → uninstall) + interactive-quiz sample plugin + question stats / post-class recap, on an existing Next.js 16 / Drizzle / SQLite educational OS
**Researched:** 2026-06-02
**Confidence:** HIGH

## Executive Summary

**All four research streams converge on one thesis: v4.0 is ~90% completing and generalizing frozen scaffolding, not building a plugin system from scratch.** The platform kernel (Command Bus, governed action registry, event ledger, plugin lifecycle/governance audit, runtime host) and the data primitives (`pluginRegistrations` with `dbNamespace`/`lifecycleState`/`sourceType`/`uninstallRetentionMode: retain|cleanup`, the `plugin_ext_*` extension tables, the generic `plugin_owned_business_data` KV table, the `backfill → verify → cutover` DML-only migration discipline in `plugin-migration.ts`, the cleanup-confirmation-token pattern in `plugins.ts`) **already exist in the codebase and must be reused, not re-introduced.** The job is to assemble these seams into one repeatable end-to-end vertical slice with governance-visible behavior and a stats surface.

The architecture team pinpoints exactly **three real gaps**: (1) **declarative per-plugin STRUCTURED owned tables** — today there is only the generic `key + payloadJson` KV bag, missing the "declare → compile into checked-in Drizzle migration" link; (2) **marketplace lifecycle UX for external (non-built-in) plugins** — the current marketplace surface `.filter(builtIn)`s and only does enable/disable, with no semver install/upgrade or retain/cleanup uninstall flow; (3) **the interactive-quiz sample plugin's persistence + stats** — answer recording into owned data, plus question correctness-rate / option-distribution / answered-vs-unanswered counts and a post-class recap. The recommended pattern is **"compile, don't execute"**: plugin-declared tables are compiled at dev/publish time into checked-in Drizzle migrations applied via the existing `db:migrate` path. **No runtime DDL, no second migration engine, no dynamic SQL.**

**The dominant risk is red-line erosion under "flexibility" pressure.** The pitfalls research is emphatic and consistent: do not stuff queryable quiz answers into the JSON KV bag (kills SQL aggregation and uniqueness); do not let the marketplace scope-creep into store-operations (billing/ratings/dev-portal/auto-review — all explicitly Out of Scope); do not reach for runtime `CREATE TABLE`/`umzug`/`knex`/`ajv` (each breaks a stated red line); do not open a "flexible query" host API that is SQL injection by another name; and **the sample quiz plugin must travel the SAME governed path as a third-party plugin** — no built-in back door — or the architecture is never actually proven. Mitigation is a single vertical slice gated by `verify:phase`: migration correctness, zero-loss upgrade, multi-school/multi-class isolation, uninstall governance audit, injection/over-reach rejection, single-truth-source, and no-back-door assertions.

## Key Findings

### Recommended Stack

The substrate is **entirely already in `package.json`** and is the fixed integration surface: `drizzle-orm@0.45.2` (defines the compiled owned `sqliteTable`s and runs the parameterized query verbs), `drizzle-kit@0.31.10` (generates checked-in SQL migrations — this *is* the "main-repo migration system"), `@libsql/client@0.17.3` (SQLite driver; `json_extract` + generated columns + indexes cover quiz stats with no new storage engine), `zod@4.4.3` (meta-schema validating the new `dataModel` manifest section), and Next 16 / React 19 Server Actions + DAL. **Do not add or bump any of these.**

**Add exactly two libraries (and only two):**

- **`semver` (`^7.8.1`) + `@types/semver`** — plugin version parse/compare/range-satisfy; resolve which upgrade migration chain to run, reject downgrades/illegal jumps. Hand-rolled version math is a classic upgrade-bug source; `semver` is npm's own canonical implementation.
- **`drizzle-zod` (`^0.8.3` stable — NOT the `1.0.0-beta`)** — derive `createInsertSchema`/`createSelectSchema` from the *compiled* plugin tables so declared schema ↔ physical table ↔ runtime validation never drift. Peer deps verified compatible with the repo's drizzle-orm 0.45.2 and zod 4.4.3.

**Self-build (no library — required to satisfy red lines):** the declarative `dataModel` DSL + Zod meta-schema (enforces `dbNamespace` prefixing, allowed column types only, no FK into core tables, `schoolId`-scoped + cascade); the schema compiler (`dataModel` JSON → Drizzle `sqliteTable` TS → `drizzle-kit generate` → checked-in migration); the governed declarative data-access verbs (`insert`/`upsert`/`getByIndex`/`count`/`aggregate` — the "no plugin direct DB" boundary IS this layer); the semver upgrade-migration planner (reusing `backfill → verify → cutover`); and the uninstall retain/cleanup executor (the enum + cascade already exist).

### Expected Features

The feature research frames v4.0 as **proving the data-governance model with one real plugin (interactive quiz) + filling in marketplace lifecycle visibility + the stats face** — not "can we build a data layer."

**Must have (table stakes / v4.0 committed vertical slice):**
- Declarative manifest `dataModel` (owned entities + relations) + install-time Zod/governance validation + cascade cleanup — proves "no core-table pollution, no runtime DDL."
- Classroom path writes answers into plugin-owned data via governed action/DAL (idempotent, school/plugin-scoped).
- Marketplace governed loop: publish → install (preflight: permissions + data declaration + compatibility) → upgrade (`backfill → verify → cutover`, rollback-safe) → uninstall (retain/cleanup selectable + visible), full audit.
- Destructive-op protection for in-progress classrooms (extend `getPluginUninstallBlockReason` to active sessions).
- Interactive-quiz sample: single-choice config + student classroom answering + append-only answer records (`isLatest`) in plugin-owned data.
- Stats face: per-question correctness rate / option distribution / answered-vs-unanswered counts (from plugin data, DAL→DTO, cache-invalidated on write) + post-class recap entry (Stitch/DESIGN-aligned).
- `verify:phase` close gate holding migration correctness + governance boundary + repeatable sample chain.

**Should have (differentiators):**
- Upgrade dry-run / migration rehearsal (verify before cutover).
- Uninstall-retain → reinstall recovery promise (the actual value of retain mode).
- Operator-side lifecycle observability (extends v3.1 recovery posture).

**Defer (v4.x / v5+):** multi-question-types (multi-choice/true-false/short-answer); real-time answer-progress broadcast; per-student recap / stats export; LessonAgent question generation; cross-classroom trend stats / AI diagnosis. **Explicitly Out of Scope (never this milestone):** store-operations layer (paid/billing, ratings/reviews, public developer portal, automated review pipeline), one-click install-from-arbitrary-URL, silent background auto-upgrade, multi-tenant SaaS.

### Architecture Approach

A four-layer governed monolith already exists (UI/Surface → platform-core kernel → DAL as sole write-truth → SQLite/Drizzle centralized migration). v4.0 threads three new strands through it: a compile-time `lib/plugins/owned-schema/` (declaration → Zod validation → generated migration fragment), a `plugin-owned-exam.ts` (scope-asserted owned-table read/write + stats aggregation, reusing `plugin-data.ts`'s `assertTeacherManagerScope`/`assertPluginBelongsToSchool` patterns), and `plugins/exam/persistence/` stitching the existing pure-function scorer + runtime submit chain into "declared data → runtime write → stats read."

**Major components:**
1. **Declarative owned-schema registry + compiler** (`lib/plugins/owned-schema/`) — NEW; the heart of the milestone. Declaration is compile-time only; output is a reviewed, checked-in migration.
2. **Governed declarative data-access verbs** (DAL) — NEW; the "no plugin direct DB / no arbitrary code" boundary. Plugins emit declarative intents; DAL executes parameterized Drizzle.
3. **Command-Bus lifecycle transactions** (`handlers/plugins.ts` + `plugins.ts` `*WithTx`) — EXISTS; atomic install/upgrade/uninstall + audit + lifecycle transition; v4.0 extends cleanup-token counting to owned tables and adds semver upgrade planning.
4. **Runtime append-only submit bridge** (`runtime-host` → `submitRuntimeState` → `taskSubmissions`, `isLatest`) — EXISTS; exam reuses the proven voting path.
5. **Marketplace surface** — EXISTS but `.filter(builtIn)`-limited; extend to expose `external` plugins with install/upgrade/uninstall/cleanup UX.

### Critical Pitfalls

1. **JSON-bag stats** — recording quiz answers as `payloadJson` rows forces full-table scan + app-layer `JSON.parse` aggregation, no SQL `GROUP BY`/index, no "one student-one question latest" uniqueness. → Structured per-plugin owned table with composite covering index; append-only + `isLatest`.
2. **Runtime DDL smuggling** — interpreting "declarative" as "plugin defines tables at runtime" and string-building `CREATE TABLE` from manifest. → Two-stage: declaration in code (compile-time) → `drizzle-kit generate` → reviewed migration; runtime is CRUD-only. Add a static-scan gate forbidding non-migration DDL/raw SQL.
3. **Lossy upgrade** — `DROP`/recreate plugin tables or change column types (SQLite's table-rebuild path silently drops rows). → `expand → migrate → contract`, explicit `dataVersion`, row-count/checksum reconciliation, and a close-gate test that upgrades WITH real answer data asserting zero loss.
4. **Uninstall retain/cleanup ambiguity** — unconditional FK cascade on uninstall (deletes irreversible learning evidence) OR retained data leaking into a same-`pluginKey` reinstall. → Two-phase (soft-uninstall + data disposition), both audited; `cleanup` needs explicit count-derived confirmation token + impact display; reinstall is a NEW `pluginId` identity, never implicit takeover by key string.
5. **"Flexible query" injection face** — a host API accepting raw SQL fragments / free `where` / free field names = SQL injection + cross-tenant over-reach without literal `eval`. → Whitelisted named, Zod-validated, parameterized verbs only; table/column names from server-side constant maps; `schoolId` from session, never plugin input.
6. **Sample-plugin back door** — the quiz sample reading/writing core tables or a built-in privileged path instead of the governed path, leaving the architecture unproven. → Sample MUST travel the identical third-party path; close gate asserts it doesn't import the core DB client and its actions are audit-visible.

(Also flagged: isolation by `pluginId` alone missing `schoolId`+classroom scope; marketplace scope-creep; second-truth-source via WS/Redis counters; `dbNamespace`/`pluginKey` identity drift on reinstall.)

## Implications for Roadmap

All four researchers independently produce **the same build order** (STACK "Stack Patterns + Upgrade flow", ARCHITECTURE "Build Order" 1–6, PITFALLS "Phase A–F", FEATURES "Feature Dependencies"). Phase themes below (numbering open; pitfalls research suggests v4.0 starts ~Phase 67):

### Phase A: Declarative owned-schema DSL + Zod meta-schema + schema compiler
**Rationale:** No dependencies; defines the compile contract that everything else stands on. Carries Pitfalls 1/2/3/4 (structured-table contract, no-runtime-DDL, `dataVersion` + migration safety, isolation invariants).
**Delivers:** `manifestVersion: 3` `dataModel` section, Zod meta-validation (namespace prefix, allowed types, no core-table FK, `schoolId`+cascade), schema compiler emitting `p_<namespace>_<table>` Drizzle tables → `drizzle-kit generate` → checked-in migration. Extend the `sqlite-migration-proof` gate (`verify:phaseNN`) to cover new owned tables.
**Uses:** `zod`, `drizzle-kit`, `drizzle-zod`, existing `deriveDbNamespace`.

### Phase B: Governed declarative data-access verbs
**Rationale:** Depends on A's compiled tables. This layer IS the "no plugin direct DB / no arbitrary code" boundary. Carries Pitfalls 6/8 (write half).
**Delivers:** fixed whitelisted verbs (`insert`/`upsert`/`getByIndex`/`count`/`aggregate`) over owned tables, Zod-validated via `drizzle-zod`, routed through Command Bus + governed action registry with audit. No SQL fragments / free field names accepted.

### Phase C: Install governance + boundary (manifest / permissions / naming-conflict)
**Rationale:** Depends on the schema + access contract. Carries Pitfalls 6/9.
**Delivers:** install preflight validating manifest, permission whitelist, and `(schoolId, pluginKey)` + `(schoolId, dbNamespace)` uniqueness (reject conflicts with a clear reason); stable `pluginId` identity rules.

### Phase D: Interactive-quiz sample — governed answer write (no back door)
**Rationale:** Depends on A–C. Proves the model with a real plugin via the IDENTICAL third-party path. Carries Pitfalls 1/8/10.
**Delivers:** single-choice question config + student classroom answering + append-only `isLatest` answer records in plugin-owned tables, via governed action/DAL, reusing the voting/`taskSubmissions` submit bridge. Close gate asserts no core-DB import, no core-table writes, all actions audited.

### Phase E: Stats / recap read from plugin data (single aggregation source)
**Rationale:** Depends on D's answer data. Carries Pitfalls 1/2/8.
**Delivers:** per-question correctness rate / option distribution / answered-vs-unanswered (rostered against `classroomParticipants`), single DAL aggregation source (SQL `GROUP BY` over composite index), DTO out (no UI→DB), write-time cache invalidation (`updateTag('quizStats:${sessionId}')`), post-class recap entry aligned to Stitch/DESIGN.

### Phase F: Marketplace upgrade/uninstall lifecycle + retain/cleanup governance
**Rationale:** Depends on A–E's governance semantics; the hardest, highest-blast-radius work last. Carries Pitfalls 4/5/9.
**Delivers:** `semver` upgrade planner driving `backfill → verify → cutover` (dry-run, rollback-safe, additive-only, row-count reconciliation); retain/cleanup uninstall with count-derived confirmation token + impact display + governance audit on both modes; destructive-op block for active classroom sessions; external-plugin marketplace surface UX (lift the `builtIn` filter).

### close gate: verify:phase
Repeatable, asserting: migration correctness; zero-loss upgrade with real answer data; ≥2-school/≥2-class isolation with no cross-read; uninstall governance audit on both retention modes; injection/over-reach rejection; single-truth-source (DAL/SQLite only); sample-plugin no-back-door.

### Phase Ordering Rationale
- **Strict dependency chain:** data contract (A) → access boundary (B) → install governance (C) → sample write (D) → stats read (E) → lifecycle/migration (F). D requires A (answers need a governed place to land); E requires D (stats are a projection of answers); F's upgrade requires A's migration tooling and is most dangerous, so it lands once the rest is proven.
- **Vertical-slice discipline (Pitfall 7):** every phase must hang on the real "teacher configures → student answers → stats recap" chain; no infra-first drift, no second plugin type, no store-operations.
- **Red lines guarded by gates, not conventions:** static scan (no runtime DDL/raw SQL), isolation tests, zero-loss upgrade test, no-back-door assertion are wired into `verify:phase`.

### Research Flags

**Phases likely needing deeper `/gsd-research-phase` during planning:**
- **Phase A** — the schema-compiler codegen boundary (separate generated file vs main `schema.ts` merge) and how `drizzle-kit generate` diffs compiler output are the milestone's novel mechanics; worth a focused spike.
- **Phase F** — `semver`-driven upgrade-chain planning + `expand→migrate→contract` under SQLite's limited `ALTER` (table-rebuild data-loss risk) is the highest-risk surface; needs a real-data migration rehearsal design.

**Phases with standard / well-baselined patterns (skip research-phase):**
- **Phase B / C** — governed action registry, install preflight, and naming-conflict checks extend existing v3.0/v3.1 patterns directly.
- **Phase D** — reuses the validated v3.1 voting authoring + `taskSubmissions` append-only/`isLatest` submit bridge.
- **Phase E** — reuses the existing evaluation/analysis page IA + `cacheTag` invalidation; standard DAL aggregation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified on npm 2026-06-02; peer-dep compatibility checked; existing deps read from `package.json`. Only LOW spot: future re-pin of `drizzle-zod` beta if a Drizzle major lands mid-milestone. |
| Features | HIGH for baseline/constraint judgments; MEDIUM for quiz/stats "typical expectations" | Baseline grounded in first-hand code; quiz UX expectations referenced from Kahoot/Mentimeter/Wooclap/Plickers as an industry analog (not freshly fetched). |
| Architecture | HIGH | Conclusions verified against actual repo files (DAL, command handlers, runtime host, marketplace surface, migration scripts), not training data. |
| Pitfalls | HIGH | Grounded in existing schema + PROJECT.md constraints; each pitfall maps to a concrete existing seam and a verification. |

**Overall confidence:** HIGH

### Cross-Cutting Agreements (all 4 docs)
- v4.0 = complete/generalize frozen v2.4 scaffolding, NOT greenfield.
- Generic `plugin_owned_business_data` KV is fine for opaque config but MUST NOT carry queryable quiz answers — structured per-plugin tables required.
- "Compile, don't execute": declaration in code → checked-in Drizzle migration → `db:migrate`; runtime is CRUD-only.
- Single ORM / single migration truth (`drizzle-kit`); no second engine, no second validator (`zod` only).
- Sample quiz plugin must use the identical governed third-party path — no back door (Key Decision, echoed by all four).
- Marketplace scope is the publish→install→upgrade→uninstall core loop only; store-operations Out of Scope.
- `verify:phase` close gate is the enforcement mechanism for every red line.

### Disagreements / Tensions to Resolve
- **Generic-table-with-generated-columns fallback vs per-plugin compiled tables for the FIRST sample slice.** STACK explicitly offers the `plugin_owned_business_data` + SQLite `generatedAlwaysAs(json_extract(...))` + index path as a "zero-new-DDL, lower-blast-radius first slice," then graduate hot plugins to compiled tables. ARCHITECTURE and PITFALLS push the opposite: lead with structured per-plugin tables immediately and treat the JSON bag as a Pitfall #1 anti-pattern for stats. **Both agree the canonical end state is compiled per-plugin tables; they disagree on whether the v4.0 quiz answers may *start* on generated columns.** REQUIREMENTS must pick one for the sample slice (recommendation leans to the structured table per ARCHITECTURE/PITFALLS, since the sample's whole purpose is to prove the structured-table path).

## Open Questions for REQUIREMENTS / Roadmap to Resolve

1. **Answer-record relational modeling for stats** — exact owned-table shape and indexes: which of `classroomSessionId` / `questionRef` / `studentId` / `choice` / `isCorrect` / `attemptNo` / `isLatest` are first-class columns vs how the `key` encodes the relation; what composite covering index backs `GROUP BY` (Pitfall 1).
2. **Single-choice-only vs multi question types for the first slice** — FEATURES recommends single-choice ONLY for v4.0 (multi-type deferred to v4.x); confirm so the stats and migration surface stay minimal.
3. **Uninstall-retain → reinstall recovery promise** — is retained data recoverable on reinstall, and via what identity (new `pluginId` + explicit data-takeover flow vs implicit `pluginKey` reuse)? FEATURES marks the recovery promise P2; PITFALLS demands new-identity-by-default. Decide the v4.0 commitment level.
4. **Owned-schema codegen boundary** — does the compiler emit a SEPARATE generated file or merge into the main `schema.ts`, and how does `drizzle-kit generate` diff that output? (Phase A research flag.)
5. **Whether `verify:phase` migration-proof MUST extend to the new owned tables** — STACK and ARCHITECTURE both assume yes (extend `sqlite-migration-proof` to assert owned-table migration correctness); confirm this is a hard close-gate requirement.
6. **(from the tension above) Sample-slice storage decision** — structured per-plugin compiled table vs generic-KV-plus-generated-columns fallback for the v4.0 quiz answers.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — recommended stack additions (`semver`, `drizzle-zod`), self-build capabilities, "compile-don't-execute" pattern, What-NOT-to-Use red lines, version compatibility.
- `.planning/research/ARCHITECTURE.md` — first-hand repo verification: existing kernel/DAL/runtime/marketplace seams, three real gaps, Build Order 1–6, anti-patterns.
- `.planning/research/PITFALLS.md` — 10 critical pitfalls grounded in existing schema + PROJECT.md, Phase A–F mapping, "Looks Done But Isn't" checklist, recovery strategies.
- `.planning/research/FEATURES.md` — frozen-scaffolding inventory, feature landscape (4 domains), MVP vertical slice, Out-of-Scope, prioritization matrix.
- `src/db/schema.ts`, `src/lib/dal/{plugins,plugin-data,plugin-migration}.ts`, `src/features/platform-core/*`, `src/features/runtime-platform/*`, `scripts/verify-phase4*`, `.planning/PROJECT.md`, `AGENTS.md` — direct code/constraint reads cited across all four files.
- npm registry (2026-06-02) + Context7 `/drizzle-team/drizzle-orm-docs` — version + SQLite feature verification (generated columns, `generate --custom`, drizzle-zod).

### Secondary (MEDIUM confidence)
- Kahoot / Mentimeter / Wooclap / Plickers — industry analog for classroom-quiz "typical expected behavior" (not freshly fetched; informs quiz/stats expectations only).

---
*Research completed: 2026-06-02*
*Ready for roadmap: yes*
