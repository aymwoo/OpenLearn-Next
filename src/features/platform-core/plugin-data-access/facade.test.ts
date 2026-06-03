import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * facade 单元测试（Phase 68, D-01 五动词单一入口）。
 *
 * facade 是纯**接线**层：治理前置 → 判别派发。故 mock 治理门 / 写 producer / 读 verbs，
 * 仅断言——
 * - 写动词（insert/upsert）走 producer、不走 read-verbs；读动词反之；
 * - 任何动词先过 `assertActionExecutable`；gate 抛错时 producer/read 均不被调用（治理前置）；
 * - schoolId 仅由 gate 派生注入（producer 收到 gate 的 schoolId，而非任何入参覆盖）。
 * 真实落库 / 审计 / 越校拒绝语义由 producers/read-verbs 各自的真实 DB 测试覆盖。
 */

const mocks = vi.hoisted(() => ({
  assertActionExecutable: vi.fn(),
  producePluginDataInsert: vi.fn(async () => ({ success: true, commandId: "c-1" })),
  producePluginDataUpsert: vi.fn(async () => ({ success: true, commandId: "c-2" })),
  getByIndex: vi.fn(async () => [{ id: "row-1" }]),
  count: vi.fn(async () => 2),
  aggregate: vi.fn(async () => [{ key: "A", count: 2 }]),
}));

vi.mock("./governance-gate", () => ({
  assertActionExecutable: mocks.assertActionExecutable,
}));

vi.mock("@/features/platform-core/commands/producers/plugin-data", () => ({
  producePluginDataInsert: mocks.producePluginDataInsert,
  producePluginDataUpsert: mocks.producePluginDataUpsert,
}));

vi.mock("./read-verbs", () => ({
  getByIndex: mocks.getByIndex,
  count: mocks.count,
  aggregate: mocks.aggregate,
}));

import { PluginDataAccessError } from "./allowlist";
import { dispatchPluginDataAccess } from "./facade";

const GATE_RESULT = {
  schoolId: "school-1",
  scope: { userId: "teacher-1", schoolIds: ["school-1"] },
  projectionRow: {
    pluginId: "plugin-1",
    pluginKey: "quiz",
    lifecycle: { internalSubstate: "ready", killSwitchEnabled: false },
  },
};

function gateOk() {
  mocks.assertActionExecutable.mockResolvedValue(GATE_RESULT);
}

describe("dispatchPluginDataAccess facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gateOk();
  });

  it("insert：先过治理门，再经 producePluginDataInsert 派发（不走 read-verbs）", async () => {
    await dispatchPluginDataAccess({
      verb: "insert",
      actor: "teacher-1",
      pluginKey: "quiz",
      table: "plugin_owned_quiz_responses",
      values: { classroomSession: "s-1", student: "stu-1", question: "q-1", selectedOption: "A" },
    });

    expect(mocks.assertActionExecutable).toHaveBeenCalledTimes(1);
    expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
    // schoolId 仅由 gate 派生注入，pluginId 取自治理投影。
    const arg = (mocks.producePluginDataInsert.mock.calls[0] as unknown[])[0] as {
      scope: { schoolId: string; pluginId: string };
      payload: { pluginKey: string; table: string; values: Record<string, unknown> };
    };
    expect(arg.scope).toEqual({ schoolId: "school-1", pluginId: "plugin-1" });
    expect(arg.payload.pluginKey).toBe("quiz");
    expect(arg.payload.values).not.toHaveProperty("schoolId");
    expect(mocks.getByIndex).not.toHaveBeenCalled();
    expect(mocks.producePluginDataUpsert).not.toHaveBeenCalled();
  });

  it("upsert：经 producePluginDataUpsert 派发（不走 read-verbs）", async () => {
    await dispatchPluginDataAccess({
      verb: "upsert",
      actor: "teacher-1",
      pluginKey: "quiz",
      table: "plugin_owned_quiz_responses",
      values: { classroomSession: "s-1", student: "stu-1", question: "q-1", selectedOption: "B" },
    });

    expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.producePluginDataInsert).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("getByIndex：走 read-verbs（不经 producer），传派生 schoolId + 审计上下文", async () => {
    await dispatchPluginDataAccess({
      verb: "getByIndex",
      actor: "teacher-1",
      pluginKey: "quiz",
      table: "plugin_owned_quiz_responses",
      index: ["schoolId", "classroomSession"],
      eq: { classroomSession: "s-1" },
    });

    expect(mocks.getByIndex).toHaveBeenCalledTimes(1);
    const arg = (mocks.getByIndex.mock.calls[0] as unknown[])[0] as {
      schoolId: string;
      audit: { pluginId: string | null; actorScope: string; lifecycleState: string };
    };
    expect(arg.schoolId).toBe("school-1");
    expect(arg.audit.pluginId).toBe("plugin-1");
    expect(arg.audit.actorScope).toBe("plugin");
    expect(mocks.producePluginDataInsert).not.toHaveBeenCalled();
    expect(mocks.producePluginDataUpsert).not.toHaveBeenCalled();
  });

  it("count：走 read-verbs count（不经 producer）", async () => {
    const result = await dispatchPluginDataAccess({
      verb: "count",
      actor: "teacher-1",
      pluginKey: "quiz",
      table: "plugin_owned_quiz_responses",
    });

    expect(mocks.count).toHaveBeenCalledTimes(1);
    expect(result).toBe(2);
    expect(mocks.producePluginDataInsert).not.toHaveBeenCalled();
  });

  it("aggregate：走 read-verbs aggregate（不经 producer）", async () => {
    const result = await dispatchPluginDataAccess({
      verb: "aggregate",
      actor: "teacher-1",
      pluginKey: "quiz",
      table: "plugin_owned_quiz_responses",
      groupBy: "selectedOption",
    });

    expect(mocks.aggregate).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ key: "A", count: 2 }]);
    expect(mocks.producePluginDataUpsert).not.toHaveBeenCalled();
  });

  it("治理前置：gate 抛错时 producer / read-verbs 均不被调用", async () => {
    mocks.assertActionExecutable.mockRejectedValueOnce(
      new PluginDataAccessError("kill_switch_rejected"),
    );

    await expect(
      dispatchPluginDataAccess({
        verb: "insert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table: "plugin_owned_quiz_responses",
        values: { classroomSession: "s-1", student: "stu-1", question: "q-1", selectedOption: "A" },
      }),
    ).rejects.toThrow(PluginDataAccessError);

    expect(mocks.producePluginDataInsert).not.toHaveBeenCalled();
    expect(mocks.getByIndex).not.toHaveBeenCalled();
  });
});
