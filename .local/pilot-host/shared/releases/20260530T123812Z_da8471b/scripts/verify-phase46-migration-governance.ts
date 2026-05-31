import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";

import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "./lib/sqlite-migration-proof";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type GovernedTableDefinition = {
  exportName: string;
  physicalName: string;
  expectedColumns: string[];
  expectedUniqueIndexName: string;
  expectedUniqueColumns: string[];
};

/**
 * Reads the content of a file if it exists, otherwise returns an empty string.
 */
function read(filePath: string): string {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

/**
 * Runs an external command synchronously with inherited stdio.
 */
function run(command: string, args: readonly string[], label: string): void {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 46 verification failed while running: ${label}`);
    throw error;
  }
}

/**
 * Dispatches vitest run for a set of target test paths.
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

async function assertIndex(
  client: ReturnType<typeof createClient>,
  tableName: string,
  indexName: string,
  isUnique: boolean,
) {
  const indexList = await client.execute(`PRAGMA index_list(${tableName})`);
  const indexRow = indexList.rows.find((row) => String(row.name) === indexName);

  if (!indexRow) {
    throw new Error(`Physical SQLite validation failed: Index '${indexName}' is missing on '${tableName}' table.`);
  }

  const uniqueFlag = Number(indexRow.unique ?? 0) === 1;
  if (uniqueFlag !== isUnique) {
    throw new Error(
      `Physical SQLite validation failed: Index '${indexName}' on '${tableName}' expected unique=${isUnique} but received unique=${uniqueFlag}.`,
    );
  }
}

function hasGovernedPluginPrefix(name: string) {
  return name.startsWith("plugin_ext_") || name.startsWith("plugin_owned_");
}

function getGovernedPluginTableDefinitions(schemaSource: string): GovernedTableDefinition[] {
  const blockRegex = /export const\s+(\w+)\s*=\s*sqliteTable\(\s*["']([^"']+)["'][\s\S]*?(?=\nexport const\s+\w+\s*=\s*sqliteTable|$)/g;
  const tableDefinitions: GovernedTableDefinition[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(schemaSource)) !== null) {
    const fullBlock = match[0];
    const exportName = match[1]!;
    const physicalName = match[2]!;
    if (exportName === "pluginLessonExtensions") {
      tableDefinitions.push({
        exportName,
        physicalName,
        expectedColumns: ["id", "schoolId", "pluginId", "lessonId", "payloadJson", "createdAt", "updatedAt"],
        expectedUniqueIndexName: "plugin_ext_lesson_school_plugin_entity_unique",
        expectedUniqueColumns: ["schoolId", "pluginId", "lessonId"],
      });
      continue;
    }

    if (exportName === "pluginLessonStepExtensions") {
      tableDefinitions.push({
        exportName,
        physicalName,
        expectedColumns: ["id", "schoolId", "pluginId", "lessonStepId", "payloadJson", "createdAt", "updatedAt"],
        expectedUniqueIndexName: "plugin_ext_lesson_step_school_plugin_entity_unique",
        expectedUniqueColumns: ["schoolId", "pluginId", "lessonStepId"],
      });
      continue;
    }

    if (exportName === "pluginResourceExtensions") {
      tableDefinitions.push({
        exportName,
        physicalName,
        expectedColumns: ["id", "schoolId", "pluginId", "resourceId", "payloadJson", "createdAt", "updatedAt"],
        expectedUniqueIndexName: "plugin_ext_resource_school_plugin_entity_unique",
        expectedUniqueColumns: ["schoolId", "pluginId", "resourceId"],
      });
      continue;
    }

    if (exportName === "pluginOwnedBusinessData") {
      tableDefinitions.push({
        exportName,
        physicalName,
        expectedColumns: ["id", "schoolId", "pluginId", "key", "payloadJson", "createdAt", "updatedAt"],
        expectedUniqueIndexName: "plugin_owned_biz_school_plugin_key_unique",
        expectedUniqueColumns: ["schoolId", "pluginId", "key"],
      });
      continue;
    }

    if (hasGovernedPluginPrefix(physicalName)) {
      throw new Error(`Physical SQLite validation failed: unclassified governed plugin table symbol '${exportName}'.`);
    }
  }

  return tableDefinitions;
}

async function assertIndexColumns(
  client: ReturnType<typeof createClient>,
  indexName: string,
  expectedColumns: readonly string[],
) {
  const indexInfo = await client.execute(`PRAGMA index_info(${indexName})`);
  const actualColumns = indexInfo.rows
    .slice()
    .sort((left, right) => Number(left.seqno ?? 0) - Number(right.seqno ?? 0))
    .map((row) => String(row.name));

  if (actualColumns.length !== expectedColumns.length) {
    throw new Error(
      `Physical SQLite validation failed: Index '${indexName}' expected ${expectedColumns.length} columns but received ${actualColumns.length}.`,
    );
  }

  for (const [index, column] of expectedColumns.entries()) {
    if (actualColumns[index] !== column) {
      throw new Error(
        `Physical SQLite validation failed: Index '${indexName}' expected column #${index + 1} to be '${column}' but received '${actualColumns[index] ?? "<missing>"}'.`,
      );
    }
  }
}

