import { describe, expect, it } from "vitest";

import {
  DraftGuardrailRejection,
  GuardrailReasonCodeSchema,
} from "@/lib/dto/draft-guardrails";

describe("draft-guardrails 契约模块", () => {
  it("GuardrailReasonCodeSchema 恰好为 5 个成员且顺序固定", () => {
    expect(GuardrailReasonCodeSchema.options).toEqual([
      "illegal_step_type",
      "oversize_field",
      "invalid_teaching_structure",
      "quiz_correct_index_out_of_range",
      "forbidden_content",
    ]);
  });

  describe("DraftGuardrailRejection（T-65-PII 结构保证）", () => {
    const rejection = new DraftGuardrailRejection({
      reasonCode: "forbidden_content",
      stepType: "quiz",
    });

    it("是 Error 与 DraftGuardrailRejection 的实例", () => {
      expect(rejection).toBeInstanceOf(Error);
      expect(rejection).toBeInstanceOf(DraftGuardrailRejection);
    });

    it("只携带 reasonCode + stepType，绝无 step/payload/*Json 字段", () => {
      const keys = Object.keys(rejection);
      expect(keys.sort()).toEqual(["reasonCode", "stepType"]);
      expect(keys).not.toContain("step");
      expect(keys).not.toContain("payload");
      expect(keys.some((k) => k.toLowerCase().endsWith("json"))).toBe(false);
    });

    it("message 以 DRAFT_GUARDRAIL_REJECTED: 前缀开头", () => {
      expect(rejection.message.startsWith("DRAFT_GUARDRAIL_REJECTED:")).toBe(true);
      expect(rejection.message).toBe("DRAFT_GUARDRAIL_REJECTED:forbidden_content");
    });
  });
});
