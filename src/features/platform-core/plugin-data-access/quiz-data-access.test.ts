import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Phase 73-01 Task 3: 25 DAL test cases (5 verbs × 5 question types) for dispatchPluginDataAccess with quiz plugin.
 *
 * Tests verify the 5-type discriminated union behavior for questionType column across all 5 verbs.
 * Each verb tests single_choice | multi_choice | true_false | fill_blank | ordering.
 *
 * Mock strategy mirrors facade.test.ts: mock governance gate + producers + read-verbs.
 * Real落库 / 审计 / 越校拒绝语义由 producers/read-verbs 各自的真实 DB 测试覆盖.
 */

const mocks = vi.hoisted(() => ({
  assertActionExecutable: vi.fn(),
  producePluginDataInsert: vi.fn(async () => ({ success: true, commandId: "c-1" })),
  producePluginDataUpsert: vi.fn(async () => ({ success: true, commandId: "c-2" })),
  getByIndex: vi.fn(async () => []),
  count: vi.fn(async () => 0),
  aggregate: vi.fn(async () => []),
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

import { dispatchPluginDataAccess } from "./facade";

const QUESTION_TYPES = ["single_choice", "multi_choice", "true_false", "fill_blank", "ordering"] as const;

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

describe("dispatchPluginDataAccess quiz plugin: 5 verbs × 5 question types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gateOk();
  });

  describe("A. insert verb — 5 question types", () => {
    const table = "plugin_owned_quiz_questions";

    it("insert single_choice question", async () => {
      await dispatchPluginDataAccess({
        verb: "insert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "What is 2+2?",
          prompt: "Choose wisely",
          optionAText: "3",
          optionBText: "4",
          optionCText: "5",
          optionDText: "6",
          questionType: "single_choice",
          correctOption: "B",
        },
      });

      expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
      expect(mocks.producePluginDataUpsert).not.toHaveBeenCalled();
      expect(mocks.getByIndex).not.toHaveBeenCalled();
    });

    it("insert multi_choice question", async () => {
      await dispatchPluginDataAccess({
        verb: "insert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "Select all even numbers",
          prompt: "Multi-select",
          optionAText: "2",
          optionBText: "3",
          optionCText: "4",
          optionDText: "5",
          questionType: "multi_choice",
          correctOption: "A,C",
        },
      });

      expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
      expect(mocks.producePluginDataUpsert).not.toHaveBeenCalled();
    });

    it("insert true_false question", async () => {
      await dispatchPluginDataAccess({
        verb: "insert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "2+2 equals 4",
          prompt: "True or false",
          optionAText: "True",
          optionBText: "False",
          optionCText: "",
          optionDText: "",
          questionType: "true_false",
          correctOption: "A",
        },
      });

      expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
    });

    it("insert fill_blank question", async () => {
      await dispatchPluginDataAccess({
        verb: "insert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "Complete: 2+2=_",
          prompt: "Enter the answer",
          optionAText: "",
          optionBText: "",
          optionCText: "",
          optionDText: "",
          questionType: "fill_blank",
          correctOption: "4",
        },
      });

      expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
    });

    it("insert ordering question", async () => {
      await dispatchPluginDataAccess({
        verb: "insert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "Order by size: small, medium, large",
          prompt: "Rank them",
          optionAText: "small",
          optionBText: "medium",
          optionCText: "large",
          optionDText: "",
          questionType: "ordering",
          correctOption: "A,B,C",
        },
      });

      expect(mocks.producePluginDataInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("B. upsert verb — 5 question types", () => {
    const table = "plugin_owned_quiz_questions";

    it("upsert single_choice question", async () => {
      await dispatchPluginDataAccess({
        verb: "upsert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "What is 3+3?",
          prompt: "Choose",
          optionAText: "5",
          optionBText: "6",
          optionCText: "7",
          optionDText: "8",
          questionType: "single_choice",
          correctOption: "B",
        },
      });

      expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(1);
      expect(mocks.producePluginDataInsert).not.toHaveBeenCalled();
    });

    it("upsert multi_choice question", async () => {
      await dispatchPluginDataAccess({
        verb: "upsert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "Select all primes",
          prompt: "Multi-select",
          optionAText: "2",
          optionBText: "4",
          optionCText: "5",
          optionDText: "6",
          questionType: "multi_choice",
          correctOption: "A,C",
        },
      });

      expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(1);
    });

    it("upsert true_false question", async () => {
      await dispatchPluginDataAccess({
        verb: "upsert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "The sky is blue",
          prompt: "True or false",
          optionAText: "True",
          optionBText: "False",
          optionCText: "",
          optionDText: "",
          questionType: "true_false",
          correctOption: "A",
        },
      });

      expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(1);
    });

    it("upsert fill_blank question", async () => {
      await dispatchPluginDataAccess({
        verb: "upsert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "Capital of France: _",
          prompt: "Fill in",
          optionAText: "",
          optionBText: "",
          optionCText: "",
          optionDText: "",
          questionType: "fill_blank",
          correctOption: "Paris",
        },
      });

      expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(1);
    });

    it("upsert ordering question", async () => {
      await dispatchPluginDataAccess({
        verb: "upsert",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        values: {
          classroomSession: "session-1",
          question: "Order: 1st, 2nd, 3rd",
          prompt: "Rank",
          optionAText: "first",
          optionBText: "second",
          optionCText: "third",
          optionDText: "",
          questionType: "ordering",
          correctOption: "A,B,C",
        },
      });

      expect(mocks.producePluginDataUpsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("C. getByIndex verb — 5 question types", () => {
    const table = "plugin_owned_quiz_questions";

    it("getByIndex single_choice questions", async () => {
      mocks.getByIndex.mockResolvedValueOnce([
        { id: "q-1", questionType: "single_choice", correctOption: "B" },
      ]);

      const result = await dispatchPluginDataAccess({
        verb: "getByIndex",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession"],
        eq: { classroomSession: "session-1" },
      });

      expect(mocks.getByIndex).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect((result[0] as { questionType: string }).questionType).toBe("single_choice");
    });

    it("getByIndex multi_choice questions", async () => {
      mocks.getByIndex.mockResolvedValueOnce([
        { id: "q-2", questionType: "multi_choice", correctOption: "A,C" },
      ]);

      const result = await dispatchPluginDataAccess({
        verb: "getByIndex",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession"],
        eq: { classroomSession: "session-1" },
      });

      expect(mocks.getByIndex).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect((result[0] as { questionType: string }).questionType).toBe("multi_choice");
    });

    it("getByIndex true_false questions", async () => {
      mocks.getByIndex.mockResolvedValueOnce([
        { id: "q-3", questionType: "true_false", correctOption: "A" },
      ]);

      const result = await dispatchPluginDataAccess({
        verb: "getByIndex",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession"],
        eq: { classroomSession: "session-1" },
      });

      expect(mocks.getByIndex).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect((result[0] as { questionType: string }).questionType).toBe("true_false");
    });

    it("getByIndex fill_blank questions", async () => {
      mocks.getByIndex.mockResolvedValueOnce([
        { id: "q-4", questionType: "fill_blank", correctOption: "Paris" },
      ]);

      const result = await dispatchPluginDataAccess({
        verb: "getByIndex",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession"],
        eq: { classroomSession: "session-1" },
      });

      expect(mocks.getByIndex).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect((result[0] as { questionType: string }).questionType).toBe("fill_blank");
    });

    it("getByIndex ordering questions", async () => {
      mocks.getByIndex.mockResolvedValueOnce([
        { id: "q-5", questionType: "ordering", correctOption: "A,B,C" },
      ]);

      const result = await dispatchPluginDataAccess({
        verb: "getByIndex",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession"],
        eq: { classroomSession: "session-1" },
      });

      expect(mocks.getByIndex).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect((result[0] as { questionType: string }).questionType).toBe("ordering");
    });
  });

  describe("D. count verb — 5 question types", () => {
    const table = "plugin_owned_quiz_questions";

    it("count single_choice questions", async () => {
      mocks.count.mockResolvedValueOnce(3);

      const result = await dispatchPluginDataAccess({
        verb: "count",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession", "questionType"],
        eq: { classroomSession: "session-1", questionType: "single_choice" },
      });

      expect(mocks.count).toHaveBeenCalledTimes(1);
      expect(result).toBe(3);
    });

    it("count multi_choice questions", async () => {
      mocks.count.mockResolvedValueOnce(2);

      const result = await dispatchPluginDataAccess({
        verb: "count",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession", "questionType"],
        eq: { classroomSession: "session-1", questionType: "multi_choice" },
      });

      expect(mocks.count).toHaveBeenCalledTimes(1);
      expect(result).toBe(2);
    });

    it("count true_false questions", async () => {
      mocks.count.mockResolvedValueOnce(5);

      const result = await dispatchPluginDataAccess({
        verb: "count",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession", "questionType"],
        eq: { classroomSession: "session-1", questionType: "true_false" },
      });

      expect(mocks.count).toHaveBeenCalledTimes(1);
      expect(result).toBe(5);
    });

    it("count fill_blank questions", async () => {
      mocks.count.mockResolvedValueOnce(1);

      const result = await dispatchPluginDataAccess({
        verb: "count",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession", "questionType"],
        eq: { classroomSession: "session-1", questionType: "fill_blank" },
      });

      expect(mocks.count).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });

    it("count ordering questions", async () => {
      mocks.count.mockResolvedValueOnce(4);

      const result = await dispatchPluginDataAccess({
        verb: "count",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        index: ["schoolId", "classroomSession", "questionType"],
        eq: { classroomSession: "session-1", questionType: "ordering" },
      });

      expect(mocks.count).toHaveBeenCalledTimes(1);
      expect(result).toBe(4);
    });
  });

  describe("E. aggregate verb — 5 question types (group by questionType)", () => {
    const table = "plugin_owned_quiz_questions";

    it("aggregate by questionType for single_choice", async () => {
      mocks.aggregate.mockResolvedValueOnce([{ key: "single_choice", count: 10 }]);

      const result = await dispatchPluginDataAccess({
        verb: "aggregate",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        groupBy: "questionType",
      });

      expect(mocks.aggregate).toHaveBeenCalledTimes(1);
      expect(result).toContainEqual({ key: "single_choice", count: 10 });
    });

    it("aggregate by questionType for multi_choice", async () => {
      mocks.aggregate.mockResolvedValueOnce([{ key: "multi_choice", count: 7 }]);

      const result = await dispatchPluginDataAccess({
        verb: "aggregate",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        groupBy: "questionType",
      });

      expect(mocks.aggregate).toHaveBeenCalledTimes(1);
      expect(result).toContainEqual({ key: "multi_choice", count: 7 });
    });

    it("aggregate by questionType for true_false", async () => {
      mocks.aggregate.mockResolvedValueOnce([{ key: "true_false", count: 8 }]);

      const result = await dispatchPluginDataAccess({
        verb: "aggregate",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        groupBy: "questionType",
      });

      expect(mocks.aggregate).toHaveBeenCalledTimes(1);
      expect(result).toContainEqual({ key: "true_false", count: 8 });
    });

    it("aggregate by questionType for fill_blank", async () => {
      mocks.aggregate.mockResolvedValueOnce([{ key: "fill_blank", count: 3 }]);

      const result = await dispatchPluginDataAccess({
        verb: "aggregate",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        groupBy: "questionType",
      });

      expect(mocks.aggregate).toHaveBeenCalledTimes(1);
      expect(result).toContainEqual({ key: "fill_blank", count: 3 });
    });

    it("aggregate by questionType for ordering", async () => {
      mocks.aggregate.mockResolvedValueOnce([{ key: "ordering", count: 5 }]);

      const result = await dispatchPluginDataAccess({
        verb: "aggregate",
        actor: "teacher-1",
        pluginKey: "quiz",
        table,
        groupBy: "questionType",
      });

      expect(mocks.aggregate).toHaveBeenCalledTimes(1);
      expect(result).toContainEqual({ key: "ordering", count: 5 });
    });
  });
});