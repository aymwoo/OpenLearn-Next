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

function getGovernedPluginTableDefinitions(schemaSource: string) {
  const blockRegex = /export const\s+(\w+)\s*=\s*sqliteTable\(\s*["']([^"']+)["'][\s\S]*?(?=\nexport const\s+\w+\s*=\s*sqliteTable|$)/g;
  const governedEntityColumns = ["lessonId", "lessonStepId", "resourceId", "key"];
  const tableDefinitions: Array<{ exportName: string; physicalName: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(schemaSource)) !== null) {
    const fullBlock = match[0];
    const exportName = match[1]!;
    const physicalName = match[2]!;
    const hasPluginPayloadShape =
      fullBlock.includes("pluginId:")
      && fullBlock.includes("schoolId:")
      && fullBlock.includes("payloadJson:")
      && governedEntityColumns.some((column) => fullBlock.includes(`${column}:`));

    if (hasGovernedPluginPrefix(physicalName) || hasPluginPayloadShape) {
      tableDefinitions.push({ exportName, physicalName });
    }
  }

  return tableDefinitions;
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
      const requiredColumns = ["id", "schoolId", "pluginId", "payloadJson"];
      if (table.exportName.endsWith("OwnedBusinessData")) {
        requiredColumns.push("key");
      }

      for (const reqCol of requiredColumns) {
        if (!columns.includes(reqCol)) {
          throw new Error(
            `Physical SQLite validation failed: Column '${reqCol}' not found in '${table.physicalName}' table.`
          );
        }
      }

      const explicitIndexes = (await client.execute(`PRAGMA index_list(${table.physicalName})`)).rows.filter(
        (row) => !String(row.name ?? "").startsWith("sqlite_autoindex"),
      );

      if (explicitIndexes.length === 0) {
        throw new Error(`Physical SQLite validation failed: Governed plugin data table '${table.physicalName}' has no explicit indexes.`);
      }

      for (const indexRow of explicitIndexes) {
        const indexName = String(indexRow.name ?? "");
        if (!hasGovernedPluginPrefix(indexName)) {
          throw new Error(
            `Physical SQLite validation failed: Governed plugin data index '${indexName}' on '${table.physicalName}' must start with plugin_ext_ or plugin_owned_.`,
          );
        }
        await assertIndex(client, table.physicalName, indexName, Number(indexRow.unique ?? 0) === 1);
      }

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
  } catch (dbError: any) {
    console.error("Physical database check failed:", dbError.message);
    throw dbError;
  } finally {
    await (client as { close?: () => Promise<void> | void }).close?.();
    cleanupSqliteArtifacts(physicalDatabasePath);
  }

  const packageSource = read("package.json");
  const dalSource = read("src/lib/dal/plugin-migration.ts");
  const pluginsDalSource = read("src/lib/dal/plugins.ts");

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
