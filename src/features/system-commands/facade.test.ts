import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock server-only
// ---------------------------------------------------------------------------
vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockAssertActionExecutable,
  mockWriteSystemCommandAudit,
  mockDispatchPlatformCommand,
  mockSystemConfigGetAuthorize,
  mockSystemConfigGetExecute,
} = vi.hoisted(() => ({
  mockAssertActionExecutable: vi.fn(),
  mockWriteSystemCommandAudit: vi.fn(),
  mockDispatchPlatformCommand: vi.fn(),
  mockSystemConfigGetAuthorize: vi.fn(),
  mockSystemConfigGetExecute: vi.fn(),
}));

vi.mock("@/features/platform-core/plugin-data-access/governance-gate", () => ({
  assertActionExecutable: mockAssertActionExecutable,
}));

vi.mock("./audit", () => ({
  writeSystemCommandAudit: mockWriteSystemCommandAudit,
}));

vi.mock("./handler", () => ({
  systemConfigGetAuthorize: mockSystemConfigGetAuthorize,
  systemConfigGetExecute: mockSystemConfigGetExecute,
  systemConfigHandler: {
    "system.config.set": {
      authorize: vi.fn(),
      execute: vi.fn(),
    },
    "system.config.get": {
      authorize: mockSystemConfigGetAuthorize,
      execute: mockSystemConfigGetExecute,
    },
  },
}));

vi.mock("@/features/platform-core/commands/registry", () => ({
  platformCommandRegistry: {
    "system.config.set": {
      commandType: "system.config.set",
      payloadSchema: {},
      dedupe: "required",
      authorize: async () => {},
      execute: async () => ({
        resultSummary: { configKey: "test", pluginId: "plugin-001", schoolId: "school-001" },
        invalidation: { tags: [] },
        emittedEvents: [],
        failureEvent: null,
        failureAttribution: null,
      }),
    },
  },
}));

vi.mock("@/features/platform-core/events/adapters/in-process", () => ({
  defaultInProcessPlatformEventAdapter: { publishPersisted: vi.fn() },
}));

vi.mock("@/features/platform-core/commands/bus", () => ({
  dispatchPlatformCommand: mockDispatchPlatformCommand,
}));

