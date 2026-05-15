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

function readLatestMigration() {
  const journal = JSON.parse(
    readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
  ) as MigrationJournal;

  const latestEntry = journal.entries.at(-1);

  if (!latestEntry) {
    throw new Error("drizzle/meta/_journal.json 没有可用 migration 条目。");
  }

  const migrationSql = readFileSync(`${MIGRATIONS_FOLDER}/${latestEntry.tag}.sql`, "utf8");

  return {
    hash: crypto.createHash("sha256").update(migrationSql).digest("hex"),
    createdAt: latestEntry.when,
    tag: latestEntry.tag,
  };
}

async function bridgeExistingSchemaIfNeeded() {
  const hasMigrationTable = await tableExists(MIGRATION_TABLE);

  if (hasMigrationTable) {
    return false;
  }

  const hasExistingSchema = await tableExists(DEV_SENTINEL_TABLE);

  if (!hasExistingSchema) {
    return false;
  }

  const latestMigration = readLatestMigration();

  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`));
  await db.run(
    sql`insert into ${sql.identifier(MIGRATION_TABLE)} (hash, created_at) values (${latestMigration.hash}, ${latestMigration.createdAt})`,
  );

  console.log(
    `检测到已有开发库但缺少 migration 元数据，已桥接到 ${latestMigration.tag}。`,
  );

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
