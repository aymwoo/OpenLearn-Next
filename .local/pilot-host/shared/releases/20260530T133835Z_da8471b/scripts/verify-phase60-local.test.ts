import { describe, expect, it, vi } from "vitest";

import { appendProofServerStdout, waitForServerReady } from "./verify-phase60-local";

describe("verify-phase60 local proof startup", () => {
  it("detects the ready message even when stdout arrives in split chunks", () => {
    const readyMessage = "> Ready on http://127.0.0.1:3060";

    const firstChunk = appendProofServerStdout("", "> Ready on http://127.0.0.1:", readyMessage);
    expect(firstChunk.ready).toBe(false);

    const secondChunk = appendProofServerStdout(firstChunk.stdoutBuffer, "3060\n", readyMessage);
    expect(secondChunk.ready).toBe(true);
    expect(secondChunk.stdoutBuffer).toContain(readyMessage);
  });

  it("accepts a healthy proof server even when stdout readiness was missed", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    const child = { exitCode: null } as unknown as import("node:child_process").ChildProcess;
    const originalFetch = globalThis.fetch;

    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        waitForServerReady(child, "http://127.0.0.1:3060", () => false, 20),
      ).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
      vi.unstubAllGlobals();
    }

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3060/api/health", {
      cache: "no-store",
    });
  });
});