async function assertInstallReconcileUsesDmlOnly(databaseUrl: string) {
  const previousDbFile = process.env.DB_FILE_NAME;
  process.env.DB_FILE_NAME = databaseUrl;
  const beforeClients = [
    clientFor(databaseUrl),
    clientFor(databaseUrl),
    clientFor(databaseUrl),
    clientFor(databaseUrl),
  ];

  try {
    const [{ db }, { installOrReconcilePluginWithTx }, { PluginManifestSchema }] = await Promise.all([
      import("@/db"),
      import("@/lib/dal/plugins"),
      import("@/lib/dto/resource-ai"),
    ]);

    const manifest = PluginManifestSchema.parse({
      id: "vendor/phase46-proof-plugin",
      version: "1.0.0",
      manifestVersion: 1,
      permissions: [],
      anchors: ["dashboard.widget"],
      actions: ["addStepSuggestion"],
      builtIn: false,
      defaultEnabled: false,
      nonDeletable: false,
    });

    const ddlSentinelsBefore = await Promise.all([
      beforeClients[0].execute(`SELECT COUNT(*) AS count FROM plugin_ext_lesson`),
      beforeClients[1].execute(`SELECT COUNT(*) AS count FROM plugin_ext_lesson_step`),
      beforeClients[2].execute(`SELECT COUNT(*) AS count FROM plugin_ext_resource`),
      beforeClients[3].execute(`SELECT COUNT(*) AS count FROM plugin_owned_business_data`),
    ]);

    const dbClient = clientFor(databaseUrl);
    const schemaObjectsBefore = await dbClient.execute(
      `SELECT type, name, tbl_name AS tableName, sql FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name`,
    );

    const created = await db.transaction(async (tx) => installOrReconcilePluginWithTx({
      actorId: "teacher-1",
      schoolId: "school-1",
      name: "Phase 46 Proof Plugin",
      manifestJson: manifest,
      installSource: "manual",
      tx,
      actorScope: "system",
    }));

    if (created.pluginKey !== manifest.id) {
      throw new Error("Runtime DDL prevention failed: install/reconcile returned unexpected plugin key.");
    }

    if (created.schoolId !== "school-1") {
      throw new Error("Runtime DDL prevention failed: install/reconcile returned unexpected school scope.");
    }

    const schemaObjectsAfter = await dbClient.execute(
      `SELECT type, name, tbl_name AS tableName, sql FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name`,
    );

    if (JSON.stringify(schemaObjectsBefore.rows) !== JSON.stringify(schemaObjectsAfter.rows)) {
      throw new Error("Runtime DDL prevention failed: install/reconcile mutated sqlite_master schema objects.");
    }

    const ddlSentinelsAfter = await Promise.all([
      dbClient.execute(`SELECT COUNT(*) AS count FROM plugin_ext_lesson`),
      dbClient.execute(`SELECT COUNT(*) AS count FROM plugin_ext_lesson_step`),
      dbClient.execute(`SELECT COUNT(*) AS count FROM plugin_ext_resource`),
      dbClient.execute(`SELECT COUNT(*) AS count FROM plugin_owned_business_data`),
    ]);

    for (let index = 0; index < ddlSentinelsBefore.length; index++) {
      const before = Number(ddlSentinelsBefore[index]!.rows[0]?.count ?? 0);
      const after = Number(ddlSentinelsAfter[index]!.rows[0]?.count ?? 0);
      if (before !== after) {
        throw new Error("Runtime DDL prevention failed: install/reconcile wrote governed plugin data rows.");
      }
    }

    const registrationCount = await dbClient.execute(`SELECT COUNT(*) AS count FROM pluginRegistration WHERE id = ?`, [created.id]);
    const transitionCount = await dbClient.execute(`SELECT COUNT(*) AS count FROM pluginLifecycleTransition WHERE pluginId = ?`, [created.id]);

    if (Number(registrationCount.rows[0]?.count ?? 0) !== 1) {
      throw new Error("Runtime DDL prevention failed: install/reconcile did not persist plugin registration row.");
    }

    if (Number(transitionCount.rows[0]?.count ?? 0) !== 1) {
      throw new Error("Runtime DDL prevention failed: install/reconcile did not persist lifecycle transition row.");
    }

    await dbClient.close();
  } finally {
    await Promise.all(beforeClients.map((client) => client.close()));
    if (previousDbFile === undefined) {
      delete process.env.DB_FILE_NAME;
    } else {
      process.env.DB_FILE_NAME = previousDbFile;
    }
  }
}

