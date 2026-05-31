import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  persistDraftLessonVersion: vi.fn(),
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
  persistDraftLessonVersion: mocks.persistDraftLessonVersion,
}));

vi.mock("../registry", () => ({
  platformCommandRegistry: {},
}));

import type { LessonStepPayload } from "@/lib/dto/lesson-authoring";

// cache-policy 为 ESM 纯函数，无需 mock。
import { lessonDraftCommandHandlers } from "./lesson-draft";

import {
  buildPlatformCommandDedupeKey,
  dispatchPlatformCommand,
  type PlatformCommandBusDependencies,
  type PlatformCommandStore,
} from "../bus";
import {
  PlatformCommandPayloadSchemas,
  type PlatformCommand,
  type PlatformCommandDefinition,
} from "../contracts";
import type { PlatformEventPublicationPort } from "@/features/platform-core/events/contracts";

type PersistCommand = {
  id: string;
  type: "lesson.draft.persist";
  actor: { actorId: string; actorScope: "teacher" };
  scope: { schoolId: string; pluginId: string };
  payload: { lessonId: string; steps: Array<{ type: "content"; title: string; body: string; teacherNotes: string; materialRefs: unknown[] }> };
  correlation: { correlationId: string; causationId: string | null; producer: string };
  audit: { delegatedActor: null; approval: null };
};

function createPersistCommand(overrides?: Partial<PersistCommand["payload"]>): PersistCommand {
  return {
    id: "command-lesson.draft.persist",
    type: "lesson.draft.persist",
    actor: { actorId: "t1", actorScope: "teacher" },
    scope: { schoolId: "s1", pluginId: "core.lesson-agent" },
    payload: {
      lessonId: "lesson-1",
      steps: [
        { type: "content", title: "导入", body: "正文内容", teacherNotes: "教师备注", materialRefs: [] },
      ],
      ...overrides,
    },
    correlation: {
      correlationId: "corr-lesson-draft-persist",
      causationId: null,
      producer: "test-suite",
    },
    audit: { delegatedActor: null, approval: null },
  };
}

const mockDraftVersion = {
  draftVersionId: "draft-v1",
  version: 1,
  stepCount: 1,
};

describe("executeLessonDraftPersist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
    mocks.persistDraftLessonVersion.mockResolvedValue(mockDraftVersion);
  });

  // Test 1: 合法 teacher（schoolId 命中 scope）→ authorizeLessonDraftCommand 通过 → 调 DAL
  it("合法 teacher 经授权后调 DAL 并返回 resultSummary 含 draftVersionId/version/stepCount", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(mocks.persistDraftLessonVersion).toHaveBeenCalledTimes(1);
    expect(result.resultSummary).toMatchObject({
      draftVersionId: "draft-v1",
      version: 1,
      stepCount: 1,
    });
    expect(result.failureEvent).toBeNull();
  });

  // Test 2: command.scope.schoolId ∉ teacher scope → authorizeLessonDraftCommand 抛 TEACHER_AUTH_REQUIRED
  it("command.scope.schoolId 不在教师 scope 时抛 TEACHER_AUTH_REQUIRED 且 DAL 未被调用 (T-63-01)", async () => {
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s2"] });

    await expect(
      lessonDraftCommandHandlers["lesson.draft.persist"].execute({
        command: createPersistCommand() as never,
        attemptNumber: 1,
      }),
    ).rejects.toThrow("TEACHER_AUTH_REQUIRED");

    expect(mocks.persistDraftLessonVersion).not.toHaveBeenCalled();
  });

  // Test 3: 返回 invalidation.tags 含 draft:${lessonId} 与 lesson:${lessonId}
  it("返回 invalidation.tags 含 draft:${lessonId} 与 lesson:${lessonId}", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(result.invalidation.tags).toEqual(expect.arrayContaining(["draft:lesson-1", "lesson:lesson-1"]));
  });

  // Test 4: emittedEvents 含一条 withAudit 包裹的 lesson.draft.persisted，summary-only（无 *Json 键）
  it("emittedEvents 含 withAudit 包裹的 lesson.draft.persisted，payload summary-only 无 *Json 键", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(result.emittedEvents).toHaveLength(1);
    const event = result.emittedEvents[0];
    expect(event.eventType).toBe("lesson.draft.persisted");
    expect(event.audit).toBeDefined();

    // summary-only：payload 无 *Json 键
    const payload = event.payload as Record<string, unknown>;
    expect(Object.keys(payload).some((k) => k.endsWith("Json"))).toBe(false);
    expect(Object.keys(payload).some((k) => k.endsWith("json"))).toBe(false);
  });

  // Test 5: 传入 command.id 作 sourceCommandId、assertActiveTeacher().userId 作 createdById 流入 DAL
  it("sourceCommandId=command.id 且 createdById=userId 流入 DAL（均不来自 payload）", async () => {
    await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(mocks.persistDraftLessonVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: "lesson-1",
        sourceCommandId: "command-lesson.draft.persist",
        createdById: "t1",
      }),
    );
  });
});

