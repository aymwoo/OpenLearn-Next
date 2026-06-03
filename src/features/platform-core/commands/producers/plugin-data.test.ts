import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * 写动词 producer 单元测试（Phase 68, ACCESS-02/ACCESS-03）。
 *
 * 仿 producers/plugin-governance.test.ts：mock `dispatchPlatformCommand` / `@/db` /
 * in-process 适配器，仅验证 producer **接线**——命令入参形状、依赖注入、结果归一化、
 * dedupeKey 透传，以及“schoolId 唯一权威”（scope 携带、payload 绝不被注入 schoolId）。
 * 真实落库 / append-only / 审计行为由 handlers/plugin-data.test.ts 覆盖。
 */

const mocks = vi.hoisted(() => ({
  dispatchPlatformCommand: vi.fn(),
  publishPersisted: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      platformCommands: { findFirst: vi.fn() },
      platformCommandAttempts: { findMany: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/features/platform-core/commands/bus", () => ({
  dispatchPlatformCommand: mocks.dispatchPlatformCommand,
}));

vi.mock("@/features/platform-core/events/adapters/in-process", () => ({
  defaultInProcessPlatformEventAdapter: {
    id: "in-process-default",
    ownership: {
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: [],
    },
    describeOwnership: vi.fn(() => ({
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: [],
    })),
    publishPersisted: mocks.publishPersisted,
    subscribe: vi.fn(() => () => undefined),
  },
}));

import { producePluginDataInsert, producePluginDataUpsert } from "./plugin-data";

const actor = { actorId: "teacher-1", actorScope: "teacher" as const };
const scope = { schoolId: "school-1", pluginId: "plugin-1" };
const values = {
  classroomSession: "session-1",
  student: "student-1",
  question: "q-1",
  selectedOption: "A",
};

function succeededDispatch(commandId: string) {
  return {
    commandId,
    attemptNumber: 1,
    status: "succeeded" as const,
    resultSummary: { attemptNo: 1, isLatest: true },
    invalidation: { tags: [] as string[] },
  };
}

describe("plugin data write verb producers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insert：经 bus 派发 plugin.data.insert，注入 publicationPort+store 并归一化结果", async () => {
    mocks.dispatchPlatformCommand.mockImplementation(async (_command, dependencies) => {
      // 证明 producer 注入的是具体 in-process 发布端口。
      await dependencies.publicationPort?.publishPersisted({
        commandId: "plugin.data.insert:corr-1",
        attemptNumber: 1,
        eventIds: [],
        dispatchIds: [],
      });
      return succeededDispatch("plugin.data.insert:corr-1");
    });

    const result = await producePluginDataInsert({
      actor,
      scope,
      payload: { pluginKey: "quiz", table: "plugin_owned_quiz_responses", values: { ...values } },
      dedupeKey: "dedupe-insert-1",
      correlation: { correlationId: "corr-1", causationId: null, producer: "plugin-data-actions" },
      source: "server-action",
    });

    expect(mocks.dispatchPlatformCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "plugin.data.insert",
        id: "plugin.data.insert:corr-1",
        scope: { schoolId: "school-1", pluginId: "plugin-1" },
        payload: { pluginKey: "quiz", table: "plugin_owned_quiz_responses", values: { ...values } },
        dedupeKey: "dedupe-insert-1",
      }),
      expect.objectContaining({
        publicationPort: expect.objectContaining({
          id: "in-process-default",
          publishPersisted: mocks.publishPersisted,
        }),
        store: expect.any(Object),
      }),
    );
    expect(mocks.publishPersisted).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      data: { attemptNo: 1, isLatest: true },
      commandId: "plugin.data.insert:corr-1",
      attemptNumber: 1,
      invalidationTags: [],
    });
  });

  it("upsert：经 bus 派发 plugin.data.upsert（与 insert 仅命令类型不同）", async () => {
    mocks.dispatchPlatformCommand.mockResolvedValueOnce(succeededDispatch("plugin.data.upsert:corr-2"));

    await producePluginDataUpsert({
      actor,
      scope,
      payload: { pluginKey: "quiz", table: "plugin_owned_quiz_responses", values: { ...values } },
      dedupeKey: "dedupe-upsert-1",
      correlation: { correlationId: "corr-2", causationId: null, producer: "plugin-data-actions" },
      source: "server-action",
    });

    expect(mocks.dispatchPlatformCommand).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "plugin.data.upsert",
        id: "plugin.data.upsert:corr-2",
      }),
      expect.any(Object),
    );
  });

  it("schoolId 唯一权威：payload 仅含 {pluginKey,table,values}，绝不被注入 schoolId", async () => {
    mocks.dispatchPlatformCommand.mockResolvedValueOnce(succeededDispatch("plugin.data.insert:corr-3"));

    await producePluginDataInsert({
      actor,
      scope,
      payload: { pluginKey: "quiz", table: "plugin_owned_quiz_responses", values: { ...values } },
      dedupeKey: "dedupe-authority",
      correlation: { correlationId: "corr-3", causationId: null, producer: "plugin-data-actions" },
      source: "server-action",
    });

    const [dispatchedCommand] = mocks.dispatchPlatformCommand.mock.calls[0] as [
      { scope: { schoolId: string }; payload: Record<string, unknown> },
    ];
    // schoolId 仅来自 scope（鉴权侧），不出现在 payload 顶层。
    expect(dispatchedCommand.scope.schoolId).toBe("school-1");
    expect(dispatchedCommand.payload).not.toHaveProperty("schoolId");
    expect(Object.keys(dispatchedCommand.payload).sort()).toEqual(["pluginKey", "table", "values"]);
  });

  it("dedupeKey 透传至 bus（重放安全由 bus 负责）", async () => {
    mocks.dispatchPlatformCommand.mockResolvedValueOnce(succeededDispatch("plugin.data.insert:corr-4"));

    await producePluginDataInsert({
      actor,
      scope,
      payload: { pluginKey: "quiz", table: "plugin_owned_quiz_responses", values: { ...values } },
      dedupeKey: "dedupe-passthrough",
      correlation: { correlationId: "corr-4", causationId: null, producer: "plugin-data-actions" },
      source: "server-action",
    });

    expect(mocks.dispatchPlatformCommand).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: "dedupe-passthrough" }),
      expect.any(Object),
    );
  });
});
