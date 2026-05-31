import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only 边界：测试运行时空实现，断言生产代码首行守卫存在（见 lesson-agent.ts）。
vi.mock("server-only", () => ({}));

// 真实 bus + 真实 platformCommandRegistry 会经 ledger / adapter 间接触达 @/db，
// 但本测试注入自定义 store + persistPlatformEvents，db 方法永不被调用 → stub 即可保证 hermetic。
vi.mock("@/db", () => ({ db: {} }));

const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  createDraftLessonStepTool: vi.fn(),
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
}));

vi.mock("@/server/ai/tools", () => ({
  createDraftLessonStepTool: mocks.createDraftLessonStepTool,
}));

// 真实 registry 同时引用 plugin handlers，其链路（@/lib/dal/auth → next-auth）在 vitest 下
// 无法解析。Stub plugin handler 模块 → 保持真实 bus + 真实 registry + 真实 lesson-draft handler，
// 仅切断与本 plan 无关的 plugin 治理链路。lesson.draft.run 仍走真实派发路径。
vi.mock("@/features/platform-core/commands/handlers/plugins", () => ({
  pluginCommandHandlers: new Proxy(
    {},
    {
      get: () => ({
        authorize: async () => {},
        execute: async () => ({
          resultSummary: null,
          invalidation: { tags: [] },
          emittedEvents: [],
          failureEvent: null,
          failureAttribution: null,
        }),
      }),
    },
  ),
}));

import type {
  PlatformCommand,
  PlatformCommandStatus,
} from "@/features/platform-core/commands/contracts";
import type {
  PersistedPlatformCommandRecord,
  PlatformCommandStore,
} from "@/features/platform-core/commands/bus";
import type { PlatformEvent } from "@/features/platform-core/events/contracts";

import { draftLessonStep } from "./lesson-agent";

type PersistCall = {
  commandId: string;
  attemptNumber: number;
  correlationId: string;
  causationId?: string | null;
  events: PlatformEvent[];
};

/** 最小 in-memory PlatformCommandStore：捕获 createCommand 的 envelope，支撑 bus 的 attempt 流程。 */
function createInMemoryStore() {
  const records = new Map<string, PersistedPlatformCommandRecord>();
  const captured: { command: PlatformCommand | null } = { command: null };

  const store: PlatformCommandStore = {
    async getCommandByDedupeKey() {
      return null;
    },
    async insertCommand(input) {
      captured.command = input.command;
      records.set(input.command.id, {
        command: input.command,
        dedupeKey: input.dedupeKey,
        status: input.status,
        latestAttemptNumber: input.latestAttemptNumber,
        resultSummary: null,
        failureDetail: null,
      });
      return { command: input.command, created: true };
    },
    async appendAttempt() {
      // no-op：本测试不断言 attempt 行，事件落账经注入的 persistPlatformEvents 捕获。
    },
    async updateCommandSummary(input) {
      const record = records.get(input.commandId);
      if (record) {
        record.status = input.status as PlatformCommandStatus;
        record.latestAttemptNumber = input.latestAttemptNumber;
        record.resultSummary = input.resultSummary ?? null;
        record.failureDetail = input.failureDetail ?? null;
      }
    },
    async getCommand(commandId) {
      return records.get(commandId) ?? null;
    },
    async listAttempts() {
      return [];
    },
  };

  return { store, captured };
}

const contentStep = {
  type: "content" as const,
  title: "导入",
  body: "正文内容",
  teacherNotes: "教师备注",
  materialRefs: [] as unknown[],
};

function mockToolReturning(step: unknown) {
  mocks.createDraftLessonStepTool.mockReturnValue({
    execute: vi.fn(async () => step),
  });
}

function mockToolThrowing(error: Error) {
  mocks.createDraftLessonStepTool.mockReturnValue({
    execute: vi.fn(async () => {
      throw error;
    }),
  });
}

function setupDeps() {
  const { store, captured } = createInMemoryStore();
  const calls: PersistCall[] = [];
  const persistPlatformEvents = vi.fn(async (input: PersistCall) => {
    calls.push(input);
    return { events: [], dispatches: [] };
  });
  return { store, captured, calls, persistPlatformEvents };
}

