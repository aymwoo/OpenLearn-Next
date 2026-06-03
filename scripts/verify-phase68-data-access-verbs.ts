// Phase 68 close-gate verifier (ACCESS-01 / ACCESS-02 / ACCESS-03).
//
// End-to-end negative-sample gate over the SINGLE public facade `dispatchPluginDataAccess`:
//   (a) LEGAL group — all five governed verbs (insert/upsert/getByIndex/count/aggregate)
//       succeed against seeded plugin-owned tables and write ZERO `denied` governance audits;
//   (b) NEGATIVE group — each of D-08's 10 rejection reasons is driven through the real facade,
//       asserting the exact named reason is thrown AND exactly +1 matching `decision='denied'`
//       row lands in `governanceAudits` (D-04 audit-on-denial, D-08 reason coverage).
//
// The REAL governance gate / allowlist / write command-bus / audit writer all run against a
// throwaway seeded libsql DB. Only NextAuth `auth()` is stubbed — via the dedicated
// `tsconfig.verify-phase68.json` `paths` remap of `@/lib/auth/auth` to scripts/lib/phase68-auth-stub.ts
// (Option A) — because the gate's session-injection path cannot run NextAuth headlessly. Production
// `src/lib/auth/auth.ts` is untouched. Reuses (does NOT rebuild) scripts/lib/sqlite-migration-proof.ts.
//
// Invoked by package.json `verify:phase68` with:
//   TSX_TSCONFIG_PATH=./tsconfig.verify-phase68.json \
//   node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase68-data-access-verbs.ts

import { randomUUID } from "node:crypto";
import path from "node:path";

import type { InStatement } from "@libsql/client";

import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "./lib/sqlite-migration-proof";
import { SEEDED_TEACHER_ID } from "./lib/phase68-auth-stub";

// --- DB bootstrap: pin the throwaway DB file BEFORE any `@/db` import reads DB_FILE_NAME. ---
const DB_PATH = path.join("/tmp/opencode", `phase68-verify-${randomUUID()}.db`);
process.env.DB_FILE_NAME = `file:${DB_PATH}`;

// Seed identifiers (SEEDED_TEACHER_ID is shared with the auth stub).
const SCHOOL_ID = "school-68-05";
const TEACHER_ID = SEEDED_TEACHER_ID; // "teacher-68-05"
const QUIZ_KEY = "quiz";
const QUIZ_DISABLED_KEY = "quiz-disabled";
const QUIZ_KILL_KEY = "quiz-kill";
const QUESTIONS_TABLE = "plugin_owned_quiz_questions";
const RESPONSES_TABLE = "plugin_owned_quiz_responses";

