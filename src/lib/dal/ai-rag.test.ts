import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstResources = vi.fn();
const findFirstKnowledgeSources = vi.fn();
const findManyKnowledgeChunks = vi.fn();
const insertValues = vi.fn();
const insertReturning = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();
const assertActiveTeacher = vi.fn();
const enqueueAsyncTask = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      resources: { findFirst: findFirstResources },
      knowledgeSources: { findFirst: findFirstKnowledgeSources, findMany: vi.fn() },
      knowledgeChunks: { findMany: findManyKnowledgeChunks },
      agentRegistry: { findMany: vi.fn() },
      agentProposals: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
  },
}));

vi.mock("./lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/features/async-tasks/server/enqueue", () => ({
  enqueueAsyncTask,
}));

describe("ai-rag dal", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    insertReturning.mockResolvedValue([]);
    insertValues.mockReturnValue({ returning: insertReturning });
    updateWhere.mockResolvedValue([]);
    updateSet.mockReturnValue({ where: updateWhere });

    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("only allows ragEligible resources and enqueues knowledge source tasks by knowledge source identity", async () => {
    const source = {
      id: "source-1",
      resourceId: "resource-1",
      status: "pending",
      error: null,
      createdAt: new Date("2026-05-20T02:00:00Z"),
      updatedAt: new Date("2026-05-20T02:00:00Z"),
    };
    findFirstResources.mockResolvedValue({
      id: "resource-1",
      schoolId: "school-1",
      title: "变量小抄",
      ragEligible: true,
      url: "https://example.com/resource",
      content: "第一段\n\n第二段",
    });
    insertReturning.mockResolvedValueOnce([source]);
    enqueueAsyncTask.mockResolvedValue({ id: "task-1", status: "queued" });

    const { registerKnowledgeSourceForResource } = await import("./ai-rag");
    const result = await registerKnowledgeSourceForResource({ resourceId: "resource-1" });

    expect(result).toMatchObject({ id: "source-1", status: "pending" });
    expect(enqueueAsyncTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: "resource.knowledge_source_ingest",
        entityRef: expect.objectContaining({
          entityType: "knowledge_source",
          entityId: "source-1",
        }),
        payload: expect.objectContaining({
          knowledgeSourceId: "source-1",
          resourceId: "resource-1",
          schoolId: "school-1",
          actorId: "teacher-1",
        }),
      }),
    );
  });

  it("blocks knowledge source registration when resource is not rag eligible", async () => {
    findFirstResources.mockResolvedValue({
      id: "resource-1",
      schoolId: "school-1",
      ragEligible: false,
    });

    const { registerKnowledgeSourceForResource } = await import("./ai-rag");

    await expect(registerKnowledgeSourceForResource({ resourceId: "resource-1" })).rejects.toThrow(
      "RESOURCE_NOT_RAG_ELIGIBLE",
    );
    expect(enqueueAsyncTask).not.toHaveBeenCalled();
  });

  it("progresses knowledge source and chunk business status through processing to completed", async () => {
    findFirstKnowledgeSources.mockResolvedValue({
      id: "source-1",
      resourceId: "resource-1",
      status: "pending",
      error: null,
    });
    findFirstResources.mockResolvedValue({
      id: "resource-1",
      schoolId: "school-1",
      title: "变量小抄",
      ragEligible: true,
      url: null,
      content: "这是一个足够长的资源内容，用于切分 knowledge chunks。".repeat(20),
    });
    findManyKnowledgeChunks.mockResolvedValue([]);
    insertReturning.mockResolvedValue([]);

    const { executeResourceKnowledgeSourceTask } = await import("./ai-rag");
    const result = await executeResourceKnowledgeSourceTask({
      knowledgeSourceId: "source-1",
      resourceId: "resource-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(result).toMatchObject({
      knowledgeSourceStatus: "completed",
      indexedChunkCount: expect.any(Number),
      failedChunkCount: 0,
      outcome: "completed",
    });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "processing" }));
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "source-1",
        indexingStatus: "indexed",
      }),
    );
  });

  it("marks knowledge source failed when source text cannot be built", async () => {
    findFirstKnowledgeSources.mockResolvedValue({
      id: "source-2",
      resourceId: "resource-2",
      status: "pending",
      error: null,
    });
    findFirstResources.mockResolvedValue({
      id: "resource-2",
      schoolId: "school-1",
      title: "空白资源",
      ragEligible: true,
      url: null,
      content: null,
    });
    findManyKnowledgeChunks.mockResolvedValue([]);

    const { executeResourceKnowledgeSourceTask } = await import("./ai-rag");
    const result = await executeResourceKnowledgeSourceTask({
      knowledgeSourceId: "source-2",
      resourceId: "resource-2",
      schoolId: "school-1",
      actorId: "teacher-1",
    });

    expect(result).toMatchObject({
      knowledgeSourceStatus: "failed",
      outcome: "failed",
    });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });
});
