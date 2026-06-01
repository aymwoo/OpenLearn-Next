import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only 边界：测试运行时空实现，断言生产代码首行守卫存在（见 lesson-agent.ts）。
vi.mock("server-only", () => ({}));

// 真实 bus + 真实 platformCommandRegistry 会经 ledger / adapter 间接触达 @/db，
// 但本测试注入自定义 store + persistPlatformEvents，db 方法永不被调用 → stub 即可保证 hermetic。
vi.mock("@/db", () => ({ db: {} }));

const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  persistDraftLessonVersion: vi.fn(),
  createDraftLessonStepTool: vi.fn(),
}));

// 真实 persist handler 经 registry 解析后会调 DAL `persistDraftLessonVersion`（写型副作用）。
// 注入 mock → 桥接路径 run→persist 端到端经真实 bus 派发，DAL 写入被捕获且永不触达 @/db。
vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
  persistDraftLessonVersion: mocks.persistDraftLessonVersion,
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

import { DraftGuardrailRejection } from "@/lib/dto/draft-guardrails";

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
  // command：最后一次插入（向后兼容）；commands：run→persist 桥接全序列（断言两段派发）。
  const captured: { command: PlatformCommand | null; commands: PlatformCommand[] } = {
    command: null,
    commands: [],
  };

  const store: PlatformCommandStore = {
    async getCommandByDedupeKey() {
      return null;
    },
    async insertCommand(input) {
      captured.command = input.command;
      captured.commands.push(input.command);
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
    mocks.persistDraftLessonVersion.mockResolvedValue({
      draftVersionId: "draft-v1",
      version: 1,
      stepCount: 1,
    });
    mockToolReturning(contentStep);
  });

  it("Test 1: 端到端落账三条 AI 域事件，共享同一 correlationId（SC4 / AGENT-04）", async () => {
    const { store, persistPlatformEvents, calls } = setupDeps();

    await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    // 桥接后 persistPlatformEvents 被调两次（run 三事件 + persist 一事件）；
    // 定位 run 段：含 lesson.draft.requested 的那次落账。
    const persisted = calls.find((call) =>
      call.events.some((event) => event.eventType === "lesson.draft.requested"),
    )!;
    expect(persisted).toBeDefined();
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

    const command = captured.commands.find((cmd) => cmd.type === "lesson.draft.run")!;
    expect(command).toBeDefined();
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

describe("draftLessonStep run→persist 桥接（D-01 顺序派发，共享 correlationId）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
    mocks.persistDraftLessonVersion.mockResolvedValue({
      draftVersionId: "draft-v1",
      version: 1,
      stepCount: 1,
    });
    mockToolReturning(contentStep);
  });

  it("Bridge 1: run 成功后顺序派发一条 lesson.draft.persist 命令（DRAFT-01）", async () => {
    const { store, captured, persistPlatformEvents } = setupDeps();

    await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    const types = captured.commands.map((cmd) => cmd.type);
    expect(types).toContain("lesson.draft.run");
    expect(types).toContain("lesson.draft.persist");
    // run 先于 persist（顺序派发，非嵌套）。
    expect(types.indexOf("lesson.draft.run")).toBeLessThan(types.indexOf("lesson.draft.persist"));
  });

  it("Bridge 2: persist payload.steps 为单个 run 步骤包成的数组 [step]（key_link）", async () => {
    const { store, captured, persistPlatformEvents } = setupDeps();

    await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    const persistCommand = captured.commands.find((cmd) => cmd.type === "lesson.draft.persist")!;
    expect(persistCommand).toBeDefined();
    const payload = persistCommand.payload as { lessonId: string; steps: unknown[] };
    expect(payload.lessonId).toBe("l1");
    expect(payload.steps).toHaveLength(1);
    expect(payload.steps[0]).toMatchObject({ type: "content", title: "导入", body: "正文内容" });
    // payload 严格：teacherId/source 绝不入 payload（handler 闭包注入 / T-66-05）。
    expect(Object.keys(payload).sort()).toEqual(["lessonId", "steps"]);
  });

  it("Bridge 3: persist 复用 run 的 correlationId（run→persist 为同一关联单元）", async () => {
    const { store, captured, persistPlatformEvents } = setupDeps();

    await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    const runCommand = captured.commands.find((cmd) => cmd.type === "lesson.draft.run")!;
    const persistCommand = captured.commands.find((cmd) => cmd.type === "lesson.draft.persist")!;
    expect(persistCommand.correlation.correlationId).toBe(runCommand.correlation.correlationId);
  });

  it("Bridge 4: step 为 null（守卫拒绝）时短路，不派发 persist（D-53-08 失败透传语义）", async () => {
    mockToolThrowing(new DraftGuardrailRejection({ reasonCode: "forbidden_content", stepType: "content" }));
    const { store, captured, persistPlatformEvents } = setupDeps();

    const result = await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    expect(result.step).toBeNull();
    expect(captured.commands.some((cmd) => cmd.type === "lesson.draft.persist")).toBe(false);
  });

  it("Bridge 5: 返回携带 persist 结果的草稿身份 draftVersionId + version（DRAFT-01 回传）", async () => {
    const { store, persistPlatformEvents } = setupDeps();

    const result = await draftLessonStep(
      { schoolId: "s1", lessonId: "l1", stepType: "content", intent: "导入环节" },
      { store, persistPlatformEvents },
    );

    expect(result.draftVersionId).toBe("draft-v1");
    expect(result.version).toBe(1);
  });
});
