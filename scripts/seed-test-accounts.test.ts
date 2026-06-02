import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const existsSync = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => existsSync(...args),
}));

describe("resolveSeedDatabaseUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers an explicit DB_FILE_NAME", async () => {
    const { resolveSeedDatabaseUrl } = await import("./seed-test-accounts");

    expect(
      resolveSeedDatabaseUrl({
        DB_FILE_NAME: "file:/tmp/custom.db",
        OPENLEARN_SHARED_ROOT: "/tmp/shared",
      })
    ).toBe("file:/tmp/custom.db");
  });

  it("derives the shared pilot-host db from OPENLEARN_SHARED_ROOT", async () => {
    const { resolveSeedDatabaseUrl } = await import("./seed-test-accounts");

    expect(
      resolveSeedDatabaseUrl({
        OPENLEARN_SHARED_ROOT: "/var/lib/openlearn/shared",
      })
    ).toBe("file:/var/lib/openlearn/shared/data/local.db");
  });

  it("falls back to the pilot-host shared db when the workspace markers exist", async () => {
    existsSync.mockImplementation((candidate: string) =>
      candidate === resolve(".local/pilot-host/current") ||
      candidate === resolve(".local/pilot-host/shared/data")
    );

    const { resolveSeedDatabaseUrl } = await import("./seed-test-accounts");

    expect(resolveSeedDatabaseUrl({})).toBe(
      `file:${resolve(".local/pilot-host/shared/data/local.db")}`
    );
  });

  it("falls back to the repo-local db when no pilot-host markers exist", async () => {
    existsSync.mockReturnValue(false);

    const { resolveSeedDatabaseUrl } = await import("./seed-test-accounts");

    expect(resolveSeedDatabaseUrl({})).toBe("file:local.db");
  });
});
