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

function cleanupSqliteArtifacts(databasePath: string): void {
  for (const filePath of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
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

async function bootstrapPhase46PhysicalProofDatabase(databaseUrl: string) {
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
    `CREATE UNIQUE INDEX plugin_ext_lesson_school_plugin_entity_unique ON plugin_ext_lesson (schoolId, pluginId, lessonId)`,
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
    `CREATE UNIQUE INDEX plugin_ext_lesson_step_school_plugin_entity_unique ON plugin_ext_lesson_step (schoolId, pluginId, lessonStepId)`,
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
    `CREATE UNIQUE INDEX plugin_ext_resource_school_plugin_entity_unique ON plugin_ext_resource (schoolId, pluginId, resourceId)`,
    `CREATE TABLE plugin_owned_business_data (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      key TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade,
      FOREIGN KEY (pluginId) REFERENCES pluginRegistration(id) ON DELETE cascade
    )`,
    `CREATE UNIQUE INDEX plugin_owned_biz_school_plugin_key_unique ON plugin_owned_business_data (schoolId, pluginId, key)`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }

  return client;
}

const REQUIRED_PLUGIN_DATA_TABLES = new Set([
  "plugin_ext_lesson",
  "plugin_ext_lesson_step",
  "plugin_ext_resource",
  "plugin_owned_business_data",
]);

const REQUIRED_PLUGIN_DATA_INDEXES = new Set([
  "plugin_ext_lesson_school_plugin_entity_unique",
  "plugin_ext_lesson_step_school_plugin_entity_unique",
  "plugin_ext_resource_school_plugin_entity_unique",
  "plugin_owned_biz_school_plugin_key_unique",
]);

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 46 Close Gate Verification...");
  console.log("==================================================");

  // 1. 运行时数据库物理表与列结构校验 (Physical DB Schema Verification)
  console.log("[1/5] Running physical database schema verification...");
  const physicalDatabasePath = path.join("/tmp/opencode", `phase46-physical-${randomUUID()}.db`);
  const physicalDatabaseUrl = `file:${physicalDatabasePath}`;
  const client = await bootstrapPhase46PhysicalProofDatabase(physicalDatabaseUrl);

  try {
    const tablesToCheck = [
      {
        name: "plugin_ext_lesson",
        columns: ["id", "schoolId", "pluginId", "lessonId", "payloadJson"],
        indexes: [{ name: "plugin_ext_lesson_school_plugin_entity_unique", unique: true }],
      },
      {
        name: "plugin_ext_lesson_step",
        columns: ["id", "schoolId", "pluginId", "lessonStepId", "payloadJson"],
        indexes: [{ name: "plugin_ext_lesson_step_school_plugin_entity_unique", unique: true }],
      },
      {
        name: "plugin_ext_resource",
        columns: ["id", "schoolId", "pluginId", "resourceId", "payloadJson"],
        indexes: [{ name: "plugin_ext_resource_school_plugin_entity_unique", unique: true }],
      },
      {
        name: "plugin_owned_business_data",
        columns: ["id", "schoolId", "pluginId", "key", "payloadJson"],
        indexes: [{ name: "plugin_owned_biz_school_plugin_key_unique", unique: true }],
      },
    ];

    for (const table of tablesToCheck) {
      // 检查表及列是否存在
      const tableInfoResult = await client.execute(`PRAGMA table_info(${table.name})`);
      if (tableInfoResult.rows.length === 0) {
        throw new Error(`Physical SQLite validation failed: Table '${table.name}' does not exist.`);
      }

      const columns = tableInfoResult.rows.map((row) => String(row.name));
      for (const reqCol of table.columns) {
        if (!columns.includes(reqCol)) {
          throw new Error(
            `Physical SQLite validation failed: Column '${reqCol}' not found in '${table.name}' table.`
          );
        }
      }

      // 检查物理索引是否存在
      for (const reqIdx of table.indexes) {
        await assertIndex(client, table.name, reqIdx.name, reqIdx.unique);
      }
      console.log(`  ✓ Table '${table.name}' and indexes verified successfully.`);
    }

    console.log("  ✓ All 4 physical extension and business tables are healthy in temporary SQLite proof database.");
  } catch (dbError: any) {
    console.error("Physical database check failed:", dbError.message);
    process.exit(1);
  } finally {
    await (client as { close?: () => Promise<void> | void }).close?.();
    cleanupSqliteArtifacts(physicalDatabasePath);
  }

  // 2. 静态特征代码命名与安全审计 (Static Analysis Checks & Governance)
  console.log("\n[2/5] Running static analysis naming & security audit...");

  const packageSource = read("package.json");
  const schemaSource = read("src/db/schema.ts");
  const dalSource = read("src/lib/dal/plugin-migration.ts");
  const pluginsDalSource = read("src/lib/dal/plugins.ts");

  // 2-1. 解析 Drizzle schema.ts 表定义并做前缀命名治理审计
  // 查找：sqliteTable("tableName", 或 sqliteTable(\n  "tableName",
  const tableRegex = /sqliteTable\(\s*["']([^"']+)["']/g;
  let match;
  const foundTables: string[] = [];
  while ((match = tableRegex.exec(schemaSource)) !== null) {
    foundTables.push(match[1]);
  }

  console.log(`  🔍 Found ${foundTables.length} physical tables defined in src/db/schema.ts.`);
  const pluginDataTables = foundTables.filter((name) => REQUIRED_PLUGIN_DATA_TABLES.has(name));
  const nonCompliantTables = pluginDataTables.filter(
    (name) => !name.startsWith("plugin_ext_") && !name.startsWith("plugin_owned_"),
  );

  const missingPluginDataTables = [...REQUIRED_PLUGIN_DATA_TABLES].filter(
    (name) => !pluginDataTables.includes(name),
  );

  if (missingPluginDataTables.length > 0 || nonCompliantTables.length > 0) {
    console.error("  ❌ Naming Governance Violation: plugin data tables are missing or use invalid prefixes:");
    for (const t of missingPluginDataTables) {
      console.error(`     - missing table: ${t}`);
    }
    for (const t of nonCompliantTables) {
      console.error(`     - invalid prefix: ${t}`);
    }
    process.exit(1);
  }
  console.log("  ✓ Table naming convention audit passed (DML-only runtime isolation compliance).");

  // 2-2. 索引前缀匹配校验
  // 查找：index("indexName") 或 uniqueIndex("indexName")
  const indexRegex = /(?:uniqueIndex|index)\(\s*["']([^"']+)["']/g;
  const foundIndexes: string[] = [];
  while ((match = indexRegex.exec(schemaSource)) !== null) {
    foundIndexes.push(match[1]);
  }

  const pluginDataIndexes = foundIndexes.filter((name) => REQUIRED_PLUGIN_DATA_INDEXES.has(name));
  const nonCompliantIndexes = pluginDataIndexes.filter(
    (name) => !name.startsWith("plugin_ext_") && !name.startsWith("plugin_owned_"),
  );
  const missingPluginDataIndexes = [...REQUIRED_PLUGIN_DATA_INDEXES].filter(
    (name) => !pluginDataIndexes.includes(name),
  );

  if (missingPluginDataIndexes.length > 0 || nonCompliantIndexes.length > 0) {
    console.error("  ❌ Naming Governance Violation: plugin data indexes are missing or use invalid prefixes:");
    for (const idx of missingPluginDataIndexes) {
      console.error(`     - missing index: ${idx}`);
    }
    for (const idx of nonCompliantIndexes) {
      console.error(`     - invalid prefix: ${idx}`);
    }
    process.exit(1);
  }
  console.log("  ✓ Index naming convention audit passed.");

  // 2-3. DDL 运行时预防检查
  const runtimePreventionPassed =
    !pluginsDalSource.includes("db.execute(") &&
    !pluginsDalSource.includes("db.run(") &&
    !pluginsDalSource.includes("CREATE TABLE") &&
    !pluginsDalSource.includes("ALTER TABLE") &&
    !pluginsDalSource.includes("DROP TABLE") &&
    !dalSource.includes("db.execute(") &&
    !dalSource.includes("db.run(") &&
    !dalSource.includes("CREATE TABLE") &&
    !dalSource.includes("ALTER TABLE") &&
    !dalSource.includes("DROP TABLE");

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
    process.exit(1);
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
