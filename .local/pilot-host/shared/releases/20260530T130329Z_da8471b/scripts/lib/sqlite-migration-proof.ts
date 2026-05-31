import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";

type MigrationJournal = {
  entries: Array<{
    idx: number;
    tag: string;
  }>;
};

function readMigrationJournal(rootDir: string) {
  const journalPath = path.join(rootDir, "drizzle/meta/_journal.json");
  return JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournal;
}

function splitMigrationStatements(migrationSql: string) {
  return migrationSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function materializeDrizzleMigrations(
  databaseUrl: string,
  options?: {
    rootDir?: string;
    throughTag?: string;
  },
) {
  const rootDir = options?.rootDir ?? process.cwd();
  const client = createClient({ url: databaseUrl });
  const entries = readMigrationJournal(rootDir).entries
    .slice()
    .sort((left, right) => left.idx - right.idx);

  await client.execute("PRAGMA foreign_keys = ON");

  for (const entry of entries) {
    const migrationPath = path.join(rootDir, "drizzle", `${entry.tag}.sql`);
    const migrationSql = readFileSync(migrationPath, "utf8");

    for (const statement of splitMigrationStatements(migrationSql)) {
      await client.execute(statement);
    }

    if (options?.throughTag && entry.tag === options.throughTag) {
      return client;
    }
  }

  if (options?.throughTag) {
    throw new Error(`Migration tag not found in drizzle journal: ${options.throughTag}`);
  }

  return client;
}

export function cleanupSqliteArtifacts(databasePath: string) {
  for (const filePath of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}
