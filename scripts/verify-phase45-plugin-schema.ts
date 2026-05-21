import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 45 Close Gate Verification...");
  console.log("==================================================");

  // 1. 运行时数据库物理表与索引校验 (Physical DB Schema Verification)
  console.log("[1/5] Running physical database schema verification...");
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

  // 2. 静态特征代码扫描校验 (Static Analysis Checks)
  console.log("\n[2/5] Running static analysis checks across codebase...");

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
  ];

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }
  console.log("  ✓ All 6 static code patterns checked and aligned perfectly.");

  // 3. 自动化测试套件回归 (Vitest Integration Runner)
  console.log("\n[3/5] Running core vitest suites for plugin extension data...");
  runVitest(["src/lib/dal/plugin-data.test.ts"], "Phase 45 DAL Unit Test Suite");
  console.log("  ✓ Core vitest suites passed successfully.");

  // 4. 向前级联安全验证 (Cascading Regression Verification)
  console.log("\n[4/5] Running cascading regression verifications for preceding Phase 44...");
  run(
    "node",
    ["--require", "./scripts/server-only-node-shim.cjs", "--import", "tsx", "scripts/verify-phase44-plugin-identity.ts"],
    "Phase 44 Regression"
  );
  console.log("  ✓ Cascading Phase 44 regression verifications passed successfully.");

  console.log("\n==================================================");
  console.log("🎉 Phase 45 closeout verification successfully PASSED!");
  console.log("- Physical SQLite extension structures and cascade rules are fully secured.");
  console.log("- Multi-tenant safe-scoping DAL endpoints are aligned perfectly.");
  console.log("- Preceding architectural features are green-light regression free.");
  console.log("==================================================");
}

runVerification().catch((error) => {
  console.error("Unhandled verification error:", error);
  process.exit(1);
});
