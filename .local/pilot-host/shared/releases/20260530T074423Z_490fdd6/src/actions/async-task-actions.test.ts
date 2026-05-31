import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const actionSource = readFileSync("src/actions/async-task-actions.ts", "utf8");

describe("async task server actions", () => {
  it("delegates into the canonical async-task seam after parsing and auth", () => {
    expect(actionSource).toContain("AsyncTaskBootstrapInputSchema.safeParse");
    expect(actionSource).toContain("assertActiveTeacher()");
    expect(actionSource).toContain("enqueueAsyncTask({");
    expect(actionSource).toContain('taskType: "platform.healthcheck"');
  });

  it("does not import db or queue clients directly", () => {
    expect(actionSource).not.toContain("@/db");
    expect(actionSource).not.toContain("bullmq");
    expect(actionSource).not.toContain("Queue.add(");
  });

  it("returns action-shaped results with honest intermediate task status", () => {
    expect(actionSource).toContain("return { ok: true, data: task };");
    expect(actionSource).toContain('error: "ACTION_FAILED"');
    expect(actionSource).toContain("dispatchRequested: false");
  });
});
