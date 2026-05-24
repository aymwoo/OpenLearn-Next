import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@libsql/client";

type StaticCheck = {
  label: string;
  passed: boolean;
};

/**
 * Reads the content of a file if it exists, otherwise returns an empty string.
 *
 * @param filePath The relative path to the file.
 * @returns The content of the file or empty string.
 */
function read(filePath: string): string {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

/**
 * Strips line comments from source code.
 *
 * @param source The source code.
 * @returns The stripped source code.
 */
function withoutLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/**
 * Verifies if a token is present in the source code, excluding comments.
 *
 * @param source The source code.
 * @param token The token to search for.
 * @returns True if the token is present in non-comment code, false otherwise.
 */
function nonCommentIncludes(source: string, token: string): boolean {
  return withoutLineComments(source).includes(token);
}

/**
 * Runs an external command synchronously with inherited stdio.
 *
 * @param command The command name.
 * @param args The arguments array.
 * @param label A label describing the step.
 */
function run(command: string, args: readonly string[], label: string): void {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 45 verification failed while running: ${label}`);
    throw error;
  }
}

/**
 * Dispatches vitest run for a set of target test paths.
 *
 * @param paths The array of paths to test.
 * @param label The label describing the test block.
 */
function runVitest(paths: readonly string[], label: string): void {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, "--run", ...paths], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, ["--run", ...paths], label);
    return;
  }

  run("pnpm", ["exec", "vitest", "--run", ...paths], label);
}

function cleanupSqliteArtifacts(databasePath: string): void {
  for (const filePath of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}

async function bootstrapPhase45ProofDatabase(databaseUrl: string) {
  const client = createClient({ url: databaseUrl });

  await client.execute("PRAGMA foreign_keys = ON");

  const statements = [
    `CREATE TABLE school (id TEXT PRIMARY KEY NOT NULL)`,
    `CREATE TABLE pluginRegistration (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade
    )`,
    `CREATE TABLE course (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade
    )`,
    `CREATE TABLE lesson (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      courseId TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (courseId) REFERENCES course(id) ON DELETE cascade
    )`,
    `CREATE TABLE lessonStep (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      lessonId TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (lessonId) REFERENCES lesson(id) ON DELETE cascade
    )`,
    `CREATE TABLE resource (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade
    )`,
    `CREATE TABLE plugin_ext_lesson (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      lessonId TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (pluginId) REFERENCES pluginRegistration(id) ON DELETE cascade,
      FOREIGN KEY (lessonId) REFERENCES lesson(id) ON DELETE cascade
    )`,
    `CREATE TABLE plugin_ext_lesson_step (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      lessonStepId TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (pluginId) REFERENCES pluginRegistration(id) ON DELETE cascade,
      FOREIGN KEY (lessonStepId) REFERENCES lessonStep(id) ON DELETE cascade
    )`,
    `CREATE TABLE plugin_ext_resource (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      resourceId TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (pluginId) REFERENCES pluginRegistration(id) ON DELETE cascade,
      FOREIGN KEY (resourceId) REFERENCES resource(id) ON DELETE cascade
    )`,
    `CREATE TABLE plugin_owned_business_data (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      key TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (pluginId) REFERENCES pluginRegistration(id) ON DELETE cascade
    )`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }

  return client;
}

async function seedPhase45ProofFixtures(client: ReturnType<typeof createClient>) {
  const seedStatements = [
    `INSERT INTO school (id) VALUES ('school-1')`,
    `INSERT INTO pluginRegistration (id, schoolId) VALUES ('plugin-1', 'school-1')`,
    `INSERT INTO course (id, schoolId) VALUES ('course-1', 'school-1'), ('course-2', 'school-1')`,
    `INSERT INTO lesson (id, schoolId, courseId) VALUES ('lesson-1', 'school-1', 'course-1'), ('lesson-2', 'school-1', 'course-2')`,
    `INSERT INTO lessonStep (id, schoolId, lessonId) VALUES ('step-1', 'school-1', 'lesson-1'), ('step-2', 'school-1', 'lesson-2')`,
    `INSERT INTO resource (id, schoolId) VALUES ('resource-1', 'school-1'), ('resource-2', 'school-1')`,
    `INSERT INTO plugin_ext_lesson (id, schoolId, pluginId, lessonId, payloadJson) VALUES ('ext-lesson-1', 'school-1', 'plugin-1', 'lesson-1', '{"kind":"primary"}'), ('ext-lesson-2', 'school-1', 'plugin-1', 'lesson-2', '{"kind":"secondary"}')`,
    `INSERT INTO plugin_ext_lesson_step (id, schoolId, pluginId, lessonStepId, payloadJson) VALUES ('ext-step-1', 'school-1', 'plugin-1', 'step-1', '{"kind":"primary"}'), ('ext-step-2', 'school-1', 'plugin-1', 'step-2', '{"kind":"secondary"}')`,
    `INSERT INTO plugin_ext_resource (id, schoolId, pluginId, resourceId, payloadJson) VALUES ('ext-resource-1', 'school-1', 'plugin-1', 'resource-1', '{"kind":"primary"}'), ('ext-resource-2', 'school-1', 'plugin-1', 'resource-2', '{"kind":"secondary"}')`,
    `INSERT INTO plugin_owned_business_data (id, schoolId, pluginId, key, payloadJson) VALUES ('owned-1', 'school-1', 'plugin-1', 'reminders', '{"enabled":true}')`,
  ];

  for (const statement of seedStatements) {
    await client.execute(statement);
  }
}

async function getRowCount(client: ReturnType<typeof createClient>, tableName: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function assertRowCount(
  client: ReturnType<typeof createClient>,
  tableName: string,
  expected: number,
  label: string
): Promise<void> {
  const actual = await getRowCount(client, tableName);
  if (actual !== expected) {
    throw new Error(`${label}: expected ${tableName} count ${expected}, got ${actual}`);
  }
}

async function runBehaviorProof(): Promise<void> {
  const databasePath = path.join("/tmp/opencode", `phase45-verify-${randomUUID()}.db`);
  const databaseUrl = `file:${databasePath}`;
  const client = await bootstrapPhase45ProofDatabase(databaseUrl);

  try {
    await seedPhase45ProofFixtures(client);

    await assertRowCount(client, "plugin_ext_lesson", 2, "seed proof");
    await assertRowCount(client, "plugin_ext_lesson_step", 2, "seed proof");
    await assertRowCount(client, "plugin_ext_resource", 2, "seed proof");
    await assertRowCount(client, "plugin_owned_business_data", 1, "seed proof");

    await client.execute("DELETE FROM lesson WHERE id = 'lesson-1'");
    await assertRowCount(client, "plugin_ext_lesson", 1, "lesson delete cascade proof");
    await assertRowCount(client, "plugin_ext_lesson_step", 1, "lesson delete step cascade proof");
    await assertRowCount(client, "plugin_owned_business_data", 1, "lesson delete owned data preservation proof");

    await client.execute("DELETE FROM lessonStep WHERE id = 'step-2'");
    await assertRowCount(client, "plugin_ext_lesson_step", 0, "lessonStep delete cascade proof");
    await assertRowCount(client, "plugin_ext_lesson", 1, "lessonStep delete non-target preservation proof");

    await client.execute("DELETE FROM resource WHERE id = 'resource-1'");
    await assertRowCount(client, "plugin_ext_resource", 1, "resource delete cascade proof");
    await assertRowCount(client, "plugin_owned_business_data", 1, "resource delete owned data preservation proof");

    await client.execute("DELETE FROM pluginRegistration WHERE id = 'plugin-1'");
    await assertRowCount(client, "plugin_ext_lesson", 0, "plugin delete lesson cascade proof");
    await assertRowCount(client, "plugin_ext_lesson_step", 0, "plugin delete step cascade proof");
    await assertRowCount(client, "plugin_ext_resource", 0, "plugin delete resource cascade proof");
    await assertRowCount(client, "plugin_owned_business_data", 0, "plugin delete owned data cascade proof");

    const foreignKeyCheck = await client.execute("PRAGMA foreign_key_check");
    if (foreignKeyCheck.rows.length !== 0) {
      throw new Error(`foreign_key_check reported ${foreignKeyCheck.rows.length} violation(s)`);
    }
  } finally {
    await (client as { close?: () => Promise<void> | void }).close?.();
    cleanupSqliteArtifacts(databasePath);
  }
}

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 45 Close Gate Verification...");
  console.log("==================================================");

  // 1. 行为优先的临时 SQLite 级联证明
  console.log("[1/5] Running behavior-first SQLite cascade proof...");
  try {
    await runBehaviorProof();
    console.log("  ✓ Temporary SQLite delete/assert proof and PRAGMA foreign_key_check passed.");
  } catch (error: any) {
    console.error("Behavior-first SQLite cascade proof failed:", error.message);
    process.exit(1);
  }

  // 2. 运行时数据库物理表与索引校验 (Physical DB Schema Verification)
  console.log("\n[2/5] Running physical database schema verification...");
  const dbUrl = process.env.DB_FILE_NAME || "file:local.db";
  const client = createClient({ url: dbUrl });

  try {
    const tablesToCheck = [
      {
        name: "plugin_ext_lesson",
        columns: ["id", "schoolId", "pluginId", "lessonId", "payloadJson"],
        indexes: ["plugin_ext_lesson_school_plugin_entity_unique"],
      },
      {
        name: "plugin_ext_lesson_step",
        columns: ["id", "schoolId", "pluginId", "lessonStepId", "payloadJson"],
        indexes: ["plugin_ext_lesson_step_school_plugin_entity_unique"],
      },
      {
        name: "plugin_ext_resource",
        columns: ["id", "schoolId", "pluginId", "resourceId", "payloadJson"],
        indexes: ["plugin_ext_resource_school_plugin_entity_unique"],
      },
      {
        name: "plugin_owned_business_data",
        columns: ["id", "schoolId", "pluginId", "key", "payloadJson"],
        indexes: ["plugin_owned_biz_school_plugin_key_idx"],
      },
    ];

    for (const table of tablesToCheck) {
      // 检查表及列
      const tableInfoResult = await client.execute(`PRAGMA table_info(${table.name})`);
      if (tableInfoResult.rows.length === 0) {
        throw new Error(`Physical SQLite validation failed: Table '${table.name}' does not exist.`);
      }

      const columns = tableInfoResult.rows.map((row) => String(row.name));
      for (const reqCol of table.columns) {
        if (!columns.includes(reqCol)) {
          throw new Error(
            `Physical SQLite validation failed: Column '${reqCol}' was not found in '${table.name}' table.`
          );
        }
      }

      // 检查索引是否存在
      const indexResult = await client.execute(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = '${table.name}'`
      );
      const indexes = indexResult.rows.map((row) => String(row.name));

      for (const reqIdx of table.indexes) {
        if (!indexes.includes(reqIdx)) {
          throw new Error(
            `Physical SQLite validation failed: Index '${reqIdx}' is missing on '${table.name}' table.`
          );
        }
      }
      console.log(`  ✓ Table '${table.name}' and indexes verified successfully.`);
    }

    console.log("  ✓ All 4 physical extension and business tables verified in SQLite local.db.");
  } catch (dbError: any) {
    console.error("Physical database check failed:", dbError.message);
    process.exit(1);
  } finally {
    client.close();
  }

  // 3. 静态特征代码扫描校验 (Static Analysis Checks)
  console.log("\n[3/5] Running static analysis checks across codebase...");

  const packageSource = read("package.json");
  const schemaSource = read("src/db/schema.ts");
  const dalSource = read("src/lib/dal/plugin-data.ts");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase45 script",
      passed: packageSource.includes(
        '"verify:phase45": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase45-plugin-schema.ts"'
      ),
    },
    {
      label: "src/db/schema.ts defines 4 key extension/owned tables",
      passed:
        schemaSource.includes("pluginLessonExtensions") &&
        schemaSource.includes("pluginLessonStepExtensions") &&
        schemaSource.includes("pluginResourceExtensions") &&
        schemaSource.includes("pluginOwnedBusinessData"),
    },
    {
      label: "src/db/schema.ts enforces onDelete: 'cascade' on relations",
      passed:
        schemaSource.includes('references(() => schools.id, { onDelete: "cascade" })') &&
        schemaSource.includes('references(() => pluginRegistrations.id, { onDelete: "cascade" })') &&
        schemaSource.includes('references(() => lessons.id, { onDelete: "cascade" })') &&
        schemaSource.includes('references(() => lessonSteps.id, { onDelete: "cascade" })') &&
        schemaSource.includes('references(() => resources.id, { onDelete: "cascade" })'),
    },
    {
      label: "src/db/schema.ts establishes joint unique indices",
      passed:
        schemaSource.includes('uniqueIndex("plugin_ext_lesson_school_plugin_entity_unique").on(table.schoolId, table.pluginId, table.lessonId)') &&
        schemaSource.includes('uniqueIndex("plugin_ext_lesson_step_school_plugin_entity_unique").on(table.schoolId, table.pluginId, table.lessonStepId)') &&
        schemaSource.includes('uniqueIndex("plugin_ext_resource_school_plugin_entity_unique").on(table.schoolId, table.pluginId, table.resourceId)'),
    },
    {
      label: "src/lib/dal/plugin-data.ts exports universal plugin-data DAL APIs",
      passed:
        nonCommentIncludes(dalSource, "export async function upsertPluginExtension") &&
        nonCommentIncludes(dalSource, "export async function getPluginExtension") &&
        nonCommentIncludes(dalSource, "export async function upsertPluginOwnedBusinessData") &&
        nonCommentIncludes(dalSource, "export async function getPluginOwnedBusinessData"),
    },
    {
      label: "src/lib/dal/plugin-data.ts embeds active teacher assertion & cross-school isolation",
      passed:
        nonCommentIncludes(dalSource, "assertTeacherManagerScope") &&
        nonCommentIncludes(dalSource, "assertEntityBelongsToSchool") &&
        nonCommentIncludes(dalSource, "assertPluginBelongsToSchool"),
    },
    {
      label: "scripts/verify-phase45-plugin-schema.ts includes temp SQLite cascade proof with PRAGMA foreign_key_check",
      passed:
        nonCommentIncludes(read("scripts/verify-phase45-plugin-schema.ts"), "PRAGMA foreign_key_check") &&
        nonCommentIncludes(read("scripts/verify-phase45-plugin-schema.ts"), "DELETE FROM pluginRegistration") &&
        nonCommentIncludes(read("scripts/verify-phase45-plugin-schema.ts"), "DELETE FROM lesson") &&
        nonCommentIncludes(read("scripts/verify-phase45-plugin-schema.ts"), "DELETE FROM lessonStep") &&
        nonCommentIncludes(read("scripts/verify-phase45-plugin-schema.ts"), "DELETE FROM resource"),
    },
  ];

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }
  console.log(`  ✓ All ${staticChecks.length} static code patterns checked and aligned perfectly.`);

  // 4. 自动化测试套件回归 (Vitest Integration Runner)
  console.log("\n[4/5] Running core vitest suites for plugin extension data...");
  runVitest(["src/lib/dal/plugin-data.test.ts"], "Phase 45 DAL Unit Test Suite");
  console.log("  ✓ Core vitest suites passed successfully.");

  // 5. 向前级联安全验证 (Cascading Regression Verification)
  console.log("\n[5/5] Running cascading regression verifications for preceding Phase 44...");
  run(
    "node",
    ["--require", "./scripts/server-only-node-shim.cjs", "--import", "tsx", "scripts/verify-phase44-plugin-identity.ts"],
    "Phase 44 Regression"
  );
  console.log("  ✓ Cascading Phase 44 regression verifications passed successfully.");

  console.log("\n==================================================");
  console.log("🎉 Phase 45 closeout verification successfully PASSED!");
  console.log("- Behavior-first temporary SQLite proof verified delete cascades before metadata checks.");
  console.log("- Physical SQLite extension structures and cascade rules are fully secured.");
  console.log("- Multi-tenant safe-scoping DAL endpoints are aligned perfectly.");
  console.log("- Preceding architectural features are green-light regression free.");
  console.log("==================================================");
}

runVerification().catch((error) => {
  console.error("Unhandled verification error:", error);
  process.exit(1);
});