// ========================
// 幂等双层集成测试
// ========================

/** 轻量 in-memory store，仿 bus.test.ts 夹具。 */
function createMemoryStore(): PlatformCommandStore {
  const commands = new Map<string, {
    command: PlatformCommand;
    dedupeKey: string;
    status: "pending" | "running" | "succeeded" | "failed";
    latestAttemptNumber: number;
    resultSummary: Record<string, unknown> | null;
    failureDetail: Record<string, unknown> | null;
  }>();
  const attempts: Array<{
    commandId: string;
    attemptNumber: number;
    status: "pending" | "running" | "succeeded" | "failed";
    resultSummary: Record<string, unknown> | null;
    failureDetail: Record<string, unknown> | null;
  }> = [];

  return {
    async getCommandByDedupeKey(dedupeKey) {
      return Array.from(commands.values()).find((r) => r.dedupeKey === dedupeKey) ?? null;
    },
    async insertCommand(input) {
      const existing = Array.from(commands.values()).find((r) => r.dedupeKey === input.dedupeKey);
      if (existing) {
        return { command: existing.command, created: false };
      }
      commands.set(input.command.id, {
        command: input.command,
        dedupeKey: input.dedupeKey,
        status: input.status,
        latestAttemptNumber: input.latestAttemptNumber,
        resultSummary: null,
        failureDetail: null,
      });
      return { command: input.command, created: true };
    },
    async appendAttempt(input) {
      attempts.push({
        commandId: input.commandId,
        attemptNumber: input.attemptNumber,
        status: input.status,
        resultSummary: input.resultSummary ?? null,
        failureDetail: input.failureDetail ?? null,
      });
    },
    async updateCommandSummary(input) {
      const record = commands.get(input.commandId);
      if (!record) throw new Error("COMMAND_NOT_FOUND");
      record.status = input.status;
      record.latestAttemptNumber = input.latestAttemptNumber;
      record.resultSummary = input.resultSummary ?? null;
      record.failureDetail = input.failureDetail ?? null;
    },
    async getCommand(commandId) {
      return commands.get(commandId) ?? null;
    },
    async listAttempts(commandId) {
      return attempts.filter((a) => a.commandId === commandId);
    },
  };
}

function createPersistBusCommand(overrides?: Partial<{
  id: string; lessonId: string; dedupeKey?: string;
}>): PlatformCommand {
  const contentStep = {
    type: "content" as const,
    title: "导入",
    body: "正文",
    teacherNotes: "",
    materialRefs: [] as LessonStepPayload["materialRefs"],
  };

  return {
    id: overrides?.id ?? "cmd-persist-1",
    type: "lesson.draft.persist",
    actor: { actorId: "t1", actorScope: "teacher" },
    scope: { schoolId: "s1", pluginId: "core.lesson-agent" },
    payload: {
      lessonId: overrides?.lessonId ?? "lesson-1",
      steps: [contentStep],
    },
    correlation: {
      correlationId: "corr-persist-int",
      causationId: null,
      producer: "test-suite",
    },
    audit: { delegatedActor: null, approval: null },
    dedupeKey: overrides?.dedupeKey,
  };
}