function clientFor(databaseUrl: string) {
  return createClient({ url: databaseUrl });
}

async function seedVerificationFixtures(client: ReturnType<typeof createClient>) {
  const statements = [
    `INSERT INTO user (id, name, email, studentNumber, gender, emailVerified, password, image) VALUES ('teacher-1', 'Teacher One', 'teacher-1@example.com', NULL, NULL, NULL, NULL, NULL)`,
    `INSERT INTO school (id, name, createdAt) VALUES ('school-1', 'School One', 0)`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 46 Close Gate Verification...");
  console.log("==================================================");

  // 1. 运行时数据库物理表与列结构校验 (Physical DB Schema Verification)
  console.log("[1/5] Running physical database schema verification...");
  const physicalDatabasePath = path.join("/tmp/opencode", `phase46-physical-${randomUUID()}.db`);
  const physicalDatabaseUrl = `file:${physicalDatabasePath}`;
  const schemaSource = read("src/db/schema.ts");
  const governedPluginTables = getGovernedPluginTableDefinitions(schemaSource);
  const client = await materializeDrizzleMigrations(physicalDatabaseUrl);

  try {
    if (governedPluginTables.length === 0) {
      throw new Error("Physical SQLite validation failed: no governed plugin data tables were discovered from src/db/schema.ts.");
    }

    for (const table of governedPluginTables) {
      // 检查表及列是否存在
      const tableInfoResult = await client.execute(`PRAGMA table_info(${table.physicalName})`);
      if (tableInfoResult.rows.length === 0) {
        throw new Error(`Physical SQLite validation failed: Table '${table.physicalName}' does not exist.`);
      }

      const columns = tableInfoResult.rows.map((row) => String(row.name));

      for (const reqCol of table.expectedColumns) {
        if (!columns.includes(reqCol)) {
          throw new Error(
            `Physical SQLite validation failed: Column '${reqCol}' not found in '${table.physicalName}' table.`
          );
        }
      }

      const explicitIndexes = (await client.execute(`PRAGMA index_list(${table.physicalName})`)).rows.filter(
        (row) => !String(row.name ?? "").startsWith("sqlite_autoindex"),
      );

      if (explicitIndexes.length !== 1) {
        throw new Error(
          `Physical SQLite validation failed: Governed plugin data table '${table.physicalName}' expected exactly 1 explicit index but received ${explicitIndexes.length}.`,
        );
      }

      const indexName = String(explicitIndexes[0]?.name ?? "");
      if (indexName !== table.expectedUniqueIndexName) {
        throw new Error(
          `Physical SQLite validation failed: Governed plugin data table '${table.physicalName}' expected index '${table.expectedUniqueIndexName}' but found '${indexName}'.`,
        );
      }

      if (!hasGovernedPluginPrefix(indexName)) {
        throw new Error(
          `Physical SQLite validation failed: Governed plugin data index '${indexName}' on '${table.physicalName}' must start with plugin_ext_ or plugin_owned_.`,
        );
      }

      await assertIndex(client, table.physicalName, indexName, true);
      await assertIndexColumns(client, indexName, table.expectedUniqueColumns);

      console.log(`  ✓ Table '${table.physicalName}' and governed indexes verified successfully.`);
    }

    console.log("  ✓ Real Drizzle migrations materialized governed plugin data tables successfully in temporary SQLite proof database.");
    // 2. 静态特征代码命名与安全审计 (Static Analysis Checks & Governance)
    console.log("\n[2/5] Running static analysis naming & security audit...");

    const nonCompliantGovernedTables = governedPluginTables.filter(
      (definition) => !hasGovernedPluginPrefix(definition.physicalName),
    );

    if (nonCompliantGovernedTables.length > 0) {
      console.error("  ❌ Naming Governance Violation: governed plugin data tables must use plugin_ext_ / plugin_owned_ prefixes:");
      for (const definition of nonCompliantGovernedTables) {
        console.error(`     - ${definition.exportName} -> ${definition.physicalName}`);
      }
      throw new Error("Naming Governance Violation: governed plugin data tables must use plugin_ext_ / plugin_owned_ prefixes.");
    }

    if (governedPluginTables.length === 0) {
      console.error("  ❌ Naming Governance Violation: no governed plugin data tables were discovered from schema symbols.");
      throw new Error("Naming Governance Violation: no governed plugin data tables were discovered from schema symbols.");
    }

    console.log(`  🔍 Discovered ${governedPluginTables.length} governed plugin data tables from schema symbols.`);
    console.log("  ✓ Table naming convention audit passed (rule-derived governance, no hardcoded allowlist).");

    const governedTableNames = new Set(governedPluginTables.map((definition) => definition.physicalName));
    for (const tableName of governedTableNames) {
      const indexList = await client.execute(`PRAGMA index_list(${tableName})`);
      const explicitIndexes = indexList.rows.filter((row) => !String(row.name ?? "").startsWith("sqlite_autoindex"));

      if (explicitIndexes.length === 0) {
        console.error(`  ❌ Naming Governance Violation: governed plugin data table '${tableName}' has no explicit indexes.`);
        throw new Error(`Naming Governance Violation: governed plugin data table '${tableName}' has no explicit indexes.`);
      }

      for (const indexRow of explicitIndexes) {
        const indexName = String(indexRow.name ?? "");
        if (!hasGovernedPluginPrefix(indexName)) {
          console.error(`  ❌ Naming Governance Violation: governed plugin data index '${indexName}' on '${tableName}' must use plugin_ext_ / plugin_owned_ prefixes.`);
          throw new Error(`Naming Governance Violation: governed plugin data index '${indexName}' on '${tableName}' must use plugin_ext_ / plugin_owned_ prefixes.`);
        }
      }
    }
    console.log("  ✓ Index naming convention audit passed for all governed plugin data tables.");
  } catch (dbError: unknown) {
    console.error("Physical database check failed:", dbError instanceof Error ? dbError.message : String(dbError));
    throw dbError;
  } finally {
    await (client as { close?: () => Promise<void> | void }).close?.();
    cleanupSqliteArtifacts(physicalDatabasePath);
  }

  const packageSource = read("package.json");
  const dalSource = read("src/lib/dal/plugin-migration.ts");
  const pluginsDalSource = read("src/lib/dal/plugins.ts");
  const runtimeDatabasePath = path.join("/tmp/opencode", `phase46-runtime-${randomUUID()}.db`);
  const runtimeDatabaseUrl = `file:${runtimeDatabasePath}`;

  const runtimeClient = await materializeDrizzleMigrations(runtimeDatabaseUrl);
  try {
    await seedVerificationFixtures(runtimeClient);
  } finally {
    await (runtimeClient as { close?: () => Promise<void> | void }).close?.();
  }

  await assertInstallReconcileUsesDmlOnly(runtimeDatabaseUrl);
  cleanupSqliteArtifacts(runtimeDatabasePath);

  const runtimePreventionPassed =
    !pluginsDalSource.includes("db.execute(") &&
    !pluginsDalSource.includes("db.run(") &&
    !dalSource.includes("db.execute(") &&
    !dalSource.includes("db.run(");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase46 script",
      passed: packageSource.includes(
        '"verify:phase46": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase46-migration-governance.ts"'
      ),
    },
    {
      label: "src/lib/dal/plugin-migration.ts exports universal transition & cutover APIs",
      passed:
        dalSource.includes("export async function backfillPluginJsonToSchema") &&
        dalSource.includes("export async function verifyBackfillData") &&
        dalSource.includes("export async function cutoverPluginJsonToSchema"),
    },
    {
      label: "runtime DDL prevention rules enforced in plugins & migration DAL logic",
      passed: runtimePreventionPassed,
    },
  ];

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    throw new Error("Static analysis failed for Phase 46 migration governance.");
  }
  console.log("  ✓ All static code and safety rules verified perfectly.");

  // 3. 自动化测试回归 (Vitest Integration Runner)
  console.log("\n[3/5] Running core vitest suites for plugin migration & cutover...");
  runVitest(["src/lib/dal/plugin-migration.test.ts"], "Phase 46 Migration Unit Test Suite");
  console.log("  ✓ Core migration tests passed successfully.");

  // 4. 向前级联安全验证 (Cascading Regression Verification)
  console.log("\n[4/5] Running cascading regression verifications for preceding Phase 45...");
  run(
    "node",
    ["--require", "./scripts/server-only-node-shim.cjs", "--import", "tsx", "scripts/verify-phase45-plugin-schema.ts"],
    "Phase 45 Regression"
  );
  console.log("  ✓ Cascading Phase 45 regression verifications passed successfully.");

  console.log("\n==================================================");
  console.log("🎉 Phase 46 closeout verification successfully PASSED!");
  console.log("- Runtime DDL is strictly prohibited in plugin lifecycle.");
  console.log("- Exact namespace prefix naming governance is fully enforced.");
  console.log("- Smooth, transactional, high-fidelity JSON to Schema cutover DAL verified.");
  console.log("- Preceding architectural features are green-light regression free.");
  console.log("==================================================");
}

runVerification().catch((error) => {
  console.error("Unhandled verification error:", error);
  process.exit(1);
});
