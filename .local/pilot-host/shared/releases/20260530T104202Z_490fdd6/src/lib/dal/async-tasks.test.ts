import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const schemaSource = readFileSync("src/db/schema.ts", "utf8");
const cacheSource = readFileSync("src/lib/cache-policy.ts", "utf8");
const dalSource = readFileSync("src/lib/dal/async-tasks.ts", "utf8");
const mapperSource = readFileSync("src/features/async-tasks/server/mapper.ts", "utf8");
const statusSource = readFileSync("src/features/async-tasks/server/status.ts", "utf8");

describe("async task DAL", () => {
  it("adds durable task and append-only event tables to the schema", () => {
    expect(schemaSource).toContain("export const asyncTasks = sqliteTable(");
    expect(schemaSource).toContain("export const asyncTaskEvents = sqliteTable(");
    expect(schemaSource).toContain("enqueueIntentStatus");
    expect(schemaSource).toContain("latestProgressJson");
    expect(schemaSource).toContain("latestResultJson");
    expect(schemaSource).toContain("latestAttemptNumber");
    expect(schemaSource).toContain("latestFailureReason");
    expect(schemaSource).toContain("latestRecoveryJson");
    expect(schemaSource).toContain("attemptNumber");
    expect(schemaSource).toContain("asyncTaskEvents_task_created_idx");
    expect(schemaSource).toContain("asyncTaskEvents_task_attempt_idx");
  });

  it("exposes dedicated async task cache tags for detail, actor list, and entity list", () => {
    expect(cacheSource).toContain("asyncTask: (taskId: string)");
    expect(cacheSource).toContain("asyncTaskList: (actorId: string)");
    expect(cacheSource).toContain("asyncTaskEntity: (entityType: string, entityId: string)");
  });

  it("keeps read models cached, scoped, and DTO-validated", () => {
    expect(dalSource).toContain('"use cache"');
    expect(dalSource).toContain("eq(asyncTasks.actorId, input.actorId)");
    expect(dalSource).toContain("eq(asyncTasks.entityType, input.entityType)");
    expect(dalSource).toContain("eq(asyncTasks.entityId, input.entityId)");
    expect(dalSource).toContain("AsyncTaskListItemDTOSchema.parse");
    expect(dalSource).toContain("AsyncTaskDetailDTOSchema.parse");
    expect(dalSource).not.toContain("bullmq");
  });

  it("maps durable failure, attempt, and recovery posture into detail DTOs", () => {
    expect(mapperSource).toContain("queueJobId");
    expect(mapperSource).toContain("latestAttemptNumber");
    expect(mapperSource).toContain("resolveFailureContext");
    expect(mapperSource).toContain("resolveRecoveryPosture");
    expect(mapperSource).toContain("resolveAttemptHistory");
  });

  it("maps honest enqueue posture and deterministic event timeline ordering", () => {
    expect(statusSource).toContain("dispatch_failed");
    expect(statusSource).toContain("dispatching");
    expect(mapperSource).toContain("resolveAsyncTaskDisplayStatus");
    expect(mapperSource).toContain(
      ".sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))",
    );
  });
});
