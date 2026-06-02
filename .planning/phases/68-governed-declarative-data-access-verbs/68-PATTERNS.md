# Phase 68: Governed Declarative Data Access Verbs - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 11 (9 new, 2 modified)
**Analogs found:** 11 / 11

This phase is **assembly, not engine-building**. Every new file has a strong existing analog in the platform-core command bus, the plugin governance gate, or the DAL. Copy structure and signatures from the cited analog; do not invent new conventions.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/platform-core/commands/contracts.ts` (MODIFY) | config/contract | request-response | self (existing pattern in-file) | exact |
| `src/features/platform-core/commands/registry.ts` (MODIFY) | config/registration | request-response | self (existing pattern in-file) | exact |
| `src/features/platform-core/commands/handlers/plugin-data.ts` | handler | CRUD (write) | `commands/handlers/lesson-draft.ts` | exact |
| `src/features/platform-core/commands/producers/plugin-data.ts` | producer | request-response | `commands/producers/plugin-governance.ts` | exact |
| `src/lib/dal/plugin-data-access.ts` (facade `dispatchPluginDataAccess`) | service/facade | event-driven (verb dispatch) | `src/lib/dal/plugin-data.ts` | exact |
| `src/lib/dal/plugin-data-allowlist.ts` (allowlist derivation) | utility | transform | `src/lib/dto/plugin-data-model.ts` + generated `quiz.ts` | role-match |
| `src/lib/dal/plugin-data-read.ts` (getByIndex/count/aggregate) | service | CRUD (read) | `src/lib/dal/learning.ts` reads | role-match |
| `assertActionExecutable` gate (in facade or own module) | guard | request-response | `listPluginGovernanceSnapshotRecords` + `projectPluginGovernance` | exact |
| append-only write via `executor.insert` | service | CRUD (write) | `learning.ts` `recordRuntimeTaskAttempt` (L654) | exact |
| audit write on every verb outcome | utility | event-driven | `plugins.ts` `createGovernanceAudit` (L255) | exact |
| `scripts/verify-phase68-governed-data-verbs.ts` | test | batch | `scripts/verify-phase67-plugin-owned-data.ts` | exact |

---

## Pattern Assignments

### `commands/contracts.ts` (MODIFY) — declare two write command types

**Analog:** self — follow the existing `PlatformPluginGovernanceCommandTypes` / `LessonDraftCommandTypes` pattern verbatim.

**Pattern (existing in-file):**
```typescript
// 1. Declare command type literals as a const tuple
export const LessonDraftCommandTypes = [
  "lesson.draft.create",
  "lesson.draft.update",
] as const;

// 2. Merge all tuples into the enum schema
export const PlatformCommandTypeSchema = z.enum([
  ...PlatformPluginGovernanceCommandTypes,
  ...LessonDraftCommandTypes,
  // ADD: ...PluginDataCommandTypes,
]);

// 3. Register payload schema per type in the map
export const PlatformCommandPayloadSchemas = {
  "lesson.draft.create": LessonDraftCreatePayloadSchema,
  // ADD: "plugin.data.insert": PluginDataInsertPayloadSchema,
  // ADD: "plugin.data.upsert": PluginDataUpsertPayloadSchema,
} satisfies Record<PlatformCommandType, z.ZodTypeAny>;
```

**What to add (D-01, D-02):**
```typescript
export const PluginDataCommandTypes = [
  "plugin.data.insert",
  "plugin.data.upsert",
] as const;
```
- Scope schema reuses the existing `{ schoolId, pluginId }` shape — same as plugin-governance commands. Do NOT add a new scope shape.
- Only the **two write verbs** get command types. `getByIndex` / `count` / `aggregate` are NEVER declared here (D-03 — reads do not touch `platformCommands`).

---

### `commands/handlers/plugin-data.ts` (NEW) — write verb handlers

**Analog:** `commands/handlers/lesson-draft.ts`

**Type narrowing + handler shape (lesson-draft.ts):**
```typescript
type LessonDraftCreateCommand = Extract<
  PlatformCommand,
  { type: "lesson.draft.create" }
>;

