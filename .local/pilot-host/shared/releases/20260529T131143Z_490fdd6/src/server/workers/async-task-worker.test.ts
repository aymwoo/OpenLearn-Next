import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const workerEntrySource = readFileSync("src/server/workers/async-task-worker.ts", "utf8");
const serverSource = readFileSync("server.ts", "utf8");

describe("async task worker entry", () => {
  it("boots the worker runtime through the dedicated bootstrap seam", () => {
    expect(workerEntrySource).toContain('startAsyncTaskWorker');
    expect(workerEntrySource).not.toContain('createServer(');
    expect(workerEntrySource).not.toContain('next(');
  });

  it("keeps the web server entry free from worker bootstrap imports", () => {
    expect(serverSource).not.toContain('async-task-worker');
    expect(serverSource).not.toContain('startAsyncTaskWorker');
  });
});
