import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const drizzleMock = vi.fn();
const createClientMock = vi.fn(() => ({
  execute: executeMock,
}));

vi.mock("@libsql/client", () => ({
  createClient: createClientMock,
}));

vi.mock("drizzle-orm/libsql", () => ({
  drizzle: drizzleMock,
}));

describe("db sqlite concurrency bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DB_FILE_NAME;
    executeMock.mockResolvedValue({});
    drizzleMock.mockReturnValue({ kind: "db" });
  });

  it("applies local sqlite pragmas eagerly and preserves the singleton db export", async () => {
    process.env.DB_FILE_NAME = "file:local.db";

    const dbModule = await import("./index");

    await dbModule.ensureLocalSqliteConcurrencyPragmas();
    await dbModule.ensureLocalSqliteConcurrencyPragmas();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(drizzleMock).toHaveBeenCalledTimes(1);
    expect(dbModule.db).toEqual({ kind: "db" });
    expect(executeMock.mock.calls.map(([sql]) => sql)).toEqual([
      "PRAGMA journal_mode = WAL",
      "PRAGMA busy_timeout = 5000",
      "PRAGMA synchronous = NORMAL",
    ]);
  });

  it("reuses one bootstrap promise for concurrent callers", async () => {
    process.env.DB_FILE_NAME = "file:local.db";

    let releaseFirstPragma: ((value?: unknown) => void) | undefined;
    executeMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFirstPragma = resolve;
          }),
      )
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const dbModule = await import("./index");
    const first = dbModule.ensureLocalSqliteConcurrencyPragmas();
    const second = dbModule.ensureLocalSqliteConcurrencyPragmas();

    expect(executeMock).toHaveBeenCalledTimes(1);

    if (!releaseFirstPragma) {
      throw new Error("Expected first PRAGMA call to block");
    }

    releaseFirstPragma();
    await Promise.all([first, second]);

    expect(executeMock).toHaveBeenCalledTimes(3);
  });

  it("skips local-only pragmas for non-file urls", async () => {
    process.env.DB_FILE_NAME = "libsql://pilot-host-db";

    const dbModule = await import("./index");

    await dbModule.ensureLocalSqliteConcurrencyPragmas();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("retries sqlite busy execute calls for local file databases", async () => {
    process.env.DB_FILE_NAME = "file:local.db";

    const busyError = new Error("SQLITE_BUSY: database is locked");
    Object.assign(busyError, { code: "SQLITE_BUSY" });

    executeMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(busyError)
      .mockResolvedValueOnce({ rows: [] });

    await import("./index");
    const client = createClientMock.mock.results[0]?.value as { execute: (sql: string) => Promise<unknown> };

    await expect(client.execute("select 1")).resolves.toEqual({ rows: [] });
    expect(executeMock.mock.calls.map(([sql]) => sql)).toEqual([
      "PRAGMA journal_mode = WAL",
      "PRAGMA busy_timeout = 5000",
      "PRAGMA synchronous = NORMAL",
      "select 1",
      "select 1",
    ]);
  });
});
