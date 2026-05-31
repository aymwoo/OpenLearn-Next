import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  getPhase60LocalSqliteBusyBlockerMessage,
  PHASE60_LOCAL_SQLITE_BUSY_BLOCKER,
  withSqliteBusyRetry,
} from "./phase60-fixtures";

describe("phase60 fixtures sqlite busy handling", () => {
  it("awaits sqlite bootstrap before live db work and keeps the named blocker token in source", () => {
    const source = readFileSync("scripts/load/phase60-fixtures.ts", "utf8");

    expect(source).toContain('import { db, ensureLocalSqliteConcurrencyPragmas } from "@/db";');
    expect(source).toContain("await ensureLocalSqliteConcurrencyPragmas();");
    expect(source).toContain(PHASE60_LOCAL_SQLITE_BUSY_BLOCKER);
  });

  it("retries SQLITE_BUSY failures until the operation succeeds", async () => {
    const operation = vi.fn(async () => {
      if (operation.mock.calls.length < 3) {
        throw new Error("SQLITE_BUSY: database is locked");
      }

      return "ok";
    });

    const result = await withSqliteBusyRetry("upsert user", operation, {
      sleep: async () => undefined,
    });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws an explicit blocker after the retry budget is exhausted", async () => {
    const operation = vi.fn(async () => {
      throw new Error("SQLITE_BUSY: database is locked");
    });

    await expect(
      withSqliteBusyRetry("upsert user", operation, {
        attempts: 2,
        dbFileName: "file:local.db",
        sleep: async () => undefined,
      }),
    ).rejects.toThrow(getPhase60LocalSqliteBusyBlockerMessage("file:local.db"));
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-busy database failures", async () => {
    const operation = vi.fn(async () => {
      throw new Error("SQLITE_CONSTRAINT: duplicate key");
    });

    await expect(
      withSqliteBusyRetry("upsert user", operation, {
        sleep: async () => undefined,
      }),
    ).rejects.toThrow("SQLITE_CONSTRAINT: duplicate key");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
