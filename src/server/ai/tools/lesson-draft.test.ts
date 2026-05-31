import { beforeEach, describe, expect, it, vi } from "vitest";

import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";

/**
 * `ai` 把 tool.inputSchema 暴露为 `FlexibleSchema`（运行期即我们传入的 ZodObject），
 * 类型上不直接含 `safeParse`/`shape`，故测试内收窄回结构型以做边界断言。
 */
type InputSchemaView = {
  safeParse: (value: unknown) => { success: boolean };
  shape: Record<string, unknown>;
};
const asInputSchema = (schema: unknown) => schema as unknown as InputSchemaView;

// server-only 在测试环境是 no-op（providers/no-leak.test.ts:8 先例）。
vi.mock("server-only", () => ({}));

// ── 唯一生成通道：Phase 61 facade ─────────────────────────────────────────────
const { aiGenerateObjectMock } = vi.hoisted(() => ({
  aiGenerateObjectMock: vi.fn(),
}));
vi.mock("@/server/ai/providers", () => ({
  aiGenerateObject: aiGenerateObjectMock,
}));

// ── 只读上下文 DAL（仅暴露只读 getTeacherLessonPreviewDTO，无任何写函数）──────────
const { getTeacherLessonPreviewDTOMock } = vi.hoisted(() => ({
  getTeacherLessonPreviewDTOMock: vi.fn(),
}));
vi.mock("@/lib/dal/lesson-authoring", () => ({
  getTeacherLessonPreviewDTO: getTeacherLessonPreviewDTOMock,
}));

import { createDraftLessonStepTool } from "./lesson-draft";

/** 最简合法 preview（满足 buildDraftStepPrompt 上下文消费）。 */
const FAKE_PREVIEW = {
  course: { id: "c1", subject: "数学", grade: "七年级", title: "一元一次方程" },
  lesson: { id: "l1", title: "方程导入", objective: "理解方程含义", stepCount: 0 },
  steps: [],
  materials: [],
};

/** 合法 content 步骤包（经 lessonStepPayloadSchema 校验通过）。 */
const FAKE_CONTENT_STEP = {
  type: "content" as const,
  title: "教师讲授",
  body: "围绕本节重点展开讲授，帮助学生建立知识框架。",
  teacherNotes: "先明确本环节目标。",
  materialRefs: [],
};

describe("createDraftLessonStepTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeacherLessonPreviewDTOMock.mockResolvedValue(FAKE_PREVIEW);
    aiGenerateObjectMock.mockResolvedValue(FAKE_CONTENT_STEP);
  });

  it("Test 1（AGENT-01 边界拒绝）：非法 payload 在 inputSchema 处被拒", () => {
    const tool = createDraftLessonStepTool({ teacherId: "t1" });
    const parsed = asInputSchema(tool.inputSchema).safeParse({
      lessonId: "",
      stepType: "essay",
      intent: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("Test 1b（AGENT-01）：合法 payload 通过 inputSchema", () => {
    const tool = createDraftLessonStepTool({ teacherId: "t1" });
    const parsed = asInputSchema(tool.inputSchema).safeParse({
      lessonId: "l1",
      stepType: "content",
      intent: "导入",
    });
    expect(parsed.success).toBe(true);
  });

  it("Test 2（AGENT-03 合法生成）：execute 产出经 lessonStepPayloadSchema 校验通过", async () => {
    const tool = createDraftLessonStepTool({ teacherId: "t1" });
    const out = await tool.execute!(
      { lessonId: "l1", stepType: "content", intent: "导入" },
      {} as never,
    );
    const verified = lessonStepPayloadSchema.safeParse(out);
    expect(verified.success).toBe(true);
    expect(getTeacherLessonPreviewDTOMock).toHaveBeenCalledWith({ lessonId: "l1" });
  });

  it("Test 3（Spoofing）：teacherId 不在 inputSchema，且经闭包注入 facade", async () => {
    const tool = createDraftLessonStepTool({ teacherId: "t1" });
    // inputSchema 不含 teacherId 键。
    expect(Object.keys(asInputSchema(tool.inputSchema).shape)).not.toContain(
      "teacherId",
    );

    await tool.execute!({ lessonId: "l1", stepType: "content", intent: "导入" }, {} as never);
    // facade 收到的 teacherId 来自闭包，而非 LLM input。
    expect(aiGenerateObjectMock).toHaveBeenCalledTimes(1);
    const call = aiGenerateObjectMock.mock.calls[0][0];
    expect(call.teacherId).toBe("t1");
    expect(call.schema).toBe(lessonStepPayloadSchema);
  });

  it("Test 4（D-01 / AGENT-02 不落库）：DAL 模块仅暴露只读 getTeacherLessonPreviewDTO，无写函数被触达", async () => {
    const dalModule = await import("@/lib/dal/lesson-authoring");
    // mock 仅暴露只读读取函数 —— 结构上无任何写 DAL 可被调用。
    expect(Object.keys(dalModule)).toEqual(["getTeacherLessonPreviewDTO"]);

    const tool = createDraftLessonStepTool({ teacherId: "t1" });
    await tool.execute!({ lessonId: "l1", stepType: "content", intent: "导入" }, {} as never);
    // 只读 DAL 恰好被调用一次，且 facade 是唯一生成通道，全程无写库。
    expect(getTeacherLessonPreviewDTOMock).toHaveBeenCalledTimes(1);
  });
});
