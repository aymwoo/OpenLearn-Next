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

async function indexExists(indexName: string) {
  const result = await db.values(
    sql`select name from sqlite_master where type = 'index' and name = ${indexName} limit 1`,
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

function readMigrationStatements(tag: string) {
  const journal = readMigrationJournal();
  const entry = journal.entries.find((candidate) => candidate.tag === tag);
  const fileTag = entry?.tag ?? tag;

  return readFileSync(`${MIGRATIONS_FOLDER}/${fileTag}.sql`, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function migrationTagExists(tag: string) {
  return readMigrationJournal().entries.some((entry) => entry.tag === tag);
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

  const hasPhase43ValidationWorkloadsSchema =
    hasPhase43ReminderDispatchClaimSchema
    && await tableExists("classroomSessionSummary")
    && await columnExists("classroomSessionSummary", "sessionId")
    && await columnExists("classroomSessionSummary", "lastEventVersion")
    && await columnExists("classroomSessionSummary", "summaryJson")
    && await columnExists("classroomSessionSummary", "status")
    && await columnExists("classroomSessionSummary", "finalizedAt");

  const hasPhase43KnowledgeSourceUniquenessSchema =
    hasPhase43ValidationWorkloadsSchema
    && await indexExists("knowledgeSources_resourceId_unique");

  const hasPhase43KnowledgeChunkUniquenessSchema =
    hasPhase43KnowledgeSourceUniquenessSchema
    && await indexExists("knowledgeChunks_source_chunk_unique");

  const hasPhase44PluginIdentityNamespaceSchema =
    hasPhase43KnowledgeChunkUniquenessSchema
    && await columnExists("pluginRegistration", "pluginKey")
    && await columnExists("pluginRegistration", "dbNamespace")
    && await columnExists("pluginRegistration", "sourceType")
    && await columnExists("pluginRegistration", "installSource")
    && await indexExists("pluginRegistration_school_pluginKey_unique")
    && await indexExists("pluginRegistration_school_dbNamespace_unique");

  const hasPhase51CommandBusFoundationSchema =
    hasPhase44PluginIdentityNamespaceSchema
    && await tableExists("platformCommand")
    && await tableExists("platformCommandAttempt")
    && await columnExists("platformCommand", "dedupeKey")
    && await columnExists("platformCommand", "latestAttemptNumber")
    && await columnExists("platformCommandAttempt", "attemptNumber")
    && await columnExists("pluginActionAudit", "commandId")
    && await columnExists("governanceAudit", "commandId")
    && await indexExists("platformCommands_dedupeKey_unique")
    && await indexExists("platformCommandAttempts_command_attempt_unique");

  const hasPhase53PlatformEventFoundationSchema =
    hasPhase51CommandBusFoundationSchema
    && await tableExists("platformEvent")
    && await tableExists("platformEventDispatch")
    && await columnExists("platformCommand", "invalidationTagsJson")
    && await columnExists("platformCommand", "failureAttributionJson")
    && await indexExists("platformEvents_command_attempt_ordinal_unique")
    && await indexExists("platformEventDispatches_event_channel_unique");

  const hasDaffyXavinSchema =
    hasPhase53PlatformEventFoundationSchema
    && await indexExists("plugin_owned_biz_school_plugin_key_unique");

  const hasPhase63DraftLessonVersionsSchema =
    hasDaffyXavinSchema
    && await tableExists("draftLessonVersion")
    && await columnExists("draftLessonVersion", "lessonId")
    && await columnExists("draftLessonVersion", "version")
    && await columnExists("draftLessonVersion", "snapshotJson")
    && await columnExists("draftLessonVersion", "sourceCommandId")
    && await indexExists("draftLessonVersions_lessonId_version_idx")
    && await indexExists("draftLessonVersions_idempotency_unique");

  const hasPhase64DraftReviewLifecycleSchema =
    hasPhase63DraftLessonVersionsSchema
    && await columnExists("draftLessonVersion", "status")
    && await columnExists("draftLessonVersion", "archivedAt")
    && await columnExists("lesson", "aiDraftAppliedAt")
    && await columnExists("lesson", "latestDraftVersionId");

  const hasLeanSageSchema =
    hasPhase64DraftReviewLifecycleSchema
    && await tableExists("plugin_owned_quiz_questions")
    && await tableExists("plugin_owned_quiz_responses")
    && await columnExists("pluginRegistration", "dataVersion");

  const hasWorriedWallowSchema =
    hasLeanSageSchema
    && await columnExists("plugin_owned_quiz_responses", "attemptNo")
    && await columnExists("plugin_owned_quiz_responses", "isLatest")
    && await indexExists("plugin_owned_quiz_responses_classroomSession_student_question_attemptNo_unique")
    && await indexExists("plugin_owned_quiz_responses_classroomSession_student_question_isLatest_idx");

  const hasHardEchoSchema =
    hasWorriedWallowSchema
    && await columnExists("plugin_owned_quiz_questions", "optionAText")
    && await columnExists("plugin_owned_quiz_questions", "optionBText");

  if (hasHardEchoSchema && migrationTagExists("0007_hard_echo")) {
    return "0007_hard_echo";
  }

  if (hasWorriedWallowSchema && migrationTagExists("0006_worried_wallow")) {
    return "0006_worried_wallow";
  }

  if (hasLeanSageSchema && migrationTagExists("0005_lean_sage")) {
    return "0005_lean_sage";
  }

  if (hasPhase64DraftReviewLifecycleSchema && migrationTagExists("0015_phase64_draft_review_lifecycle")) {
    return "0015_phase64_draft_review_lifecycle";
  }

  if (hasPhase63DraftLessonVersionsSchema && migrationTagExists("0014_phase63_draft_lesson_versions")) {
    return "0014_phase63_draft_lesson_versions";
  }

  if (hasDaffyXavinSchema && migrationTagExists("0002_daffy_xavin")) {
    return "0002_daffy_xavin";
  }

  if (hasPhase53PlatformEventFoundationSchema && migrationTagExists("0012_phase53_platform_event_foundation")) {
    return "0012_phase53_platform_event_foundation";
  }

  if (hasPhase51CommandBusFoundationSchema && migrationTagExists("0000_windy_metal_master")) {
    return "0000_windy_metal_master";
  }

  if (hasPhase51CommandBusFoundationSchema) {
    return migrationTagExists("0013_phase51_command_bus_foundation")
      ? "0013_phase51_command_bus_foundation"
      : null;
  }

  if (hasPhase44PluginIdentityNamespaceSchema) {
    return migrationTagExists("0011_phase44_plugin_identity_namespace")
      ? "0011_phase44_plugin_identity_namespace"
      : null;
  }

  if (hasPhase43KnowledgeChunkUniquenessSchema) {
    return migrationTagExists("0010_wandering_angel") ? "0010_wandering_angel" : null;
  }

  if (hasPhase43KnowledgeSourceUniquenessSchema) {
    return migrationTagExists("0009_phase43_knowledge_source_uniqueness")
      ? "0009_phase43_knowledge_source_uniqueness"
      : null;
  }

  if (hasPhase43ValidationWorkloadsSchema) {
    return migrationTagExists("0008_phase43_validation_workloads")
      ? "0008_phase43_validation_workloads"
      : null;
  }

  if (hasPhase43ReminderDispatchClaimSchema) {
    return migrationTagExists("0007_phase43_scheduled_reminder_dispatch_claim")
      ? "0007_phase43_scheduled_reminder_dispatch_claim"
      : null;
  }

  if (hasPhase42OperatorSchema) {
    return migrationTagExists("0006_phase42_async_operator") ? "0006_phase42_async_operator" : null;
  }

  if (hasPhase40RuntimeProjectionSchema) {
    return migrationTagExists("0005_phase40_async_task_runtime_projection")
      ? "0005_phase40_async_task_runtime_projection"
      : null;
  }

  if (hasAsyncTaskSchema) {
    return migrationTagExists("0004_phase39_async_tasks") ? "0004_phase39_async_tasks" : null;
  }

  const hasRedisFanoutSchema =
    await tableExists("systemTransportSetting")
    && await columnExists("classroomSession", "transportModeSnapshot");

  if (hasRedisFanoutSchema) {
    return migrationTagExists("0003_phase37_redis_fanout") ? "0003_phase37_redis_fanout" : null;
  }

  const hasTransportSchema =
    await tableExists("transportDeliveryAttempt")
    && await tableExists("transportConsumerTrace")
    && await tableExists("governanceAudit")
    && await tableExists("pluginLifecycleTransition")
    && await columnExists("pluginRegistration", "lifecycleState");

  if (hasTransportSchema) {
    return migrationTagExists("0002_runtime-governance-transport")
      ? "0002_runtime-governance-transport"
      : null;
  }

  const hasRuntimeSessionSchema =
    await tableExists("runtimeStepSession")
    && await tableExists("runtimeStepState")
    && await tableExists("runtimeEventOutbox");

  if (hasRuntimeSessionSchema) {
    return migrationTagExists("0001_curved_overlord") ? "0001_curved_overlord" : null;
  }

  const hasBaselineSchema = await tableExists(DEV_SENTINEL_TABLE);
  return hasBaselineSchema && migrationTagExists("0000_phase15-course-import")
    ? "0000_phase15-course-import"
    : null;
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

async function applyJournalDroppedCatchUpsIfNeeded() {
  const catchUps = [
    {
      tag: "0013_phase54_audit_summary_truth",
      needsApply: async () => {
        const platformCommandReady = await columnExists("platformCommand", "auditSummaryJson");
        const platformEventReady = await columnExists("platformEvent", "auditSummaryJson");
        return !platformCommandReady || !platformEventReady;
      },
    },
  ] as const;

  for (const catchUp of catchUps) {
    if (!(await catchUp.needsApply())) {
      continue;
    }

    console.log(`检测到开发库缺少 ${catchUp.tag} 的补齐列，正在执行 catch-up。`);
    for (const statement of readMigrationStatements(catchUp.tag)) {
      await db.run(sql.raw(statement));
    }
  }
}

export async function prepareDevDb() {
  await bridgeExistingSchemaIfNeeded();
  await applyJournalDroppedCatchUpsIfNeeded();
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