type SeedClient = Awaited<ReturnType<typeof materializeDrizzleMigrations>>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/** Raw-SQL seed: one teacher + school + active teacher membership + 3 plugin registrations. */
async function seedFixtures(client: SeedClient): Promise<void> {
  const quizManifest = JSON.stringify({ id: QUIZ_KEY, version: "1.0.0", anchors: [], actions: [] });
  const disabledManifest = JSON.stringify({ id: QUIZ_DISABLED_KEY, version: "1.0.0", anchors: [], actions: [] });
  const killManifest = JSON.stringify({ id: QUIZ_KILL_KEY, version: "1.0.0", anchors: [], actions: [] });

  const statements: InStatement[] = [
    { sql: `INSERT INTO user (id) VALUES (?)`, args: [TEACHER_ID] },
    { sql: `INSERT INTO school (id, name, createdAt) VALUES (?, ?, 0)`, args: [SCHOOL_ID, "Phase68 School"] },
    {
      sql: `INSERT INTO membership (id, userId, schoolId, role, status) VALUES (?, ?, ?, 'teacher', 'active')`,
      args: ["mem-68-05", TEACHER_ID, SCHOOL_ID],
    },
    // Legal plugin: enabled + ready + kill-switch off => projection executable=true.
    {
      sql: `INSERT INTO pluginRegistration
              (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, dataVersion, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'external', 'manual', 1, 0, 'ready', 1, 0, 0)`,
      args: ["reg-quiz", SCHOOL_ID, "Quiz", quizManifest, QUIZ_KEY, "quiz"],
    },
    // Disabled plugin: enabled=0 => projection blocked, kill-switch off => lifecycle_not_executable.
    {
      sql: `INSERT INTO pluginRegistration
              (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, dataVersion, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'external', 'manual', 0, 0, 'installed', 1, 0, 0)`,
      args: ["reg-quiz-disabled", SCHOOL_ID, "Quiz Disabled", disabledManifest, QUIZ_DISABLED_KEY, "quiz_disabled"],
    },
    // Kill-switched plugin: enabled + ready but kill-switch on => kill_switch_rejected.
    {
      sql: `INSERT INTO pluginRegistration
              (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, dataVersion, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'external', 'manual', 1, 1, 'ready', 1, 0, 0)`,
      args: ["reg-quiz-kill", SCHOOL_ID, "Quiz Kill", killManifest, QUIZ_KILL_KEY, "quiz_kill"],
    },
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function main(): Promise<void> {
  console.log("==================================================");
  console.log("Phase 68 close-gate verification starting...");
  console.log("==================================================");

  // 1) Materialize checked-in migrations + seed, then CLOSE the seed client so the runtime
  //    `db` (dynamic-imported below) is the single open libsql client (avoids WAL lock).
  const seedClient = await materializeDrizzleMigrations(`file:${DB_PATH}`);
  await seedFixtures(seedClient);
  await (seedClient as { close?: () => Promise<void> | void }).close?.();

  // 2) Dynamic imports AFTER DB_FILE_NAME is set so `@/db` binds to the seeded throwaway file.
  const { dispatchPluginDataAccess } = await import(
    "@/features/platform-core/plugin-data-access/facade"
  );
  const { PLUGIN_DATA_ACCESS_REASONS } = await import(
    "@/features/platform-core/plugin-data-access/allowlist"
  );
  const { db } = await import("@/db");
  const { governanceAudits } = await import("@/db/schema");
  const { and, eq, count: countFn } = await import("drizzle-orm");

  // --- Audit helpers (read denied governanceAudits straight from the seeded DB). ---
  async function deniedCountFor(reason: string): Promise<number> {
    const rows = await db
      .select({ c: countFn() })
      .from(governanceAudits)
      .where(and(eq(governanceAudits.decision, "denied"), eq(governanceAudits.reasonCode, reason)));
    return Number(rows[0]?.c ?? 0);
  }

  async function totalDenied(): Promise<number> {
    const rows = await db
      .select({ c: countFn() })
      .from(governanceAudits)
      .where(eq(governanceAudits.decision, "denied"));
    return Number(rows[0]?.c ?? 0);
  }

  try {
    // ============================================================
    // LEGAL GROUP — five governed verbs succeed, zero denied audits.
    // ============================================================
    console.log("[1/3] Legal five-verb pass (insert/upsert/getByIndex/count/aggregate)...");
    const deniedBeforeLegal = await totalDenied();

    await dispatchPluginDataAccess({
      verb: "insert",
      actor: TEACHER_ID,
      pluginKey: QUIZ_KEY,
      table: QUESTIONS_TABLE,
      values: { classroomSession: "sess-1", question: "q1", prompt: "What is 1+1?", correctOption: "B" },
    });

    await dispatchPluginDataAccess({
      verb: "upsert",
      actor: TEACHER_ID,
      pluginKey: QUIZ_KEY,
      table: RESPONSES_TABLE,
      values: { classroomSession: "sess-1", student: "stu-1", question: "q1", selectedOption: "B" },
    });

    const found = await dispatchPluginDataAccess({
      verb: "getByIndex",
      actor: TEACHER_ID,
      pluginKey: QUIZ_KEY,
      table: QUESTIONS_TABLE,
      index: ["schoolId", "classroomSession", "question"],
      eq: { classroomSession: "sess-1", question: "q1" },
    });
    assert(Array.isArray(found) && found.length === 1, `legal getByIndex expected 1 row, got ${Array.isArray(found) ? found.length : "non-array"}`);

    const total = await dispatchPluginDataAccess({
      verb: "count",
      actor: TEACHER_ID,
      pluginKey: QUIZ_KEY,
      table: QUESTIONS_TABLE,
    });
    assert(total === 1, `legal count expected 1, got ${String(total)}`);

    const grouped = await dispatchPluginDataAccess({
      verb: "aggregate",
      actor: TEACHER_ID,
      pluginKey: QUIZ_KEY,
      table: QUESTIONS_TABLE,
      groupBy: "classroomSession",
    });
    assert(
      Array.isArray(grouped) && grouped.length === 1 && Number(grouped[0]?.count) === 1,
      `legal aggregate expected 1 group of count 1, got ${JSON.stringify(grouped)}`,
    );

    const deniedAfterLegal = await totalDenied();
    assert(
      deniedAfterLegal === deniedBeforeLegal,
      `legal verbs must write zero denied audits (before=${deniedBeforeLegal}, after=${deniedAfterLegal})`,
    );
    console.log("  ✓ Five legal verbs succeeded; zero denied governance audits written.");

    // ============================================================
    // NEGATIVE GROUP — each D-08 reason: exact thrown reason + exactly +1 denied audit.
    // ============================================================
    console.log("[2/3] Negative-sample pass (10 D-08 rejection reasons)...");

    type NegativeCase = { reason: string; label: string; input: Parameters<typeof dispatchPluginDataAccess>[0] };
    const negatives: NegativeCase[] = [
      {
        reason: "raw_sql_rejected",
        label: "insert payload smuggling raw SQL/DDL",
        input: { verb: "insert", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE, values: { classroomSession: "s", question: "q;DROP TABLE user", prompt: "p", correctOption: "A" } },
      },
      {
        reason: "free_where_rejected",
        label: "insert payload smuggling a free-where object",
        input: { verb: "insert", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE, values: { classroomSession: "s", question: "q", prompt: { $ne: null } as unknown as string, correctOption: "A" } },
      },
      {
        reason: "unknown_column_rejected",
        label: "getByIndex on a non-existent column",
        input: { verb: "getByIndex", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE, index: ["nonexistent_col"], eq: { nonexistent_col: "y" } },
      },
      {
        reason: "unknown_table_rejected",
        label: "getByIndex on a non-allowlisted table",
        input: { verb: "getByIndex", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: "nonexistent_table", index: ["x"], eq: { x: "y" } },
      },
      {
        reason: "cross_school_rejected",
        label: "getByIndex eq smuggling a schoolId tenant key",
        input: { verb: "getByIndex", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE, index: ["schoolId", "classroomSession", "question"], eq: { schoolId: "other-school", classroomSession: "x", question: "y" } },
      },
      {
        reason: "invalid_payload_rejected",
        label: "getByIndex missing an equality value for an index column",
        input: { verb: "getByIndex", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE, index: ["schoolId", "classroomSession", "question"], eq: { classroomSession: "x" } },
      },
      {
        reason: "unindexed_column_rejected",
        label: "getByIndex on a real column that is not an index left-prefix",
        input: { verb: "getByIndex", actor: TEACHER_ID, pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE, index: ["question"], eq: { question: "q1" } },
      },
      {
        reason: "lifecycle_not_executable",
        label: "count against a disabled (non-executable) plugin",
        input: { verb: "count", actor: TEACHER_ID, pluginKey: QUIZ_DISABLED_KEY, table: QUESTIONS_TABLE },
      },
      {
        reason: "kill_switch_rejected",
        label: "count against a kill-switched plugin",
        input: { verb: "count", actor: TEACHER_ID, pluginKey: QUIZ_KILL_KEY, table: QUESTIONS_TABLE },
      },
      {
        reason: "non_school_actor_rejected",
        label: "count with an actor that is not the seeded in-school teacher",
        input: { verb: "count", actor: "intruder-not-teacher", pluginKey: QUIZ_KEY, table: QUESTIONS_TABLE },
      },
    ];

    const covered = new Set<string>();

    for (const negative of negatives) {
      const before = await deniedCountFor(negative.reason);

      let thrown: unknown;
      try {
        await dispatchPluginDataAccess(negative.input);
      } catch (error) {
        thrown = error;
      }

      assert(thrown !== undefined, `[${negative.reason}] expected throw for: ${negative.label}`);
      const actualReason = (thrown as { reason?: unknown }).reason;
      assert(
        actualReason === negative.reason,
        `[${negative.reason}] expected reason '${negative.reason}' but got '${String(actualReason)}' (${negative.label})`,
      );

      const after = await deniedCountFor(negative.reason);
      assert(
        after === before + 1,
        `[${negative.reason}] expected exactly +1 denied governanceAudits row (before=${before}, after=${after})`,
      );

      covered.add(negative.reason);
      console.log(`  ✓ ${negative.reason} — thrown + exactly one denied audit (${negative.label}).`);
    }

    // ============================================================
    // COVERAGE GUARD — every PLUGIN_DATA_ACCESS_REASONS member must have a sample (anti-drift).
    // ============================================================
    console.log("[3/3] Reason-coverage completeness guard...");
    const uncovered = (PLUGIN_DATA_ACCESS_REASONS as readonly string[]).filter((reason) => !covered.has(reason));
    assert(
      uncovered.length === 0,
      `D-08 coverage gap: PLUGIN_DATA_ACCESS_REASONS has uncovered reasons: ${uncovered.join(", ")}`,
    );
    assert(
      covered.size === PLUGIN_DATA_ACCESS_REASONS.length,
      `coverage mismatch: covered ${covered.size} vs declared ${PLUGIN_DATA_ACCESS_REASONS.length}`,
    );
    console.log(`  ✓ All ${PLUGIN_DATA_ACCESS_REASONS.length} declared rejection reasons covered by a negative sample.`);
  } finally {
    await (db.$client as { close?: () => Promise<void> | void } | undefined)?.close?.();
    cleanupSqliteArtifacts(DB_PATH);
  }

  console.log("\n==================================================");
  console.log("🎉 Phase 68 closeout PASSED");
  console.log("==================================================");
}

main().catch((error: unknown) => {
  console.error("Phase 68 verification failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
