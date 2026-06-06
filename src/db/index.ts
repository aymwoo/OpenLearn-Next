import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const dbUrl = process.env.DB_FILE_NAME || "file:local.db";
const SQLITE_BUSY_RETRY_DELAYS_MS = [50, 100, 200, 400] as const;

const client = createClient({
  url: dbUrl,
});
const rawExecute = client.execute.bind(client);

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
      await rawExecute("PRAGMA journal_mode = WAL");
      await rawExecute("PRAGMA busy_timeout = 5000");
      await rawExecute("PRAGMA synchronous = NORMAL");
    })().catch((error) => {
      localSqliteConcurrencyPragmasPromise = null;
      throw error;
    });
  }

  return localSqliteConcurrencyPragmasPromise;
}

function collectSqliteErrorParts(error: unknown) {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);

    if (typeof current === "string") {
      parts.push(current);
      break;
    }

    if (current instanceof Error) {
      if (current.message) {
        parts.push(current.message);
      }
      const code = (current as Error & { code?: unknown }).code;
      if (typeof code === "string") {
        parts.push(code);
      }
      current = (current as Error & { cause?: unknown }).cause;
      continue;
    }

    if (typeof current === "object") {
      const candidate = current as { message?: unknown; code?: unknown; cause?: unknown };
      if (typeof candidate.message === "string") {
        parts.push(candidate.message);
      }
      if (typeof candidate.code === "string") {
        parts.push(candidate.code);
      }
      current = candidate.cause;
      continue;
    }

    break;
  }

  return parts;
}

function isSqliteBusyError(error: unknown) {
  return collectSqliteErrorParts(error).some((part) =>
    part.includes("SQLITE_BUSY") || part.includes("database is locked")
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function wrapLocalSqliteBusyRetry<TArgs extends unknown[], TResult>(
  operation: (...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs): Promise<TResult> => {
    if (!isLocalSqliteUrl(dbUrl)) {
      return operation(...args);
    }

    await ensureLocalSqliteConcurrencyPragmas();

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation(...args);
      } catch (error) {
        if (!isSqliteBusyError(error) || attempt >= SQLITE_BUSY_RETRY_DELAYS_MS.length) {
          throw error;
        }

        await wait(SQLITE_BUSY_RETRY_DELAYS_MS[attempt]);
      }
    }
  };
}

client.execute = wrapLocalSqliteBusyRetry(rawExecute) as typeof client.execute;

export const db = drizzle(client, { schema });

void ensureLocalSqliteConcurrencyPragmas().catch((error) => {
  console.warn("[db] failed to apply local sqlite concurrency pragmas", error);
});
