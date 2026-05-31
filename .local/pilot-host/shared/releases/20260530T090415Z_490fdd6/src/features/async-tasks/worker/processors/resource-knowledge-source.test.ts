import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

const { executeResourceKnowledgeSourceTask } = vi.hoisted(() => ({
  executeResourceKnowledgeSourceTask: vi.fn(),
}));

vi.mock("@/lib/dal/ai-rag", () => ({
  executeResourceKnowledgeSourceTask,
}));

import { processResourceKnowledgeSourceIngestJob } from "./resource-knowledge-source";

const processorSource = readFileSync(
  "src/features/async-tasks/worker/processors/resource-knowledge-source.ts",
  "utf8",
);

describe("resource knowledge source processor", () => {
  it("parses payload, records progress, and delegates to dal execution", async () => {
    executeResourceKnowledgeSourceTask.mockResolvedValueOnce({
      knowledgeSourceId: "source-1",
      resourceId: "resource-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      knowledgeSourceStatus: "completed",
      indexedChunkCount: 2,
      failedChunkCount: 0,
      outcome: "completed",
      titleKey: "asyncTasks.resource.knowledgeSourceIngest.result.completed",
      summaryKey: "asyncTasks.resource.knowledgeSourceIngest.result.completedSummary",
      counts: {
        total: 2,
        succeeded: 2,
        partiallySucceeded: 0,
        failed: 0,
        skipped: 0,
      },
      detail: {
        knowledgeSourceId: "source-1",
      },
    });

    const updateProgress = vi.fn(async () => undefined);

    const result = await processResourceKnowledgeSourceIngestJob({
      id: "job-resource-1",
      name: "resource.knowledge_source_ingest",
      data: {
        knowledgeSourceId: "source-1",
        resourceId: "resource-1",
        schoolId: "school-1",
        actorId: "teacher-1",
      },
      updateProgress,
    });

    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "running",
        messageKey: "asyncTasks.resource.knowledgeSourceIngest.progress.running",
        detail: expect.objectContaining({
          knowledgeSourceId: "source-1",
          resourceId: "resource-1",
        }),
      }),
    );
    expect(executeResourceKnowledgeSourceTask).toHaveBeenCalledWith({
      knowledgeSourceId: "source-1",
      resourceId: "resource-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });
    expect(result).toEqual(expect.objectContaining({ knowledgeSourceStatus: "completed" }));
  });

  it("keeps processor discipline on DAL-only execution", () => {
    expect(processorSource).toContain("executeResourceKnowledgeSourceTask(payload)");
    expect(processorSource).toContain("job.updateProgress(");
    expect(processorSource).not.toContain("@/db");
    expect(processorSource).not.toContain("taskId");
    expect(processorSource).not.toContain("queueJobId");
  });
});
