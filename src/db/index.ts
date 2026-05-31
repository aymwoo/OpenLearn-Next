import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const dbUrl = process.env.DB_FILE_NAME || "file:local.db";

const client = createClient({
  url: dbUrl,
});

let localSqliteConcurrencyPragmasPromise: Promise<void> | null = null;

function isLocalSqliteUrl(url: string) {
  return url.startsWith("file:");
}

export function ensureLocalSqliteConcurrencyPragmas() {
  if (!isLocalSqliteUrl(dbUrl)) {
    return Promise.resolve();
  }

  if (!localSqliteConcurrencyPragmasPromise) {
    localSqliteConcurrencyPragmasPromise = (async () => {
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("PRAGMA busy_timeout = 5000");
      await client.execute("PRAGMA synchronous = NORMAL");
    })().catch((error) => {
      localSqliteConcurrencyPragmasPromise = null;
      throw error;
    });
  }

  return localSqliteConcurrencyPragmasPromise;
}

export const db = drizzle(client, { schema });
