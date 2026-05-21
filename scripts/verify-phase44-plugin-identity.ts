import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { deriveDbNamespace } from "@/lib/dal/plugins";

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
    console.error(`Phase 44 verification failed while running: ${label}`);
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
  console.log("Starting Phase 44 Close Gate Verification...");
  console.log("==================================================");

  // 1. 运行时数据库物理表与索引校验 (Physical DB Schema Verification)
  console.log("[1/5] Running physical database schema verification...");
  const dbUrl = process.env.DB_FILE_NAME || "file:local.db";
  const client = createClient({ url: dbUrl });

  try {
    // 检查表列是否存在以及类型是否匹配
    const tableInfoResult = await client.execute("PRAGMA table_info(pluginRegistration)");
    const columns = tableInfoResult.rows.map((row) => ({
      name: String(row.name),
      type: String(row.type),
    }));

    const requiredColumns = [
      { name: "pluginKey", type: "text" },
      { name: "dbNamespace", type: "text" },
      { name: "sourceType", type: "text" },
      { name: "installSource", type: "text" },
    ];

    for (const reqCol of requiredColumns) {
      const found = columns.find(
        (c) => c.name === reqCol.name && c.type.toLowerCase() === reqCol.type
      );
      if (!found) {
        throw new Error(
          `Physical SQLite validation failed: Column '${reqCol.name}' of type '${reqCol.type}' was not found in 'pluginRegistration' table.`
        );
      }
    }
    console.log("  ✓ Physical columns verified: pluginKey, dbNamespace, sourceType, installSource.");

    // 检查 unique 索引是否存在
    const indexResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'pluginRegistration'"
    );
    const indexes = indexResult.rows.map((row) => String(row.name));

    const requiredIndexes = [
      "pluginRegistration_school_pluginKey_unique",
      "pluginRegistration_school_dbNamespace_unique",
    ];

    for (const reqIdx of requiredIndexes) {
      if (!indexes.includes(reqIdx)) {
        throw new Error(
          `Physical SQLite validation failed: Unique index '${reqIdx}' is missing on 'pluginRegistration' table.`
        );
      }
    }
    console.log("  ✓ Physical unique indexes verified: pluginKey_unique, dbNamespace_unique.");
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
  const dalSource = read("src/lib/dal/plugins.ts");
  const bootstrapSource = read("scripts/bootstrap-dev-db.ts");
  const registrySource = read("src/server/plugins/registry.ts");
  const settingsSurfaceSource = read("src/components/surfaces/settings-surface.tsx");
  const marketplaceSurfaceSource = read("src/components/surfaces/plugin-marketplace-surface.tsx");

  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase44 script",
      passed: packageSource.includes(
        '"verify:phase44": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase44-plugin-identity.ts"'
      ),
    },
    {
      label: "src/db/schema.ts defines fields and indices on pluginRegistration",
      passed:
        nonCommentIncludes(schemaSource, 'pluginKey: text("pluginKey").notNull()') &&
        nonCommentIncludes(schemaSource, 'dbNamespace: text("dbNamespace").notNull()') &&
        nonCommentIncludes(schemaSource, 'sourceType: text("sourceType", { enum: ["default", "external"] }).notNull()') &&
        nonCommentIncludes(schemaSource, 'installSource: text("installSource", { enum: ["manual", "bootstrap", "repair", "seed"] }).notNull()') &&
        nonCommentIncludes(schemaSource, 'uniqueIndex("pluginRegistration_school_pluginKey_unique").on(table.schoolId, table.pluginKey)') &&
        nonCommentIncludes(schemaSource, 'uniqueIndex("pluginRegistration_school_dbNamespace_unique").on(table.schoolId, table.dbNamespace)'),
    },
    {
      label: "src/lib/dal/plugins.ts exposes getPluginIdentityMetadataForSchool DAL API",
      passed:
        nonCommentIncludes(dalSource, "export async function getPluginIdentityMetadataForSchool") &&
        nonCommentIncludes(dalSource, "PluginIdentityMetadata") &&
        nonCommentIncludes(dalSource, "assertTeacherManagerScope"),
    },
    {
      label: "scripts/bootstrap-dev-db.ts uses installOrReconcilePlugin to register and align plugins",
      passed:
        nonCommentIncludes(bootstrapSource, "installOrReconcilePlugin") &&
        !nonCommentIncludes(bootstrapSource, ".insert(pluginRegistrations)"),
    },
    {
      label: "src/server/plugins/registry.ts utilizes prioritized lookup maps by Key, BuiltInKey, and Name",
      passed:
        nonCommentIncludes(registrySource, "BUILT_IN_TEACHING_STEP_BY_KEY") &&
        nonCommentIncludes(registrySource, "BUILT_IN_TEACHING_STEP_BY_BUILTIN_KEY") &&
        nonCommentIncludes(registrySource, "BUILT_IN_TEACHING_STEP_BY_NAME") &&
        nonCommentIncludes(registrySource, "resolveBuiltInTeachingStep"),
    },
    {
      label: "settings-surface.tsx strips manifestJson.id and displays formal identity badges",
      passed:
        nonCommentIncludes(settingsSurfaceSource, "plugin.pluginKey") &&
        nonCommentIncludes(settingsSurfaceSource, "plugin.dbNamespace") &&
        nonCommentIncludes(settingsSurfaceSource, "plugin.sourceType") &&
        nonCommentIncludes(settingsSurfaceSource, "plugin.installSource") &&
        !nonCommentIncludes(settingsSurfaceSource, "manifestJson.id"),
    },
    {
      label: "plugin-marketplace-surface.tsx strips manifestJson.id and displays formal identity badges",
      passed:
        nonCommentIncludes(marketplaceSurfaceSource, "plugin.pluginKey") &&
        nonCommentIncludes(marketplaceSurfaceSource, "plugin.dbNamespace") &&
        nonCommentIncludes(marketplaceSurfaceSource, "plugin.sourceType") &&
        !nonCommentIncludes(marketplaceSurfaceSource, "manifestJson.id"),
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
  console.log("  ✓ All 7 static code patterns checked and aligned perfectly.");

  // 3. Namespace Parity 算法一致性验证 (Namespace Derivation Matcher)
  console.log("\n[3/5] Verifying deriveDbNamespace derivation logic consistency...");
  const parityTestCases = [
    { input: "BUILTIN:quiz-engine-v2", expected: "builtin_quiz_engine_v2" },
    { input: "hello_world.plugin", expected: "hello_world_plugin" },
    { input: "-@scoped/plugin-name-", expected: "scoped_plugin_name" },
    { input: "A".repeat(60), expected: "a".repeat(48) }, // 截断验证
    { input: "", expected: "p_plugin" },
    { input: "123-plugin", expected: "p_123_plugin" }, // 数字前缀加 p_
    { input: "---multiple---dashes---", expected: "multiple_dashes" },
  ];

  for (const testCase of parityTestCases) {
    const derived = deriveDbNamespace(testCase.input);
    if (derived !== testCase.expected) {
      console.error(
        `  ❌ Namespace parity mismatch for input '${testCase.input}': expected '${testCase.expected}', got '${derived}'`
      );
      process.exit(1);
    }
  }
  console.log("  ✓ Namespace parity algorithms fully verified across 7 complex edge cases.");

  // 4. 自动化测试套件回归 (Vitest Integration Runner)
  console.log("\n[4/5] Running core vitest suites for plugins and operator UI...");
  runVitest(
    [
      "src/lib/dal/plugins.test.ts",
      "src/lib/dal/plugins.builtins.test.ts",
      "src/components/surfaces/settings-surface.test.tsx",
      "src/components/surfaces/plugin-marketplace-surface.test.tsx",
    ],
    "Phase 44 Unit Test Suites"
  );
  console.log("  ✓ Core vitest suites passed successfully.");

  // 5. 向前级联安全验证 (Cascading Regression Verification)
  console.log("\n[5/5] Running cascading regression verifications for preceding phases...");
  run("node", ["--require", "./scripts/server-only-node-shim.cjs", "--import", "tsx", "scripts/verify-phase43-validation-workloads.ts"], "Phase 43 Regression");

  console.log("\n==================================================");
  console.log("🎉 Phase 44 closeout verification successfully PASSED!");
  console.log("- All registered plugin physical structures, unique keys, and DB namespace identities are fully secured.");
  console.log("- Static metadata interfaces and operator-facing Surfaces are securely in place.");
  console.log("==================================================");
}

runVerification().catch((error) => {
  console.error("Unhandled verification error:", error);
  process.exit(1);
});
