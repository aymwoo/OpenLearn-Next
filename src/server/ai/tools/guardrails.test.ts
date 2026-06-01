import { describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（no-leak.test.ts:8 / providers 先例）。
vi.mock("server-only", () => ({}));

import { DraftGuardrailRejection } from "@/lib/dto/draft-guardrails";
import type { GuardrailReasonCode } from "@/lib/dto/draft-guardrails";

import { draftStepCorpus } from "./__fixtures__/draft-step-corpus";
import { FORBIDDEN_MARKERS, assertStepWithinGuardrails } from "./guardrails";

/**
 * guardrails 校验器单测（EVAL-02 / D-04）。
 *
 * 数据源唯一为共享语料 `draftStepCorpus`（D-03），不在本文件重复定义步骤：
 *   - 合法路径：`valid.{content,task,quiz}` 必须**全部通过**（不抛）。
 *   - 拒绝路径：每个 `counterExamples` 反例必须抛 `DraftGuardrailRejection`，
 *     且 `reasonCode` 与语料标注一致（覆盖全部 5 个 reason code）。
 */

describe("assertStepWithinGuardrails — 合法步骤通过（EVAL-01 通过路径）", () => {
  it.each(Object.entries(draftStepCorpus.valid))(
    "valid.%s 不抛出",
    (_name, step) => {
      expect(() => assertStepWithinGuardrails(step)).not.toThrow();
    },
  );
});

describe("assertStepWithinGuardrails — 越界步骤逐项拒绝（EVAL-02 拒绝路径）", () => {
  it.each(draftStepCorpus.counterExamples.map((c) => [c.reasonCode, c.step] as const))(
    "反例命中 reasonCode=%s",
    (reasonCode: GuardrailReasonCode, step) => {
      expect(() => assertStepWithinGuardrails(step)).toThrow(DraftGuardrailRejection);
      try {
        assertStepWithinGuardrails(step);
        throw new Error("守卫应抛出 DraftGuardrailRejection 但未抛出");
      } catch (error) {
        expect(error).toBeInstanceOf(DraftGuardrailRejection);
        expect((error as DraftGuardrailRejection).reasonCode).toBe(reasonCode);
      }
    },
  );

  it("语料覆盖全部 5 个 reason code（防呆：反例集合不退化）", () => {
    const covered = new Set(draftStepCorpus.counterExamples.map((c) => c.reasonCode));
    expect(covered).toEqual(
      new Set<GuardrailReasonCode>([
        "illegal_step_type",
        "oversize_field",
        "invalid_teaching_structure",
        "quiz_correct_index_out_of_range",
        "forbidden_content",
      ]),
    );
  });
});

describe("assertStepWithinGuardrails — 拒绝对象结构（T-65-PII / D-07）", () => {
  it("illegal_step_type 用 content 哨兵，绝不回灌任意 LLM 类型字面量", () => {
    try {
      assertStepWithinGuardrails({ type: "lecture", title: "x", body: "y" });
      throw new Error("应抛出");
    } catch (error) {
      const rejection = error as DraftGuardrailRejection;
      expect(rejection.reasonCode).toBe("illegal_step_type");
      // stepType 为已知哨兵，非未知字面量 "lecture"。
      expect(rejection.stepType).toBe("content");
      // 只枚举出 reasonCode/stepType，不携带 step 快照 / 自由文本。
      expect(Object.keys(rejection)).toEqual(["reasonCode", "stepType"]);
    }
  });

  it("非对象输入按 illegal_step_type 拒绝（不抛 TypeError）", () => {
    for (const bad of [null, undefined, 42, "str", []]) {
      expect(() => assertStepWithinGuardrails(bad)).toThrow(DraftGuardrailRejection);
    }
  });
});

describe("FORBIDDEN_MARKERS — deny-list 暴露给 65-05 静态检查", () => {
  it("具名导出且非空", () => {
    expect(Array.isArray(FORBIDDEN_MARKERS)).toBe(true);
    expect(FORBIDDEN_MARKERS.length).toBeGreaterThan(0);
    expect(FORBIDDEN_MARKERS.every((m) => m instanceof RegExp)).toBe(true);
  });
});