describe("draftLessonStep 公共编排入口（端到端经真实 bus → handler）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
    mockToolReturning(contentStep);
  });

  it("Test 1: 端到端落账三条 AI 域事件，共享同一 correlationId（SC4 / AGENT-04）", async () => {
    const { store, persistPlatformEvents, calls } = setupDeps();

    await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    expect(calls).toHaveLength(1);
    const persisted = calls[0]!;
    expect(persisted.events).toHaveLength(3);

    const eventTypes = new Set(persisted.events.map((event) => event.eventType));
    expect(eventTypes.has("lesson.draft.requested")).toBe(true);
    expect(eventTypes.has("lesson.tool.invoked")).toBe(true);
    expect(eventTypes.has("lesson.draft.produced")).toBe(true);
    expect(eventTypes).toEqual(
      new Set(["lesson.draft.requested", "lesson.tool.invoked", "lesson.draft.produced"]),
    );

    for (const event of persisted.events) {
      expect(event.aggregateType).toBe("lesson");
      expect(event.aggregateId).toBe("l1");
    }

    // 三事件经同一 persistPlatformEvents 落账 → 共享同一 correlationId（同一 commandId 可追溯）。
    expect(typeof persisted.correlationId).toBe("string");
    expect(persisted.correlationId.length).toBeGreaterThan(0);
  });

  it("Test 2: 生成步骤经 resultSummary 回传调用方（SC3）", async () => {
    const { store, persistPlatformEvents } = setupDeps();

    const result = await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    expect(result.status).toBe("succeeded");
    expect(result.step).toMatchObject({ type: "content", title: "导入" });
  });

  it("Test 3: 三事件 payload 均 summary-only，整包 step 仅在 resultSummary（T-62-09 端到端）", async () => {
    const { store, persistPlatformEvents, calls } = setupDeps();

    const result = await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    for (const event of calls[0]!.events) {
      expect(event.payload).not.toHaveProperty("body");
      expect(event.payload).not.toHaveProperty("teacherNotes");
      expect(event.payload).not.toHaveProperty("materialRefs");
      expect(event.payload).not.toHaveProperty("step");
    }

    // 整包 step（含 body/teacherNotes/materialRefs）仅经 resultSummary 抵达调用方。
    expect(result.step).toMatchObject({ body: "正文内容", teacherNotes: "教师备注" });
  });

  it("Test 4: command envelope 合法 —— sentinel pluginId + correlation 三字段 + 无 teacherId（Spoofing 缓解）", async () => {
    const { store, captured, persistPlatformEvents } = setupDeps();

    await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    const command = captured.command!;
    expect(command.type).toBe("lesson.draft.run");
    expect(command.scope.pluginId).toBe("core.lesson-agent");
    expect(command.scope.schoolId).toBe("s1");

    // correlation 三字段齐全。
    expect(command.correlation.correlationId.length).toBeGreaterThan(0);
    expect(command.correlation.causationId).toBeNull();
    expect(command.correlation.producer.length).toBeGreaterThan(0);

    // payload 仅 lessonId/stepType/intent；teacherId 绝不可由调用方经 payload 伪造。
    expect(Object.keys(command.payload).sort()).toEqual(["intent", "lessonId", "stepType"]);
    expect(command.payload).not.toHaveProperty("teacherId");
  });

  it("Test 5: 生成失败时透传 bus failed 语义，且不落任何 lesson.* domain 事件（D-53-08）", async () => {
    mockToolThrowing(new Error("GEN_FAIL"));
    const { store, persistPlatformEvents, calls } = setupDeps();

    await expect(
      draftLessonStep(
        { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
        { store, persistPlatformEvents },
      ),
    ).rejects.toThrow();

    // 失败走 bus generic 失败路径：落账事件不含任何 lesson.* domain 事件。
    const allEvents = calls.flatMap((call) => call.events);
    expect(allEvents.some((event) => event.eventType.startsWith("lesson."))).toBe(false);
  });
});
