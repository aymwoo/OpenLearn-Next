import { createInsertSchema } from "drizzle-zod";
import { describe, expect, it } from "vitest";

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
