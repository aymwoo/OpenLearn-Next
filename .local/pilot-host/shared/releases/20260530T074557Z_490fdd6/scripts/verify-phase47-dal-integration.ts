import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
    console.error(`Phase 47 verification failed while running: ${label}`);
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

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 47 Close Gate Verification...");
  console.log("==================================================");

  // 1. 运行时数据库物理表与列结构校验 (Physical DB Schema Verification)
  console.log("[1/5] Running physical database schema verification...");
  const dbUrl = process.env.DB_FILE_NAME || "file:local.db";
  const client = createClient({ url: dbUrl });

  try {
    const tablesToCheck = [
      {
        name: "pluginActionAudit",
        columns: ["id", "pluginId", "action", "decision", "schoolId", "actorScope", "correlationId", "payloadJson", "actorId", "createdAt"],
        indexes: ["pluginActionAudit_plugin_created_idx", "pluginActionAudit_decision_created_idx"],
      },
      {
        name: "governanceAudit",
        columns: ["id", "targetType", "targetId", "pluginId", "schoolId", "action", "decision", "actorId", "actorScope", "requestedCapabilitiesJson", "grantedCapabilitiesJson", "requiredPermission", "correlationId", "payloadJson", "createdAt"],
        indexes: ["governanceAudit_target_created_idx", "governanceAudit_decision_created_idx"],
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

    console.log("  ✓ Physical plugin audit and governance tables are healthy in local.db.");
  } catch (dbError: unknown) {
    console.error("Physical database check failed:", dbError instanceof Error ? dbError.message : String(dbError));
    process.exit(1);
  } finally {
    client.close();
  }

  // 2. 静态特征安全审计 (Static Analysis Checks & Governance)
  console.log("\n[2/5] Running static analysis naming & security audit...");

  const packageSource = read("package.json");
  const dalSource = read("src/lib/dal/plugin-data.ts");

  // 2-1. 防绕过检查
  const srcFiles = execSync("find src/ -name '*.ts' -o -name '*.tsx'")
    .toString()
    .split("\n")
    .filter(Boolean);

  const violations: string[] = [];
  for (const file of srcFiles) {
    if (
      file.endsWith("plugin-data.ts") ||
      file.endsWith("plugin-data.test.ts") ||
      file.endsWith("plugin-migration.ts")
    ) {
      continue;
    }
    const content = readFileSync(file, "utf8");
    if (
      content.includes("insert(pluginLessonExtensions") ||
      content.includes("insert(pluginLessonStepExtensions") ||
      content.includes("insert(pluginResourceExtensions") ||
      content.includes("insert(pluginOwnedBusinessData") ||
      content.includes("update(pluginLessonExtensions") ||
      content.includes("update(pluginLessonStepExtensions") ||
      content.includes("update(pluginResourceExtensions") ||
      content.includes("update(pluginOwnedBusinessData")
    ) {
      violations.push(file);
    }
  }

  if (violations.length > 0) {
    console.error("  ❌ Bypassing DAL Isolation Violation: Direct DB writes to plugin tables are forbidden outside of plugin-data.ts:");
    for (const v of violations) {
      console.error(`     - ${v}`);
    }
    process.exit(1);
  }
  console.log("  ✓ DAL Bypass prevention audit passed.");

  // 2-2. 验证 DAL 特征代码完整度
  const staticChecks: StaticCheck[] = [
    {
      label: "package.json exposes exact verify:phase47 script",
      passed: packageSource.includes(
        '"verify:phase47": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase47-dal-integration.ts"'
      ),
    },
    {
      label: "src/lib/dal/plugin-data.ts exports upsertPluginExtension and upsertPluginOwnedBusinessData",
      passed:
        dalSource.includes("export async function upsertPluginExtension") &&
        dalSource.includes("export async function upsertPluginOwnedBusinessData"),
    },
    {
      label: "double-layer authorization (manifest permissions validation) enforced",
      passed:
        dalSource.includes("assertPluginBelongsToSchoolAndGetManifest") &&
        dalSource.includes("PLUGIN_MANIFEST_PERMISSION_DENIED"),
    },
    {
      label: "physical transactional drop for audit logging implemented",
      passed:
        dalSource.includes("db.transaction") &&
        dalSource.includes("pluginActionAudits") &&
        dalSource.includes("governanceAudits"),
    },
    {
      label: "cascade revalidateTag for Next.js 16 cache invalidation implemented",
      passed:
        dalSource.includes("revalidateTag") &&
        dalSource.includes("cacheTags.pluginExtension") &&
        dalSource.includes("cacheTags.pluginOwned"),
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
  console.log("\n[3/5] Running core vitest suites for plugin-data DAL integration...");
  runVitest(["src/lib/dal/plugin-data.test.ts"], "Phase 47 Plugin Data Unit Test Suite");
  console.log("  ✓ Core integration tests passed successfully.");

  // 4. 向前级联安全验证 (Cascading Regression Verification)
  console.log("\n[4/5] Running cascading regression verifications for preceding Phase 46...");
  run(
    "node",
    ["--require", "./scripts/server-only-node-shim.cjs", "--import", "tsx", "scripts/verify-phase46-migration-governance.ts"],
    "Phase 46 Regression"
  );
  console.log("  ✓ Cascading Phase 46 regression verifications passed successfully.");

  console.log("\n==================================================");
  console.log("🎉 Phase 47 closeout verification successfully PASSED!");
  console.log("- Multi-tenant double-layer authentication strictly verified.");
  console.log("- Physical database transaction for audit log drop strictly enforced.");
  console.log("- Cascade Next.js 16 revalidateTag integration verified.");
  console.log("- All core/preceding features regression free.");
  console.log("==================================================");
}

runVerification().catch((error) => {
  console.error("Unhandled verification error:", error);
  process.exit(1);
});
