// Phase 67 close-gate verifier (DATA-03 / DATA-04).
//
// Behavior-first physical proof: materializes the checked-in drizzle migrations into a
// throwaway SQLite engine, then asserts the D-12 physical invariants via PRAGMA, proves
// schoolId cascade by deleting a school row, checks foreign_key_check is clean, asserts
// pluginRegistration.dataVersion defaults to 1, re-runs the declaration↔generated drift
// guard, and orchestrates the zero-runtime-DDL static gate. Reuses (does NOT rebuild)
// scripts/lib/sqlite-migration-proof.ts.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@libsql/client";

import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "./lib/sqlite-migration-proof";

type Client = ReturnType<typeof createClient>;

const QUIZ_QUESTIONS = "plugin_owned_quiz_questions";
const QUIZ_RESPONSES = "plugin_owned_quiz_responses";
const SCOPE_INDEX = "plugin_owned_quiz_responses_schoolId_classroomSession_student_question_idx";
const DEDUPE_UNIQUE = "plugin_owned_quiz_responses_classroomSession_student_question_unique";
const QUESTIONS_SCOPE_INDEX = "plugin_owned_quiz_questions_schoolId_classroomSession_question_idx";

function read(filePath: string): string {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function withoutLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function nonCommentIncludes(source: string, token: string): boolean {
  return withoutLineComments(source).includes(token);
}

async function getColumns(client: Client, tableName: string): Promise<Map<string, { notNull: boolean; dflt: unknown }>> {
  const info = await client.execute(`PRAGMA table_info(${tableName})`);
  if (info.rows.length === 0) {
    throw new Error(`Physical proof failed: table '${tableName}' does not exist.`);
  }
  const map = new Map<string, { notNull: boolean; dflt: unknown }>();
  for (const row of info.rows) {
    map.set(String(row.name), { notNull: Number(row.notnull ?? 0) === 1, dflt: row.dflt_value });
  }
  return map;
}

function assertColumns(
  columns: Map<string, { notNull: boolean; dflt: unknown }>,
  tableName: string,
  required: readonly string[],
): void {
  for (const col of required) {
    if (!columns.has(col)) {
      throw new Error(`Physical proof failed: column '${col}' missing on '${tableName}'.`);
    }
  }
}

async function assertIndexColumns(
  client: Client,
  indexName: string,
  expectedColumns: readonly string[],
  expectUnique: boolean,
  tableName: string,
): Promise<void> {
  const indexList = await client.execute(`PRAGMA index_list(${tableName})`);
  const indexRow = indexList.rows.find((row) => String(row.name) === indexName);
  if (!indexRow) {
    throw new Error(`Physical proof failed: index '${indexName}' missing on '${tableName}'.`);
  }
  const uniqueFlag = Number(indexRow.unique ?? 0) === 1;
  if (uniqueFlag !== expectUnique) {
    throw new Error(
      `Physical proof failed: index '${indexName}' expected unique=${expectUnique} but got unique=${uniqueFlag}.`,
    );
  }
  const info = await client.execute(`PRAGMA index_info(${indexName})`);
  const ordered = info.rows
    .slice()
    .sort((a, b) => Number(a.seqno) - Number(b.seqno))
    .map((row) => String(row.name));
  if (ordered.join(",") !== expectedColumns.join(",")) {
    throw new Error(
      `Physical proof failed: index '${indexName}' column order expected (${expectedColumns.join(",")}) but got (${ordered.join(",")}).`,
    );
  }
}

async function getRowCount(client: Client, tableName: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function assertRowCount(client: Client, tableName: string, expected: number, label: string): Promise<void> {
  const actual = await getRowCount(client, tableName);
  if (actual !== expected) {
    throw new Error(`${label}: expected ${tableName} count ${expected}, got ${actual}.`);
  }
}

async function seedFixtures(client: Client): Promise<void> {
  const statements = [
    `INSERT INTO school (id, name, createdAt) VALUES ('school-1', 'School One', 0)`,
    // pluginRegistration intentionally omits dataVersion to exercise the DEFAULT 1 (DATA-04).
    `INSERT INTO pluginRegistration (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, uninstalledAt, uninstallRetentionMode, createdAt, updatedAt) VALUES ('plugin-1', 'school-1', 'Quiz Plugin', '{"permissions":["plugin:write"]}', 'sample/quiz', 'plugin_sample_quiz', 'default', 'manual', 1, 0, 'enabled', NULL, NULL, 0, 0)`,
    `INSERT INTO ${QUIZ_QUESTIONS} (id, schoolId, pluginId, classroomSession, question, prompt, correctOption, createdAt, updatedAt) VALUES ('q-1', 'school-1', 'plugin-1', 'session-1', 'q1', 'What is 1+1?', 'B', 0, 0)`,
    `INSERT INTO ${QUIZ_RESPONSES} (id, schoolId, pluginId, classroomSession, student, question, selectedOption, createdAt, updatedAt) VALUES ('r-1', 'school-1', 'plugin-1', 'session-1', 'student-1', 'q1', 'B', 0, 0)`,
  ];
  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function runPhysicalProof(): Promise<void> {
  const databasePath = path.join("/tmp/opencode", `phase67-verify-${randomUUID()}.db`);
  const client = await materializeDrizzleMigrations(`file:${databasePath}`);

  try {
    // --- D-12 physical invariants: tables, columns, schoolId notNull ---
    const questionCols = await getColumns(client, QUIZ_QUESTIONS);
    assertColumns(questionCols, QUIZ_QUESTIONS, ["id", "schoolId", "pluginId", "classroomSession", "question", "prompt", "correctOption"]);
    if (!questionCols.get("schoolId")?.notNull) {
      throw new Error(`Physical proof failed: ${QUIZ_QUESTIONS}.schoolId must be NOT NULL.`);
    }

    const responseCols = await getColumns(client, QUIZ_RESPONSES);
    assertColumns(responseCols, QUIZ_RESPONSES, ["id", "schoolId", "pluginId", "classroomSession", "student", "question", "selectedOption"]);
    if (!responseCols.get("schoolId")?.notNull) {
      throw new Error(`Physical proof failed: ${QUIZ_RESPONSES}.schoolId must be NOT NULL.`);
    }

    // Composite scope index column order + dedupe unique constraint column order.
    await assertIndexColumns(client, QUESTIONS_SCOPE_INDEX, ["schoolId", "classroomSession", "question"], false, QUIZ_QUESTIONS);
    await assertIndexColumns(client, SCOPE_INDEX, ["schoolId", "classroomSession", "student", "question"], false, QUIZ_RESPONSES);
    await assertIndexColumns(client, DEDUPE_UNIQUE, ["classroomSession", "student", "question"], true, QUIZ_RESPONSES);

    // --- DATA-04: pluginRegistration.dataVersion physically exists with default 1 ---
    const registrationCols = await getColumns(client, "pluginRegistration");
    const dataVersion = registrationCols.get("dataVersion");
    if (!dataVersion) {
      throw new Error("Physical proof failed: pluginRegistration.dataVersion column missing.");
    }
    if (Number(dataVersion.dflt) !== 1) {
      throw new Error(`Physical proof failed: pluginRegistration.dataVersion default expected 1 but got '${String(dataVersion.dflt)}'.`);
    }

    // --- Seed + DATA-04 schoolId cascade proof + foreign_key_check ---
    await seedFixtures(client);
    await assertRowCount(client, QUIZ_QUESTIONS, 1, "seed proof");
    await assertRowCount(client, QUIZ_RESPONSES, 1, "seed proof");

    // dataVersion DEFAULT applied on the seeded row.
    const seededVersion = await client.execute("SELECT dataVersion FROM pluginRegistration WHERE id = 'plugin-1'");
    if (Number(seededVersion.rows[0]?.dataVersion) !== 1) {
      throw new Error(`Physical proof failed: seeded pluginRegistration.dataVersion expected 1, got '${String(seededVersion.rows[0]?.dataVersion)}'.`);
    }

    await client.execute("DELETE FROM school WHERE id = 'school-1'");
    await assertRowCount(client, QUIZ_QUESTIONS, 0, "schoolId cascade proof (questions)");
    await assertRowCount(client, QUIZ_RESPONSES, 0, "schoolId cascade proof (responses)");

    const foreignKeyCheck = await client.execute("PRAGMA foreign_key_check");
    if (foreignKeyCheck.rows.length !== 0) {
      throw new Error(`foreign_key_check reported ${foreignKeyCheck.rows.length} violation(s).`);
    }
  } finally {
    await (client as { close?: () => Promise<void> | void }).close?.();
    cleanupSqliteArtifacts(databasePath);
  }
}

function assertDeclarationAlignment(): void {
  const generated = read("src/db/schema/generated/plugin-owned/quiz.ts");
  const tokens = [QUIZ_QUESTIONS, QUIZ_RESPONSES, SCOPE_INDEX, DEDUPE_UNIQUE];
  for (const token of tokens) {
    if (!nonCommentIncludes(generated, token)) {
      throw new Error(`Declaration↔generated alignment failed: '${token}' absent from generated fragment.`);
    }
  }
}

function runDriftGuard(): void {
  // Recompile from declarations; any git diff in generated output = drift = fail (T-67-13).
  execFileSync("pnpm", ["plugin:compile"], { stdio: "inherit" });
  execFileSync("git", ["diff", "--exit-code", "src/db/schema/generated"], { stdio: "inherit" });
}

function runZeroDdlGate(): void {
  // Orchestrate the static zero-runtime-DDL gate into the phase gate (T-67-10).
  execFileSync(process.execPath, ["--import", "tsx", "scripts/gate-no-runtime-ddl.ts"], { stdio: "inherit" });
}

async function main(): Promise<void> {
  console.log("==================================================");
  console.log("Phase 67 close-gate verification starting...");
  console.log("==================================================");

  console.log("[1/4] Physical SQLite proof (materialize + PRAGMA + cascade + foreign_key_check)...");
  await runPhysicalProof();
  console.log("  ✓ D-12 physical invariants, schoolId cascade, dataVersion=1, foreign_key_check clean.");

  console.log("[2/4] Declaration↔generated alignment...");
  assertDeclarationAlignment();
  console.log("  ✓ Generated fragment matches declared plugin-owned tables/indexes.");

  console.log("[3/4] Drift guard (plugin:compile + git diff --exit-code)...");
  runDriftGuard();
  console.log("  ✓ Recompile produced zero drift in src/db/schema/generated.");

  console.log("[4/4] Zero-runtime-DDL static gate...");
  runZeroDdlGate();
  console.log("  ✓ No physical DDL outside whitelist.");

  console.log("\n==================================================");
  console.log("🎉 Phase 67 closeout PASSED");
  console.log("==================================================");
}

main().catch((error: unknown) => {
  console.error("Phase 67 verification failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
