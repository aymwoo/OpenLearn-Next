import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";

import { db } from "@/db";

const MIGRATIONS_FOLDER = "drizzle";
const MIGRATION_TABLE = "__drizzle_migrations";
const DEV_SENTINEL_TABLE = "user";

type MigrationJournal = {
  entries: Array<{
    idx: number;
    tag: string;
    when: number;
  }>;
};

async function tableExists(tableName: string) {
  const result = await db.values(
    sql`select name from sqlite_master where type = 'table' and name = ${tableName} limit 1`,
  );

  return result.length > 0;
}

function readMigrationJournal() {
  return JSON.parse(
    readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
  ) as MigrationJournal;
}

function readMigrationByTag(tag: string) {
  const journal = readMigrationJournal();
  const entry = journal.entries.find((candidate) => candidate.tag === tag);

  if (!entry) {
    throw new Error(`未找到 migration 元数据：${tag}`);
  }

  const migrationSql = readFileSync(`${MIGRATIONS_FOLDER}/${entry.tag}.sql`, "utf8");

  return {
    hash: crypto.createHash("sha256").update(migrationSql).digest("hex"),
    createdAt: entry.when,
    tag: entry.tag,
  };
}

async function columnExists(tableName: string, columnName: string) {
  const result = await db.values(sql.raw(`PRAGMA table_info("${tableName}")`));

  return result.some((row) => String(row[1] ?? "") === columnName);
}

async function detectExistingSchemaTag() {
  const hasAsyncTaskSchema =
    await tableExists("asyncTask")
    && await tableExists("asyncTaskEvent")
    && await columnExists("asyncTask", "enqueueIntentStatus")
    && await columnExists("asyncTask", "latestProgressJson")
    && await columnExists("asyncTask", "latestResultJson");

  const hasPhase40RuntimeProjectionSchema =
    hasAsyncTaskSchema
    && await columnExists("asyncTask", "latestAttemptNumber")
    && await columnExists("asyncTask", "latestFailureReason")
    && await columnExists("asyncTask", "latestRecoveryJson")
    && await columnExists("asyncTaskEvent", "attemptNumber");

  const hasPhase42OperatorSchema =
    hasPhase40RuntimeProjectionSchema
    && await tableExists("asyncWorkerHeartbeat")
    && await columnExists("asyncWorkerHeartbeat", "instanceId")
    && await columnExists("asyncWorkerHeartbeat", "queueNamesJson")
    && await columnExists("asyncWorkerHeartbeat", "lastSeenAt");

  const hasPhase43ReminderDispatchClaimSchema =
    hasPhase42OperatorSchema
    && await columnExists("scheduleReminderDispatch", "actorId")
    && await columnExists("scheduleReminderDispatch", "deliveryTaskId")
    && await columnExists("scheduleReminderDispatch", "dispatchClaimedAt")
    && await columnExists("scheduleReminderDispatch", "dispatchClaimedBy");

  if (hasPhase43ReminderDispatchClaimSchema) {
    return "0007_phase43_scheduled_reminder_dispatch_claim";
  }

  if (hasPhase42OperatorSchema) {
    return "0006_phase42_async_operator";
  }

  if (hasPhase40RuntimeProjectionSchema) {
    return "0005_phase40_async_task_runtime_projection";
  }

  if (hasAsyncTaskSchema) {
    return "0004_phase39_async_tasks";
  }

  const hasRedisFanoutSchema =
    await tableExists("systemTransportSetting")
    && await columnExists("classroomSession", "transportModeSnapshot");

  if (hasRedisFanoutSchema) {
    return "0003_phase37_redis_fanout";
  }

  const hasTransportSchema =
    await tableExists("transportDeliveryAttempt")
    && await tableExists("transportConsumerTrace")
    && await tableExists("governanceAudit")
    && await tableExists("pluginLifecycleTransition")
    && await columnExists("pluginRegistration", "lifecycleState");

  if (hasTransportSchema) {
    return "0002_runtime-governance-transport";
  }

  const hasRuntimeSessionSchema =
    await tableExists("runtimeStepSession")
    && await tableExists("runtimeStepState")
    && await tableExists("runtimeEventOutbox");

  if (hasRuntimeSessionSchema) {
    return "0001_curved_overlord";
  }

  const hasBaselineSchema = await tableExists(DEV_SENTINEL_TABLE);
  return hasBaselineSchema ? "0000_phase15-course-import" : null;
}

async function readRecordedMigrationTag() {
  const hasMigrationTable = await tableExists(MIGRATION_TABLE);

  if (!hasMigrationTable) {
    return null;
  }

  const rows = await db.values(sql.raw(`SELECT created_at FROM ${MIGRATION_TABLE} ORDER BY created_at DESC LIMIT 1`));
  const createdAt = Number(rows[0]?.[0] ?? NaN);

  if (!Number.isFinite(createdAt)) {
    return null;
  }

  const journal = readMigrationJournal();
  return journal.entries.find((entry) => entry.when === createdAt)?.tag ?? null;
}

async function createMigrationTableIfNeeded() {
  const hasMigrationTable = await tableExists(MIGRATION_TABLE);

  if (!hasMigrationTable) {
    await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`));
  }
}

async function syncMigrationMetadataToTag(tag: string | null) {
  await createMigrationTableIfNeeded();
  await db.run(sql.raw(`DELETE FROM ${MIGRATION_TABLE}`));

  if (!tag) {
    return;
  }

  const migration = readMigrationByTag(tag);
  await db.run(
    sql`insert into ${sql.identifier(MIGRATION_TABLE)} (hash, created_at) values (${migration.hash}, ${migration.createdAt})`,
  );
}

async function bridgeExistingSchemaIfNeeded() {
  const schemaTag = await detectExistingSchemaTag();

  if (!schemaTag) {
    return false;
  }

  const recordedTag = await readRecordedMigrationTag();

  if (recordedTag === schemaTag) {
    return false;
  }

  await syncMigrationMetadataToTag(schemaTag);

  if (recordedTag) {
    console.log(
      `检测到开发库 migration 元数据与实际 schema 不一致，已从 ${recordedTag} 修正到 ${schemaTag}。`,
    );
    return true;
  }

  console.log(`检测到已有开发库但缺少 migration 元数据，已桥接到 ${schemaTag}。`);

  return true;
}

export async function prepareDevDb() {
  await bridgeExistingSchemaIfNeeded();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

async function main() {
  await prepareDevDb();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("开发数据库 migration 准备失败：", error);
    process.exit(1);
  });
}
