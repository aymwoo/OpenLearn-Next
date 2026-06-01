import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  lessonStepPayloadSchema,
  type LessonStepPayload,
} from "@/lib/dto/lesson-authoring";

import { draftStepCorpus } from "./__fixtures__/draft-step-corpus";

/**
 * EVAL-01 —— LessonAgent 起草输出的可重复、确定性评测（SC1）。
 *
 * 设计约束（锁定决策 D-01 / D-03）：
 * - **fixture-driven Vitest `*.eval.test.ts`**（非 tsx 脚本，非 LLM-as-judge）。
 * - 经受控生成通道回放共享语料 `draftStepCorpus.valid`：mock 掉 Phase 61 facade
 *   `@/server/ai/providers`，确定性 resolve 语料步骤 —— **无网络、无 provider key**。
 * - 复用唯一共享语料（D-03），使 eval 与 guardrail 测试保持锁步。
 *
 * 本套件断言：经 draft tool 产出的每个步骤都通过 `lessonStepPayloadSchema`
 * （schema 合法性，EVAL-01 行）以及基础教学结构不变式（D-02）。
 */

// server-only 在测试环境是 no-op（lesson-draft.test.ts:16 先例）。
vi.mock("server-only", () => ({}));

// ── 唯一生成通道：Phase 61 facade（确定性 mock，无网络 / 无 key）──────────────
const { aiGenerateObjectMock } = vi.hoisted(() => ({
  aiGenerateObjectMock: vi.fn(),
}));
vi.mock("@/server/ai/providers", () => ({
  aiGenerateObject: aiGenerateObjectMock,
}));

// ── 只读上下文 DAL（仅只读 getTeacherLessonPreviewDTO，无写函数）──────────────
const { getTeacherLessonPreviewDTOMock } = vi.hoisted(() => ({
  getTeacherLessonPreviewDTOMock: vi.fn(),
}));
vi.mock("@/lib/dal/lesson-authoring", () => ({
  getTeacherLessonPreviewDTO: getTeacherLessonPreviewDTOMock,
}));

import { createDraftLessonStepTool } from "./lesson-draft";

/** 最简合法 preview（满足 buildDraftStepPrompt 上下文消费，对齐 lesson-draft.test.ts）。 */
const FAKE_PREVIEW = {
  course: { id: "c1", subject: "数学", grade: "七年级", title: "一元一次方程" },
  lesson: { id: "l1", title: "方程导入", objective: "理解方程含义", stepCount: 0 },
  steps: [],
  materials: [],
};

/** 评测覆盖的三种步骤类型（语料驱动）。 */
const STEP_TYPES = ["content", "task", "quiz"] as const;
type EvalStepType = (typeof STEP_TYPES)[number];

/**
 * 回放：经受控通道把指定类型的合法语料步骤产出为 LessonStepPayload。
 *
 * `ai` 的 `tool.execute` 返回类型会被放宽为 `T | AsyncIterable<T>`，类型上不可
 * 直接判别字段；此处收窄回 `LessonStepPayload`（运行期即 facade resolve 的步骤包）。
 */
async function draftFromCorpus(stepType: EvalStepType): Promise<LessonStepPayload> {
  aiGenerateObjectMock.mockResolvedValue(draftStepCorpus.valid[stepType]);
  const result = await createDraftLessonStepTool({ teacherId: "t1" }).execute!(
    { lessonId: "l1", stepType, intent: "起草" },
    {} as never,
  );
  return result as LessonStepPayload;
}

describe("EVAL-01: draft output schema + teaching structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeacherLessonPreviewDTOMock.mockResolvedValue(FAKE_PREVIEW);
  });

  describe("schema legality（EVAL-01 行：经 lessonStepPayloadSchema 校验）", () => {
    for (const stepType of STEP_TYPES) {
      it(`${stepType}：经受控通道回放语料后 schema 合法`, async () => {
        const result = await draftFromCorpus(stepType);
        const verified = lessonStepPayloadSchema.safeParse(result);
        expect(verified.success).toBe(true);
      });
    }
  });

  describe("teaching structure invariants（D-02：基础教学结构达标）", () => {
    it("content：非空 title + 非空 body", async () => {
      const result = await draftFromCorpus("content");
      // 按判别字段收窄后断言类型专属字段（避免越过 union）。
      expect(result.type).toBe("content");
      if (result.type !== "content") throw new Error("expected content step");
      expect(result.title.trim().length).toBeGreaterThan(0);
      expect(result.body.trim().length).toBeGreaterThan(0);
    });

    it("task：非空 prompt + 合法 submissionType", async () => {
      const result = await draftFromCorpus("task");
      expect(result.type).toBe("task");
      if (result.type !== "task") throw new Error("expected task step");
      expect(result.prompt.trim().length).toBeGreaterThan(0);
      expect(["text", "image", "file", "link"]).toContain(result.submissionType);
    });

    it("quiz：>=2 选项 + 在范围内的 correctOptionIndex", async () => {
      const result = await draftFromCorpus("quiz");
      expect(result.type).toBe("quiz");
      if (result.type !== "quiz") throw new Error("expected quiz step");
      expect(result.options.length).toBeGreaterThanOrEqual(2);
      expect(
        result.correctOptionIndex === undefined ||
          result.correctOptionIndex < result.options.length,
      ).toBe(true);
    });
  });
});
