# Stack Research

**Domain:** Declarative plugin data model + governed marketplace lifecycle (publish → install → upgrade → uninstall) + declarative-schema → Drizzle/SQLite migration, on an existing Next.js 16 / Drizzle / SQLite educational OS.
**Researched:** 2026-06-02
**Confidence:** HIGH (versions verified on npm 2026-06-02; existing repo capabilities read directly from source; Drizzle SQLite features confirmed via Context7)

---

## TL;DR for the roadmap author

- This milestone is **~90% self-build on the stack you already have**. The platform kernel (Command Bus, action registry, lifecycle/governance audit, marketplace surface) and the data primitives (`pluginRegistrations.dbNamespace` / `lifecycleState` / `uninstallRetentionMode`, `pluginOwnedBusinessData`, the `backfill → verify → cutover` DML-only migration discipline in `src/lib/dal/plugin-migration.ts`) **already exist** and must be **reused, not re-introduced**.
- Add **exactly two small libraries**: `semver` (plugin version / upgrade-path math) and `drizzle-zod` (keep declared schema ↔ physical table ↔ runtime validation in lockstep). Everything else is already in `package.json`.
- The central decision is an **architecture pattern choice, not a library choice**: plugin-declared tables must be compiled into **checked-in Drizzle migrations at publish/dev time by the maintainer**, then applied through the existing `db:migrate` path. **No runtime DDL, no second migration engine.**
- The biggest risk is someone reaching for a runtime schema engine (`knex` schema builder, `umzug`, raw `CREATE TABLE` from manifest) or a second validator (`ajv`). All of these **break the project red lines** — see *What NOT to Use*.

---

## Recommended Stack

### Core Technologies

These are **already pinned in `package.json`** and are the substrate for v4.0. Listed so the roadmap treats them as the fixed integration surface (do NOT add/upgrade as part of this milestone).

| Technology | Version (in repo) | Purpose for v4.0 | Why it is the integration point |
|------------|-------------------|------------------|---------------------------------|
| `drizzle-orm` | `0.45.2` | Defines the compiled plugin-owned `sqliteTable`s; runs the declarative, parameterized query verbs (insert/upsert/select-by-index/aggregate) | Single ORM = single source of schema truth. Plugin tables are *normal* Drizzle tables, just generated + namespaced. Avoids a parallel data layer. |
| `drizzle-kit` | `0.31.10` | Generates checked-in SQL migrations from the compiled plugin tables (`generate`, and `generate --custom` for data backfills) | This *is* the "main-repo migration system". Compiling plugin schema → `drizzle-kit generate` output is what keeps "no dynamic DDL" honest. |
| `@libsql/client` | `0.17.3` | SQLite driver; executes generated columns + `json_extract` aggregate queries for quiz stats | SQLite supports `json_extract` + generated columns + indexes → quiz stats (正确率 / 选项分布 / 作答人数) need no new storage engine. |
| `zod` | `4.4.3` | Meta-schema that validates the plugin **`dataModel` declaration**; row-shape validation at the DAL boundary | Already the canonical boundary validator (`PluginManifestSchema`). The declarative data model is just a new Zod-validated manifest section. |
| `next` / `react` | `16.2.4` / `19.2.5` | Server Actions + DAL host for the governed marketplace lifecycle UI and stats surfaces | Lifecycle (publish/install/upgrade/uninstall) flows through existing Server Actions + cache-tag discipline. No new runtime. |

### Supporting Libraries — **ADD these two (and only these two)**

