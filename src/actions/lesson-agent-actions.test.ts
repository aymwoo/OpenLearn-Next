import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 66-03 — draftLessonWithAgentAction 教师起草触发 server action 覆盖。
 *
 * 锁定决策：
 * - D-02：教师「AI 起草」触发映射到调用 draftLessonStep（run→persist 编排入口）的 NEW server action。
 * - D-03：lesson_agent_enabled 经 getAgentRegistryDTO 在 authorize 边界做 HARD-STOP；
 *   flag OFF → 返回 AGENT_DISABLED 且**绝不**派发任何 command（后端权威，防御纵深）。
 *
 * E2E 启用说明：flag-ON 路径在 TEST DB 直写 agentRegistry 行 enabled=true；
 * 生产 registry seed 默认保持 enabled=false（src/server/ai/agents/registry.ts）。
 * 本单测经 mock 模拟 registry 行 enabled=true，不翻动 seed 默认值。
 */

const mockAssertActiveTeacher = vi.hoisted(() => vi.fn());
const mockGetAgentRegistryDTO = vi.hoisted(() => vi.fn());
const mockDraftLessonStep = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mockAssertActiveTeacher,
}));

vi.mock("@/lib/dal/ai-rag", () => ({
  getAgentRegistryDTO: mockGetAgentRegistryDTO,
}));

vi.mock("@/server/ai/agents/lesson-agent", () => ({
  draftLessonStep: mockDraftLessonStep,
}));

function lessonAgentRegistryRow(enabled: boolean) {
  return {
    id: "agent-lesson",
    agentKey: "LessonAgent",
    displayName: "Lesson Agent",
    capabilityManifestJson: {},
    featureFlag: "lesson_agent_enabled",
    enabled,
  };
}

const otherAgentRow = {
  id: "agent-homework",
  agentKey: "HomeworkAgent",
  displayName: "Homework Agent",
  capabilityManifestJson: {},
  featureFlag: "homework_agent_enabled",
  enabled: true,
};

describe("draftLessonWithAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("flag OFF → 返回 AGENT_DISABLED 且不派发任何 command", async () => {
    mockGetAgentRegistryDTO.mockResolvedValueOnce([lessonAgentRegistryRow(false), otherAgentRow]);

    const { draftLessonWithAgentAction } = await import("./lesson-agent-actions");
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "content",
      intent: "为本课时生成一个导入步骤",
    });

    expect(result).toMatchObject({ ok: false, error: "AGENT_DISABLED" });
    expect(mockDraftLessonStep).not.toHaveBeenCalled();
  });

  it("flag ON → 以 server 派生 schoolId 调用 draftLessonStep 一次并返回 ok", async () => {
    mockGetAgentRegistryDTO.mockResolvedValueOnce([lessonAgentRegistryRow(true)]);
    mockDraftLessonStep.mockResolvedValueOnce({
      status: "succeeded",
      commandId: "lesson.draft.run:abc",
      step: { kind: "content" },
      draftVersionId: "draft-1",
      version: 1,
    });

    const { draftLessonWithAgentAction } = await import("./lesson-agent-actions");
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "content",
      intent: "为本课时生成一个导入步骤",
    });

    expect(mockDraftLessonStep).toHaveBeenCalledTimes(1);
    expect(mockDraftLessonStep).toHaveBeenCalledWith({
      lessonId: "lesson-1",
      schoolId: "school-1",
      stepType: "content",
      intent: "为本课时生成一个导入步骤",
    });
    // 转发 payload 仅 4 键（server 派生 schoolId）；无任何 client 身份字段泄漏（T-66-07）。
    const forwarded = mockDraftLessonStep.mock.calls[0][0];
    expect(forwarded.schoolId).toBe("school-1");
    expect(Object.keys(forwarded).sort()).toEqual(["intent", "lessonId", "schoolId", "stepType"]);
    expect(result).toMatchObject({ ok: true, data: expect.objectContaining({ draftVersionId: "draft-1" }) });
  });

  it("缺失 intent → 校验错误，不读 flag，不派发", async () => {
    const { draftLessonWithAgentAction } = await import("./lesson-agent-actions");
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "content",
    } as never);

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockGetAgentRegistryDTO).not.toHaveBeenCalled();
    expect(mockDraftLessonStep).not.toHaveBeenCalled();
  });

  it("非法 stepType → 校验错误，不派发", async () => {
    const { draftLessonWithAgentAction } = await import("./lesson-agent-actions");
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "essay",
      intent: "x",
    } as never);

    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockDraftLessonStep).not.toHaveBeenCalled();
  });

  it("client 传入 teacherId/courseId/schoolId 被 strict schema 拒绝，绝不转发", async () => {
    const { draftLessonWithAgentAction } = await import("./lesson-agent-actions");
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "task",
      intent: "生成一道练习题",
      teacherId: "attacker-teacher",
      courseId: "attacker-course",
      schoolId: "attacker-school",
    } as never);

    // .strict() 拒绝未知键 → 校验错误（T-66-08），身份字段永不进入 payload（T-66-07）。
    expect(result).toMatchObject({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockGetAgentRegistryDTO).not.toHaveBeenCalled();
    expect(mockDraftLessonStep).not.toHaveBeenCalled();
  });

  it("未授权（TEACHER_AUTH_REQUIRED）→ 返回 UNAUTHORIZED，不派发", async () => {
    mockAssertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const { draftLessonWithAgentAction } = await import("./lesson-agent-actions");
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "content",
      intent: "x",
    });

    expect(result).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
    expect(mockGetAgentRegistryDTO).not.toHaveBeenCalled();
    expect(mockDraftLessonStep).not.toHaveBeenCalled();
  });
});
