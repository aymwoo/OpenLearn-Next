import { getTableName } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pluginDataAccessAllowlist } from "@/db/schema/generated/plugin-owned/data-access-allowlist";
import { pluginOwnedQuizQuestions, pluginOwnedQuizResponses } from "@/db/schema/generated/plugin-owned/quiz";
import {
  PLUGIN_DATA_ACCESS_REASONS,
  PluginDataAccessError,
  assertGroupByAllowed,
  assertIndexAllowed,
  resolvePluginTable,
  resolvePluginDataAccessAlias,
  validateInsertPayload,
} from "@/features/platform-core/plugin-data-access/allowlist";

/**
 * A1 spike — drizzle-zod `createInsertSchema`（zod v4 + SQLite `text(col,{enum})`）行为验证。
 *
 * 结论（记入 68-01-SUMMARY）：**IDEAL 路径**。
 *   - drizzle-zod 0.8.3 在 zod v4 下，把 `text("selectedOption",{enum:["A","B","C","D"]})`
 *     **派生为枚举校验**（越界值 → issue.code `invalid_value`）。
 *   - 因此 `validateInsertPayload`（Plan 68-01 Task 3）走 ideal 路径：直接信任 createInsertSchema
 *     的 enum 派生，无需为 enum 列额外补 `z.enum([...])` refinement。
 *   - degraded 兜底（从生成 const 的 `enumColumns` 补 `z.enum`）仅作为**未来 drizzle-zod 行为回归**
 *     的防御性设计保留，本仓库当前不需要它来拒绝越界 enum。
 *
 * 附带发现（影响 Task 3 的 `invalid_payload_rejected` 设计）：
 *   - 裸 `createInsertSchema` **默认剥离未知字段**（多余字段不报错）。故 `validateInsertPayload`
 *     必须对派生 schema 施加 `.strict()`，才能把"多余字段"判为 `invalid_payload_rejected`。
 */