| Library | Version | Purpose | When/where to use |
|---------|---------|---------|-------------------|
| `semver` | `^7.8.1` | Parse / compare / range-satisfy plugin manifest versions; resolve which upgrade migration steps to run | Marketplace **install** (compatibility check), **upgrade** (decide `from → to` migration chain, reject downgrades / illegal jumps), and manifest validation. Hand-rolled version parsing is a classic source of upgrade bugs; `semver` is the canonical, battle-tested implementation (npm's own). |
| `@types/semver` | `^7.7.1` | Types for `semver` | Dev dependency. |
| `drizzle-zod` | `^0.8.3` | Derive `createInsertSchema` / `createSelectSchema` Zod schemas from the **compiled** plugin Drizzle tables | In the declarative DAL: validate plugin-action payloads against the *same* table definition that produced the migration. Eliminates drift between declared schema, physical table, and runtime validation. Peer deps verified compatible: `drizzle-orm >=0.36.0` (you have 0.45.2 ✓), `zod ^3.25 || ^4` (you have 4.4.3 ✓). |

> `drizzle-zod@1.0.0-beta.*` exists but is pre-release — **stay on `0.8.3` stable** for this milestone.

### Capabilities to **SELF-BUILD** (no library — required to satisfy red lines)

These are deliberately *not* libraries. Each is domain-specific and/or must enforce a project constraint that a generic library would violate.

| Capability | Build on | Why self-build (not a library) |
|------------|----------|-------------------------------|
| **Declarative `dataModel` DSL + Zod meta-schema** (tables, columns, scalar types, indexes, FKs **restricted to the plugin's own namespace**) | `zod`, extend `PluginManifestSchema` (`manifestVersion: 3`) | Must enforce red lines no generic lib knows: `dbNamespace` prefixing (reuse `deriveDbNamespace`), allowed column types only, no FK into core tables, every table `schoolId`-scoped + `onDelete: cascade`. |
| **Schema compiler** (`dataModel` JSON → Drizzle `sqliteTable` TS → `drizzle-kit generate` migration) | `drizzle-kit`, codegen script under `scripts/` | No library maps a manifest → Drizzle. This is the "compile, don't execute" core. Output is reviewed, checked-in SQL — diffable in PRs, run by the **existing** `pnpm db:migrate`. |
| **Declarative data-access verbs** (fixed, governed: `insert` / `upsert` / `getByIndex` / `count` / `aggregate`) over plugin-owned tables | Drizzle query builder + `drizzle-zod` validation, in DAL | The "no arbitrary code, no plugin direct DB" boundary *is* this layer. Plugins emit declarative intents; the DAL executes parameterized Drizzle. A generic query lib would re-open raw-SQL/injection surface. |
| **Upgrade migration planner** | `semver` + a declarative per-version migration manifest + existing `backfill → verify → cutover` pattern in `plugin-migration.ts` | Maps `oldVersion → newVersion` to an ordered, additive, reviewed migration chain. Reuses the proven idempotent backfill/verify/cutover discipline already shipped. |
| **Uninstall retain/cleanup executor** | Existing `pluginRegistrations.uninstallRetentionMode` (`retain` / `cleanup`) + cascade FKs | The enum and cascade already exist; v4.0 only needs the governed executor + audit. Cascade-delete is a project constraint, already modeled. |

### Development Tools (already present — reuse)

| Tool | Purpose for v4.0 | Notes |
|------|------------------|-------|
| `tsx` + `scripts/prepare-dev-db.ts` (`pnpm db:migrate`) | Apply compiled plugin migrations the same way as core migrations | Migration-first bootstrap already established; plugin tables are just more migrations. |
| `vitest` | Unit-test the schema compiler, DSL Zod validation, semver upgrade planning, declarative query verbs | Co-located `*.test.ts` already the convention (e.g. `plugin-migration.test.ts`, `plugin-data.test.ts`). |
| `playwright` | E2E the sample interactive-quiz plugin chain (author → student answer → stats/recap) for the `verify:phase` close gate | Matches existing `verify:phaseNN` + Playwright close-gate posture. |
| `scripts/verify-phaseNN-*.ts` + `lib/sqlite-migration-proof.ts` | Phase close gates that materialize migrations into a throwaway libSQL DB and assert correctness | The migration-proof harness already exists (used by `verify-phase45/46/47/48`). Extend it for plugin-owned-table migration correctness. |

## Installation

```bash
# The ONLY new runtime + type dependencies for v4.0:
pnpm add semver
pnpm add -D @types/semver

# Recommended bridge (keep declared schema ↔ table ↔ validation in lockstep):
pnpm add drizzle-zod

# Everything else (drizzle-orm, drizzle-kit, @libsql/client, zod, next, react,
# vitest, playwright, tsx) is ALREADY in package.json — do not re-add or bump.
```

## Alternatives Considered

| Recommended | Alternative | When the alternative would make sense (NOT here) |
|-------------|-------------|--------------------------------------------------|
| **Compile plugin schema → checked-in Drizzle migration (build/publish time)** | Runtime DDL: read manifest at install time and `CREATE TABLE` per plugin | Only acceptable if dynamic per-tenant tables were in scope — they are explicitly **Out of Scope** in `PROJECT.md`. Runtime DDL also forfeits PR review + the "migration-centralized" guarantee. |
| **Per-plugin compiled physical tables** (queryable columns + indexes) | Keep everything in the generic `pluginOwnedBusinessData` JSON-KV table | The generic JSON table is fine for opaque blobs, but quiz stats need indexed, queryable structure. You *can* bridge with SQLite **generated columns** (`generatedAlwaysAs(sql\`json_extract(...)\`)`) + indexes if you want to defer per-plugin tables for the v4.0 sample — viable fallback, see *Stack Patterns*. |
| **`semver`** | Hand-rolled version compare | Never — version range satisfaction and upgrade ordering are exactly where homemade parsers silently fail. |
| **`drizzle-zod`** | Hand-write a parallel Zod schema for every plugin table | Acceptable only if you reject the codegen path entirely; otherwise it guarantees drift between table and validator. |
| **Drizzle (single ORM)** | Add Prisma/Knex just for plugin schemas | Never — a second ORM fragments schema truth and migration tooling. |

## What NOT to Use

| Avoid | Specific problem (which red line it breaks) | Use instead |
|-------|---------------------------------------------|-------------|
| Runtime `CREATE TABLE` / dynamic DDL from manifest (`knex.schema`, raw `db.run("CREATE TABLE …")`) | Breaks **"插件绕过主仓库迁移体系动态建表"** + **"no dynamic DDL"**. Unreviewed, undiffable, unrecoverable. | Maintainer-run **schema compiler → `drizzle-kit generate` → checked-in migration → `db:migrate`**. |
| A second migration framework (`umzug`, `node-pg-migrate`, `knex` migrations) | Splits migration truth across two systems; `drizzle-kit` already owns it. Versioning/ordering conflicts. | `drizzle-kit generate` (incl. `--custom` for data backfills). |
| `ajv` / JSON-Schema validation engine | Adds a **second** validation runtime; `zod` is already the canonical boundary validator (`PluginManifestSchema`). | Extend `zod` with a `dataModel` meta-schema. |
| `eval` / `vm` / `isolated-vm` / `QuickJS` / Extension Host for plugin logic | Breaks **"no arbitrary third-party code execution"**; QuickJS sandbox/Extension Host are explicitly **Out of Scope**. | Declarative manifest + governed `action`/`hook` dispatch (already shipped). |
| Per-school / per-installation dynamic physical tables, EAV-per-plugin sprawl, PostgreSQL schema-per-plugin | Explicitly **Out of Scope** in `PROJECT.md`; violates SQLite-first + migration-centralized. | One compiled, namespaced, `schoolId`-scoped table set per plugin, partitioned by `schoolId` + `pluginId` rows. |
| Stacking plugin-specific nullable columns onto **core** tables | Explicitly **Out of Scope** ("core schema 被插件污染"). | Plugin-owned namespaced tables (`p_<vendor>_<plugin>_*`) via `deriveDbNamespace`. |
| `next-auth` stable v4, `middleware.ts`, integer step `position`, mutable-overwrite submissions | Pre-existing project red lines (see AGENTS.md "What NOT to Use") — unchanged for v4.0 | `next-auth@beta` v5, `proxy.ts`, LexoRank, append-only submissions. |
| Bumping `drizzle-zod` to `1.0.0-beta.*`, or `drizzle-orm`/`drizzle-kit` major | Pre-release / out-of-milestone risk; v4.0 should not absorb a Drizzle major migration | Pin `drizzle-zod@^0.8.3`, keep `drizzle-orm@0.45.2` / `drizzle-kit@0.31.10`. |

## Stack Patterns by Variant

**If the plugin needs durable, queryable structured data (the v4.0 interactive-quiz sample — answers, per-option counts):**
- Use **per-plugin compiled physical tables**: `dataModel` declaration → Zod meta-validate → schema compiler emits `p_<namespace>_<table>` Drizzle `sqliteTable`s (every table `schoolId`/`pluginId`-scoped, cascade FKs to plugin-owned tables only) → `drizzle-kit generate` → checked-in migration → `db:migrate`.
- Query stats with normal Drizzle aggregates (`count`, `group by`) over indexed columns.
- Because the data is queryable, owned, and lifecycle-managed, and the compile-time path keeps "no dynamic DDL" intact while still being "plugin-owned".

**If you want to ship the sample plugin's data with ZERO new per-plugin DDL (faster first slice / lower blast radius):**
- Reuse the existing generic `pluginOwnedBusinessData(schoolId, pluginId, key, payloadJson)` table.
- Add **SQLite generated columns** + indexes via a single migration: `text("opt").generatedAlwaysAs(sql\`json_extract(payloadJson,'$.optionId')\`)` so 选项分布/正确率 are indexable without per-plugin tables.
- Because it proves the declarative DAL + stats path on existing storage; you can graduate hot plugins to dedicated compiled tables later. (Confirmed Drizzle SQLite supports `generatedAlwaysAs` + custom migrations via Context7.)

**Recommendation:** lead with the **per-plugin compiled-table** pattern as the canonical architecture (it is what "plugin declares and owns its data tables" literally means), and keep the generic-table+generated-column pattern documented as the low-blast-radius fallback for the very first sample slice.

**Upgrade/version flow (all variants):**
- `semver` compares `installedManifest.version` vs `marketplaceManifest.version` → planner produces an ordered, **additive-only** migration chain → run via the existing `backfill → verify → cutover` discipline → audit each transition through existing lifecycle/governance audit.

## Version Compatibility

| Package | Compatible with (verified) | Notes |
|---------|----------------------------|-------|
| `semver@^7.8.1` | Node 20.9+ | `dist-tags`: latest=7.8.1. Pure JS, no native deps. |
| `drizzle-zod@^0.8.3` | `drizzle-orm@0.45.2` (needs `>=0.36.0` ✓), `zod@4.4.3` (needs `^3.25 \|\| ^4` ✓) | Stable line; `1.0.0-beta.*` exists — avoid for this milestone. |
| `drizzle-kit@0.31.10` | `drizzle-orm@0.45.2`, SQLite generated columns (since drizzle-orm v0.32.0) | `generate --custom` available for data-backfill migrations. |
| `@libsql/client@0.17.3` | SQLite `json_extract`, generated columns (VIRTUAL/STORED), partial/expression indexes | No new driver needed for stats. |
| `zod@4.4.3` | existing `PluginManifestSchema` (v1/v2) | Extend with `manifestVersion: 3` + `dataModel` without breaking v1/v2 manifests. |

## Sources

- `package.json`, `drizzle.config.ts`, `src/db/schema.ts` (lines 1241–1903: `pluginRegistrations`, `pluginOwnedBusinessData`, extension tables), `src/lib/dal/plugin-migration.ts`, `src/lib/dal/plugin-data.ts`, `src/lib/dal/plugins.ts` (`deriveDbNamespace`), `src/lib/dto/resource-ai.ts` (`PluginManifestSchema`), `scripts/verify-phase45/46/47/48*.ts` — direct read of existing baseline. Confidence: HIGH.
- `.planning/PROJECT.md` (v4.0 milestone, Out-of-Scope red lines, Key Decisions) — scope authority. Confidence: HIGH.
- npm registry, queried 2026-06-02: `semver@7.8.1`, `@types/semver@7.7.1`, `drizzle-zod@0.8.3` (peerDeps `drizzle-orm>=0.36.0`, `zod ^3.25||^4`), `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `@libsql/client@0.17.3`, `zod@4.4.3`. Confidence: HIGH.
- Context7 `/drizzle-team/drizzle-orm-docs` — SQLite generated columns (`generatedAlwaysAs`, VIRTUAL/STORED), `drizzle-kit generate --custom` for hand-written SQL/data migrations, drizzle-zod schema generation. Confidence: HIGH.

---
*Stack research for: declarative plugin data model + governed marketplace lifecycle + declarative-schema → Drizzle/SQLite migration*
*Researched: 2026-06-02*
