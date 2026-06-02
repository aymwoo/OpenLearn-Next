import { createInsertSchema } from "drizzle-zod";
import { describe, expect, it } from "vitest";

import { pluginDataAccessAllowlist } from "@/db/schema/generated/plugin-owned/data-access-allowlist";
import { pluginOwnedQuizResponses } from "@/db/schema/generated/plugin-owned/quiz";

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
  const insertSchema = createInsertSchema(pluginOwnedQuizResponses);

  const validBase = {
    schoolId: "school-1",
    pluginId: "plugin-1",
    classroomSession: "session-1",
    student: "student-1",
    question: "question-1",
  } as const;

  it("ideal 路径：enum 列被派生为枚举——合法值通过", () => {
    const result = insertSchema.safeParse({ ...validBase, selectedOption: "A" });
    expect(result.success).toBe(true);
  });

  it("ideal 路径：enum 列被派生为枚举——越界值被裸 createInsertSchema 直接拒绝", () => {
    const result = insertSchema.safeParse({ ...validBase, selectedOption: "X" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const optionIssue = result.error.issues.find((issue) => issue.path[0] === "selectedOption");
      expect(optionIssue).toBeDefined();
    }
  });

  it("附带发现：裸 createInsertSchema 默认剥离未知字段（故 Task 3 须 .strict()）", () => {
    const result = insertSchema.safeParse({ ...validBase, selectedOption: "A", bogusField: 1 });
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
    expect(responses.enumColumns.selectedOption).toEqual(["A", "B", "C", "D"]);
    expect(questions.enumColumns.correctOption).toEqual(["A", "B", "C", "D"]);
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