describe("A1 drizzle-zod spike", () => {
  const responseInsertSchema = createInsertSchema(pluginOwnedQuizResponses);
  const questionInsertSchema = createInsertSchema(pluginOwnedQuizQuestions);

  const validBase = {
    schoolId: "school-1",
    pluginId: "plugin-1",
    classroomSession: "session-1",
    student: "student-1",
    question: "question-1",
    // append-only 校正：attemptNo 现为 notNull 且无 default，裸 createInsertSchema 将其判为必填。
    attemptNo: 1,
  } as const;

  const validQuestionBase = {
    schoolId: "school-1",
    pluginId: "plugin-1",
    classroomSession: "session-1",
    question: "question-1",
    prompt: "题目",
    optionAText: "A",
    optionBText: "B",
    optionCText: null,
    optionDText: null,
    questionType: "single_choice",
    correctOption: "A",
  } as const;

  it("当前路径：text 列合法值通过，selectedOption 不再派生 enum", () => {
    const result = responseInsertSchema.safeParse({ ...validBase, selectedOption: "A" });
    expect(result.success).toBe(true);
  });

  it("ideal 路径保留在 questionType：越界 enum 被裸 createInsertSchema 直接拒绝", () => {
    const result = questionInsertSchema.safeParse({ ...validQuestionBase, questionType: "essay" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const questionTypeIssue = result.error.issues.find((issue) => issue.path[0] === "questionType");
      expect(questionTypeIssue).toBeDefined();
    }
  });

  it("附带发现：裸 createInsertSchema 默认剥离未知字段（故 Task 3 须 .strict()）", () => {
    const result = responseInsertSchema.safeParse({ ...validBase, selectedOption: "A", bogusField: 1 });
    // 不报错 = 默认剥离未知字段，验证了 validateInsertPayload 必须 .strict() 才能拒多余字段。
    expect(result.success).toBe(true);
  });
});

/**
 * Task 2 —— 编译期派生的 checked-in 白名单 const（D-06 单一真相源、零漂移、零并行手写）。
 * 断言生成结构与声明源 `quizDataModel` 同源，且 reserved 列被正确排除。
 */
describe("allowlist generation", () => {
  const RESERVED_COLUMNS = ["id", "schoolId", "pluginId", "createdAt", "updatedAt"];
  const responses = pluginDataAccessAllowlist.quiz["plugin_owned_quiz_responses"];
  const questions = pluginDataAccessAllowlist.quiz["plugin_owned_quiz_questions"];

  it("indexes 深等于声明的复合索引列序（D-12/D-07）", () => {
    expect(responses.indexes).toEqual([["schoolId", "classroomSession", "student", "question"]]);
    expect(questions.indexes).toEqual([["schoolId", "classroomSession", "question"]]);
  });

  it("insertableColumns 不含任何 RESERVED_COLUMN", () => {
    for (const reserved of RESERVED_COLUMNS) {
      expect(responses.insertableColumns).not.toContain(reserved);
      expect(questions.insertableColumns).not.toContain(reserved);
    }
    expect(responses.insertableColumns).toEqual([
      "classroomSession",
      "student",
      "question",
      "selectedOption",
    ]);
  });

  it("groupByColumns 为非 reserved 标量列集合", () => {
    expect(responses.groupByColumns).toEqual([
      "classroomSession",
      "student",
      "question",
      "selectedOption",
    ]);
    for (const reserved of RESERVED_COLUMNS) {
      expect(responses.groupByColumns).not.toContain(reserved);
    }
  });

  it("enum 列附带 enumValues", () => {
    const responseEnums = responses.enumColumns as Record<string, unknown>;
    const questionEnums = questions.enumColumns as Record<string, unknown>;
    expect(responseEnums.selectedOption).toBeUndefined();
    expect(questionEnums.questionType).toEqual([
      "single_choice",
      "multi_choice",
      "true_false",
      "fill_blank",
      "ordering",
    ]);
    expect(questionEnums.correctOption).toBeUndefined();
  });

  it("columns 包含全部物理列（含 reserved），供 unknown vs unindexed 区分", () => {
    expect(responses.columns).toContain("schoolId");
    expect(responses.columns).toContain("selectedOption");
    expect(questions.columns).toContain("prompt");
  });

  it("uniques 来自声明（responses 有、questions 无）", () => {
    expect(responses.uniques).toEqual([["classroomSession", "student", "question"]]);
    expect(questions.uniques).toEqual([]);
  });
});

describe("plugin data access aliases", () => {
  it("maps quiz sample built-in key to the compiled quiz allowlist", () => {
    expect(resolvePluginDataAccessAlias("builtin-teaching-step-quiz-sample")).toBe("quiz");
    expect(getTableName(resolvePluginTable("builtin-teaching-step-quiz-sample", "plugin_owned_quiz_responses"))).toBe(
      "plugin_owned_quiz_responses",
    );
  });
});

/**
 * Task 3 —— 白名单消费层：表/列/索引/groupBy/payload 形状校验 + 具名拒因（D-07/D-08）。
 * 本层只读生成 const + 生成 drizzle 表，零硬编码白名单；不写 audit、不做 lifecycle 判定。
 */
describe("allowlist consumer layer", () => {
  const PLUGIN = "quiz";
  const RESPONSES = "plugin_owned_quiz_responses";
  const QUESTIONS = "plugin_owned_quiz_questions";

  const validResponsePayload = {
    classroomSession: "session-1",
    student: "student-1",
    question: "question-1",
    selectedOption: "A",
  } as const;

  const validQuestionPayload = {
    classroomSession: "session-1",
    question: "question-1",
    prompt: "题目",
    optionAText: "A",
    optionBText: "B",
    optionCText: null,
    optionDText: null,
    questionType: "single_choice",
    correctOption: "A",
  } as const;

  function reasonOf(fn: () => unknown): string {
    try {
      fn();
    } catch (error) {
      if (error instanceof PluginDataAccessError) return error.reason;
      throw error;
    }
    throw new Error("expected PluginDataAccessError, but no throw");
  }

  describe("PLUGIN_DATA_ACCESS_REASONS", () => {
    it("含 D-08 七类形状拒因 + 三类治理拒因", () => {
      for (const reason of [
        "raw_sql_rejected",
        "free_where_rejected",
        "unknown_column_rejected",
        "unknown_table_rejected",
        "cross_school_rejected",
        "invalid_payload_rejected",
        "unindexed_column_rejected",
        "lifecycle_not_executable",
        "kill_switch_rejected",
        "non_school_actor_rejected",
      ]) {
        expect(PLUGIN_DATA_ACCESS_REASONS).toContain(reason);
      }
    });
  });

  describe("resolvePluginTable", () => {
    it("返回对应 drizzle 表对象", () => {
      const table = resolvePluginTable(PLUGIN, RESPONSES);
      expect(getTableName(table)).toBe(RESPONSES);
    });
    it("未知表 → unknown_table_rejected", () => {
      expect(reasonOf(() => resolvePluginTable(PLUGIN, "plugin_owned_unknown"))).toBe(
        "unknown_table_rejected",
      );
    });
    it("未知插件 → unknown_table_rejected", () => {
      expect(reasonOf(() => resolvePluginTable("nope", RESPONSES))).toBe("unknown_table_rejected");
    });
  });

  describe("assertIndexAllowed", () => {
    it("命中声明复合索引（全列）→ 通过", () => {
      expect(() =>
        assertIndexAllowed(PLUGIN, RESPONSES, [
          "schoolId",
          "classroomSession",
          "student",
          "question",
        ]),
      ).not.toThrow();
    });
    it("命中索引最左前缀 → 通过", () => {
      expect(() => assertIndexAllowed(PLUGIN, RESPONSES, ["schoolId"])).not.toThrow();
    });
    it("不存在的列 → unknown_column_rejected", () => {
      expect(reasonOf(() => assertIndexAllowed(PLUGIN, RESPONSES, ["foo"]))).toBe(
        "unknown_column_rejected",
      );
    });
    it("存在但非索引前缀的列 → unindexed_column_rejected", () => {
      expect(reasonOf(() => assertIndexAllowed(PLUGIN, RESPONSES, ["student"]))).toBe(
        "unindexed_column_rejected",
      );
    });
  });

  describe("assertGroupByAllowed", () => {
    it("groupByColumns 成员 → 通过", () => {
      expect(() => assertGroupByAllowed(PLUGIN, RESPONSES, "student")).not.toThrow();
    });
    it("reserved 列 → unknown_column_rejected", () => {
      expect(reasonOf(() => assertGroupByAllowed(PLUGIN, RESPONSES, "schoolId"))).toBe(
        "unknown_column_rejected",
      );
    });
    it("未知列 → unknown_column_rejected", () => {
      expect(reasonOf(() => assertGroupByAllowed(PLUGIN, RESPONSES, "foo"))).toBe(
        "unknown_column_rejected",
      );
    });
  });

  describe("validateInsertPayload", () => {
    it("合法 payload → 返回解析后数据", () => {
      const parsed = validateInsertPayload(PLUGIN, RESPONSES, { ...validResponsePayload });
      expect(parsed.selectedOption).toBe("A");
    });
    it("多余字段 → invalid_payload_rejected", () => {
      expect(
        reasonOf(() =>
          validateInsertPayload(PLUGIN, RESPONSES, { ...validResponsePayload, bogus: 1 }),
        ),
      ).toBe("invalid_payload_rejected");
    });
    it("questionType enum 越界值 → invalid_payload_rejected（ideal 路径，allowlist 层拒）", () => {
      expect(
        reasonOf(() =>
          validateInsertPayload(PLUGIN, QUESTIONS, {
            ...validQuestionPayload,
            questionType: "essay",
          }),
        ),
      ).toBe("invalid_payload_rejected");
    });
    it("payload 含 schoolId → cross_school_rejected", () => {
      expect(
        reasonOf(() =>
          validateInsertPayload(PLUGIN, RESPONSES, {
            ...validResponsePayload,
            schoolId: "school-x",
          }),
        ),
      ).toBe("cross_school_rejected");
    });
    it("值含 DDL/原始 SQL 关键字 → raw_sql_rejected", () => {
      expect(
        reasonOf(() =>
          validateInsertPayload(PLUGIN, RESPONSES, {
            ...validResponsePayload,
            question: "DROP TABLE plugin_owned_quiz_responses",
          }),
        ),
      ).toBe("raw_sql_rejected");
    });
    it("值含 SQL 注释/分号 → raw_sql_rejected", () => {
      expect(
        reasonOf(() =>
          validateInsertPayload(PLUGIN, RESPONSES, {
            ...validResponsePayload,
            student: "x'; --",
          }),
        ),
      ).toBe("raw_sql_rejected");
    });
    it("嵌套对象值（自由 where 偷渡）→ free_where_rejected", () => {
      expect(
        reasonOf(() =>
          validateInsertPayload(PLUGIN, RESPONSES, {
            ...validResponsePayload,
            question: { gt: 1 },
          }),
        ),
      ).toBe("free_where_rejected");
    });
  });

  it("questions 表也可被消费层解析（多表回归）", () => {
    expect(getTableName(resolvePluginTable(PLUGIN, QUESTIONS))).toBe(QUESTIONS);
  });
});