describe("幂等双层：dedupe 短路 + pending 重放兜底", () => {
  let persistHandler: ReturnType<typeof vi.fn>;
  let persistAuthorize: ReturnType<typeof vi.fn>;
  let definition: PlatformCommandDefinition<"lesson.draft.persist">;
  let store: PlatformCommandStore;
  let persistPlatformEvents: NonNullable<PlatformCommandBusDependencies["persistPlatformEvents"]>;
  let publicationPort: PlatformEventPublicationPort;
  let dependencies: PlatformCommandBusDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
    mocks.persistDraftLessonVersion.mockResolvedValue({ draftVersionId: "draft-v1", version: 1, stepCount: 1 });

    persistHandler = vi.fn(async () => ({
      resultSummary: { draftVersionId: "draft-v1", version: 1, stepCount: 1 },
      invalidation: { tags: ["draft:lesson-1", "lesson:lesson-1"] },
      emittedEvents: [{
        eventType: "lesson.draft.persisted" as const,
        category: "domain" as const,
        aggregateType: "lesson" as const,
        aggregateId: "lesson-1",
        payload: { draftVersionId: "draft-v1", version: 1, stepCount: 1, source: "ai" as const },
        audit: { delegatedActor: null, approval: null },
      }],
      failureEvent: null,
      failureAttribution: null,
    }));
    persistAuthorize = vi.fn(async () => undefined);

    definition = {
      commandType: "lesson.draft.persist" as const,
      payloadSchema: PlatformCommandPayloadSchemas["lesson.draft.persist"],
      dedupe: "required",
      authorize: persistAuthorize as PlatformCommandDefinition<"lesson.draft.persist">["authorize"],
      execute: persistHandler as PlatformCommandDefinition<"lesson.draft.persist">["execute"],
    };

    persistPlatformEvents = vi.fn(async (input) => ({
      events: input.events.map((event: { eventType: string; category: string; aggregateType: string; aggregateId: string; payload: Record<string, unknown>; audit: Record<string, unknown> | null }, i: number) => ({
        id: `event-${i + 1}`,
        commandId: input.commandId,
        attemptNumber: input.attemptNumber,
        eventOrdinal: i + 1,
        correlationId: input.correlationId,
        causationId: input.causationId ?? null,
        eventType: event.eventType,
        category: event.category,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payloadSummaryJson: event.payload,
        auditSummaryJson: event.audit,
        createdAt: new Date(),
      })),
      dispatches: input.events.map((_: { eventType: string }, i: number) => ({
        id: `dispatch-${i + 1}`,
        eventId: `event-${i + 1}`,
        commandId: input.commandId,
        attemptNumber: input.attemptNumber,
        correlationId: input.correlationId,
        causationId: input.causationId ?? null,
        dispatchChannel: "in-process" as const,
        dispatchStatus: "pending" as const,
        adapterId: null,
        failureReason: null,
        createdAt: new Date(),
        deliveredAt: null,
        failedAt: null,
      })),
    }));

    publicationPort = {
      id: "in-process-default",
      ownership: { sourceOfTruth: "sqlite-platform-event-ledger" as const, delivery: "in-process" as const, posture: "ledger-first" as const, notes: [] as string[] },
      describeOwnership: vi.fn(() => ({ sourceOfTruth: "sqlite-platform-event-ledger" as const, delivery: "in-process" as const, posture: "ledger-first" as const, notes: [] as string[] })),
      publishPersisted: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined),
    };

    store = createMemoryStore();

    dependencies = {
      definitions: {
        "lesson.draft.persist": definition,
      },
      store,
      persistPlatformEvents,
      publicationPort,
    };
  });

  // 用例 A：dedupe 短路 —— bus 对同 dedupeKey 复用同一 command 记录
  it("用例 A (dedupe 短路): 同 dedupeKey 二次 dispatch 后 handler 仅执行一次，返回同 draftVersionId", async () => {
    const command = createPersistBusCommand({ dedupeKey: "key-lesson-1-persist" });

    const first = await dispatchPlatformCommand(command, dependencies);
    const second = await dispatchPlatformCommand({
      ...command,
      id: "cmd-persist-2",
      correlation: { correlationId: "corr-2", causationId: null, producer: "retry" },
    }, dependencies);

    // dedupe 复用同一 command 记录 → 返回同一 commandId
    expect(second.commandId).toBe(first.commandId);
    expect(first.commandId).toBe("cmd-persist-1");
    expect(second.attemptNumber).toBe(1);

    // handler 仅执行一次
    expect(persistHandler).toHaveBeenCalledTimes(1);

    // 终态仅 1 次 attempt
    const attempts = await store.listAttempts(first.commandId);
    expect(attempts).toHaveLength(1);
  });

  // 用例 B：pending-崩溃-重放 —— 同 command.id 二次进入执行，表层唯一约束兜底
  it("用例 B (pending 重放兜底): 同 command.id 二次执行 → DAL 唯一约束冲突抛错，无新增行", async () => {
    // 第一次：正常成功
    const firstResult = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });
    expect(firstResult.resultSummary?.draftVersionId).toBe("draft-v1");
    expect(mocks.persistDraftLessonVersion).toHaveBeenCalledTimes(1);

    // 模拟唯一约束冲突：第二次 DAL 调用抛错（表层唯一约束 (lessonId, sourceCommandId)）
    mocks.persistDraftLessonVersion.mockRejectedValueOnce(
      new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: draftLessonVersions.lessonId, draftLessonVersions.sourceCommandId"),
    );

    // 第二次执行（pending-崩溃-重放）→ 约束冲突向上传播
    await expect(
      lessonDraftCommandHandlers["lesson.draft.persist"].execute({
        command: createPersistCommand() as never,
        attemptNumber: 2,
      }),
    ).rejects.toThrow("UNIQUE constraint");

    // DAL 被调用 2 次（第一次成功 + 第二次失败），但只有第一次真正写入
    expect(mocks.persistDraftLessonVersion).toHaveBeenCalledTimes(2);

    // pending-replay 终态：受控错误，count 恒 1（DAL 不吞约束冲突，错误向上传播）
    // 真实 DB 中 draftLessonVersions 仅 1 行 —— 由唯一约束天然保证
  });
});
