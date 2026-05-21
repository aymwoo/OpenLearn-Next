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

// 核心系统表白名单
const CORE_SYSTEM_TABLES = new Set([
  "user",
  "account",
  "session",
  "verificationToken",
  "school",
  "membership",
  "systemTransportSetting",
  "class",
  "classMember",
  "course",
  "courseClass",
  "courseEnrollment",
  "courseImportBatch",
  "courseImportRow",
  "asyncTask",
  "asyncTaskEvent",
  "asyncWorkerHeartbeat",
  "lesson",
  "lessonStep",
  "lessonMaterial",
  "publishedLessonVersion",
  "lessonStepProgress",
  "taskSubmission",
  "quizAttempt",
  "attemptFeedback",
  "classroomSession",
  "classroomParticipant",
  "classroomEvent",
  "classroomEvidence",
  "classroomTimeline",
  "classroomSessionSummary",
  "runtimeStepSession",
  "runtimeStepState",
  "runtimeEventOutbox",
  "transportDeliveryAttempt",
  "transportConsumerTrace",
  "resource",
  "knowledgeSource",
  "knowledgeChunk",
  "agentRegistry",
  "agentProposal",
  "agentAuditLog",
  "mcpServer",
  "mcpCredentialRef",
  "mcpCapability",
  "mcpAuditLog",
  "pluginRegistration",
  "pluginLifecycleTransition",
  "pluginHookRun",
  "pluginActionAudit",
  "runtimeLifecycleTransition",
  "governanceAudit",
  "themeTokenRegistry",
  "themeAuditLog",
  "scheduleImportBatch",
  "scheduleImportRow",
  "scheduleTerm",
  "scheduleTermDay",
  "scheduleClassPeriod",
  "scheduleClassPeriodDay",
  "scheduleCourseClassPeriod",
  "scheduleAssistantProposal",
  "scheduleAssistantInteraction",
  "scheduleReminder",
  "scheduleReminderAudit",
  "scheduleWeekPattern",
  "scheduleBellSlot",
  "scheduleTeachingAssignment",
  "scheduleRecurringEntry",
  "scheduleOverride",
  "scheduleHolidayCalendar",
  "scheduleHolidayDate",
  "scheduleReminderRule",
  "scheduleReminderDispatch",
  "scheduleMutationAudit",
]);

async function runVerification() {
  console.log("==================================================");
  console.log("Starting Phase 46 Close Gate Verification...");
  console.log("==================================================");

  // 1. 运行时数据库物理表与列结构校验 (Physical DB Schema Verification)
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

    console.log("  ✓ All 4 physical extension and business tables are healthy in local.db.");
  } catch (dbError: any) {
    console.error("Physical database check failed:", dbError.message);
    process.exit(1);
  } finally {
    client.close();
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
  const nonCompliantTables: string[] = [];
  for (const tName of foundTables) {
    if (!CORE_SYSTEM_TABLES.has(tName)) {
      if (!tName.startsWith("plugin_ext_") && !tName.startsWith("plugin_owned_")) {
        nonCompliantTables.push(tName);
      }
    }
  }

  if (nonCompliantTables.length > 0) {
    console.error("  ❌ Naming Governance Violation: The following custom tables do not have 'plugin_ext_' or 'plugin_owned_' prefix:");
    for (const t of nonCompliantTables) {
      console.error(`     - ${t}`);
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

  const nonCompliantIndexes: string[] = [];
  // 系统核心表使用的索引白名单（或不包含 plugin 的前缀）
  for (const idxName of foundIndexes) {
    if (idxName.toLowerCase().includes("plugin")) {
      // 如果属于 plugin-ext 或 plugin-owned，应该有 correct prefix
      if (
        !idxName.startsWith("plugin_ext_") &&
        !idxName.startsWith("plugin_owned_") &&
        // 白名单：核心表的旧索引
        !CORE_SYSTEM_TABLES.has(idxName.split("_")[0]) &&
        idxName !== "pluginActionAudit_plugin_created_idx" &&
        idxName !== "pluginActionAudit_decision_created_idx"
      ) {
        nonCompliantIndexes.push(idxName);
      }
    }
  }

  if (nonCompliantIndexes.length > 0) {
    console.error("  ❌ Naming Governance Violation: The following plugin indices do not have 'plugin_ext_' or 'plugin_owned_' prefix:");
    for (const idx of nonCompliantIndexes) {
      console.error(`     - ${idx}`);
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