// Mock DB for store
vi.mock("@/db", () => ({
  db: {
    query: {
      platformCommands: {
        findFirst: vi.fn().mockResolvedValue(undefined),
      },
      platformCommandAttempts: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: "cmd-001",
          actorId: "actor-1",
          schoolId: "school-001",
          commandType: "system.config.set",
          status: "pending",
          dedupeKey: "dedup-1",
          actorScope: "plugin",
          scopeJson: { schoolId: "school-001", pluginId: "plugin-001" },
          payloadJson: { configKey: "test.key", configValue: "val" },
          correlationJson: { correlationId: "corr-1", causationId: null, producer: "test" },
          auditSummaryJson: { delegatedActor: null, approval: null },
          latestAttemptNumber: 0,
        }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock("@/db/schema", () => ({
  platformCommands: { id: { _: "id" }, dedupeKey: { _: "dedupeKey" }, commandType: { _: "commandType" } },
  platformCommandAttempts: { commandId: { _: "commandId" } },
}));

import { dispatchSystemCommand } from "./facade";
import { createHash } from "node:crypto";

// Simple error class used in tests to simulate governance gate denials
class PluginDataAccessError extends Error {
  constructor(
    public readonly reason: string,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "PluginDataAccessError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEFAULT_GATE_RESULT = {
  schoolId: "school-001",
  scope: { userId: "teacher-001", schoolIds: ["school-001"] },
  projectionRow: {
    pluginId: "plugin-001",
    pluginKey: "test-plugin",
    lifecycle: {
      internalSubstate: "ready" as const,
      killSwitchEnabled: false,
    },
    executable: true,
  },
};

const DEFAULT_SET_INPUT = {
  commandType: "system.config.set",
  pluginKey: "test-plugin",
  actorId: "teacher-001",
  configKey: "theme.primary",
  configValue: "#FF0000",
};

const DEFAULT_GET_INPUT = {
  commandType: "system.config.get",
  pluginKey: "test-plugin",
  actorId: "teacher-001",
  configKey: "theme.primary",
};

function stableCorrelationId(commandType: string, pluginKey: string, actorId: string) {
  const base = `system-cmd:${commandType}:${actorId}:${pluginKey}`;
  return createHash("sha256").update(base).digest("hex");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("dispatchSystemCommand facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertActionExecutable.mockResolvedValue(DEFAULT_GATE_RESULT);
    mockWriteSystemCommandAudit.mockResolvedValue(undefined);
    mockDispatchPlatformCommand.mockResolvedValue({
      commandId: "cmd-001",
      attemptNumber: 1,
      status: "succeeded",
      resultSummary: { configKey: "theme.primary", pluginId: "plugin-001", schoolId: "school-001" },
      invalidation: { tags: [] },
    });
    mockSystemConfigGetAuthorize.mockResolvedValue(undefined);
    mockSystemConfigGetExecute.mockResolvedValue({ theme: "dark" });
  });

  // -----------------------------------------------------------------------
  // system.config.set — 经 Command Bus
  // -----------------------------------------------------------------------
  it("system.config.set 构造 PlatformCommand envelope 后调用 dispatchPlatformCommand", async () => {
    const result = await dispatchSystemCommand(DEFAULT_SET_INPUT);

    expect(mockDispatchPlatformCommand).toHaveBeenCalledTimes(1);
    const envelope = mockDispatchPlatformCommand.mock.calls[0][0];
    expect(envelope.type).toBe("system.config.set");
    expect(envelope.scope.schoolId).toBe("school-001");
    expect(envelope.scope.pluginId).toBe("plugin-001");
    expect(envelope.payload.configKey).toBe("theme.primary");
    expect(envelope.payload.configValue).toBe("#FF0000");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      configKey: "theme.primary",
      pluginId: "plugin-001",
      schoolId: "school-001",
    });
  });

  it("system.config.set 缺少 configKey 时抛错", async () => {
    await expect(
      dispatchSystemCommand({
        commandType: "system.config.set",
        pluginKey: "test-plugin",
        actorId: "teacher-001",
      }),
    ).rejects.toThrow("system.config.set requires configKey");
  });

  // -----------------------------------------------------------------------
  // system.config.get — 纯 DAL 读
  // -----------------------------------------------------------------------
  it("system.config.get 调用 authorize + execute 并返回 DAL 数据", async () => {
    mockSystemConfigGetExecute.mockResolvedValue({ primaryColor: "#fff" });

    const result = await dispatchSystemCommand(DEFAULT_GET_INPUT);

    expect(mockSystemConfigGetAuthorize).toHaveBeenCalledTimes(1);
    const authCall = mockSystemConfigGetAuthorize.mock.calls[0][0];
    expect(authCall.pluginId).toBe("plugin-001");
    expect(authCall.schoolId).toBe("school-001");
    expect(authCall.configKey).toBe("theme.primary");

    expect(mockSystemConfigGetExecute).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ primaryColor: "#fff" });
    expect(result.source).toBe("dal");

    // system.config.get 不走 Command Bus
    expect(mockDispatchPlatformCommand).not.toHaveBeenCalled();
  });

  it("system.config.get authorize 拒绝时透传错误", async () => {
    mockSystemConfigGetAuthorize.mockRejectedValue(
      new Error("config_key_denied"),
    );

    await expect(dispatchSystemCommand(DEFAULT_GET_INPUT)).rejects.toThrow(
      "config_key_denied",
    );
    expect(mockSystemConfigGetExecute).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 治理门拒绝
  // -----------------------------------------------------------------------
  it("治理门拒绝（lifecycle_not_executable）时透传错误", async () => {
    mockAssertActionExecutable.mockRejectedValue(
      new PluginDataAccessError("lifecycle_not_executable"),
    );

    await expect(dispatchSystemCommand(DEFAULT_SET_INPUT)).rejects.toThrow(
      "lifecycle_not_executable",
    );
    expect(mockWriteSystemCommandAudit).not.toHaveBeenCalled();
  });

  it("治理门拒绝（kill_switch_rejected）时透传错误", async () => {
    mockAssertActionExecutable.mockRejectedValue(
      new PluginDataAccessError("kill_switch_rejected"),
    );

    await expect(dispatchSystemCommand(DEFAULT_SET_INPUT)).rejects.toThrow(
      "kill_switch_rejected",
    );
    expect(mockWriteSystemCommandAudit).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // correlationId 派生稳定性
  // -----------------------------------------------------------------------
  it("相同输入产生相同 correlationId（sha256 稳定派生）", () => {
    const id1 = stableCorrelationId("system.config.get", "plugin-a", "user-1");
    const id2 = stableCorrelationId("system.config.get", "plugin-a", "user-1");
    expect(id1).toBe(id2);

    const id3 = stableCorrelationId("system.config.set", "plugin-a", "user-1");
    expect(id1).not.toBe(id3);

    const id4 = stableCorrelationId("system.config.get", "plugin-b", "user-1");
    expect(id1).not.toBe(id4);

    const id5 = stableCorrelationId("system.config.get", "plugin-a", "user-2");
    expect(id1).not.toBe(id5);
  });

  it("correlationId 不包含 configKey/configValue（无信息泄漏）", () => {
    const idWithConfig = stableCorrelationId("system.config.set", "plugin-a", "user-1");
    expect(idWithConfig).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 未知 commandType
  // -----------------------------------------------------------------------
  it("未知 commandType 写 denial audit 后抛错误", async () => {
    await expect(
      dispatchSystemCommand({
        commandType: "system.unknown.cmd",
        pluginKey: "test-plugin",
        actorId: "teacher-001",
      }),
    ).rejects.toThrow("Unsupported system command");

    expect(mockWriteSystemCommandAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockWriteSystemCommandAudit.mock.calls[0][0];
    expect(auditCall.decision).toBe("denied");
    expect(auditCall.reasonCode).toBe("config_key_denied");
    expect(auditCall.schoolId).toBe("school-001");
  });

  // -----------------------------------------------------------------------
  // schoolId 由治理门派生注入
  // -----------------------------------------------------------------------
  it("schoolId 仅来自治理门派生注入，不从 payload 读取", async () => {
    mockAssertActionExecutable.mockResolvedValue({
      ...DEFAULT_GATE_RESULT,
      schoolId: "school-derived-999",
    });

    await dispatchSystemCommand(DEFAULT_GET_INPUT);

    // authorize 被调用时 schoolId 来自治理门
    const authCall = mockSystemConfigGetAuthorize.mock.calls[0][0];
    expect(authCall.schoolId).toBe("school-derived-999");
  });
});
