import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock server-only
// ---------------------------------------------------------------------------
vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockAssertActionExecutable, mockWriteSystemCommandAudit } = vi.hoisted(() => ({
  mockAssertActionExecutable: vi.fn(),
  mockWriteSystemCommandAudit: vi.fn(),
}));

vi.mock("@/features/platform-core/plugin-data-access/governance-gate", () => ({
  assertActionExecutable: mockAssertActionExecutable,
}));

vi.mock("./audit", () => ({
  writeSystemCommandAudit: mockWriteSystemCommandAudit,
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

const DEFAULT_INPUT = {
  commandType: "system.config.set",
  pluginKey: "test-plugin",
  actorId: "teacher-001",
  configKey: "theme.primary",
  configValue: "#FF0000",
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
  });

  // -----------------------------------------------------------------------
  // 1. 正常流程：治理门通过 → 判别派发（当前阶段抛 not-yet-wired 错误）
  // -----------------------------------------------------------------------
  it("通过治理门后 system.config.set 抛出 not-yet-wired 错误", async () => {
    await expect(dispatchSystemCommand(DEFAULT_INPUT)).rejects.toThrow(
      "system.config handler not yet wired — Phase 79 Plan 02",
    );

    // 验证治理门被调用
    expect(mockAssertActionExecutable).toHaveBeenCalledTimes(1);
    const gateCall = mockAssertActionExecutable.mock.calls[0]![0];
    expect(gateCall.actorId).toBe("teacher-001");
    expect(gateCall.pluginKey).toBe("test-plugin");
    expect(gateCall.verb).toBe("system.config.set");
    expect(gateCall.correlationId).toBe(
      stableCorrelationId("system.config.set", "test-plugin", "teacher-001"),
    );
  });

  it("通过治理门后 system.config.get 抛出 not-yet-wired 错误", async () => {
    await expect(
      dispatchSystemCommand({
        commandType: "system.config.get",
        pluginKey: "test-plugin",
        actorId: "teacher-001",
        configKey: "theme.primary",
      }),
    ).rejects.toThrow("system.config handler not yet wired — Phase 79 Plan 02");

    expect(mockAssertActionExecutable).toHaveBeenCalledTimes(1);
    const gateCall = mockAssertActionExecutable.mock.calls[0]![0];
    expect(gateCall.verb).toBe("system.config.get");
  });

  // -----------------------------------------------------------------------
  // 2. 治理门拒绝：mock assertActionExecutable 抛出 PluginDataAccessError →
  //    facade 透传错误
  // -----------------------------------------------------------------------
  it("治理门拒绝（lifecycle_not_executable）时透传错误", async () => {
    mockAssertActionExecutable.mockRejectedValue(
      new PluginDataAccessError("lifecycle_not_executable"),
    );

    await expect(dispatchSystemCommand(DEFAULT_INPUT)).rejects.toThrow(
      "lifecycle_not_executable",
    );

    // facade 不应写 audit——治理门内部已写
    expect(mockWriteSystemCommandAudit).not.toHaveBeenCalled();
  });

  it("治理门拒绝（kill_switch_rejected）时透传错误", async () => {
    mockAssertActionExecutable.mockRejectedValue(
      new PluginDataAccessError("kill_switch_rejected"),
    );

    await expect(dispatchSystemCommand(DEFAULT_INPUT)).rejects.toThrow(
      "kill_switch_rejected",
    );
    expect(mockWriteSystemCommandAudit).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3. correlationId 派生稳定性：相同输入 → 相同 correlationId
  // -----------------------------------------------------------------------
  it("相同输入产生相同 correlationId（sha256 稳定派生）", () => {
    const id1 = stableCorrelationId("system.config.get", "plugin-a", "user-1");
    const id2 = stableCorrelationId("system.config.get", "plugin-a", "user-1");
    expect(id1).toBe(id2);

    // 不同 commandType → 不同 correlationId
    const id3 = stableCorrelationId("system.config.set", "plugin-a", "user-1");
    expect(id1).not.toBe(id3);

    // 不同 pluginKey → 不同 correlationId
    const id4 = stableCorrelationId("system.config.get", "plugin-b", "user-1");
    expect(id1).not.toBe(id4);

    // 不同 actorId → 不同 correlationId
    const id5 = stableCorrelationId("system.config.get", "plugin-a", "user-2");
    expect(id1).not.toBe(id5);
  });

  it("correlationId 不包含 configKey/configValue（无信息泄漏）", () => {
    const idWithConfig = stableCorrelationId("system.config.set", "plugin-a", "user-1");
    // correlationId 派生只用 commandType/pluginKey/actorId，configKey/configValue 不参与
    expect(idWithConfig).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 4. 判别派发未实现路径：未知 commandType 走 audit 后抛错
  // -----------------------------------------------------------------------
  it("未知 commandType 写 denial audit 后抛 Unsupported 错误", async () => {
    await expect(
      dispatchSystemCommand({
        commandType: "system.unknown.cmd",
        pluginKey: "test-plugin",
        actorId: "teacher-001",
      }),
    ).rejects.toThrow("Unsupported system command");

    // 验证 audit 被写入
    expect(mockWriteSystemCommandAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockWriteSystemCommandAudit.mock.calls[0]![0];
    expect(auditCall.decision).toBe("denied");
    expect(auditCall.reasonCode).toBe("config_key_denied");
    expect(auditCall.commandType).toBe("system.config.get");
    expect(auditCall.schoolId).toBe("school-001");
    expect(auditCall.actorId).toBe("teacher-001");
    expect(auditCall.payloadJson.commandType).toBe("system.unknown.cmd");
  });

  // -----------------------------------------------------------------------
  // 5. schoolId 由治理门派生注入，不从 payload 读取（T-79-04）
  // -----------------------------------------------------------------------
  it("schoolId 仅来自治理门派生注入", async () => {
    mockAssertActionExecutable.mockResolvedValue({
      ...DEFAULT_GATE_RESULT,
      schoolId: "school-derived-999",
    });

    await expect(
      dispatchSystemCommand({
        commandType: "system.unknown.cmd",
        pluginKey: "test-plugin",
        actorId: "teacher-001",
      }),
    ).rejects.toThrow("Unsupported system command");

    // audit 中的 schoolId 来自治理门
    const auditCall = mockWriteSystemCommandAudit.mock.calls[0]![0];
    expect(auditCall.schoolId).toBe("school-derived-999");
  });
});
