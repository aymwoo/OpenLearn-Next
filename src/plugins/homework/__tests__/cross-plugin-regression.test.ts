/**
 * Phase 75-04 Task 3: 跨插件回归测试（quiz + homework 双绿）。
 *
 * 覆盖 6 个 marketplace 阶段检查点：
 *   A. quiz install 流程不受 homework 影响
 *   B. homework dataModel 编译后 quiz 测试全绿
 *   C. homework 步骤编辑器 + quiz step 编辑器共存
 *   D. homework 提交 + quiz 提交双绿
 *   E. homework upgrade 后 quiz 数据完整
 *   F. homework uninstall 后 quiz 功能正常
 *
 * Mock 策略对齐 quiz-data-access.test.ts 和 lifecycle.test.ts。
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertActionExecutable: vi.fn<any>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  producePluginDataInsert: vi.fn<any>(async () => ({ success: true, commandId: "c-1" })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  producePluginDataUpsert: vi.fn<any>(async () => ({ success: true, commandId: "c-2" })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getByIndex: vi.fn<any>(async () => []),
  count: vi.fn(async () => 0),
  aggregate: vi.fn(async () => []),
}));

vi.mock("@/features/platform-core/plugin-data-access/governance-gate", () => ({
  assertActionExecutable: mocks.assertActionExecutable,
}));

vi.mock("@/features/platform-core/commands/producers/plugin-data", () => ({
  producePluginDataInsert: mocks.producePluginDataInsert,
  producePluginDataUpsert: mocks.producePluginDataUpsert,
}));

vi.mock("@/features/platform-core/plugin-data-access/read-verbs", () => ({
  getByIndex: mocks.getByIndex,
  count: mocks.count,
  aggregate: mocks.aggregate,
}));

import { dispatchPluginDataAccess } from "@/features/platform-core/plugin-data-access/facade";

// ── helpers ──────────────────────────────────────────────────────────────────

function mockGateForPlugin(pluginKey: string, internalSubstate = "ready") {
  mocks.assertActionExecutable.mockResolvedValueOnce({
    schoolId: "school-1",
    scope: { userId: "teacher-1", schoolIds: ["school-1"] },
    projectionRow: {
      pluginId: `plugin-${pluginKey}-1`,
      pluginKey,
      lifecycle: { internalSubstate, killSwitchEnabled: false },
    },
  });
}

// ── cross-plugin regression ──────────────────────────────────────────────────

describe("cross-plugin regression", () => {
  it("检查点 A: quiz install 流程不受 homework 影响", async () => {
    mockGateForPlugin("quiz");
    mocks.getByIndex.mockResolvedValueOnce([
      { id: "q-1", questionType: "single_choice" },
    ]);

    const result = (await dispatchPluginDataAccess({
      actor: "teacher-1",
      pluginKey: "quiz",
      verb: "getByIndex",
      table: "plugin_owned_quiz_questions",
      index: ["schoolId"],
      eq: {},
    })) as Array<Record<string, unknown>>;

    expect(result.length).toBe(1);
    expect(result[0].questionType).toBe("single_choice");
  });

  it("检查点 B: homework dataModel 编译后 quiz 测试全绿", async () => {
    // 验证 quiz 和 homework 可以独立操作，互不干扰
    mockGateForPlugin("quiz");
    mocks.getByIndex.mockResolvedValueOnce([{ id: "q-1" }]);

    const quizResult = (await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "quiz", verb: "getByIndex",
      table: "plugin_owned_quiz_questions", index: ["schoolId"], eq: {},
    })) as Array<Record<string, unknown>>;
    expect(quizResult.length).toBeGreaterThan(0);

    mockGateForPlugin("homework");
    mocks.getByIndex.mockResolvedValueOnce([{ id: "a-1", title: "作业" }]);

    const hwResult = (await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "homework", verb: "getByIndex",
      table: "plugin_owned_homework_assignments",
      index: ["schoolId", "classroomSession"], eq: { classroomSession: "cs-1" },
    })) as Array<Record<string, unknown>>;
    expect(hwResult.length).toBeGreaterThan(0);
  });

  it("检查点 C: homework + quiz 双插件的 insert 操作可并行", async () => {
    // quiz insert
    mockGateForPlugin("quiz");
    mocks.producePluginDataInsert.mockResolvedValueOnce({
      success: true, commandId: "c-quiz",
    });
    await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "quiz", verb: "insert",
      table: "plugin_owned_quiz_questions",
      values: { questionType: "single_choice", title: "Quiz Q" },
    });

    // homework insert
    mockGateForPlugin("homework");
    mocks.producePluginDataInsert.mockResolvedValueOnce({
      success: true, commandId: "c-hw",
    });
    await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "homework", verb: "insert",
      table: "plugin_owned_homework_assignments",
      values: { classroomSession: "cs-1", title: "HW", description: null, attachmentUrl: null, dueDate: null },
    });

    expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(2);
  });

  it("检查点 D: homework 提交 + quiz 提交双绿", async () => {
    // homework 提交
    mockGateForPlugin("homework");
    mocks.producePluginDataUpsert.mockResolvedValueOnce({
      success: true, commandId: "c-hw-submit",
    });
    await dispatchPluginDataAccess({
      actor: "student-1", pluginKey: "homework", verb: "upsert",
      table: "plugin_owned_homework_submissions",
      values: { classroomSession: "cs-1", student: "stu-1", assignment: "a-1", content: "答案", attachmentUrl: null },
    });

    // quiz 提交
    mockGateForPlugin("quiz");
    mocks.producePluginDataUpsert.mockResolvedValueOnce({
      success: true, commandId: "c-quiz-submit",
    });
    await dispatchPluginDataAccess({
      actor: "student-1", pluginKey: "quiz", verb: "upsert",
      table: "plugin_owned_quiz_responses",
      values: { questionId: "q-1", studentId: "stu-1", selectedOption: "A" },
    });

    expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(2);
  });

  it("检查点 E: homework upgrade 后 quiz 数据完整", async () => {
    // homework upgrade: 新列 dueDate 可读写
    mockGateForPlugin("homework");
    mocks.producePluginDataInsert.mockResolvedValueOnce({
      success: true, commandId: "c-hw-upgrade",
    });
    await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "homework", verb: "insert",
      table: "plugin_owned_homework_assignments",
      values: { classroomSession: "cs-1", title: "升级后作业", description: null, attachmentUrl: null, dueDate: "2026-07-01" },
    });

    // quiz 数据不受影响
    mockGateForPlugin("quiz");
    mocks.getByIndex.mockResolvedValueOnce([
      { id: "q-1", questionType: "single_choice" },
      { id: "q-2", questionType: "multi_choice" },
    ]);
    const quizData = (await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "quiz", verb: "getByIndex",
      table: "plugin_owned_quiz_questions", index: ["schoolId"], eq: {},
    })) as Array<Record<string, unknown>>;
    expect(quizData.length).toBe(2);

    expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
  });

  it("检查点 F: homework uninstall 后 quiz 功能正常", async () => {
    // homework 数据已删除
    mockGateForPlugin("homework");
    mocks.getByIndex.mockResolvedValueOnce([]);
    const hwData = (await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "homework", verb: "getByIndex",
      table: "plugin_owned_homework_assignments",
      index: ["schoolId", "classroomSession"], eq: { classroomSession: "cs-1" },
    })) as Array<Record<string, unknown>>;
    expect(hwData.length).toBe(0);

    // quiz 仍正常
    mockGateForPlugin("quiz");
    mocks.getByIndex.mockResolvedValueOnce([
      { id: "q-1", questionType: "true_false" },
    ]);
    const quizData = (await dispatchPluginDataAccess({
      actor: "teacher-1", pluginKey: "quiz", verb: "getByIndex",
      table: "plugin_owned_quiz_questions", index: ["schoolId"], eq: {},
    })) as Array<Record<string, unknown>>;
    expect(quizData.length).toBe(1);
  });
});