export const lessonDraftCreateHandler = {
  async authorize(command: LessonDraftCreateCommand) {
    // throws on scope/authz failure; returns void/context on success
  },
  async execute(command: LessonDraftCreateCommand, ctx: HandlerContext) {
    // performs the mutation inside ctx.tx, returns result
  },
};
```

**Apply to plugin-data:**
- `pluginDataInsertHandler` and `pluginDataUpsertHandler`, each `{ authorize, execute }`.
- `authorize` calls `assertActionExecutable` (governance gate, see Shared Patterns) + allowlist validation; on failure throw the specific reason code and write a denial audit (D-04, D-08).
- `execute` runs the append-only insert (see append-only Shared Pattern) inside the command-bus transaction, then writes a success audit (D-04).

---

### `commands/producers/plugin-data.ts` (NEW) — write command producers

**Analog:** `commands/producers/plugin-governance.ts`

**Producer input + dispatch (plugin-governance.ts):**
```typescript
type BaseProducerInput<TType, TPayload> = {
  type: TType;
  actor: CommandActor;
  scope: { schoolId: string; pluginId: string };
  payload: TPayload;
  dedupeKey?: string;
  correlation?: CommandCorrelation;
  audit?: CommandAuditHint;
  source: CommandSource;
};

export async function produceXxx(input: BaseProducerInput<...>) {
  return dispatchPlatformCommand({
    type: input.type,
    actor: input.actor,
    scope: input.scope,
    payload: input.payload,
    dedupeKey: input.dedupeKey,
    // ...
  });
}
```

**Apply to plugin-data:** `producePluginDataInsert` / `producePluginDataUpsert` — same `scope: { schoolId, pluginId }`, dispatch through `dispatchPlatformCommand`. The facade calls these for write verbs only.

---

### `commands/registry.ts` (MODIFY) — register write handlers

**Analog:** self — existing `createPlatformCommandDefinition` registrations.

**Pattern (existing in-file):**
```typescript
createPlatformCommandDefinition({
  commandType: "lesson.draft.create",
  payloadSchema: LessonDraftCreatePayloadSchema,
  dedupe: { /* dedupeKey strategy */ },
  authorize: lessonDraftCreateHandler.authorize,
  execute: lessonDraftCreateHandler.execute,
});
```

**Add** one registration per write verb (`plugin.data.insert`, `plugin.data.upsert`) wiring the `plugin-data.ts` handlers and the payload schemas declared in `contracts.ts`. `dedupe` should key on the declared unique constraint columns (D-12 source: `plugins/quiz-sample/data-model.ts` `uniques`).

---

### `src/lib/dal/plugin-data-access.ts` (NEW) — `dispatchPluginDataAccess` facade

**Analog:** `src/lib/dal/plugin-data.ts` (scope assertion conventions) + verb-discriminated dispatch.

**Single facade, discriminated `verb` (D-01):**
```typescript
// Pseudostructure — one entry point, switch on verb
export async function dispatchPluginDataAccess(input: PluginDataAccessInput) {
  const scope = await assertActionExecutable(input.actor, input.schoolId, input.pluginId);
  switch (input.verb) {
    case "insert":
    case "upsert":
      return produce... // -> command bus (writes audit on success+failure, D-04)
    case "getByIndex":
    case "count":
    case "aggregate":
      return readVerb...  // -> direct read, NO platformCommands (D-03); audit only on reject/over-scope (D-04)
  }
}
```

**Scope derivation analog (plugin-data.ts L40–51) — schoolId from session, never from payload:**
```typescript
async function assertTeacherManagerScope(actorId: string, schoolId: string) {
  if (!actorId?.trim()) throw new Error("PLUGIN_ACTOR_REQUIRED");
  const scope = await assertActiveTeacher();          // -> { userId, schoolIds }
  if (scope.userId !== actorId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
  return scope;
}
```
- `schoolId` is always filtered from the derived `scope`, never accepted as a free `where` field (D-07). Cross-tenant access reuses the `SCHOOL_CROSS_BOUNDARY_FORBIDDEN` reason class (plugin-data.ts L63).

---

### `src/lib/dal/plugin-data-allowlist.ts` (NEW) — allowlist from declared model + generated schema

**Analog:** `src/lib/dto/plugin-data-model.ts` (meta-schema + reason constants) and the generated `src/db/schema/generated/plugin-owned/quiz.ts`.

**Single source of truth (D-06/D-07):** the allowlist of `{ tables, columns, indexes, groupByColumns }` is derived from the **declared** `quizDataModel` (`plugins/quiz-sample/data-model.ts`) — the same object the compiler consumes — guaranteeing zero drift with the generated tables.

**Declared model shape to walk (data-model.ts):**
```typescript
export const quizDataModel = {
  pluginKey: "quiz",
  tables: [
    {
      name: "plugin_owned_quiz_questions",
      columns: [ { name: "schoolId", type: "text", notNull: true }, /* ... */ ],
      indexes: [{ columns: ["schoolId", "classroomSession", "question"] }],
    },
    {
      name: "plugin_owned_quiz_responses",
      columns: [ /* ... */ { name: "selectedOption", type: "enum", enumValues: ["A","B","C","D"] } ],
      indexes: [{ columns: ["schoolId", "classroomSession", "student", "question"] }],
      uniques: [{ columns: ["classroomSession", "student", "question"] }],
    },
  ],
} as const;
```

**Reason constants + reserved columns to enforce (plugin-data-model.ts):**
```typescript
export const RESERVED_COLUMNS = { id, schoolId, pluginId, createdAt, updatedAt };
export const PLUGIN_DATA_MODEL_REASONS = [
  "INVALID_COLUMN_TYPE", "MISSING_OWNED_PREFIX", "RAW_SQL_FORBIDDEN",
  "MISSING_SCHOOL_SCOPE", "ENUM_REQUIRES_VALUES",
] as const;
export const DDL_KEYWORDS = /\b(CREATE|ALTER|DROP)\b/i;
export const OWNED_TABLE_PREFIX = "plugin_owned_";
```
- `groupBy` whitelist for `aggregate` (D-05) = declared non-reserved columns only. Any column/table/index not present in the declared model → reject with the matching reason class (D-08).

---

### Read verbs `getByIndex` / `count` / `aggregate` (NEW, in `plugin-data-read.ts` or facade)

**Analog:** read queries in `src/lib/dal/learning.ts` (indexed selects, ordered by declared columns).

**Pattern:**
- `getByIndex`: `db.select().from(table).where(eq(schoolId, scope) AND <allowlisted index columns>)`. Index columns must match a declared `indexes[].columns` entry, else reject `index_not_allowed`.
- `count`: `db.select({ count: count() }).from(table).where(...)`.
- `aggregate` (D-05): `count` + `.groupBy(<whitelisted column>)` projecting **only** `{ key, count }`. No other columns, no raw SQL.
- Reads do NOT call producers/command bus (D-03). On rejection or over-scope, write a denial audit (D-04); on success, write nothing.

---

## Shared Patterns

### Governance executable gate — `assertActionExecutable`
**Source:** `src/lib/dal/plugins.ts` L402 `listPluginGovernanceSnapshotRecords` + `src/features/platform-core/plugins/governance-projection.ts` `projectPluginGovernance`
**Apply to:** every verb (read and write) before touching data.

```typescript
// plugins.ts L402 — gate calls assertTeacherManagerScope then reads snapshot
export async function listPluginGovernanceSnapshotRecords(/* ... */) {
  const scope = await assertTeacherManagerScope(actorId, schoolId);
  // ...load governance records...
}

// governance-projection.ts — projects lifecycle/kill-switch into an executable flag
projectPluginGovernance(record): PluginGovernanceProjectionRow // -> { executable, ... }
```
**Implementation:** `assertActionExecutable` derives scope (auth session), loads the plugin governance projection, and throws if `executable === false` (lifecycle disabled / kill-switch on) before any verb proceeds.

### Audit write (every write outcome; reads only on reject/over-scope — D-04)
**Source:** `src/lib/dal/plugins.ts` L255 `createGovernanceAudit`, L273 insert
**Apply to:** all verb handlers.

```typescript
// plugins.ts L273 — uses provided executor (tx-aware), governanceAudits table
await executor.insert(governanceAudits).values({
  targetType: "plugin",
  decision,                       // "allowed" | "denied"
  reasonCode,                     // e.g. "raw_sql_forbidden"
  actorScope,
  lifecycleState,
  killSwitchEnabled,
  requestedCapabilitiesJson,
  correlationId,
  payloadJson,
});
```
- `createGovernanceAudit` accepts an optional `tx` — pass the command-bus transaction for write verbs so the audit commits atomically with the mutation.
- Each of the 7 rejection classes (D-08) must assert a specific `reasonCode` AND emit this denial audit.

### Append-only / isLatest dedupe write
**Source:** `src/lib/dal/learning.ts` L654 `recordRuntimeTaskAttempt` (also L689 `recordRuntimeQuizAttempt`)
**Apply to:** `upsert` verb (and `insert` where append-only history applies).

```typescript
return db.transaction(async (tx) => {
  const prev = await tx
    .select({ attemptNo: table.attemptNo })
    .from(table)
    .where(/* dedupe key match */)
    .orderBy(desc(table.attemptNo));
  const attemptNo = (prev[0]?.attemptNo ?? 0) + 1;
  await tx.update(table).set({ isLatest: false }).where(/* dedupe key match */);
  return tx.insert(table).values({ /* ... */ isLatest: true, attemptNo }).returning();
});
```
- The dedupe key columns come from the declared `uniques` (D-12), e.g. `["classroomSession","student","question"]`.

### verify:phase negative-sample proof gate
**Source:** `scripts/verify-phase67-plugin-owned-data.ts` + `scripts/lib/sqlite-migration-proof.ts`
**Apply to:** `scripts/verify-phase68-governed-data-verbs.ts`.

```typescript
import { materializeDrizzleMigrations, cleanupSqliteArtifacts } from "./lib/sqlite-migration-proof";
// materialize migrations into a throwaway SQLite db, run each verb + each
// rejection class, assert reason code + audit row via PRAGMA / SELECT, then cleanup.
```
- Register `verify:phase68` in `package.json` as `tsx scripts/verify-phase68-governed-data-verbs.ts` (matches existing `verify:phaseN` convention).
- Must exercise all 7 rejection classes (e.g. `raw_sql_forbidden`, `index_not_allowed`, `column_not_allowed`, `groupby_not_allowed`, `school_cross_boundary_forbidden`, plus lifecycle/kill-switch rejects), asserting each emits the correct `reasonCode` and a denial audit row.

---

## No Analog Found

None. All 11 files map to a concrete existing analog.

## Metadata

**Analog search scope:** `src/features/platform-core/commands/**`, `src/features/platform-core/plugins/**`, `src/lib/dal/**`, `src/lib/dto/**`, `src/db/schema/generated/plugin-owned/**`, `scripts/**`, `plugins/quiz-sample/**`
**Files scanned:** contracts.ts, registry.ts, handlers/lesson-draft.ts, producers/plugin-governance.ts, governance-projection.ts, actions/registry.ts, plugins.ts, lesson-authoring.ts, learning.ts, plugin-data.ts, generated/plugin-owned/quiz.ts, dto/plugin-data-model.ts, compile-plugin-data-model.ts, verify-phase67-plugin-owned-data.ts, lib/sqlite-migration-proof.ts, plugins/quiz-sample/data-model.ts
**Pattern extraction date:** 2026-06-02

## PATTERN MAPPING COMPLETE

**Phase:** 68 - Governed Declarative Data Access Verbs
**Files classified:** 11
**Analogs found:** 11 / 11

### Coverage
- Files with exact analog: 9
- Files with role-match analog: 2
- Files with no analog: 0

### Key Patterns Identified
- Write verbs (`insert`/`upsert`) declare command types in `contracts.ts` (const tuple → `z.enum` merge → payload schema map), produce via `dispatchPlatformCommand` with `scope:{schoolId,pluginId}`, register `{authorize,execute}` handlers in `registry.ts` — exact copy of the lesson-draft / plugin-governance command-bus pattern.
- Read verbs (`getByIndex`/`count`/`aggregate`) bypass `platformCommands` entirely (D-03) and run allowlisted Drizzle selects modeled on `learning.ts` reads.
- The allowlist (tables/columns/indexes/groupBy) is derived from the declared `quizDataModel` + generated schema as a single source of truth (zero drift), enforced with `plugin-data-model.ts` reason constants and reserved-column rules.
- Governance gate (`assertActionExecutable`) mirrors `listPluginGovernanceSnapshotRecords` + `projectPluginGovernance.executable`; audit writes reuse `createGovernanceAudit` (tx-aware) for all 7 rejection classes (D-04/D-08); append-only writes follow `recordRuntimeTaskAttempt`'s isLatest transaction.

### File Created
`.planning/phases/68-governed-declarative-data-access-verbs/68-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns and concrete excerpts directly in PLAN.md files.
